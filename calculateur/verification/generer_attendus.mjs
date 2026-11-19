// Génère ../tests_attendus.json à partir de l'ORACLE (copie de la logique de la Page), pas de evaluation_bloc.js.
// Usage : node verification/generer_attendus.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { calc, etatInitial } from "./page_oracle.ts";
import { extraire } from "./extraire.mjs";

const SEL = ["type", "ville", "srcMrb", "srcMrn", "vendeur", "det", "modeImp", "rp", "demo"];
export function etatOracle(entrees) {
  const sel = {}, extra = {};
  for (const [k, v] of Object.entries(entrees)) (SEL.includes(k) ? sel : extra)[k] = SEL.includes(k) ? v : String(v);
  const type = sel.type ?? "plex", ville = sel.ville ?? "sherbrooke";
  return { ...sel, type, ville, f: etatInitial(type, ville, extra) };
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const { cas } = JSON.parse(readFileSync(new URL("../tests_cas.json", import.meta.url)));
  const out = { _note: "Généré par verification/generer_attendus.mjs depuis verification/page_oracle.ts (copie de la logique de la Page dd69dd2b…, lue le 2026-11-19).", attendus: {} };
  for (const c of cas) out.attendus[c.id] = extraire(calc(etatOracle(c.entrees)));
  writeFileSync(new URL("../tests_attendus.json", import.meta.url), JSON.stringify(out, null, 1));
  console.log("tests_attendus.json écrit pour", cas.length, "cas");
}
