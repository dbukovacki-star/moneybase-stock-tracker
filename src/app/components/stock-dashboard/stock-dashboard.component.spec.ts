import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BehaviorSubject } from 'rxjs';
import { StockDashboardComponent } from './stock-dashboard.component';
import { StockCardComponent } from '../stock-card/stock-card.component';
import { STOCK_SERVICE_TOKEN } from '../../services/stock.service.interface';
import { Stock } from '../../models/stock.model';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeStock(symbol: string): Stock {
  return {
    symbol,
    name: `${symbol} Inc.`,
    price: 100,
    previousPrice: 99,
    dailyHigh: 105,
    dailyLow: 95,
    weekHigh52: 130,
    weekLow52: 70,
    active: true,
    priceDirection: 'neutral',
  };
}

const FOUR_STOCKS: Stock[] = ['AAPL', 'GOOGL', 'MSFT', 'TSLA'].map(makeStock);

// ---------------------------------------------------------------------------
// Spec
// ---------------------------------------------------------------------------
describe('StockDashboardComponent', () => {
  let fixture: ComponentFixture<StockDashboardComponent>;
  let stocks$: BehaviorSubject<Stock[]>;
  let mockService: {
    stocks$: BehaviorSubject<Stock[]>;
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    toggleStock: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    stocks$ = new BehaviorSubject<Stock[]>(FOUR_STOCKS);
    mockService = {
      stocks$,
      connect: vi.fn(),
      disconnect: vi.fn(),
      toggleStock: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [StockDashboardComponent],
      providers: [{ provide: STOCK_SERVICE_TOKEN, useValue: mockService }],
    }).compileComponents();

    fixture = TestBed.createComponent(StockDashboardComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  // -------------------------------------------------------------------------
  // Component creation
  // -------------------------------------------------------------------------
  it('creates successfully', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // Lifecycle hooks
  // -------------------------------------------------------------------------
  describe('ngOnInit', () => {
    it('calls connect() on the service', () => {
      expect(mockService.connect).toHaveBeenCalledTimes(1);
    });
  });

  describe('ngOnDestroy', () => {
    it('calls disconnect() when component is destroyed', () => {
      fixture.destroy();
      expect(mockService.disconnect).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // Card rendering
  // -------------------------------------------------------------------------
  describe('card rendering', () => {
    it('renders one card per stock', () => {
      const cards = fixture.debugElement.queryAll(By.directive(StockCardComponent));
      expect(cards).toHaveLength(4);
    });

    it('passes the correct stock object to each card', () => {
      const cardInstances = fixture.debugElement
        .queryAll(By.directive(StockCardComponent))
        .map((de) => de.componentInstance as StockCardComponent);

      const renderedSymbols = cardInstances.map((c) => c.stock.symbol);
      expect(renderedSymbols).toContain('AAPL');
      expect(renderedSymbols).toContain('GOOGL');
      expect(renderedSymbols).toContain('MSFT');
      expect(renderedSymbols).toContain('TSLA');
    });

    it('updates the view when the stocks$ observable emits', async () => {
      const updatedStocks: Stock[] = [makeStock('AAPL')];
      stocks$.next(updatedStocks);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const cards = fixture.debugElement.queryAll(By.directive(StockCardComponent));
      expect(cards).toHaveLength(1);
    });

    it('renders no cards when stocks$ emits an empty array', async () => {
      stocks$.next([]);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const cards = fixture.debugElement.queryAll(By.directive(StockCardComponent));
      expect(cards).toHaveLength(0);
    });

    it('passes the correct price to each card', () => {
      const aaplCard = fixture.debugElement
        .queryAll(By.directive(StockCardComponent))
        .find((de) => (de.componentInstance as StockCardComponent).stock.symbol === 'AAPL');

      expect((aaplCard!.componentInstance as StockCardComponent).stock.price).toBe(100);
    });

    it('reflects active state from service data', () => {
      const inactiveStocks = FOUR_STOCKS.map((s) =>
        s.symbol === 'AAPL' ? { ...s, active: false } : s
      );
      stocks$.next(inactiveStocks);
      fixture.detectChanges();

      const cards = fixture.debugElement.queryAll(By.directive(StockCardComponent));
      const aaplCard = cards.find(
        (de) => (de.componentInstance as StockCardComponent).stock.symbol === 'AAPL'
      );
      expect((aaplCard!.componentInstance as StockCardComponent).stock.active).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Toggle delegation
  // -------------------------------------------------------------------------
  describe('onToggle()', () => {
    it('calls toggleStock on service with the emitted symbol', () => {
      const firstCard = fixture.debugElement.queryAll(By.directive(StockCardComponent))[0];
      const symbol = (firstCard.componentInstance as StockCardComponent).stock.symbol;

      firstCard.triggerEventHandler('toggle', symbol);

      expect(mockService.toggleStock).toHaveBeenCalledWith(symbol);
    });

    it('calls toggleStock with the correct symbol for each card', () => {
      const cards = fixture.debugElement.queryAll(By.directive(StockCardComponent));
      cards.forEach((cardDe) => {
        const symbol = (cardDe.componentInstance as StockCardComponent).stock.symbol;
        cardDe.triggerEventHandler('toggle', symbol);
        expect(mockService.toggleStock).toHaveBeenCalledWith(symbol);
      });
    });
  });

  // -------------------------------------------------------------------------
  // trackBySymbol
  // -------------------------------------------------------------------------
  describe('trackBySymbol()', () => {
    it('returns the stock symbol', () => {
      const result = fixture.componentInstance.trackBySymbol(0, makeStock('AAPL'));
      expect(result).toBe('AAPL');
    });
  });

  // -------------------------------------------------------------------------
  // Static content
  // -------------------------------------------------------------------------
  describe('static content', () => {
    it('renders the brand title', () => {
      const title = fixture.nativeElement.querySelector('.dashboard__brand-title');
      expect(title?.textContent).toContain('Stock Tracker');
    });

    it('renders the hint text', () => {
      const hint = fixture.nativeElement.querySelector('.dashboard__hint');
      expect(hint?.textContent).toContain('pause');
    });
  });
});
