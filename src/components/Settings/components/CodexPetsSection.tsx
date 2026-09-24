import { buildSpriteBundle } from "@/components/avatarDefinition";
import { Button } from "@/components/ui/button";
import { useCodexPets, refreshCodexPets } from "@/hooks/useCodexPets";
import { useSettings } from "@/hooks/useSettings";
import { AvatarPickerCard } from "./AvatarPickerCard";
import { PickerSectionHeader } from "./PickerSectionHeader";
import { RefreshCw } from "lucide-react";
import { useMemo } from "react";

const PETDEX_URL = "https://petdex.dev/";

/** Pets installés dans `~/.codex/pets` (ex. via `npx petdex install <nom>`), listés en direct
 * depuis le disque -- rien n'est copié dans Hooky. Un pet Codex n'a ni couleurs éditables
 * (pas de body/eyes) ni suppression : le dossier appartient à Codex/Petdex, pas à Hooky. */
export function CodexPetsSection() {
  const [settings, setSettings] = useSettings();
  const codexPets = useCodexPets();
  const bundles = useMemo(
    () => Object.values(codexPets).map(buildSpriteBundle),
    [codexPets],
  );

  return (
    <section className="flex flex-col gap-2" aria-label="Pets Codex">
      <PickerSectionHeader
        title="Pets Codex"
        linkLabel="Télécharger sur Petdex"
        linkUrl={PETDEX_URL}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={() => void refreshCodexPets()}
          aria-label="Rafraîchir la liste des pets Codex"
        >
          <RefreshCw className="size-3" />
        </Button>
      </PickerSectionHeader>

      {bundles.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Aucun pet trouvé dans <code>~/.codex/pets</code>. Installe-en un avec{" "}
          <code>npx petdex install &lt;nom&gt;</code>, puis rafraîchis.
        </p>
      ) : (
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
      )}
    </section>
  );
}
