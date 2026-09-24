# The Market Game

A twenty-minute investing game played on real market history. One minute is a year, five
seconds is a month. Play solo against five rival strategies, at a shared table with
friends, or against anyone anywhere using a market code.

---

## Run it locally

```bash
npm install
npm start
```

Open http://localhost:8080. That's it — no database, no build step, no API keys.

---

## Deploying to themarketgame.net

**A domain alone is not enough.** Live tables need a Node process running continuously, so
a static host (GitHub Pages, Netlify drop, plain S3) will serve the game but the
multiplayer tables will be offline. The game detects that and tells players to use market
codes instead, so nothing breaks — you just lose live tables.

### Option A — one host that does everything (recommended)

Any platform that runs a Node web service works. Push this folder to a Git repo, then:

| Platform | What to set |
|---|---|
| Render | New Web Service · Build `npm install` · Start `npm start` |
| Railway | New Project from repo · it detects Node automatically |
| Fly.io | `fly launch` then `fly deploy` |
| A $5 VPS | `npm ci && node server.js` behind nginx or Caddy |

All of them read `PORT` from the environment, which `server.js` already honours. Point
`themarketgame.net` at the service with the DNS record the platform gives you, and make
sure TLS is on — the client uses `wss://` automatically on an `https://` page.

If you put a reverse proxy in front, it must forward WebSocket upgrades. For nginx:

```nginx
location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 3600s;
}
```

Caddy needs no special configuration:

```
themarketgame.net {
    reverse_proxy 127.0.0.1:8080
}
```

### Option B — static only

Upload `public/index.html` anywhere that serves files. Solo play and market codes work
fully; live tables show an "offline" notice. Useful as a fallback, or if you only care
about solo play.

---

## How multiplayer stays cheap

The server never simulates a market. Every twenty-year world is derived from a single
seed number, so all the server does is:

1. hand out four-character table codes,
2. pick the seed and the start time when the host starts,
3. relay one small score line per player.

Every client computes the identical market from that seed, which is why two people at a
table see the same companies, the same headlines and the same prices.

Consequences worth knowing:

- **The clock is server-authoritative.** Clients measure their offset from server time on
  connect and correct for it, so a device with a wrong clock still ticks with the table.
- **Broadcasts are throttled, not per-message.** Room state flushes at most twice a
  second no matter how fast players trade, so a busy table costs the same as a quiet one.
- **Nothing is persisted.** Rooms live in memory and disappear when empty. There is no
  database to run, and a restart drops in-progress tables.

Built-in limits, all in the constants at the top of `server.js`:

| Limit | Default |
|---|---|
| Players per table | 24 |
| Concurrent tables | 2000 |
| Message size | 2 KB |
| Messages per client | 40 per 10s |
| Idle table lifetime | 45 minutes |

A single small instance handles this comfortably; a local test of 120 concurrent players
across 10 tables held HTTP latency at 2 ms. If you ever outgrow one process you would need
shared room state (Redis) and sticky sessions, since rooms are currently per-process.

---

## Market codes

Every market is one short code, shown on the end screen. Send someone the code and they
play the identical twenty years — same era, same companies, same headlines — on their own
device with no connection between you. Useful when the site is unreachable, or for
comparing scores asynchronously.

---

## Where the data comes from

All prices and rates are real monthly series covering 1970 to the present. Each run picks
a random twenty-year window and hides which one until the end.

| Series | Source |
|---|---|
| Savings and CD rates | Fed funds and Treasury bill/note yields (FRED) |
| Bond yields | 3, 5 and 10-year Treasury constant maturity (FRED) |
| Index fund | S&P 500 with dividends reinvested (Shiller dataset) |
| Individual stocks | Real listed companies, adjusted close, under fictional names |
| Commodities | Corn, wheat and soybean producer price indices (BLS) |
| Gold | LBMA monthly price |
| Inflation | CPI-U (FRED) |

Share prices are rescaled to lifelike opening values because decades of splits push
adjusted close down to pennies. Every percentage move is the real one. Company names are
invented; the price history behind each is a real company, revealed when the run ends.

---

## Layout

```
server.js            static file serving + WebSocket tables
public/index.html    the entire game, data included, no build step
package.json         one dependency (ws)
```

`public/index.html` is self-contained and has no external requests, so it also works
opened directly from disk — though a browser that blocks JavaScript in local file
previews (iOS Quick Look does) will show an empty page. Serve it or open it in a real
browser.
