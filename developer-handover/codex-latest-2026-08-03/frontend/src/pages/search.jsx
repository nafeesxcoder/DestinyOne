import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Compass,
  Fingerprint,
  Heart,
  HeartHandshake,
  Map,
  MapPinned,
  MessageCircleHeart,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UsersRound,
} from "lucide-react";
import AppShell from "../components/layout/AppShell";

const journey = [
  { label: "Meet", icon: Heart, href: "/matches" },
  { label: "Align", icon: HeartHandshake, href: "/matches" },
  { label: "Talk", icon: MessageCircleHeart, href: "/messages" },
  { label: "Plan", icon: CalendarDays, href: "/dates" },
];

const discoveryTools = [
  { title: "Match preferences", description: "Intent, family, distance and future-plan filters.", icon: SlidersHorizontal, href: "/discovery", tone: "ruby" },
  { title: "Relationship coach", description: "Thoughtful prompts, profile polish and safety-aware support.", icon: Sparkles, href: "/coach", tone: "plum" },
  { title: "Trusted Circle", description: "Private character vouches from people who know you well.", icon: UsersRound, href: "/trusted-circle", tone: "gold" },
  { title: "Relationship readiness", description: "A private check-in for profile clarity, intent and trust.", icon: HeartHandshake, href: "/readiness", tone: "gold" },
  { title: "City community rooms", description: "Small hosted circles for local people and real plans.", icon: MapPinned, href: "/community", tone: "plum" },
  { title: "Relationship Blueprint", description: "Private future essentials, shared only when you choose.", icon: Fingerprint, href: "/blueprint", tone: "gold" },
];

const confidenceTools = [
  { title: "Trust & verification", description: "Selfie, voice, ID and account trust controls.", icon: ShieldCheck, href: "/verification", tone: "ruby" },
  { title: "Two-person date journey", description: "A calm path from first hello to a thoughtful next plan.", icon: Map, href: "/journey", tone: "ruby" },
  { title: "Date Safety Concierge", description: "Private check-ins, trusted contacts and public-first planning.", icon: ShieldCheck, href: "/safety", tone: "plum" },
];

function ToolCard({ tool }) {
  const Icon = tool.icon;
  return (
    <Link className="discover-tool" href={tool.href}>
      <span className={`discover-tool-icon ${tool.tone}`}><Icon size={19} /></span>
      <span className="discover-tool-copy">
        <strong>{tool.title}</strong>
        <small>{tool.description}</small>
      </span>
      <span className="discover-tool-arrow"><ArrowRight size={15} /></span>
    </Link>
  );
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const matchingRelationshipTools = useMemo(
    () => discoveryTools.filter((tool) => `${tool.title} ${tool.description}`.toLowerCase().includes(normalizedQuery)),
    [normalizedQuery]
  );
  const matchingConfidenceTools = useMemo(
    () => confidenceTools.filter((tool) => `${tool.title} ${tool.description}`.toLowerCase().includes(normalizedQuery)),
    [normalizedQuery]
  );
  const noResults = !matchingRelationshipTools.length && !matchingConfidenceTools.length;

  return (
    <AppShell title="Your next step" eyebrow="Discover with intention">
      <div className="discover-stack">
        <section className="discover-hero">
          <div className="discover-hero-copy">
            <p className="eyebrow">Your discovery space</p>
            <h2>Find clarity, not more noise.</h2>
            <p>Meet thoughtfully selected people, understand what matters, and plan the next step at your own pace.</p>
            <div className="discover-hero-actions">
              <Link className="primary-button" href="/matches"><Heart size={17} /> View today&apos;s matches</Link>
              <Link className="secondary-button" href="/discovery"><SlidersHorizontal size={17} /> Refine preferences</Link>
            </div>
          </div>
          <div className="discover-seal"><span className="discover-seal-icon"><Compass size={25} /></span><strong>Private by default</strong><small>Your choices stay yours.</small></div>
        </section>

        <section className="discover-journey" aria-label="Relationship path">
          <div className="discover-section-head">
            <div><span>Relationship path</span><h2>Move at the pace that feels right.</h2></div>
            <small>4 thoughtful stages</small>
          </div>
          <div className="discover-journey-rail">
            {journey.map(({ label, icon: Icon, href }, index) => (
              <div className="discover-journey-part" key={label}>
                <Link href={href}><span><Icon size={16} /></span><strong>{label}</strong></Link>
                {index < journey.length - 1 && <i aria-hidden="true" />}
              </div>
            ))}
          </div>
        </section>

        <section className="discover-feature-grid">
          <Link className="discover-feature executive" href="/executive">
            <span className="discover-feature-icon gold"><BriefcaseBusiness size={23} /></span>
            <span><small>Executive Circle</small><strong>Selective professional introductions.</strong><em>Verified career, values and relationship intent.</em></span>
            <span className="discover-tool-arrow"><ArrowRight size={15} /></span>
          </Link>
          <Link className="discover-feature likes" href="/likes">
            <span className="discover-feature-icon ruby"><Heart size={22} /></span>
            <span><strong>People who chose you</strong><em>Private interest, kept calm and intentional.</em></span>
            <span className="discover-tool-arrow"><ArrowRight size={15} /></span>
          </Link>
        </section>

        <Link className="discover-date-card" href="/dates">
          <span className="discover-feature-icon gold"><CalendarDays size={23} /></span>
          <span><small>Date Concierge</small><strong>A lovely plan, without the busy work.</strong><em>Public-first places, thoughtful packages and local experiences.</em></span>
          <span className="discover-date-arrow"><ArrowRight size={17} /></span>
        </Link>

        <div className="discover-search">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search discovery tools" placeholder="Search preferences, safety, coach or community" />
          {query && <button type="button" onClick={() => setQuery("")}>Clear</button>}
        </div>

        {matchingRelationshipTools.length > 0 && <section className="discover-tools-section">
          <div className="discover-section-head"><div><span>Build a stronger match</span><h2>Tools for clarity and compatibility</h2></div><small>Private by default</small></div>
          <div className="discover-tool-grid">{matchingRelationshipTools.map((tool) => <ToolCard key={tool.title} tool={tool} />)}</div>
        </section>}

        {matchingConfidenceTools.length > 0 && <section className="discover-tools-section">
          <div className="discover-section-head"><div><span>Trust & momentum</span><h2>Move forward with confidence</h2></div><span className="discover-section-icon"><ShieldCheck size={16} /></span></div>
          <div className="discover-tool-grid confidence">{matchingConfidenceTools.map((tool) => <ToolCard key={tool.title} tool={tool} />)}</div>
        </section>}

        {noResults && <section className="discover-empty"><Search size={24} /><strong>No discovery tool matches “{query}”</strong><small>Try words such as safety, coach, city or preferences.</small><button className="secondary-button" type="button" onClick={() => setQuery("")}>Show every tool</button></section>}

        <Link className="discover-chat-card" href="/messages">
          <span className="discover-tool-icon gold"><MessageCircleHeart size={19} /></span>
          <span><strong>Conversation comes first</strong><small>Gifts, GIFs, games and playful extras stay inside Chat, after a mutual connection.</small></span>
          <span>Open chat <ArrowRight size={14} /></span>
        </Link>
        <p className="discover-integrity"><CheckCircle2 size={15} /> Every option above opens a complete developer-format route.</p>
      </div>
    </AppShell>
  );
}
