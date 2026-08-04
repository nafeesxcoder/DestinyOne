import { useState } from "react";
import { useRouter } from "next/router";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Check,
  Compass,
  Heart,
  Home,
  MapPin,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import AppShell from "../components/layout/AppShell";
import OnboardingIcon from "../components/auth/OnboardingIcon";
import { api } from "../services/api";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    city: "",
    profession: "",
    intent: "Long-term, leading to marriage",
    values: [],
  });
  const [status, setStatus] = useState("");

  const steps = [
    { title: "Tell us about your life", body: "A few real details help thoughtful introductions feel more personal.", icon: MapPin },
    { title: "What feels true to you?", body: "Choose the values and everyday energy that feel most like you.", icon: Sparkles },
    { title: "Your relationship intention", body: "Clear intentions make every introduction more respectful.", icon: Heart },
  ];
  const values = [
    { label: "Family first", icon: Home },
    { label: "Emotionally mature", icon: Heart },
    { label: "Ambitious", icon: BriefcaseBusiness },
    { label: "Culture proud", icon: Users },
    { label: "Spiritual", icon: Sparkles },
    { label: "Adventurous", icon: Compass },
  ];
  const currentStep = steps[step - 1];

  function toggle(value) {
    setForm({
      ...form,
      values: form.values.includes(value)
        ? form.values.filter((item) => item !== value)
        : [...form.values, value],
    });
  }

  async function finish() {
    try {
      await api.put("/profiles/me", form);
    } catch {
      setStatus("Profile saved locally for preview.");
      localStorage.setItem("destinyone-profile", JSON.stringify(form));
    }
    await router.push("/matches");
  }

  return (
    <AppShell eyebrow={`Profile setup · ${step} of 3`} title={currentStep.title}>
      <div className="content-stack onboarding-page">
        <section className="onboarding-progress" aria-label={`Step ${step} of 3`}>
          <span style={{ width: `${(step / 3) * 100}%` }} />
        </section>

        <section className="onboarding-card">
          <div className="onboarding-intro">
            <OnboardingIcon icon={currentStep.icon} size="large" />
            <div>
              <p className="onboarding-kicker">STEP {step} · INTENTIONAL SETUP</p>
              <h2>{currentStep.title}</h2>
              <p>{currentStep.body}</p>
            </div>
          </div>

          {step === 1 && (
            <div className="grid-2 onboarding-fields">
              <label className="onboarding-field" htmlFor="city">
                <span><MapPin size={16} />City</span>
                <input
                  id="city"
                  placeholder="New York, NY"
                  value={form.city}
                  onChange={(event) => setForm({ ...form, city: event.target.value })}
                />
              </label>
              <label className="onboarding-field" htmlFor="profession">
                <span><BriefcaseBusiness size={16} />Profession</span>
                <input
                  id="profession"
                  placeholder="Founder, designer, engineer…"
                  value={form.profession}
                  onChange={(event) => setForm({ ...form, profession: event.target.value })}
                />
              </label>
            </div>
          )}

          {step === 2 && (
            <div className="choice-grid onboarding-choice-grid">
              {values.map(({ label, icon }) => {
                const active = form.values.includes(label);
                return (
                  <button
                    type="button"
                    className={active ? "choice active" : "choice"}
                    aria-pressed={active}
                    onClick={() => toggle(label)}
                    key={label}
                  >
                    <OnboardingIcon icon={icon} size="small" />
                    <span>{label}</span>
                    <span className="choice-check" aria-hidden="true">
                      {active ? <Check size={14} /> : null}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {step === 3 && (
            <div className="onboarding-intent">
              <label className="onboarding-field" htmlFor="intent">
                <span><Heart size={16} />Intent</span>
                <select
                  id="intent"
                  value={form.intent}
                  onChange={(event) => setForm({ ...form, intent: event.target.value })}
                >
                  <option>Long-term, leading to marriage</option>
                  <option>Marriage</option>
                  <option>Long-term relationship</option>
                </select>
              </label>
              <div className="onboarding-promise">
                <OnboardingIcon icon={ShieldCheck} size="small" />
                <div>
                  <strong>Commitment comes first.</strong>
                  <p>Casual and short-term intentions are not supported on DestinyOne.</p>
                </div>
              </div>
            </div>
          )}

          <div className="inline-actions onboarding-actions">
            {step > 1 && (
              <button className="secondary-button" onClick={() => setStep(step - 1)}>
                <ArrowLeft size={16} />Back
              </button>
            )}
            <button className="primary-button" onClick={() => (step < 3 ? setStep(step + 1) : finish())}>
              {step < 3 ? "Continue" : "Complete profile"}
              {step < 3 ? <ArrowRight size={16} /> : <Check size={16} />}
            </button>
          </div>

          {status && <p className="onboarding-status" role="status">{status}</p>}
        </section>
      </div>
    </AppShell>
  );
}
