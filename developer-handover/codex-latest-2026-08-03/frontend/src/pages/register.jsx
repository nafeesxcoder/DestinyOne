import AppShell from "../components/layout/AppShell";
import AuthForm from "../components/auth/AuthForm";

export default function RegisterPage() {
  return <AppShell title="Meet with intention" eyebrow="Join DestinyOne"><div className="auth-layout"><AuthForm mode="register" /></div></AppShell>;
}
