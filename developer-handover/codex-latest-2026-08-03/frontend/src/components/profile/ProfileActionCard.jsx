import Link from "next/link";
import { ChevronRight } from "lucide-react";

export default function ProfileActionCard({ href, icon: Icon, title, description, tone = "ruby" }) {
  return (
    <Link className="profile-action-card" href={href} aria-label={`${title}: ${description}`}>
      <span className={`profile-action-icon ${tone}`}><Icon size={21} /></span>
      <span className="profile-action-copy"><strong>{title}</strong><small>{description}</small></span>
      <span className="profile-action-arrow"><ChevronRight size={18} /></span>
    </Link>
  );
}
