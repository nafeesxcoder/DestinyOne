import SectionHeader from "../common/SectionHeader";

const quotes = [
  ["The questions made our first conversation feel natural, not forced.", "Nina & Rohan"],
  ["We knew what we both wanted before the first date.", "Meera & Jay"]
];

export default function Testimonials() {
  return (
    <section>
      <SectionHeader eyebrow="Real stories" title="Built for something lasting" />
      <div className="quote-grid">
        {quotes.map(([quote, name]) => <blockquote key={name}><p>“{quote}”</p><cite>{name}</cite></blockquote>)}
      </div>
    </section>
  );
}
