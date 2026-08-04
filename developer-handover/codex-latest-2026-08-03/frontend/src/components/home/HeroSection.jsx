import { ArrowRight, ShieldCheck } from "lucide-react";

export default function HeroSection() {
  return (
    <section className="intro-card">
      <div className="intro-count" aria-label="Five introductions curated today">
        <strong>5</strong>
        <span>curated<br />today</span>
      </div>
      <div className="intro-copy">
        <p className="eyebrow">Curated for your future</p>
        <h2>Chosen around what matters to you.</h2>
        <p>Five thoughtful introductions. Clear intent before chemistry, with room for a real conversation.</p>
        <div className="intro-tags">
          <span><ShieldCheck size={16} /> Verified</span>
          <span>Long-term</span>
          <span>25-35</span>
        </div>
      </div>
      <a className="text-link" href="#top-match">See today&apos;s match <ArrowRight size={17} /></a>
    </section>
  );
}
