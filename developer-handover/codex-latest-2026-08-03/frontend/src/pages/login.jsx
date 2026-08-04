import AppShell from "../components/layout/AppShell";
import AuthForm from "../components/auth/AuthForm";

export default function LoginPage() {
  return <AppShell title="Your conversations are waiting" eyebrow="Sign in"><div className="auth-layout"><AuthForm /></div></AppShell>;
}
