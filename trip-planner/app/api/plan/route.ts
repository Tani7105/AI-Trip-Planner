import { ai } from "@/lib/gemini";

export async function POST(req: Request) {
  const { city, days, interests } = await req.json();

  if (!city || typeof city !== "string") {
    return Response.json({ error: "Missing city" }, { status: 400 });
  }

  try {
    const res = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: `${days} days in ${city}. Interests: ${interests}.`,
      config: {
        systemInstruction: `You are a trip planner. Plan each day as a geographic cluster.

Rules:
- Group stops that are within walking distance or a short ride of each other into the same day. Never send someone across the city and back.
- Each day should cover one area or district. Name that area in the day's "area" field.
- Order stops within a day so the route flows in one direction, not back and forth.
- If two famous sights are far apart, they belong on different days, even if both are must-sees.
- Only name real, specific, mappable places. Never invent a venue, and never write an activity description as if it were a place name. "Ramen dinner in Gion" is not a place; the restaurant's actual name is.

Return only valid JSON, no markdown fences.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            days: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  day: { type: "number" },
                  area: { type: "string" },
                  stops: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        time: { type: "string" },
                        why: { type: "string" },
                      },
                      required: ["name", "time", "why"],
                    },
                  },
                },
                required: ["day", "area", "stops"],
              },
            },
          },
          required: ["days"],
        },
      },
    });

    if (!res.text) {
      return Response.json({ error: "Empty response" }, { status: 502 });
    }

    return Response.json(JSON.parse(res.text));
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Generation failed" }, { status: 500 });
  }
}
