# Scryon Lens — Chrome Extension

Instant Scryon AI intelligence overlay on any browser tab. Press **Alt+S** (Option+S on Mac) anywhere to open a floating panel with today's brief and a live chat interface.

---

## Setup

1. Open Chrome → `chrome://extensions`
2. Enable **Developer Mode** (toggle, top right)
3. Click **Load unpacked**
4. Select the `scryon-extension` folder
5. Click the **Scryon Lens** icon in your toolbar
6. Enter your Scryon URL and API token
7. Press **Alt+S** on any tab — the overlay appears

---

## Getting Your API Token

1. Go to your Scryon Railway project → **Variables**
2. Find (or add) `EXTENSION_TOKEN` — set it to any long random string
3. Copy the value and paste it into the extension popup

---

## Keyboard Shortcut

**Alt+S** (Windows/Linux) / **Option+S** (Mac) — works on any tab

To change: `chrome://extensions/shortcuts`

---

## What It Shows

- Today's date, development count, avg score, ideas tracked
- Top 3 developments with score, team, Fello fit summary
- Click a card to expand and see immediate ideas
- Drag the header to reposition — position is saved across tabs
- Minimise button collapses to just the header + date bar
- Full chat interface — ask anything about today's brief, tracker, or patterns

---

## Generating Icons (optional, already done)

```bash
npm install canvas
node generate-icons.js
```
