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
2. **The analyzer** — a Node-RED flow that publishes the report to an MQTT
   sensor (`sensor.incident_report`) through Home Assistant's MQTT
   integration. The flow and its setup are documented in
   [`docs/node-red-analyzer.md`](docs/node-red-analyzer.md). A Lovelace card
   cannot read log files directly, so the analyzer does the log-reading and the
   card renders the entity it publishes.

Until the sensor has reported once, the card shows a friendly "waiting for
data" state rather than an error.

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

You can configure the card two ways: **the visual editor** (recommended) or
YAML.

### Visual editor

After adding the card, click it and choose **Edit** → the visual editor shows
fields for the title, the incident-report sensor (entity picker), and the
accent color, with HA's native inputs. New cards start with working defaults.

### YAML

All options are optional:

```yaml
type: custom:system-incident-report-card
title: System health                 # header text
entity: sensor.incident_report       # sensor the analyzer publishes to
gold: "#E5B53A"                       # Heimdall amber accent
```

The card reads the entity live — it re-renders whenever the sensor updates,
so there's no polling or refresh interval to configure.

## How the sensor looks

The analyzer publishes a sensor whose **state** is a short summary
(`1C / 2W / 2M`) and whose **attributes** hold the full report:

```json
{
  "generated": "2026-06-27T05:49:28Z",
  "summary": { "critical": 1, "warning": 0, "minor": 1 },
  "incidents": [
    {
      "id": "example-rule-id",
      "severity": "critical",
      "title": "Short incident title",
      "detail": "Matched 3x in <source name> over the scanned window.",
      "recommendation": "What to do about it.",
      "count": 3,
      "sources": ["<source name>"]
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

MIT — see [LICENSE](LICENSE).# System Incident Report Card

A self-updating, Home Assistant Lovelace card that displays a
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

You can configure the card two ways: **the visual editor** (recommended) or
YAML.

### Visual editor

After adding the card, click it and choose **Edit** → the visual editor shows
fields for the title, report path, refresh interval, and accent color, with
HA's native inputs. New cards added from the picker start with working
defaults.

### YAML

All options are optional:

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
  "summary": { "critical": 1, "warning": 0, "minor": 1 },
  "incidents": [
    {
      "id": "example-rule-id",
      "severity": "critical",
      "title": "Short incident title",
      "detail": "Matched 3x in <source name> over the scanned window.",
      "recommendation": "What to do about it.",
      "count": 3,
      "sources": ["<source name>"]
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
