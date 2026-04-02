import {
  Component,
  Inject,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
} from '@angular/core';
import { AsyncPipe, NgFor } from '@angular/common';
import { IStockService, STOCK_SERVICE_TOKEN } from '../../services/stock.service.interface';
import { StockCardComponent } from '../stock-card/stock-card.component';

@Component({
  selector: 'app-stock-dashboard',
  standalone: true,
  imports: [AsyncPipe, NgFor, StockCardComponent],
  templateUrl: './stock-dashboard.component.html',
  styleUrls: ['./stock-dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockDashboardComponent implements OnInit, OnDestroy {
  readonly stocks$;

  constructor(@Inject(STOCK_SERVICE_TOKEN) private readonly stockService: IStockService) {
    this.stocks$ = this.stockService.stocks$;
  }

  ngOnInit(): void {
    this.stockService.connect();
  }

  ngOnDestroy(): void {
    this.stockService.disconnect();
  }

  onToggle(symbol: string): void {
    this.stockService.toggleStock(symbol);
  }

  trackBySymbol(_: number, stock: { symbol: string }): string {
    return stock.symbol;
  }
}
