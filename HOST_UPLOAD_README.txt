AL-IHSAN HOST UPLOAD PACKAGE

Use the ZIP file named:
al-ihsan-static-hosting.zip

For filemanager.ai / htdocs hosting:
1. Open the exact htdocs folder for the domain.
2. Use "Zip & Extract" instead of uploading the whole project folder.
3. Upload al-ihsan-static-hosting.zip.
4. Extract it directly inside htdocs.
5. After extraction, index.html must be directly inside htdocs, not inside another nested folder.
6. After extraction, confirm these folders/files exist inside htdocs:
   - assets/
   - uploads/
   - script.js
   - public-data.js
   - assets/images/optimized/well-community.jpg
   - host-check.html

If the hero photos show broken image icons or the live campaign area stays at zero,
the host only received part of the bundle. Re-upload the ZIP and extract it in place;
do not upload the folder one file at a time.

After extraction, open:
https://YOUR-DOMAIN/host-check.html

If the JPG test photo is missing there, the host did not extract or serve the asset
folder correctly. If the JPG photo appears there but the homepage still looks old,
the domain is serving a cached page or a different document root.

This ZIP contains only the public website files needed for static hosting.
It intentionally excludes:
- .env secrets
- local admin/session data
- local payment logs
- local QA screenshots
- Node server files

Important:
The current host shown in your screenshot is a PHP/static htdocs-style host. It can serve the public pages, CSS, JavaScript, images, and ordinary links, but the Node-powered features need a Node-capable host to work fully:
- secure master page login
- uploads from the master page
- donor portal login
- email code flows
- live payment API endpoints
- automatic campaign/report saving

For the full version, deploy the Node app to a Node-capable host instead of ordinary htdocs hosting.
