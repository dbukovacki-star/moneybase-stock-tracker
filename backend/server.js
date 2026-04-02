require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const WebSocket = require('ws');
const fetch = require('node-fetch');

const FINNHUB_TOKEN = process.env.FINNHUB_API_KEY || '';
const PORT = process.env.PORT || 3000;

const STOCKS = [
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'MSFT', name: 'Microsoft Corp.' },
  { symbol: 'TSLA', name: 'Tesla Inc.' },
];

// --- REST: fetch quote + 52-week metrics from Finnhub ---
async function fetchQuote(symbol) {
  if (!FINNHUB_TOKEN) throw new Error('No API key configured');

  const [quoteRes, metricRes] = await Promise.all([
    fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_TOKEN}`),
    fetch(`https://finnhub.io/api/v1/stock/metric?symbol=${symbol}&metric=all&token=${FINNHUB_TOKEN}`),
  ]);

  if (!quoteRes.ok) throw new Error(`Quote HTTP ${quoteRes.status} for ${symbol}`);
  if (!metricRes.ok) throw new Error(`Metric HTTP ${metricRes.status} for ${symbol}`);

  const quote = await quoteRes.json();
  const metric = await metricRes.json();

  // Finnhub returns { error: '...' } on auth failure or rate limit
  if (quote.error) throw new Error(`Finnhub quote error for ${symbol}: ${quote.error}`);

  // 'c' (current price) being 0 or absent means the market is closed / symbol invalid
  if (!quote.c && quote.c !== 0) throw new Error(`Unexpected quote response for ${symbol}`);

  return {
    symbol,
    price: quote.c,
    dailyHigh: quote.h,
    dailyLow: quote.l,
    weekHigh52: metric?.metric?.['52WeekHigh'] ?? null,
    weekLow52: metric?.metric?.['52WeekLow'] ?? null,
  };
}

// Store last known snapshot per symbol
const stockSnapshots = {};

async function initSnapshots() {
  if (!FINNHUB_TOKEN) {
    console.warn('[REST] No FINNHUB_API_KEY set — skipping REST snapshots. Add it to backend/.env');
    // Seed empty snapshots so WS clients get a response on connect
    for (const { symbol, name } of STOCKS) {
      stockSnapshots[symbol] = { symbol, name, price: 0, dailyHigh: 0, dailyLow: 0, weekHigh52: null, weekLow52: null };
    }
    return;
  }

  for (const { symbol, name } of STOCKS) {
    try {
      const data = await fetchQuote(symbol);
      stockSnapshots[symbol] = { ...data, name };
      console.log(`[REST] Snapshot loaded for ${symbol}: $${data.price}`);
    } catch (err) {
      console.error(`[REST] Failed to fetch snapshot for ${symbol}:`, err.message);
      // Keep a placeholder so clients still receive a card
      stockSnapshots[symbol] = { symbol, name, price: 0, dailyHigh: 0, dailyLow: 0, weekHigh52: null, weekLow52: null };
    }
  }
}

// --- WebSocket server (for Angular clients) ---
const wss = new WebSocket.Server({ port: PORT }, () => {
  console.log(`[WS Server] Listening on ws://localhost:${PORT}`);
});

function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

wss.on('connection', (ws) => {
  console.log('[WS Server] Angular client connected');

  // Send current snapshots immediately on connect
  Object.values(stockSnapshots).forEach((snapshot) => {
    ws.send(JSON.stringify({ type: 'snapshot', data: snapshot }));
  });

  ws.on('close', () => console.log('[WS Server] Angular client disconnected'));
});

// --- Finnhub WebSocket (upstream) ---
function connectFinnhub() {
  if (!FINNHUB_TOKEN) {
    console.warn('[Finnhub] No API key set — real-time WS updates disabled. Set FINNHUB_API_KEY in backend/.env');
    return;
  }

  const finnhub = new WebSocket(`wss://ws.finnhub.io?token=${FINNHUB_TOKEN}`);

  finnhub.on('open', () => {
    console.log('[Finnhub] Connected to Finnhub WebSocket');
    STOCKS.forEach(({ symbol }) => {
      finnhub.send(JSON.stringify({ type: 'subscribe', symbol }));
    });
  });

  finnhub.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);

      if (msg.type === 'error') {
        console.error('[Finnhub] API error:', msg.msg);
        return;
      }

      if (msg.type !== 'trade' || !msg.data) return;

      // Finnhub may batch multiple trades; use the last one per symbol
      const latestBySymbol = {};
      for (const trade of msg.data) {
        latestBySymbol[trade.s] = trade;
      }

      for (const [symbol, trade] of Object.entries(latestBySymbol)) {
        const existing = stockSnapshots[symbol];
        if (!existing) continue;

        const updated = { ...existing, price: trade.p };
        stockSnapshots[symbol] = updated;

        broadcast({ type: 'trade', data: updated });
      }
    } catch (err) {
      console.error('[Finnhub] Parse error:', err.message);
    }
  });

  finnhub.on('error', (err) => {
    console.error('[Finnhub] Error:', err.message);
  });

  finnhub.on('close', () => {
    console.warn('[Finnhub] Connection closed — reconnecting in 5s...');
    setTimeout(connectFinnhub, 5000);
  });
}

// --- Refresh 52-week / daily data every 5 minutes ---
async function refreshSnapshots() {
  if (!FINNHUB_TOKEN) return;

  for (const { symbol } of STOCKS) {
    try {
      const data = await fetchQuote(symbol);
      stockSnapshots[symbol] = { ...stockSnapshots[symbol], ...data };
    } catch (err) {
      console.error(`[REST] Refresh failed for ${symbol}:`, err.message);
    }
  }
  broadcast({ type: 'refresh', data: Object.values(stockSnapshots) });
  console.log('[REST] Snapshots refreshed');
}

// Boot sequence
(async () => {
  await initSnapshots();
  connectFinnhub();
  setInterval(refreshSnapshots, 5 * 60 * 1000);
})();
