/**
 * System Incident Report Card (Heimdall edition)
 * ----------------------------------------------
 * Renders the daily incident report produced by the Node-RED
 * "Incident Report Analyzer" flow, which writes /config/www/incident-report.json
 * (served at /local/incident-report.json).
 *
 * NO fixed entities. The card is a pure renderer of whatever the analyzer
 * wrote that morning. It re-fetches on load and every `refresh` minutes.
 *
 * Aesthetic: Heimdall dashboard — near-black surfaces, soft rounded tiles,
 * warm amber-gold accents, dim-gray section eyebrows. Severity colors kept:
 * critical = red, warning = amber, minor = blue.
 *
 * Install: copy to /config/www/, add as a JS-module dashboard resource,
 * then add:  type: custom:system-incident-report-card
 */

import {
  LitElement,
  html,
  css,
} from "https://unpkg.com/lit@3/index.js?module";

const SEV = {
  critical: { rank: 0, label: "Critical" },
  warning: { rank: 1, label: "Warning" },
  minor: { rank: 2, label: "Minor" },
};

class SystemIncidentReportCard extends LitElement {
  static properties = {
    hass: { attribute: false },
    _config: { state: true },
    _report: { state: true },
    _error: { state: true },
    _loading: { state: true },
  };

  setConfig(config) {
    this._config = {
      title: config.title ?? "System health",
      source: config.source ?? "/local/incident-report.json",
      refresh: Number(config.refresh ?? 30),
      gold: config.gold ?? "#E5B53A",
    };
    this._report = null;
    this._error = null;
    this._loading = true;
  }

  getCardSize() {
    return 3 + (this._report?.incidents?.length ?? 1);
  }

  connectedCallback() {
    super.connectedCallback();
    this._load();
    if (this._config?.refresh > 0) {
      this._timer = setInterval(
        () => this._load(),
        this._config.refresh * 60000
      );
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._timer) clearInterval(this._timer);
  }

  async _load() {
    try {
      const url =
        this._config.source +
        (this._config.source.includes("?") ? "&" : "?") +
        "_=" +
        Date.now();
      const res = await fetch(url);
      if (!res.ok) throw new Error("HTTP " + res.status);
      this._report = await res.json();
      this._error = null;
    } catch (e) {
      this._error = e.message || String(e);
    } finally {
      this._loading = false;
    }
  }

  _fmtTime(iso) {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleString(undefined, {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  }

  render() {
    if (!this._config) return html``;
    const r = this._report;
    const counts = r?.summary ?? { critical: 0, warning: 0, minor: 0 };
    const incidents = (r?.incidents ?? [])
      .slice()
      .sort(
        (a, b) =>
          (SEV[a.severity]?.rank ?? 9) - (SEV[b.severity]?.rank ?? 9) ||
          (b.count ?? 0) - (a.count ?? 0)
      );
    const crit = counts.critical ?? 0;
    const total =
      (counts.critical ?? 0) + (counts.warning ?? 0) + (counts.minor ?? 0);

    return html`
      <ha-card style="--sir-gold: ${this._config.gold};">
        <div class="head">
          <div class="head__title">${this._config.title}</div>
          <div class="head__meta">
            ${this._loading
              ? "Loading…"
              : this._error
              ? "Report unavailable"
              : "Updated " + this._fmtTime(r?.generated)}
          </div>
        </div>

        ${this._error
          ? html`<div class="alert alert--ok">
              <ha-icon icon="mdi:file-alert-outline"></ha-icon>
              <div class="alert__body">
                <div class="alert__title">No report file yet</div>
                <div class="alert__sub">
                  Waiting for the analyzer to write ${this._config.source}.
                  It runs daily at 06:00.
                </div>
              </div>
            </div>`
          : html`
              <div
                class="alert ${crit
                  ? "alert--crit"
                  : total
                  ? "alert--warn"
                  : "alert--ok"}"
              >
                <ha-icon
                  icon="${crit
                    ? "mdi:alert-octagon"
                    : total
                    ? "mdi:alert"
                    : "mdi:shield-check"}"
                ></ha-icon>
                <div class="alert__body">
                  <div class="alert__title">
                    ${crit
                      ? `${crit} critical incident${crit > 1 ? "s" : ""}`
                      : total
                      ? "Attention needed"
                      : "All systems nominal"}
                  </div>
                  <div class="alert__sub">
                    ${total
                      ? `${total} open issue${
                          total > 1 ? "s" : ""
                        } across scanned logs`
                      : "No incidents in the latest scan"}
                  </div>
                </div>
              </div>

              <div class="stats">
                ${this._stat("Critical", counts.critical ?? 0, "critical")}
                ${this._stat("Warning", counts.warning ?? 0, "warning")}
                ${this._stat("Minor", counts.minor ?? 0, "minor")}
              </div>

              ${incidents.length
                ? html`<div class="rows">
                    ${incidents.map((i) => this._row(i))}
                  </div>`
                : html`<div class="empty">
                    <ha-icon icon="mdi:check-circle-outline"></ha-icon>
                    Nothing flagged in the most recent log window.
                  </div>`}
            `}
      </ha-card>
    `;
  }

  _stat(label, value, sev) {
    return html`
      <div class="stat">
        <div class="stat__label">${label}</div>
        <div class="stat__value stat__value--${sev}">${value}</div>
      </div>
    `;
  }

