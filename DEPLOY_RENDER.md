# Full Node Deployment on Render

Use this path for the **full** Al-Ihsan site with:
- secure master page
- uploads
- donor portal
- email-code login
- live API endpoints
- campaign/report persistence
- payment integrations

## Free first launch

The default `render.yaml` is now set up for a **free** first deployment:
- `plan: free`
- no persistent disk
- temporary runtime storage in `/tmp/al-ihsan`

This lets the public site, donor flow, and master page come online without adding a card first. On the free setup, uploads and locally stored admin data can disappear after restarts or redeploys, so treat it as a launch/demo mode rather than the final permanent setup.

## Why upgrade later

This app stores runtime state in JSON files and uploaded media on disk. A paid Render web service with a persistent disk keeps that storage alive across restarts and redeploys.

## What is already prepared

- `render.yaml`
- configurable storage paths in `server.js`
- `APP_STORAGE_DIR=/tmp/al-ihsan` for the free first launch

## Deployment Steps

1. Put the project in a Git repository.
2. Create a new Render Blueprint from that repository.
3. Render will read `render.yaml` and create one free Node web service.
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
- On the free setup, uploads and admin data can disappear after restarts, sleep, or redeploys because `/tmp/al-ihsan` is temporary runtime storage.
- The public page now listens for live update events from the master page and also refreshes campaigns, reports, map data, photos, and videos every 15 seconds.
- Email login codes are not shown on the live site. To send real codes, connect Resend or Brevo instead of using `local-outbox`.
- When you are ready for a durable production setup, change `plan: free` back to a paid plan, set `APP_STORAGE_DIR=/var/data/al-ihsan`, and restore a persistent disk block in `render.yaml`.

Example durable storage block:

```yaml
    disk:
      name: al-ihsan-storage
      mountPath: /var/data
      sizeGB: 1
```
