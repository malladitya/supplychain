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

// Driver route waypoints (fallbacks). Real routes are fetched from OSRM at runtime.
const ROUTE_MAIN_FALLBACK = [
  [28.6139, 77.2090],  // New Delhi   (Origin: North Hub)
  [27.4728, 77.6942],  // Mathura
  [27.1767, 78.0081],  // Agra        (Checkpoint)
  [26.8467, 80.9462],  // Lucknow     (Destination: City Hospital)
];

const ROUTE_BYPASS_FALLBACK = [
  [28.6139, 77.2090],  // New Delhi
  [27.4728, 77.6942],  // Mathura
  [25.4484, 78.5685],  // Jhansi      (bypass Agra)
  [25.3176, 81.0000],  // Allahabad
  [26.8467, 80.9462],  // Lucknow
];

const PUNJAB_ROUTE_MAIN = [
  [27.1767, 78.0081], // Agra (start)
  [28.4595, 77.0266], // Gurugram corridor
  [30.7333, 76.7794], // Chandigarh
  [30.9010, 75.8573], // Ludhiana
  [31.6340, 74.8723], // Amritsar (destination)
];

const PUNJAB_ROUTE_BYPASS = [
  [27.1767, 78.0081], // Agra (start)
  [28.9845, 77.7064], // Karnal corridor
  [30.7333, 76.7794], // Chandigarh
  [32.2643, 75.6492], // Pathankot safe pass
  [31.6340, 74.8723], // Amritsar
];

let ROUTE_MAIN = [...ROUTE_MAIN_FALLBACK];
let ROUTE_BYPASS = [...ROUTE_BYPASS_FALLBACK];

function _normalizeRoutePoints(raw) {
  if (!Array.isArray(raw) || !raw.length) return [];

  // Standard shape: [[lat,lng], [lat,lng], ...]
  if (Array.isArray(raw[0])) {
    return raw
      .filter((p) => Array.isArray(p) && p.length >= 2 && Number.isFinite(Number(p[0])) && Number.isFinite(Number(p[1])))
      .map((p) => [Number(p[0]), Number(p[1])]);
  }

  // Flattened shape: [lat, lng, lat, lng, ...]
  const nums = raw.map((v) => Number(v)).filter((n) => Number.isFinite(n));
  if (nums.length < 4) return [];

  const points = [];
  for (let i = 0; i + 1 < nums.length; i += 2) {
    points.push([nums[i], nums[i + 1]]);
  }
  return points;
}

const ROUTE_SNAPSHOT = window.NSCNS_ROUTE_SNAPSHOTS || null;
const ROUTE_MAIN_SNAPSHOT = _normalizeRoutePoints(ROUTE_SNAPSHOT?.main);
const ROUTE_BYPASS_SNAPSHOT = _normalizeRoutePoints(ROUTE_SNAPSHOT?.bypass);

if (ROUTE_MAIN_SNAPSHOT.length > 20) {
  ROUTE_MAIN = ROUTE_MAIN_SNAPSHOT;
}
if (ROUTE_BYPASS_SNAPSHOT.length > 20) {
  ROUTE_BYPASS = ROUTE_BYPASS_SNAPSHOT;
}

const ORS_API_KEY =
  (window.NSCNS_CONFIG && window.NSCNS_CONFIG.orsApiKey) ||
  window.NSCNS_ORS_API_KEY ||
  window.localStorage.getItem("nscns_ors_api_key") ||
  "";

const ROUTE_PROVIDERS = [
  // Preferred provider for reliable routing (requires API key).
  ...(ORS_API_KEY ? [{ name: "OpenRouteService", kind: "ors" }] : []),
  { name: "OSRM Demo", kind: "osrm", baseUrl: "https://router.project-osrm.org/route/v1/driving" },
  { name: "OSMDE Car", kind: "osrm", baseUrl: "https://routing.openstreetmap.de/routed-car/route/v1/driving" },
];

let _realRoutesPromise = null;
const _routeMetrics = {
  main: null,
  bypass: null,
};
let _routeMode = "default";
const _routeStatus = {
  initialized: false,
  usingRealMain: false,
  usingRealBypass: false,
  providerMain: "Fallback",
  providerBypass: "Fallback",
  usingSnapshot: ROUTE_MAIN_SNAPSHOT.length > 20 || ROUTE_BYPASS_SNAPSHOT.length > 20,
  hasApiKey: Boolean(ORS_API_KEY),
  error: null,
};

