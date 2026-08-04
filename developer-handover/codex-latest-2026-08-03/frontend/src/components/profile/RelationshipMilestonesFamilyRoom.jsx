import Link from "next/link";
import {
  CalendarDays,
  Check,
  ChevronRight,
  EyeOff,
  Flag,
  HeartHandshake,
  Home,
  LockKeyhole,
  MessageCircle,
  PartyPopper,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRoundPlus,
  UsersRound,
} from "lucide-react";
import { useMemo, useState } from "react";

const milestones = [
  { id: "match", title: "A mutual hello", body: "Both people choose to begin the relationship path.", icon: HeartHandshake },
  { id: "talk", title: "Find your rhythm", body: "Move beyond small talk with shared values and curiosity.", icon: MessageCircle, href: "/messages" },
  { id: "plan", title: "Plan a public first date", body: "Choose a safe place and confirm a plan together.", icon: CalendarDays, href: "/dates" },
  { id: "reflect", title: "Check in with yourself", body: "Keep a private reflection before deciding the next step.", icon: Sparkles },
  { id: "exclusive", title: "Define the relationship", body: "Record that the conversation happened—never change status automatically.", icon: LockKeyhole },
  { id: "family", title: "Meet the people who matter", body: "Introduce family or chosen family only after mutual consent.", icon: UsersRound },
  { id: "future", title: "Build shared future plans", body: "Discuss home, family, money and marriage pace privately.", icon: Home },
];

const shareOptions = [
  { id: "milestones", title: "Selected milestone updates", body: "Only moments both partners choose to share.", icon: Flag },
  { id: "celebrations", title: "Celebrations & announcements", body: "Birthdays, engagement news or chosen moments.", icon: PartyPopper },
  { id: "events", title: "Family event plans", body: "Dinner, ceremony or gathering details.", icon: CalendarDays },
];

const neverVisible = [
  "Matches, likes or passes",
  "Private chat or calls",
  "Exact or live location",
  "Safety reports and blocks",
  "Marriage Blueprint answers",
  "Strict dealbreakers",
];

const roles = ["Parent / guardian", "Sibling", "Relative", "Chosen family"];

