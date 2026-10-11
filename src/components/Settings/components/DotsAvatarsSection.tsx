import { dotsRegistry } from "@/components/avatarDefinition";
import { useSettings } from "@/hooks/useSettings";
import { AvatarPickerCard } from "./AvatarPickerCard";
import { PickerSectionHeader } from "./PickerSectionHeader";

const DOTS_LAB_URL = "https://dots-lab.pages.dev/";

/** Personnages créés avec Dots Lab (Guillaume, @guillaume_rygn), livrés avec Hooky avec son
 * autorisation (cf. src/components/dots/README.md). Comme un pet Codex : ni couleurs éditables
 * ni suppression -- la couleur fait partie de la planche. */
export function DotsAvatarsSection() {
  const [settings, setSettings] = useSettings();
  const bundles = Object.values(dotsRegistry);

  if (bundles.length === 0) return null;

  return (
    <section className="flex flex-col gap-2" aria-label="Personnages Dots Lab">
      <PickerSectionHeader
        title="Dots Lab"
        linkLabel="Découvrir Dots Lab"
        linkUrl={DOTS_LAB_URL}
      />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] content-start gap-2">
        {bundles.map((bundle) => (
          <AvatarPickerCard
            key={bundle.id}
            bundle={bundle}
            isSelected={bundle.id === settings.avatarId}
            isCustom={false}
            colorOverride={undefined}
            onSelect={() => setSettings({ ...settings, avatarId: bundle.id })}
            onResetColors={() => undefined}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Personnages créés avec Dots Lab, par Guillaume (@guillaume_rygn).
      </p>
    </section>
  );
}
