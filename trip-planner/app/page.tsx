"use client";
import { useMemo, useState } from "react";
import Map, { dayColor, type Pin } from "./Map";

type Stop = { name: string; time: string; why: string };
type Day = { day: number; area: string; stops: Stop[] };
type GeoHit = { name: string; lat: number; lng: number };

/* ---------- export helpers ---------- */

function toText(city: string, plan: Day[]) {
  const lines = [`${city.toUpperCase()} — ${plan.length} DAY TRIP`, ""];
  for (const d of plan) {
    lines.push(`DAY ${d.day}`);
    for (const s of d.stops) {
      lines.push(`  ${s.time}  ${s.name}`);
      lines.push(`           ${s.why}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

function slug(city: string) {
  return city.toLowerCase().replace(/\s+/g, "-");
}

function downloadText(city: string, plan: Day[]) {
  const blob = new Blob([toText(city, plan)], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug(city)}-trip.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

async function downloadPdf(city: string, plan: Day[]) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();

  let y = 20;
  doc.setFontSize(20);
  doc.text(`${city} — ${plan.length} day trip`, 15, y);
  y += 12;

  for (const d of plan) {
    if (y > 260) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(14);
    doc.text(`Day ${d.day}`, 15, y);
    y += 8;

    doc.setFontSize(10);
    for (const s of d.stops) {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(`${s.time}  ${s.name}`, 20, y);
      y += 5;
      for (const line of doc.splitTextToSize(s.why, 165)) {
        if (y > 275) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, 25, y);
        y += 5;
      }
      y += 3;
    }
    y += 5;
  }

  doc.save(`${slug(city)}-trip.pdf`);
}

function calendarUrl(
  stop: Stop,
  dayNumber: number,
  startDate: string,
  city: string
) {
  const date = new Date(startDate);
  date.setDate(date.getDate() + dayNumber - 1);

  const m = stop.time.match(/(\d+):(\d+)\s*(AM|PM)?/i);
  let hours = m ? Number(m[1]) : 9;
  const mins = m ? Number(m[2]) : 0;
  const period = m?.[3]?.toUpperCase();
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;

  date.setHours(hours, mins, 0, 0);
  const end = new Date(date.getTime() + 90 * 60 * 1000);

  const fmt = (d: Date) =>
    d
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: stop.name,
    dates: `${fmt(date)}/${fmt(end)}`,
    details: stop.why,
    location: `${stop.name}, ${city}`,
  });

  return `https://calendar.google.com/calendar/render?${params}`;
}

/* ---------- page ---------- */

export default function Home() {
  const [city, setCity] = useState("");
  const [days, setDays] = useState(3);
  const [interests, setInterests] = useState("");
  const [startDate, setStartDate] = useState("");

  const [plan, setPlan] = useState<Day[] | null>(null);
  const [tripCity, setTripCity] = useState("");
  const [pins, setPins] = useState<Pin[]>([]);
  const [hiddenDays, setHiddenDays] = useState<Set<number>>(new Set());
  const [focusKey, setFocusKey] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [mapping, setMapping] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    setLoading(true);
    setError("");
    setPlan(null);
    setPins([]);
    setHiddenDays(new Set());
    setFocusKey(null);

    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city, days, interests }),
      });
      if (!res.ok) throw new Error();

      const data: { days: Day[] } = await res.json();
      setPlan(data.days);
      setTripCity(city);
      setLoading(false);

      setMapping(true);
      const places = data.days.flatMap((d) => d.stops.map((s) => s.name));

      const geo = await fetch("/api/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city, places }),
      });

      if (geo.ok) {
        const { results }: { results: GeoHit[] } = await geo.json();
        const byName = new globalThis.Map(results.map((r) => [r.name, r]));

        const built: Pin[] = [];
        for (const d of data.days) {
          let order = 0;
          d.stops.forEach((s, i) => {
            const hit = byName.get(`${s.name}, ${city}`);
            if (!hit) return;
            built.push({
              key: `${d.day}-${i}`,
              name: s.name,
              lat: hit.lat,
              lng: hit.lng,
              day: d.day,
              order: order++,
            });
          });
        }
        setPins(built);
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

  const visiblePins = useMemo(
    () => pins.filter((p) => !hiddenDays.has(p.day)),
    [pins, hiddenDays]
  );

  function toggleDay(day: number) {
    setHiddenDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  }

  const mappedKeys = new Set(pins.map((p) => p.key));
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

            <div className="field-row">
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
                <label className="field-label" htmlFor="start">
                  Start date (optional)
                </label>
                <input
                  id="start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
            </div>

            <div className="field">
              <label className="field-label" htmlFor="interests">
                What you&apos;re into
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

        {pins.length > 0 && plan && (
          <>
            <div className="day-toggles">
              {plan.map((d) => {
                const on = !hiddenDays.has(d.day);
                return (
                  <button
                    key={d.day}
                    className={`day-toggle ${on ? "is-on" : ""}`}
                    onClick={() => toggleDay(d.day)}
                    style={
                      on
                        ? {
                            background: dayColor(d.day),
                            borderColor: dayColor(d.day),
                          }
                        : undefined
                    }
                  >
                    Day {d.day}
                  </button>
                );
              })}
            </div>

            <div className="map-frame">
              <Map pins={visiblePins} focusKey={focusKey} />
            </div>

            {pins.length < totalStops && (
              <p className="map-note">
                {totalStops - pins.length} of {totalStops} stops couldn&apos;t
                be placed on the map.
              </p>
            )}
          </>
        )}

        {plan && (
          <div className="exports">
            <button
              className="export-btn"
              onClick={() => downloadPdf(tripCity, plan)}
            >
              Download PDF
            </button>
            <button
              className="export-btn"
              onClick={() => downloadText(tripCity, plan)}
            >
              Download text
            </button>
            {!startDate && (
              <p className="export-hint">
                Add a start date to get calendar links on each stop.
              </p>
            )}
          </div>
        )}

        {plan?.map((d) => (
          <section className="day" key={d.day}>
            <div className="day-tag" style={{ background: dayColor(d.day) }}>
              DAY {String(d.day).padStart(2, "0")}
            </div>
            <p className="day-area">{d.area}</p>
            <ul className="stops">
              {d.stops.map((s, i) => {
                const key = `${d.day}-${i}`;
                const onMap = mappedKeys.has(key);
                const pin = pins.find((p) => p.key === key);

                return (
                  <li
                    className={`stop ${onMap ? "is-clickable" : ""} ${
                      focusKey === key ? "is-focused" : ""
                    }`}
                    key={key}
                    onClick={() => onMap && setFocusKey(key)}
                  >
                    <div className="stop-time">{s.time}</div>
                    <div>
                      <h3 className="stop-name">
                        {pin && (
                          <span
                            className="stop-num"
                            style={{ background: dayColor(d.day) }}
                          >
                            {pin.order + 1}
                          </span>
                        )}
                        {s.name}
                        {pins.length > 0 && !onMap && (
                          <span className="badge">not on map</span>
                        )}
                      </h3>
                      <p className="stop-why">{s.why}</p>
                      {startDate && (
                        <a
                          className="cal-link"
                          href={calendarUrl(s, d.day, startDate, tripCity)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Add to calendar
                        </a>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
