"use client";
import { useEffect, useState } from "react";

type Photo = {
  url: string;
  city: string;
  alt: string;
  photographer: string;
  photographerUrl: string;
};

const UTM = "?utm_source=postcard&utm_medium=referral";

export default function HeroPhoto() {
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/photo")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && !d.error && setPhoto(d))
      .catch(() => {});
  }, []);

  if (!photo) return null;

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.url}
        alt={photo.alt}
        className={`hero-photo ${loaded ? "is-loaded" : ""}`}
        onLoad={() => setLoaded(true)}
      />
      <div className="hero-scrim" />
      <div className="hero-credit">
        <span className="credit-city">{photo.city}</span>
        <span className="credit-by">
          Photo by{" "}
          <a
            href={`${photo.photographerUrl}${UTM}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {photo.photographer}
          </a>{" "}
          on{" "}
          <a
            href={`https://unsplash.com${UTM}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Unsplash
          </a>
        </span>
      </div>
    </>
  );
}