function _toCoordString([lat, lng]) {
  return `${lng},${lat}`;
}

function _routePoint(route, ratio = 0.4) {
  if (!Array.isArray(route) || !route.length) return null;
  const i = Math.max(0, Math.min(route.length - 1, Math.floor((route.length - 1) * ratio)));
  return route[i];
}

function _routeLengthKm(route) {
  if (!Array.isArray(route) || route.length < 2) return 0;

  const toRad = (deg) => (deg * Math.PI) / 180;
  const earthRadiusKm = 6371;
  let total = 0;

  for (let i = 1; i < route.length; i++) {
    const [lat1, lng1] = route[i - 1];
    const [lat2, lng2] = route[i];
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    total += 2 * earthRadiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  return total;
}

function _estimateRouteMetrics(route) {
  const distanceKm = _routeLengthKm(route);
  if (!distanceKm) {
    return { distanceKm: 0, durationMin: 0, avgSpeedKph: 0 };
  }

  const avgSpeedKph = 42;
  return {
    distanceKm: Number(distanceKm.toFixed(1)),
    durationMin: Number(((distanceKm / avgSpeedKph) * 60).toFixed(0)),
    avgSpeedKph,
  };
}

function _setRouteSet(mainRoute, bypassRoute, mode = "custom") {
  if (Array.isArray(mainRoute) && mainRoute.length >= 2) {
    ROUTE_MAIN = mainRoute.map((p) => [Number(p[0]), Number(p[1])]);
    _routeMetrics.main = _estimateRouteMetrics(ROUTE_MAIN);
  }
  if (Array.isArray(bypassRoute) && bypassRoute.length >= 2) {
    ROUTE_BYPASS = bypassRoute.map((p) => [Number(p[0]), Number(p[1])]);
    _routeMetrics.bypass = _estimateRouteMetrics(ROUTE_BYPASS);
  }
  _routeMode = mode;
}

function _refreshRouteLayers() {
  if (nationalMap && natDriverRoute) {
    natDriverRoute.setLatLngs(ROUTE_MAIN);
    if (natDriverDot) natDriverDot.setLatLng(_routePoint(ROUTE_MAIN, 0.45) || ROUTE_MAIN[0]);
  }
  if (driverMap && driverRouteLine) {
    driverRouteLine.setLatLngs(ROUTE_MAIN);
    if (driverMarker) driverMarker.setLatLng(_routePoint(ROUTE_MAIN, 0.45) || ROUTE_MAIN[0]);
    driverMap.fitBounds(driverRouteLine.getBounds(), { padding: [40, 40] });
  }
  if (warehouseMap && whDriverOverlay) {
    whDriverOverlay.setLatLngs(ROUTE_MAIN);
  }
}

function setPunjabDemoRoute() {
  _setRouteSet(PUNJAB_ROUTE_MAIN, PUNJAB_ROUTE_BYPASS, "punjab-demo");
  _refreshRouteLayers();
  return getRouteStatus();
}

function setFloodBypassRoute() {
  _setRouteSet(PUNJAB_ROUTE_MAIN, PUNJAB_ROUTE_BYPASS, "punjab-demo-flood");
  _refreshRouteLayers();
  return getRouteStatus();
}

function restoreDefaultRoutes() {
  _setRouteSet(ROUTE_MAIN_FALLBACK, ROUTE_BYPASS_FALLBACK, "default");
  _refreshRouteLayers();
  return getRouteStatus();
}

function syncPunjabFloodStage(stage = 'enroute') {
  if (stage === 'cleared') {
    restoreDefaultRoutes();
    clearIncidentMode();
    return getRouteStatus();
  }

  if (stage === 'rerouted' || stage === 'flood') {
    setFloodBypassRoute();
  } else {
    setPunjabDemoRoute();
  }

  if (stage === 'flood') {
    _setIncidentUi('Active', 'Punjab flood detected. Driver route changed and warehouse notified.');
  } else if (stage === 'rerouted') {
    _setIncidentUi('Active', 'Flood hit Punjab. Driver route changed to bypass the flooded zone.');
  } else {
    _setIncidentUi('Active', 'Driver is moving through the Punjab corridor. Stand by for flood alert.');
  }

  return getRouteStatus();
}

async function _fetchOsrmRouteFromBase(baseUrl, waypoints) {
  if (!Array.isArray(waypoints) || waypoints.length < 2) return null;

  const coords = waypoints.map(_toCoordString).join(";");
  const url = `${baseUrl}/${coords}?overview=full&geometries=geojson&steps=false`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const route = data?.routes?.[0] || null;
    const points = data?.routes?.[0]?.geometry?.coordinates;
    if (!Array.isArray(points) || points.length < 2) return null;
    return {
      route: points.map(([lng, lat]) => [lat, lng]),
      distanceKm: Number(((route?.distance || 0) / 1000).toFixed(1)),
      durationMin: Number(((route?.duration || 0) / 60).toFixed(0)),
      providerDetail: "route-v1",
    };
  } catch (_) {
    return null;
  }
}

