import { AudioLines } from "lucide-react";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { playCue, SOUND_FEELS } from "@/lib/sounds";

interface SoundFeelFieldProps {
  feel: string;
  /** Volume des sons (0-100), appliqué à l'aperçu. */
  volume: number;
  disabled: boolean;
  onChange: (feel: string) => void;
}

function FeelDot({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      className="size-2 shrink-0 rounded-full"
      style={{ backgroundColor: color }}
    />
  );
}

/** Choix du caractère sonore du pet (un des 12 « feels » uisfx), avec la couleur de marque de
 * chaque feel et sa description. Joue un aperçu (`complete`) à chaque choix. */
export function SoundFeelField({
  feel,
  volume,
  disabled,
  onChange,
}: SoundFeelFieldProps) {
  const current = SOUND_FEELS.find(({ id }) => id === feel);

  return (
    <Field>
      <FieldLabel htmlFor="sound-feel" className="items-center">
        <AudioLines className="size-4" />
        Caractère sonore
      </FieldLabel>
      <Select
        items={SOUND_FEELS.map(({ id, label }) => ({ value: id, label }))}
        value={feel}
        disabled={disabled}
        onValueChange={(next) => {
          if (!next) return;
          onChange(next);
          playCue(next, "complete", volume);
        }}
      >
        <SelectTrigger id="sound-feel" className="w-full">
          <SelectValue>
            {(value: string | null) => {
              const selected = SOUND_FEELS.find(({ id }) => id === value);
              return (
                selected && (
                  <>
                    <FeelDot color={selected.color} />
                    {selected.label}
                  </>
                )
              );
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {SOUND_FEELS.map(({ id, label, color }) => (
            <SelectItem key={id} value={id}>
              <FeelDot color={color} />
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {current && <FieldDescription>{current.description}</FieldDescription>}
    </Field>
  );
}
