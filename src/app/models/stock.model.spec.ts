import { Stock, StockUpdate, WsMessage } from './stock.model';

describe('Stock model', () => {
  const fullStock: Stock = {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    price: 189.30,
    previousPrice: 188.00,
    dailyHigh: 192.10,
    dailyLow: 186.50,
    weekHigh52: 199.62,
    weekLow52: 124.17,
    active: true,
    priceDirection: 'up',
  };

  it('accepts all three priceDirection values', () => {
    const up: Stock = { ...fullStock, priceDirection: 'up' };
    const down: Stock = { ...fullStock, priceDirection: 'down' };
    const neutral: Stock = { ...fullStock, priceDirection: 'neutral' };

    expect(up.priceDirection).toBe('up');
    expect(down.priceDirection).toBe('down');
    expect(neutral.priceDirection).toBe('neutral');
  });

  it('allows weekHigh52 and weekLow52 to be null', () => {
    const stock: Stock = { ...fullStock, weekHigh52: null, weekLow52: null };
    expect(stock.weekHigh52).toBeNull();
    expect(stock.weekLow52).toBeNull();
  });

  it('allows active to be false', () => {
    const stock: Stock = { ...fullStock, active: false, priceDirection: 'neutral' };
    expect(stock.active).toBe(false);
  });

  describe('StockUpdate', () => {
    it('carries required price data', () => {
      const update: StockUpdate = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        price: 190.00,
        dailyHigh: 192.00,
        dailyLow: 187.00,
        weekHigh52: 199.62,
        weekLow52: 124.17,
      };
      expect(update.symbol).toBe('AAPL');
      expect(update.price).toBe(190.00);
    });
  });

  describe('WsMessage', () => {
    it('carries a single StockUpdate for snapshot/trade', () => {
      const update: StockUpdate = {
        symbol: 'AAPL', name: 'Apple Inc.', price: 190,
        dailyHigh: 192, dailyLow: 187, weekHigh52: 199, weekLow52: 124,
      };
      const msg: WsMessage = { type: 'snapshot', data: update };
      expect(msg.type).toBe('snapshot');
      expect(Array.isArray(msg.data)).toBe(false);
    });

    it('carries an array of StockUpdates for refresh', () => {
      const update: StockUpdate = {
        symbol: 'AAPL', name: 'Apple Inc.', price: 190,
        dailyHigh: 192, dailyLow: 187, weekHigh52: 199, weekLow52: 124,
      };
      const msg: WsMessage = { type: 'refresh', data: [update, { ...update, symbol: 'MSFT' }] };
      expect(msg.type).toBe('refresh');
      expect(Array.isArray(msg.data)).toBe(true);
      expect((msg.data as StockUpdate[]).length).toBe(2);
    });

    it('accepts all valid WsMessageType values', () => {
      const types: WsMessage['type'][] = ['snapshot', 'trade', 'refresh'];
      types.forEach((type) => {
        const msg: WsMessage = { type, data: { symbol: 'X', name: 'X', price: 1, dailyHigh: 2, dailyLow: 0, weekHigh52: null, weekLow52: null } };
        expect(msg.type).toBe(type);
      });
    });
  });
});
