"use client";
import { useState } from "react";
import dynamic from "next/dynamic";

const Map = dynamic(() => import("./Map"), { ssr: false });

type Stop = { name: string; time: string; why: string };
type Day = { day: number; stops: Stop[] };
type Pin = { name: string; lat: number; lng: number };

export default function Home() {
  const [city, setCity] = useState("");
  const [days, setDays] = useState(3);
  const [interests, setInterests] = useState("");
  const [plan, setPlan] = useState<Day[] | null>(null);
  const [pins, setPins] = useState<Pin[]>([]);
  const [loading, setLoading] = useState(false);
  const [mapping, setMapping] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    setLoading(true);
    setError("");
    setPlan(null);
    setPins([]);

    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city, days, interests }),
      });
      if (!res.ok) throw new Error("Request failed");

      const data: { days: Day[] } = await res.json();
      setPlan(data.days);
      setLoading(false);

      // Geocode in the background so the itinerary shows immediately
      setMapping(true);
      const places = data.days.flatMap((d) => d.stops.map((s) => s.name));

      const geo = await fetch("/api/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city, places }),
      });
      if (geo.ok) {
        const { results }: { results: Pin[] } = await geo.json();
        setPins(results);
      }
    } catch {
      setError("Could not generate a plan. Try again.");
      setLoading(false);
    } finally {
      setMapping(false);
    }
  }

  const located = new Set(pins.map((p) => p.name));
  const totalStops = plan?.flatMap((d) => d.stops).length ?? 0;

  return (
    <main className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-semibold mb-6">Trip Planner</h1>

      <div className="flex flex-col gap-3 mb-6">
        <input
          className="border rounded px-3 py-2"
          placeholder="City"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
        <input
          type="number"
          min={1}
          max={7}
          className="border rounded px-3 py-2"
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
        />
        <input
          className="border rounded px-3 py-2"
          placeholder="Interests (food, museums, hiking)"
          value={interests}
          onChange={(e) => setInterests(e.target.value)}
        />
        <button
          onClick={generate}
          disabled={loading || mapping || !city}
          className="bg-black text-white rounded px-4 py-2 disabled:opacity-40"
        >
          {loading ? "Planning…" : "Generate"}
        </button>
      </div>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      {mapping && (
        <p className="text-sm text-gray-500 mb-4">
          Locating stops… this takes a few seconds.
        </p>
      )}

      {pins.length > 0 && (
        <div className="mb-6">
          <Map pins={pins} />
          {pins.length < totalStops && (
            <p className="text-xs text-gray-500 mt-2">
              {totalStops - pins.length} of {totalStops} stops could not be
              located on the map.
            </p>
          )}
        </div>
      )}

      {plan?.map((d) => (
        <section key={d.day} className="mb-6">
          <h2 className="font-semibold mb-2">Day {d.day}</h2>
          <ul className="flex flex-col gap-3">
            {d.stops.map((s, i) => (
              <li key={i} className="border rounded p-3">
                <div className="text-sm text-gray-500">{s.time}</div>
                <div className="font-medium">
                  {s.name}
                  {pins.length > 0 && !located.has(`${s.name}, ${city}`) && (
                    <span className="ml-2 text-xs font-normal text-amber-600">
                      not found
                    </span>
                  )}
                </div>
                <div className="text-sm">{s.why}</div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
