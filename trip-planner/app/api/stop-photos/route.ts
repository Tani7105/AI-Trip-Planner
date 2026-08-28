type Shot = { name: string; url: string; attribution: string } | null;

const cache = new Map<string, Shot>();

async function lookup(query: string, key: string): Promise<Shot> {
  if (cache.has(query)) return cache.get(query)!;

  try {
    const res = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": key,
          "X-Goog-FieldMask": "places.photos,places.displayName",
        },
        body: JSON.stringify({ textQuery: query, maxResultCount: 1 }),
      }
    );

    if (!res.ok) {
      console.error("Places error:", res.status, await res.text());
      cache.set(query, null);
      return null;
    }

    const data = await res.json();
    const photo = data.places?.[0]?.photos?.[0];

    if (!photo) {
      cache.set(query, null);
      return null;
    }

    const shot: Shot = {
      name: query,
      url: `https://places.googleapis.com/v1/${photo.name}/media?maxWidthPx=400&key=${key}`,
      attribution: photo.authorAttributions?.[0]?.displayName ?? "",
    };

    cache.set(query, shot);
    return shot;
  } catch (e) {
    console.error(e);
    return null;
  }
}

export async function POST(req: Request) {
  const { city, places } = (await req.json()) as {
    city: string;
    places: string[];
  };

  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return Response.json({ error: "No key" }, { status: 500 });

  if (!Array.isArray(places) || places.length === 0) {
    return Response.json({ error: "No places" }, { status: 400 });
  }

  if (places.length > 40) {
    return Response.json({ error: "Too many places" }, { status: 400 });
  }

  const results = await Promise.all(
    places.map((p) => lookup(`${p}, ${city}`, key))
  );

  return Response.json({ results: results.filter(Boolean) });
}
