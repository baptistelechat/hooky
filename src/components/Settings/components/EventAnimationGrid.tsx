import { EVENT_ANIMATIONS } from "@/lib/animationCatalog";
import { AnimationCard } from "./AnimationCard";

export function EventAnimationGrid() {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2">
      {EVENT_ANIMATIONS.map((entry) => (
        <AnimationCard key={entry.label} {...entry} />
      ))}
    </div>
  );
}
