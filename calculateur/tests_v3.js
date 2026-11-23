// tests_v3.js — VERSION 3. Vérifie les ajouts v3 et que les résultats v1 / v2 restent identiques.
import { readFileSync } from "node:fs";
import { evaluer as evaluerV1, CONFIG as CONFIG_V1 } from "./evaluation_bloc.js";
import {
  construirePayloadV2 as payloadV2direct,
  envoyerResultatsV2 as envoyerV2direct,
  CONFIG_V2 as CONFIG_V2direct,
} from "./donnees_v2.js";
import {
  evaluer,
  CONFIG,
  CONFIG_V2,
  CONFIG_V3,
  construirePayloadV2,
  envoyerResultatsV2,
  construirePayloadV3,
  envoyerResultatsV3,
  evaluerRendement,
  limitesZonageRendement,
  evaluerResiduel,
  referencesZonage,
  texteVerificationZonage,
  triDe,
  trimDe,
  vanDe,
  dette,
  droitsMutation,
  DMI_SHERBROOKE,
  M2_PI2,
  EXEMPLE_FICTIF_RENDEMENT,
  EXEMPLE_FICTIF_RESIDUEL,
  TEXTES_ZONAGE_V3,
  SOURCE_ANALYSE,
  SCHEMA_VERSION_V3,
  zonageReferencesCatalog,
  entreesRendementParDefaut,
} from "./evaluation_bloc_v3.js";

const { cas } = JSON.parse(readFileSync(new URL("./tests_cas.json", import.meta.url)));
const { attendus } = JSON.parse(readFileSync(new URL("./tests_attendus.json", import.meta.url)));

let ok = 0, ko = 0;
const echecs = [];
function assert(cond, nom, detail) {
  if (cond) { ok++; return; }
  ko++;
  echecs.push(nom + (detail ? " — " + detail : ""));
  console.error("ÉCHEC:", nom, detail || "");
}

function presque(a, b, eps = 1e-6) {
  if (!Number.isFinite(a) && !Number.isFinite(b)) return true;
  return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= eps * Math.max(1, Math.abs(b));
}

// ── Envoi désactivé, source déclarée ──────────────────────────────────────────
assert(CONFIG_V3.envoiActif === false, "CONFIG_V3.envoiActif reste false");
assert(CONFIG.envoiActif === false && CONFIG_V1.envoiActif === false, "CONFIG v1 inchangé (envoiActif false)");
assert(CONFIG_V2.envoiActif === false && CONFIG_V2direct.envoiActif === false, "CONFIG_V2 inchangé (envoiActif false)");
assert(SOURCE_ANALYSE.plexAiIoAccessible === false, "Source : plex-ai.io déclaré inaccessible");
assert(SOURCE_ANALYSE.utilisee.includes("Plex.io"), "Source utilisée : Pages Plex.io");
assert(SCHEMA_VERSION_V3 === "3.0", "Schéma v3 = 3.0");

// ── Identité v1 : evaluer() réexporté produit les mêmes résultats ─────────────
for (const c of cas) {
  const a = evaluerV1(c.entrees);
  const b = evaluer(c.entrees);
  const att = attendus[c.id];
  assert(presque(a.rec.c, b.rec.c) && presque(a.rne, b.rne) && presque(a.rbp, b.rbp) && presque(a.dep, b.dep), `v1 identique via v3 (${c.id})`, `c ${a.rec.c} vs ${b.rec.c}`);
  if (att) {
    assert(presque(b.rec.c, att.rec.c) && presque(b.rne, att.rne), `v3 respecte tests_attendus.json (${c.id})`);
  }
}

