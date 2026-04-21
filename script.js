const storageKey = "nscns-learning-runs";

const controls = {
  stressRange: document.getElementById("stressRange"),
  regionSelect: document.getElementById("regionSelect"),
  eventSelect: document.getElementById("eventSelect"),
  weatherRange: document.getElementById("weatherRange"),
  trafficRange: document.getElementById("trafficRange"),
  demandRange: document.getElementById("demandRange"),
  integrationRange: document.getElementById("integrationRange"),
  policySelect: document.getElementById("policySelect"),
  emergencyToggle: document.getElementById("emergencyToggle"),
  offlineToggle: document.getElementById("offlineToggle"),
  runScenarioBtn: document.getElementById("runScenarioBtn"),
  healScenarioBtn: document.getElementById("healScenarioBtn"),
  saveLessonBtn: document.getElementById("saveLessonBtn"),
};

const outputs = {
  heroScore: document.getElementById("heroChaosScore"),
  heroState: document.getElementById("heroChaosState"),
  scoreValue: document.getElementById("chaosScore"),
  scoreState: document.getElementById("chaosState"),
  forecastValue: document.getElementById("forecastValue"),
  forecastDetail: document.getElementById("forecastDetail"),
  responseMode: document.getElementById("responseMode"),
  responseDetail: document.getElementById("responseDetail"),
  explainList: document.getElementById("explainList"),
  allocationList: document.getElementById("allocationList"),
  forecastList: document.getElementById("forecastList"),
  regionGrid: document.getElementById("regionGrid"),
  policyCompare: document.getElementById("policyCompare"),
  policyList: document.getElementById("policyList"),
  integrationList: document.getElementById("integrationList"),
  liveSignalsList: document.getElementById("liveSignalsList"),
  liveTransitList: document.getElementById("liveTransitList"),
  liveWeatherList: document.getElementById("liveWeatherList"),
  historyList: document.getElementById("historyList"),
  liveMap: document.getElementById("liveMap"),
  routeDataStatus: document.getElementById("routeDataStatus"),
  analysisStatus: document.getElementById("analysisStatus"),
  analysisDetail: document.getElementById("analysisDetail"),
  heartbeatStatus: document.getElementById("heartbeatStatus"),
  heartbeatDetail: document.getElementById("heartbeatDetail"),
};

const regions = [
  {
    id: "north",
    label: "North Hub",
    role: "Manufacturing",
    baseSupply: 84,
    baseDemand: 58,
    connectivity: 90,
    transport: 72,
    weatherSensitivity: 0.9,
    trafficSensitivity: 0.95,
    riskBias: -4,
  },
  {
    id: "central",
    label: "Central Corridor",
    role: "Distribution",
    baseSupply: 76,
    baseDemand: 74,
    connectivity: 92,
    transport: 78,
    weatherSensitivity: 1,
    trafficSensitivity: 1.1,
    riskBias: 2,
  },
  {
    id: "south",
    label: "South Arc",
    role: "Agriculture",
    baseSupply: 88,
    baseDemand: 66,
    connectivity: 82,
    transport: 69,
    weatherSensitivity: 1.2,
    trafficSensitivity: 0.9,
    riskBias: 1,
  },
  {
    id: "coastal",
    label: "Coastal Belt",
    role: "Import Node",
    baseSupply: 71,
    baseDemand: 63,
    connectivity: 80,
    transport: 84,
    weatherSensitivity: 1.35,
    trafficSensitivity: 1.0,
    riskBias: 5,
  },
];

const partnerNodes = [
  { name: "Federal Ops", channel: "Governance", status: "Synced" },
  { name: "Private Carriers", channel: "Transport", status: "Aligned" },
  { name: "Hospitals", channel: "Medical", status: "Protected" },
  { name: "Food Distributors", channel: "Retail", status: "Watching" },
];

const eventProfiles = {
  normal: {
    label: "Normal operations",
    detail: "Routine demand and stable routing",
    demand: 0,
    traffic: 0,
    weather: 0,
    risk: 0,
    bias: 0,
  },
  festival: {
    label: "Festival surge",
    detail: "Demand spikes and route congestion",
    demand: 9,
    traffic: 8,
    weather: 0,
    risk: 6,
    bias: 2,
  },
  election: {
    label: "Election logistics",
    detail: "Distribution pressure across civic sites",
    demand: 6,
    traffic: 5,
    weather: 0,
    risk: 5,
    bias: 1,
  },
  storm: {
    label: "Severe storm",
    detail: "Weather disruption and lane closures",
    demand: 3,
    traffic: 7,
    weather: 12,
    risk: 13,
    bias: 4,
  },
  disaster: {
    label: "Disaster response",
    detail: "Critical goods and emergency triage",
    demand: 11,
    traffic: 10,
    weather: 8,
    risk: 18,
    bias: 7,
  },
};

const policyProfiles = {
  balanced: {
    title: "Balanced response",
    compare: "Balanced policy keeps service, cost, and resilience in equilibrium.",
    riskDelta: 0,
    costDelta: 0,
    serviceDelta: 0,
  },
  resilience: {
    title: "Resilience first",
    compare: "Resilience mode lowers risk fastest, but at a higher operating cost.",
    riskDelta: -9,
    costDelta: 11,
    serviceDelta: 8,
  },
  cost: {
    title: "Cost control",
    compare: "Cost control reduces spend, but leaves less buffer when disruptions worsen.",
    riskDelta: 7,
    costDelta: -10,
    serviceDelta: -4,
  },
  equity: {
    title: "Equity allocation",
    compare: "Equity mode redistributes more aggressively toward deficit regions.",
    riskDelta: -4,
    costDelta: 4,
    serviceDelta: 6,
  },
};

const scenario = {
  region: "central",
  event: "normal",
  weather: 38,
  traffic: 52,
  demand: 64,
  integration: 76,
  policy: "balanced",
  emergency: false,
  offline: false,
  healingBoost: 0,
};

let lessons = loadLessons();
let healingTimer = null;
let analysisTimer = null;
let weatherTimer = null;
const analysisIntervalMs = 15000;
const weatherRefreshIntervalMs = 10 * 60 * 1000;
const liveOps = {
  congestion: 0,
  warehouseTransfer: 0,
  deliveryProgress: 0,
  rerouteActive: false,
  lastEvent: "Awaiting field updates",
  signals: [],
};
const liveWeather = {
  byRegion: {},
  lastUpdated: null,
  status: "Loading external weather feed",
};
const liveGeo = {
  north: { label: "North Hub", lat: 28.6139, lng: 77.2090 },
  central: { label: "Central Corridor", lat: 23.2599, lng: 77.4126 },
  south: { label: "South Arc", lat: 12.9716, lng: 77.5946 },
  coastal: { label: "Coastal Belt", lat: 19.0760, lng: 72.8777 },
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getRiskState(score) {
  if (score < 35) {
    return { label: "Stable", color: "var(--ok)" };
  }
  if (score < 65) {
    return { label: "Watch Zone", color: "var(--warn)" };
  }
  return { label: "High Alert", color: "var(--risk)" };
}

function loadLessons() {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLessons() {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(lessons.slice(0, 8)));
  } catch {
    // Ignore storage failures in restricted browser contexts.
  }
}

