# RemNote Accuracy Tracker

Compact RemNote plugin that records per-rem correctness attempts, computes per-rem and overall accuracy percentages, persists data to the RemNote plugin storage (falls back to localStorage), and supports JSON export/import.

Features
- Compact UI for quick marking of Correct / Incorrect
- Per-rem attempt history with timestamps
- Overall and per-rem accuracy percentage
- Persisted to RemNote plugin.storage when available (localStorage fallback)
- Export/import tracked data as JSON (remnote-accuracy.json)

Quick start
1. Install dependencies
   - npm install

2. Development (hot reload)
   - npm run dev
   - Open the dev preview in your browser:
     http://localhost:8080/?widgetName=accuracy/index
   - The dev server will load the sandboxed widget script and render the compact UI.

3. Testing inside RemNote (two ways)

A) Load from local dev server (fast iteration)
- Start the dev server: npm run dev
- In RemNote (web app at https://www.remnote.io or your local RemNote instance), open Settings -> Plugins -> Developer / Manage Plugins (the exact name may vary).
- Look for an option to install or load a plugin from a URL. Paste this URL:
  http://localhost:8080/?widgetName=accuracy/index
- The plugin loader will fetch the dev HTML which will in turn load the widget script. The webpack dev server sets CORS headers; if your RemNote instance requires HTTPS you may need to expose the dev server over HTTPS (see Troubleshooting below).

B) Build and upload Plugin ZIP (recommended for final testing)
- npm run build
- A file named PluginZip.zip will be created in the repo root.
- In RemNote's plugin manager, choose Upload Plugin and select PluginZip.zip.

Notes about widgetName and remId
- The webpack dev index expects a query param widgetName matching the widget entry. For this widget the entry key is accuracy/index, so use widgetName=accuracy/index.
- To test with a specific Rem ID, append &remId=YOUR_REM_ID to the URL, for example:
  http://localhost:8080/?widgetName=accuracy/index&remId=abc123
- When running inside RemNote, if the plugin runtime supplies a remId via query params the widget will pick it up automatically. Otherwise paste the Rem ID into the Rem ID input in the UI.

Storage and persistence
- The plugin will try to use the RemNote plugin storage API (window.plugin.storage.get/set). If the API is present the plugin saves data under the key remnote-accuracy-tracker:v1.
- If plugin storage is not available (local dev preview or other), the plugin falls back to window.localStorage using the same key.

Export & Import
- Export: click Export JSON to download remnote-accuracy.json with the full stored DB.
- Import: choose Import JSON and pick a .json file. Imported data is merged by rem id and will overwrite per-rem entries when keys collide.

Troubleshooting
- If RemNote refuses to load http://localhost:8080 due to insecure origin rules, serve the dev server over HTTPS or build and upload the PluginZip.
- If the plugin fails to persist, check browser console for storage adapter warnings. The plugin attempts plugin.storage first, then localStorage.
- If the widget doesn't appear, confirm you used widgetName=accuracy/index as the query parameter.

Development notes
- Entry point: src/widgets/accuracy/index.tsx
- Storage key: remnote-accuracy-tracker:v1
- To change the widget id or add more widgets, add files under src/widgets/ and update manifest as needed.