// ── Identité v2 : même payload (horodatages figés) ────────────────────────────
const entreesV2 = cas[0].entrees;
const resV2 = evaluerV1(entreesV2);
const metaV2 = {
  pageOrigine: "https://vendremonplex.com/evaluation",
  horodatage: "2026-11-23T12:00:00.000Z",
  consentement: { caseCochee: { contact: true, statistiques: true }, version: "v2-brouillon-test", horodatage: "2026-11-23T12:00:00.000Z" },
  contact: { prenom: "Marie", nom: "Tremblay", telephone: "819-555-1234", courriel: "marie@example.com", adresseImmeuble: "123 rue King Ouest", municipalite: "Sherbrooke", codePostal: "J1H 1A1" },
  hp: "",
};
const pDirect = payloadV2direct(entreesV2, resV2, metaV2);
const pViaV3 = construirePayloadV2(entreesV2, resV2, metaV2);
assert(JSON.stringify(pDirect) === JSON.stringify(pViaV3), "construirePayloadV2 identique qu'il soit importé de donnees_v2 ou de v3");

// ── Pas de fetch ──────────────────────────────────────────────────────────────
let appelsFetch = 0;
const fetchPiege = async () => { appelsFetch++; throw new Error("fetch ne devrait pas être appelé"); };
const envoi3 = await envoyerResultatsV3(pViaV3, { fetchImpl: fetchPiege });
assert(envoi3.envoye === false, "envoyerResultatsV3 n'envoie rien");
assert(appelsFetch === 0, "envoyerResultatsV3 n'appelle pas fetch");
const envoi2 = await envoyerResultatsV2(pViaV3, { fetchImpl: fetchPiege, config: CONFIG_V2 });
assert(envoi2.envoye === false && appelsFetch === 0, "envoyerResultatsV2 via v3 n'appelle pas fetch");
const envoi2d = await envoyerV2direct(pViaV3, { fetchImpl: fetchPiege });
assert(envoi2d.envoye === false && appelsFetch === 0, "envoyerResultatsV2 direct inchangé");

// ── triDe / VAN / MIRR (formules de la Page, petites séries calculées à la main)
const I = 100;
const cfSimple = [10, 10, 10, 110];
const tri = triDe(I, cfSimple);
assert(tri !== null && presque(tri, 0.10, 1e-9), "triDe d'une série à 10 % exact", String(tri));
const van0 = vanDe(I, cfSimple, 0.10);
assert(presque(van0, 0, 1e-9), "VAN nulle au TRI de 10 %", String(van0));
const van12 = vanDe(I, cfSimple, 0.12);
assert(van12 < 0, "VAN négative si k > TRI");
const mirr = trimDe(I, [50, 50], 0.05, 0.10);
// vaN=100; vfP = 50*(1.10)^1 + 50*(1.10)^0 = 55+50=105; (105/100)^(1/2)-1
const mirrAtt = Math.pow(105 / 100, 1 / 2) - 1;
assert(mirr !== null && presque(mirr, mirrAtt, 1e-12), "trimDe (MIRR) conforme à la Page", `${mirr} vs ${mirrAtt}`);

// ── Dette : 12 paiements en année 1, solde positif ────────────────────────────
const d1 = dette(400000, 0.0534, 0.0534, 25, 5, 10);
assert(d1.serv.length === 10, "dette : 10 années");
assert(presque(d1.serv[0], d1.pmt1 * 12, 1e-6), "dette : service année 1 = 12 × pmt");
assert(d1.solde > 0 && d1.solde < 400000, "dette : solde restant après 10 ans, positif et inférieur au prêt");

// ── Droits de mutation Sherbrooke sur 600 000 $ (exemple Page terrain) ────────
const dmi600 = droitsMutation(600000, DMI_SHERBROOKE);
assert(presque(dmi600, 8610.5, 1e-9), "DMI Sherbrooke sur 600 000 $ = 8 610,50 $", String(dmi600));

// ── Limites de zonage (valeurs DEF multi de la Page rendement) ────────────────
const z = limitesZonageRendement({
  zMax: 8, zCos: 0, zImpl: 45, zEtages: 3, zTerrain: 900, zSupLog: 85,
  zLotBase: 600, zLotBaseLog: 4, zLotAdd: 90, zCpl: 1, zCases: 7,
});
const valDe = (label) => z.limites.find((l) => l.label === label)?.val;
assert(valDe("Maximum de la grille") === 8, "zonage rendement : grille = 8");
assert(z.limites.every((l) => l.label !== "Densité (COS)"), "zonage rendement : COS 0 ignoré");
assert(valDe("Densité (implantation × étages)") === Math.floor((0.45 * 900 * 3) / 85), "zonage rendement : emprise × étages = 14");
assert(valDe("Superficie de terrain exigée") === 4 + Math.floor((900 - 600) / 90), "zonage rendement : règle de lot = 7");
assert(valDe("Stationnement") === 7, "zonage rendement : stationnement = 7");
assert(z.permis === 7 && z.contrainte === "Superficie de terrain exigée", "zonage rendement : permis = 7 (contrainte lot)", `${z.permis} / ${z.contrainte}`);

