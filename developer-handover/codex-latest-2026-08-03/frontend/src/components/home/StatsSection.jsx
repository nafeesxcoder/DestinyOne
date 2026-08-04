import { Fingerprint, HeartHandshake, ShieldCheck } from "lucide-react";

const stats = [
  { icon: ShieldCheck, value: "Verified", label: "Real profiles and accountable intent" },
  { icon: Fingerprint, value: "Private", label: "Your choices remain yours" },
  { icon: HeartHandshake, value: "Curated", label: "Quality over endless swiping" }
];

export default function StatsSection() {
  return (
    <section className="stat-grid" aria-label="DestinyOne standards">
      {stats.map(({ icon: Icon, value, label }) => (
        <article className="stat-item" key={value}>
          <span className="soft-icon"><Icon size={20} /></span>
          <div><strong>{value}</strong><p>{label}</p></div>
        </article>
      ))}
    </section>
  );
}
