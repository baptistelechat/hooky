import { Bug, Ruler, Sparkles } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
  FieldTitle,
} from "@/components/ui/field";
import { useSettings } from "@/hooks/useSettings";
import { ConfigurationField } from "./ConfigurationField";

/** Réglages persistés (taille avatar, effets visuels, mode debug) + export/import/reset
 * (ConfigurationField). Stockage localStorage, diffusé aux autres fenêtres via l'event
 * Tauri "hooky-settings" (cf. useSettings). Chaque contrôle applique directement -- pas
 * de bouton "Appliquer". Configuration en footer épinglé : reste visible même si le
 * contenu au-dessus défile. */
export function SettingsControls() {
  const [settings, setSettings] = useSettings();

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-hidden">
      <FieldGroup className="flex-1 overflow-x-hidden overflow-y-auto pr-1">
        <Field>
          <FieldLabel htmlFor="avatar-size" className="items-center">
            <Ruler className="size-4" />
            Taille de l'avatar ({settings.avatarSize}px)
          </FieldLabel>
          <Slider
            id="avatar-size"
            value={settings.avatarSize}
            onValueChange={(value) =>
              setSettings({ ...settings, avatarSize: value as number })
            }
            min={80}
            max={240}
            step={10}
          />
        </Field>

        <FieldSeparator />

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>
              <Sparkles className="size-4" />
              Effets visuels
            </FieldTitle>
            <FieldDescription>
              Confettis, secousses et icônes qui appuient l'animation en cours.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={settings.effectsEnabled}
            onCheckedChange={(checked) =>
              setSettings({ ...settings, effectsEnabled: checked })
            }
          />
        </Field>

        <FieldSeparator />

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>
              <Bug className="size-4" />
              Mode debug
            </FieldTitle>
            <FieldDescription>
              Fond semi-opaque + animation/hook affichés sur le pet.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={settings.debugMode}
            onCheckedChange={(checked) =>
              setSettings({ ...settings, debugMode: checked })
            }
          />
        </Field>
      </FieldGroup>

      <FieldSeparator />

      {/* FieldGroup dédié : les boutons Exporter/Importer/Réinitialiser dépendent de la
          container query `@md/field-group` posée par FieldGroup lui-même (`@container/
          field-group`) pour passer en ligne -- sortis du FieldGroup scrollable ci-dessus,
          ils perdent ce contexte et restent empilés en permanence sans leur propre. */}
      <FieldGroup>
        <ConfigurationField settings={settings} setSettings={setSettings} />
      </FieldGroup>
    </div>
  );
}
