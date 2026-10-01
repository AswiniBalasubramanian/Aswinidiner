import { createClient } from '@supabase/supabase-js';

// Cloud saves via Supabase. Each player gets an anonymous Supabase user (no signup screen),
// and their progress lives in one row of `public.saves`, protected by row-level security.
// If Supabase isn't configured or reachable, every call is a no-op and the game keeps its
// localStorage save.
const env = import.meta.env;
const url = env.NEXT_PUBLIC_SUPABASE_URL || env.VITE_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY;

const supabase = url && key ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } }) : null;

let userId = null;
let ready = null;

function init() {
  if (!supabase) return Promise.resolve(false);
  ready ??= (async () => {
    try {
      const { data } = await supabase.auth.getSession();
      let user = data.session?.user;
      if (!user) {
        const res = await supabase.auth.signInAnonymously();
        if (res.error) throw res.error;
        user = res.data.user;
      }
      userId = user.id;
      return true;
    } catch (e) {
      console.warn('[cloud] unavailable, using local save only:', e.message || e);
      return false;
    }
  })();
  return ready;
}

export async function loadCloud() {
  if (!(await init())) return null;
  const { data, error } = await supabase.from('saves').select('data, updated_at').eq('user_id', userId).maybeSingle();
  if (error) { console.warn('[cloud] load failed:', error.message); return null; }
  return data ? { ...data.data, savedAt: Date.parse(data.updated_at) } : null;
}

let timer = null;
let pending = null;
export function saveCloud(state) {
  if (!supabase) return;
  pending = state;
  clearTimeout(timer);
  // Debounced: purchases and level switches can fire several saves in a row.
  timer = setTimeout(async () => {
    if (!(await init()) || !pending) return;
    const data = pending;
    pending = null;
    const { error } = await supabase.from('saves').upsert({ user_id: userId, data, updated_at: new Date(data.savedAt).toISOString() });
    if (error) console.warn('[cloud] save failed:', error.message);
  }, 800);
}

export const cloudEnabled = !!supabase;
