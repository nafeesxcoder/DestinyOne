import Head from "next/head";
import { useEffect, useMemo, useState } from "react";

const SCREEN_GROUPS = [
  {
    label: "Start & onboarding",
    screens: [
      { id: "splash", label: "Splash", note: "Brand launch screen" },
      { id: "welcome", label: "Welcome", note: "Product introduction" },
      { id: "auth", label: "Sign in", note: "Phone or email access" },
      { id: "otp", label: "OTP verification", note: "Security code entry" },
      { id: "verify", label: "Identity verification", note: "Selfie and trust setup" },
      { id: "modeSelect", label: "Experience mode", note: "Seeking or couple mode" },
      { id: "coupleSetup", label: "Couple setup", note: "Partner connection flow" },
      { id: "profileSetup", label: "Profile setup", note: "Core profile details" },
      { id: "vibes", label: "Personality & vibes", note: "Lifestyle preferences" },
      { id: "intent", label: "Relationship intent", note: "Date-to-marry goals" },
      { id: "alignment", label: "Life alignment", note: "Marriage readiness questions" }
    ]
  },
  {
    label: "Matching journey",
    screens: [
      { id: "home", label: "Home / Matches", note: "Daily serious introductions" },
      { id: "explore", label: "Discover", note: "Relationship discovery hub" },
      { id: "circle", label: "Executive Circle", note: "Selective introductions" },
      { id: "discovery", label: "Smart discovery", note: "Preference-based results" },
      { id: "detail", label: "Match profile", note: "Full member profile" },
      { id: "mutual", label: "Mutual match", note: "Connection celebration" },
      { id: "icebreaker", label: "Icebreaker", note: "Conversation unlock" },
      { id: "chat", label: "Chat", note: "Messaging and calls" },
      { id: "gifts", label: "Romantic Gifts", note: "Four-step private gift checkout" },
      { id: "datePlan", label: "Plan a date", note: "Couple date proposal" }
    ]
  },
  {
    label: "Member tools",
    screens: [
      { id: "events", label: "Date Marketplace", note: "Places, packages and events" },
      { id: "safety", label: "Safety Center", note: "Reports, blocks and check-ins" },
      { id: "dateSafety", label: "Date safety", note: "Public-first date controls" },
      { id: "likes", label: "People who chose you", note: "Private incoming interest" },
      { id: "profile", label: "Profile", note: "Member settings and progress" },
      { id: "pricing", label: "Membership", note: "Plan and pricing hierarchy" },
      { id: "support", label: "Support", note: "Help and assistance" },
      { id: "coach", label: "Relationship coach", note: "Guided relationship help" }
    ]
  },
  {
    label: "Marriage & growth",
    screens: [
      { id: "blueprint", label: "Marriage Blueprint", note: "Goals and dealbreakers" },
      { id: "journey", label: "Relationship Journey", note: "Milestones and Family Room" },
      { id: "community", label: "Community", note: "Trusted relationship spaces" },
      { id: "executive", label: "Executive", note: "Professional member experience" },
      { id: "verifyHub", label: "Verification Hub", note: "Trust status and options" },
      { id: "readiness", label: "Readiness", note: "Marriage readiness overview" },
      { id: "admin", label: "Admin & audit", note: "Operational readiness view" }
    ]
  },
  {
    label: "Inside Profile",
    screens: [
      { id: "profile-settings", screen: "profile", state: "profile-settings", label: "Account settings", note: "Privacy, visibility and notifications" },
      { id: "profile-referral", screen: "profile", state: "profile-referral", label: "Invite & free pass", note: "Referral offer and invite code" },
      { id: "profile-edit", screen: "profileSetup", label: "Edit profile", note: "Photos, voice and personal details" },
      { id: "profile-preferences", screen: "discovery", label: "Profile preferences", note: "Intent, distance and match filters" },
      { id: "profile-trust", screen: "verifyHub", label: "Profile Trust Hub", note: "Verification and identity controls" },
      { id: "profile-safety", screen: "safety", label: "Profile safety", note: "Privacy, reports and account data" },
      { id: "profile-membership", screen: "pricing", label: "Profile membership", note: "Plans, billing and thoughtful notes" },
      { id: "profile-help", screen: "support", label: "Profile help", note: "Support topics and appeals" }
    ]
  },
  {
    label: "Inside Chat",
    screens: [
      { id: "chat-search", screen: "chat", state: "chat-search", label: "Search conversation", note: "Find messages inside the chat" },
      { id: "chat-coach", screen: "chat", state: "chat-coach", label: "Chat coach", note: "Suggested thoughtful replies" },
      { id: "chat-attachments", screen: "chat", state: "chat-attachments", label: "Chat attachments", note: "Camera, gallery, location and more" },
      { id: "chat-emoji", screen: "chat", state: "chat-emoji", label: "Emoji picker", note: "Conversation emoji tray" },
      { id: "chat-gif", screen: "chat", state: "chat-gif", label: "GIF picker", note: "Search and send a GIF" },
      { id: "chat-gift", screen: "chat", state: "chat-gift", label: "Gift shop", note: "Digital and physical gifts" },
      { id: "chat-games", screen: "chat", state: "chat-games", label: "Couple games", note: "Conversation games and prompts" },
      { id: "chat-snap", screen: "chat", state: "chat-snap", label: "Snap Studio", note: "View-once photo flow" },
      { id: "chat-face-emoji", screen: "chat", state: "chat-face-emoji", label: "Face Emoji Studio", note: "Personal sticker flow" },
      { id: "chat-audio-call", screen: "chat", state: "chat-audio-call", label: "Audio call", note: "Permissions and secure call lifecycle" },
      { id: "chat-video-call", screen: "chat", state: "chat-video-call", label: "Video call", note: "Camera, microphone and call controls" },
      { id: "chat-settings", screen: "chat", state: "chat-settings", label: "Chat settings", note: "Nickname, theme and message privacy" },
      { id: "chat-options", screen: "chat", state: "chat-options", label: "Chat options", note: "Search, date, settings and safety" },
      { id: "chat-safety", screen: "chat", state: "chat-safety", label: "Chat safety actions", note: "Report, unmatch and block" },
      { id: "chat-relationship-path", screen: "chat", state: "chat-relationship-path", label: "Relationship Path", note: "Date status, feedback and reminders" },
      { id: "chat-date-accepted", screen: "chat", state: "chat-date-accepted", label: "Accepted date", note: "Reminder, complete, cancel and response handling" },
      { id: "chat-date-cancelled", screen: "chat", state: "chat-date-cancelled", label: "Cancelled date", note: "Respectful re-plan state" },
      { id: "chat-date-no-show", screen: "chat", state: "chat-date-no-show", label: "No-show handling", note: "Private safety follow-up and boundary choices" },
      { id: "chat-date-unresponsive", screen: "chat", state: "chat-date-unresponsive", label: "Unresponsive match", note: "Reduced-pressure response window" }
    ]
  },
  {
    label: "Inside Safety",
    screens: [
      { id: "safety-plan", screen: "safety", state: "safety-plan", label: "Share date plan", note: "Trusted-contact plan sharing" },
      { id: "safety-emergency", screen: "safety", state: "safety-emergency", label: "Emergency help", note: "Immediate safety guidance" },
      { id: "safety-privacy", screen: "safety", state: "safety-privacy", label: "Privacy controls", note: "Visibility and location choices" },
      { id: "safety-data", screen: "safety", state: "safety-data", label: "Download my data", note: "Private account export flow" },
      { id: "safety-delete", screen: "safety", state: "safety-delete", label: "Delete account", note: "Permanent deletion confirmation" },
      { id: "match-safety", screen: "detail", state: "match-safety", label: "Match safety actions", note: "Report, unmatch and private block" }
    ]
  }
];

