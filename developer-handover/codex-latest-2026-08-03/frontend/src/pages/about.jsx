import AppShell from "../components/layout/AppShell";

export default function AboutPage() {
  return (
    <AppShell title="Built for something real" eyebrow="About DestinyOne">
      <div className="content-stack">
        <section className="panel"><h2>Intent before endless attention</h2><p className="muted">DestinyOne is a serious relationship platform for South Asians across the United States and Canada. It brings matching, private conversation, date planning, gifts, and safety tools into one calm experience.</p></section>
        <div className="grid-3">{["Verified people", "Clear intentions", "Privacy by design"].map((title) => <article className="tool-card" key={title}><h3>{title}</h3><p className="muted">Designed to make thoughtful relationships easier to begin and safer to build.</p></article>)}</div>
      </div>
    </AppShell>
  );
}
