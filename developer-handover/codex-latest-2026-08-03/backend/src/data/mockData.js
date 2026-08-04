export const previewUser = {
  id: 1,
  firstName: "Shivay",
  email: "preview@destinyone.app",
  city: "Toronto, ON",
  intent: "Long-term, leading to marriage",
  verified: true,
  role: "member",
};

export const previewProfiles = [
  {
    id: 101,
    firstName: "Maya",
    age: 30,
    profession: "Architect",
    city: "Chicago, IL",
    intent: "Long-term, leading to marriage",
    values: ["Family first", "Ambitious", "Creative"],
    verified: true,
    image:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 102,
    firstName: "Anika",
    age: 29,
    profession: "Product Designer",
    city: "New York, NY",
    intent: "Marriage",
    values: ["Emotionally mature", "Culture proud", "Foodie"],
    verified: true,
    image:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 103,
    firstName: "Riya",
    age: 28,
    profession: "Physician",
    city: "Vancouver, BC",
    intent: "Long-term relationship",
    values: ["Family first", "Travel lover", "Simple life"],
    verified: true,
    image:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=900&q=85",
  },
];

export const previewMessages = [
  {
    id: 1,
    conversationId: 1,
    senderId: 102,
    body: "Your ideal first date: a quiet cafe or something outdoors?",
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  {
    id: 2,
    conversationId: 1,
    senderId: 1,
    body: "A cafe first, then a walk if the conversation is flowing.",
    createdAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
  },
];

export const previewPlans = [
  {
    id: "essential",
    name: "Essential",
    price: 45,
    cadence: "month",
    features: ["5 curated introductions daily", "Mutual chat", "Intent filters"],
  },
  {
    id: "select",
    name: "Select",
    price: 79,
    cadence: "month",
    features: ["Everything in Essential", "Profile visitors", "Date Concierge"],
  },
  {
    id: "executive",
    name: "Executive Circle",
    price: 149,
    cadence: "month",
    features: ["Handpicked introductions", "Private profile mode", "Priority support"],
  },
];
