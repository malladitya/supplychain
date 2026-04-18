// map.js — OpenStreetMap (Leaflet.js) for NSCNS Logistics Platform
// All three maps are INTERLINKED via events.js
// Requires: Leaflet.js, events.js

// ─── SHARED REGION DATA ─────────────────────────────────────
const regionCoords = {
  north:   { lat: 28.6139, lng: 77.2090, city: "New Delhi"  },
  central: { lat: 23.2599, lng: 77.4126, city: "Bhopal"     },
  south:   { lat: 12.9716, lng: 77.5946, city: "Bengaluru"  },
  coastal: { lat: 19.0760, lng: 72.8777, city: "Mumbai"     },
};

const supplyRouteLinks = [
  ["north",   "central"],
  ["central", "south"],
  ["central", "coastal"],
  ["north",   "coastal"],
];

// Driver route waypoints
const ROUTE_MAIN = [
  [28.6139, 77.2090],  // New Delhi   (Origin: North Hub)
  [27.4728, 77.6942],  // Mathura
  [27.1767, 78.0081],  // Agra        (Checkpoint)
  [26.8467, 80.9462],  // Lucknow     (Destination: City Hospital)
];

const ROUTE_BYPASS = [
  [28.6139, 77.2090],  // New Delhi
  [27.4728, 77.6942],  // Mathura
  [25.4484, 78.5685],  // Jhansi      (bypass Agra)
  [25.3176, 81.0000],  // Allahabad
  [26.8467, 80.9462],  // Lucknow
];

// ─── HELPERS ────────────────────────────────────────────────
function _scoreColor(s) {
  if (s < 35) return "#80ed99";
  if (s < 65) return "#ffd166";
  return "#ff6b6b";
}
function _scoreRadius(s) { return 25000 + (s / 100) * 30000; }

const TILE_URL = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const TILE_OPT = { attribution: '&copy; OSM &copy; CARTO', subdomains: "abcd", maxZoom: 19 };


// ════════════════════════════════════════════════════════════
//  NATIONAL HQ MAP  (index.html)
// ════════════════════════════════════════════════════════════
let nationalMap            = null;
const regionCircles        = {};
const regionMarkers        = {};
let   natRouteLines        = [];
let   natDriverRoute       = null;   // Driver path overlay on national map
let   natDriverDot         = null;   // Driver position dot on national map
let   natCongestionOverlay = null;   // Red cone when driver reports congestion

