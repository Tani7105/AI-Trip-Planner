"use client";
import {
  APIProvider,
  Map as GMap,
  AdvancedMarker,
  Pin as GPin,
  InfoWindow,
} from "@vis.gl/react-google-maps";
import { useMemo, useState } from "react";

type Pin = { name: string; lat: number; lng: number };

export default function Map({ pins }: { pins: Pin[] }) {
  const [active, setActive] = useState<number | null>(null);
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY;

  const center = useMemo(() => {
    if (!pins.length) return { lat: 0, lng: 0 };
    const lat = pins.reduce((a, p) => a + p.lat, 0) / pins.length;
    const lng = pins.reduce((a, p) => a + p.lng, 0) / pins.length;
    return { lat, lng };
  }, [pins]);

  if (!pins.length) return null;

  if (!key) {
    return (
      <div style={{ padding: "1rem" }}>
        Map unavailable — browser key not configured.
      </div>
    );
  }

  return (
    <APIProvider apiKey={key}>
      <GMap
        style={{ height: 400, width: "100%" }}
        defaultCenter={center}
        defaultZoom={12}
        mapId="TRIP_PLANNER_MAP"
        gestureHandling="greedy"
      >
        {pins.map((p, i) => (
          <AdvancedMarker
            key={i}
            position={{ lat: p.lat, lng: p.lng }}
            onClick={() => setActive(i)}
          >
            <GPin
              background="#0A84FF"
              borderColor="#0E1633"
              glyphColor="#FFFFFF"
            />
          </AdvancedMarker>
        ))}

        {active !== null && (
          <InfoWindow
            position={{ lat: pins[active].lat, lng: pins[active].lng }}
            onCloseClick={() => setActive(null)}
          >
            <div style={{ color: "#0E1633", fontWeight: 600 }}>
              {pins[active].name}
            </div>
          </InfoWindow>
        )}
      </GMap>
    </APIProvider>
  );
}
