import {
  Bug,
  Headphones,
  PawPrint,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldSeparator,
  FieldTitle,
} from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { useSettings } from "@/hooks/useSettings";
import { ConfigurationField } from "./ConfigurationField";
import { MaintenanceField } from "./MaintenanceField";
import { PetSettingsFields } from "./PetSettingsFields";
import { SoundSettingsFields } from "./SoundSettingsFields";

interface SettingsSectionProps {
  value: string;
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}

/** Section repliable des réglages : même style de titre (`text-sm font-semibold`) que les
 * titres de l'onglet Animation, avec une icône colorée pour ne pas être confondu avec une
 * option ; champs empilés dans un FieldGroup (qui fournit l'espacement et le contexte de
 * container query des champs). `px-1` évite que l'anneau de focus des champs soit rogné par
 * le `overflow-hidden` du panneau. */
function SettingsSection({
  value,
  icon: Icon,
  title,
  children,
}: SettingsSectionProps) {
  return (
    <AccordionItem value={value}>
      <AccordionTrigger>
        <span className="flex items-center gap-2">
          <Icon className="size-4 text-primary" />
          {title}
        </span>
      </AccordionTrigger>
      <AccordionContent className="px-1 pt-1 pb-5">
        <FieldGroup>{children}</FieldGroup>
      </AccordionContent>
    </AccordionItem>
  );
}

/** Réglages persistés, rangés en sections repliables (Pet, Sons, Maintenance) + export/
 * import/reset (ConfigurationField). Stockage localStorage, diffusé aux autres fenêtres via
 * l'event Tauri "hooky-settings" (cf. useSettings). Chaque contrôle applique directement --
 * pas de bouton "Appliquer". Configuration en footer épinglé : reste visible même si le
 * contenu au-dessus défile. */
export function SettingsControls() {
  const [settings, setSettings] = useSettings();

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-hidden">
      <Accordion
        multiple
        defaultValue={["pet"]}
        className="flex-1 overflow-x-hidden overflow-y-auto pr-1"
      >
        <SettingsSection value="pet" icon={PawPrint} title="Pet">
          <PetSettingsFields settings={settings} setSettings={setSettings} />
        </SettingsSection>

        <SettingsSection value="sounds" icon={Headphones} title="Sons">
          <SoundSettingsFields settings={settings} setSettings={setSettings} />
        </SettingsSection>

        <SettingsSection value="maintenance" icon={Wrench} title="Maintenance">
          <MaintenanceField />

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
        </SettingsSection>
      </Accordion>

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