function initNationalMap() {
  const el = document.getElementById("liveMap");
  if (!el || nationalMap) return;

  nationalMap = L.map("liveMap", {
    center: [22.0, 77.5], zoom: 5,
    zoomControl: true, attributionControl: true, scrollWheelZoom: true,
  });
  L.tileLayer(TILE_URL, TILE_OPT).addTo(nationalMap);

  // Supply route polylines (under markers)
  supplyRouteLinks.forEach(([f, t]) => {
    const line = L.polyline(
      [[regionCoords[f].lat, regionCoords[f].lng], [regionCoords[t].lat, regionCoords[t].lng]],
      { color: "rgba(255,209,102,0.28)", weight: 2, dashArray: "10 8", lineCap: "round" }
    ).addTo(nationalMap);
    natRouteLines.push(line);
  });

  // Region circles + dots
  Object.entries(regionCoords).forEach(([id, c]) => {
    regionCircles[id] = L.circle([c.lat, c.lng], {
      color: "#ffd166", fillColor: "#ffd166", fillOpacity: 0.15, weight: 1.5, radius: 40000,
    }).addTo(nationalMap);

    regionMarkers[id] = L.circleMarker([c.lat, c.lng], {
      radius: 9, color: "#0e2030", fillColor: "#ffd166", fillOpacity: 1, weight: 2,
    }).addTo(nationalMap);
  });

  // Driver route overlay (thin, on top)
  natDriverRoute = L.polyline(ROUTE_MAIN, {
    color: "rgba(128,237,153,0.5)", weight: 2, dashArray: "6 5", lineCap: "round",
  }).addTo(nationalMap);

  // Driver position dot
  natDriverDot = L.marker(ROUTE_MAIN[2], {
    icon: L.divIcon({
      html: `<div style="width:10px;height:10px;background:#80ed99;border-radius:50%;border:2px solid #fff;box-shadow:0 0 8px rgba(128,237,153,0.9);"></div>`,
      iconSize: [10,10], iconAnchor: [5,5], className: "",
    }),
  }).addTo(nationalMap).bindPopup("<b>Fleet #710</b><br>📍 In Transit");

  // ── Cross-page event listeners ──────────────────────────
  onMapEvent(EVT.DRIVER_CONGESTION, ({ lat, lng }) => {
    // Show pulsing red danger zone on national map
    if (natCongestionOverlay) nationalMap.removeLayer(natCongestionOverlay);
    natCongestionOverlay = L.circle([lat, lng], {
      color: "#ff6b6b", fillColor: "#ff6b6b", fillOpacity: 0.22,
      radius: 40000, weight: 2, dashArray: "6 6",
    }).addTo(nationalMap).bindPopup("⚠️ <b>Fleet #710 — Congestion</b><br>High chaos on Agra stretch").openPopup();

    if (natDriverRoute) natDriverRoute.setStyle({ color: "rgba(255,107,107,0.65)" });

    // Move driver dot to congestion point
    if (natDriverDot) natDriverDot.setLatLng([lat, lng]);
  });

  onMapEvent(EVT.DRIVER_REROUTED, ({ newRouteCoords }) => {
    // Remove old congestion overlay
    if (natCongestionOverlay) { nationalMap.removeLayer(natCongestionOverlay); natCongestionOverlay = null; }

    // Redraw driver route with bypass
    if (natDriverRoute) nationalMap.removeLayer(natDriverRoute);
    natDriverRoute = L.polyline(newRouteCoords, {
      color: "rgba(128,237,153,0.65)", weight: 2.5, dashArray: "8 5", lineCap: "round",
    }).addTo(nationalMap);

    // Move driver dot to start
    if (natDriverDot) natDriverDot.setLatLng(newRouteCoords[0]);
  });

  onMapEvent(EVT.WH_TRANSFER_APPROVED, ({ from, to }) => {
    _animateTransferLine(from, to);
  });
}

function updateNationalMap(regionViews, primaryId) {
  if (!nationalMap) return;
  regionViews.forEach((r) => {
    const c = regionCoords[r.id];
    if (!c) return;
    const color = _scoreColor(r.score);
    const isPrimary = r.id === primaryId;

    regionCircles[r.id]?.setRadius(_scoreRadius(r.score));
    regionCircles[r.id]?.setStyle({ color, fillColor: color, fillOpacity: isPrimary ? 0.28 : 0.14, weight: isPrimary ? 2 : 1 });

    regionMarkers[r.id]?.setStyle({ fillColor: color, color: isPrimary ? "#fff" : "#0e2030", weight: isPrimary ? 3 : 2, radius: isPrimary ? 11 : 9 });
    regionMarkers[r.id]?.bindPopup(`
      <div class="nscns-popup">
        <div class="popup-title">${r.label}</div>
        <div class="popup-sub">${r.role} · ${c.city}</div>
        <div class="popup-row"><span>Chaos Score</span><strong style="color:${color}">${r.score}</strong></div>
        <div class="popup-row"><span>Supply</span><strong>${r.adjustedSupply}</strong></div>
        <div class="popup-row"><span>Demand</span><strong>${r.adjustedDemand}</strong></div>
        <div class="popup-row"><span>State</span><strong style="color:${color}">${r.state.label}</strong></div>
      </div>`, { maxWidth: 220 });
  });
}

