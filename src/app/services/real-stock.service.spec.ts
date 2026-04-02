import { RealStockService } from './real-stock.service';
import { Stock, StockUpdate } from '../models/stock.model';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Keeps a live subscription so shareReplay(1) buffer is always warm. */
function subscribeEmissions(service: RealStockService): Stock[][] {
  const list: Stock[][] = [];
  service.stocks$.subscribe((v) => list.push(v));
  return list;
}

function makeUpdate(symbol: string, price: number): StockUpdate {
  return {
    symbol,
    name: `${symbol} Corp`,
    price,
    dailyHigh: price + 5,
    dailyLow: price - 5,
    weekHigh52: price + 30,
    weekLow52: price - 60,
  };
}

/**
 * The service does `this.ws = new WebSocket(url)` then assigns handlers
 * directly to the returned object. By using a regular function (not arrow)
 * as the mock implementation, `new WebSocket(url)` correctly returns our
 * `fakeWs` object (JS returns the object when a constructor returns one).
 */
function createWebSocketMock(): {
  fakeWs: {
    onopen: ((e: Event) => void) | null;
    onmessage: ((e: { data: string }) => void) | null;
    onerror: ((e: Event) => void) | null;
    onclose: ((e: Event) => void) | null;
    close: ReturnType<typeof vi.fn>;
    readyState: number;
  };
  ctor: ReturnType<typeof vi.fn>;
} {
  const fakeWs = {
    onopen: null as any,
    onmessage: null as any,
    onerror: null as any,
    onclose: null as any,
    close: vi.fn(),
    readyState: 1,
  };
  // Regular function (not arrow) so `new` works and returns fakeWs
  const ctor = vi.fn(function (this: unknown) {
    return fakeWs;
  });
  vi.stubGlobal('WebSocket', ctor);
  return { fakeWs, ctor };
}

