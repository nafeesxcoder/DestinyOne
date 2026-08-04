import FeatureHub from "../components/common/FeatureHub";

export default function VerificationPage() {
  return (
    <FeatureHub
      eyebrow="Trust Hub"
      title="A profile people can trust"
      subtitle="Layered verification helps serious members feel safer without exposing private documents."
      hero={{
        kicker: "Trust score",
        title: "Complete your identity signals",
        body: "Selfie, voice and community vouches each add a distinct trust layer.",
        metric: "67%",
        metricLabel: "complete",
      }}
      cards={[
        {
          title: "Real profile verification",
          body: "Frontend entry point for phone, email, selfie/liveness and optional ID. Your developer can connect the secure API later.",
          meta: "Backend connection pending",
        },
        { title: "Selfie check", body: "Compare a live selfie with profile photos.", meta: "Complete" },
        { title: "Voice introduction", body: "A short, optional introduction in your own voice." },
        { title: "Trusted Circle", body: "Structured vouches from people you choose.", href: "/trusted-circle" },
        { title: "Privacy", body: "Verification media is never shown as a public document." },
      ]}
      actions={[
        { label: "Continue verification", href: "/profile" },
        { label: "Safety Center", href: "/safety" },
      ]}
    />
  );
}
