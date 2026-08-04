import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, CalendarDays, CheckCircle2, Diamond, HeartHandshake, LockKeyhole, ShieldCheck, Sparkles, UserRoundCheck } from "lucide-react";

const metrics = [
  [LockKeyhole, "Membership", "Invite-only circle"],
  [Diamond, "Price point", "$5,000 / year"],
  [HeartHandshake, "Matching style", "Handpicked intros"],
  [ShieldCheck, "Privacy", "Hidden profile mode"],
];

const benefits = [
  [UserRoundCheck, "Private matchmaker review", "Goals, lifestyle, city, family expectations and privacy needs are reviewed before introductions."],
  [HeartHandshake, "Handpicked introductions", "A small, serious set of verified prospects—without endless swiping."],
  [CalendarDays, "VIP date planning", "Curated places, hosted events and optional reservation support."],
  [LockKeyhole, "Executive privacy mode", "Appear only to approved Executive Circle members when you choose."],
];

export default function ExecutiveOverview() {
  return (
    <div className="executive-stack">
      <section className="executive-hero">
        <div className="executive-copy">
          <div className="executive-kicker"><span><BriefcaseBusiness size={23} /></span><div><small>Private · verified · serious</small><em>Introductions with intention.</em></div></div>
          <h2>DestinyOne Executive Circle</h2>
          <p>Invite-only matchmaking for founders, business owners, investors and high-performing professionals who value time, privacy and real commitment.</p>
          <div className="executive-pills"><span><LockKeyhole size={14} /> Discreet</span><span><UserRoundCheck size={14} /> Human-reviewed</span><span><HeartHandshake size={14} /> Marriage-minded</span></div>
          <Link className="primary-button executive-apply" href="/verification"><BriefcaseBusiness size={17} /> Apply for private review <ArrowRight size={17} /></Link>
        </div>
        <aside className="executive-price">
          <span className="executive-price-icon"><Diamond size={25} /></span>
          <small>Annual membership</small>
          <p><strong>$5,000</strong> / year</p>
          <em>Application and private verification required before billing.</em>
          <div className="executive-includes">{["Concierge review", "Handpicked introductions", "Private profile controls"].map((item) => <span key={item}><CheckCircle2 size={17} />{item}</span>)}</div>
        </aside>
      </section>
      <section className="executive-metrics">{metrics.map(([Icon,label,value]) => <article key={label}><span className="profile-action-icon gold"><Icon size={20} /></span><small>{label}</small><strong>{value}</strong></article>)}</section>
      <section className="executive-benefits"><div className="section-header"><div><p className="eyebrow">What members get</p><h2>High-touch support, without the noise.</h2></div><span>4 private benefits</span></div><div>{benefits.map(([Icon,title,body]) => <article key={title}><span className="profile-action-icon"><Icon size={20} /></span><div><h3>{title}</h3><p>{body}</p></div></article>)}</div></section>
      <section className="executive-cta"><span className="profile-action-icon gold"><Sparkles size={21} /></span><div><small>Ready when you are</small><strong>Start with a private application.</strong><p>Every application is reviewed for intent, identity, privacy and profile quality.</p></div><div><Link className="primary-button" href="/verification">Start verification</Link><Link className="secondary-button" href="/membership">View annual pricing</Link></div></section>
    </div>
  );
}
