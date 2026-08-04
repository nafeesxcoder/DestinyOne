import { useRouter } from "next/router";
import FeatureHub from "../../components/common/FeatureHub";
export default function MatchDetailPage() { const { query } = useRouter(); return <FeatureHub eyebrow="Intent Passport" title="Anika, 29" subtitle={`Private introduction ${query.id || ""} · Product Designer · New York, NY`} hero={{ kicker: "Why you align", title: "Shared direction, room for discovery", body: "Marriage-minded, family-first and open to relocating for the right partnership.", metric: "93%", metricLabel: "values aligned" }} cards={[{ title: "Future plans", body: "Marriage in 1–2 years and open to children." }, { title: "Family expectations", body: "Close to family with healthy relationship boundaries." }, { title: "Life and career", body: "Ambitious, creative and values balanced partnership." }, { title: "Trust", body: "Selfie verified with an optional voice introduction.", meta: "Verified" }]} actions={[{ label: "I’m interested", href: "/mutual" }, { label: "Safety controls", href: "/safety" }]} />; }

export function getStaticPaths() {
  return { paths: ["101", "102", "103"].map((id) => ({ params: { id } })), fallback: false };
}

export function getStaticProps() {
  return { props: {} };
}
