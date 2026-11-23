// tests.js — tests de evaluation_bloc.js, sans dépendance. Exécution : node tests.js
//
// Partie A : 10 cas de calcul (tests_cas.json). Les résultats attendus (tests_attendus.json) ont été calculés par
//            verification/page_oracle.ts, une COPIE de la logique de la Page « Évaluation de bloc » (pas par evaluation_bloc.js).
// Partie B : contrôles manuels indépendants (formules refaites ici à la main).
// Partie C : envoi désactivé par défaut, payload sans donnée nominative, conformité au schéma.
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { evaluer, entreesParDefaut, construirePayload, envoyerResultats, validerEntrees, CONFIG, PARAMETERS, num, CHAMPS } from "./evaluation_bloc.js";
import { extraire, comparer } from "./verification/extraire.mjs";
import { valider } from "./verification/mini_schema.mjs";

const lire = (f) => JSON.parse(readFileSync(new URL(f, import.meta.url), "utf8"));
const { cas } = lire("./tests_cas.json");
const { attendus } = lire("./tests_attendus.json");
const schema = lire("./schema_donnees.json");

let ok = 0, ko = 0;
const echecs = [];
async function t(nom, fn) {
  try { await fn(); ok++; console.log("  ✓", nom); } catch (e) { ko++; echecs.push(nom); console.log("  ✗", nom, "\n    ", String(e.message).split("\n").slice(0, 6).join("\n     ")); }
}
const proche = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)), `${a} ≠ ${b}`);
const enc = (v) => (typeof v === "number" && Number.isNaN(v) ? "NaN" : v);

console.log("A. Cas de calcul comparés à l'oracle (logique de la Page)");
const R = {};
for (const c of cas) {
  await t(`${c.id} — ${c.titre}`, () => {
    const r = evaluer(c.entrees); R[c.id] = r;
    const diffs = comparer(attendus[c.id], extraire(r));
    assert.equal(diffs.length, 0, diffs.slice(0, 8).join("\n"));
  });
}