export default function RelationshipMilestonesFamilyRoom() {
  const [completed, setCompleted] = useState(["match"]);
  const [familyOpen, setFamilyOpen] = useState(false);
  const [myConsent, setMyConsent] = useState(false);
  const [shares, setShares] = useState(["milestones"]);
  const [name, setName] = useState("");
  const [role, setRole] = useState(roles[0]);
  const [drafts, setDrafts] = useState([]);
  const [status, setStatus] = useState("Family Room is optional and off by default. Nothing has been shared.");

  const progress = useMemo(() => Math.round((completed.length / milestones.length) * 100), [completed]);

  function toggleMilestone(id) {
    setCompleted((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
    setStatus("Milestone updated locally. Mutual confirmation remains for your developer to connect.");
  }

  function toggleShare(id) {
    setShares((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
    setStatus("Family visibility preference updated in this frontend preview.");
  }

  function addDraft() {
    const cleanName = name.trim();
    if (!cleanName) {
      setStatus("Add a trusted person’s name before preparing an invitation draft.");
      return;
    }
    if (!myConsent) {
      setStatus("Approve your side first. Your partner must also approve in production.");
      return;
    }
    setDrafts((current) => [...current, { id: `${Date.now()}-${cleanName}`, name: cleanName, role }]);
    setName("");
    setStatus(`${cleanName} was added as a local draft. No invitation or notification was sent.`);
  }

  return (
    <section className="relationship-family-room">
      <section className="relationship-milestone-hero">
        <span><HeartHandshake size={26} /></span>
        <div><p className="eyebrow">Mutual relationship milestones</p><h2>A private path from first hello to shared plans.</h2><p>Seven calm checkpoints support clarity and consent. They are not public achievements, pressure timers or automatic relationship-status changes.</p></div>
        <div className="relationship-milestone-score"><strong>{progress}%</strong><small>{completed.length} of {milestones.length} complete</small></div>
      </section>

      <div className="relationship-milestone-progress" aria-label={`${completed.length} of ${milestones.length} milestones complete`}><span style={{ width: `${progress}%` }} /></div>

      <div className="relationship-milestone-list">
        {milestones.map((milestone, index) => {
          const complete = completed.includes(milestone.id);
          const Icon = milestone.icon;
          return (
            <article className={`relationship-milestone${complete ? " complete" : ""}`} key={milestone.id}>
              <div className="relationship-milestone-marker"><span>{complete ? <Check size={17} /> : <Icon size={17} />}</span>{index < milestones.length - 1 && <i />}</div>
              <div className="relationship-milestone-copy"><small>Moment {String(index + 1).padStart(2, "0")}</small><h3>{milestone.title}</h3><p>{milestone.body}</p><div>{milestone.href && <Link href={milestone.href}>Open tool <ChevronRight size={14} /></Link>}<button type="button" aria-pressed={complete} onClick={() => toggleMilestone(milestone.id)}>{complete ? "Completed" : "Mark discussed"}</button></div></div>
            </article>
          );
        })}
      </div>

      <section className="family-room-entry">
        <span><UsersRound size={24} /></span>
        <div><p className="eyebrow">Optional Family Room</p><h2>Bring in trusted people—only when you both choose.</h2><p>An invite-only space for selected milestones, celebrations and family event plans. Dating activity always stays private.</p></div>
        <button type="button" role="switch" aria-checked={familyOpen} aria-label="Optional Family Room" className={`family-room-switch${familyOpen ? " active" : ""}`} onClick={() => { setFamilyOpen((value) => !value); setStatus(familyOpen ? "Family Room closed. No local invitation drafts were sent." : "Family Room setup opened. Nothing has been shared."); }}><i /></button>
      </section>

      {familyOpen && (
        <section className="family-room-panel">
          <div className="family-room-consent">
            <span><LockKeyhole size={21} /></span>
            <div><strong>Two-person approval required</strong><small>You can approve your side here. Your partner must approve independently before sharing or invitations become active.</small></div>
            <button type="button" aria-pressed={myConsent} className={myConsent ? "active" : ""} onClick={() => { setMyConsent((value) => !value); setStatus(myConsent ? "Your local approval was removed." : "Your side is approved in this preview. Partner approval is still pending."); }}>{myConsent ? <Check size={15} /> : <LockKeyhole size={14} />}{myConsent ? "You approved" : "Approve my side"}</button>
          </div>

          <div className="family-room-section-head"><div><p className="eyebrow">Controlled visibility</p><h3>What family may see</h3></div><small>{shares.length} selected</small></div>
          <div className="family-room-share-grid">
            {shareOptions.map((option) => {
              const active = shares.includes(option.id);
              const Icon = option.icon;
              return <button type="button" role="checkbox" aria-checked={active} className={active ? "active" : ""} key={option.id} onClick={() => toggleShare(option.id)}><span>{active ? <Check size={16} /> : <Icon size={17} />}</span><strong>{option.title}</strong><small>{option.body}</small></button>;
            })}
          </div>

          <div className="family-room-section-head"><div><p className="eyebrow">Invitation drafts</p><h3>Prepare a trusted-person invite</h3></div><small>No invite is sent</small></div>
          <div className="family-room-invite-builder">
            <label><span>Trusted person’s name</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Enter a name" /></label>
            <div className="family-room-role-row" role="radiogroup" aria-label="Trusted person role">{roles.map((item) => <button type="button" role="radio" aria-checked={role === item} className={role === item ? "active" : ""} key={item} onClick={() => setRole(item)}>{role === item && <Check size={13} />}{item}</button>)}</div>
            <button type="button" className="family-room-add" onClick={addDraft}><UserRoundPlus size={16} /> Add invitation draft</button>
          </div>

          {drafts.length > 0 && <div className="family-room-drafts">{drafts.map((draft) => <article key={draft.id}><span>{draft.name.charAt(0).toUpperCase()}</span><div><strong>{draft.name}</strong><small>{draft.role} · draft only</small></div><button type="button" aria-label={`Remove ${draft.name}`} onClick={() => setDrafts((current) => current.filter((item) => item.id !== draft.id))}><Trash2 size={16} /></button></article>)}</div>}

          <div className="family-room-never">
            <div><EyeOff size={19} /><span><strong>Never visible in Family Room</strong><small>These privacy boundaries cannot be selected above.</small></span></div>
            <div>{neverVisible.map((item) => <span key={item}><ShieldCheck size={14} /> {item}</span>)}</div>
          </div>

          <div className="family-room-status" aria-live="polite"><UsersRound size={19} /><div><strong>{status}</strong><small>Frontend only: mutual-consent records, invite tokens, roles, revocation, audit history and notifications remain for your developer.</small></div><button type="button" onClick={() => setStatus("Family Room handoff prepared: visibility choices, local consent and invitation drafts are ready for backend mapping.")}><Plus size={15} /> Prepare handoff</button></div>
        </section>
      )}

      <div className="relationship-family-actions"><Link className="primary-button" href="/messages">Continue conversation <ChevronRight size={16} /></Link><Link className="secondary-button" href="/safety">Review date safety</Link></div>
    </section>
  );
}
