import { Bell, Gauge, Ruler, Sparkles, UserRound } from "lucide-react";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldSeparator,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import type { HookySettings } from "@/lib/settings";

interface PetSettingsFieldsProps {
  settings: HookySettings;
  setSettings: (next: HookySettings) => void;
}

/** Réglages du pet : taille, prénom, et tout ce qui touche à son apparence à l'écran
 * (effets visuels, bulle de notification, panneau de quotas). */
export function PetSettingsFields({
  settings,
  setSettings,
}: PetSettingsFieldsProps) {
  return (
    <>
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

      <Field>
        <FieldLabel htmlFor="call-name" className="items-center">
          <UserRound className="size-4" />
          Comment dois-je t'appeler ?
        </FieldLabel>
        <Input
          id="call-name"
          value={settings.callName}
          onChange={(event) =>
            setSettings({ ...settings, callName: event.target.value })
          }
          placeholder="John Doe (Optionnel)"
          maxLength={30}
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

      <Field orientation="horizontal">
        <FieldContent>
          <FieldTitle>
            <Bell className="size-4" />
            Notifications
          </FieldTitle>
          <FieldDescription>
            Bulle de message quand Claude a besoin de toi ou a terminé.
          </FieldDescription>
        </FieldContent>
        <Switch
          checked={settings.notificationsEnabled}
          onCheckedChange={(checked) =>
            setSettings({ ...settings, notificationsEnabled: checked })
          }
        />
      </Field>

      <Field orientation="horizontal">
        <FieldContent>
          <FieldTitle>
            <Gauge className="size-4" />
            Quotas Claude Code
          </FieldTitle>
          <FieldDescription>
            Rings permanents à côté de l'avatar (session 5h, semaine) --
            rafraîchis toutes les 3 minutes.
          </FieldDescription>
        </FieldContent>
        <Switch
          checked={settings.usagePanelEnabled}
          onCheckedChange={(checked) =>
            setSettings({ ...settings, usagePanelEnabled: checked })
          }
        />
      </Field>
    </>
  );
}
