// events.js — NSCNS Cross-Page Real-time Event Bus
// Connects National HQ, Driver, and Warehouse dashboards
// Uses BroadcastChannel for zero-latency cross-tab communication

const EVT = {
  DRIVER_CONGESTION:    'driver:congestion',    // Driver reports congestion on route
  DRIVER_REROUTED:      'driver:rerouted',      // Driver route has changed
  DRIVER_DELIVERED:     'driver:delivered',     // Driver completes delivery
  WH_TRANSFER_APPROVED: 'wh:transfer_approved', // Warehouse approves supply transfer
  HQ_SCENARIO_CHANGED:  'hq:scenario_changed',  // National HQ updates scenario
};

const _evtChannel  = new BroadcastChannel('nscns_events_v2');
const _evtHandlers = {};

/**
 * Emit an event to all connected pages (including this one).
 * @param {string} type  - One of the EVT constants
 * @param {Object} payload - Arbitrary event data
 */
function emitMapEvent(type, payload = {}) {
  const msg = { type, payload, ts: Date.now() };
  _evtChannel.postMessage(msg); // cross-tab
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
_evtChannel.onmessage = (e) => _dispatchLocal(e.data);