function _animateTransferLine(fromId, toId) {
  if (!nationalMap) return;
  const f = regionCoords[fromId]; const t = regionCoords[toId];
  if (!f || !t) return;
  const line = L.polyline([[f.lat, f.lng], [t.lat, t.lng]], {
    color: "#80ed99", weight: 4, dashArray: "14 6", lineCap: "round", opacity: 0.9,
  }).addTo(nationalMap);
  setTimeout(() => nationalMap.removeLayer(line), 5500);
}


// ════════════════════════════════════════════════════════════
//  DRIVER MAP  (driver.html)
// ════════════════════════════════════════════════════════════
let driverMap          = null;
let driverRouteLine    = null;
let driverMarker       = null;
let driverCongZone     = null;
let _autoRerouteTimer  = null;

function initDriverMap() {
  const el = document.getElementById("driverMap");
  if (!el || driverMap) return;

  driverMap = L.map("driverMap", {
    center: [27.2, 78.8], zoom: 7,
    zoomControl: false, attributionControl: true,
  });
  L.tileLayer(TILE_URL, TILE_OPT).addTo(driverMap);

  // Main route
  driverRouteLine = L.polyline(ROUTE_MAIN, {
    color: "#80ed99", weight: 4, lineCap: "round", lineJoin: "round",
  }).addTo(driverMap);

  // Origin pin
  L.circleMarker(ROUTE_MAIN[0], { radius: 8, color: "#fff", fillColor: "#80ed99", fillOpacity: 1, weight: 2 })
    .addTo(driverMap).bindPopup("<b>🏭 Origin: North Hub</b><br>New Delhi");

  // Destination pin
  L.circleMarker(ROUTE_MAIN[ROUTE_MAIN.length - 1], { radius: 8, color: "#fff", fillColor: "#ffd166", fillOpacity: 1, weight: 2 })
    .addTo(driverMap).bindPopup("<b>🏥 Destination: City Hospital</b><br>Lucknow");

  // Truck marker with pulsing ring
  driverMarker = L.marker(ROUTE_MAIN[2], {
    icon: L.divIcon({
      html: `<div class="driver-map-pin"><div class="driver-map-pin-ring"></div></div>`,
      iconSize: [24,24], iconAnchor: [12,12], className: "",
    }),
  }).addTo(driverMap).bindPopup("<b>Fleet Unit #710</b><br>📍 Agra Checkpoint · Highway 9");

  driverMap.fitBounds(driverRouteLine.getBounds(), { padding: [40, 40] });

  // Listen for events from other pages
  onMapEvent(EVT.WH_TRANSFER_APPROVED, () => {
    _driverNotify("✅ Warehouse approved supply transfer. Proceed to hospital.");
  });
  onMapEvent(EVT.HQ_SCENARIO_CHANGED, ({ chaosScore }) => {
    if (chaosScore > 75) {
      _driverNotify("⚠️ National HQ reports critical Chaos Score. Stay alert.");
    }
  });
}

/**
 * Called when driver clicks "Report Congestion".
 * Shows red zone, starts auto-reroute countdown, emits event to all pages.
 */
function triggerCongestionOnMap() {
  if (!driverMap) return;

  // Show red danger zone
  if (driverCongZone) driverCongZone.remove();
  driverCongZone = L.circle([27.1767, 78.0081], {
    color: "#ff6b6b", fillColor: "#ff6b6b", fillOpacity: 0.28,
    radius: 22000, weight: 2, dashArray: "6 6",
  }).addTo(driverMap).bindPopup("⚠️ <b>Congestion Zone</b><br>Reporting to National HQ…").openPopup();

  if (driverRouteLine) driverRouteLine.setStyle({ color: "#ff6b6b" });

  // Emit to national + warehouse maps
  emitMapEvent(EVT.DRIVER_CONGESTION, { lat: 27.1767, lng: 78.0081 });

  // ── Auto-reroute countdown ──────────────────────────────
  let count = 5;
  const countEl  = document.getElementById("rerouteCountdown");
  const countVal = document.getElementById("countdownValue");
  if (countEl)  countEl.style.display = "block";
  if (countVal) countVal.textContent = count;

  if (_autoRerouteTimer) clearInterval(_autoRerouteTimer);
  _autoRerouteTimer = setInterval(() => {
    count--;
    if (countVal) countVal.textContent = count;
    if (count <= 0) {
      clearInterval(_autoRerouteTimer);
      _autoRerouteTimer = null;
      if (countEl) countEl.style.display = "none";
      triggerRerouteOnMap();                         // Auto-reroute!
      window.dispatchEvent(new CustomEvent("auto_rerouted")); // Signal driver UI
    }
  }, 1000);
}

