# System Incident Report Card

A self-updating, Heimdall-styled Home Assistant Lovelace card that displays a
daily, severity-weighted incident report built from your Home Assistant and
add-on logs.

The card carries **no fixed entities**. It renders a JSON report produced by a
companion Node-RED flow that scans your logs each morning, classifies issues by
weight (critical / warning / minor), and writes recommendations.

![severity rows: critical red, warning amber, minor blue, with a recommendation column](https://raw.githubusercontent.com/robman2026/ha-incident-report-card/main/docs/preview.png)

## What it shows

- An alert banner that turns red when a critical incident is present
- Critical / Warning / Minor counts
- One row per incident: description and matched source on the left, a
  recommendation on the right
- "Updated" timestamp from the latest analyzer run

## Requirements

This card is the **display half** of a two-part setup:

1. **This card** — installed via HACS (below).
2. **The analyzer** — a Node-RED flow that writes
   `/config/www/incident-report.json`. The flow and its setup are documented in
   [`docs/node-red-analyzer.md`](docs/node-red-analyzer.md). A Lovelace card
   cannot read log files directly, so the analyzer does the log-reading and the
   card renders its output.

If the JSON file does not exist yet, the card shows a friendly "waiting for the
analyzer" state rather than an error.

## Install (HACS)

1. HACS → three-dot menu → **Custom repositories**.
2. Add `https://github.com/robman2026/ha-incident-report-card` with category
   **Dashboard** (a.k.a. *Lovelace / Plugin*).
3. Find **System Incident Report Card** in HACS and install it.
4. HACS adds the dashboard resource automatically. If it doesn't, add it
   manually under Settings → Dashboards → Resources:
   - URL: `/hacsfiles/ha-incident-report-card/system-incident-report-card.js`
   - Type: **JavaScript Module**
5. Add the card to a dashboard:

   ```yaml
   type: custom:system-incident-report-card
   ```

## Options

All optional:

```yaml
type: custom:system-incident-report-card
title: System health                    # header text
source: /local/incident-report.json     # where the analyzer writes
refresh: 30                             # re-fetch interval, minutes
gold: "#E5B53A"                         # Heimdall amber accent
```

The card cache-busts each fetch, so the daily rewrite is always picked up.

## How the report JSON looks

```json
{
  "generated": "2026-06-23T05:49:28Z",
  "summary": { "critical": 0, "warning": 2, "minor": 2 },
  "incidents": [
    {
      "id": "mqtt-keepalive",
      "severity": "warning",
      "title": "MQTT connection instability",
      "detail": "Matched 48x in Zigbee2MQTT over the scanned window.",
      "recommendation": "Check Mosquitto health ...",
      "count": 48,
      "sources": ["Zigbee2MQTT"]
    }
  ]
}
```

Any tool can write this file; the Node-RED flow in `docs/` is the reference
producer.

## Limitations

The reference analyzer reads the Supervisor's recent log buffer, not full
history, so issues older than the buffer may roll off before a daily run. See
`docs/node-red-analyzer.md` for tuning the run frequency.

## License

MIT — see [LICENSE](LICENSE).