// Accessoire : +1 au maximum de grille
const zAcc = limitesZonageRendement({ zMax: 4, zCpl: 0 }, { accessoire: true, type: "plex" });
assert(zAcc.limites[0].val === 5, "zonage rendement : +1 logement accessoire");

// ── Résiduel : exemple fictif de la Page, contrôles à la main ─────────────────
assert(M2_PI2 === 10.7639, "Constante M2_PI2 de la Page terrain");
const R = evaluerResiduel(EXEMPLE_FICTIF_RESIDUEL);
assert(R.scen.length === 3, "résiduel : 3 scénarios");
assert(R.scen[0].n === Math.min(8, Math.floor((0.4 * 2000 * 3) / 85)), "résiduel s1 : n = 8");
assert(R.scen[1].n === Math.floor((0.4 * 2000 * 4) / 85), "résiduel s2 : n = 37");
assert(R.scen[2].n === Math.floor((1.5 * 2000) / 85), "résiduel s3 : n = 35");
assert(presque(R.dmiP, 8610.5, 1e-9), "résiduel : DMI = 8 610,50 $");
assert(presque(R.portAn, 6000 + 600000 * 0.07, 1e-9), "résiduel : portage annuel = 48 000 $");
assert(presque(R.port, 96000, 1e-9), "résiduel : portage = 96 000 $");
assert(R.best.j === 2 && R.best.n === 37, "résiduel : meilleur usage = scénario 2 (4 étages)");
assert(presque(R.prixMax, R.best.res - R.port - R.dmiP, 1e-9), "résiduel : prix max = résiduel − portage − DMI");
// Identités d'un scénario
for (const s of R.scen) {
  const rne = s.n * 2000 * 12 * (1 - 0.027) * (1 - 0.30);
  const V = rne / 0.05;
  const sf = s.n * 85 * 10.7639;
  const durs = sf * 225, mous = durs * 0.20, redev = 0;
  const fin = (durs + mous + redev) * 0.07 * (18 / 12) * 0.5;
  const marge = V * 0.15;
  const res = V - durs - mous - redev - fin - marge;
  assert(presque(s.rne, rne) && presque(s.V, V) && presque(s.res, res, 1e-6), `résiduel s${s.j} : formules Page`, `${s.res} vs ${res}`);
}
assert(R.avertissement && /fictif/i.test(R.avertissement), "résiduel : avertissement d'exemple fictif");

const agri = evaluerResiduel({ ...EXEMPLE_FICTIF_RESIDUEL, agri: true });
assert(presque(agri.prixMax, 60000 - 96000 - 8610.5, 1e-9), "résiduel zone agricole : prix max = valAgri − portage − DMI");

// Sans saisie de scénario, l'exemple fictif est utilisé et signalé
const Rdef = evaluerResiduel({ tM2: 2000, prixT: 600000 });
assert(Rdef.fictif === true && Rdef.defautsAppliques.includes("scenarios"), "résiduel : défauts d'exemple fictif clairement signalés");

