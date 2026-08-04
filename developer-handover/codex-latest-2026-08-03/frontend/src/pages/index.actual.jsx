import Head from "next/head";
import { useEffect, useState } from "react";

// Parity bridge: the complete, verified Expo web export is hosted inside Next.js
// while individual screens are migrated from actual-source without visual drift.
export default function ActualDestinyOnePage() {
  const [experienceUrl, setExperienceUrl] = useState("/actual-app/index.html?previewAccess=1&preview=home");
  useEffect(() => {
    setExperienceUrl(window.location.search
      ? `/actual-app/index.html${window.location.search}`
      : "/actual-app/index.html?previewAccess=1&preview=home");
  }, []);
  return (
    <>
      <Head><title>DestinyOne</title><meta name="description" content="Meaningful connections. Extraordinary futures." /></Head>
      <iframe
        title="DestinyOne application"
        src={experienceUrl}
        style={{ position: "fixed", inset: 0, width: "100%", height: "100%", border: 0, background: "#fffaf7" }}
        allow="camera; microphone; geolocation; clipboard-read; clipboard-write"
      />
    </>
  );
}
