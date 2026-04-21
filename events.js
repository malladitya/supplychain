// events.js — NSCNS Cross-Page Real-time Event Bus
// Connects National HQ, Driver, and Warehouse dashboards
// Uses BroadcastChannel for zero-latency cross-tab communication

const EVT = {
  DRIVER_CONGESTION:    'driver:congestion',    // Driver reports congestion on route
  DRIVER_REROUTED:      'driver:rerouted',      // Driver route has changed
  DRIVER_DELIVERED:     'driver:delivered',     // Driver completes delivery
  WH_TRANSFER_APPROVED: 'wh:transfer_approved', // Warehouse approves supply transfer
  HQ_SCENARIO_CHANGED:  'hq:scenario_changed',  // National HQ updates scenario
  SYSTEM_HEARTBEAT:     'system:heartbeat',     // Shared global state heartbeat
  INCIDENT_MODE:        'system:incident_mode', // Cross-page incident activation/clear
};

const _evtChannel  = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('nscns_events_v2') : null;
const _evtStorageKey = 'nscns_events_v2_last';
const _incidentStateKey = 'nscns_incident_state_v1';
const _evtHandlers = {};

/**
 * Emit an event to all connected pages (including this one).
 * @param {string} type  - One of the EVT constants
 * @param {Object} payload - Arbitrary event data
 */
function emitMapEvent(type, payload = {}) {
  const msg = { type, payload, ts: Date.now() };
  if (_evtChannel) {
    _evtChannel.postMessage(msg); // cross-tab
  }
  try {
    window.localStorage.setItem(_evtStorageKey, JSON.stringify(msg));
  } catch (_) {
    // Storage may be unavailable in restricted contexts.
  }

  if (type === EVT.INCIDENT_MODE) {
    try {
      window.localStorage.setItem(_incidentStateKey, JSON.stringify({ ...payload, ts: msg.ts }));
    } catch (_) {
      // Storage may be unavailable in restricted contexts.
    }
  }

  _dispatchLocal(msg);           // same-tab
}

/**
 * Listen for a specific event type.
 * @param {string}   type    - One of the EVT constants
 * @param {Function} handler - Callback receiving the payload
 */
function onMapEvent(type, handler) {
  if (!_evtHandlers[type]) _evtHandlers[type] = [];
  _evtHandlers[type].push(handler);
}

function _dispatchLocal({ type, payload }) {
  (_evtHandlers[type] || []).forEach(fn => {
    try { fn(payload); } catch (e) { console.error('[NSCNS Event Error]', e); }
  });
}

// Receive events from other tabs/pages
if (_evtChannel) {
  _evtChannel.onmessage = (e) => _dispatchLocal(e.data);
}

window.addEventListener('storage', (e) => {
  if (e.key !== _evtStorageKey || !e.newValue) return;
  try {
    _dispatchLocal(JSON.parse(e.newValue));
  } catch (_) {
    // Ignore malformed payloads.
  }
});

function getIncidentState() {
  try {
    const raw = window.localStorage.getItem(_incidentStateKey);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

function setIncidentState(state) {
  try {
    window.localStorage.setItem(_incidentStateKey, JSON.stringify(state));
  } catch (_) {
    // Ignore storage failures.
  }
}

window.getNSCNSIncidentState = getIncidentState;
window.setNSCNSIncidentState = setIncidentState;
