import { Eye, Images, Pencil, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";

export default function ProfileSummary() {
  return (
    <article className="profile-card profile-hero profile-hero-premium">
      <div className="profile-identity">
        <img className="profile-photo" src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=85" alt="Shivay profile" />
        <div>
          <p className="eyebrow">Your DestinyOne profile</p>
          <h2>Shivay, 29</h2>
          <p className="muted">Founder · California</p>
          <span className="pill"><ShieldCheck size={15} /> Verified intent</span>
        </div>
      </div>
      <Link className="primary-button profile-edit-button" href="/onboarding"><Pencil size={16} /> Edit profile</Link>
      <div className="profile-metrics" aria-label="Profile overview">
        <div><Images size={17} /><strong>1 / 3</strong><span>Photos</span></div>
        <div><Sparkles size={17} /><strong>82%</strong><span>Strength</span></div>
        <div><Eye size={17} /><strong>Visible</strong><span>Activity</span></div>
      </div>
      <div className="profile-progress" role="progressbar" aria-label="Profile completion" aria-valuemin="0" aria-valuemax="100" aria-valuenow="82" aria-valuetext="82 percent complete"><span style={{ width: "82%" }} /></div>
    </article>
  );
}
