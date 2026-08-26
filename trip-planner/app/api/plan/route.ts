import { ai } from "@/lib/gemini";

export async function POST(req: Request) {
  const { city, days, interests } = await req.json();

  try {
    const res = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: `${days} days in ${city}. Interests: ${interests}.`,
      config: {
        systemInstruction:
          "You are a trip planner. Return only valid JSON, no markdown fences.",
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
                required: ["day", "stops"],
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
