import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { App } from './app';
import { STOCK_SERVICE_TOKEN } from './services/stock.service.interface';
import { Stock } from './models/stock.model';

function makeStock(symbol: string): Stock {
  return {
    symbol, name: `${symbol} Inc.`, price: 100, previousPrice: 99,
    dailyHigh: 105, dailyLow: 95, weekHigh52: 130, weekLow52: 70,
    active: true, priceDirection: 'neutral',
  };
}

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        {
          provide: STOCK_SERVICE_TOKEN,
          useValue: {
            stocks$: new BehaviorSubject<Stock[]>(['AAPL', 'GOOGL', 'MSFT', 'TSLA'].map(makeStock)),
            connect: vi.fn(),
            disconnect: vi.fn(),
            toggleStock: vi.fn(),
          },
        },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the stock dashboard', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-stock-dashboard')).not.toBeNull();
  });
});
