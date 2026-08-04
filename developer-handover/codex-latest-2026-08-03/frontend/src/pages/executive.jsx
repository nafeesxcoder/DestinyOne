import AppShell from "../components/layout/AppShell";
import ExecutiveOverview from "../components/common/ExecutiveOverview";

export default function ExecutivePage() {
  return (
    <AppShell title="Executive Circle" eyebrow="Invite-only membership">
      <p className="page-subtitle">A private, high-touch experience for career-minded members who value discretion.</p>
      <ExecutiveOverview />
    </AppShell>
  );
}