console.log("B. Contrôles manuels indépendants");
await t("T01 : RBP, RBE, dépenses, RNE refaits à la main (triplex 2 × 4 ½ à 1 062 $ + 1 × 5 ½ à 1 375 $, inoc. 2,7 %, gestion 5 %)", () => {
  const r = R.T01;
  assert.equal(r.rbp, 2 * 1062 * 12 + 1375 * 12);                       // 41 988
  proche(r.rbe, 41988 * (1 - 0.027));                                   // 40 854,324
  proche(r.dep, 4500 + 500 + 2500 + 600 + 1800 + 900 + 40854.324 * 0.05); // 12 842,7162
  proche(r.rne, 40854.324 - 12842.7162);                                // 28 011,6078
});
await t("T01 : seule la méthode du revenu; fourchette 510 000 $ / 560 000 $ / 620 000 $ (RNE/5,5 %, RNE/5 %, RNE/4,5 %, arrondi 5 000 $)", () => {
  const r = R.T01, rne = 28011.6078;
  assert.deepEqual(r.meth.map((q) => q.ok), [true, false, false, false]);
  proche(r.sens[2].v, rne / 0.05); proche(r.meth[0].b, rne / 0.055); proche(r.meth[0].h, rne / 0.045);
  assert.deepEqual([r.rec.b, r.rec.c, r.rec.h], [510000, 560000, 620000]);
  assert.equal(r.vendeur, null, "côté vendeur désactivé => null");
  assert.equal(r.alertes.length, 0);
});
await t("T01 : financement conventionnel investisseur au prix central refait à la main (prêt = min(80 % du prix, prêt max RCD 1,20))", () => {
  const r = R.T01, rne = 28011.6078, i = Math.pow(1 + 0.0534 / 2, 1 / 6) - 1, n = 300;
  const pmax = (rne / 1.2 / 12) * (1 - Math.pow(1 + i, -n)) / i;
  const z = r.fin.find((w) => w.prog.startsWith("Conventionnel") && w.prixLab === "Central");
  proche(z.Lb, Math.min(0.8 * 560000, pmax)); proche(z.mise, 560000 - z.Lb);
  // droits de mutation Sherbrooke 2026 : 0,5 % jusqu'à 62 900; 1 % jusqu'à 315 000; 1,5 % jusqu'à 500 000; 3 % au-delà
  const dmi = 62900 * 0.005 + (315000 - 62900) * 0.01 + (500000 - 315000) * 0.015 + (560000 - 500000) * 0.03;
  proche(z.cash, z.mise + dmi + 2000 + 1500 + 3500);
});
await t("T01 : propriétaire occupant assuré : prêt 90 % du prix, prime 3,10 % du prêt, mise 10 %", () => {
  const z = R.T01.fin.find((w) => w.prog.startsWith("Propriétaire") && w.prixLab === "Central");
  proche(z.Lb, 0.9 * 560000); proche(z.prime, 0.9 * 560000 * 0.031); proche(z.miseP, 0.1); assert.equal(z.rcdApplies, false);
});
await t("T04 : 5 logements => RCD SCHL 1,10; 40 ans => surprime 0,75 point (3 tranches de 5 ans); prime 6,10 % à 85 %", () => {
  const r = R.T04; assert.equal(r.nb, 5);
  const g = r.progs.find((p) => p.id === "ms"); assert.equal(g.rcd, 1.1);
  const z = r.fin.find((w) => w.prog.startsWith("SCHL") && Math.abs(w.Lb / w.P - 0.85) < 1e-9);
  if (z) proche(z.prime / z.Lb, 0.061, 1e-9);
  assert.ok(r.fin.some((w) => w.prog.startsWith("SCHL")));
});
await t("T05 : 8 logements => RCD SCHL 1,30; barème de droits de mutation de Montréal appliqué (liquidités totales)", () => {
  const r = R.T05; assert.equal(r.nb, 8);
  assert.equal(r.progs.find((p) => p.id === "ms").rcd, 1.3);
  const z = r.fin.find((w) => w.prog.startsWith("Conventionnel non assuré") && w.prixLab === "Central");
  const P = r.rec.c, dmi = 62900 * 0.005 + (315000 - 62900) * 0.01 + (552300 - 315000) * 0.015 + (1104700 - 552300) * 0.02 + (P - 1104700) * 0.025;
  proche(z.cash, z.mise + dmi + 7000);
});
await t("T06 : inoccupation 0 % => RBE = RBP; 6 alertes attendues; arrondi 0 => valeurs non arrondies", () => {
  const r = R.T06; assert.equal(r.rbe, r.rbp);
  assert.deepEqual(r.alertes.map((a) => a[0]), ["Assurances absentes", "Dépenses totales sous 25 % des revenus bruts", "Gestion absente ou symbolique", "Aucune inoccupation", "Entretien absent", "Pas de réserve"]);
  assert.notEqual(r.rec.c % 5000, 0);
});
await t("T07 : vendeur ACTIVÉ, produit net de la vente refait à la main (620 000 $, commission 4 % + 14,975 %, notaire 1 500 $)", () => {
  const r = R.T07; assert.ok(r.vendeur && r.vendeur.actif);
  const comm = 620000 * 0.04 * 1.14975; proche(r.vendeur.commission, comm); proche(r.vendeur.produitNetVente, 620000 - comm - 1500);
  proche(r.vendeur.detteEtPenalite, 254000);
  assert.ok(r.vendeur.avertissements.some((a) => a.id === "imr") && r.vendeur.avertissements.some((a) => a.id === "estimation_cpa") && r.vendeur.avertissements.some((a) => a.id === "simplifications"));
  assert.equal(r.vendeur.statut, "Estimé");
});
await t("T08 : SPCC => pas d'avertissement IMR; résidence principale : exemption > 0 ou gain nul; quote-part 50 %", () => {
  const r = R.T08; assert.ok(!r.vendeur.avertissements.some((a) => a.id === "imr")); assert.equal(r.q, 0.5);
  assert.ok(r.exo >= 0);
});
await t("T09 : perte finale avec réallocation 13(21.1) = min(perte finale, gain sur terrain) = 83 153,50 $", () => {
  const r = R.T09; proche(r.realloc, 83153.5);
  assert.ok(r.vendeur.reallocation1321 > 0); assert.equal(r.tvSrc, "rôle"); proche(r.tv, 0.5);
});
await t("T10 : RNE négatif => aucune méthode, fourchette non définie (NaN), aucun financement", () => {
  const r = R.T10; assert.ok(r.rne < 0);
  assert.deepEqual(r.meth.map((q) => q.ok), [false, false, false, false]);
  assert.ok(Number.isNaN(r.rec.c)); assert.equal(r.fin.length, 0);
});
await t("Entrées au format québécois (« 1 062 », « 5,34 % », « 4 500 $ ») équivalentes aux nombres", () => {
  assert.equal(num("1 062"), 1062); assert.equal(num("5,34 %"), 5.34); assert.equal(num("4 500 $"), 4500); assert.equal(num("abc"), 0); assert.equal(num(undefined), 0);
  const a = evaluer({ l2: "1 100", inoc: "3,1" }), b = evaluer({ l2: 1100, inoc: 3.1 });
  assert.equal(a.rne, b.rne);
});
await t("entreesParDefaut : état de départ de la Page (plex Sherbrooke) et rechargement par type et par ville", () => {
  const e = entreesParDefaut("plex", "sherbrooke"); assert.deepEqual([e.n2, e.n3, e.l0, e.l3, e.inoc, e.facteur], [2, 1, 712, 1375, 2.7, 1.08]);
  const m2 = entreesParDefaut("multi", "montreal"); assert.deepEqual([m2.n2, m2.n3, m2.taxesMun, m2.l0, m2.inoc, m2.facteur], [4, 2, 8000, 1005, 2.9, 1]);
  assert.throws(() => entreesParDefaut("plex", "inconnue"), RangeError); assert.throws(() => evaluer({ srcMrb: "x" }), RangeError);
});
await t("Statuts : chaque paramètre de PARAMETERS porte valeur, statut, source et date; statuts valides; secondaires signalés", () => {
  const valides = new Set(["Confirmé", "Déduit", "Estimé", "Hypothèse"]); let n = 0;
  const visite = (o, chemin) => {
    if (o && typeof o === "object" && "status" in o) { n++; assert.ok("value" in o && o.source && o.date, `${chemin} incomplet`); assert.ok(valides.has(o.status), `${chemin} statut`); return; }
    if (o && typeof o === "object" && !Array.isArray(o)) for (const [k, v] of Object.entries(o)) if (!["version", "pageSource", "nom", "tailles"].includes(k)) visite(v, `${chemin}.${k}`);
  };
  visite(PARAMETERS, "PARAMETERS"); assert.ok(n > 100, `seulement ${n} paramètres`);
  for (const k of ["poTaux", "msTaux", "tSpcc"]) assert.equal(PARAMETERS.defauts[k].status, "Estimé");
  assert.match(PARAMETERS.defauts.poTaux.source, /ource secondaire, à valider/); assert.match(PARAMETERS.exemptionIMR2026.source, /ource secondaire, à valider/);
  assert.match(PARAMETERS.repereTgaCbre.source, /source secondaire, à valider/);
});
await t("validerEntrees : défauts valides; zéro logement et valeur hors bornes refusés (proposition web)", () => {
  assert.deepEqual(validerEntrees(entreesParDefaut()).erreurs, []);
  assert.ok(validerEntrees({ n2: 0, n3: 0 }).erreurs.some((e) => e.includes("logement")));
  assert.ok(validerEntrees({ inoc: 150 }).erreurs.length > 0);
});

