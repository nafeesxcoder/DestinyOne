import Link from "next/link";
import { Check, ChevronRight, Fingerprint, LockKeyhole, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";

const sections = [
  {
    id: "commitment",
    label: "Commitment",
    body: "Define the pace, structure and clarity you need.",
    questions: [
      { id: "marriage_timeline", label: "Marriage timeline", prompt: "What marriage pace feels intentional to you?", options: ["Within 1–2 years", "Within 2–3 years", "When the relationship feels ready"] },
      { id: "relationship_structure", label: "Relationship structure", prompt: "What kind of commitment are you building toward?", options: ["Exclusive and monogamous", "Exclusive after a clear conversation", "Discuss together before defining it"] },
      { id: "future_conversations", label: "Future conversations", prompt: "When should the bigger life questions come up?", options: ["Early and honestly", "After a few meaningful dates", "Once trust feels established"] },
    ],
  },
  {
    id: "family",
    label: "Family",
    body: "Be honest about children, relatives and care responsibilities.",
    questions: [
      { id: "children", label: "Children", prompt: "How do children fit into your future?", options: ["Definitely want children", "Open to children", "Do not want children"] },
      { id: "family_involvement", label: "Family involvement", prompt: "How present should family be in your marriage?", options: ["Close and actively involved", "Close, with healthy boundaries", "Mostly independent as a couple"] },
      { id: "caregiving", label: "Care responsibilities", prompt: "How should long-term family care be handled?", options: ["Shared responsibility", "Plan around each family’s needs", "Discuss if and when it arises"] },
    ],
  },
  {
    id: "life",
    label: "Life & values",
    body: "Align the everyday life behind the wedding day.",
    questions: [
      { id: "future_home", label: "Future home", prompt: "How flexible are you about where life happens?", options: ["Open to relocating", "Prefer my current region", "Depends on career and family"] },
      { id: "faith_culture", label: "Faith & culture", prompt: "What role should faith or culture have at home?", options: ["Central to our home", "Important, with flexibility", "Personal and individually chosen"] },
      { id: "daily_life", label: "Everyday rhythm", prompt: "What kind of shared life feels most natural?", options: ["Home-centred and calm", "Social and community-oriented", "A balance of both"] },
    ],
  },
  {
    id: "partnership",
    label: "Partnership",
    body: "Set expectations for work, money and healthy repair.",
    questions: [
      { id: "career", label: "Career & ambition", prompt: "How should two careers fit into one marriage?", options: ["Both careers supported equally", "Take turns through life stages", "Prioritize stability over advancement"] },
      { id: "money", label: "Money style", prompt: "What financial partnership feels healthiest?", options: ["Mostly shared with transparency", "Shared goals plus personal accounts", "Keep finances mostly separate"] },
      { id: "conflict", label: "Conflict & repair", prompt: "What should happen when something feels wrong?", options: ["Talk calmly within a day", "Take space, then reconnect", "Use counselling when we feel stuck"] },
    ],
  },
];

const dealbreakerOptions = [
  ["intent", "Marriage intent mismatch", "Exclude people who are unsure about a marriage-minded relationship."],
  ["children", "Children-plan conflict", "Treat incompatible plans about children as a hard boundary."],
  ["dishonesty", "Dishonesty or hidden relationships", "No tolerance for material lies, secret partners or identity deception."],
  ["respect", "Controlling or disrespectful behaviour", "Exclude pressure, humiliation, threats or repeated boundary violations."],
  ["smoking", "Smoking or recreational drugs", "Use substance lifestyle preferences as a strict matching boundary."],
  ["addiction", "Unmanaged substance misuse", "Require honesty, recovery responsibility and a safe relationship environment."],
  ["money", "Financial deception or gambling", "Exclude hidden debt, financial manipulation or uncontrolled gambling."],
  ["repair", "Refuses communication or repair", "Require willingness to discuss conflict, take accountability and reconnect."],
];

export default function MarriageBlueprintExperience() {
  const [activeSection, setActiveSection] = useState(sections[0].id);
  const [answers, setAnswers] = useState({});
  const [strictEnabled, setStrictEnabled] = useState(true);
  const [dealbreakers, setDealbreakers] = useState([]);
  const [status, setStatus] = useState("Nothing is shared automatically.");
  const questions = useMemo(() => sections.flatMap((section) => section.questions), []);
  const currentSection = sections.find((section) => section.id === activeSection) || sections[0];
  const completed = Object.keys(answers).length;

  function choose(questionId, option) {
    setAnswers((current) => ({ ...current, [questionId]: option }));
    setStatus("Choice updated privately in this frontend preview.");
  }

  function toggleDealbreaker(id) {
    setDealbreakers((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
    setStatus("Strict boundary updated. Server-side exclusion remains for your developer to connect.");
  }

  return (
    <div className="marriage-blueprint-stack">
      <section className="marriage-blueprint-hero">
        <span className="marriage-blueprint-seal"><Fingerprint size={25} /></span>
        <div><p className="eyebrow">Private by default</p><h2>Build the life behind “I do.”</h2><p>Twelve thoughtful choices cover commitment, family, daily life and partnership—without reducing a person to a score.</p></div>
        <div className="marriage-blueprint-progress"><strong>{completed}/12</strong><span>answered</span></div>
      </section>

      <section className="marriage-private-note"><LockKeyhole size={18} /><span>Your answers stay private. Shared views show conversation themes, never private answers or a compatibility percentage.</span></section>

      <div className="marriage-progress-track" aria-label={`${completed} of 12 questions answered`}><span style={{ width: `${(completed / questions.length) * 100}%` }} /></div>

      <div className="marriage-section-tabs" role="tablist" aria-label="Marriage Blueprint sections">
        {sections.map((section) => {
          const count = section.questions.filter((question) => answers[question.id]).length;
          const active = currentSection.id === section.id;
          return <button key={section.id} type="button" role="tab" aria-selected={active} className={active ? "active" : ""} onClick={() => setActiveSection(section.id)}><span>{section.label}</span><small>{count}/3</small></button>;
        })}
      </div>

      <section className="marriage-question-section">
        <div className="marriage-section-heading"><div><p className="eyebrow">Part {String(sections.indexOf(currentSection) + 1).padStart(2, "0")}</p><h2>{currentSection.label}</h2><p>{currentSection.body}</p></div><span>{currentSection.questions.filter((question) => answers[question.id]).length}/3</span></div>
        <div className="marriage-question-grid">
          {currentSection.questions.map((question) => {
            const number = questions.findIndex((item) => item.id === question.id) + 1;
            return <article className="marriage-question-card" key={question.id}><small>{String(number).padStart(2, "0")} · {question.label}</small><h3>{question.prompt}</h3><div role="radiogroup" aria-label={question.prompt}>{question.options.map((option) => { const selected = answers[question.id] === option; return <button type="button" role="radio" aria-checked={selected} className={selected ? "selected" : ""} key={option} onClick={() => choose(question.id, option)}><span>{option}</span>{selected && <Check size={16} />}</button>; })}</div></article>;
          })}
        </div>
      </section>

      <section className="strict-dealbreakers">
        <div className="strict-dealbreakers-head">
          <span className="strict-dealbreakers-icon"><ShieldCheck size={23} /></span>
          <div><p className="eyebrow">Strict dealbreakers</p><h2>Hard boundaries, chosen by you.</h2><p>Selected conflicts should be excluded by the matching backend—not quietly ranked lower.</p></div>
          <button type="button" role="switch" aria-checked={strictEnabled} aria-label="Strict dealbreakers" className={`strict-dealbreakers-switch${strictEnabled ? " active" : ""}`} onClick={() => setStrictEnabled((value) => !value)}><span /></button>
        </div>
        <div className={`strict-dealbreaker-grid${strictEnabled ? "" : " disabled"}`}>
          {dealbreakerOptions.map(([id, title, body]) => { const selected = dealbreakers.includes(id); return <button disabled={!strictEnabled} type="button" role="checkbox" aria-checked={selected} className={selected ? "selected" : ""} key={id} onClick={() => toggleDealbreaker(id)}><span className="strict-dealbreaker-check">{selected ? <Check size={15} /> : "+"}</span><span><strong>{title}</strong><small>{body}</small></span></button>; })}
        </div>
        <p className="strict-developer-note"><ShieldCheck size={15} /> {strictEnabled ? `${dealbreakers.length} strict ${dealbreakers.length === 1 ? "boundary" : "boundaries"} selected. Frontend only—storage and matching enforcement remain for your developer.` : "Strict enforcement is paused; your current selections remain visible in this preview."}</p>
      </section>

      <section className="marriage-blueprint-handoff" aria-live="polite"><div><strong>{status}</strong><small>API, database and server filtering were intentionally not added.</small></div><button type="button" onClick={() => setStatus("Frontend handoff is ready for your developer: 12 answer fields, strict-mode state and 8 dealbreaker IDs.")}>Prepare handoff</button></section>

      <div className="marriage-blueprint-actions"><Link className="primary-button" href="/journey">Review relationship journey <ChevronRight size={16} /></Link><Link className="secondary-button" href="/discovery">Adjust discovery</Link></div>
    </div>
  );
}
