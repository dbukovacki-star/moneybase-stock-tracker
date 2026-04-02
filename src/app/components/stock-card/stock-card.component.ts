import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Stock } from '../../models/stock.model';

@Component({
  selector: 'app-stock-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stock-card.component.html',
  styleUrls: ['./stock-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockCardComponent {
  @Input() stock!: Stock;
  @Output() toggle = new EventEmitter<string>();

  onToggle(): void {
    this.toggle.emit(this.stock.symbol);
  }

  get cardClass(): string {
    if (!this.stock.active) return 'card--off';
    if (this.stock.priceDirection === 'up') return 'card--up';
    if (this.stock.priceDirection === 'down') return 'card--down';
    return 'card--neutral';
  }
}
