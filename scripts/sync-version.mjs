#!/usr/bin/env node
// Source de vérité : package.json (déjà bumpé par `pnpm version` avant que ce script ne
// tourne, via le hook "version" -- cf. package.json). Propage la même version vers
// tauri.conf.json + Cargo.toml, puis rafraîchit Cargo.lock pour qu'il ne reste pas
// désynchronisé -- `cargo check` (pas `cargo metadata --no-deps`, qui NE réécrit PAS la
// propre entrée du package dans Cargo.lock, constaté en v0.2.0 : Cargo.toml passé à 0.2.0
// mais Cargo.lock resté sur 0.1.0 pour `hooky` lui-même).
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const { version } = JSON.parse(readFileSync("package.json", "utf8"));

// Remplacement texte (pas parse+stringify) pour ne pas reformater tout le fichier --
// même logique que le fix `preserve_order` côté Rust : un bump de version ne doit
// changer qu'une ligne, pas réindenter des blocs qui n'ont pas bougé.
const tauriConfPath = "src-tauri/tauri.conf.json";
const tauriConf = readFileSync(tauriConfPath, "utf8");
writeFileSync(
  tauriConfPath,
  tauriConf.replace(/"version": ".*"/, `"version": "${version}"`),
);

const cargoTomlPath = "src-tauri/Cargo.toml";
const cargoToml = readFileSync(cargoTomlPath, "utf8");
writeFileSync(
  cargoTomlPath,
  cargoToml.replace(/^version = ".*"$/m, `version = "${version}"`),
);

execSync("cargo check", {
  cwd: "src-tauri",
  stdio: "ignore",
});

console.log(
  `Synced version ${version} -> tauri.conf.json, Cargo.toml, Cargo.lock`,
);
