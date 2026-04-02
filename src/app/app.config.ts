import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { STOCK_SERVICE_TOKEN } from './services/stock.service.interface';
import { RealStockService } from './services/real-stock.service';
import { MockStockService } from './services/mock-stock.service';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    {
      provide: STOCK_SERVICE_TOKEN,
      useClass: environment.useMock ? MockStockService : RealStockService,
    },
  ],
};