async function _fetchBestRoute(waypoints) {
  for (const provider of ROUTE_PROVIDERS) {
    let route = null;
    if (provider.kind === "ors") {
      route = await _fetchOrsRoute(waypoints);
    } else {
      route = await _fetchOsrmRouteFromBase(provider.baseUrl, waypoints);
    }

    if (route?.route?.length) {
      return { ...route, provider: provider.name };
    }
  }

  return { route: null, provider: "Fallback" };
}

async function _fetchOrsRoute(waypoints) {
  if (!ORS_API_KEY || !Array.isArray(waypoints) || waypoints.length < 2) return null;

  const url = "https://api.openrouteservice.org/v2/directions/driving-car/geojson";
  const payload = {
    coordinates: waypoints.map(([lat, lng]) => [lng, lat]),
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": ORS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const route = data?.features?.[0] || null;
    const points = data?.features?.[0]?.geometry?.coordinates;
    if (!Array.isArray(points) || points.length < 2) return null;
    return {
      route: points.map(([lng, lat]) => [lat, lng]),
      distanceKm: Number(((route?.properties?.summary?.distance || 0) / 1000).toFixed(1)),
      durationMin: Number(((route?.properties?.summary?.duration || 0) / 60).toFixed(0)),
      providerDetail: "geojson",
    };
  } catch (_) {
    return null;
  }
}

