# Local Development & Launcher Guide

## Local Server Configuration
- `Client/vite.config.js` configures the dev server on `localhost` port `5173` (`strictPort: true`).
- Supabase Auth **Site URL** and **Redirect URLs** should include `http://localhost:5173` and `http://localhost:5173/main.html` (or `http://localhost:5173/**`) so local auth and password recovery links resolve properly.

## One-Click Launcher (`launch_hope_erp.js`)
- Starts the Vite development server for the `Client` app and opens the local app URL.
- If `launch_hope_erp.js` is updated, rebuild `Hope_ERP_OneClick.exe` so the packaged executable stays in sync.
- Keep the local server running on the same machine when testing email recovery links.
