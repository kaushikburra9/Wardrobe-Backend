# Wardrobe — virtual try-on MVP

Take a photo of yourself, take a photo of clothes, see them on you.

## Stack
- **Frontend** — React Native + Expo, full-screen camera with framing guides
- **Backend** — Express proxy that calls Fashn v1.6 (handles API key + polling)
- **AI** — Fashn `tryon-v1.6` (~5–17 sec per generation, $0.075/image)

## Project layout
```
wardrobe-app/
  App.js                  # entry
  app.json                # expo config + apiUrl
  app/
    HomeScreen.js         # composer ↔ generating ↔ result state machine
  components/
    Button.js             # press-scaling button with haptics
    PhotoSlot.js          # empty/filled photo capture slot
    CameraModal.js        # full-screen camera with framing guides
    GeneratingView.js     # animated loading with rotating status
    ResultView.js         # reveal screen with before/after toggle
  api/
    tryon.js              # frontend api client
  theme/
    tokens.js             # colors, spacing, type, motion
  backend/
    server.js             # express + fashn proxy
    package.json
    .env.example
```

## Run it

### 1. Backend
```bash
cd backend
cp .env.example .env       # then paste your FASHN_API_KEY
npm install
npm start
```

Backend is now on `http://localhost:3000`.

### 2. Get the backend reachable from your phone
Expo Go on your phone can't hit `localhost` on your laptop. Two options:

**Easiest** — deploy the backend to Railway in 5 min:
1. Push `backend/` to a GitHub repo
2. railway.app → New Project → Deploy from GitHub
3. Add env var `FASHN_API_KEY`
4. Copy the public URL Railway gives you
5. Paste it into `app.json` under `extra.apiUrl`

**Local** — point your phone at your laptop's LAN IP:
1. Find your IP — `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
2. Set `extra.apiUrl` to `http://YOUR_IP:3000`
3. Make sure your laptop firewall lets port 3000 through

### 3. Frontend
```bash
cd ..                      # back to project root
npm install
npx expo start
```

Scan the QR code with Expo Go (iOS Camera or Expo Go on Android).

## What works
- Capture photo of yourself + photo of any clothing item
- Generate a realistic try-on
- Toggle before/after on the result
- Share the result

## What's intentionally not built yet
Multiple wardrobe items, occasion-based AI styling, in-store scanner, accounts,
subscription. Ship this MVP first, validate the core moment is magical, then layer
the rest on. The whole point of v1 is to find out whether people say "wait, that
actually looks like me" — everything else is downstream of that answer.

## Cost note
Each generation costs $0.075. Plan to absorb this for your first 50–100 testers
to gather feedback before charging anything.
