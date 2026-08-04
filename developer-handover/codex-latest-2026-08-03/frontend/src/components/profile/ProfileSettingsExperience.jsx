import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BellRing,
  Eye,
  EyeOff,
  HelpCircle,
  LockKeyhole,
  PauseCircle,
  Save,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { api } from "../../services/api";
import { configureWebAnalytics, trackWebAnalytics, withdrawWebAnalytics } from "../../services/analytics";

const initialSettings = {
  notifications: true,
  privateProfile: false,
  pauseDiscovery: false,
  showLastOnline: true,
  anonymousAnalytics: false,
  matchNotifications: true,
  messageNotifications: true,
  dateNotifications: true,
  safetyNotifications: true,
};

const rows = [
  { key: "notifications", title: "Match and message notifications", body: "Alerts for matches, messages, calls and support updates.", icon: BellRing },
  { key: "privateProfile", title: "Private profile mode", body: "Hide from new discovery while keeping existing matches and chats.", icon: LockKeyhole },
  { key: "pauseDiscovery", title: "Pause discovery", body: "Temporarily stop new daily introductions without deleting your account.", icon: PauseCircle },
  { key: "showLastOnline", title: "Show last online", body: "Allow mutual matches to see a recent activity hint.", icon: Eye },
  { key: "anonymousAnalytics", title: "Anonymous product analytics", body: "Share stage events only—never names, messages, photos or precise location.", icon: ShieldCheck },
  { key: "matchNotifications", title: "New match alerts", body: "Receive an alert when a thoughtful introduction or mutual match is ready.", icon: BellRing },
  { key: "messageNotifications", title: "Message and call alerts", body: "New messages, missed calls and private conversation updates.", icon: BellRing },
  { key: "dateNotifications", title: "Date plan reminders", body: "Private reminders for accepted plans, changes and safety check-ins.", icon: BellRing },
  { key: "safetyNotifications", title: "Safety and support alerts", body: "Required account, report and safety updates cannot be silenced.", icon: ShieldCheck, locked: true },
];

export default function ProfileSettingsExperience() {
  const [settings, setSettings] = useState(initialSettings);
  const [status, setStatus] = useState("Your privacy controls are ready.");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    const cached = window.localStorage.getItem("destinyone-profile-settings");
    if (cached) {
      try { setSettings((current) => ({ ...current, ...JSON.parse(cached) })); } catch { /* Ignore invalid legacy cache. */ }
    }
    api.get("/profiles/me/settings").then((value) => {
      if (!active) return;
      setSettings((current) => ({ ...current, ...value }));
      setStatus("Your saved privacy and notification preferences are ready.");
    }).catch(() => {
      if (active) setStatus("Offline preview—changes stay safely on this device until the API reconnects.");
    });
    return () => { active = false; };
  }, []);

  function toggle(key) {
    setSettings((current) => ({ ...current, [key]: !current[key] }));
    setStatus("Unsaved changes—review and save when ready.");
  }

  async function save() {
    setSaving(true);
    window.localStorage.setItem("destinyone-profile-settings", JSON.stringify(settings));
    configureWebAnalytics(settings.anonymousAnalytics);
    if (settings.anonymousAnalytics) trackWebAnalytics("relationship_learning_consent_changed", { enabled:true });
    else void withdrawWebAnalytics();
    try {
      const saved = await api.put("/profiles/me/settings", settings);
      setSettings((current) => ({ ...current, ...saved }));
      setStatus("Saved securely across your profile, privacy and notification preferences.");
    } catch {
      setStatus("Saved on this device. Retry after reconnecting to sync across devices.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="profile-settings-stack">
      <section className="profile-settings-hero">
        <span className="profile-settings-lock"><ShieldCheck size={24} /></span>
        <div><p className="eyebrow">Private by default</p><h2>Your presence, your choice.</h2><p>Every setting has a clear frontend state and a documented backend handoff.</p></div>
      </section>

      <section className="profile-settings-list" aria-label="Profile settings">
        {rows.map(({ key, title, body, icon: Icon, locked }) => {
          const active = settings[key];
          const DisplayIcon = key === "showLastOnline" && !active ? EyeOff : Icon;
          return (
            <button className="profile-settings-row" type="button" role="switch" aria-checked={active} aria-disabled={locked || undefined} disabled={locked} onClick={() => !locked && toggle(key)} key={key}>
              <span className={`profile-action-icon ${active ? "gold" : "ruby"}`}><DisplayIcon size={20} /></span>
              <span><strong>{title}</strong><small>{body}</small></span>
              <i className={active ? "active" : ""}><b /></i>
            </button>
          );
        })}
      </section>

      <p className="profile-settings-status" role="status"><ShieldCheck size={16} /> {status}</p>
      <button className="primary-button profile-settings-save" type="button" disabled={saving} onClick={save}><Save size={17} /> {saving ? "Saving…" : "Save settings"}</button>

      <section className="profile-settings-shortcuts">
        <Link href="/safety"><ShieldCheck size={18} /><span><strong>Safety Center</strong><small>Reports, blocks and account data</small></span></Link>
        <Link href="/discovery"><SlidersHorizontal size={18} /><span><strong>Match preferences</strong><small>Intent, distance and future plans</small></span></Link>
        <Link href="/support"><HelpCircle size={18} /><span><strong>Private support</strong><small>Help, appeals and account access</small></span></Link>
      </section>
    </div>
  );
}
