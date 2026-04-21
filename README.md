# TezFlow - National Logistics Intelligence Platform

Resilient Logistics and Dynamic Supply Chain Optimization prototype.

TezFlow continuously analyzes transit and operational signals, detects disruption patterns early, and triggers route and allocation responses before localized failures cascade into broad delay.

## Objective Alignment

This implementation now supports:

1. Continuous monitoring cycles (not just manual scenario runs).
2. Preemptive disruption response through threshold-based rerouting.
3. Dynamic route intelligence using real road geometry providers.
4. Multi-signal fusion from weather, route status, and field operations.
5. Shared heartbeat synchronization across HQ, Driver, and Warehouse views.

## System Surfaces

- HQ Control Center: `index.html`
- Driver Dashboard: `driver.html`
- Warehouse Dashboard: `warehouse.html`

Core scripts:

- `script.js` - HQ analysis engine, live weather ingestion, heartbeat emission.
- `map.js` - route loading, route metrics, map overlays, event-driven coordination.
- `features.js` - feature engines (chaos scoring, self-healing, prediction, allocation).
- `events.js` - cross-page real-time event bus.
- `supabase.js` - sync layer with BroadcastChannel fallback.

## Live Data Inputs

### Route Intelligence

Provider chain:

1. OpenRouteService (if API key is configured)
2. OSRM Demo
3. OSMDE Car
4. Snapshot/fallback route

Distance and duration metrics are extracted and used to derive live transit pressure.

### Weather Intelligence

The app pulls current weather from Open-Meteo per region and converts weather codes, precipitation, and wind into a normalized weather pressure signal.

Refresh interval: every 10 minutes.

### Operational Signals

Real-time event bus receives:

- Driver congestion reports
- Driver reroute events
- Driver delivery confirmations
- Warehouse transfer approvals
- HQ scenario updates
- Shared system heartbeat

These signals are reflected across all dashboards and influence HQ analysis behavior.

## Local Run

Run via local static server (for example VS Code Live Server), then open:

- `http://localhost:5500/supplychain/index.html`
- `http://localhost:5500/supplychain/driver.html`
- `http://localhost:5500/supplychain/warehouse.html`

Do not open files directly from disk; use HTTP server mode to avoid browser restrictions.

## Optional OpenRouteService Key

For improved route reliability, set ORS key in browser local storage:

```js
localStorage.setItem("nscns_ors_api_key", "YOUR_ORS_KEY");
location.reload();
```

Then confirm route status indicates a live provider instead of fallback.

## Fast Demo (3-5 Minutes)

1. Open HQ, Driver, and Warehouse in separate tabs.
2. In Driver, click congestion report.
3. Verify event propagation:
	- HQ shows elevated risk and new field signal.
	- Warehouse map marks route disruption.
4. Trigger reroute from Driver.
5. Approve transfer from Warehouse.
6. Confirm delivery from Driver.
7. Verify shared heartbeat and synchronized state across all tabs.

## Verification Checklist

- Analysis cycle updates continuously.
- HQ weather panel shows live external feed values.
- HQ transit panel shows provider plus route distance/duration.
- Driver congestion appears in HQ and Warehouse.
- Reroute clears congestion and updates route state.
- Warehouse transfer propagates to HQ and Driver.
- Delivery confirmation propagates to HQ and Warehouse.
- System heartbeat remains in sync across all three screens.

## Scope Notes

Real in this prototype:

- External weather integration
- Real route-provider integration and route metrics
- Real-time cross-page event synchronization

Still prototype-level:

- No dedicated enterprise traffic API integration yet
- No backend model training/inference service
- No production auth hardening

## Suggested Next Steps

1. Add commercial traffic API for direct congestion telemetry.
2. Persist decisions/events to backend for audit and replay.
3. Move scoring/decision logic to server runtime.
4. Add external alert integrations and SLA tracking.

---

NSCNS now demonstrates a connected, event-driven logistics control system that continuously analyzes, preempts, and synchronizes response across operational nodes.
