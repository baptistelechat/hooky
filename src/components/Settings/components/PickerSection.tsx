import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { openUrl } from "@tauri-apps/plugin-opener";
import { ExternalLink, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface PickerSectionProps {
  /** Clé de l'item dans l'Accordion du picker (cf. AvatarPicker). */
  value: string;
  icon: LucideIcon;
  title: string;
  /** Nombre d'avatars, affiché à côté du titre pour juger d'un coup d'œil sans déplier. */
  count: number;
  linkLabel: string;
  linkUrl: string;
  /** Actions supplémentaires (ex. Importer, Rafraîchir), après le lien. */
  actions?: ReactNode;
  children: ReactNode;
}

/** Une famille d'avatars dans le picker : section repliable, même style que les sections de
 * Réglages (cf. SettingsSection). Le lien et les actions vivent dans le contenu, pas dans le
 * titre : le titre est lui-même un bouton, on n'y imbrique pas d'autres boutons. */
export function PickerSection({
  value,
  icon: Icon,
  title,
  count,
  linkLabel,
  linkUrl,
  actions,
  children,
}: PickerSectionProps) {
  return (
    <AccordionItem value={value}>
      <AccordionTrigger>
        <span className="flex items-center gap-2">
          <Icon className="size-4 text-primary" />
          {title}
          <span className="text-xs font-normal text-muted-foreground">
            {count}
          </span>
        </span>
      </AccordionTrigger>
      <AccordionContent className="flex flex-col gap-2 px-1 pt-1 pb-5">
        <div className="flex flex-wrap items-center justify-end gap-1">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => void openUrl(linkUrl)}
          >
            <ExternalLink data-icon="inline-start" />
            {linkLabel}
          </Button>
          {actions}
        </div>
        {children}
      </AccordionContent>
    </AccordionItem>
  );
}