async function loadRealRoutes() {
  if (_realRoutesPromise) return _realRoutesPromise;

  // Keep the Punjab demo route if an incident is active.
  const incidentState = typeof getNSCNSIncidentState === 'function' ? getNSCNSIncidentState() : null;
  if (incidentState && incidentState.incident === 'punjab_flood') {
    _setRouteSet(PUNJAB_ROUTE_MAIN, PUNJAB_ROUTE_BYPASS, incidentState.status === 'active' ? 'punjab-demo-active' : 'punjab-demo');
    _routeStatus.initialized = true;
    _routeStatus.usingRealMain = false;
    _routeStatus.usingRealBypass = false;
    _routeStatus.providerMain = 'Punjab Demo';
    _routeStatus.providerBypass = 'Punjab Demo';
    _routeStatus.error = null;
    _realRoutesPromise = Promise.resolve({
      main: ROUTE_MAIN,
      bypass: ROUTE_BYPASS,
      usingRealMain: false,
      usingRealBypass: false,
      providerMain: 'Punjab Demo',
      providerBypass: 'Punjab Demo',
    });
    return _realRoutesPromise;
  }

  // Hard guarantee mode: if local route snapshot exists, use it immediately.
  if (ROUTE_MAIN_SNAPSHOT.length > 20 || ROUTE_BYPASS_SNAPSHOT.length > 20) {
    _routeStatus.initialized = true;
    _routeStatus.usingRealMain = ROUTE_MAIN_SNAPSHOT.length > 20;
    _routeStatus.usingRealBypass = ROUTE_BYPASS_SNAPSHOT.length > 20;
    _routeStatus.providerMain = ROUTE_MAIN_SNAPSHOT.length > 20
      ? (ROUTE_SNAPSHOT?.source || "Local Snapshot")
      : "Fallback";
    _routeStatus.providerBypass = ROUTE_BYPASS_SNAPSHOT.length > 20
      ? (ROUTE_SNAPSHOT?.source || "Local Snapshot")
      : "Fallback";
    _routeStatus.error = null;
    _routeMetrics.main = _estimateRouteMetrics(ROUTE_MAIN);
    _routeMetrics.bypass = _estimateRouteMetrics(ROUTE_BYPASS);

    _realRoutesPromise = Promise.resolve({
      main: ROUTE_MAIN,
      bypass: ROUTE_BYPASS,
      usingRealMain: _routeStatus.usingRealMain,
      usingRealBypass: _routeStatus.usingRealBypass,
      providerMain: _routeStatus.providerMain,
      providerBypass: _routeStatus.providerBypass,
    });

    return _realRoutesPromise;
  }

  _realRoutesPromise = (async () => {
    const mainSeed = [
      [28.6139, 77.2090], // Delhi
      [27.1767, 78.0081], // Agra
      [26.8467, 80.9462], // Lucknow
    ];

    const bypassSeed = [
      [28.6139, 77.2090], // Delhi
      [25.4484, 78.5685], // Jhansi
      [25.4358, 81.8463], // Prayagraj
      [26.8467, 80.9462], // Lucknow
    ];

    const [mainResult, bypassResult] = await Promise.all([
      _fetchBestRoute(mainSeed),
      _fetchBestRoute(bypassSeed),
    ]);

    const realMain = mainResult.route;
    const realBypass = bypassResult.route;

    if (realMain?.length) {
      ROUTE_MAIN = realMain;
      _routeMetrics.main = {
        distanceKm: mainResult.distanceKm || _estimateRouteMetrics(realMain).distanceKm,
        durationMin: mainResult.durationMin || _estimateRouteMetrics(realMain).durationMin,
        avgSpeedKph: _estimateRouteMetrics(realMain).avgSpeedKph,
      };
    }
    if (realBypass?.length) {
      ROUTE_BYPASS = realBypass;
      _routeMetrics.bypass = {
        distanceKm: bypassResult.distanceKm || _estimateRouteMetrics(realBypass).distanceKm,
        durationMin: bypassResult.durationMin || _estimateRouteMetrics(realBypass).durationMin,
        avgSpeedKph: _estimateRouteMetrics(realBypass).avgSpeedKph,
      };
    }

    _routeStatus.initialized = true;
    _routeStatus.usingRealMain = Boolean(realMain?.length);
    _routeStatus.usingRealBypass = Boolean(realBypass?.length);
    _routeStatus.providerMain = mainResult.provider;
    _routeStatus.providerBypass = bypassResult.provider;
    _routeStatus.error = _routeStatus.usingRealMain || _routeStatus.usingRealBypass
      ? null
      : "Routing API unavailable. Using fallback coordinates.";

    if (!_routeMetrics.main) _routeMetrics.main = _estimateRouteMetrics(ROUTE_MAIN);
    if (!_routeMetrics.bypass) _routeMetrics.bypass = _estimateRouteMetrics(ROUTE_BYPASS);

    return {
      main: ROUTE_MAIN,
      bypass: ROUTE_BYPASS,
      usingRealMain: _routeStatus.usingRealMain,
      usingRealBypass: _routeStatus.usingRealBypass,
      providerMain: _routeStatus.providerMain,
      providerBypass: _routeStatus.providerBypass,
    };
  })().catch((err) => {
    _routeStatus.initialized = true;
    _routeStatus.usingRealMain = false;
    _routeStatus.usingRealBypass = false;
    _routeStatus.providerMain = "Fallback";
    _routeStatus.providerBypass = "Fallback";
    _routeStatus.error = err?.message || "Failed to load routing data";
    _routeMetrics.main = _estimateRouteMetrics(ROUTE_MAIN);
    _routeMetrics.bypass = _estimateRouteMetrics(ROUTE_BYPASS);

    return {
      main: ROUTE_MAIN,
      bypass: ROUTE_BYPASS,
      usingRealMain: false,
      usingRealBypass: false,
      providerMain: "Fallback",
      providerBypass: "Fallback",
    };
  })();

  return _realRoutesPromise;
}

