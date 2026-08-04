import Link from "next/link";
import { Fingerprint, Pencil, ShieldCheck } from "lucide-react";

const passportFields = [
  { label: "Commitment", value: "Long-term, leading to Marriage" },
  { label: "Marriage pace", value: "Within 1–2 years" },
  { label: "Children", value: "Open to children" },
];

export default function IntentPassportCard() {
  return (
    <section className="home-intent-passport" aria-labelledby="intent-passport-title">
      <span className="home-passport-accent" aria-hidden="true" />
      <header className="home-passport-header">
        <span className="home-passport-icon"><Fingerprint size={21} /></span>
        <span className="home-passport-heading">
          <small>My Intent Passport</small>
          <strong id="intent-passport-title">Your future essentials are clear</strong>
        </span>
        <Link className="home-passport-edit" href="/blueprint" aria-label="Edit Intent Passport"><Pencil size={18} /></Link>
      </header>
      <div className="home-passport-fields">
        {passportFields.map((field) => <article key={field.label}><small>{field.label}</small><strong>{field.value}</strong></article>)}
      </div>
      <p className="home-passport-privacy"><ShieldCheck size={15} />Shared deliberately. Never shown as a compatibility percentage.</p>
    </section>
  );
}
