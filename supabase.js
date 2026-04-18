// Supabase Configuration for Real-time Data
// Replace the URL and Key with your actual Supabase project details.
// You can find these in Project Settings > API.

const SUPABASE_URL = "https://your-project-id.supabase.co";
const SUPABASE_KEY = "your-anon-key";

// Only initialize if keys are provided
let supabaseClient = null;
const useFallback = SUPABASE_URL === "https://your-project-id.supabase.co" || !SUPABASE_KEY;

// Local fallback for demo purposes (works across tabs in same browser)
const broadcast = new BroadcastChannel('nscns_realtime');

if (!useFallback) {
  supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

/**
 * Syncs the regional scenario data with the database or local broadcast
 * @param {Object} scenario - Current scenario state
 */
async function syncScenario(scenario) {
  // Always broadcast locally for multi-tab demo
  broadcast.postMessage(scenario);

  if (useFallback) {
    return;
  }

  const { data, error } = await supabaseClient
    .from('scenarios')
    .upsert({ id: 'current_national_state', ...scenario, updated_at: new Date() });

  if (error) console.error("Error syncing scenario:", error);
}

/**
 * Subscribes to real-time changes
 * @param {Function} callback - Function to run when data changes
 */
function subscribeToState(callback) {
  // Listen to local fallback
  broadcast.onmessage = (event) => {
    callback(event.data);
  };

  if (useFallback) {
    return;
  }

  const channel = supabaseClient
    .channel('public:scenarios')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'scenarios' }, (payload) => {
      callback(payload.new);
    })
    .subscribe();

  return channel;
}
