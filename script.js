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
  historyList: document.getElementById("historyList"),
  liveMap: document.getElementById("liveMap"),
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

function computeRegionView(region) {
  const eventProfile = getEventProfile(scenario.event);
  const learningDiscount = getLearningDiscount(scenario.event);
  const offlinePenalty = scenario.offline ? 0.12 : 0;
  const emergencyBonus = scenario.emergency ? 10 : 0;
  const policyProfile = getPolicyProfile(scenario.policy);

  const adjustedSupply = region.baseSupply * (1 - offlinePenalty);
  const adjustedDemand = region.baseDemand * (1 + scenario.demand / 180) + eventProfile.bias;
  const gap = adjustedDemand - adjustedSupply;

  const regionalRisk =
    15 +
    scenario.weather * (0.22 * region.weatherSensitivity) +
    scenario.traffic * (0.21 * region.trafficSensitivity) +
    scenario.demand * 0.18 +
    eventProfile.risk +
    emergencyBonus +
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
      value: scenario.weather,
      impact: Math.round(scenario.weather * 0.22 * regionView.weatherSensitivity),
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
  renderList(outputs.historyList, historyItems);
  renderRegionGrid(regionViews);
  renderLiveMap(regionViews);

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
        ? `<span style="color:#80ed99">⚙️ ${healing.action}: ${healing.affectedShipments} shipments via ${healing.selectedRoute} (+${healing.costIncrease})</span>`
        : `<span style="color:var(--muted)">No healing required. Score below threshold (${SelfHealingEngine.THRESHOLD}).</span>`;
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
  if (typeof updateNationalMap === 'function') {
    updateNationalMap(regionViews, scenario.region);
  }

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
const closeLoginBtn = document.getElementById("closeLoginBtn");
const loginModal = document.getElementById("loginModal");
const loginSubmitBtn = document.getElementById("loginSubmitBtn");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginRole = document.getElementById("loginRole");
const loginError = document.getElementById("loginError");

if (openLoginBtn && loginModal) {
  openLoginBtn.addEventListener("click", () => {
    loginModal.classList.add("active");
    if(loginError) loginError.style.display = "none";
  });
}

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
    if (!loginEmail.value || !loginPassword.value) {
      if(loginError) {
        loginError.style.display = "inline-block";
        loginError.textContent = "Please provide email and password.";
      }
      return;
    }

    if(loginError) loginError.style.display = "none";
    loginSubmitBtn.textContent = "Authenticating...";
    
    setTimeout(() => {
      const selectedRole = loginRole.value;
      // In a real app, you'd verify credentials here.
      // For this prototype, we'll simulate a successful login.
      sessionStorage.setItem('nscns_auth', JSON.stringify({
        email: loginEmail.value,
        role: selectedRole,
        time: new Date().toISOString()
      }));

      if (selectedRole === "warehouse") {
        window.location.href = "warehouse.html";
      } else {
        window.location.href = "driver.html";
      }
    }, 800);
  });
}

initializeControls();
wireControls();
render();

// Initialize national Leaflet map (requires DOM to be ready)
if (typeof initNationalMap === 'function') initNationalMap();