/**
 * Called when auto-reroute fires OR driver manually clicks "Accept Reroute".
 */
function triggerRerouteOnMap() {
  if (!driverMap) return;

  // Cancel pending timer if manually triggered
  if (_autoRerouteTimer) { clearInterval(_autoRerouteTimer); _autoRerouteTimer = null; }
  const countEl = document.getElementById("rerouteCountdown");
  if (countEl) countEl.style.display = "none";

  // Remove congestion zone
  if (driverCongZone) { driverCongZone.remove(); driverCongZone = null; }

  // Redraw as bypass route
  if (driverRouteLine) driverMap.removeLayer(driverRouteLine);
  driverRouteLine = L.polyline(ROUTE_BYPASS, {
    color: "#80ed99", weight: 4, dashArray: "14 6", lineCap: "round",
  }).addTo(driverMap);

  if (driverMarker) driverMarker.setLatLng(ROUTE_BYPASS[0]);

  driverMap.fitBounds(driverRouteLine.getBounds(), { padding: [40, 40] });

  // Broadcast new route to national + warehouse
  emitMapEvent(EVT.DRIVER_REROUTED, { newRouteCoords: ROUTE_BYPASS });
}

function _driverNotify(msg) {
  const el = document.getElementById("driverMapNotification");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("visible");
  setTimeout(() => el.classList.remove("visible"), 5000);
}


// ════════════════════════════════════════════════════════════
//  FLOOD DEMO MAP ACTIONS  (called by flood-demo.js)
// ════════════════════════════════════════════════════════════
const _floodLayers = []; // Track all demo layers for cleanup

function _trackLayer(layer, map) {
  _floodLayers.push({ layer, map });
  return layer;
}

// Step 1 — Show flood polygon + affected city pins
function showFloodZone(polygon, affectedCities) {
  if (!nationalMap) return;

  const zone = L.polygon(polygon, {
    color: "#ff6b6b", fillColor: "#ff6b6b",
    fillOpacity: 0.22, weight: 2, dashArray: "8 5",
  }).addTo(nationalMap).bindPopup("🌊 <b>Punjab Flood Zone</b><br>Ludhiana region · Severe inundation").openPopup();
  _trackLayer(zone, nationalMap);

  // Affected city markers
  Object.entries(affectedCities).forEach(([key, [lat, lng]]) => {
    const pin = L.circleMarker([lat, lng], {
      radius: 7, color: "#fff", fillColor: "#ff6b6b", fillOpacity: 0.9, weight: 2,
    }).addTo(nationalMap).bindPopup(`⚠️ <b>${key.charAt(0).toUpperCase() + key.slice(1)}</b><br>Flood Impact: High`);
    _trackLayer(pin, nationalMap);
  });

  nationalMap.fitBounds(L.polygon(polygon).getBounds(), { padding: [60, 60] });
}

