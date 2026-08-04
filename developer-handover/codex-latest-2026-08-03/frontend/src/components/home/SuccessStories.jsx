import Link from "next/link";
import { Heart, MapPin } from "lucide-react";
import SectionHeader from "../common/SectionHeader";

export default function SuccessStories() {
  return (
    <section id="top-match">
      <SectionHeader eyebrow="Your top match" title="A thoughtful introduction" action={<Link className="text-link" href="/matches">View full story</Link>} />
      <article className="match-card">
        <img src="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1400&q=85" alt="Maya smiling outdoors" />
        <div className="match-shade" />
        <span className="match-badge">Strong match</span>
        <div className="match-content">
          <h3>Maya, 30</h3>
          <p><MapPin size={16} /> Chicago, IL</p>
          <div className="match-traits"><span>Family first</span><span>Creative</span><span>Ambitious</span></div>
          <div className="match-actions">
            <button className="pass-button">Pass</button>
            <button className="like-button"><Heart size={20} fill="currentColor" /> Interested</button>
          </div>
        </div>
      </article>
    </section>
  );
}
