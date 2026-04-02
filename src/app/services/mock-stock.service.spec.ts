import { MockStockService } from './mock-stock.service';
import { IStockService } from './stock.service.interface';
import { Stock } from '../models/stock.model';

// MOCK_BASE reference values — must stay in sync with the service
const BASE_PRICES: Record<string, number> = {
  AAPL: 189.30,
  GOOGL: 141.80,
  MSFT: 378.50,
  TSLA: 248.48,
};

/** Subscribes early so shareReplay(1) buffer is always warm. */
function subscribeEmissions(service: MockStockService): Stock[][] {
  const list: Stock[][] = [];
  service.stocks$.subscribe((v) => list.push(v));
  return list;
}

function last(list: Stock[][]): Stock[] {
  return list[list.length - 1];
}

// ---------------------------------------------------------------------------

describe('MockStockService', () => {
  let service: MockStockService;

  beforeEach(() => {
    vi.useFakeTimers();
    service = new MockStockService();
  });

  afterEach(() => {
    service.ngOnDestroy();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // Interface compliance
  // -------------------------------------------------------------------------
  it('implements IStockService interface', () => {
    const svc: IStockService = service;
    expect(svc.stocks$).toBeDefined();
    expect(typeof svc.connect).toBe('function');
    expect(typeof svc.disconnect).toBe('function');
    expect(typeof svc.toggleStock).toBe('function');
  });

  // -------------------------------------------------------------------------
  // Initial state
  // -------------------------------------------------------------------------
  describe('stocks$ initial state', () => {
    it('emits 4 stocks immediately on subscribe (no connect needed)', () => {
      const emissions = subscribeEmissions(service);
      expect(emissions[0]).toHaveLength(4);
    });

    it('all initial stocks are active', () => {
      const emissions = subscribeEmissions(service);
      expect(emissions[0].every((s) => s.active)).toBe(true);
    });

    it('initial prices match MOCK_BASE values', () => {
      const emissions = subscribeEmissions(service);
      for (const stock of emissions[0]) {
        expect(stock.price).toBeCloseTo(BASE_PRICES[stock.symbol], 1);
      }
    });

    it('initial priceDirection is neutral for all stocks', () => {
      const emissions = subscribeEmissions(service);
      expect(emissions[0].every((s) => s.priceDirection === 'neutral')).toBe(true);
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
  // connect()
  // -------------------------------------------------------------------------
  describe('connect()', () => {
    it('emits an immediate tick synchronously on connect', () => {
      const emissions = subscribeEmissions(service);
      const before = emissions.length;
      service.connect();
      expect(emissions.length).toBeGreaterThan(before);
    });

    it('updates active stock prices after the initial tick (upward jitter)', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1); // +0.5% jitter
      const emissions = subscribeEmissions(service);
      service.connect();

      for (const stock of last(emissions)) {
        expect(stock.price).toBeGreaterThan(BASE_PRICES[stock.symbol]);
      }
    });

    it('emits further ticks every 2 seconds', () => {
      const emissions = subscribeEmissions(service);
      service.connect();
      const afterFirstTick = emissions.length;

      vi.advanceTimersByTime(2000);

      expect(emissions.length).toBeGreaterThan(afterFirstTick);
    });

    it('is idempotent — second call does not set up a second interval', () => {
      const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
      service.connect();
      service.connect();
      expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // toggleStock()
  // -------------------------------------------------------------------------
  describe('toggleStock()', () => {
    it('marks stock as inactive and resets direction to neutral', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1); // prices go up
      const emissions = subscribeEmissions(service);
      service.connect(); // direction = 'up' after tick

      service.toggleStock('AAPL');

      const aapl = last(emissions).find((s) => s.symbol === 'AAPL')!;
      expect(aapl.active).toBe(false);
      expect(aapl.priceDirection).toBe('neutral');
    });

    it('does not affect other stocks when one is toggled', () => {
      const emissions = subscribeEmissions(service);
      service.toggleStock('AAPL');
      const others = last(emissions).filter((s) => s.symbol !== 'AAPL');
      expect(others.every((s) => s.active)).toBe(true);
    });

    it('completely stops processing tick updates for inactive stock', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5); // jitter = 0 (stable)
      const emissions = subscribeEmissions(service);
      service.connect();
      service.toggleStock('AAPL');

      const priceAtToggle = last(emissions).find((s) => s.symbol === 'AAPL')!.price;

      vi.advanceTimersByTime(2000); // next tick

      expect(last(emissions).find((s) => s.symbol === 'AAPL')!.price).toBe(priceAtToggle);
    });

    it('inactive stock stays neutral while active stocks receive direction updates', () => {
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0); // prices down
      const emissions = subscribeEmissions(service);
      service.connect(); // direction = 'down' for all

      service.toggleStock('AAPL'); // OFF → reset to 'neutral'

      randomSpy.mockReturnValue(1); // prices now go up
      vi.advanceTimersByTime(2000); // tick

      const final = last(emissions);
      // AAPL inactive: update skipped, direction stays 'neutral'
      expect(final.find((s) => s.symbol === 'AAPL')!.priceDirection).toBe('neutral');
      expect(final.find((s) => s.symbol === 'AAPL')!.active).toBe(false);
      // GOOGL active: received upward tick
      expect(final.find((s) => s.symbol === 'GOOGL')!.priceDirection).toBe('up');
    });

    it('resumes updates when toggled back ON', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5); // stable
      const emissions = subscribeEmissions(service);
      service.connect();

      service.toggleStock('AAPL'); // OFF
      vi.advanceTimersByTime(2000); // frozen tick
      const priceWhileOff = last(emissions).find((s) => s.symbol === 'AAPL')!.price;

      service.toggleStock('AAPL'); // ON

      vi.spyOn(Math, 'random').mockReturnValue(1); // upward jitter
      vi.advanceTimersByTime(2000); // live tick

      const aapl = last(emissions).find((s) => s.symbol === 'AAPL')!;
      expect(aapl.active).toBe(true);
      expect(aapl.price).toBeGreaterThan(priceWhileOff);
    });
  });

  // -------------------------------------------------------------------------
  // dailyHigh / dailyLow tracking
  // -------------------------------------------------------------------------
  describe('dailyHigh and dailyLow', () => {
    it('dailyHigh is updated upward when price exceeds it', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1); // prices up
      const emissions = subscribeEmissions(service);
      service.connect();
      const h1 = last(emissions).find((s) => s.symbol === 'AAPL')!.dailyHigh;

      vi.advanceTimersByTime(2000);

      expect(last(emissions).find((s) => s.symbol === 'AAPL')!.dailyHigh).toBeGreaterThanOrEqual(h1);
    });

    it('dailyLow is updated downward when price falls below it', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0); // prices down
      const emissions = subscribeEmissions(service);
      service.connect();
      const l1 = last(emissions).find((s) => s.symbol === 'AAPL')!.dailyLow;

      vi.advanceTimersByTime(2000);

      expect(last(emissions).find((s) => s.symbol === 'AAPL')!.dailyLow).toBeLessThanOrEqual(l1);
    });
  });

  // -------------------------------------------------------------------------
  // disconnect()
  // -------------------------------------------------------------------------
  describe('disconnect()', () => {
    it('stops further ticks after disconnect', () => {
      const emissions = subscribeEmissions(service);
      service.connect();
      service.disconnect();
      const countAtDisconnect = emissions.length;

      vi.advanceTimersByTime(10_000);

      expect(emissions.length).toBe(countAtDisconnect);
    });
  });
});
