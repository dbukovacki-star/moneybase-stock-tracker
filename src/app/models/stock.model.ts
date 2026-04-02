export interface Stock {
  symbol: string;
  name: string;
  price: number;
  previousPrice: number;
  dailyHigh: number;
  dailyLow: number;
  weekHigh52: number | null;
  weekLow52: number | null;
  active: boolean;
  priceDirection: 'up' | 'down' | 'neutral';
}

export interface StockUpdate {
  symbol: string;
  name: string;
  price: number;
  dailyHigh: number;
  dailyLow: number;
  weekHigh52: number | null;
  weekLow52: number | null;
}

export type WsMessageType = 'snapshot' | 'trade' | 'refresh';

export interface WsMessage {
  type: WsMessageType;
  data: StockUpdate | StockUpdate[];
}
