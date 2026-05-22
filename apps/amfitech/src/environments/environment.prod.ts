// Production environment for amfitech (end-user app).
//
// IMPORTANT — update `apiBaseUrl` after the first NestJS deploy to Render.
// The URL will be `https://<your-service>.onrender.com/api` (or your custom
// domain). Commit + redeploy the frontend after changing this value.
//
// The Supabase anon key is safe to ship in the bundle: it is the public
// JWT used by the browser to start a session. The service_role key stays
// server-side in the NestJS env vars.
export const environment = {
  production: true,
  apiBaseUrl: 'https://amfitech-api.onrender.com/api',
  supabaseUrl: 'https://gvwjmrfsbnwyhagectdx.supabase.co',
  supabaseAnonKey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2d2ptcmZzYm53eWhhZ2VjdGR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNTU2NDMsImV4cCI6MjA5NDkzMTY0M30.9MFahDPmkiMh0Rsl4QSCDQhUVCHi6JyMZSIBo4X6lBw',
};