function getRouteStatus() {
  return {
    ..._routeStatus,
    snapshotMeta: ROUTE_SNAPSHOT
      ? {
          generatedAt: ROUTE_SNAPSHOT.generatedAt || null,
          source: ROUTE_SNAPSHOT.source || "Local Snapshot",
        }
      : null,
    providerChain: ROUTE_PROVIDERS.map((p) => p.name),
    mainPoints: ROUTE_MAIN.length,
    bypassPoints: ROUTE_BYPASS.length,
    mainMetrics: _routeMetrics.main,
    bypassMetrics: _routeMetrics.bypass,
    routeMode: _routeMode,
  };
}

// ─── HELPERS ────────────────────────────────────────────────
function _scoreColor(s) {
  if (s < 35) return "#80ed99";
  if (s < 65) return "#ffd166";
  return "#ff6b6b";
}
function _scoreRadius(s) { return 25000 + (s / 100) * 30000; }

const TILE_URL = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const TILE_OPT = { attribution: '&copy; OSM &copy; CARTO', subdomains: "abcd", maxZoom: 19 };

function addMapLegend(map, title, items, position = "bottomright") {
  if (!map || !Array.isArray(items) || !items.length) return;

  const legend = L.control({ position });
  legend.onAdd = function onAdd() {
    const div = L.DomUtil.create("div", "nscns-map-legend");
    const rows = items
      .map((item) => {
        const symbol = item.symbol || "";
        const label = item.label || "";
        return `<div style="display:flex;align-items:center;gap:8px;margin-top:6px;line-height:1.2;">${symbol}<span style="color:#dbe7ef;font-size:11px;">${label}</span></div>`;
      })
      .join("");

    div.innerHTML = `
      <div style="min-width:200px;max-width:240px;background:rgba(7,16,24,0.92);border:1px solid rgba(255,255,255,0.18);border-radius:10px;padding:10px 12px;backdrop-filter:blur(8px);box-shadow:0 6px 18px rgba(0,0,0,0.3);">
        <div style="color:#ffffff;font-weight:700;font-size:12px;letter-spacing:0.02em;">${title}</div>
        ${rows}
      </div>
    `;
    return div;
  };

  legend.addTo(map);
  return legend;
}


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
    color: "rgba(128,237,153,0.9)", weight: 3, lineCap: "round",
  }).addTo(nationalMap);

  // Driver position dot
  natDriverDot = L.marker(_routePoint(ROUTE_MAIN, 0.45) || ROUTE_MAIN[0], {
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
      color: "rgba(128,237,153,0.9)", weight: 3, lineCap: "round",
    }).addTo(nationalMap);

    // Move driver dot to start
    if (natDriverDot) natDriverDot.setLatLng(newRouteCoords[0]);
  });

  onMapEvent(EVT.WH_TRANSFER_APPROVED, ({ from, to }) => {
    _animateTransferLine(from, to);
  });

  // Upgrade to real road routes when API response arrives.
  loadRealRoutes().then(({ main }) => {
    if (!nationalMap) return;
    if (natDriverRoute) natDriverRoute.setLatLngs(main);
    if (natDriverDot) natDriverDot.setLatLng(_routePoint(main, 0.45) || main[0]);
  });

  addMapLegend(
    nationalMap,
    "Map Meaning",
    [
      { symbol: '<span style="width:12px;height:12px;border-radius:50%;display:inline-block;background:#80ed99;border:1px solid #fff;"></span>', label: "Low risk region point" },
      { symbol: '<span style="width:12px;height:12px;border-radius:50%;display:inline-block;background:#ffd166;border:1px solid #fff;"></span>', label: "Watch risk region point" },
      { symbol: '<span style="width:12px;height:12px;border-radius:50%;display:inline-block;background:#ff6b6b;border:1px solid #fff;"></span>', label: "High risk region point" },
      { symbol: '<span style="width:18px;height:3px;display:inline-block;background:rgba(255,209,102,0.8);"></span>', label: "Inter-region supply link" },
      { symbol: '<span style="width:18px;height:3px;display:inline-block;background:rgba(128,237,153,0.95);"></span>', label: "Active fleet route" },
      { symbol: '<span style="width:10px;height:10px;border-radius:50%;display:inline-block;background:#80ed99;border:2px solid #fff;"></span>', label: "Fleet current location" },
      { symbol: '<span style="width:12px;height:12px;border-radius:50%;display:inline-block;background:rgba(255,107,107,0.6);border:1px dashed #ff6b6b;"></span>', label: "Congestion or flood alert zone" },
    ],
    "bottomleft"
  );
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
      <div class="tezflow-popup">
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
    .addTo(driverMap).bindPopup("<b>🏭 Origin: Agra Logistics Node</b><br>Agra");

  // Destination pin
  L.circleMarker(ROUTE_MAIN[ROUTE_MAIN.length - 1], { radius: 8, color: "#fff", fillColor: "#ffd166", fillOpacity: 1, weight: 2 })
    .addTo(driverMap).bindPopup("<b>🏥 Destination: Punjab Relief Hub</b><br>Amritsar");

  // Truck marker with pulsing ring
  driverMarker = L.marker(_routePoint(ROUTE_MAIN, 0.45) || ROUTE_MAIN[0], {
    icon: L.divIcon({
      html: `<div class="driver-map-pin"><div class="driver-map-pin-ring"></div></div>`,
      iconSize: [24,24], iconAnchor: [12,12], className: "",
    }),
  }).addTo(driverMap).bindPopup("<b>Fleet Unit #710</b><br>📍 En route to Punjab corridor");

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

  // Upgrade to real road route if available.
  loadRealRoutes().then(({ main }) => {
    if (!driverMap) return;
    if (driverRouteLine) driverRouteLine.setLatLngs(main);
    if (driverMarker) driverMarker.setLatLng(_routePoint(main, 0.45) || main[0]);
    driverMap.fitBounds(driverRouteLine.getBounds(), { padding: [40, 40] });
  });

  addMapLegend(
    driverMap,
    "Route Legend",
    [
      { symbol: '<span style="width:18px;height:3px;display:inline-block;background:#80ed99;"></span>', label: "Normal route / reroute path" },
      { symbol: '<span style="width:18px;height:3px;display:inline-block;background:#ff6b6b;"></span>', label: "Congested route segment" },
      { symbol: '<span style="width:12px;height:12px;border-radius:50%;display:inline-block;background:#80ed99;border:2px solid #fff;"></span>', label: "Origin point (North Hub)" },
      { symbol: '<span style="width:12px;height:12px;border-radius:50%;display:inline-block;background:#ffd166;border:2px solid #fff;"></span>', label: "Destination point (Hospital)" },
      { symbol: '<span style="width:12px;height:12px;border-radius:50%;display:inline-block;background:#ff6b6b;border:1px dashed #fff;"></span>', label: "Live congestion warning zone" },
      { symbol: '<span style="width:10px;height:10px;border-radius:50%;display:inline-block;background:#80ed99;box-shadow:0 0 8px rgba(128,237,153,0.9);"></span>', label: "Fleet unit current position" },
    ],
    "bottomleft"
  );
}