// Step 2 — Emergency corridors (bright animated lines)
function showEmergencyCorridors(corridors) {
  if (!nationalMap) return;

  corridors.forEach(c => {
    const coords = [[...c.from], ...(c.via || []).map(v => [...v]), [...c.to]];
    const line = L.polyline(coords, {
      color: "#80ed99", weight: 4, dashArray: "14 6", lineCap: "round", opacity: 0.95,
    }).addTo(nationalMap).bindPopup(`🚑 <b>${c.label}</b><br>Emergency Priority Route — Active`);
    _trackLayer(line, nationalMap);

    // Endpoint arrow
    const dest = L.circleMarker(c.to, {
      radius: 9, color: "#fff", fillColor: "#80ed99", fillOpacity: 1, weight: 2,
    }).addTo(nationalMap);
    _trackLayer(dest, nationalMap);
  });
}

// Step 3 — Self-healing bypass routes
function showBypassRoutes() {
  if (!nationalMap) return;

  const bypasses = [
    { coords: [[28.6139,77.2090],[29.0944,76.0850],[30.7333,76.7794]], label: "Haryana Bypass" },
    { coords: [[28.6139,77.2090],[26.9124,75.7873],[30.9010,75.8573]], label: "Rajasthan Bypass" },
  ];

  bypasses.forEach(b => {
    const line = L.polyline(b.coords, {
      color: "#ffd166", weight: 3, dashArray: "10 7", lineCap: "round", opacity: 0.85,
    }).addTo(nationalMap).bindPopup(`🔄 <b>${b.label}</b><br>Self-Healing: 600 trucks rerouted`);
    _trackLayer(line, nationalMap);
  });
}

// Step 4 — Shortage heatmap rings over affected cities
function showShortageRings(affectedCities) {
  if (!nationalMap) return;
  const categories = [
    { color: "#ff6b6b", label: "Food Shortage (82%)",   radius: 45000 },
    { color: "#74b9ff", label: "Medicine Shortage (91%)",radius: 35000 },
    { color: "#ffd166", label: "Fuel Critical (74%)",   radius: 30000 },
  ];

  Object.values(affectedCities).slice(0, 3).forEach(([lat, lng], i) => {
    const cat = categories[i] || categories[0];
    const ring = L.circle([lat, lng], {
      color: cat.color, fillColor: cat.color, fillOpacity: 0.18,
      radius: cat.radius, weight: 2, dashArray: "5 5",
    }).addTo(nationalMap).bindPopup(`📉 <b>${cat.label}</b><br>LSTM Prediction · Intervention Required`);
    _trackLayer(ring, nationalMap);
  });
}

// Step 5 — Resource flow arrows (animated polylines with emoji markers)
function showResourceFlows(flows) {
  if (!nationalMap) return;

  flows.forEach(f => {
    const line = L.polyline([f.from, f.to], {
      color: f.color || "#80ed99", weight: 4, dashArray: "12 5", lineCap: "round", opacity: 0.9,
    }).addTo(nationalMap)
      .bindPopup(`📦 <b>${f.type}</b><br>${f.amount}t dispatched → Destination`);
    _trackLayer(line, nationalMap);

    // Animated dot along the route
    const dot = L.circleMarker(f.from, {
      radius: 6, color: "#fff", fillColor: f.color || "#80ed99", fillOpacity: 1, weight: 2,
    }).addTo(nationalMap);
    _trackLayer(dot, nationalMap);

    // Move dot toward destination
    let progress = 0;
    const move = setInterval(() => {
      progress = Math.min(1, progress + 0.1);
      const lat = f.from[0] + (f.to[0] - f.from[0]) * progress;
      const lng = f.from[1] + (f.to[1] - f.from[1]) * progress;
      dot.setLatLng([lat, lng]);
      if (progress >= 1) clearInterval(move);
    }, 250);
  });
}

// Step 6 — Pulse all regional AI nodes
function pulseAllNodes() {
  if (!nationalMap) return;
  Object.entries(regionCoords).forEach(([id, c]) => {
    const pulse = L.circle([c.lat, c.lng], {
      color: "#a29bfe", fillColor: "#a29bfe", fillOpacity: 0.15,
      radius: 60000, weight: 1, dashArray: "4 4",
    }).addTo(nationalMap).bindPopup(`🧩 <b>${id.toUpperCase()} Node AI</b><br>Autonomous decision mode active`);
    _trackLayer(pulse, nationalMap);
    setTimeout(() => nationalMap.removeLayer(pulse), 5000);
  });
}

