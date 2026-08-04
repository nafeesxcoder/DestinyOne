import FeatureHub from "../components/common/FeatureHub";
import PostDateLearningExperience from "../components/search/PostDateLearningExperience";

export default function CoachPage() {
  return (
    <FeatureHub
      eyebrow="Relationship Coach"
      title="Better conversations, still in your voice"
      subtitle="Private prompts and consent-based learning—not your phone history or private contacts."
      hero={{ kicker: "Suggested next step", title: "Move from chemistry to clarity", body: "Ask one future-focused question and leave room for an honest answer.", metric: "3", metricLabel: "prompt ideas" }}
      cards={[
        { title: "Future plans", body: "What would a fulfilling next three years look like for you?", href: "/messages" },
        { title: "Family expectations", body: "How involved do you hope family will be in a serious relationship?", href: "/messages" },
        { title: "Conflict and repair", body: "When something feels off, how do you prefer to work through it?", href: "/messages" },
      ]}
      actions={[
        { label: "Use a prompt in chat", href: "/messages" },
        { label: "Review alignment", href: "/readiness" },
      ]}
    >
      <PostDateLearningExperience />
    </FeatureHub>
  );
}
