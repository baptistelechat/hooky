import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useSettings } from "@/hooks/useSettings";
import type { BotMaterialName, BotMood } from "@/lib/botAvatars";
import { Eye, Layers, Smile, type LucideIcon } from "lucide-react";

const MOODS: { value: BotMood; label: string }[] = [
  { value: "neutral", label: "Neutre" },
  { value: "happy", label: "Joyeux" },
];

const MATERIALS: { value: BotMaterialName; label: string }[] = [
  { value: "flat", label: "Plat" },
  { value: "fluffy", label: "Fourrure" },
  { value: "glass", label: "Verre" },
];

interface SegmentedRowProps<T extends string> {
  icon: LucideIcon;
  label: string;
  items: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

/** Une ligne « libellé à gauche, choix à droite » : 2-3 options courtes se lisent d'un coup
 * d'œil en contrôle segmenté, là où un Select cachait les autres choix. */
function SegmentedRow<T extends string>({
  icon: Icon,
  label,
  items,
  value,
  onChange,
}: SegmentedRowProps<T>) {
  return (
    <Field orientation="horizontal">
      <FieldTitle className="flex-1">
        <Icon className="size-4" />
        {label}
      </FieldTitle>
      <ToggleGroup
        aria-label={label}
        variant="outline"
        size="sm"
        spacing={0}
        value={[value]}
        // Un clic sur l'option déjà active la désélectionnerait : on l'ignore.
        onValueChange={(next) => next[0] && onChange(next[0] as T)}
      >
        {items.map((item) => (
          <ToggleGroupItem key={item.value} value={item.value}>
            {item.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </Field>
  );
}

/** Réglages propres aux avatars Open Bot Avatar, communs à tous : en footer du picker, sous les
 * couleurs, quand un bot est sélectionné (cf. AvatarPicker). FieldGroup imbriqué : espacement
 * resserré (cf. field.tsx) pour ne pas trop grignoter la grille au-dessus. */
export function BotStyleFields() {
  const [settings, setSettings] = useSettings();

  return (
    <FieldGroup>
      <SegmentedRow
        icon={Smile}
        label="Yeux"
        items={MOODS}
        value={settings.botMood}
        onChange={(botMood) => setSettings({ ...settings, botMood })}
      />
      <SegmentedRow
        icon={Layers}
        label="Matière"
        items={MATERIALS}
        value={settings.botMaterial}
        onChange={(botMaterial) => setSettings({ ...settings, botMaterial })}
      />
      <Field orientation="horizontal">
        <FieldLabel htmlFor="bot-follow">
          <Eye className="size-4" />
          Suit le curseur
        </FieldLabel>
        <Switch
          id="bot-follow"
          checked={settings.botFollowCursor}
          onCheckedChange={(checked) =>
            setSettings({ ...settings, botFollowCursor: checked })
          }
        />
      </Field>
    </FieldGroup>
  );
}