/**
 * Called when driver clicks "Report Congestion".
 * Shows red zone, starts auto-reroute countdown, emits event to all pages.
 */
function triggerCongestionOnMap() {
  if (!driverMap) return;

  // Show red danger zone
  if (driverCongZone) driverCongZone.remove();
  driverCongZone = L.circle([30.9010, 75.8573], {
    color: "#ff6b6b", fillColor: "#ff6b6b", fillOpacity: 0.28,
    radius: 22000, weight: 2, dashArray: "6 6",
  }).addTo(driverMap).bindPopup("⚠️ <b>Congestion Zone</b><br>Reporting to National HQ…").openPopup();

  if (driverRouteLine) driverRouteLine.setStyle({ color: "#ff6b6b" });

  // Emit to national + warehouse maps
  emitMapEvent(EVT.DRIVER_CONGESTION, { lat: 30.9010, lng: 75.8573 });

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
    color: "#80ed99", weight: 4, lineCap: "round",
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
    color: "rgba(128,237,153,0.7)", weight: 2,
  }).addTo(warehouseMap);

  warehouseMap.fitBounds([WH_POS, ...WH_SOURCES.map(s => [s.lat, s.lng])], { padding: [40,40] });

  // ── Cross-page event listeners ──────────────────────────
  onMapEvent(EVT.DRIVER_CONGESTION, ({ lat, lng }) => {
    if (whCongZone) warehouseMap.removeLayer(whCongZone);
    whCongZone = L.circle([lat, lng], {
      color: "#ff6b6b", fillColor: "#ff6b6b", fillOpacity: 0.2,
      radius: 30000, weight: 1.5, dashArray: "5 5",
    }).addTo(warehouseMap).bindPopup("⚠️ <b>Fleet #710 Congestion</b><br>Delivery may be delayed").openPopup();

    if (whDriverOverlay) whDriverOverlay.setStyle({ color: "rgba(255,107,107,0.75)", weight: 2.5 });
  });

  onMapEvent(EVT.DRIVER_REROUTED, ({ newRouteCoords }) => {
    if (whCongZone) { warehouseMap.removeLayer(whCongZone); whCongZone = null; }
    if (whDriverOverlay) warehouseMap.removeLayer(whDriverOverlay);
    whDriverOverlay = L.polyline(newRouteCoords, {
      color: "rgba(128,237,153,0.85)", weight: 2.5,
    }).addTo(warehouseMap);
  });

  // Upgrade overlay to real road geometry.
  loadRealRoutes().then(({ main }) => {
    if (!warehouseMap) return;
    if (whDriverOverlay) whDriverOverlay.setLatLngs(main);
  });

  addMapLegend(
    warehouseMap,
    "Supply Legend",
    [
      { symbol: '<span style="width:12px;height:12px;border-radius:50%;display:inline-block;background:#ffd166;border:2px solid #fff;"></span>', label: "Warehouse command node" },
      { symbol: '<span style="width:12px;height:12px;border-radius:50%;display:inline-block;background:#80ed99;border:2px solid #fff;"></span>', label: "Supply source point" },
      { symbol: '<span style="width:18px;height:3px;display:inline-block;background:rgba(128,237,153,0.7);"></span>', label: "Inbound supply corridor" },
      { symbol: '<span style="width:18px;height:3px;display:inline-block;background:rgba(128,237,153,0.9);"></span>', label: "Driver route overlay" },
      { symbol: '<span style="width:12px;height:12px;border-radius:50%;display:inline-block;background:rgba(255,107,107,0.6);border:1px dashed #ff6b6b;"></span>', label: "Delay or congestion alert zone" },
    ],
    "bottomleft"
  );
}