function getRegion(regionId) {
  return regions.find((region) => region.id === regionId) || regions[1];
}

function getEventProfile(eventId) {
  return eventProfiles[eventId] || eventProfiles.normal;
}

function getPolicyProfile(policyId) {
  return policyProfiles[policyId] || policyProfiles.balanced;
}

function getLearningDiscount(eventId) {
  const matchingRuns = lessons.filter((lesson) => lesson.event === eventId).length;
  return clamp(matchingRuns * 1.2, 0, 8);
}

function buildSystemHeartbeat(primaryRegion, routeStatus, weatherFeed) {
  const routeLive = Boolean(routeStatus?.usingRealMain || routeStatus?.usingRealBypass);
  const weatherLive = Boolean(weatherFeed?.lastUpdated);
  const score = primaryRegion?.score ?? 0;
  const tone = score >= 80 ? "Critical" : score >= 60 ? "Watch" : "Nominal";
  const detailParts = [
    `${primaryRegion?.label || "Unknown region"}: ${score}`,
    routeLive ? "route live" : "route fallback",
    weatherLive ? `weather ${weatherFeed.lastUpdated}` : "weather pending",
  ];

  return {
    tone,
    detail: detailParts.join(" · "),
    score,
    routeLive,
    weatherLive,
  };
}

function weatherCodeToLabel(code) {
  const weatherMap = {
    0: "Clear",
    1: "Mostly clear",
    2: "Partly cloudy",
    3: "Cloudy",
    45: "Fog",
    48: "Rime fog",
    51: "Light drizzle",
    53: "Drizzle",
    55: "Heavy drizzle",
    56: "Freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Light rain",
    63: "Rain",
    65: "Heavy rain",
    66: "Freezing rain",
    67: "Heavy freezing rain",
    71: "Light snow",
    73: "Snow",
    75: "Heavy snow",
    80: "Rain showers",
    81: "Moderate showers",
    82: "Violent showers",
    95: "Thunderstorm",
    96: "Thunderstorm with hail",
    99: "Severe thunderstorm",
  };

  return weatherMap[code] || `Weather code ${code}`;
}

function weatherCodePressure(code) {
  if ([0].includes(code)) return 0;
  if ([1, 2, 3].includes(code)) return 4;
  if ([45, 48].includes(code)) return 8;
  if ([51, 53, 55].includes(code)) return 11;
  if ([56, 57].includes(code)) return 14;
  if ([61, 63, 65].includes(code)) return 17;
  if ([66, 67].includes(code)) return 21;
  if ([71, 73, 75].includes(code)) return 19;
  if ([80, 81, 82].includes(code)) return 18;
  if ([95, 96, 99].includes(code)) return 24;
  return 7;
}

function computeRoutePressure(status) {
  if (!status || !status.initialized) {
    return 6;
  }

  const mainMetrics = status.mainMetrics || {};
  const bypassMetrics = status.bypassMetrics || {};

  if (mainMetrics.distanceKm > 0 && mainMetrics.durationMin > 0) {
    const mainMinutesPerKm = mainMetrics.durationMin / mainMetrics.distanceKm;
    const bypassMinutesPerKm = bypassMetrics.distanceKm > 0 && bypassMetrics.durationMin > 0
      ? bypassMetrics.durationMin / bypassMetrics.distanceKm
      : mainMinutesPerKm;
    const routeGap = Math.max(0, mainMinutesPerKm - bypassMinutesPerKm);
    return clamp(Math.round(routeGap * 8 + (status.usingRealMain || status.usingRealBypass ? 1 : 4)), 0, 20);
  }

  if (status.usingRealMain || status.usingRealBypass) {
    return 1;
  }

  return status.hasApiKey ? 3 : 8;
}

