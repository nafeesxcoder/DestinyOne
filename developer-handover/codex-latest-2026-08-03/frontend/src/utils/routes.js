import {
  CalendarDays,
  Compass,
  Crown,
  Gift,
  Heart,
  MessageCircle,
  UserRound
} from "lucide-react";

export const primaryRoutes = [
  { href: "/", label: "Home", icon: Heart },
  { href: "/search", label: "Discover", icon: Compass },
  { href: "/matches", label: "Matches", icon: Heart },
  { href: "/messages", label: "Chat", icon: MessageCircle },
  { href: "/membership", label: "Premium", icon: Crown },
  { href: "/profile", label: "Profile", icon: UserRound }
];

export const quickRoutes = [
  { href: "/dates", label: "Dates", icon: CalendarDays },
  { href: "/gifts", label: "Gifts", icon: Gift }
];