// Step 7 — Stabilization: clear red, restore green
function showStabilization() {
  if (!nationalMap) return;

  // Remove flood zone layers after 2 seconds
  setTimeout(() => {
    _floodLayers.forEach(({ layer, map }) => {
      try { map.removeLayer(layer); } catch (_) {}
    });
    _floodLayers.length = 0;
  }, 2000);

  // Show a stabilization message
  const msg = L.popup({ closeButton: false, autoPan: false })
    .setLatLng([30.7333, 76.7794])
    .setContent("✅ <b>Punjab Corridor Stabilizing</b><br>Score dropping 92→67. Emergency supplies in transit.")
    .openOn(nationalMap);
  setTimeout(() => nationalMap.closePopup(), 5000);
}

// Clear all flood demo overlays
function clearFloodDemo() {
  _floodLayers.forEach(({ layer, map }) => {
    try { map.removeLayer(layer); } catch (_) {}
  });
  _floodLayers.length = 0;
  if (nationalMap) nationalMap.closePopup();
}

// ─── Offline Zones ──────────────────────────────────────────
let _offlineLayers = [];

function showOfflineZones(zones) {
  if (!nationalMap) return;

  _offlineLayers.forEach(l => { try { nationalMap.removeLayer(l); } catch (_) {} });
  _offlineLayers = [];

  zones.forEach(z => {
    const circle = L.circle([z.lat, z.lng], {
      color: "rgba(120,120,120,0.6)", fillColor: "rgba(120,120,120,0.3)",
      fillOpacity: 0.3, radius: z.radius, weight: 1, dashArray: "6 4",
    }).addTo(nationalMap).bindPopup(`📵 <b>${z.label}</b><br>Offline — Edge Mode Active. Cached data serving requests.`);
    _offlineLayers.push(circle);
  });
}

function clearOfflineZones() {
  _offlineLayers.forEach(l => { try { nationalMap.removeLayer(l); } catch (_) {} });
  _offlineLayers = [];
}

// ─── Dynamic Allocation Flows on National Map ───────────────
let _allocationLayers = [];

function showAllocationFlows(transfers) {
  if (!nationalMap || !transfers?.length) return;

  _allocationLayers.forEach(l => { try { nationalMap.removeLayer(l); } catch (_) {} });
  _allocationLayers = [];

  transfers.forEach(t => {
    if (!t.fromCoords?.[0] || !t.toCoords?.[0]) return;
    const line = L.polyline([t.fromCoords, t.toCoords], {
      color: "#80ed99", weight: 3, dashArray: "12 6", lineCap: "round", opacity: 0.75,
    }).addTo(nationalMap)
      .bindPopup(`⚖️ <b>${t.amount} units</b><br>${t.fromLabel} → ${t.toLabel}<br>${t.goods}`);
    _allocationLayers.push(line);
  });

  // Auto-fade after 6s
  setTimeout(() => {
    _allocationLayers.forEach(l => { try { nationalMap.removeLayer(l); } catch (_) {} });
    _allocationLayers = [];
  }, 6000);
}
let warehouseMap     = null;
let whDriverOverlay  = null;   // Driver route overlay on warehouse map
let whCongZone       = null;   // Red zone showing driver congestion

const WH_POS = [23.2599, 77.4126]; // Bhopal
const WH_SOURCES = [
  { lat: 12.9716, lng: 77.5946, label: "South Arc Surplus", city: "Bengaluru" },
  { lat: 28.6139, lng: 77.2090, label: "North Hub Stock",   city: "New Delhi"  },
];

