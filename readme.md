# Image Downloader — Chrome Extension

A Chrome extension that finds, groups, and downloads images from webpages you're browsing — as long as the server delivers raw image files over the network (JPEG, PNG, WebP, etc.). It works on most standard websites including those with authentication or lazy-loading, but cannot recover images that are decoded or reconstructed entirely within the browser (e.g. WebGL/Unity-based games with packed assets).

Usage video: https://drive.google.com/file/d/13bz9ucluyaMoF1yUwSSEfSfppfwh1qxJ/view?usp=sharing

---

## Features

- **Displays all images grouped by their DOM container** — makes it easy to select related images (e.g., a photo gallery, product images) at once
- **Captures network-level images** — uses the Chrome Debugger API to intercept images that may not be directly accessible via the DOM (e.g., behind auth headers, inside iframes or Shadow DOM)
- **Batch download to a local folder** — uses the File System Access API to save images directly to a folder you choose, no ZIP needed
- **Size filter** — filter images by minimum width/height
- **Range selection** — select a range of images by clicking start and end
- **Customizable filename templates** — control how downloaded files are named and organized into subfolders using tokens like `{timestamp}`, `{index}`, `{name}`, `{title}`
- **Hotkey** — press `Alt + Shift + E` on any page to open the downloader UI
- **No external runtime dependencies** — pure HTML, CSS, and JavaScript. Only TypeScript type definitions (`@types/chrome`) are used as a dev dependency — no `npm install` needed unless you want type checking

---

## Tech Stack

| Area           | Technology                                      |
| -------------- | ----------------------------------------------- |
| Image capture  | Chrome Debugger API (`Network.getResponseBody`) |
| File saving    | File System Access API (`showDirectoryPicker`)  |
| UI             | Pure HTML + CSS + JS (no framework)             |
| Background     | Chrome Service Worker (MV3)                     |
| Type checking  | JSDoc + `@types/chrome` (dev only)              |

---

## Installation (Load Unpacked)

1. Clone or download this repository
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** (top right toggle)
4. Click **Load unpacked** and select the project folder
5. The extension icon will appear in your toolbar

> No build step required. Open the folder directly.

---

## Usage

1. Navigate to any webpage with images
2. Click the extension icon → **Open Downloader UI**, or press `Alt + Shift + E`
3. Browse and select the images you want
4. Click **Choose Location** to pick a save folder
5. Click **Download**
6. Go to extension details, enable use in incognito tabs (optional).

> **Seeing few or no images?** Click the **↺ Refresh** button — the page may still be loading images, or some images may have loaded before the extension was ready. Scrolling through the page first to trigger lazy-loaded images can also help.

### Why does the browser show a warning bar?

The extension uses the **Chrome Debugger API** to capture images (including those on protected or authenticated pages). Chrome displays a `"DevTools is debugging this browser"` bar whenever a debugger is attached — this is a browser-level security notice and cannot be removed.

- **Keep the bar visible while downloading** — dismissing it will detach the debugger and may cause downloads to fail
- If you don't need the extension, click **Disable Extension** in the popup to remove the bar entirely

---

## Project Structure

```
├── manifest.json
├── background.js                  # Service worker entry
├── background_modules/
│   ├── DebuggerManager.js         # Attaches debugger, caches network images
│   └── ImageDownloader.js         # Orchestrates image fetching
├── content.js                     # Injects UI into pages
├── inject_scripts/
│   └── imageCrawlers.js           # DOM image scanning & grouping logic
└── public/
    ├── chrome_lib/
    │   └── message-router.js      # Typed message passing utility
    ├── popup/
    │   ├── popup.html / script.js # Extension popup
    │   └── app/v2/                # Main downloader UI (HTML, CSS, JS)
    └── utils.js                   # Shared helpers
```

---

## Permissions

| Permission                     | Reason                                         |
| ------------------------------ | ---------------------------------------------- |
| `debugger`                     | Capture image response bodies from the network |
| `scripting`                    | Scan the DOM for images on the active page     |
| `storage`                      | Remember enabled/disabled state                |
| `host_permissions: <all_urls>` | Work on any website                            |

---

## Development

No build tools required. If you want TypeScript type checking via JSDoc:

```bash
npm install   # installs @types/chrome only
```

Then use VS Code with the TypeScript language server — all files use `// @ts-check` and JSDoc annotations.
