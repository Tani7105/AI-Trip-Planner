# AI Trip Planner

Enter a city, a number of days, and what you're into. Get a structured
day-by-day itinerary with every stop plotted on a map.

## How it works

1. The browser posts your inputs to `/api/plan`
2. The server calls Gemini with a JSON schema, so the model returns
   structured data rather than prose
3. Stop names go to `/api/geocode`, which resolves them to coordinates
   via the Google Geocoding API
4. The itinerary renders immediately; pins fill in on the map a moment later

API keys stay server-side. The browser never sees them, apart from a
separate referrer-restricted key used only to load the map.

## Built with

- **Next.js 16** (App Router, TypeScript) — UI and API routes
- **Google Gemini API** — itinerary generation, using `responseSchema`
  for guaranteed JSON shape
- **Google Geocoding API** — resolving place names to coordinates
- **Google Maps JavaScript API** via `@vis.gl/react-google-maps` — map rendering
- **Tailwind CSS** + custom CSS — styling
- **next/font** — Bricolage Grotesque, Space Grotesk, Space Mono
- **Vercel** — hosting, with deploys on push to `main`

## Running locally

```bash
git clone <repo-url>
cd trip-planner
npm install
```

Create `.env.local` in the project root:

```
GEMINI_API_KEY=
GOOGLE_MAPS_API_KEY=
NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY=
```

- `GEMINI_API_KEY` — from [Google AI Studio](https://aistudio.google.com)
- `GOOGLE_MAPS_API_KEY` — Cloud Console key restricted to the Geocoding API
- `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY` — separate key restricted to the
  Maps JavaScript API and your HTTP referrers

The two Maps keys are deliberately separate. The browser key is public by
design, so it's scoped to one API and one set of domains.

```bash
npm run dev
```

Open [https://ai-trip-planner-theta-gules.vercel.app/)

## Project structure

```
app/
├── api/
│   ├── plan/route.ts       LLM call, returns schema-validated JSON
│   └── geocode/route.ts    place names to coordinates
├── Map.tsx                 map and markers
├── page.tsx                form and itinerary
└── globals.css
lib/
└── gemini.ts               configured Gemini client
```

## Known limitations

- The model sometimes returns activities rather than venues
  ("Gion Ramen Dinner"), which geocode to an approximate area rather than
  a real place. Stops that fail outright are flagged in the UI.
- Geocode results are cached in memory, so the cache resets on cold start.
- No rate limiting on the API routes yet.
- Nothing is persisted — a refresh clears the trip.
