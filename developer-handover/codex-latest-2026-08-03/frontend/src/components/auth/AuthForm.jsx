import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import { api } from "../../services/api";

export default function AuthForm({ mode = "login" }) {
  const router = useRouter();
  const isRegister = mode === "register";
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [message, setMessage] = useState("");

  function update(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true); setMessage("");
    try {
      const result = await api.post(isRegister ? "/auth/register" : "/auth/login", { firstName: form.name, email: form.email, password: form.password });
      localStorage.setItem("destinyone-session", JSON.stringify(result.user));
      setMessage(isRegister ? "Your profile is ready." : "Welcome back.");
      await router.push("/matches");
    } catch (error) { setMessage(error.message); }
    finally { setSubmitting(false); }
  }

  return (
    <form className="form-card auth-card" onSubmit={submit}>
      <div>
        <p className="eyebrow">{isRegister ? "Begin with intention" : "Welcome back"}</p>
        <h2>{isRegister ? "Create your DestinyOne profile" : "Sign in to continue"}</h2>
        <p className="helper-text">{isRegister ? "A private preview account keeps your choices on this device." : "Continue your conversations and thoughtful introductions."}</p>
      </div>
      {isRegister && <div className="field"><label htmlFor="name">First name</label><input id="name" name="name" value={form.name} onChange={update} required /></div>}
      <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" value={form.email} onChange={update} required /></div>
      <div className="field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" minLength="8" value={form.password} onChange={update} required /></div>
      {message && <p role="status" className="helper-text">{message}</p>}
      <button className="primary-button full-button" type="submit" disabled={submitting}>{submitting ? "Please wait…" : isRegister ? "Create profile" : "Sign in"}</button>
      <p className="helper-text">{isRegister ? "Already a member?" : "New to DestinyOne?"} <Link className="text-link" href={isRegister ? "/login" : "/register"}>{isRegister ? "Sign in" : "Create an account"}</Link></p>
    </form>
  );
}
