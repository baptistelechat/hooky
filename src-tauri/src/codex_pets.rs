//! Découverte des pets Codex installés dans `~/.codex/pets` (dossier où `npx petdex install`
//! les dépose, cf. README du package `petdex` -- il écrit aussi dans `~/.petdex/pets`, doublon
//! ignoré ici). Un pet = un dossier contenant `pet.json` + une spritesheet `.webp`/`.png`.
//!
//! Les pets viennent d'un store public : `pet.json` est du contenu non fiable. Tout ce qui est
//! contrôlé par l'auteur (chemin de la spritesheet, taille, dimensions) est validé ici avant
//! d'être exposé au webview, et seuls les fichiers validés sont ajoutés au scope du protocole
//! `asset:` (jamais le dossier entier).

use std::io::Read;
use std::path::{Component, Path, PathBuf};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

const MAX_MANIFEST_BYTES: u64 = 64 * 1024;
const MAX_SHEET_BYTES: u64 = 10 * 1024 * 1024;
// Décodée en RGBA, une sheet de 1536 px de large pèse ~11 Mo en mémoire (cf. roadmap, risque
// mémoire) : 3072 px (2x le format standard) plafonne à ~45 Mo, au-delà on refuse.
const MAX_SHEET_WIDTH: u32 = 3072;
const COLUMNS: u32 = 8;
// 9 lignes = format historique (1536x1872), 11 = format v2 exporté par ChatGPT (1536x2288) --
// même cellule 192x208 et mêmes 9 premières lignes d'états, 2 lignes en plus en bas.
const SUPPORTED_ROWS: [u32; 2] = [9, 11];
// Ratio d'une cellule : 192 x 208 px, soit 12:13 en unités réduites.
const CELL_RATIO_WIDTH: u64 = 12;
const CELL_RATIO_HEIGHT: u64 = 13;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct PetManifest {
    display_name: Option<String>,
    description: Option<String>,
    spritesheet_path: Option<String>,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct CodexPet {
    /// Nom du dossier -- identité côté Hooky (l'`id` du JSON peut différer du dossier).
    folder: String,
    display_name: String,
    description: String,
    /// Chemin absolu canonique de la spritesheet, déjà autorisé dans le scope `asset:`.
    spritesheet_path: String,
    /// 9 ou 11 (cf. `SUPPORTED_ROWS`) : nombre de lignes de la grille, 8 colonnes fixes.
    rows: u32,
}

fn pets_dir() -> Option<PathBuf> {
    let home = std::env::var_os("USERPROFILE").or_else(|| std::env::var_os("HOME"))?;
    Some(PathBuf::from(home).join(".codex").join("pets"))
}

/// Lit `width`/`height` dans l'en-tête d'un PNG ou d'un WebP (VP8X, VP8L ou VP8) sans décoder
/// l'image -- évite une dépendance pour 4 offsets fixes. `None` si le format n'est pas reconnu.
fn image_dimensions(header: &[u8]) -> Option<(u32, u32)> {
    if header.len() >= 24 && header.starts_with(b"\x89PNG\r\n\x1a\n") {
        let width = u32::from_be_bytes(header[16..20].try_into().ok()?);
        let height = u32::from_be_bytes(header[20..24].try_into().ok()?);
        return Some((width, height));
    }
    if header.len() >= 30 && &header[0..4] == b"RIFF" && &header[8..12] == b"WEBP" {
        return match &header[12..16] {
            // Canvas étendu : largeur-1 et hauteur-1 sur 24 bits little-endian.
            b"VP8X" => Some((
                1 + u32::from_le_bytes([header[24], header[25], header[26], 0]),
                1 + u32::from_le_bytes([header[27], header[28], header[29], 0]),
            )),
            // Lossless : octet 0x2f puis largeur-1 et hauteur-1 sur 14 bits chacune.
            b"VP8L" if header[20] == 0x2f => {
                let bits = u32::from_le_bytes([header[21], header[22], header[23], header[24]]);
                Some(((bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1))
            }
            // Lossy : start code 9d 01 2a puis largeur et hauteur sur 14 bits (2 bits d'échelle).
            b"VP8 " if header[23..26] == [0x9d, 0x01, 0x2a] => Some((
                u32::from(u16::from_le_bytes([header[26], header[27]]) & 0x3fff),
                u32::from(u16::from_le_bytes([header[28], header[29]]) & 0x3fff),
            )),
            _ => None,
        };
    }
    None
}

/// Nombre de lignes de la grille si les dimensions correspondent à 8 colonnes de cellules
/// 12:13 sur 9 ou 11 lignes (ex. 1536x1872 -> 9, 1536x2288 -> 11), `None` sinon. Compare en
/// proportions plutôt qu'en pixels exacts pour tolérer une mise à l'échelle propre.
fn grid_rows(width: u32, height: u32) -> Option<u32> {
    if width == 0 || width % COLUMNS != 0 || width > MAX_SHEET_WIDTH {
        return None;
    }
    // hauteur = lignes x (largeur / 8) x 13/12  <=>  hauteur x 8 x 12 = largeur x 13 x lignes.
    SUPPORTED_ROWS.into_iter().find(|&rows| {
        u64::from(height) * u64::from(COLUMNS) * CELL_RATIO_WIDTH
            == u64::from(width) * CELL_RATIO_HEIGHT * u64::from(rows)
    })
}

/// Résout `relative` (valeur brute de `spritesheetPath`) dans `pet_dir` en refusant tout ce qui
/// pourrait en sortir : chemin absolu, préfixe de lecteur, `..`. Le chemin est ensuite
/// canonicalisé (résout aussi les liens symboliques) et son appartenance au dossier du pet
/// revérifiée -- la vérification par composants seule ne verrait pas un lien symbolique.
fn resolve_sheet(pet_dir: &Path, relative: &str) -> Result<PathBuf, String> {
    let relative = Path::new(relative);
    if !relative
        .components()
        .all(|component| matches!(component, Component::Normal(_)))
    {
        return Err("spritesheetPath doit être un chemin relatif sans `..`".into());
    }
    let root = pet_dir.canonicalize().map_err(|e| e.to_string())?;
    let sheet = root
        .join(relative)
        .canonicalize()
        .map_err(|e| format!("spritesheet introuvable : {e}"))?;
    if !sheet.starts_with(&root) {
        return Err("spritesheet hors du dossier du pet".into());
    }
    Ok(sheet)
}

fn read_limited(path: &Path, max_bytes: u64) -> Result<Vec<u8>, String> {
    let mut buffer = Vec::new();
    std::fs::File::open(path)
        .map_err(|e| e.to_string())?
        .take(max_bytes + 1)
        .read_to_end(&mut buffer)
        .map_err(|e| e.to_string())?;
    if buffer.len() as u64 > max_bytes {
        return Err(format!("{} dépasse {max_bytes} octets", path.display()));
    }
    Ok(buffer)
}

fn load_pet(pet_dir: &Path) -> Result<CodexPet, String> {
    let folder = pet_dir
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or("nom de dossier illisible")?
        .to_string();

    let manifest: PetManifest =
        serde_json::from_slice(&read_limited(&pet_dir.join("pet.json"), MAX_MANIFEST_BYTES)?)
            .map_err(|e| format!("pet.json invalide : {e}"))?;

    let sheet = resolve_sheet(
        pet_dir,
        manifest
            .spritesheet_path
            .as_deref()
            .unwrap_or("spritesheet.webp"),
    )?;

    let extension = sheet
        .extension()
        .and_then(|ext| ext.to_str())
        .map(str::to_ascii_lowercase);
    if !matches!(extension.as_deref(), Some("webp" | "png")) {
        return Err("la spritesheet doit être un .webp ou un .png".into());
    }
    let size = std::fs::metadata(&sheet).map_err(|e| e.to_string())?.len();
    if size > MAX_SHEET_BYTES {
        return Err(format!("spritesheet trop lourde ({size} octets)"));
    }

    let mut header = [0u8; 32];
    let read = std::fs::File::open(&sheet)
        .and_then(|mut file| file.read(&mut header))
        .map_err(|e| e.to_string())?;
    let (width, height) =
        image_dimensions(&header[..read]).ok_or("en-tête d'image non reconnu")?;
    let rows = grid_rows(width, height).ok_or_else(|| {
        format!("grille non supportée ({width}x{height}, attendu 8x9 ou 8x11 cellules 192x208)")
    })?;

    // `canonicalize` renvoie `\\?\C:\...` sous Windows : préfixe retiré pour `convertFileSrc`
    // côté front (sauf chemin réseau `\\?\UNC\...`, laissé tel quel).
    let sheet = sheet.to_string_lossy();
    let spritesheet_path = sheet
        .strip_prefix(r"\\?\")
        .filter(|rest| !rest.starts_with("UNC\\"))
        .unwrap_or(&sheet)
        .to_string();

    Ok(CodexPet {
        display_name: manifest
            .display_name
            .filter(|name| !name.trim().is_empty())
            .unwrap_or_else(|| folder.clone()),
        description: manifest.description.unwrap_or_default(),
        folder,
        spritesheet_path,
        rows,
    })
}

/// Liste les pets valides de `~/.codex/pets` (scan à chaque appel, pas de cache : un
/// `petdex install` doit apparaître sans redémarrer). Un pet invalide est ignoré avec un log,
/// jamais une erreur -- un dossier absent ou vide est simplement un résultat vide.
#[tauri::command]
pub fn list_codex_pets(app: AppHandle) -> Vec<CodexPet> {
    let Some(dir) = pets_dir() else {
        return Vec::new();
    };
    let Ok(entries) = std::fs::read_dir(&dir) else {
        return Vec::new();
    };

    let mut pets: Vec<CodexPet> = entries
        .flatten()
        .map(|entry| entry.path())
        .filter(|path| path.is_dir())
        .filter_map(|path| match load_pet(&path) {
            Ok(pet) => Some(pet),
            Err(reason) => {
                eprintln!("[codex-pets] {} ignoré : {reason}", path.display());
                None
            }
        })
        .collect();
    pets.sort_by(|a, b| a.folder.cmp(&b.folder));

    // Idempotent (le scope stocke un HashSet) -- rappelé à chaque rescan.
    let scope = app.asset_protocol_scope();
    pets.retain(|pet| match scope.allow_file(&pet.spritesheet_path) {
        Ok(()) => true,
        Err(e) => {
            eprintln!("[codex-pets] {} : scope asset refusé : {e}", pet.folder);
            false
        }
    });
    pets
}

#[cfg(test)]
mod tests {
    use super::*;

    // Les 32 premiers octets réels d'un pet installé (VP8L, 1536x1872).
    const REAL_VP8L_HEADER: [u8; 32] = [
        0x52, 0x49, 0x46, 0x46, 0x2e, 0x05, 0x1c, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38,
        0x4c, 0x21, 0x05, 0x1c, 0x00, 0x2f, 0xff, 0xc5, 0xd3, 0x11, 0x11, 0x8b, 0x6d, 0x24, 0x09,
        0x92, 0x24,
    ];

    fn fake_vp8x(width: u32, height: u32) -> Vec<u8> {
        let mut bytes = Vec::new();
        bytes.extend(b"RIFF\0\0\0\0WEBPVP8X\x0a\0\0\0\0\0\0\0");
        bytes.extend(&(width - 1).to_le_bytes()[..3]);
        bytes.extend(&(height - 1).to_le_bytes()[..3]);
        bytes
    }

    /// Dossier de pet temporaire avec `pet.json` + une sheet 1536x1872 valide.
    fn temp_pet(label: &str, manifest: &str, sheet_name: &str, sheet: &[u8]) -> PathBuf {
        let dir = std::env::temp_dir()
            .join(format!("hooky-pets-{}-{label}", std::process::id()))
            .join("pet");
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        std::fs::write(dir.join("pet.json"), manifest).unwrap();
        std::fs::write(dir.join(sheet_name), sheet).unwrap();
        dir
    }

    #[test]
    fn reads_dimensions_from_a_real_header_and_synthetic_ones() {
        assert_eq!(image_dimensions(&REAL_VP8L_HEADER), Some((1536, 1872)));
        assert_eq!(image_dimensions(&fake_vp8x(1536, 2288)), Some((1536, 2288)));
        assert_eq!(image_dimensions(b"not an image at all, just text.."), None);
    }

    #[test]
    fn grid_rows_accepts_both_formats_and_clean_scales_only() {
        assert_eq!(grid_rows(1536, 1872), Some(9));
        assert_eq!(grid_rows(1536, 2288), Some(11));
        assert_eq!(grid_rows(768, 936), Some(9));
        assert_eq!(grid_rows(1536, 1000), None);
        assert_eq!(grid_rows(4096, 4992), None); // bon ratio mais au-dessus du plafond
    }

    #[test]
    fn loads_a_valid_pet_and_falls_back_to_folder_name() {
        let dir = temp_pet("valid", r#"{"spritesheetPath":"sheet.webp"}"#, "sheet.webp", &REAL_VP8L_HEADER);
        let pet = load_pet(&dir).unwrap();
        assert_eq!(pet.folder, "pet");
        assert_eq!(pet.display_name, "pet");
        assert_eq!(pet.rows, 9);
        assert!(pet.spritesheet_path.ends_with("sheet.webp"));
    }

    #[test]
    fn rejects_paths_escaping_the_pet_folder() {
        for path in ["../secret.webp", "/etc/secret.webp", "C:\\secret.webp", "sub/../../x.webp"] {
            let manifest = format!(r#"{{"spritesheetPath":{path:?}}}"#);
            let dir = temp_pet("escape", &manifest, "sheet.webp", &REAL_VP8L_HEADER);
            assert!(load_pet(&dir).is_err(), "{path} aurait dû être refusé");
        }
    }

    #[test]
    fn rejects_bad_extension_and_bad_dimensions() {
        let dir = temp_pet("ext", r#"{"spritesheetPath":"sheet.gif"}"#, "sheet.gif", &REAL_VP8L_HEADER);
        assert!(load_pet(&dir).is_err());
        let dir = temp_pet("dims", r#"{"spritesheetPath":"sheet.webp"}"#, "sheet.webp", &fake_vp8x(1000, 1000));
        assert!(load_pet(&dir).is_err());
    }
}