// ── Rendement : exemple fictif multi, identités internes ──────────────────────
const ex = EXEMPLE_FICTIF_RENDEMENT.multi;
const Y = evaluerRendement(ex);
assert(Y.vue.includes("situation actuelle") && Y.vue.includes("prudente") && Y.vue.includes("détaillées"), "rendement : vue portée = situation actuelle / prudente / détaillée");
assert(Y.prixSource === "saisi" && Y.prix === 1000000, "rendement : prix saisi");
assert(Y.nbLog === 6, "rendement : 6 logements (4×2,5 + 2×3,5)");
assert(Y.H === 10 && Y.cf.length === 10 && Y.cft.length === 10, "rendement : horizon 10, flux annuels");
assert(presque(Y.a1.rbp, 4 * 1062 * 12 + 2 * 1375 * 12, 1e-9), "rendement : RBP année 1", String(Y.a1.rbp));
assert(presque(Y.a1.rbe, Y.a1.rbp * (1 - 0.027), 1e-9), "rendement : RBE = RBP × (1 − inoc)");
const fixe = 8000 + 1000 + 4800 + 3600 + 1800 + 2000;
const dep1 = fixe + 0.05 * Y.a1.rbe;
assert(presque(Y.a1.dep, dep1, 1e-6), "rendement : dépenses détaillées année 1");
assert(presque(Y.a1.rne, Y.a1.rbe - Y.a1.dep, 1e-6), "rendement : RNE = RBE − dépenses");
assert(presque(Y.tga0, Y.a1.rne / Y.prix, 1e-12), "rendement : TGA d'entrée = RNE / prix");
assert(presque(Y.tgaSortie, Y.tga0, 1e-12), "rendement : écart de sortie 0 → même TGA");
assert(presque(Y.effort, Y.I, 1e-12), "rendement : I = effort (pas de travaux en situation actuelle)");
assert(presque(Y.van, vanDe(Y.I, Y.cft, Y.k), 1e-8), "rendement : VAN = −I + Σ CFt/(1+k)^{t}");
assert(Y.tri === null || presque(Y.tri, triDe(Y.I, Y.cft), 1e-12), "rendement : TRI = triDe(I, cft)");
assert(Y.trim === null || presque(Y.trim, trimDe(Y.I, Y.cft, 0.0584, 0.10), 1e-12), "rendement : MIRR = trimDe");
assert(presque(Y.cocAn1, Y.cf[0] / Y.effort, 1e-12), "rendement : cash-on-cash année 1");
assert(Y.coc.every((v, i) => presque(v, Y.cf[i] / Y.effort)), "rendement : série cash-on-cash");
const investi = Y.I + Y.cft.reduce((a, v) => a + (v < 0 ? -v : 0), 0);
const distrib = Y.cft.reduce((a, v) => a + (v > 0 ? v : 0), 0);
assert(presque(Y.multiple, distrib / investi, 1e-12), "rendement : multiple des capitaux");
assert(presque(Y.pointMort, (Y.a1.dep + Y.serviceAnnuel[0]) / Y.a1.rbp, 1e-12), "rendement : point mort");
assert(Y.cft[9] === Y.cf[9] + Y.reventeNette, "rendement : dernière année inclut la revente nette");
assert(presque(Y.reventeNette, Y.revente * (1 - 0.05) - Y.solde, 1e-6), "rendement : revente nette = revente×(1−fv) − solde");

// Prix omis → valeur centrale v1, signalé
const sansPrix = { ...ex };
delete sansPrix.prix;
const Y2 = evaluerRendement(sansPrix);
assert(Y2.prixSource === "valeur_centrale" && Y2.prix > 0, "rendement : prix absent → valeur centrale de evaluer(), signalé");

// Déterministe
const Y3 = evaluerRendement(ex);
assert(Y3.van === Y.van && Y3.tri === Y.tri && Y3.multiple === Y.multiple, "rendement : déterministe");

// Defauts typés plex
const Yp = evaluerRendement(entreesRendementParDefaut("plex", "sherbrooke"));
assert(Yp.type === "plex" && Yp.nbLog === 3 && Yp.prix === 600000, "rendement : exemple fictif plex");