console.log("C. Envoi désactivé par défaut, payload sans donnée nominative, conformité au schéma");
const consent = { accepte: true, version: "TEST-NON-APPROUVE", horodatage: "2026-11-19T12:00:00-05:00" };
const metaOk = { pageOrigine: "/evaluation-bloc/", consentement: consent, horodatage: "2026-11-19T12:00:01-05:00" };
await t("CONFIG par défaut : envoiActif = false, endpoint = null", () => { assert.equal(CONFIG.envoiActif, false); assert.equal(CONFIG.endpoint, null); });
await t("envoyerResultats : n'appelle JAMAIS fetch quand l'envoi est désactivé (même avec endpoint et consentement fournis)", async () => {
  let appels = 0; const fetchImpl = async () => { appels++; return { ok: true, status: 200 }; };
  const e = entreesParDefaut(); const payload = construirePayload(e, evaluer(e), metaOk);
  const rep = await envoyerResultats(payload, { fetchImpl, endpoint: "https://exemple.invalide/api" });
  assert.equal(rep.envoye, false); assert.equal(appels, 0); assert.match(rep.raison, /désactivé/);
});
await t("envoyerResultats : activé seulement via une configuration explicite (copie), avec endpoint, consentement et honeypot vide", async () => {
  const appels = []; const fetchImpl = async (u, o) => { appels.push([u, o]); return { ok: true, status: 204 }; };
  const e = entreesParDefaut(); const payload = construirePayload(e, evaluer(e), metaOk);
  assert.equal((await envoyerResultats(payload, { fetchImpl, config: { envoiActif: true, endpoint: null } })).envoye, false);
  assert.equal(appels.length, 0);
  const rep = await envoyerResultats(payload, { fetchImpl, config: { envoiActif: true, endpoint: "https://exemple.invalide/api" } });
  assert.equal(rep.envoye, true); assert.equal(appels.length, 1); assert.equal(appels[0][1].method, "POST"); assert.equal(appels[0][1].credentials, "omit");
  assert.equal((await envoyerResultats({ ...payload, hp: "robot" }, { fetchImpl, config: { envoiActif: true, endpoint: "https://exemple.invalide/api" } })).envoye, false);
  assert.equal(appels.length, 1);
  assert.equal(CONFIG.envoiActif, false, "CONFIG globale intacte");
});
await t("construirePayload : refuse sans consentement, sans version de consentement ou sans page d'origine", () => {
  const e = entreesParDefaut(), r = evaluer(e);
  assert.throws(() => construirePayload(e, r, { ...metaOk, consentement: { accepte: false, version: "v" } }), /Consentement/);
  assert.throws(() => construirePayload(e, r, { ...metaOk, consentement: { accepte: true } }), /Version/);
  assert.throws(() => construirePayload(e, r, { consentement: consent }), /pageOrigine/);
});
await t("payload : aucune donnée nominative (adresse, courtier, noms de comparables, dates de comparables) même si saisies", () => {
  const e = { ...entreesParDefaut(), adresse: "123 rue Exemple, Sherbrooke J1H 0A0", prepare: "Prénom Nom", c1Nom: "456 rue Fictive", c1Date: "2026-06", c1Prix: 600000, c1Portes: 3, c1Rbp: 42000 };
  const p = construirePayload(e, evaluer(e), { ...metaOk, secteur: "Mont-Bellevue" }); const s = JSON.stringify(p);
  for (const interdit of ["123 rue", "J1H", "Prénom Nom", "456 rue", "2026-06\"", "adresse", "prepare", "c1Nom", "c1Date"]) assert.ok(!s.includes(interdit), `contient « ${interdit} »`);
  assert.equal(p.localisation.secteur, "Mont-Bellevue"); assert.equal(p.entrees.c1Prix, 600000);
});
await t("payload : un secteur contenant un chiffre (numéro civique, code postal) est supprimé", () => {
  const e = entreesParDefaut(); assert.equal(construirePayload(e, evaluer(e), { ...metaOk, secteur: "123 rue Exemple" }).localisation.secteur, null);
});
await t("payload : volet vendeur absent par défaut même si activé; présent seulement avec inclureVendeur", () => {
  const e = { ...cas.find((c) => c.id === "T07").entrees }; const r = evaluer(e);
  const p0 = construirePayload(e, r, metaOk); assert.equal(p0.resultat.vendeur, null); assert.ok(!("solde" in p0.entrees) && !("prixAchat" in p0.entrees));
  const p1 = construirePayload(e, r, { ...metaOk, inclureVendeur: true }); assert.ok(p1.resultat.vendeur && "solde" in p1.entrees);
});
await t("payload : conforme à schema_donnees.json pour les 10 cas (NaN converti en null; JSON aller-retour identique)", () => {
  for (const c of cas) {
    const e = { ...entreesParDefaut(c.entrees.type, c.entrees.ville), ...c.entrees, demo: false };
    const p = construirePayload(e, evaluer(e), metaOk);
    const p2 = JSON.parse(JSON.stringify(p)); assert.deepEqual(p2, p, `${c.id} : valeur non sérialisable`);
    const err = valider(schema, p2); assert.equal(err.length, 0, `${c.id} : ${err.slice(0, 5).join("; ")}`);
    const pv = construirePayload(e, evaluer(e), { ...metaOk, inclureVendeur: true }); const ev = valider(schema, JSON.parse(JSON.stringify(pv)));
    assert.equal(ev.length, 0, `${c.id} (vendeur) : ${ev.slice(0, 5).join("; ")}`);
  }
});
await t("schéma : refuse une propriété nominative, un honeypot rempli et un consentement faux", () => {
  const e = entreesParDefaut(); const p = JSON.parse(JSON.stringify(construirePayload(e, evaluer(e), metaOk)));
  assert.ok(valider(schema, { ...p, entrees: { ...p.entrees, adresse: "1 rue X" } }).length > 0);
  assert.ok(valider(schema, { ...p, nom: "X" }).length > 0); assert.ok(valider(schema, { ...p, courriel: "a@b.c" }).length > 0);
  assert.ok(valider(schema, { ...p, hp: "x" }).length > 0); assert.ok(valider(schema, { ...p, consentement: { ...p.consentement, accepte: false } }).length > 0);
  assert.ok(valider(schema, { ...p, localisation: { ville: "sherbrooke", secteur: "12 rue X" } }).length > 0);
});
await t("CHAMPS : chaque clé de l'état de départ a une fiche; aucune fiche nominative n'est marquée « envoyée »", () => {
  const cles = new Set(CHAMPS.map((c) => c.cle)); for (const k of Object.keys(entreesParDefaut())) assert.ok(cles.has(k), `fiche manquante : ${k}`);
  for (const c of CHAMPS) if (c.cle === "adresse" || c.cle === "prepare" || /^c\d(Nom|Date)$/.test(c.cle)) assert.equal(c.envoye, "non");
});

console.log(`\nRésultat : ${ok} réussis, ${ko} échoués (sur ${ok + ko})`);
const nCalc = cas.length;
console.log(`dont ${nCalc} cas de calcul comparés à la logique de la Page.`);
if (ko) { console.log("Échecs :", echecs.join(" | ")); process.exit(1); }
