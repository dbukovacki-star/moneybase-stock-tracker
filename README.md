# Moneybase Stock Tracker

A real-time stock price tracker built as a senior Angular developer hiring task for Calamatta Cuschieri / Moneybase. Displays live price updates for **AAPL, GOOGL, MSFT, and TSLA** via the Finnhub WebSocket API, with a swappable mock service for offline development.

---

## Features

- **Real-time updates** — live prices streamed over WebSocket from Finnhub
- **Mock mode** — fully simulated price feed, no API key required
- **Toggle ON/OFF** — click any card to pause/resume updates for that stock; frozen cards are visually greyed out and prices stop updating at the service level (RxJS `scan` reducer)
- **Color-coded cards** — green when price goes up, red when price goes down, grey when paused
- **Responsive layout** — CSS Grid, 1 column on mobile → 2 on tablet → 4 on desktop
- **Mobile view** — current price, daily high/low, name
- **Desktop view** — all of the above plus 52-week high/low
- **Unit tests** — 95 tests covering services, components, and models (Vitest)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Angular 21 (standalone components, OnPush CD) |
| Reactive state | RxJS — `merge`, `scan`, `shareReplay`, `startWith` |
| Styling | SCSS, CSS Grid, flexbox |
| Backend | Node.js WebSocket server (`ws` package) |
| Data source | Finnhub WebSocket + REST API |
| Tests | Vitest via `@angular/build:unit-test` |

---

## Prerequisites

- **Node.js** v18 or later
- **npm** v9 or later
- **Finnhub API key** — free tier at [finnhub.io](https://finnhub.io) *(only needed for real data mode)*

---

## Installation

Install frontend dependencies:

```bash
npm install
```

Install backend dependencies:

```bash
cd backend && npm install && cd ..
```

---

## Running the App

### With real Finnhub data

1. Copy the example env file:

```bash
cp backend/.env.example backend/.env
```

2. Open `backend/.env` and add your Finnhub API key:

```
FINNHUB_API_KEY=your_api_key_here
PORT=3000
```

3. Start both the WebSocket server and the Angular dev server together:

```bash
npm run start:all
```

Open [http://localhost:4200](http://localhost:4200) in your browser.

---

### With mock data (no API key needed)

```bash
npm run start:mock
```

The app uses `MockStockService` — prices update every 2 seconds with small random fluctuations. No backend server is started.

---

### Available scripts

| Script | Description |
|---|---|
| `npm run start:all` | Starts Node.js WS server + Angular dev server concurrently |
| `npm run start:mock` | Angular only, using mock service (no backend) |
| `npm run start:server` | Node.js backend server only |
| `npm run build` | Production build |

---

## Running Tests

```bash
ng test
```

Runs all 95 unit tests with Vitest. Tests cover:

- `StockCardComponent` — CSS classes, data binding, toggle event, overlay visibility
- `RealStockService` — WebSocket connection, snapshot/trade/refresh messages, toggle stops/resumes updates at the RxJS level, auto-reconnect
- `MockStockService` — tick behavior, toggle freezes prices, dailyHigh/Low tracking, interface compliance
- `StockDashboardComponent` — card rendering, lifecycle hooks, toggle delegation
- `Stock model` — shape validation, WsMessage variants

---

## Project Structure

```
moneybase-stock-tracker/
├── backend/
│   ├── server.js            # Node.js WS server — proxies Finnhub to Angular clients
│   ├── .env.example         # Copy to .env and add FINNHUB_API_KEY
│   └── package.json
└── src/
    └── app/
        ├── models/
        │   └── stock.model.ts           # Stock, StockUpdate, WsMessage interfaces
        ├── services/
        │   ├── stock.service.interface.ts   # IStockService + STOCK_SERVICE_TOKEN
        │   ├── real-stock.service.ts        # Connects to Node.js WS, auto-reconnects
        │   └── mock-stock.service.ts        # Simulated feed, same interface
        └── components/
            ├── stock-card/              # Individual stock card (toggle, colors, stats)
            └── stock-dashboard/         # CSS Grid layout, injects service via token
```

### Swapping mock vs real service

The active service is controlled by a single flag in [`src/environments/environment.ts`](src/environments/environment.ts):

```ts
export const environment = {
  useMock: false, // set to true to use MockStockService
};
```

Or use the dedicated npm scripts — `start:mock` uses the `mock` Angular build configuration which replaces the environment file at build time. No code changes required.
