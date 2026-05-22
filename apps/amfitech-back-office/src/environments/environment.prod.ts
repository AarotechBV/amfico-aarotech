// Production environment for amfitech-back-office (admin app).
//
// IMPORTANT — update `apiBaseUrl` after the first NestJS deploy to Render.
// The URL will be `https://<your-service>.onrender.com/api` (or your custom
// domain). Commit + redeploy after changing.
export const environment = {
  production: true,
  apiBaseUrl: 'https://amfitech-api.onrender.com/api',
  supabaseUrl: 'https://gvwjmrfsbnwyhagectdx.supabase.co',
  supabaseAnonKey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2d2ptcmZzYm53eWhhZ2VjdGR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNTU2NDMsImV4cCI6MjA5NDkzMTY0M30.9MFahDPmkiMh0Rsl4QSCDQhUVCHi6JyMZSIBo4X6lBw',
};
