import AppShell from "../components/layout/AppShell";
import ProfileSummary from "../components/profile/ProfileSummary";
import ProfileActionCard from "../components/profile/ProfileActionCard";
import Link from "next/link";
import { BriefcaseBusiness, CalendarDays, Gift, HelpCircle, LockKeyhole, Mic2, Settings2, ShieldCheck, SlidersHorizontal, Sparkles, UserRoundPen } from "lucide-react";

const profileActions = [
  { href: "/onboarding", icon: UserRoundPen, title: "Edit profile", description: "Photos and personal details" },
  { href: "/discovery", icon: SlidersHorizontal, title: "Preferences", description: "Intent and match filters" },
  { href: "/verification", icon: ShieldCheck, title: "Trust hub", description: "Verification and vouches", tone: "gold" },
  { href: "/safety", icon: LockKeyhole, title: "Safety", description: "Privacy and support", tone: "gold" },
];

const experienceActions = [
  { href: "/coach", icon: Sparkles, title: "Relationship Coach", description: "Thoughtful guidance" },
  { href: "/dates", icon: CalendarDays, title: "Dates & Events", description: "Plan something real" },
  { href: "/executive", icon: BriefcaseBusiness, title: "Executive Circle", description: "Career-minded members", tone: "gold" },
  { href: "/support", icon: HelpCircle, title: "Help", description: "Private assistance" },
];

export default function ProfilePage() {
  return (
    <AppShell title="Your profile" eyebrow="Your DestinyOne" actions={<Link className="icon-button" href="/profile/settings" aria-label="Open account settings"><Settings2 size={20} /></Link>}>
      <p className="page-subtitle">Manage how you show up, what you share and where you go next.</p>
      <div className="content-stack profile-page-stack">
        <ProfileSummary />
        <article className="profile-readiness-card">
          <div className="profile-readiness-head"><div><p className="eyebrow">Profile readiness</p><h2>Make every impression count.</h2><p className="muted">Complete these essentials to build trust before the first conversation.</p></div><strong>82%</strong></div>
          <div className="profile-readiness-grid">
            <div><span className="profile-action-icon ruby"><UserRoundPen size={20} /></span><strong>Photos feel real</strong><small>Add two more everyday photos.</small></div>
            <div><span className="profile-action-icon gold"><ShieldCheck size={20} /></span><strong>Verified trust badge</strong><small>Your verification is active.</small></div>
            <div><span className="profile-action-icon ruby"><Mic2 size={20} /></span><strong>Voice introduction</strong><small>Add a warm 10-second hello.</small></div>
          </div>
          <Link className="secondary-button" href="/verification"><ShieldCheck size={16} /> Open Trust Hub</Link>
        </article>
        <Link className="profile-membership-card" href="/membership"><span className="profile-action-icon ruby"><Gift size={21} /></span><span><small>DestinyOne membership</small><strong>More thoughtful possibilities.</strong><em>Premium introductions, filters and relationship tools.</em></span><Settings2 size={19} /></Link>
        <section className="profile-action-section"><div className="section-header"><div><p className="eyebrow">Profile & privacy</p><h2>Manage your presence</h2></div></div><div className="profile-action-grid">{profileActions.map((action) => <ProfileActionCard {...action} key={action.title} />)}</div></section>
        <section className="profile-action-section"><div className="section-header"><div><p className="eyebrow">Your DestinyOne</p><h2>Explore your tools</h2></div></div><div className="profile-action-grid">{experienceActions.map((action) => <ProfileActionCard {...action} key={action.title} />)}</div></section>
      </div>
    </AppShell>
  );
}