  _row(inc) {
    const sev = SEV[inc.severity] ?? SEV.minor;
    const srcs = (inc.sources ?? []).join(", ");
    return html`
      <div class="row row--${inc.severity}">
        <div class="row__main">
          <div class="row__head">
            <span class="tag tag--${inc.severity}">${sev.label}</span>
            <span class="row__title">${inc.title}</span>
            ${inc.count
              ? html`<span class="row__count">${inc.count}×</span>`
              : ""}
          </div>
          <div class="row__detail">${inc.detail}</div>
          ${srcs
            ? html`<div class="row__src">
                <ha-icon icon="mdi:file-search-outline"></ha-icon>${srcs}
              </div>`
            : ""}
        </div>
        <div class="row__rec">
          <div class="row__rec-label">Recommendation</div>
          <div class="row__rec-text">${inc.recommendation}</div>
        </div>
      </div>
    `;
  }

  static styles = css`
    :host {
      --sir-bg: #111114;
      --sir-tile: #1a1a1e;
      --sir-tile-2: #202024;
      --sir-border: #2a2a30;
      --sir-text: #ece9e2;
      --sir-text-dim: #8d897f;
      --sir-critical: #e0524f;
      --sir-warning: var(--sir-gold, #e5b53a);
      --sir-minor: #6f97c9;
    }
    ha-card {
      background: var(--sir-bg);
      border: none;
      border-radius: 18px;
      padding: 18px;
      color: var(--sir-text);
      font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
    }
    .head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      margin-bottom: 14px;
    }
    .head__title {
      font-size: 17px;
      font-weight: 600;
      letter-spacing: 0.01em;
    }
    .head__meta {
      font-size: 12px;
      color: var(--sir-text-dim);
    }
    .alert {
      display: flex;
      align-items: center;
      gap: 14px;
      border-radius: 16px;
      padding: 16px;
      margin-bottom: 16px;
      background: var(--sir-tile);
    }
    .alert ha-icon {
      --mdc-icon-size: 28px;
      flex: 0 0 auto;
    }
    .alert--crit ha-icon {
      color: var(--sir-critical);
    }
    .alert--warn ha-icon,
    .alert--ok ha-icon {
      color: var(--sir-warning);
    }
    .alert__title {
      font-weight: 600;
      font-size: 15px;
    }
    .alert--crit .alert__title {
      color: var(--sir-critical);
    }
    .alert__sub {
      font-size: 13px;
      color: var(--sir-text-dim);
      margin-top: 2px;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 16px;
    }
    .stat {
      background: var(--sir-tile);
      border-radius: 14px;
      padding: 12px 14px;
    }
    .stat__label {
      font-size: 11px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--sir-text-dim);
    }
    .stat__value {
      font-size: 26px;
      font-weight: 600;
      margin-top: 2px;
    }
    .stat__value--critical {
      color: var(--sir-critical);
    }
    .stat__value--warning {
      color: var(--sir-warning);
    }
    .stat__value--minor {
      color: var(--sir-minor);
    }
    .rows {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .row {
      display: flex;
      background: var(--sir-tile);
      border-radius: 14px;
      border-left: 3px solid var(--sir-border);
      overflow: hidden;
    }
    .row--critical {
      border-left-color: var(--sir-critical);
    }
    .row--warning {
      border-left-color: var(--sir-warning);
    }
    .row--minor {
      border-left-color: var(--sir-minor);
    }
    .row__main {
      flex: 1.5;
      padding: 13px 15px;
      min-width: 0;
    }
    .row__head {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 5px;
    }
    .tag {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      padding: 3px 9px;
      border-radius: 999px;
    }
    .tag--critical {
      background: rgba(224, 82, 79, 0.16);
      color: var(--sir-critical);
    }
    .tag--warning {
      background: rgba(229, 181, 58, 0.16);
      color: var(--sir-warning);
    }
    .tag--minor {
      background: rgba(111, 151, 201, 0.16);
      color: var(--sir-minor);
    }
    .row__title {
      font-size: 14px;
      font-weight: 600;
    }
    .row__count {
      font-size: 12px;
      color: var(--sir-text-dim);
      margin-left: auto;
    }
    .row__detail {
      font-size: 13px;
      line-height: 1.55;
      color: var(--sir-text-dim);
    }
    .row__src {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 11.5px;
      color: var(--sir-text-dim);
      margin-top: 6px;
      opacity: 0.8;
    }
    .row__src ha-icon {
      --mdc-icon-size: 14px;
    }
    .row__rec {
      flex: 1;
      padding: 13px 15px;
      background: var(--sir-tile-2);
      min-width: 0;
    }
    .row__rec-label {
      font-size: 10px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--sir-gold, #e5b53a);
      margin-bottom: 4px;
    }
    .row__rec-text {
      font-size: 13px;
      line-height: 1.55;
      color: var(--sir-text);
    }
    .empty {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 18px;
      border-radius: 14px;
      background: var(--sir-tile);
      color: var(--sir-text-dim);
      font-size: 14px;
    }
    .empty ha-icon {
      color: var(--sir-warning);
    }
    @media (max-width: 600px) {
      .row {
        flex-direction: column;
      }
      .row__rec {
        border-top: 1px solid var(--sir-border);
      }
    }
  `;
}

customElements.define("system-incident-report-card", SystemIncidentReportCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "system-incident-report-card",
  name: "System Incident Report Card",
  description:
    "Heimdall-styled daily incident report rendered from the Node-RED analyzer's JSON.",
});

console.info(
  "%c SYSTEM-INCIDENT-REPORT-CARD %c v2.0.0 (Heimdall) ",
  "color:#111114;background:#E5B53A;font-weight:700;border-radius:3px 0 0 3px;padding:2px 4px;",
  "color:#E5B53A;background:#111114;border-radius:0 3px 3px 0;padding:2px 4px;"
);
