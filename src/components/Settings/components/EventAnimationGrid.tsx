import { EVENT_ANIMATIONS } from "@/lib/animationCatalog";
import { AnimationCard } from "./AnimationCard";

interface EventAnimationGridProps {
  selectedLabel: string | null;
  onSelect: (label: string) => void;
}

export function EventAnimationGrid({
  selectedLabel,
  onSelect,
}: EventAnimationGridProps) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2">
      {EVENT_ANIMATIONS.map((entry) => (
        <AnimationCard
          key={entry.label}
          entry={entry}
          isLive={entry.label === selectedLabel}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