function sendMessage(fakeWs: { onmessage: any }, type: string, data: unknown): void {
  fakeWs.onmessage({ data: JSON.stringify({ type, data }) });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RealStockService', () => {
  let service: RealStockService;
  let fakeWs: ReturnType<typeof createWebSocketMock>['fakeWs'];
  let ctor: ReturnType<typeof createWebSocketMock>['ctor'];

  beforeEach(() => {
    ({ fakeWs, ctor } = createWebSocketMock());
    service = new RealStockService();
  });

  afterEach(() => {
    vi.useRealTimers();
    service.ngOnDestroy();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // Initial state — subscribe first so shareReplay buffer is warm
  // -------------------------------------------------------------------------
  describe('stocks$ initial state', () => {
    it('emits 4 stocks immediately on subscribe', () => {
      const emissions = subscribeEmissions(service);
      expect(emissions[0]).toHaveLength(4);
    });

    it('all stocks start active with price 0 and neutral direction', () => {
      const emissions = subscribeEmissions(service);
      const initial = emissions[0];
      expect(initial.every((s) => s.active)).toBe(true);
      expect(initial.every((s) => s.price === 0)).toBe(true);
      expect(initial.every((s) => s.priceDirection === 'neutral')).toBe(true);
    });

    it('contains the four expected symbols', () => {
      const emissions = subscribeEmissions(service);
      const symbols = emissions[0].map((s) => s.symbol);
      expect(symbols).toContain('AAPL');
      expect(symbols).toContain('GOOGL');
      expect(symbols).toContain('MSFT');
      expect(symbols).toContain('TSLA');
    });
  });

  // -------------------------------------------------------------------------
  // WebSocket connection
  // -------------------------------------------------------------------------
  describe('connect()', () => {
    it('opens a WebSocket to the configured URL', () => {
      service.connect();
      expect(ctor).toHaveBeenCalledWith('ws://localhost:3000');
    });

    it('does not open a second connection if already connected', () => {
      service.connect();
      service.connect();
      expect(ctor).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // Incoming messages
  // -------------------------------------------------------------------------
  describe('snapshot message', () => {
    it('updates the matching stock with received price data', () => {
      const emissions = subscribeEmissions(service);
      service.connect();
      sendMessage(fakeWs, 'snapshot', makeUpdate('AAPL', 189.30));

      const aapl = emissions[emissions.length - 1].find((s) => s.symbol === 'AAPL')!;
      expect(aapl.price).toBe(189.30);
      expect(aapl.dailyHigh).toBe(194.30);
      expect(aapl.weekHigh52).toBe(219.30);
    });

    it('does not change other stocks', () => {
      const emissions = subscribeEmissions(service);
      service.connect();
      sendMessage(fakeWs, 'snapshot', makeUpdate('AAPL', 189.30));

      const msft = emissions[emissions.length - 1].find((s) => s.symbol === 'MSFT')!;
      expect(msft.price).toBe(0);
    });

    it('sets priceDirection to up when price increases', () => {
      const emissions = subscribeEmissions(service);
      service.connect();
      sendMessage(fakeWs, 'snapshot', makeUpdate('AAPL', 10));
      sendMessage(fakeWs, 'snapshot', makeUpdate('AAPL', 20));

      const aapl = emissions[emissions.length - 1].find((s) => s.symbol === 'AAPL')!;
      expect(aapl.priceDirection).toBe('up');
    });

    it('sets priceDirection to down when price decreases', () => {
      const emissions = subscribeEmissions(service);
      service.connect();
      sendMessage(fakeWs, 'snapshot', makeUpdate('AAPL', 20));
      sendMessage(fakeWs, 'snapshot', makeUpdate('AAPL', 10));

      const aapl = emissions[emissions.length - 1].find((s) => s.symbol === 'AAPL')!;
      expect(aapl.priceDirection).toBe('down');
    });
  });

  describe('trade message', () => {
    it('updates stock price on trade', () => {
      const emissions = subscribeEmissions(service);
      service.connect();
      sendMessage(fakeWs, 'trade', makeUpdate('TSLA', 260.00));

      expect(emissions[emissions.length - 1].find((s) => s.symbol === 'TSLA')!.price).toBe(260.00);
    });
  });

  describe('refresh message', () => {
    it('updates all stocks in the batch', () => {
      const emissions = subscribeEmissions(service);
      service.connect();
      sendMessage(fakeWs, 'refresh', [
        makeUpdate('AAPL', 188),
        makeUpdate('MSFT', 377),
        makeUpdate('GOOGL', 140),
        makeUpdate('TSLA', 245),
      ]);

      const last = emissions[emissions.length - 1];
      expect(last.find((s) => s.symbol === 'AAPL')!.price).toBe(188);
      expect(last.find((s) => s.symbol === 'MSFT')!.price).toBe(377);
    });
  });

  describe('malformed message', () => {
    it('does not throw on invalid JSON', () => {
      subscribeEmissions(service);
      service.connect();
      expect(() => {
        fakeWs.onmessage!({ data: 'not-valid-json' });
      }).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // Toggle behaviour
  // -------------------------------------------------------------------------
  describe('toggleStock()', () => {
    it('marks the stock as inactive and resets direction to neutral', () => {
      const emissions = subscribeEmissions(service);
      service.connect();
      sendMessage(fakeWs, 'snapshot', makeUpdate('AAPL', 10));
      sendMessage(fakeWs, 'snapshot', makeUpdate('AAPL', 20)); // direction = 'up'
      service.toggleStock('AAPL');

      const aapl = emissions[emissions.length - 1].find((s) => s.symbol === 'AAPL')!;
      expect(aapl.active).toBe(false);
      expect(aapl.priceDirection).toBe('neutral');
    });

    it('does not alter other stocks when one is toggled', () => {
      const emissions = subscribeEmissions(service);
      service.toggleStock('AAPL');

      const msft = emissions[emissions.length - 1].find((s) => s.symbol === 'MSFT')!;
      expect(msft.active).toBe(true);
    });

    it('completely stops processing updates for an inactive stock', () => {
      const emissions = subscribeEmissions(service);
      service.connect();
      sendMessage(fakeWs, 'snapshot', makeUpdate('AAPL', 100));
      service.toggleStock('AAPL');

      sendMessage(fakeWs, 'snapshot', makeUpdate('AAPL', 999)); // must be ignored

      const aapl = emissions[emissions.length - 1].find((s) => s.symbol === 'AAPL')!;
      expect(aapl.price).toBe(100);
      expect(aapl.priceDirection).toBe('neutral');
    });

    it('active stocks continue to receive updates while one is toggled off', () => {
      const emissions = subscribeEmissions(service);
      service.connect();
      service.toggleStock('AAPL');
      sendMessage(fakeWs, 'snapshot', makeUpdate('MSFT', 380));

      expect(emissions[emissions.length - 1].find((s) => s.symbol === 'MSFT')!.price).toBe(380);
    });

    it('resumes updates when toggled back ON', () => {
      const emissions = subscribeEmissions(service);
      service.connect();
      sendMessage(fakeWs, 'snapshot', makeUpdate('AAPL', 100));
      service.toggleStock('AAPL');             // OFF
      sendMessage(fakeWs, 'snapshot', makeUpdate('AAPL', 999)); // ignored
      service.toggleStock('AAPL');             // ON
      sendMessage(fakeWs, 'snapshot', makeUpdate('AAPL', 200)); // applied

      const aapl = emissions[emissions.length - 1].find((s) => s.symbol === 'AAPL')!;
      expect(aapl.active).toBe(true);
      expect(aapl.price).toBe(200);
    });

    it('double toggle restores active state', () => {
      const emissions = subscribeEmissions(service);
      service.toggleStock('AAPL');
      service.toggleStock('AAPL');

      expect(emissions[emissions.length - 1].find((s) => s.symbol === 'AAPL')!.active).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Disconnect & lifecycle
  // -------------------------------------------------------------------------
  describe('disconnect()', () => {
    it('closes the WebSocket', () => {
      service.connect();
      service.disconnect();
      expect(fakeWs.close).toHaveBeenCalled();
    });

    it('allows reconnect after disconnect', () => {
      service.connect();
      service.disconnect();
      service.connect();
      expect(ctor).toHaveBeenCalledTimes(2);
    });
  });

  describe('auto-reconnect', () => {
    it('schedules a new connection 5s after onclose fires', () => {
      vi.useFakeTimers();
      service.connect();
      fakeWs.onclose!(new Event('close'));

      expect(ctor).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(5000);
      expect(ctor).toHaveBeenCalledTimes(2);
    });
  });

  describe('ngOnDestroy()', () => {
    it('closes the ws and cancels pending reconnect timer', () => {
      vi.useFakeTimers();
      service.connect();
      fakeWs.onclose!(new Event('close')); // schedules reconnect
      service.ngOnDestroy();
      vi.advanceTimersByTime(10_000);     // timer should NOT fire
      expect(ctor).toHaveBeenCalledTimes(1);
    });
  });
});
