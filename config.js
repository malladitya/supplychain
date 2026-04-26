(function () {
  // Set your OpenRouteService key here once for all pages.
  const ORS_API_KEY = "PASTE_YOUR_ORS_API_KEY_HERE";

  window.NSCNS_CONFIG = Object.assign({}, window.NSCNS_CONFIG || {}, {
    orsApiKey: ORS_API_KEY,
  });
})();