/**
 * Called when Warehouse Manager clicks "Approve Transfer".
 * Animates supply route on warehouse map AND broadcasts the event.
 */
function highlightWarehouseTransfer() {
  if (!warehouseMap) return;

  const src = WH_SOURCES[0]; // South Arc
  const moveLine = L.polyline([[src.lat, src.lng], WH_POS], {
    color: "#80ed99", weight: 4, opacity: 0.95,
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

// ─── Shared Incident Mode (all maps) ───────────────────────
let _incidentLayers = [];

function _trackIncidentLayer(layer, map) {
  if (!layer || !map) return;
  _incidentLayers.push({ layer, map });
}

function _setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function _setColor(id, color) {
  const el = document.getElementById(id);
  if (el) el.style.color = color;
}

function _setIncidentBanner(state, detail) {
  const banner = document.getElementById('incidentBanner');
  if (!banner) return;

  const titleEl = banner.querySelector('[data-incident-title]');
  const detailEl = banner.querySelector('[data-incident-detail]');

  if (titleEl) titleEl.textContent = state;
  if (detailEl) detailEl.textContent = detail;

  banner.dataset.state = state === 'Active' ? 'active' : state === 'Cleared' ? 'cleared' : 'default';
  banner.style.display = state === 'Cleared' ? 'none' : 'flex';
}

function _setIncidentUi(state, detail) {
  const isActive = state === 'Active';
  const title = isActive ? 'Incident mode' : 'Normal';
  const tone = isActive ? 'var(--risk)' : 'var(--ok)';

  _setIncidentBanner(state, detail);

  _setText('routeDataStatus', isActive ? 'Punjab flood incident overlays active' : 'Route provider active');
  _setText('routeSyncState', isActive ? 'Incident' : 'Connected');
  _setText('routeSyncDetail', isActive ? 'Punjab flood routing advisory is active' : 'Route provider health and travel time');
  _setColor('routeSyncState', tone);

  _setText('driverRouteState', isActive ? 'Incident' : 'Live');
  _setText('driverRouteDetail', isActive ? 'Punjab flood alert is synchronizing reroute guidance' : 'Route provider health and travel time');
  _setColor('driverRouteState', tone);

  _setText('hqSyncState', isActive ? title : 'Listening');
  _setText('hqSyncDetail', isActive ? detail : 'Waiting for scenario updates');
  _setColor('hqSyncState', tone);

  _setText('warehouseHeartbeatState', isActive ? 'Incident' : 'Syncing');
  _setText('warehouseHeartbeatDetail', isActive ? 'Punjab flood mode active across all dashboards' : 'Awaiting global state');
  _setColor('warehouseHeartbeatState', tone);

  _setText('driverHeartbeatState', isActive ? 'Incident' : 'Syncing');
  _setText('driverHeartbeatDetail', isActive ? 'Punjab flood mode active across all dashboards' : 'Awaiting global state');
  _setColor('driverHeartbeatState', tone);

  _setText('heartbeatStatus', isActive ? 'Incident' : 'Syncing');
  _setText('heartbeatDetail', isActive ? 'Punjab flood incident synchronized' : 'Awaiting shared state');
  _setColor('heartbeatStatus', tone);
}

function clearIncidentMode() {
  _incidentLayers.forEach(({ layer, map }) => {
    try { map.removeLayer(layer); } catch (_) {}
  });
  _incidentLayers = [];

  restoreDefaultRoutes();

  if (driverRouteLine) {
    driverRouteLine.setStyle({ color: "#80ed99", weight: 4, lineCap: "round", lineJoin: "round" });
  }
  if (whDriverOverlay) {
    whDriverOverlay.setStyle({ color: "rgba(128,237,153,0.85)", weight: 2.5 });
  }

  _setIncidentUi('Cleared', 'Punjab flood incident cleared. Standard routing restored across all pages.');
}

function activatePunjabFloodMode() {
  clearIncidentMode();
  syncPunjabFloodStage('enroute');

  if (nationalMap) {
    const poly = L.polygon([
      [32.6, 73.2], [32.6, 76.9], [29.7, 76.9], [29.7, 73.2],
    ], {
      color: "#ff6b6b", fillColor: "#ff6b6b", fillOpacity: 0.22, weight: 2, dashArray: "8 5",
    }).addTo(nationalMap).bindPopup("🌊 <b>Punjab Flood Incident</b><br>National incident mode active");
    _trackIncidentLayer(poly, nationalMap);
  }

  if (driverMap) {
    const markerPos = driverMarker ? driverMarker.getLatLng() : [27.1767, 78.0081];
    const zone = L.circle(markerPos, {
      color: "#ffd166", fillColor: "#ffd166", fillOpacity: 0.18, radius: 25000, weight: 2, dashArray: "6 6",
    }).addTo(driverMap).bindPopup("⚠️ <b>Punjab Flood Advisory</b><br>Expect national reroute pressure");
    _trackIncidentLayer(zone, driverMap);

    if (driverRouteLine) {
      driverRouteLine.setStyle({ color: "#ffd166", weight: 4, lineCap: "round", lineJoin: "round" });
    }
  }

  if (warehouseMap) {
    const whZone = L.circle(WH_POS, {
      color: "#ffd166", fillColor: "#ffd166", fillOpacity: 0.15, radius: 140000, weight: 2, dashArray: "6 6",
    }).addTo(warehouseMap).bindPopup("⚠️ <b>Punjab Flood Incident Mode</b><br>Warehouse allocations may be reprioritized");
    _trackIncidentLayer(whZone, warehouseMap);

    if (whDriverOverlay) {
      whDriverOverlay.setStyle({ color: "rgba(255,209,102,0.9)", weight: 2.8 });
    }
  }
}
