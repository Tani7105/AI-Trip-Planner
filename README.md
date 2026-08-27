# AI Trip Planner

Enter a city, a number of days, and what you're into. Get a day-by-day
itinerary where each day is a walkable cluster rather than a list of
famous sights scattered across town — plotted on a map, exportable, and
ready to drop into your calendar.

## Features

- **Geographically clustered days.** Each day covers one district, named
  in the itinerary, with stops ordered so the route flows in one
  direction instead of doubling back.
- **Route map.** Numbered pins colored by day, connected by route lines.
  Toggle days on and off; click a stop in the list and the map pans to it.
- **Honest failures.** Stops that can't be resolved to a real location are
  flagged rather than silently dropped.
- **Exports.** PDF, plain text for offline use, and per-stop Google
  Calendar links.

## How it works

1. The browser posts your inputs to `/api/plan`
2. The server calls Gemini with a JSON schema, so the model returns
   structured data rather than prose
3. Stop names go to `/api/geocode`, which resolves them to coordinates
   via the Google Geocoding API
4. The itinerary renders immediately; pins fill in a moment later

The model is instructed to name only real, mappable venues — an early
version happily returned entries like "Ramen dinner in Gion", which reads
fine and geocodes to nothing.

API keys stay server-side. The one exception is a separate,
referrer-restricted browser key used only to load the map.

## Built with

- **Next.js 16** (App Router, TypeScript) — UI and API routes
- **Google Gemini API** — itinerary generation via `responseSchema`
- **Google Geocoding API** — place names to coordinates
- **Google Maps JavaScript API** via `@vis.gl/react-google-maps` — map,
  markers, polylines
- **jsPDF** — client-side PDF export
- **Tailwind CSS** + custom CSS — styling
- **next/font** — Bricolage Grotesque, Space Grotesk, Space Mono
- **Vercel** — hosting, deploys on push to `main`

## Running locally

```bash
git clone https://github.com/Tani7105/AI-Trip-Planner.git
cd AI-Trip-Planner/trip-planner
npm install
```

Create `.env.local` in the project root:

```
GEMINI_API_KEY=
GOOGLE_MAPS_API_KEY=
NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY=
```

| Variable | Where it comes from | Restrict it to |
| --- | --- | --- |
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com) | — |
| `GOOGLE_MAPS_API_KEY` | Google Cloud Console | Geocoding API |
| `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY` | Google Cloud Console | Maps JavaScript API + your HTTP referrers |

The two Maps keys are deliberately separate. Anything prefixed
`NEXT_PUBLIC_` is visible in the page source, so that key is scoped to a
single API and a fixed set of domains. The geocoding key never leaves the
server.

Set a billing budget alert in Cloud Console before you start. Usage past
the free tier bills automatically with no hard cap.

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

```
app/
├── api/
│   ├── plan/route.ts       Gemini call, schema-validated JSON
│   └── geocode/route.ts    place names to coordinates
├── Map.tsx                 map, markers, route lines
├── page.tsx                form, itinerary, exports
├── layout.tsx              fonts
└── globals.css
lib/
└── gemini.ts               configured Gemini client
```

## Known limitations

- Clustering quality tracks how much the model knows about a city. It's
  good for well-documented destinations and closer to guesswork for
  smaller ones, since it reasons from text rather than coordinates.
- Calendar links write times in UTC, so events display in your local
  timezone rather than the destination's.
- Geocode results are cached in memory, so the cache resets on cold start.
- No rate limiting on the API routes.
- Nothing is persisted — a refresh clears the trip.