function initWarehouseMap() {
  const el = document.getElementById("whMap");
  if (!el || warehouseMap) return;

  warehouseMap = L.map("whMap", {
    center: WH_POS, zoom: 5,
    zoomControl: false, attributionControl: true,
  });
  L.tileLayer(TILE_URL, TILE_OPT).addTo(warehouseMap);

  // Warehouse pin
  L.marker(WH_POS, {
    icon: L.divIcon({
      html: `<div style="width:18px;height:18px;background:#ffd166;border-radius:50%;border:3px solid #fff;box-shadow:0 0 16px rgba(255,209,102,0.9);"></div>`,
      iconSize: [18,18], iconAnchor: [9,9], className: "",
    }),
  }).addTo(warehouseMap).bindPopup("<b>Central Corridor Warehouse</b><br>Bhopal · HQ Node").openPopup();

  // Supply source pins + inbound lines
  WH_SOURCES.forEach(src => {
    L.circleMarker([src.lat, src.lng], { radius: 8, color: "#fff", fillColor: "#80ed99", fillOpacity: 1, weight: 2 })
      .addTo(warehouseMap).bindPopup(`<b>${src.label}</b><br>${src.city}`);
    L.polyline([[src.lat, src.lng], WH_POS], {
      color: "rgba(128,237,153,0.35)", weight: 2, dashArray: "8 8",
    }).addTo(warehouseMap);
  });

  // Active driver route shadow (so warehouse can follow fleet progress)
  whDriverOverlay = L.polyline(ROUTE_MAIN, {
    color: "rgba(128,237,153,0.35)", weight: 1.5, dashArray: "5 5",
  }).addTo(warehouseMap);

  warehouseMap.fitBounds([WH_POS, ...WH_SOURCES.map(s => [s.lat, s.lng])], { padding: [40,40] });

  // ── Cross-page event listeners ──────────────────────────
  onMapEvent(EVT.DRIVER_CONGESTION, ({ lat, lng }) => {
    if (whCongZone) warehouseMap.removeLayer(whCongZone);
    whCongZone = L.circle([lat, lng], {
      color: "#ff6b6b", fillColor: "#ff6b6b", fillOpacity: 0.2,
      radius: 30000, weight: 1.5, dashArray: "5 5",
    }).addTo(warehouseMap).bindPopup("⚠️ <b>Fleet #710 Congestion</b><br>Delivery may be delayed").openPopup();

    if (whDriverOverlay) whDriverOverlay.setStyle({ color: "rgba(255,107,107,0.45)" });
  });

  onMapEvent(EVT.DRIVER_REROUTED, ({ newRouteCoords }) => {
    if (whCongZone) { warehouseMap.removeLayer(whCongZone); whCongZone = null; }
    if (whDriverOverlay) warehouseMap.removeLayer(whDriverOverlay);
    whDriverOverlay = L.polyline(newRouteCoords, {
      color: "rgba(128,237,153,0.45)", weight: 2, dashArray: "7 5",
    }).addTo(warehouseMap);
  });
}

/**
 * Called when Warehouse Manager clicks "Approve Transfer".
 * Animates supply route on warehouse map AND broadcasts the event.
 */
function highlightWarehouseTransfer() {
  if (!warehouseMap) return;

  const src = WH_SOURCES[0]; // South Arc
  const moveLine = L.polyline([[src.lat, src.lng], WH_POS], {
    color: "#80ed99", weight: 4, dashArray: "14 6", opacity: 0.95,
  }).addTo(warehouseMap);

  const pulse = L.circle([src.lat, src.lng], {
    color: "#80ed99", fillColor: "#80ed99", fillOpacity: 0.18,
    radius: 100000, weight: 1,
  }).addTo(warehouseMap);

  setTimeout(() => {
    warehouseMap.removeLayer(moveLine);
    warehouseMap.removeLayer(pulse);
  }, 6000);

  // Broadcast to National HQ + Driver
  emitMapEvent(EVT.WH_TRANSFER_APPROVED, { from: "south", to: "central" });
}
