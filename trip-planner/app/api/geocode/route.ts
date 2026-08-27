type Geo = { name: string; lat: number; lng: number } | null;

const cache = new Map<string, Geo>();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function lookup(query: string): Promise<Geo> {
  if (cache.has(query)) return cache.get(query)!;

  const url =
    "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" +
    encodeURIComponent(query);

  const res = await fetch(url, {
    headers: { "User-Agent": "trip-planner/0.1 (tanishqjadhav@gmail.com)" },
  });

  if (!res.ok) {
    cache.set(query, null);
    return null;
  }

  const data = await res.json();
  const hit = data[0]
    ? { name: query, lat: Number(data[0].lat), lng: Number(data[0].lon) }
    : null;

  cache.set(query, hit);
  return hit;
}

export async function POST(req: Request) {
  const { city, places } = (await req.json()) as {
    city: string;
    places: string[];
  };

  const results: Geo[] = [];

  for (const p of places) {
    results.push(await lookup(`${p}, ${city}`));
    await sleep(1100);
  }

  return Response.json({ results: results.filter(Boolean) });
}
