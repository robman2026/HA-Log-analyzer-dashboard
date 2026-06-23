# Node-RED analyzer (the report producer)

The card renders `/config/www/incident-report.json`. This flow produces it.

A Lovelace card runs in the browser and can only read Home Assistant **entity
states** — it cannot read `home-assistant.log` or add-on container logs. So the
log-reading and analysis happen in Node-RED, which can call the Supervisor API,
and the card just renders the result.

## What it does

Daily at 06:00 (and on a manual trigger) it:

1. Fetches recent logs from Home Assistant Core and your add-ons via the
   Supervisor API (`/core/logs`, `/addons/<slug>/logs`).
2. Runs a rule engine that matches known failure patterns and scores each by
   weight (critical / warning / minor), with per-rule minimum match counts to
   filter out one-off blips.
3. Writes a JSON report to `/config/www/incident-report.json`.

## Import

1. Open Node-RED.
2. Menu → **Import** → paste the contents of
   [`node-red-flow.json`](node-red-flow.json) → **Import**.
3. It lands on a new tab, **Incident Report Analyzer**, isolated from your
   other flows.
4. **Deploy.**

The flow authenticates to the Supervisor with the `SUPERVISOR_TOKEN` env var
that the Node-RED add-on already provides — no credentials to enter.

> The add-on slugs in the "Build source list" node are specific to one install
> (e.g. `45df7312_zigbee2mqtt`). Edit that list to match your own add-on slugs
> (find them in Settings → Add-ons → each add-on's page URL).

## Rule engine

Each rule is an object in the `RULES` array of the **Rule engine** Function
node:

```js
{ id, source?, re, severity, title, recommendation, min?, catchall? }
```

- `re` — the pattern string (a `RegExp` is built from it).
- `source` — restrict to one log source; omit to scan all.
- `severity` — `critical` | `warning` | `minor`.
- `min` — matches needed before it shows (default 1). Filters noise.
- `catchall` — counts only lines not already claimed by a specific rule.

Add a rule = add one object. No other node changes needed.

## Implementation notes (things that bite)

These are baked into the shipped flow; noted here so edits don't reintroduce
them:

- The Supervisor `/logs` endpoints need an `Accept: text/plain` header.
  Without it they return a tiny non-log response.
- This Node-RED version blocks `msg.url` from overriding the HTTP node's URL.
  The URL is supplied via the node's own mustache field `{{{fullurl}}}`
  (triple-brace, unescaped) reading a message property.
- Global-flag regexes are stateful across `.test()` calls. The engine builds a
  fresh `RegExp` per check instead of reusing one with `/g` in a loop.

## Run frequency / coverage

The Supervisor returns only the **recent** log buffer, not full history. A
daily 06:00 run catches the overnight window. For tighter coverage, edit the
**Daily 06:00** inject node's cron (currently `00 06 * * *`) to run more often,
e.g. `0 */4 * * *` for every four hours.
