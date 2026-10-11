import { AVATAR_PREVIEW_SIZE } from "@/lib/layout";
import { Plus } from "lucide-react";
import { useRef, type ReactNode, type Ref } from "react";

interface HiddenFileInputProps {
  ref: Ref<HTMLInputElement>;
  /** Attribut `accept` du sélecteur de fichier (ex. "application/json,.json"). */
  accept: string;
  onFileSelected: (file: File) => void;
}

/** `<input type="file">` natif caché, à déclencher via sa ref (`ref.current?.click()`) plutôt
 * qu'un plugin Tauri fs/dialog : le webview lit le fichier directement via `file.text()`,
 * aucune nouvelle capability requise. */
export function HiddenFileInput({
  ref,
  accept,
  onFileSelected,
}: HiddenFileInputProps) {
  return (
    <input
      ref={ref}
      type="file"
      accept={accept}
      className="hidden"
      onChange={(e) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (file) onFileSelected(file);
      }}
    />
  );
}

interface AddAvatarCardProps {
  label: string;
  onClick: () => void;
  children?: ReactNode;
}

/** Carte "+" en fin de grille. Même gabarit que AvatarPickerCard pour rester alignée. */
export function AddAvatarCard({
  label,
  onClick,
  children,
}: AddAvatarCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-muted/30 p-3 text-center text-muted-foreground transition-colors hover:bg-muted/60"
      style={{ minHeight: AVATAR_PREVIEW_SIZE + 44 }}
    >
      {children}
      <Plus className="size-6" />
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

interface AddAvatarFileCardProps {
  label: string;
  accept: string;
  onFileSelected: (file: File) => void;
}

/** Carte "+" qui ouvre le sélecteur de fichier. */
export function AddAvatarFileCard({
  label,
  accept,
  onFileSelected,
}: AddAvatarFileCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <AddAvatarCard label={label} onClick={() => inputRef.current?.click()}>
      <HiddenFileInput
        ref={inputRef}
        accept={accept}
        onFileSelected={onFileSelected}
      />
    </AddAvatarCard>
  );
}
