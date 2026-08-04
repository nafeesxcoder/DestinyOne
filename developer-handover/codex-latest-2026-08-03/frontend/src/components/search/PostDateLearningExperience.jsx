import Link from "next/link";
import { ArrowDown, ArrowUp, BrainCircuit, Check, ChevronRight, EyeOff, HeartHandshake, LockKeyhole, RotateCcw, ShieldCheck } from "lucide-react";
import { useState } from "react";

const outcomes = [
  { id: "continue", title: "Worth exploring", body: "I felt comfortable and would like another date." },
  { id: "pause", title: "I need more time", body: "Keep the connection open without adding pressure." },
  { id: "close", title: "Not aligned", body: "Privately close this path and clarify future preferences." },
];

const facets = [
  { id: "conversation", title: "Conversation ease", body: "The pace and flow felt natural." },
  { id: "intent", title: "Marriage intent", body: "Future goals felt clear and compatible." },
  { id: "emotional_maturity", title: "Emotional maturity", body: "Listening, curiosity and accountability showed up." },
  { id: "lifestyle", title: "Lifestyle rhythm", body: "Daily routines and social energy felt aligned." },
  { id: "chemistry", title: "In-person chemistry", body: "Attraction and warmth felt genuine." },
  { id: "logistics", title: "Location & logistics", body: "Distance, timing and effort felt workable." },
];

export default function PostDateLearningExperience() {
  const [outcome, setOutcome] = useState("");
  const [signals, setSignals] = useState({});
  const [safety, setSafety] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState("Feedback is private and learning is off by default.");

  function setSignal(id, value) {
    setSignals((current) => current[id] === value ? Object.fromEntries(Object.entries(current).filter(([key]) => key !== id)) : { ...current, [id]: value });
    setStatus("Preference signal updated in this frontend preview.");
  }

  function prepareFeedback() {
    if (!outcome) {
      setStatus("Choose a private date outcome before preparing the handoff.");
      return;
    }
    setStatus(consent
      ? `Learning handoff ready with ${Object.keys(signals).length} broad preference ${Object.keys(signals).length === 1 ? "signal" : "signals"}. Backend ranking remains for your developer.`
      : "Private reflection prepared. Matching learning stays off because consent is disabled.");
  }

  function resetFeedback() {
    setOutcome("");
    setSignals({});
    setSafety("");
    setConsent(false);
    setStatus("Frontend feedback reset. No server or matching state was changed.");
  }

  const moreCount = Object.values(signals).filter((value) => value === "more").length;
  const lessCount = Object.values(signals).filter((value) => value === "less").length;

  return (
    <section className="post-date-learning">
      <div className="post-date-learning-hero">
        <span><BrainCircuit size={26} /></span>
        <div><p className="eyebrow">Consent-based learning</p><h2>Let real dates improve future introductions.</h2><p>Learn from broad qualities you choose—not private notes, safety reports or a hidden score assigned to the other person.</p></div>
        <em>Frontend only</em>
      </div>

      <div className="post-date-private"><LockKeyhole size={17} /><span>This reflection is never shown to your date. Matching consent can be revoked or reset.</span></div>

      <div className="post-date-section">
        <div className="post-date-section-head"><div><p className="eyebrow">Step 1</p><h3>How do you feel about the connection?</h3></div><small>Private outcome</small></div>
        <div className="post-date-outcomes" role="radiogroup" aria-label="Private date outcome">{outcomes.map((item) => { const active = outcome === item.id; return <button type="button" role="radio" aria-checked={active} className={active ? "active" : ""} key={item.id} onClick={() => { setOutcome(item.id); setStatus("Private outcome selected in this preview."); }}><span>{active ? <Check size={17} /> : <HeartHandshake size={17} />}</span><strong>{item.title}</strong><small>{item.body}</small></button>; })}</div>
      </div>

      <div className="post-date-section">
        <div className="post-date-section-head"><div><p className="eyebrow">Step 2</p><h3>What should discovery show more or less?</h3><p>Each choice is a broad preference signal, not a judgement about one member.</p></div><small>{moreCount} more · {lessCount} less</small></div>
        <div className="post-date-facet-grid">{facets.map((facet) => { const value = signals[facet.id]; return <article key={facet.id}><div><strong>{facet.title}</strong><small>{facet.body}</small></div><div><button type="button" aria-pressed={value === "more"} className={value === "more" ? "more active" : "more"} onClick={() => setSignal(facet.id, "more")}><ArrowUp size={14} /> More</button><button type="button" aria-pressed={value === "less"} className={value === "less" ? "less active" : "less"} onClick={() => setSignal(facet.id, "less")}><ArrowDown size={14} /> Less</button></div></article>; })}</div>
      </div>

      <div className="post-date-safety">
        <span><ShieldCheck size={21} /></span>
        <div><strong>Did you feel safe and respected?</strong><small>This answer belongs to safety operations and must never become a “type” or attraction signal.</small></div>
        <div role="radiogroup" aria-label="Date safety feeling">{["Yes", "Unsure", "No"].map((value) => <button type="button" role="radio" aria-checked={safety === value.toLowerCase()} className={safety === value.toLowerCase() ? "active" : ""} key={value} onClick={() => setSafety(value.toLowerCase())}>{value}</button>)}</div>
      </div>

      <label className={`post-date-consent${consent ? " active" : ""}`}>
        <span><BrainCircuit size={21} /></span>
        <span><strong>Use selected signals for future matching</strong><small>{consent ? "Consent on. Only the broad More/Less signals enter the developer handoff." : "Off by default. The reflection stays private and does not affect ranking."}</small></span>
        <button type="button" role="switch" aria-checked={consent} aria-label="Use feedback for matching" className={consent ? "active" : ""} onClick={() => { setConsent((value) => !value); setStatus("Matching-learning consent updated in this frontend preview."); }}><i /></button>
      </label>

      <div className="post-date-boundaries">
        <article><EyeOff size={18} /><div><strong>Never shared</strong><small>Your date cannot see your outcome, safety answer or preference directions.</small></div></article>
        <article><ShieldCheck size={18} /><div><strong>Never used for attraction</strong><small>Safety reports, protected traits and private free-text notes stay outside ranking.</small></div></article>
        <article><RotateCcw size={18} /><div><strong>Resettable</strong><small>Members must be able to revoke consent and clear learned signals.</small></div></article>
      </div>

      <div className="post-date-handoff" aria-live="polite"><BrainCircuit size={19} /><div><strong>{status}</strong><small>Developer fields: date outcome, broad signal directions, explicit consent, safety routing, model version and reset timestamp.</small></div><button type="button" onClick={prepareFeedback}>Prepare feedback</button></div>
      <div className="post-date-actions"><button type="button" className="secondary-button" onClick={resetFeedback}><RotateCcw size={15} /> Reset preview</button><Link className="primary-button" href="/matches">View future introductions <ChevronRight size={16} /></Link></div>
    </section>
  );
}
