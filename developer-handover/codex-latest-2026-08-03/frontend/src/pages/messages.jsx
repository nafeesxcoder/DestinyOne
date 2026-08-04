import AppShell from "../components/layout/AppShell";
import RealtimeChatExperience from "../components/chat/RealtimeChatExperience";

export default function MessagesPage() {
  return (
    <AppShell title="Private messages" eyebrow="DestinyOne conversations">
      <p className="page-subtitle">Presence, delivery receipts, calls and date planning in one calm space.</p>
      <RealtimeChatExperience />
    </AppShell>
  );
}
