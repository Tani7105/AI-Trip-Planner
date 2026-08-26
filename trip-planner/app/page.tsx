"use client";
import { useState } from "react";

type Stop = { name: string; time: string; why: string };
type Day = { day: number; stops: Stop[] };

export default function Home() {
  const [city, setCity] = useState("");
  const [days, setDays] = useState(3);
  const [interests, setInterests] = useState("");
  const [plan, setPlan] = useState<Day[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    setLoading(true);
    setError("");
    setPlan(null);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city, days, interests }),
      });
      if (!res.ok) throw new Error("Request failed");
      const data = await res.json();
      setPlan(data.days);
    } catch {
      setError("Could not generate a plan. Try again.");
    } finally {
      setLoading(false);
    }
  }

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
          disabled={loading || !city}
          className="bg-black text-white rounded px-4 py-2 disabled:opacity-40"
        >
          {loading ? "Planning…" : "Generate"}
        </button>
      </div>

      {error && <p className="text-red-600">{error}</p>}

      {plan?.map((d) => (
        <section key={d.day} className="mb-6">
          <h2 className="font-semibold mb-2">Day {d.day}</h2>
          <ul className="flex flex-col gap-3">
            {d.stops.map((s, i) => (
              <li key={i} className="border rounded p-3">
                <div className="text-sm text-gray-500">{s.time}</div>
                <div className="font-medium">{s.name}</div>
                <div className="text-sm">{s.why}</div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