async function refreshLiveWeatherFeed() {
  const regions = Object.entries(liveGeo);
  const results = await Promise.allSettled(
    regions.map(async ([id, region]) => {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${region.lat}&longitude=${region.lng}&current=temperature_2m,precipitation,wind_speed_10m,weather_code&timezone=auto`;
      const response = await fetch(url, { method: "GET" });
      if (!response.ok) {
        throw new Error(`Weather request failed for ${region.label}`);
      }

      const payload = await response.json();
      const current = payload?.current || {};
      const code = Number(current.weather_code ?? 0);
      const pressure = clamp(
        Math.round(
          weatherCodePressure(code) +
          Number(current.precipitation ?? 0) * 2 +
          Number(current.wind_speed_10m ?? 0) / 8
        ),
        0,
        30
      );

      return {
        id,
        label: region.label,
        temperature: Number(current.temperature_2m ?? 0),
        precipitation: Number(current.precipitation ?? 0),
        wind: Number(current.wind_speed_10m ?? 0),
        code,
        summary: weatherCodeToLabel(code),
        pressure,
        updatedAt: new Date().toLocaleTimeString(),
      };
    })
  );

  results.forEach((result, index) => {
    const regionId = regions[index][0];
    if (result.status === "fulfilled") {
      liveWeather.byRegion[regionId] = result.value;
    }
  });

  liveWeather.lastUpdated = new Date().toLocaleTimeString();
  liveWeather.status = "External weather feed active";
  render();
}

function pushLiveSignal(label, value) {
  liveOps.lastEvent = label;
  liveOps.signals = [
    { label, value, timestamp: new Date().toLocaleTimeString() },
    ...liveOps.signals,
  ].slice(0, 6);
}

function getLiveOpsPressure() {
  const congestionPressure = liveOps.congestion * 0.16;
  const reroutePressure = liveOps.rerouteActive ? -5 : 0;
  const transferRelief = liveOps.warehouseTransfer > 0 ? -4 : 0;
  const deliveryRelief = liveOps.deliveryProgress > 0 ? -3 : 0;
  return clamp(Math.round(congestionPressure + reroutePressure + transferRelief + deliveryRelief), -12, 18);
}

function syncSignalStateFromEvent(eventType, payload = {}) {
  if (eventType === EVT.DRIVER_CONGESTION) {
    liveOps.congestion = 92;
    liveOps.rerouteActive = true;
    pushLiveSignal("Driver reported congestion", `Route pressure near ${payload.lat?.toFixed?.(2) || "field"}, ${payload.lng?.toFixed?.(2) || "node"}`);
  }

  if (eventType === EVT.DRIVER_REROUTED) {
    liveOps.congestion = 38;
    liveOps.rerouteActive = false;
    pushLiveSignal("Driver rerouted", "Bypass route active and congestion reduced");
  }

  if (eventType === EVT.WH_TRANSFER_APPROVED) {
    liveOps.warehouseTransfer = 1;
    scenario.integration = clamp(scenario.integration + 8, 0, 100);
    pushLiveSignal("Warehouse transfer approved", `${payload.from || "source"} → ${payload.to || "destination"}`);
  }

  if (eventType === EVT.DRIVER_DELIVERED) {
    liveOps.deliveryProgress = 1;
    scenario.demand = clamp(scenario.demand - 7, 0, 100);
    pushLiveSignal("Delivery confirmed", `${payload.unit || "Fleet unit"} completed drop-off`);
  }
}

function computeRegionView(region) {
  const eventProfile = getEventProfile(scenario.event);
  const learningDiscount = getLearningDiscount(scenario.event);
  const offlinePenalty = scenario.offline ? 0.12 : 0;
  const emergencyBonus = scenario.emergency ? 10 : 0;
  const policyProfile = getPolicyProfile(scenario.policy);
  const livePressure = getLiveOpsPressure();
  const weatherInfo = liveWeather.byRegion[region.id];
  const liveWeatherPressure = weatherInfo ? weatherInfo.pressure : 0;
  const routePressure = computeRoutePressure(typeof getRouteStatus === "function" ? getRouteStatus() : null);
  const weatherSignal = clamp(Math.round((scenario.weather * 0.55) + (liveWeatherPressure * 0.45)), 0, 100);

  const adjustedSupply = region.baseSupply * (1 - offlinePenalty);
  const adjustedDemand = region.baseDemand * (1 + scenario.demand / 180) + eventProfile.bias;
  const gap = adjustedDemand - adjustedSupply;

  const regionalRisk =
    15 +
    weatherSignal * (0.22 * region.weatherSensitivity) +
    scenario.traffic * (0.21 * region.trafficSensitivity) +
    scenario.demand * 0.18 +
    eventProfile.risk +
    emergencyBonus +
    livePressure +
    routePressure +
    (scenario.offline ? 8 : 0) -
    scenario.integration * 0.17 +
    region.riskBias +
    gap * 0.72 -
    scenario.healingBoost +
    policyProfile.riskDelta -
    learningDiscount;

  const score = clamp(Math.round(regionalRisk), 0, 100);

  return {
    ...region,
    adjustedSupply: Math.round(adjustedSupply),
    adjustedDemand: Math.round(adjustedDemand),
    gap: Math.round(gap),
    score,
    state: getRiskState(score),
  };
}

function buildShortageForecast(primaryScore) {
  if (primaryScore < 30) {
    return {
      label: "Low",
      detail: "Buffers are healthy and response capacity is stable.",
      items: [
        "Food supply holds at normal reserve levels.",
        "Medical logistics remain within expected throughput.",
        "Fuel and cold-chain capacity are not under pressure.",
      ],
    };
  }

  if (primaryScore < 60) {
    return {
      label: "Moderate",
      detail: "Targeted shortages may appear without selective rerouting.",
      items: [
        "Food inventory is likely to tighten in the selected region.",
        "Medical shipments should be prioritized on protected lanes.",
        "Fuel allocation needs close watch for the next planning cycle.",
      ],
    };
  }

  if (primaryScore < 80) {
    return {
      label: "High",
      detail: "Forecast points to cross-sector shortages without intervention.",
      items: [
        "Food and fuel shortages are expected first.",
        "Emergency lanes should be activated for critical goods.",
        "Commercial routes need immediate rebalancing.",
      ],
    };
  }

  return {
    label: "Severe",
    detail: "Multiple categories require emergency orchestration now.",
    items: [
      "Medical reserves and food distribution require emergency dispatch.",
      "Route failures should be assumed until self-healing completes.",
      "Manual oversight is required across public and private nodes.",
    ],
  };
}

function buildExplainability(regionView) {
  const eventProfile = getEventProfile(scenario.event);
  const learningDiscount = getLearningDiscount(scenario.event);
  const factors = [
    {
      label: "Weather pressure",
      value: `${scenario.weather} manual / ${liveWeather.byRegion[regionView.id]?.pressure ?? 0} live`,
      impact: Math.round((scenario.weather * 0.22 * 0.55 + (liveWeather.byRegion[regionView.id]?.pressure ?? 0) * 0.22 * 0.45) * regionView.weatherSensitivity),
    },
    {
      label: "Traffic congestion",
      value: scenario.traffic,
      impact: Math.round(scenario.traffic * 0.21 * regionView.trafficSensitivity),
    },
    {
      label: "Demand pressure",
      value: scenario.demand,
      impact: Math.round(scenario.demand * 0.18),
    },
    {
      label: "Event awareness",
      value: eventProfile.label,
      impact: eventProfile.risk,
    },
    {
      label: "Learning adjustment",
      value: `${lessons.length} saved lesson${lessons.length === 1 ? "" : "s"}`,
      impact: -Math.round(learningDiscount),
    },
  ];

  return factors.sort((left, right) => right.impact - left.impact);
}

function buildAllocationPlan(regionViews) {
  const surplusRegions = regionViews
    .filter((region) => region.gap < 0)
    .sort((left, right) => left.gap - right.gap)
    .map((region) => ({ ...region, surplus: Math.abs(region.gap) }));

  const deficitRegions = regionViews
    .filter((region) => region.gap > 0)
    .sort((left, right) => right.gap - left.gap)
    .map((region) => ({ ...region, need: region.gap }));

  const plans = [];

  deficitRegions.forEach((deficit) => {
    let remainingNeed = deficit.need;

    surplusRegions.forEach((surplus) => {
      if (remainingNeed <= 0 || surplus.surplus <= 0) {
        return;
      }

      const transfer = Math.min(remainingNeed, surplus.surplus, scenario.policy === "equity" ? 24 : 18);
      if (transfer > 0) {
        surplus.surplus -= transfer;
        remainingNeed -= transfer;
        plans.push(
          `${transfer} units from ${surplus.label} to ${deficit.label}`
        );
      }
    });

    if (remainingNeed > 0) {
      plans.push(`${deficit.label} still needs ${remainingNeed} units of local reinforcement`);
    }
  });

  if (!plans.length) {
    plans.push("No major transfers required. Regional supply is currently balanced.");
  }

  return plans;
}

function buildPolicyAssessment(primaryScore, regionView) {
  const policyProfile = getPolicyProfile(scenario.policy);
  const serviceLevel = clamp(100 - primaryScore + policyProfile.serviceDelta, 0, 100);
  const costLevel = clamp(40 + policyProfile.costDelta + (scenario.emergency ? 10 : 0), 0, 100);

  return {
    compare: policyProfile.compare,
    items: [
      `Service resilience: ${serviceLevel}%`,
      `Operating cost index: ${costLevel}%`,
      `Regional gap after policy: ${regionView.gap > 0 ? `+${regionView.gap}` : regionView.gap} units`,
    ],
  };
}

function buildIntegrationStatus() {
  const integrationScore = scenario.integration;
  const eventProfile = getEventProfile(scenario.event);

  return partnerNodes.map((node) => {
    const status = integrationScore >= 75 ? node.status : integrationScore >= 55 ? "Coordinated" : "Limited";
    return `${node.name} (${node.channel}): ${status}`;
  }).concat([
    `Critical facilities: ${scenario.emergency ? "priority locked" : "scheduled"}`,
    `Event overlay: ${eventProfile.label}`,
  ]);
}

function buildHistoryList(primaryScore) {
  if (!lessons.length) {
    return ["No saved lessons yet. Store a scenario to activate memory learning."];
  }

  const averageScore = Math.round(
    lessons.reduce((total, lesson) => total + lesson.score, 0) / lessons.length
  );

  return [
    `Saved lessons: ${lessons.length}`,
    `Average score: ${averageScore}`,
    `Latest lesson: ${lessons[0].label} at score ${lessons[0].score}`,
    `Current run: ${primaryScore} with ${getLearningDiscount(scenario.event).toFixed(1)} points of learned mitigation`,
  ];
}

function createListItem(label, value, tone) {
  const item = document.createElement("li");
  if (label) {
    const strong = document.createElement("strong");
    strong.textContent = label;
    item.appendChild(strong);
    item.appendChild(document.createTextNode(` ${value}`));
  } else {
    item.textContent = value;
  }

  if (tone) {
    item.dataset.tone = tone;
  }

  return item;
}

function renderList(target, values, withLabels = false) {
  if (!target) {
    return;
  }

  target.innerHTML = "";
  values.forEach((entry) => {
    if (withLabels) {
      const descriptor = entry.impact >= 0 ? `adds ${entry.impact} risk points` : `reduces ${Math.abs(entry.impact)} risk points`;
      target.appendChild(createListItem(entry.label, descriptor, entry.impact >= 0 ? "risk" : "relief"));
      return;
    }

    target.appendChild(createListItem("", entry));
  });
}

function renderRegionGrid(regionViews) {
  if (!outputs.regionGrid) {
    return;
  }

  outputs.regionGrid.innerHTML = "";

  regionViews.forEach((region) => {
    const article = document.createElement("article");
    article.className = "region-node";
    article.dataset.state = region.state.label.toLowerCase().replace(/\s+/g, "-");

    const title = document.createElement("strong");
    title.textContent = region.label;

    const role = document.createElement("span");
    role.textContent = region.role;
    role.className = "region-role";

    const score = document.createElement("span");
    score.textContent = `${region.score} ${region.state.label}`;
    score.className = "region-score";

    const detail = document.createElement("small");
    detail.textContent = `${region.adjustedDemand} demand / ${region.adjustedSupply} supply`;

    article.append(title, role, score, detail);
    outputs.regionGrid.appendChild(article);
  });
}

function renderLiveMap(regionViews) {
  if (!outputs.liveMap) {
    return;
  }

  // When Leaflet map is active, never overwrite the map container DOM.
  if (typeof nationalMap !== "undefined" && nationalMap) {
    return;
  }

  outputs.liveMap.innerHTML = "";

  regionViews.forEach((region) => {
    const tile = document.createElement("div");
    tile.className = "map-tile";
    tile.dataset.state = region.state.label.toLowerCase().replace(/\s+/g, "-");

    const label = document.createElement("span");
    label.textContent = region.label;

    const score = document.createElement("strong");
    score.textContent = String(region.score);

    const bar = document.createElement("div");
    bar.className = "map-bar";
    const fill = document.createElement("span");
    fill.style.width = `${region.score}%`;
    bar.appendChild(fill);

    tile.append(label, score, bar);
    outputs.liveMap.appendChild(tile);
  });
}

function updateScoreDisplays(score, label) {
  const state = getRiskState(score);
  const scoreText = String(score);

  [outputs.heroScore, outputs.scoreValue].forEach((node) => {
    if (node) {
      node.textContent = scoreText;
    }
  });

  [outputs.heroState, outputs.scoreState].forEach((node) => {
    if (node) {
      node.textContent = label || state.label;
      node.style.color = state.color;
    }
  });
}

function updateRouteDataStatus() {
  const node = outputs.routeDataStatus;
  if (!node) return;

  if (typeof getRouteStatus !== "function") {
    node.textContent = "Routing provider unavailable";
    node.classList.remove("ok");
    node.classList.add("warn");
    return;
  }

  const status = getRouteStatus();
  if (!status.initialized) {
    node.textContent = "Loading real route...";
    node.classList.remove("ok");
    node.classList.remove("warn");
    return;
  }

  if (status.usingRealMain) {
    if (status.usingSnapshot) {
      const src = status.snapshotMeta?.source || "Local Snapshot";
      node.textContent = `Exact route snapshot: ${src} (${status.mainPoints} points)`;
      node.classList.add("ok");
      node.classList.remove("warn");
      return;
    }

    const keyTag = status.providerMain === "OpenRouteService" ? "API key" : "public";
    node.textContent = `Real route: ${status.providerMain} (${status.mainPoints} points, ${keyTag})`;
    node.classList.add("ok");
    node.classList.remove("warn");
  } else {
    node.textContent = status.hasApiKey
      ? "Fallback route in use (provider failed)"
      : "Fallback route in use (add ORS API key for reliability)";
    node.classList.remove("ok");
    node.classList.add("warn");
  }
}

function render() {
  const region = getRegion(scenario.region);
  const eventProfile = getEventProfile(scenario.event);
  const regionViews = regions.map((item) => computeRegionView(item));
  const primaryRegion = regionViews.find((item) => item.id === region.id) || regionViews[0];
  const forecast = buildShortageForecast(primaryRegion.score);
  const explainability = buildExplainability(primaryRegion);
  const policyAssessment = buildPolicyAssessment(primaryRegion.score, primaryRegion);
  const allocationPlan = buildAllocationPlan(regionViews);
  const integrationStatus = buildIntegrationStatus();
  const historyItems = buildHistoryList(primaryRegion.score);

  updateScoreDisplays(primaryRegion.score, primaryRegion.state.label);

  if (outputs.forecastValue) {
    outputs.forecastValue.textContent = forecast.label;
  }

  if (outputs.forecastDetail) {
    outputs.forecastDetail.textContent = forecast.detail;
  }

  if (outputs.responseMode) {
    outputs.responseMode.textContent = scenario.emergency
      ? "Emergency"
      : scenario.offline
        ? "Offline-aware"
        : primaryRegion.score >= 70
          ? "Self-healing"
          : "Standard";
  }

  if (outputs.responseDetail) {
    outputs.responseDetail.textContent = scenario.emergency
      ? "Critical goods are prioritized across protected lanes"
      : scenario.offline
        ? "Fallback dispatch continues through low-connectivity regions"
        : primaryRegion.score >= 70
          ? "Auto-rerouting is recommended to reduce stress"
          : "Balanced routing and manual oversight remain sufficient";
  }

  renderList(outputs.explainList, explainability, true);
  renderList(outputs.allocationList, allocationPlan);
  renderList(outputs.forecastList, forecast.items);
  renderList(outputs.policyList, policyAssessment.items);
  renderList(outputs.integrationList, integrationStatus);
  renderList(outputs.liveSignalsList, liveOps.signals.length ? liveOps.signals.map((signal) => `${signal.timestamp} · ${signal.label} — ${signal.value}`) : ["No live field signals yet. Waiting for driver or warehouse events."]);
  renderList(outputs.liveTransitList, (() => {
    const status = typeof getRouteStatus === "function" ? getRouteStatus() : null;
    if (!status) {
      return ["Route intelligence unavailable."];
    }

    const mainMetrics = status.mainMetrics || {};
    const bypassMetrics = status.bypassMetrics || {};

    return [
      `Provider: ${status.providerMain} / ${status.providerBypass}`,
      `Main route: ${mainMetrics.distanceKm || 0} km / ${mainMetrics.durationMin || 0} min`,
      `Bypass route: ${bypassMetrics.distanceKm || 0} km / ${bypassMetrics.durationMin || 0} min`,
      `Live traffic pressure: ${computeRoutePressure(status)}/20`,
      `Real road geometry: ${status.usingRealMain || status.usingRealBypass ? "Yes" : "Fallback"}`,
      `Route status: ${status.error ? status.error : "Nominal"}`,
    ];
  })());
  renderList(outputs.liveWeatherList, (() => {
    const entries = Object.values(liveWeather.byRegion);
    if (!entries.length) {
      return ["Weather feed loading or unavailable."];
    }

    return entries.map((entry) => `${entry.label}: ${entry.summary}, ${entry.temperature}°C, wind ${entry.wind} km/h, pressure ${entry.pressure}/30`);
  })());
  renderList(outputs.historyList, historyItems);
  renderRegionGrid(regionViews);

  // Keep lightweight fallback tiles only when Leaflet is not initialized.
  if (typeof nationalMap === "undefined" || !nationalMap) {
    renderLiveMap(regionViews);
  }

  // ── Run all 13 Feature Engines ──────────────────────────
  if (typeof ChaosEngine !== 'undefined') {
    // F1: Chaos Score formula badge
    const zone = ChaosEngine.getZone(primaryRegion.score);
    const featureBadge = document.getElementById('featureScoreBadge');
    if (featureBadge) {
      featureBadge.textContent = `${zone.badge} ${zone.status}`;
      featureBadge.style.color = zone.color;
    }
  }

  if (typeof SelfHealingEngine !== 'undefined') {
    // F2: Self-healing — show bypass if threshold exceeded
    const healing = SelfHealingEngine.heal('north', 'central', primaryRegion.score);
    const healPanel = document.getElementById('selfHealStatus');
    if (healPanel) {
      healPanel.innerHTML = healing
        ? `<span style="color:#80ed99">⚙️ Auto-reroute engaged: ${healing.affectedShipments} shipments via ${healing.selectedRoute} (${healing.costIncrease})</span>`
        : `<span style="color:var(--muted)">No healing required. Score below threshold (${SelfHealingEngine.THRESHOLD}).</span>`;
    }

    if (typeof showAllocationFlows === 'function' && healing?.routeCoords?.length && primaryRegion.score > SelfHealingEngine.THRESHOLD) {
      showAllocationFlows([
        {
          fromLabel: 'North Hub',
          toLabel: 'Central Corridor',
          amount: healing.affectedShipments,
          goods: 'Priority mixed cargo',
          fromCoords: healing.routeCoords[0],
          toCoords: healing.routeCoords[healing.routeCoords.length - 1],
        },
      ]);
    }
  }

  if (typeof CrisisPrediction !== 'undefined') {
    // F3: Crisis prediction → update forecast labels
    const cPred = CrisisPrediction.forecast(primaryRegion.score, scenario.event);
    const predPanel = document.getElementById('crisisPredPanel');
    if (predPanel) {
      predPanel.innerHTML = `
        <div class="pred-row"><span>🍲 Food</span><span style="color:${cPred.overall==='Severe'?'#ff6b6b':'#ffd166'}">${cPred.food.shortageIn48h}% risk / 48h</span></div>
        <div class="pred-row"><span>💊 Medical</span><span style="color:${cPred.medical.shortageIn48h>60?'#ff6b6b':'#ffd166'}">${cPred.medical.shortageIn48h}% risk / 48h</span></div>
        <div class="pred-row"><span>⛽ Fuel</span><span style="color:${cPred.fuel.shortageIn48h>60?'#ff6b6b':'#ffd166'}">${cPred.fuel.shortageIn48h}% risk / 48h</span></div>`;
    }
  }

  if (typeof AllocationEngine !== 'undefined') {
    // F4: Dynamic allocation → drive map arrows
    const allocs = AllocationEngine.allocate(regionViews);
    if (typeof showAllocationFlows === 'function' && allocs.length) {
      const mappedAllocs = allocs.map(a => ({
        ...a,
        fromCoords: a.from === 'north' ? [28.6139,77.2090] : a.from === 'central' ? [23.2599,77.4126] : a.from === 'south' ? [12.9716,77.5946] : [19.0760,72.8777],
        toCoords:   a.to   === 'north' ? [28.6139,77.2090] : a.to   === 'central' ? [23.2599,77.4126] : a.to   === 'south' ? [12.9716,77.5946] : [19.0760,72.8777],
      }));
      if (primaryRegion.score > 65) showAllocationFlows(mappedAllocs);
    }
  }

  if (typeof EmergencyEngine !== 'undefined') {
    // F6: Emergency — update response panel
    const emerg = EmergencyEngine.assess(primaryRegion.score, scenario.emergency, scenario.event);
    const emergBanner = document.getElementById('emergencyBanner');
    if (emergBanner) {
      emergBanner.style.display = emerg.active ? 'block' : 'none';
      if (emerg.active) {
        const lvlEl = document.getElementById('emergencyLevel');
        if (lvlEl) lvlEl.textContent = `🚨 EMERGENCY MODE: ${emerg.level}`;
      }
    }
  }

  if (typeof OfflineSystem !== 'undefined') {
    // F12: Offline zones — drive map grey areas
    const zones = OfflineSystem.getZones(scenario.offline);
    if (typeof showOfflineZones === 'function') showOfflineZones(zones);
    else if (typeof clearOfflineZones === 'function') clearOfflineZones();
    const cachePanel = document.getElementById('offlineCachePanel');
    if (cachePanel) {
      const cs = OfflineSystem.getCacheStatus(scenario.offline);
      cachePanel.innerHTML = `<span style="color:${scenario.offline?'#ffd166':'#80ed99'}">${cs.mode}</span><br><small style="color:var(--muted)">${cs.cached}</small>`;
    }
  }

  if (typeof SupplyDashboard !== 'undefined') {
    // F13: Live heatmap panel
    const hmap = SupplyDashboard.buildHeatmap(regionViews);
    const hmapPanel = document.getElementById('heatmapPanel');
    if (hmapPanel) {
      hmapPanel.innerHTML = hmap.map(h => `
        <div class="heatmap-row">
          <span>${h.label}</span>
          <span>${h.flowDir}</span>
          <strong style="color:${h.color}">${h.status}</strong>
        </div>`).join('');
    }
  }

  // ── Update Leaflet OSM map ──────────────────────────────
  if (typeof initNationalMap === 'function') {
    initNationalMap();
  }

  if (typeof updateNationalMap === 'function') {
    updateNationalMap(regionViews, scenario.region);
  }

  if (typeof nationalMap !== 'undefined' && nationalMap?.invalidateSize) {
    window.requestAnimationFrame(() => nationalMap.invalidateSize());
  }

  updateRouteDataStatus();

  // ── Broadcast to Driver + Warehouse dashboards ──────────
  if (typeof emitMapEvent === 'function') {
    emitMapEvent(EVT.HQ_SCENARIO_CHANGED, {
      chaosScore: primaryRegion.score,
      region: scenario.region,
      event: scenario.event,
      emergency: scenario.emergency,
    });
  }

  if (outputs.policyCompare) {
    outputs.policyCompare.textContent = `${policyAssessment.compare} Event overlay: ${eventProfile.label}.`;
  }

  const routeStatus = typeof getRouteStatus === "function" ? getRouteStatus() : null;
  const heartbeat = buildSystemHeartbeat(primaryRegion, routeStatus, liveWeather);

  if (outputs.heartbeatStatus) {
    outputs.heartbeatStatus.textContent = heartbeat.tone;
    outputs.heartbeatStatus.style.color =
      heartbeat.tone === "Critical" ? "var(--risk)" : heartbeat.tone === "Watch" ? "var(--warn)" : "var(--ok)";
  }

  if (outputs.heartbeatDetail) {
    outputs.heartbeatDetail.textContent = heartbeat.detail;
  }

  if (typeof emitMapEvent === "function" && typeof EVT !== "undefined") {
    emitMapEvent(EVT.SYSTEM_HEARTBEAT, {
      tone: heartbeat.tone,
      detail: heartbeat.detail,
      score: heartbeat.score,
      routeLive: heartbeat.routeLive,
      weatherLive: heartbeat.weatherLive,
      region: primaryRegion.label,
    });
  }

}

function syncFromControls() {
  scenario.region = controls.regionSelect?.value || scenario.region;
  scenario.event = controls.eventSelect?.value || scenario.event;
  scenario.weather = Number(controls.weatherRange?.value || scenario.weather);
  scenario.traffic = Number(controls.trafficRange?.value || scenario.traffic);
  scenario.demand = Number(controls.demandRange?.value || scenario.demand);
  scenario.integration = Number(controls.integrationRange?.value || scenario.integration);
  scenario.policy = controls.policySelect?.value || scenario.policy;
  scenario.emergency = Boolean(controls.emergencyToggle?.checked);
  scenario.offline = Boolean(controls.offlineToggle?.checked);
  scenario.healingBoost = scenario.healingBoost > 0 ? scenario.healingBoost : 0;

  if (controls.stressRange && controls.weatherRange) {
    controls.stressRange.value = String(scenario.weather);
    controls.weatherRange.value = String(scenario.weather);
  }
}

function pushLesson() {
  const region = getRegion(scenario.region);
  const primaryView = computeRegionView(region);
  const lesson = {
    label: `${region.label} · ${getEventProfile(scenario.event).label}`,
    score: primaryView.score,
    event: scenario.event,
    policy: scenario.policy,
    timestamp: new Date().toISOString(),
  };

  lessons = [lesson, ...lessons].slice(0, 8);
  saveLessons();
  render();
}

function activateHealing() {
  scenario.healingBoost = 12;
  render();

  if (healingTimer) {
    window.clearTimeout(healingTimer);
  }

  healingTimer = window.setTimeout(() => {
    scenario.healingBoost = 0;
    render();
  }, 3500);
}

function updateAnalysisCycleStatus(text, detail) {
  if (outputs.analysisStatus) {
    outputs.analysisStatus.textContent = text;
  }

  if (outputs.analysisDetail) {
    outputs.analysisDetail.textContent = detail;
  }
}

function runAnalysisCycle(source = "scheduled") {
  syncFromControls();

  const primaryRegion = computeRegionView(getRegion(scenario.region));
  const cycleTime = new Date().toLocaleTimeString();

  if (primaryRegion.score >= SelfHealingEngine.THRESHOLD && scenario.healingBoost <= 0) {
    updateAnalysisCycleStatus("Preemptive reroute", `${cycleTime} · ${source} cycle detected elevated risk`);
    activateHealing();
    return;
  }

  if (primaryRegion.score >= 80) {
    updateAnalysisCycleStatus("Critical watch", `${cycleTime} · monitoring active, human review recommended`);
  } else if (primaryRegion.score >= 65) {
    updateAnalysisCycleStatus("Warning watch", `${cycleTime} · risk elevated, routes are being recalculated`);
  } else {
    updateAnalysisCycleStatus("Watching", `${cycleTime} · continuous preemptive monitoring active`);
  }

  render();
}

function startAnalysisMonitoring() {
  if (analysisTimer) {
    window.clearInterval(analysisTimer);
  }

  analysisTimer = window.setInterval(() => {
    runAnalysisCycle("scheduled");
  }, analysisIntervalMs);
}

function startWeatherMonitoring() {
  if (weatherTimer) {
    window.clearInterval(weatherTimer);
  }

  refreshLiveWeatherFeed().catch((error) => {
    liveWeather.status = `Weather feed unavailable: ${error.message}`;
    render();
  });

  weatherTimer = window.setInterval(() => {
    refreshLiveWeatherFeed().catch((error) => {
      liveWeather.status = `Weather feed unavailable: ${error.message}`;
      render();
    });
  }, weatherRefreshIntervalMs);
}

function wireControls() {
  const liveControls = [
    controls.stressRange,
    controls.regionSelect,
    controls.eventSelect,
    controls.weatherRange,
    controls.trafficRange,
    controls.demandRange,
    controls.integrationRange,
    controls.policySelect,
    controls.emergencyToggle,
    controls.offlineToggle,
  ];

  liveControls.forEach((control) => {
    if (!control) {
      return;
    }

    const handler = () => {
      if (control === controls.stressRange) {
        controls.weatherRange.value = control.value;
        if (controls.trafficRange) controls.trafficRange.value = Math.round(control.value * 0.85);
        if (controls.demandRange) controls.demandRange.value = Math.round(control.value * 1.05);
      } else if (control === controls.weatherRange) {
        controls.stressRange.value = control.value;
      }

      syncFromControls();
      render();
      syncScenario(scenario); // Sync to DB
    };

    control.addEventListener(control.type === "checkbox" || control.tagName === "SELECT" ? "change" : "input", handler);
  });

  // Subscribe to real-time updates from other users
  subscribeToState((newState) => {
    Object.assign(scenario, newState);
    render();
    
    // Update local UI controls to match remote state
    if (controls.stressRange) controls.stressRange.value = scenario.weather;
    if (controls.weatherRange) controls.weatherRange.value = scenario.weather;
    if (controls.trafficRange) controls.trafficRange.value = scenario.traffic;
    if (controls.demandRange) controls.demandRange.value = scenario.demand;
    if (controls.integrationRange) controls.integrationRange.value = scenario.integration;
    if (controls.regionSelect) controls.regionSelect.value = scenario.region;
    if (controls.eventSelect) controls.eventSelect.value = scenario.event;
    if (controls.policySelect) controls.policySelect.value = scenario.policy;
    if (controls.emergencyToggle) controls.emergencyToggle.checked = scenario.emergency;
    if (controls.offlineToggle) controls.offlineToggle.checked = scenario.offline;
  });

  if (typeof onMapEvent === 'function' && typeof EVT !== 'undefined') {
    onMapEvent(EVT.DRIVER_CONGESTION, (payload) => {
      syncSignalStateFromEvent(EVT.DRIVER_CONGESTION, payload);
      runAnalysisCycle("driver-congestion");
    });

    onMapEvent(EVT.DRIVER_REROUTED, (payload) => {
      syncSignalStateFromEvent(EVT.DRIVER_REROUTED, payload);
      runAnalysisCycle("driver-rerouted");
    });

    onMapEvent(EVT.WH_TRANSFER_APPROVED, (payload) => {
      syncSignalStateFromEvent(EVT.WH_TRANSFER_APPROVED, payload);
      runAnalysisCycle("warehouse-transfer");
    });

    onMapEvent(EVT.DRIVER_DELIVERED, (payload) => {
      syncSignalStateFromEvent(EVT.DRIVER_DELIVERED, payload);
      runAnalysisCycle("driver-delivered");
    });
  }

  controls.runScenarioBtn?.addEventListener("click", () => {
    const btn = controls.runScenarioBtn;
    const originalText = btn.textContent;
    btn.textContent = "Computing...";
    btn.disabled = true;
    
    document.querySelector(".command-output")?.classList.add("pulse-loading");

    setTimeout(() => {
      syncFromControls();
      render();
      btn.textContent = originalText;
      btn.disabled = false;
      document.querySelector(".command-output")?.classList.remove("pulse-loading");
    }, 600);
  });

  controls.healScenarioBtn?.addEventListener("click", () => {
    syncFromControls();
    activateHealing();
  });

  controls.saveLessonBtn?.addEventListener("click", () => {
    syncFromControls();
    pushLesson();
  });
}

function initializeControls() {
  if (controls.stressRange && controls.weatherRange) {
    controls.weatherRange.value = controls.stressRange.value;
  }

  syncFromControls();
}

const revealItems = document.querySelectorAll(".reveal");

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in-view");
      }
    });
  },
  {
    threshold: 0.12,
  }
);

revealItems.forEach((item, index) => {
  item.style.transitionDelay = `${Math.min(index * 40, 240)}ms`;
  observer.observe(item);
});

// Login Modal Logic
const openLoginBtn = document.getElementById("openLoginBtn");
const openLoginBtnSecondary = document.getElementById("openLoginBtnSecondary");
const closeLoginBtn = document.getElementById("closeLoginBtn");
const loginModal = document.getElementById("loginModal");
const loginSubmitBtn = document.getElementById("loginSubmitBtn");
const loginUsername = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginRole = document.getElementById("loginRole");
const loginError = document.getElementById("loginError");

if (openLoginBtn && loginModal) {
  openLoginBtn.addEventListener("click", () => {
    loginModal.classList.add("active");
    if(loginError) loginError.style.display = "none";
  });
}

if (openLoginBtnSecondary && loginModal) {
  openLoginBtnSecondary.addEventListener("click", () => {
    loginModal.classList.add("active");
    if(loginError) loginError.style.display = "none";
  });
}

// Mobile Login Button (new)
const openLoginBtnMobile = document.getElementById("openLoginBtnMobile");
if (openLoginBtnMobile && loginModal) {
  openLoginBtnMobile.addEventListener("click", () => {
    loginModal.classList.add("active");
    if(loginError) loginError.style.display = "none";
    // Close mobile nav after clicking login
    const menuToggle = document.getElementById("menuToggle");
    const mobileNav = document.getElementById("mobileNav");
    if (menuToggle && mobileNav) {
      menuToggle.classList.remove("active");
      mobileNav.classList.remove("active");
      document.body.style.overflow = "";
    }
  });
}

/**
 * Proactive Login Trigger
 * Opens the login modal and pre-selects the requested role.
 */
window.openLogin = function(role) {
  const modal = document.getElementById("loginModal");
  const roleSelect = document.getElementById("loginRole");
  if (modal) {
    modal.classList.add("active");
    if (roleSelect && role) {
      roleSelect.value = role;
    }
    const errorEl = document.getElementById("loginError");
    if (errorEl) errorEl.style.display = "none";
  }
};

/**
 * Shared Info Modal Logic for High-Engagement Simulation Features
 */
window.openInfoModal = function(title, content) {
  // Create modal on the fly if it doesn't exist
  let modal = document.getElementById("infoModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "infoModal";
    modal.className = "modal";
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 500px;">
        <span class="modal-close" onclick="this.closest('.modal').classList.remove('active')">&times;</span>
        <h2 id="infoModalTitle" style="margin-bottom: 1rem; color: var(--primary);"></h2>
        <div id="infoModalBody" style="color: var(--text-muted); line-height: 1.6;"></div>
        <div style="margin-top: 2rem; display: flex; justify-content: flex-end;">
          <button class="btn btn-small" onclick="this.closest('.modal').classList.remove('active')">Acknowledge</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  
  document.getElementById("infoModalTitle").textContent = title;
  document.getElementById("infoModalBody").innerHTML = content;
  modal.classList.add("active");
};

// Mobile Menu Toggle
const menuToggle = document.getElementById("menuToggle");
const mobileNav = document.getElementById("mobileNav");

if (menuToggle && mobileNav) {
  menuToggle.addEventListener("click", () => {
    menuToggle.classList.toggle("active");
    mobileNav.classList.toggle("active");
    document.body.style.overflow = mobileNav.classList.contains("active") ? "hidden" : "";
  });

  // Close menu when clicking a link
  mobileNav.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      menuToggle.classList.remove("active");
      mobileNav.classList.remove("active");
      document.body.style.overflow = "";
    });
  });
}

if (closeLoginBtn && loginModal) {
  closeLoginBtn.addEventListener("click", () => {
    loginModal.classList.remove("active");
  });
}

if (loginSubmitBtn) {
  loginSubmitBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (!loginUsername.value || !loginPassword.value) {
      if(loginError) {
        loginError.style.display = "inline-block";
        loginError.textContent = "Please provide username and password.";
      }
      return;
    }

    if(loginError) loginError.style.display = "none";
    loginSubmitBtn.textContent = "Authenticating...";

    const selectedRole = loginRole ? loginRole.value : "hq";
    const validate = typeof window.validateNSCNSCredentials === "function"
      ? window.validateNSCNSCredentials
      : null;

    if (!validate) {
      if (loginError) {
        loginError.style.display = "inline-block";
        loginError.textContent = "Authentication engine not loaded.";
      }
      loginSubmitBtn.textContent = "Authenticate ->";
      return;
    }

    const result = validate(loginUsername.value, loginPassword.value, selectedRole);
    if (!result.ok) {
      if (loginError) {
        loginError.style.display = "inline-block";
        loginError.textContent = result.reason || "Invalid credentials.";
      }
      loginSubmitBtn.textContent = "Authenticate ->";
      return;
    }

    const setSession = typeof window.setNSCNSUserSession === "function"
      ? window.setNSCNSUserSession
      : null;

    if (setSession) {
      setSession({
        username: result.username,
        role: result.role,
        label: result.label,
        time: new Date().toISOString(),
      });
    }

    window.location.href = result.redirect;
  });
}

initializeControls();
wireControls();
startAnalysisMonitoring();
startWeatherMonitoring();

// Initialize map first so the first render paints actual live layers, not fallback tiles.
if (typeof initNationalMap === 'function') initNationalMap();

if (typeof loadRealRoutes === 'function') {
  loadRealRoutes().finally(() => {
    updateRouteDataStatus();
    render();
    runAnalysisCycle("initial");
  });
}

render();

// Interactivity for Conceptual Features
document.addEventListener("DOMContentLoaded", () => {
  // Bind Policy Simulator feature card in index.html (Feature Case #7)
  const features = document.querySelectorAll(".feature-card");
  features.forEach(card => {
    if (card.textContent.includes("Policy Simulator")) {
      card.style.cursor = "pointer";
      card.addEventListener("click", () => {
        openInfoModal("Policy Simulator · Active", `
          <p>The TezFlow Policy Engine allows you to simulate high-impact logistics scenarios before they reach the ground.</p>
          <ul style="margin: 1rem 0; padding-left: 1.2rem;">
            <li><strong>Current Model:</strong> Balanced Resilience</li>
            <li><strong>Input Delta:</strong> +8% Weather Sensitivity</li>
            <li><strong>Strategic Projection:</strong> Simulation predicts a 14% reduction in potential bottlenecks if Emergency Priority is shifted to the South Arc.</li>
          </ul>
          <p style="font-size: 0.82rem; color: var(--warn); padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.1);">Live simulation mode is restricted to 'HQ Operator' level clearance.</p>
        `);
      });
    }
  });

  // Handle Audit Logs in Warehouse & HQ
  const auditItems = document.querySelectorAll('.bottom-nav-item');
  auditItems.forEach(item => {
    if (item.querySelector('span')?.textContent === "Logs") {
      item.addEventListener("click", (e) => {
        e.preventDefault();
        openInfoModal("Audit Ledger · Real-Time", `
          <div style="font-family: 'Space Mono', monospace; font-size: 0.8rem; background: rgba(0,0,0,0.3); padding: 1rem; border-radius: 8px; border: 1px solid var(--glass-border);">
            <div style="margin-bottom: 0.5rem;"><span style="color: var(--primary);">[00:14:22]</span> HQ: Scenario 'Storm Surge' synchronized across nodes.</div>
            <div style="margin-bottom: 0.5rem;"><span style="color: var(--primary);">[00:12:05]</span> WH-NORTH: Bulk transfer of Med-Kit-X approved.</div>
            <div style="margin-bottom: 0.5rem;"><span style="color: var(--primary);">[00:08:55]</span> FLEET-710: Reroute accepted via NH-44 Bypass.</div>
            <div style="margin-bottom: 0.5rem;"><span style="color: var(--primary);">[00:02:11]</span> SYSTEM: Heartbeat nominal. Latency 12ms.</div>
            <div style="opacity: 0.5; font-style: italic;">End of latest cycle. Streaming live...</div>
          </div>
        `);
      });
    }
  });
});
