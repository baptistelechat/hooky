import { NOTIFICATION_ANIMATIONS } from "@/lib/animationCatalog";
import { AnimationCard } from "./AnimationCard";

interface NotificationAnimationGridProps {
  selectedLabel: string | null;
  onSelect: (label: string) => void;
}

export function NotificationAnimationGrid({
  selectedLabel,
  onSelect,
}: NotificationAnimationGridProps) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2">
      {NOTIFICATION_ANIMATIONS.map((entry) => (
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