const ALL_SCREENS = SCREEN_GROUPS.flatMap((group) => group.screens);

export default function AllPagesPreview() {
  const [selected, setSelected] = useState("splash");
  const [query, setQuery] = useState("");
  const [viewport, setViewport] = useState("desktop");

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("screen");
    if (requested && ALL_SCREENS.some((screen) => screen.id === requested)) {
      setSelected(requested);
    }
  }, []);

  const filteredGroups = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return SCREEN_GROUPS;
    return SCREEN_GROUPS.map((group) => ({
      ...group,
      screens: group.screens.filter((screen) =>
        `${screen.label} ${screen.note} ${screen.id}`.toLowerCase().includes(normalized)
      )
    })).filter((group) => group.screens.length);
  }, [query]);

  const currentIndex = ALL_SCREENS.findIndex((screen) => screen.id === selected);
  const current = ALL_SCREENS[currentIndex] || ALL_SCREENS[0];
  const experienceParams = new URLSearchParams({
    previewAccess: "1",
    preview: current.screen || current.id,
    v: "deep-pages-latest"
  });
  if (current.state) experienceParams.set("previewState", current.state);
  const experienceUrl = `/actual-app/index.html?${experienceParams.toString()}`;

  function chooseScreen(id) {
    setSelected(id);
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("screen", id);
    window.history.replaceState({}, "", nextUrl);
  }

  function move(offset) {
    const nextIndex = Math.min(ALL_SCREENS.length - 1, Math.max(0, currentIndex + offset));
    chooseScreen(ALL_SCREENS[nextIndex].id);
  }

  return (
    <>
      <Head>
        <title>DestinyOne · All Pages Preview</title>
        <meta name="description" content="Review every DestinyOne screen from onboarding through the complete member journey." />
      </Head>
      <main className="all-pages-preview">
        <aside className="preview-catalog" aria-label="DestinyOne page catalog">
          <div className="preview-brand">
            <span className="preview-brand-mark">D1</span>
            <div><strong>DestinyOne</strong><small>All Pages Preview</small></div>
          </div>
          <p className="preview-intro">Original app UI · {ALL_SCREENS.length} main and inside views</p>
          <label className="preview-search">
            <span className="sr-only">Search pages</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search every page…" />
          </label>
          <nav className="preview-screen-list">
            {filteredGroups.map((group) => (
              <section key={group.label}>
                <h2>{group.label}</h2>
                {group.screens.map((screen) => (
                  <button
                    key={screen.id}
                    type="button"
                    className={selected === screen.id ? "active" : ""}
                    onClick={() => chooseScreen(screen.id)}
                    aria-pressed={selected === screen.id}
                  >
                    <span>{screen.label}<small>{screen.note}</small></span>
                    <b>{ALL_SCREENS.findIndex((item) => item.id === screen.id) + 1}</b>
                  </button>
                ))}
              </section>
            ))}
          </nav>
        </aside>

        <section className="preview-workspace">
          <header className="preview-toolbar">
            <div>
              <p>SCREEN {currentIndex + 1} OF {ALL_SCREENS.length}</p>
              <h1>{current.label}</h1>
              <span>{current.note}</span>
            </div>
            <div className="preview-actions">
              <div className="preview-viewport-toggle" aria-label="Preview width">
                <button type="button" className={viewport === "desktop" ? "active" : ""} onClick={() => setViewport("desktop")}>Desktop</button>
                <button type="button" className={viewport === "mobile" ? "active" : ""} onClick={() => setViewport("mobile")}>Mobile</button>
              </div>
              <a href={experienceUrl} target="_blank" rel="noreferrer">Open interactive view</a>
            </div>
          </header>

          <div className={`preview-frame-wrap ${viewport === "mobile" ? "is-mobile" : ""}`}>
            <iframe
              key={`${selected}-${viewport}`}
              title={`${current.label} preview`}
              src={experienceUrl}
              allow="camera; microphone; geolocation; clipboard-read; clipboard-write"
            />
          </div>

          <footer className="preview-footer">
            <button type="button" onClick={() => move(-1)} disabled={currentIndex === 0}>← Previous</button>
            <span><strong>{current.label}</strong><small>This frame is interactive—tap its cards, icons, inputs and buttons to continue through the real flow.</small></span>
            <button type="button" onClick={() => move(1)} disabled={currentIndex === ALL_SCREENS.length - 1}>Next →</button>
          </footer>
        </section>
      </main>
    </>
  );
}
