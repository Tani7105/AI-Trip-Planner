type Geo = { name: string; lat: number; lng: number } | null;

const cache = new Map<string, Geo>();

async function lookup(query: string): Promise<Geo> {
  if (cache.has(query)) return cache.get(query)!;

  const url =
    "https://maps.googleapis.com/maps/api/geocode/json" +
    `?address=${encodeURIComponent(query)}` +
    `&key=${process.env.GOOGLE_MAPS_API_KEY}`;

  const res = await fetch(url);
  if (!res.ok) {
    cache.set(query, null);
    return null;
  }

  const data = await res.json();

  if (data.status === "OVER_QUERY_LIMIT" || data.status === "REQUEST_DENIED") {
    console.error("Geocoding error:", data.status, data.error_message);
    return null;
  }

  const hit = data.results?.[0]?.geometry?.location
    ? {
        name: query,
        lat: data.results[0].geometry.location.lat,
        lng: data.results[0].geometry.location.lng,
      }
    : null;

  cache.set(query, hit);
  return hit;
}

export async function POST(req: Request) {
  const { city, places } = (await req.json()) as {
    city: string;
    places: string[];
  };

  if (!Array.isArray(places) || places.length === 0) {
    return Response.json({ error: "No places" }, { status: 400 });
  }

  if (places.length > 40) {
    return Response.json({ error: "Too many places" }, { status: 400 });
  }

  const results = await Promise.all(places.map((p) => lookup(`${p}, ${city}`)));

  return Response.json({ results: results.filter(Boolean) });
}
