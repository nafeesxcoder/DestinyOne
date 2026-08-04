import Link from "next/link";

export default function ResultCard({ item }) {
  return (
    <article className="result-card">
      <img src={item.image} alt={`${item.name || item.title || "Member"} profile`} />
      <div>
        <span className="pill">{item.type}</span>
        <h3>{item.name}</h3>
        <p>{item.meta}</p>
        <strong>{item.detail}</strong>
      </div>
      <Link className="primary-button" href={item.href || "/matches"}>{item.action || "View"}</Link>
    </article>
  );
}
