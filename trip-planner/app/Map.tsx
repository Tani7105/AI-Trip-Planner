"use client";
import {
  APIProvider,
  Map as GMap,
  AdvancedMarker,
  Pin as GPin,
  InfoWindow,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import { useEffect, useMemo, useState } from "react";

export type Pin = {
  key: string;
  name: string;
  lat: number;
  lng: number;
  day: number;
  order: number;
};

export const DAY_COLORS = [
  "#0A84FF",
  "#FF5A5F",
  "#00B87C",
  "#A855F7",
  "#FF8A00",
  "#0EA5A5",
  "#E11D74",
];

export function dayColor(day: number) {
  return DAY_COLORS[(day - 1) % DAY_COLORS.length];
}

/* one route line per day */
function Routes({ pins }: { pins: Pin[] }) {
  const map = useMap();
  const mapsLib = useMapsLibrary("maps");

  useEffect(() => {
    if (!map || !mapsLib) return;

    const byDay = new globalThis.Map<number, Pin[]>();
    for (const p of pins) {
      if (!byDay.has(p.day)) byDay.set(p.day, []);
      byDay.get(p.day)!.push(p);
    }

    const lines: google.maps.Polyline[] = [];

    for (const [day, group] of byDay) {
      if (group.length < 2) continue;

      const path = [...group]
        .sort((a, b) => a.order - b.order)
        .map((p) => ({ lat: p.lat, lng: p.lng }));

      lines.push(
        new google.maps.Polyline({
          path,
          map,
          strokeColor: dayColor(day),
          strokeOpacity: 0.8,
          strokeWeight: 3,
        })
      );
    }

    return () => lines.forEach((l) => l.setMap(null));
  }, [map, mapsLib, pins]);

  return null;
}

/* pans when a stop is clicked in the list */
function Focus({ pin }: { pin: Pin | null }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !pin) return;
    map.panTo({ lat: pin.lat, lng: pin.lng });
    map.setZoom(15);
  }, [map, pin]);

  return null;
}

/* fits the viewport to the visible pins */
function Fit({ pins }: { pins: Pin[] }) {
  const map = useMap();
  const coreLib = useMapsLibrary("core");

  useEffect(() => {
    if (!map || !coreLib || pins.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    pins.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }));
    map.fitBounds(bounds, 60);
  }, [map, coreLib, pins]);

  return null;
}

export default function Map({
  pins,
  focusKey,
}: {
  pins: Pin[];
  focusKey: string | null;
}) {
  const [active, setActive] = useState<string | null>(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY;

  const focused = useMemo(
    () => pins.find((p) => p.key === focusKey) ?? null,
    [pins, focusKey]
  );

  useEffect(() => {
    if (focusKey) setActive(focusKey);
  }, [focusKey]);

  const activePin = pins.find((p) => p.key === active) ?? null;

  const center = useMemo(() => {
    if (!pins.length) return { lat: 0, lng: 0 };
    return {
      lat: pins.reduce((a, p) => a + p.lat, 0) / pins.length,
      lng: pins.reduce((a, p) => a + p.lng, 0) / pins.length,
    };
  }, [pins]);

  if (!pins.length) return null;

  if (!apiKey) {
    return (
      <div style={{ padding: "1rem" }}>
        Map unavailable — browser key not configured.
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey}>
      <GMap
        style={{ height: 440, width: "100%" }}
        defaultCenter={center}
        defaultZoom={12}
        mapId="TRIP_PLANNER_MAP"
        gestureHandling="greedy"
      >
        <Fit pins={pins} />
        <Routes pins={pins} />
        <Focus pin={focused} />

        {pins.map((p) => (
          <AdvancedMarker
            key={p.key}
            position={{ lat: p.lat, lng: p.lng }}
            onClick={() => setActive(p.key)}
            zIndex={active === p.key ? 100 : 1}
          >
            <GPin
              background={dayColor(p.day)}
              borderColor="#0E1633"
              glyphColor="#FFFFFF"
              glyph={String(p.order + 1)}
              scale={active === p.key ? 1.3 : 1}
            />
          </AdvancedMarker>
        ))}

        {activePin && (
          <InfoWindow
            position={{ lat: activePin.lat, lng: activePin.lng }}
            onCloseClick={() => setActive(null)}
          >
            <div style={{ color: "#0E1633" }}>
              <div style={{ fontSize: 11, opacity: 0.6 }}>
                Day {activePin.day} · Stop {activePin.order + 1}
              </div>
              <div style={{ fontWeight: 600 }}>{activePin.name}</div>
            </div>
          </InfoWindow>
        )}
      </GMap>
    </APIProvider>
  );
}
