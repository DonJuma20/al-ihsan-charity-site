# Full Node Deployment on Render

Use this path for the **full** Al-Ihsan site with:
- secure master page
- uploads
- donor portal
- email-code login
- live API endpoints
- campaign/report persistence
- payment integrations

## Why Render

This app stores runtime state in JSON files and uploaded media on disk. A Render web service can run the Node app, and a Render persistent disk keeps that storage alive across restarts and redeploys.

## What is already prepared

- `render.yaml`
- configurable storage paths in `server.js`
- `APP_STORAGE_DIR=/var/data`
- persistent disk mount at `/var/data`

## Deployment Steps

1. Put the project in a Git repository.
2. Create a new Render Blueprint from that repository.
3. Render will read `render.yaml` and create:
   - one Node web service
   - one persistent disk mounted at `/var/data`
4. Fill the secret environment variables when Render asks for them:
   - `PUBLIC_SITE_URL`
   - `ADMIN_EMAIL`
   - email provider keys if using real email
   - MTN MoMo keys
   - ABSA details
   - Airtel settings
   - card gateway keys if used
5. Deploy.
6. Open `/master.html` on the live domain and create the first master password.
7. Publish media, campaigns, reports, and payment settings from the master studio.

## Important

- Do **not** upload your local `.env` file.
- Do **not** upload `data/auth.json` from your computer.
- Use the live domain URL in `PUBLIC_SITE_URL`.
- Keep the persistent disk attached. Without persistent storage, uploads and admin data can disappear on redeploy.
