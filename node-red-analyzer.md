# Node-RED analyzer (the report producer)

The card renders the `sensor.incident_report` entity. This flow produces it.

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
3. Publishes the report to MQTT (via HA's `mqtt.publish` service), which
   Home Assistant picks up through MQTT discovery as `sensor.incident_report`
   — state is a short summary, attributes hold the full incident list. The
   messages are retained, so the sensor survives restarts.

## Import

1. Open Node-RED.
2. Menu → **Import** → paste the contents of
   [`node-red-flow.json`](node-red-flow.json) → **Import**.
3. It lands on a new tab, **Incident Report Analyzer**, isolated from your
   other flows.
4. **Deploy.**

The flow authenticates to the Supervisor with the `SUPERVISOR_TOKEN` env var
that the Node-RED add-on already provides — no credentials to enter.

> The "Build source list" node ships with placeholder add-on slugs
> (e.g. `<your_zigbee2mqtt_slug>`). Replace them with your own. To find an
> add-on's slug, open it under Settings → Add-ons; the slug is the
> `hex_name` segment at the end of its page URL. Built-in add-ons use a
> `core_` prefix (e.g. `core_mosquitto`).

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

## MQTT prerequisite

This flow publishes through Home Assistant's MQTT integration, so you need:
- The MQTT integration configured in HA (e.g. with the Mosquitto broker add-on).
- The Node-RED "Home Assistant" server config node (the flow uses it to call
  `mqtt.publish`). No separate MQTT broker login is needed in Node-RED.

The sensor self-registers via MQTT discovery the first time the flow runs.

## Optional: keep it out of the recorder

The report lives in the sensor's attributes. To avoid storing that JSON in the
recorder database every update, exclude it in `configuration.yaml`:

```yaml
recorder:
  exclude:
    entities:
      - sensor.incident_report
```
