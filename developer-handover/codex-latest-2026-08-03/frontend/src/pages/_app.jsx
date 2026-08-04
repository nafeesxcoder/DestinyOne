import "../styles/globals.css";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { configureWebAnalytics, trackWebAnalytics } from "../services/analytics";

export default function App({ Component, pageProps }) {
  const router = useRouter();
  useEffect(() => {
    let consent = false;
    try { consent = Boolean(JSON.parse(window.localStorage.getItem("destinyone-profile-settings") || "{}").anonymousAnalytics); } catch { consent = false; }
    configureWebAnalytics(consent);
    if (consent) trackWebAnalytics("app_session_started", { platform:"web" });
    const trackRoute = url => trackWebAnalytics("screen_viewed", { screen_key:String(url).split("?")[0].split("/").filter(Boolean)[0] || "home" });
    trackRoute(router.asPath); router.events.on("routeChangeComplete",trackRoute);
    return () => router.events.off("routeChangeComplete",trackRoute);
  }, [router]);
  return <Component {...pageProps} />;
}
