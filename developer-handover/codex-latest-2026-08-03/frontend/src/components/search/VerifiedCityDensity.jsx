import Link from "next/link";
import { Cable, Check, ChevronRight, EyeOff, HeartHandshake, MapPinned, Scale, Search, ShieldCheck, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";

const suggestedCities = ["Fresno, CA", "New York, NY", "Toronto, ON", "Dallas, TX", "San Francisco, CA", "Los Angeles, CA", "Chicago, IL", "Vancouver, BC"];

const densitySignals = [
  { title: "Verified active members", body: "Count only verified members who were recently active.", icon: ShieldCheck },
  { title: "Reciprocal candidates", body: "Measure mutual age, intent, gender, distance and dealbreaker fit.", icon: Scale },
  { title: "Privacy-safe cohorts", body: "Hide small segments instead of exposing identifiable counts.", icon: EyeOff },
  { title: "Healthy outcomes", body: "Replies, meaningful conversations, accepted dates and safety matter.", icon: HeartHandshake },
];

const reachOptions = [
  { id: "city", title: "City only", body: "Keep my location boundary strict." },
  { id: "metro", title: "Nearby metro", body: "Use a wider named area when city supply is low." },
  { id: "waitlist", title: "Waitlist until balanced", body: "Hold introductions until reciprocal supply is healthy." },
];

export default function VerifiedCityDensity() {
  const [query, setQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("Fresno, CA");
  const [reachMode, setReachMode] = useState("city");
  const [notifyWhenReady, setNotifyWhenReady] = useState(true);
  const [status, setStatus] = useState("Live verified-member density is waiting for your developer’s API connection.");
  const filteredCities = useMemo(() => suggestedCities.filter((city) => city.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 6), [query]);

  function chooseCity(city) {
    setSelectedCity(city);
    setQuery("");
    setStatus(`${city} selected in the frontend. No member count has been estimated or fabricated.`);
  }

  function submitCity(event) {
    event.preventDefault();
    const city = query.trim();
    if (city) chooseCity(city);
  }

  return (
    <div className="verified-density-stack">
      <section className="verified-density-hero">
        <span className="verified-density-hero-icon"><UsersRound size={27} /></span>
        <div><p className="eyebrow">One city at a time</p><h2>Healthy density before endless discovery.</h2><p>DestinyOne should open a city only when verified members have enough reciprocal, privacy-safe choices for thoughtful introductions.</p></div>
        <span className="verified-density-api"><i /> API pending</span>
      </section>

      <section className="verified-density-search-panel">
        <div><p className="eyebrow">Your city</p><h2>{selectedCity}</h2><p>Search any USA or Canada city. Live availability will come from the backend, not a static frontend number.</p></div>
        <form className="verified-density-search" onSubmit={submitCity}>
          <Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search city" placeholder="Search Fresno, Toronto or any city" /><button type="submit">Use city</button>
        </form>
        {query && <div className="verified-density-suggestions">{filteredCities.map((city) => <button type="button" key={city} onClick={() => chooseCity(city)}><MapPinned size={15} /> {city}</button>)}{!filteredCities.length && <button type="button" onClick={() => chooseCity(query.trim())}><MapPinned size={15} /> Use “{query.trim()}”</button>}</div>}
      </section>

      <section className="verified-density-card">
        <div className="verified-density-card-head"><span><ShieldCheck size={23} /></span><div><p className="eyebrow">Verified user density</p><h2>{selectedCity}</h2><p>Real values remain hidden until authenticated, privacy-suppressed city metrics are connected.</p></div><strong>Live data required</strong></div>
        <div className="verified-density-signal-grid">{densitySignals.map(({ title, body, icon: Icon }) => <article key={title}><span><Icon size={18} /></span><div><strong>{title}</strong><small>{body}</small></div><em>API</em></article>)}</div>
        <div className="verified-density-empty"><Cable size={20} /><div><strong>No fake density score</strong><small>Your developer will supply verified-active count, reciprocal pool size, cohort suppression state and launch status.</small></div></div>
      </section>

      <section className="verified-density-reach">
        <div><p className="eyebrow">If {selectedCity} is not ready</p><h2>Choose your boundary.</h2><p>This preference works in the frontend now; the matching API will enforce it later.</p></div>
        <div className="verified-density-reach-grid" role="radiogroup" aria-label="City density fallback">{reachOptions.map((option) => { const active = reachMode === option.id; return <button type="button" role="radio" aria-checked={active} className={active ? "active" : ""} key={option.id} onClick={() => { setReachMode(option.id); setStatus(`${option.title} selected. Backend enforcement remains pending.`); }}><span>{active ? <Check size={16} /> : <MapPinned size={16} />}</span><strong>{option.title}</strong><small>{option.body}</small></button>; })}</div>
        <label className="verified-density-notify"><span><strong>Tell me when this city is balanced</strong><small>Frontend preference only until notifications and waitlist storage are connected.</small></span><button type="button" role="switch" aria-checked={notifyWhenReady} className={notifyWhenReady ? "active" : ""} onClick={() => setNotifyWhenReady((value) => !value)}><i /></button></label>
      </section>

      <section className="verified-density-handoff" aria-live="polite"><Cable size={19} /><div><strong>{status}</strong><small>Handoff fields: city, reach mode, notification consent, verified-active supply, reciprocal pool, privacy threshold and launch state.</small></div><button type="button" onClick={() => setStatus(`Developer handoff prepared for ${selectedCity}: ${reachMode} mode, notifications ${notifyWhenReady ? "on" : "off"}.`)}>Prepare handoff</button></section>

      <div className="verified-density-actions"><Link className="primary-button" href="/matches">View introductions <ChevronRight size={16} /></Link><Link className="secondary-button" href="/profile">Review my city</Link></div>
    </div>
  );
}
