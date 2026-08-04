import { CheckCircle2, Heart, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import AppShell from "../components/layout/AppShell";
import ResultCard from "../components/search/ResultCard";
import { api } from "../services/api";

const fallbackMatches = [
  { id: 102, firstName: "Anika", age: 29, profession: "Product Designer", city: "New York, NY", intent: "Marriage", matchReason: "93% values aligned", image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=85" },
  { id: 101, firstName: "Maya", age: 30, profession: "Architect", city: "Chicago, IL", intent: "Long-term, leading to marriage", matchReason: "Shared family goals", image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=85" },
];

export default function MatchesPage() {
  const [matches, setMatches] = useState(fallbackMatches);
  const [notice, setNotice] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(true);
  useEffect(() => { api.get("/matches").then(setMatches).catch(() => setNotice("Preview introductions are shown while the API is offline.")); }, []);
  const current = matches[0];
  async function decide(kind) {
    if (!current) return;
    try { await api.post(`/matches/${current.id}/decision`, { kind }); } catch { setNotice("Saved in preview mode."); }
    setMatches((items) => items.slice(1));
  }
  const cards = matches.map((profile) => ({ ...profile, name: `${profile.firstName}, ${profile.age}`, type: profile.matchReason || "Values aligned", meta: `${profile.profession} · ${profile.city}`, detail: profile.intent, href: `/match/${profile.id}` }));
  return (
    <AppShell title="Your thoughtful introductions" eyebrow="Curated daily">
      <div className="content-stack">
        <section className="verified-profile-option">
          <span className="verified-profile-option-icon"><CheckCircle2 size={20} /></span>
          <span className="verified-profile-option-copy">
            <strong>Verified profiles only</strong>
            <small>Frontend option ready. Your developer can connect it to the verified-member API field.</small>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={verifiedOnly}
            aria-label="Verified profiles only"
            className={`verified-profile-switch${verifiedOnly ? " active" : ""}`}
            onClick={() => setVerifiedOnly((value) => !value)}
          >
            <span />
          </button>
        </section>
        <section className="panel"><h2>{current ? "Chosen for your values, not your screen time" : "You reviewed today’s introductions"}</h2><p className="muted">No endless queue. Every decision helps make tomorrow’s introductions more intentional.</p>{notice && <p className="helper-text" role="status">{notice}</p>}{current && <div className="inline-actions"><button className="secondary-button" onClick={() => decide("passed")}><X size={18} /> Pass</button><button className="secondary-button" onClick={() => decide("spark")}><Sparkles size={18} /> Red Rose</button><button className="primary-button" onClick={() => decide("interested")}><Heart size={18} /> Interested</button></div>}</section>
        {cards.map((item) => <ResultCard item={item} key={item.id} />)}
      </div>
    </AppShell>
  );
}
