import Link from "next/link";
import { Check, Crown } from "lucide-react";
import SectionHeader from "../common/SectionHeader";

export default function PremiumPlans() {
  return (
    <section>
      <SectionHeader eyebrow="Membership" title="More thoughtful possibilities" />
      <article className="plan-card">
        <span className="gold-icon"><Crown size={23} /></span>
        <div><h3>DestinyOne Select</h3><p>More filters, private visibility controls, and priority introductions.</p></div>
        <ul><li><Check size={16} /> Intent filters</li><li><Check size={16} /> Profile insights</li><li><Check size={16} /> Date concierge</li></ul>
        <Link className="primary-button" href="/membership">View plans</Link>
      </article>
    </section>
  );
}
