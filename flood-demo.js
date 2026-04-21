// flood-demo.js — Punjab Flood: End-to-End NSCNS Demonstration
// Shows all 13 features activating in sequence on the live map

const FLOOD_DEMO = {
  active: false,
  stepIndex: 0,
  timers: [],

  // Punjab flood zone polygon (approximate bounds)
  FLOOD_POLYGON: [
    [32.6, 73.2], [32.6, 76.9],
    [29.7, 76.9], [29.7, 73.2],
  ],

  // Cities affected
  AFFECTED: {
    ludhiana:   [30.9010, 75.8573],
    amritsar:   [31.6340, 74.8723],
    chandigarh: [30.7333, 76.7794],
    jalandhar:  [31.3260, 75.5762],
    pathankot:  [32.2643, 75.6492],
  },

  // Emergency corridors from Delhi to Punjab
  CORRIDORS: [
    { from: [28.6139, 77.2090], to: [30.7333, 76.7794], via: [[29.6857, 76.9905]], label: "NH-44 Emergency" },
    { from: [28.6139, 77.2090], to: [31.6340, 74.8723], via: [[30.3752, 76.7821]], label: "Military Express" },
    { from: [26.9124, 75.7873], to: [31.6340, 74.8723], via: [],                   label: "Rajasthan Relief" },
  ],

  // Resource flows during allocation
  FLOWS: [
    { from: [28.6139, 77.2090], to: [30.7333, 76.7794], amount: 240, type: "🍲 Food Rations", color: "#80ed99" },
    { from: [26.9124, 75.7873], to: [31.6340, 74.8723], amount: 180, type: "💊 Medical Stock", color: "#74b9ff" },
    { from: [23.2599, 77.4126], to: [30.9010, 75.8573], amount:  95, type: "⛽ Emergency Fuel", color: "#ffd166" },
  ],

  // 7 sequential scenario steps
  STEPS: [
    {
      id: 1,
      emoji: "🌊",
      title: "Punjab Flood Detected",
      description: "IMD + ISRO satellite confirms severe flood near Ludhiana. 3 National Highways blocked. Chaos Score spiking.",
      feature: "1. Chaos Score Engine",
      delay: 0,
      duration: 2800,
      mapFn: "step1_floodZone",
      scenarioPatch: { event: "disaster", weather: 85, traffic: 78, demand: 72, emergency: true, region: "north" },
    },
    {
      id: 2,
      emoji: "🚨",
      title: "Emergency Response Activated",
      description: "Score crossed 85 threshold. Emergency Mode ON. NDRF, Indian Army, and IRCS alerted. Non-essential cargo paused.",
      feature: "6. Emergency Response Engine",
      delay: 3200,
      duration: 2500,
      mapFn: "step2_emergencyCorridors",
    },
    {
      id: 3,
      emoji: "🔄",
      title: "Self-Healing: 1,200 Vehicles Auto-Rerouted",
      description: "Modified Dijkstra algorithm found 2 bypass routes via Haryana & Rajasthan. Fleet auto-redirected in 4.2 minutes.",
      feature: "2. Self-Healing Supply Chain",
      delay: 6200,
      duration: 2500,
      mapFn: "step3_bypassRoutes",
    },
    {
      id: 4,
      emoji: "🔮",
      title: "Crisis Prediction: Shortage in 48h",
      description: "LSTM model: Food shortage in Punjab in 48h (82%), Medicine shortage in 36h (91%). Fuel critical in 60h.",
      feature: "3. Crisis Prediction Engine",
      delay: 9200,
      duration: 2500,
      mapFn: "step4_shortageHeatmap",
    },
    {
      id: 5,
      emoji: "⚖️",
      title: "Dynamic Allocation Triggered",
      description: "Delhi surplus 240t → Chandigarh. Jaipur surplus 180t → Amritsar. Bhopal 95t → Ludhiana.",
      feature: "4. Dynamic Resource Allocation",
      delay: 12200,
      duration: 2500,
      mapFn: "step5_resourceFlows",
    },
    {
      id: 6,
      emoji: "🧩",
      title: "Multi-Node AI Coordinating",
      description: "North Hub AI (Delhi) taking autonomous control. 3 regional nodes operating independently. Central AI monitoring.",
      feature: "5. Decentralized Multi-Node AI",
      delay: 15200,
      duration: 2500,
      mapFn: "step6_nodeStatus",
    },
    {
      id: 7,
      emoji: "📊",
      title: "Situation Stabilizing — Score 92→67",
      description: "Emergency supplies in transit. Memory System updated. Policy simulation ran Resilience Mode. Score dropping.",
      feature: "9. Memory Learning System",
      delay: 18200,
      duration: 2500,
      mapFn: "step7_stabilize",
      scenarioPatch: { weather: 60, traffic: 55, emergency: true },
    },
  ],

  start() {
    if (this.active) return;
    this.active = true;
    this.stepIndex = 0;
    this._showConsole();

    this.STEPS.forEach(step => {
      const timer = setTimeout(() => {
        this._activateStep(step);
      }, step.delay);
      this.timers.push(timer);
    });

    // Auto-stop after all steps
    const endTimer = setTimeout(() => this.stop(), 22000);
    this.timers.push(endTimer);
  },

  runSteps() {
    // Alias for HQ interface compatibility
    this.start();
  },

  stop() {
    this.timers.forEach(t => clearTimeout(t));
    this.timers = [];
    this.active = false;
    this._hideConsole();
    // Clear flood map overlays
    if (typeof clearFloodDemo === 'function') clearFloodDemo();
    // Reset scenario
    if (typeof render === 'function') render();
  },

  _activateStep(step) {
    this.stepIndex = step.id;
    this._renderStep(step);

    // Apply scenario patch if any
    if (step.scenarioPatch && typeof scenario !== 'undefined') {
      Object.assign(scenario, step.scenarioPatch);
      if (typeof render === 'function') render();
    }

    // Call map function
    if (step.mapFn && typeof floodMapActions[step.mapFn] === 'function') {
      floodMapActions[step.mapFn]();
    }
  },

  _showConsole() {
    const console = document.getElementById('floodDemoConsole');
    if (console) {
      console.classList.add('active');
      document.getElementById('demoStepList').innerHTML = '';
    }
  },

  _hideConsole() {
    const el = document.getElementById('floodDemoConsole');
    if (el) el.classList.remove('active');
  },

  _renderStep(step) {
    const list  = document.getElementById('demoStepList');
    const bar   = document.getElementById('demoProgressBar');
    const title = document.getElementById('demoCurrentStep');
    if (!list) return;

    // Update title
    if (title) title.textContent = `${step.emoji} ${step.title}`;

    // Add step to log
    const item = document.createElement('div');
    item.className = 'demo-step-item';
    item.innerHTML = `
      <span class="demo-step-badge">${step.emoji}</span>
      <div>
        <div class="demo-step-title">${step.title}</div>
        <div class="demo-step-feature">${step.feature}</div>
      </div>`;
    list.appendChild(item);
    list.scrollTop = list.scrollHeight;

    // Progress bar
    if (bar) bar.style.width = `${(step.id / FLOOD_DEMO.STEPS.length) * 100}%`;
  },
};

// ─── Map Actions for each Flood Demo step ──────────────────
const floodMapActions = {
  step1_floodZone() {
    if (typeof showFloodZone === 'function') showFloodZone(FLOOD_DEMO.FLOOD_POLYGON, FLOOD_DEMO.AFFECTED);
  },
  step2_emergencyCorridors() {
    if (typeof showEmergencyCorridors === 'function') showEmergencyCorridors(FLOOD_DEMO.CORRIDORS);
  },
  step3_bypassRoutes() {
    if (typeof showBypassRoutes === 'function') showBypassRoutes();
  },
  step4_shortageHeatmap() {
    if (typeof showShortageRings === 'function') showShortageRings(FLOOD_DEMO.AFFECTED);
  },
  step5_resourceFlows() {
    if (typeof showResourceFlows === 'function') showResourceFlows(FLOOD_DEMO.FLOWS);
  },
  step6_nodeStatus() {
    if (typeof pulseAllNodes === 'function') pulseAllNodes();
  },
  step7_stabilize() {
    if (typeof showStabilization === 'function') showStabilization();
  },
};
