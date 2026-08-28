const CITIES = [
  "Kyoto Japan",
  "Lisbon Portugal",
  "Mexico City",
  "Istanbul Turkey",
  "Marrakech Morocco",
  "Reykjavik Iceland",
  "Hanoi Vietnam",
  "Cartagena Colombia",
  "Edinburgh Scotland",
  "Jaipur India",
];

type Cached = { data: unknown; at: number };
let cache: Cached | null = null;
const TTL = 1000 * 10;

export async function GET() {
  if (cache && Date.now() - cache.at < TTL) {
    return Response.json(cache.data);
  }

  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return Response.json({ error: "No key" }, { status: 500 });

  const city = CITIES[Math.floor(Math.random() * CITIES.length)];

  try {
    const res = await fetch(
      `https://api.unsplash.com/photos/random?query=${encodeURIComponent(
        city
      )}&orientation=landscape&content_filter=high`,
      { headers: { Authorization: `Client-ID ${key}` } }
    );

    if (!res.ok) {
      return Response.json({ error: "Fetch failed" }, { status: 502 });
    }

    const p = await res.json();

    // Unsplash requires triggering this whenever a photo is displayed
    fetch(`${p.links.download_location}?client_id=${key}`).catch(() => {});

    const data = {
      url: p.urls.regular,
      city: city.split(" ")[0],
      alt: p.alt_description ?? city,
      photographer: p.user.name,
      photographerUrl: p.user.links.html,
    };

    cache = { data, at: Date.now() };
    return Response.json(data);
  } catch {
    return Response.json({ error: "Fetch failed" }, { status: 502 });
  }
}
