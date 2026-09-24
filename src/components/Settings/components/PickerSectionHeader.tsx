import { Button } from "@/components/ui/button";
import { openUrl } from "@tauri-apps/plugin-opener";
import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";

interface PickerSectionHeaderProps {
  title: string;
  linkLabel: string;
  linkUrl: string;
  /** Actions supplémentaires (ex. Rafraîchir), après le lien. */
  children?: ReactNode;
}

/** En-tête d'une section du picker : titre à gauche, lien vers le store externe puis actions à
 * droite. Partagé entre la grille des avatars et celle des pets Codex. */
export function PickerSectionHeader({
  title,
  linkLabel,
  linkUrl,
  children,
}: PickerSectionHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={() => void openUrl(linkUrl)}
        >
          <ExternalLink data-icon="inline-start" />
          {linkLabel}
        </Button>
        {children}
      </div>
    </div>
  );
}
