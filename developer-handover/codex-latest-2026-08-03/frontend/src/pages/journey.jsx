import FeatureHub from "../components/common/FeatureHub";
import RelationshipMilestonesFamilyRoom from "../components/profile/RelationshipMilestonesFamilyRoom";

export default function JourneyPage() {
  return (
    <FeatureHub
      eyebrow="Relationship Path"
      title="A calm path from match to meaning"
      subtitle="Private milestones help both people move forward with clarity and consent. Family participation is always optional."
      cards={[]}
      actions={[]}
    >
      <RelationshipMilestonesFamilyRoom />
    </FeatureHub>
  );
}
