import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import AppShell from "../layout/AppShell";

export default function FeatureHub({ eyebrow, title, subtitle, hero, cards = [], actions = [], children }) {
  return (
    <AppShell eyebrow={eyebrow} title={title}>
      <div className="content-stack">
        {subtitle && <p className="page-lead">{subtitle}</p>}
        {hero && <section className="feature-hero"><div><p className="eyebrow">{hero.kicker}</p><h2>{hero.title}</h2><p>{hero.body}</p></div>{hero.metric && <div className="feature-metric"><strong>{hero.metric}</strong><span>{hero.metricLabel}</span></div>}</section>}
        {cards.length > 0 && <section className="feature-grid">{cards.map((card) => <article className="feature-card" key={card.title}><span className="feature-icon"><CheckCircle2 size={20} /></span><h3>{card.title}</h3><p>{card.body}</p>{card.meta && <span className="pill">{card.meta}</span>}{card.href && <Link className="text-link" href={card.href}>Open <ArrowRight size={15} /></Link>}</article>)}</section>}
        {children}
        {actions.length > 0 && <div className="feature-actions">{actions.map((action, index) => <Link key={action.href} className={index === 0 ? "primary-button" : "secondary-button"} href={action.href}>{action.label}<ArrowRight size={16} /></Link>)}</div>}
      </div>
    </AppShell>
  );
}
