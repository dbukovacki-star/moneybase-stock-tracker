import { Component } from '@angular/core';
import { StockDashboardComponent } from './components/stock-dashboard/stock-dashboard.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [StockDashboardComponent],
  template: '<app-stock-dashboard />',
  styles: [],
})
export class App {}
