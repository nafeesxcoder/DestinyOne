import AppShell from "../../components/layout/AppShell";
import ProfileSettingsExperience from "../../components/profile/ProfileSettingsExperience";

export default function ProfileSettingsPage() {
  return (
    <AppShell title="Account settings" eyebrow="Profile & privacy">
      <p className="page-subtitle">Control notifications, visibility, discovery and anonymous product analytics.</p>
      <ProfileSettingsExperience />
    </AppShell>
  );
}
