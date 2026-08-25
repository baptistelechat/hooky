import { NOTIFICATION_ANIMATIONS } from "@/lib/animationCatalog";
import { AnimationCard } from "./AnimationCard";

export function NotificationAnimationGrid() {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2">
      {NOTIFICATION_ANIMATIONS.map((entry) => (
        <AnimationCard key={entry.label} {...entry} />
      ))}
    </div>
  );
}
