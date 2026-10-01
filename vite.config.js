import { defineConfig } from 'vite';

// Expose the public Supabase URL and anon key injected by the Vercel integration.
// Only NEXT_PUBLIC_* / VITE_* reach the browser — never the service-role key.
export default defineConfig({
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
});
