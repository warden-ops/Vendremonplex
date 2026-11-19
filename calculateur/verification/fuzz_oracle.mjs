// Comparaison aléatoire (graine fixe) de evaluation_bloc.js avec l'oracle (copie de la logique de la Page).
// Usage : node verification/fuzz_oracle.mjs [nombre de cas, défaut 3000]
import { evaluer, VILLE_IDS } from "../evaluation_bloc.js";
import { calc } from "./page_oracle.ts";
import { extraire, comparer } from "./extraire.mjs";
import { etatOracle } from "./generer_attendus.mjs";
let s = 20261119; const rnd = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const ri = (a, b) => Math.round(a + rnd() * (b - a));
const N = Number(process.argv[2] || 3000); let mauvais = 0;
for (let i = 0; i < N; i++) {
  const e = { type: pick(["plex", "multi"]), ville: pick(VILLE_IDS), srcMrb: pick(["comps", "manuel"]), srcMrn: pick(["comps", "manuel"]), vendeur: rnd() < 0.5, det: pick(["particulier", "spcc"]), modeImp: pick(["constant", "tranches"]), rp: rnd() < 0.3, demo: rnd() < 0.1 };
  const maybe = (k, v) => { if (rnd() < 0.6) e[k] = v; };
  for (const k of ["n0", "n1", "n2", "n3"]) maybe(k, ri(0, 6));
  for (const k of ["l0", "l1", "l2", "l3"]) maybe(k, ri(400, 2200));
  maybe("inoc", ri(0, 80) / 10); maybe("tga", ri(30, 90) / 10); maybe("ecart", ri(0, 300)); maybe("gestion", ri(0, 8));
  for (const k of ["taxesMun", "assur", "entretien", "reserve", "energie"]) maybe(k, ri(0, 30000));
  for (let j = 1; j <= 5; j++) if (rnd() < 0.6) { e[`c${j}Prix`] = ri(300000, 3000000); e[`c${j}Portes`] = ri(0, 12); e[`c${j}Rbp`] = ri(0, 200000); e[`c${j}Rne`] = ri(0, 120000); e[`c${j}Adj`] = ri(-10, 10); }
  maybe("mrbC", ri(8, 16)); maybe("mrnC", ri(14, 25)); maybe("mrbB", ri(8, 12)); maybe("mrnH", ri(20, 30));
  for (const k of ["wRev", "wPar", "wMrb", "wMrn"]) maybe(k, ri(0, 60)); maybe("arrondi", pick([0, 1000, 5000, 10000]));
  maybe("evalTerrain", ri(0, 300000)); maybe("evalBat", ri(0, 900000)); maybe("evalAnnee", pick([2022, 2025, 2026]));
  maybe("pcLtv", ri(50, 85)); maybe("msAm", pick([25, 30, 35, 40, 50])); maybe("msLtv", pick([65, 70, 75, 80, 85, 90]));
  maybe("prixVente", ri(0, 2000000)); maybe("prixAchat", ri(0, 1500000)); maybe("dpaCum", ri(0, 400000)); maybe("travauxCap", ri(0, 100000)); maybe("solde", ri(0, 800000)); maybe("quote", pick([100, 50, 33.33]));
  maybe("terrainAchat", ri(0, 60)); maybe("terrainVente", pick([0, 20, 40])); maybe("anAchat", ri(2000, 2026)); maybe("autreRev", ri(0, 250000)); maybe("rpPct", ri(0, 100)); maybe("rpAns", ri(0, 20));
  const a = extraire(calc(etatOracle(e))), b = extraire(evaluer(e));
  const d = comparer(a, b);
  if (d.length) { mauvais++; if (mauvais <= 3) console.log("DIFF cas", i, JSON.stringify(e), d.slice(0, 5)); }
}
console.log(`${N} cas aléatoires : ${N - mauvais} identiques à l'oracle, ${mauvais} différents.`);
process.exit(mauvais ? 1 : 0);