// ── Zonage : catalogue et textes ──────────────────────────────────────────────
assert(Array.isArray(zonageReferencesCatalog.entrees) && zonageReferencesCatalog.entrees.length >= 16, "catalogue zonage : entrées présentes");
assert(zonageReferencesCatalog.entrees.every((e) => e.municipalite && e.typeDocument && e.url && e.dateVerification), "catalogue zonage : champs requis");
assert(zonageReferencesCatalog.entrees.every((e) => e.statutAcces !== "404"), "catalogue zonage : aucun 404 retenu");
assert(zonageReferencesCatalog.liens404Exclus.length === 1, "catalogue zonage : le 404 Lac-Mégantic (PDF Maruche) est consigné comme exclu");
const orford = zonageReferencesCatalog.entrees.filter((e) => e.municipalite === "Orford");
assert(orford.length === 3 && orford.every((e) => e.statutAcces === "delai_ou_tls" && e.aRetravailler === true), "Orford : 3 liens conservés et signalés (délai / TLS)");
assert(zonageReferencesCatalog.liensRetenus === zonageReferencesCatalog.entrees.length, "compteurs du catalogue cohérents");

const refSh = referencesZonage("Sherbrooke");
assert(refSh.correspondance === true && refSh.entrees.length >= 3, "referencesZonage(Sherbrooke) trouve les liens");
assert(refSh.lienPrefere && refSh.lienPrefere.url, "Sherbrooke : lien préféré présent");
assert(refSh.texteVerification.includes("Sherbrooke") && refSh.texteVerification.includes(refSh.lienPrefere.url), "texte UI Sherbrooke contient le lien de la grille ou de la carte");
assert(refSh.avertissement === TEXTES_ZONAGE_V3.avertissement, "avertissement exposé tel quel");
assert(TEXTES_ZONAGE_V3.statut === "À approuver par P-O", "statut du texte d'avertissement");
assert(!/expert|meilleur/i.test(TEXTES_ZONAGE_V3.avertissement), "avertissement : pas de « expert » ni « meilleur »");

const refMag = referencesZonage("magog");
assert(refMag.municipalite === "Magog" && refMag.correspondance, "alias magog → Magog");
const refAsb = referencesZonage("Asbestos");
assert(refAsb.municipalite === "Val-des-Sources" && refAsb.correspondance, "alias Asbestos → Val-des-Sources");
const refGr = referencesZonage("Granby");
assert(refGr.correspondance === false && !refGr.lienPrefere, "Granby (hors Estrie) : pas de correspondance");
assert(!refGr.texteVerification.includes("http"), "sans correspondance : texte générique, sans lien inventé");
assert(texteVerificationZonage(null).includes("municipalité concernée"), "texte générique si municipalité absente");

// Payload v3 : consentement v2 + modules, toujours sans envoi
const p3 = construirePayloadV3(entreesV2, resV2, { ...metaV2, inclureRendement: true, inclureResiduel: true, residuel: EXEMPLE_FICTIF_RESIDUEL, rendement: ex });
assert(p3.schemaVersion === "3.0", "payload v3 : schéma 3.0");
assert(p3.consentement.finalites.includes("contact_evaluation"), "payload v3 : consentement v2 conservé");
assert(p3.identite && p3.identite.prenom === "Marie", "payload v3 : identité si consentement contact");
assert(p3.modules.rendement && Number.isFinite(p3.modules.rendement.van), "payload v3 : module rendement");
assert(p3.modules.residuel && p3.modules.residuel.best.n === 37, "payload v3 : module résiduel");
assert(p3.zonage && p3.zonage.references.municipalite === "Sherbrooke", "payload v3 : références de zonage selon la municipalité du contact");
assert(p3.sourceAnalyse.plexAiIoAccessible === false, "payload v3 : source déclarée");

let threw = false;
try { construirePayloadV3(entreesV2, resV2, { pageOrigine: "https://x.example", consentement: { caseCochee: {}, version: "v", horodatage: "2026-11-23T12:00:00.000Z" } }); }
catch { threw = true; }
assert(threw, "payload v3 : refuse l'absence de consentement (logique v2)");

const envoiP3 = await envoyerResultatsV3(p3, { fetchImpl: fetchPiege });
assert(envoiP3.envoye === false && appelsFetch === 0, "payload v3 : rien n'est envoyé");

console.log(`tests_v3.js : ${ok} succès, ${ko} échec(s)`);
if (ko) {
  for (const e of echecs) console.error(" -", e);
  process.exit(1);
}
