import { Injectable, OnDestroy } from '@angular/core';
import { merge, Observable, Subject } from 'rxjs';
import { map, scan, shareReplay, startWith } from 'rxjs/operators';
import { Stock, StockUpdate, WsMessage } from '../models/stock.model';
import { IStockService } from './stock.service.interface';
import { environment } from '../../environments/environment';

const STOCKS_META = [
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'MSFT', name: 'Microsoft Corp.' },
  { symbol: 'TSLA', name: 'Tesla Inc.' },
];

const INITIAL_STOCKS: Stock[] = STOCKS_META.map(({ symbol, name }) => ({
  symbol,
  name,
  price: 0,
  previousPrice: 0,
  dailyHigh: 0,
  dailyLow: 0,
  weekHigh52: null,
  weekLow52: null,
  active: true,
  priceDirection: 'neutral',
}));

type StockEvent =
  | { kind: 'update'; data: StockUpdate }
  | { kind: 'toggle'; symbol: string };

@Injectable()
export class RealStockService implements IStockService, OnDestroy {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  // Raw update stream — WS messages feed into this
  private readonly _update$ = new Subject<StockUpdate>();

  // Toggle stream — UI clicks feed into this
  private readonly _toggle$ = new Subject<string>();

  /**
   * Unified event stream processed by scan.
   * Updates for inactive stocks are skipped entirely inside the reducer —
   * the price, high, low, and direction are never mutated.
   */
  readonly stocks$: Observable<Stock[]> = merge(
    this._update$.pipe(map((data): StockEvent => ({ kind: 'update', data }))),
    this._toggle$.pipe(map((symbol): StockEvent => ({ kind: 'toggle', symbol }))),
  ).pipe(
    scan((stocks: Stock[], event: StockEvent): Stock[] => {
      if (event.kind === 'toggle') {
        return stocks.map((s) =>
          s.symbol === event.symbol
            ? {
                ...s,
                active: !s.active,
                // When turning back ON, keep existing priceDirection; when turning OFF reset to neutral
                priceDirection: s.active ? 'neutral' : s.priceDirection,
              }
            : s,
        );
      }

      // 'update': skip entirely for inactive stocks — no price mutation at all
      return stocks.map((s) => {
        if (s.symbol !== event.data.symbol || !s.active) return s;

        const newPrice = event.data.price ?? s.price;
        const direction: Stock['priceDirection'] =
          newPrice > s.price ? 'up' : newPrice < s.price ? 'down' : s.priceDirection;

        return {
          ...s,
          previousPrice: s.price,
          price: newPrice,
          dailyHigh: event.data.dailyHigh ?? s.dailyHigh,
          dailyLow: event.data.dailyLow ?? s.dailyLow,
          weekHigh52: event.data.weekHigh52 ?? s.weekHigh52,
          weekLow52: event.data.weekLow52 ?? s.weekLow52,
          priceDirection: direction,
        };
      });
    }, INITIAL_STOCKS),
    startWith(INITIAL_STOCKS),
    shareReplay(1),
  );

  connect(): void {
    this.openConnection();
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
  }

  toggleStock(symbol: string): void {
    this._toggle$.next(symbol);
  }

  private openConnection(): void {
    if (this.ws) return;

    try {
      this.ws = new WebSocket(environment.wsUrl);
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => console.log('[RealStockService] Connected to WS server');

    this.ws.onmessage = (event) => {
      try {
        const msg: WsMessage = JSON.parse(event.data);
        if (msg.type === 'snapshot' || msg.type === 'trade') {
          this._update$.next(msg.data as StockUpdate);
        } else if (msg.type === 'refresh') {
          (msg.data as StockUpdate[]).forEach((u) => this._update$.next(u));
        }
      } catch {
        console.error('[RealStockService] Failed to parse message');
      }
    };

    this.ws.onerror = () => console.error('[RealStockService] WebSocket error');

    this.ws.onclose = () => {
      console.warn('[RealStockService] WS closed — reconnecting...');
      this.ws = null;
      this.scheduleReconnect();
    };
  }

  private scheduleReconnect(): void {
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.openConnection();
    }, 5000);
  }

  ngOnDestroy(): void {
    this.disconnect();
    this._update$.complete();
    this._toggle$.complete();
  }
}
