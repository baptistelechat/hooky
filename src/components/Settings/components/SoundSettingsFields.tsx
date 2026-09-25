import {
  AudioWaveform,
  SlidersHorizontal,
  Volume1,
  Volume2,
  Waves,
} from "lucide-react";
import { useEffect, useRef } from "react";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import type { HookySettings } from "@/lib/settings";
import {
  isMainLoopActive,
  playCue,
  startWorkLoop,
  stopWorkLoop,
} from "@/lib/sounds";
import { SoundFeelField } from "./SoundFeelField";

// Durée de l'aperçu de la boucle quand on lâche le curseur d'ambiance.
const AMBIENCE_PREVIEW_MS = 2500;

interface SoundSettingsFieldsProps {
  settings: HookySettings;
  setSettings: (next: HookySettings) => void;
}

/** Tous les réglages de son : activation, caractère (feel), mixage façon jeu (sons / ambiance)
 * et mode « moins bavard ». Le curseur d'ambiance joue un court aperçu de la boucle quand on le
 * relâche, pour régler son niveau à l'oreille sans attendre que Claude travaille. */
export function SoundSettingsFields({
  settings,
  setSettings,
}: SoundSettingsFieldsProps) {
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  useEffect(
    () => () => {
      clearTimeout(previewTimerRef.current);
      stopWorkLoop();
    },
    [],
  );

  const previewAmbience = (percent: number) => {
    // Claude travaille : la vraie boucle (fenêtre "main") joue déjà et suit le curseur en
    // direct -- un aperçu ici ferait une 2e boucle par-dessus.
    if (isMainLoopActive()) return;
    startWorkLoop(settings.soundFeel, percent);
    clearTimeout(previewTimerRef.current);
    previewTimerRef.current = setTimeout(stopWorkLoop, AMBIENCE_PREVIEW_MS);
  };

  return (
    <>
      <Field orientation="horizontal">
        <FieldContent>
          <FieldTitle>
            <Volume2 className="size-4" />
            Activer les sons
          </FieldTitle>
          <FieldDescription>
            Un son par émotion du pet : réveil, fin de tâche, besoin de toi…
            Active et désactive à la fois les sons de base et l'ambiance de
            travail.
          </FieldDescription>
        </FieldContent>
        <Switch
          checked={settings.soundEnabled}
          onCheckedChange={(checked) =>
            setSettings({ ...settings, soundEnabled: checked })
          }
        />
      </Field>

      <SoundFeelField
        feel={settings.soundFeel}
        volume={settings.soundVolume}
        disabled={!settings.soundEnabled}
        onChange={(feel) => setSettings({ ...settings, soundFeel: feel })}
      />

      <Field>
        <FieldLabel htmlFor="sound-volume" className="items-center">
          <SlidersHorizontal className="size-4" />
          Volume des sons ({settings.soundVolume} %)
        </FieldLabel>
        <Slider
          id="sound-volume"
          value={settings.soundVolume}
          disabled={!settings.soundEnabled}
          min={0}
          max={100}
          step={5}
          onValueChange={(value) =>
            setSettings({ ...settings, soundVolume: value as number })
          }
          onValueCommitted={(value) =>
            playCue(settings.soundFeel, "complete", value as number)
          }
        />
      </Field>

      <Field orientation="horizontal">
        <FieldContent>
          <FieldTitle>
            <Volume1 className="size-4" />
            Moins bavard
          </FieldTitle>
          <FieldDescription>
            Ne garde que l'essentiel : présence du pet, besoin de toi, fin de
            tâche, erreurs. Coupe les sons secondaires (outils, étapes…).
          </FieldDescription>
        </FieldContent>
        <Switch
          checked={settings.soundQuietMode}
          disabled={!settings.soundEnabled}
          onCheckedChange={(checked) =>
            setSettings({ ...settings, soundQuietMode: checked })
          }
        />
      </Field>

      <Field orientation="horizontal">
        <FieldContent>
          <FieldTitle>
            <Waves className="size-4" />
            Ambiance de travail
          </FieldTitle>
          <FieldDescription>
            Une boucle discrète en fond pendant que Claude travaille, coupée dès
            qu'il a fini ou qu'il t'attend.
          </FieldDescription>
        </FieldContent>
        <Switch
          checked={settings.soundLoopEnabled}
          disabled={!settings.soundEnabled}
          onCheckedChange={(checked) =>
            setSettings({ ...settings, soundLoopEnabled: checked })
          }
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="sound-ambience-volume" className="items-center">
          <AudioWaveform className="size-4" />
          Volume de l'ambiance ({settings.soundAmbienceVolume} %)
        </FieldLabel>
        <Slider
          id="sound-ambience-volume"
          value={settings.soundAmbienceVolume}
          disabled={!settings.soundEnabled || !settings.soundLoopEnabled}
          min={0}
          max={100}
          step={5}
          onValueChange={(value) =>
            setSettings({ ...settings, soundAmbienceVolume: value as number })
          }
          onValueCommitted={(value) => previewAmbience(value as number)}
        />
      </Field>
    </>
  );
}
