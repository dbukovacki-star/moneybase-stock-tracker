import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { Stock } from '../models/stock.model';

export interface IStockService {
  stocks$: Observable<Stock[]>;
  toggleStock(symbol: string): void;
  connect(): void;
  disconnect(): void;
}

export const STOCK_SERVICE_TOKEN = new InjectionToken<IStockService>('StockService');
