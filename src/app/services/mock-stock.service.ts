import { Injectable, OnDestroy } from '@angular/core';
import { merge, Observable, Subject } from 'rxjs';
import { map, scan, shareReplay, startWith } from 'rxjs/operators';
import { Stock, StockUpdate } from '../models/stock.model';
import { IStockService } from './stock.service.interface';

const MOCK_BASE: Omit<Stock, 'active' | 'priceDirection' | 'previousPrice'>[] = [
  { symbol: 'AAPL',  name: 'Apple Inc.',      price: 189.30, dailyHigh: 192.10, dailyLow: 186.50, weekHigh52: 199.62, weekLow52: 124.17 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.',   price: 141.80, dailyHigh: 143.90, dailyLow: 139.60, weekHigh52: 153.78, weekLow52: 102.21 },
  { symbol: 'MSFT',  name: 'Microsoft Corp.', price: 378.50, dailyHigh: 381.00, dailyLow: 375.20, weekHigh52: 420.82, weekLow52: 309.45 },
  { symbol: 'TSLA',  name: 'Tesla Inc.',      price: 248.48, dailyHigh: 255.00, dailyLow: 242.10, weekHigh52: 299.29, weekLow52: 138.80 },
];

const INITIAL_STOCKS: Stock[] = MOCK_BASE.map((s) => ({
  ...s,
  previousPrice: s.price,
  active: true,
  priceDirection: 'neutral',
}));

function jitter(value: number): number {
  return parseFloat((value + value * (Math.random() * 0.01 - 0.005)).toFixed(2));
}

type StockEvent =
  | { kind: 'update'; data: StockUpdate }
  | { kind: 'toggle'; symbol: string };

@Injectable()
export class MockStockService implements IStockService, OnDestroy {
  private intervalId: ReturnType<typeof setInterval> | null = null;

  private readonly _update$ = new Subject<StockUpdate>();
  private readonly _toggle$ = new Subject<string>();

  /**
   * Same unified event stream + scan pattern as RealStockService.
   * Inactive stocks are completely skipped in the scan reducer —
   * their price never changes until toggled back ON.
   */
  readonly stocks$: Observable<Stock[]> = merge(
    this._update$.pipe(map((data): StockEvent => ({ kind: 'update', data }))),
    this._toggle$.pipe(map((symbol): StockEvent => ({ kind: 'toggle', symbol }))),
  ).pipe(
    scan((stocks: Stock[], event: StockEvent): Stock[] => {
      if (event.kind === 'toggle') {
        return stocks.map((s) =>
          s.symbol === event.symbol
            ? { ...s, active: !s.active, priceDirection: s.active ? 'neutral' : s.priceDirection }
            : s,
        );
      }

      // 'update': skip entirely for inactive stocks
      return stocks.map((s) => {
        if (s.symbol !== event.data.symbol || !s.active) return s;

        const newPrice = event.data.price ?? s.price;
        const direction: Stock['priceDirection'] =
          newPrice > s.price ? 'up' : newPrice < s.price ? 'down' : s.priceDirection;

        return {
          ...s,
          previousPrice: s.price,
          price: newPrice,
          dailyHigh: Math.max(s.dailyHigh, newPrice),
          dailyLow: Math.min(s.dailyLow, newPrice),
          priceDirection: direction,
        };
      });
    }, INITIAL_STOCKS),
    startWith(INITIAL_STOCKS),
    shareReplay(1),
  );

  connect(): void {
    if (this.intervalId !== null) return;
    // Emit initial tick immediately, then every 2s
    this.tick();
    this.intervalId = setInterval(() => this.tick(), 2000);
  }

  disconnect(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  toggleStock(symbol: string): void {
    this._toggle$.next(symbol);
  }

  private tick(): void {
    // Emit one update per stock; the scan reducer decides whether to apply it
    for (const base of MOCK_BASE) {
      this._update$.next({
        symbol: base.symbol,
        name: base.name,
        price: jitter(base.price),
        dailyHigh: base.dailyHigh,
        dailyLow: base.dailyLow,
        weekHigh52: base.weekHigh52,
        weekLow52: base.weekLow52,
      });
    }
  }

  ngOnDestroy(): void {
    this.disconnect();
    this._update$.complete();
    this._toggle$.complete();
  }
}
