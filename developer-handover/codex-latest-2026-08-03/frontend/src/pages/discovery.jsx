import AppShell from "../components/layout/AppShell";
import VerifiedCityDensity from "../components/search/VerifiedCityDensity";

export default function DiscoveryPage() {
  return (
    <AppShell eyebrow="Smart Discovery" title="Your city, with enough real choice">
      <VerifiedCityDensity />
    </AppShell>
  );
}
