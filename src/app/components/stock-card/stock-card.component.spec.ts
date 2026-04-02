import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StockCardComponent } from './stock-card.component';
import { Stock } from '../../models/stock.model';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
function makeStock(overrides: Partial<Stock> = {}): Stock {
  return {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    price: 189.30,
    previousPrice: 188.00,
    dailyHigh: 192.10,
    dailyLow: 186.50,
    weekHigh52: 199.62,
    weekLow52: 124.17,
    active: true,
    priceDirection: 'neutral',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Spec
// ---------------------------------------------------------------------------
describe('StockCardComponent', () => {
  let fixture: ComponentFixture<StockCardComponent>;
  let component: StockCardComponent;

  function setStock(stock: Stock): void {
    fixture.componentRef.setInput('stock', stock);
    fixture.detectChanges();
  }

  function el(): HTMLElement {
    return fixture.nativeElement;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StockCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(StockCardComponent);
    setStock(makeStock());
  });

  // -------------------------------------------------------------------------
  // cardClass getter (CSS state)
  // -------------------------------------------------------------------------
  describe('cardClass getter', () => {
    it('returns card--neutral when active and direction is neutral', () => {
      setStock(makeStock({ active: true, priceDirection: 'neutral' }));
      expect(component.cardClass).toBe('card--neutral');
    });

    it('returns card--up when active and direction is up', () => {
      setStock(makeStock({ active: true, priceDirection: 'up' }));
      expect(component.cardClass).toBe('card--up');
    });

    it('returns card--down when active and direction is down', () => {
      setStock(makeStock({ active: true, priceDirection: 'down' }));
      expect(component.cardClass).toBe('card--down');
    });

    it('returns card--off when inactive (regardless of direction)', () => {
      setStock(makeStock({ active: false, priceDirection: 'up' }));
      expect(component.cardClass).toBe('card--off');
    });
  });

  // -------------------------------------------------------------------------
  // CSS classes on the article element
  // -------------------------------------------------------------------------
  describe('article CSS classes', () => {
    it('applies card--up class when price went up', () => {
      setStock(makeStock({ active: true, priceDirection: 'up' }));
      expect(el().querySelector('article')!.classList).toContain('card--up');
    });

    it('applies card--down class when price went down', () => {
      setStock(makeStock({ active: true, priceDirection: 'down' }));
      expect(el().querySelector('article')!.classList).toContain('card--down');
    });

    it('applies card--off class when inactive', () => {
      setStock(makeStock({ active: false, priceDirection: 'neutral' }));
      expect(el().querySelector('article')!.classList).toContain('card--off');
    });

    it('applies card--neutral class when active with no direction change', () => {
      setStock(makeStock({ active: true, priceDirection: 'neutral' }));
      expect(el().querySelector('article')!.classList).toContain('card--neutral');
    });
  });

  // -------------------------------------------------------------------------
  // Data bindings
  // -------------------------------------------------------------------------
  describe('data bindings', () => {
    it('displays the stock symbol', () => {
      setStock(makeStock({ symbol: 'TSLA' }));
      expect(el().querySelector('.card__symbol')!.textContent).toContain('TSLA');
    });

    it('displays the company name', () => {
      setStock(makeStock({ name: 'Tesla Inc.' }));
      expect(el().querySelector('.card__name')!.textContent).toContain('Tesla Inc.');
    });

    it('displays the current price formatted to 2 decimal places', () => {
      setStock(makeStock({ price: 189.3 }));
      expect(el().querySelector('.card__price-value')!.textContent).toContain('189.30');
    });

    it('displays daily high', () => {
      setStock(makeStock({ dailyHigh: 192.10 }));
      const statValues = el().querySelectorAll<HTMLElement>('.card__stat-value');
      const highEl = Array.from(statValues).find((e) => e.textContent?.includes('192.10'));
      expect(highEl).toBeTruthy();
    });

    it('displays daily low', () => {
      setStock(makeStock({ dailyLow: 186.50 }));
      const statValues = el().querySelectorAll<HTMLElement>('.card__stat-value');
      const lowEl = Array.from(statValues).find((e) => e.textContent?.includes('186.50'));
      expect(lowEl).toBeTruthy();
    });

    it('shows 52W High value when not null', () => {
      setStock(makeStock({ weekHigh52: 199.62 }));
      const statValues = el().querySelectorAll<HTMLElement>('.card__stat-value');
      const weekHighEl = Array.from(statValues).find((e) => e.textContent?.includes('199.62'));
      expect(weekHighEl).toBeTruthy();
    });

    it('shows — for 52W High when null', () => {
      setStock(makeStock({ weekHigh52: null }));
      const statValues = el().querySelectorAll<HTMLElement>('.card__stat-value');
      const dashEl = Array.from(statValues).find((e) => e.textContent?.trim() === '—');
      expect(dashEl).toBeTruthy();
    });

    it('shows — for 52W Low when null', () => {
      setStock(makeStock({ weekLow52: null }));
      const statValues = el().querySelectorAll<HTMLElement>('.card__stat-value');
      const dashEls = Array.from(statValues).filter((e) => e.textContent?.trim() === '—');
      expect(dashEls.length).toBeGreaterThanOrEqual(1);
    });
  });

  // -------------------------------------------------------------------------
  // ON/OFF badge
  // -------------------------------------------------------------------------
  describe('toggle badge', () => {
    it('shows ON when active', () => {
      setStock(makeStock({ active: true }));
      expect(el().querySelector('.card__toggle-badge')!.textContent?.trim()).toBe('ON');
    });

    it('shows OFF when inactive', () => {
      setStock(makeStock({ active: false }));
      expect(el().querySelector('.card__toggle-badge')!.textContent?.trim()).toBe('OFF');
    });

    it('adds card__toggle-badge--off class when inactive', () => {
      setStock(makeStock({ active: false }));
      expect(el().querySelector('.card__toggle-badge')!.classList).toContain('card__toggle-badge--off');
    });

    it('does not have card__toggle-badge--off class when active', () => {
      setStock(makeStock({ active: true }));
      expect(el().querySelector('.card__toggle-badge')!.classList).not.toContain('card__toggle-badge--off');
    });
  });

  // -------------------------------------------------------------------------
  // Direction arrows
  // -------------------------------------------------------------------------
  describe('direction arrow', () => {
    it('shows ▲ when active and direction is up', () => {
      setStock(makeStock({ active: true, priceDirection: 'up' }));
      expect(el().querySelector('.card__direction-arrow')!.textContent).toContain('▲');
    });

    it('shows ▼ when active and direction is down', () => {
      setStock(makeStock({ active: true, priceDirection: 'down' }));
      expect(el().querySelector('.card__direction-arrow')!.textContent).toContain('▼');
    });

    it('shows no arrow text when active and direction is neutral', () => {
      setStock(makeStock({ active: true, priceDirection: 'neutral' }));
      const arrow = el().querySelector('.card__direction-arrow');
      // Arrow container present but both inner ng-containers are falsy
      expect(arrow?.textContent?.trim()).toBe('');
    });

    it('hides the direction arrow element entirely when inactive', () => {
      setStock(makeStock({ active: false, priceDirection: 'up' }));
      expect(el().querySelector('.card__direction-arrow')).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // "Updates paused" overlay
  // -------------------------------------------------------------------------
  describe('updates-paused overlay', () => {
    it('is visible when stock is inactive', () => {
      setStock(makeStock({ active: false }));
      const overlay = el().querySelector('.card__overlay');
      expect(overlay).not.toBeNull();
      expect(overlay!.querySelector('span')!.textContent?.trim()).toBe('Updates paused');
    });

    it('is NOT in the DOM when stock is active', () => {
      setStock(makeStock({ active: true }));
      expect(el().querySelector('.card__overlay')).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // aria-pressed attribute
  // -------------------------------------------------------------------------
  describe('accessibility', () => {
    it('sets aria-pressed="true" when active', () => {
      setStock(makeStock({ active: true }));
      expect(el().querySelector('article')!.getAttribute('aria-pressed')).toBe('true');
    });

    it('sets aria-pressed="false" when inactive', () => {
      setStock(makeStock({ active: false }));
      expect(el().querySelector('article')!.getAttribute('aria-pressed')).toBe('false');
    });
  });

  // -------------------------------------------------------------------------
  // Toggle event
  // -------------------------------------------------------------------------
  describe('toggle event', () => {
    it('emits the stock symbol when the card is clicked', () => {
      setStock(makeStock({ symbol: 'MSFT' }));
      const emitted: string[] = [];
      fixture.componentInstance.toggle.subscribe((sym: string) => emitted.push(sym));

      el().querySelector('article')!.click();

      expect(emitted).toEqual(['MSFT']);
    });

    it('onToggle() emits the current stock symbol', () => {
      setStock(makeStock({ symbol: 'GOOGL' }));
      const emitted: string[] = [];
      fixture.componentInstance.toggle.subscribe((sym: string) => emitted.push(sym));

      fixture.componentInstance.onToggle();

      expect(emitted).toEqual(['GOOGL']);
    });

    it('emits exactly once per click', () => {
      const emitted: string[] = [];
      fixture.componentInstance.toggle.subscribe((sym: string) => emitted.push(sym));

      el().querySelector('article')!.click();
      el().querySelector('article')!.click();

      expect(emitted).toHaveLength(2);
    });
  });

  // -------------------------------------------------------------------------
  // Component initialisation
  // -------------------------------------------------------------------------
  it('creates successfully', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  // Get component reference after setStock in beforeEach
  beforeEach(() => {
    component = fixture.componentInstance;
  });
});
