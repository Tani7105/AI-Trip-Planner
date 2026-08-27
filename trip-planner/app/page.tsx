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
      if (!res.ok) throw new Error();

      const data: { days: Day[] } = await res.json();
      setPlan(data.days);
      setLoading(false);

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
      setError(
        "Couldn't reach the planner. Check your connection and try again."
      );
      setLoading(false);
    } finally {
      setMapping(false);
    }
  }

  const located = new Set(pins.map((p) => p.name));
  const totalStops = plan?.flatMap((d) => d.stops).length ?? 0;

  return (
    <main>
      <header className="hero">
        <div className="hero-inner">
          <p className="eyebrow">AI trip planner</p>
          <h1 className="headline">
            Pick a city. Get a day plan you can <em>actually walk.</em>
          </h1>
        </div>
      </header>

      <div className="wrap">
        <div className="ticket">
          <div className="ticket-main">
            <div className="field">
              <label className="field-label" htmlFor="city">
                Destination
              </label>
              <input
                id="city"
                placeholder="Kyoto"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>

            <div className="field">
              <label className="field-label" htmlFor="days">
                Days
              </label>
              <input
                id="days"
                type="number"
                min={1}
                max={7}
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
              />
            </div>

            <div className="field">
              <label className="field-label" htmlFor="interests">
                What you're into
              </label>
              <input
                id="interests"
                placeholder="Food, temples, long walks"
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
              />
            </div>
          </div>

          <div className="ticket-stub">
            <button
              className="go"
              onClick={generate}
              disabled={loading || mapping || !city}
            >
              {loading ? "Planning…" : "Plan the trip"}
            </button>
            <p className="stub-note">Tear here</p>
          </div>
        </div>

        {error && <p className="status status-bad">{error}</p>}

        {mapping && <p className="status">Locating stops on the map…</p>}

        {pins.length > 0 && (
          <>
            <div className="map-frame">
              <Map pins={pins} />
            </div>
            {pins.length < totalStops && (
              <p className="map-note">
                {totalStops - pins.length} of {totalStops} stops couldn't be
                placed on the map.
              </p>
            )}
          </>
        )}

        {plan?.map((d) => (
          <section className="day" key={d.day}>
            <div className="day-tag">DAY {String(d.day).padStart(2, "0")}</div>
            <ul className="stops">
              {d.stops.map((s, i) => (
                <li className="stop" key={i}>
                  <div className="stop-time">{s.time}</div>
                  <div>
                    <h3 className="stop-name">
                      {s.name}
                      {pins.length > 0 &&
                        !located.has(`${s.name}, ${city}`) && (
                          <span className="badge">not on map</span>
                        )}
                    </h3>
                    <p className="stop-why">{s.why}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
