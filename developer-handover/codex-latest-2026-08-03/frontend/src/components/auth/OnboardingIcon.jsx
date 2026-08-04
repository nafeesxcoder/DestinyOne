export default function OnboardingIcon({ icon: Icon, size = "medium", label }) {
  return (
    <span
      className={`onboarding-icon onboarding-icon-${size}`}
      aria-label={label}
      aria-hidden={label ? undefined : "true"}
    >
      <span className="onboarding-icon-orb">
        <Icon />
      </span>
    </span>
  );
}
