## Real Road Routing Setup

The map can use public routing providers without a key, but those can be rate-limited or unstable.
For reliable real road geometry, set an OpenRouteService key.

1. Create a free key at OpenRouteService.
2. In browser dev tools console, run:

```js
localStorage.setItem("nscns_ors_api_key", "YOUR_ORS_KEY");
location.reload();
```

3. On the Control Center map card, verify the status badge shows:
`Real route: OpenRouteService (... points, API key)`

If it shows fallback, run the app via a local server (not file-open) to avoid browser restrictions.

# NSCNS - National Supply Chain Nervous System

India's first AI-powered national logistics intelligence platform.
It senses disruptions before they become crises, automatically reroutes supply chains, and coordinates real-time response across government warehouses, private carriers, and fleet drivers.

## Features
- National Chaos Score Engine
- Self-Healing Supply Chain
- Crisis Prediction Engine
- Real-time Map Integrations
- Public-Private Data Hooks
