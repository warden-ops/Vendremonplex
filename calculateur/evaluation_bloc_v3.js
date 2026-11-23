// evaluation_bloc_v3.js — VERSION 3 (brouillon à approuver par P-O).
// Ne remplace pas la v1 ni la v2 : evaluation_bloc.js et donnees_v2.js restent intacts.
//
// Source des calculs ajoutés (2026-11-23, America/Toronto) :
//   Le site d'analyse plex-ai.io n'était pas accessible (HTTPS : échec TLS « unrecognized name » ;
//   HTTP : 500 Pingora, corps vide). Aucun dépôt public warden-ops nommé plex / plex-ai / plexio ;
//   warden-ops/Vendremonplex ne contient que le site statique (index.html, CNAME, README).
//   Aucune copie locale du code de plex-ai.io n'a été trouvée.
//   Les formules ci-dessous sont donc portées des Pages Plex.io (calculs dans le navigateur) :
//     - rendement : canvas 4f2296d9-3c28-4635-93d3-7ef120a99ee8
//       (situation actuelle, vue prudente, dépenses détaillées : cash-on-cash, TRI, VAN, MIRR,
//       multiple des capitaux, point mort, limites de zonage saisies)
//     - terrain / valeur résiduelle : canvas ea70c286-dd54-4260-a0ce-fad8fa8ad3bc
//     - gain en capital : déjà couvert par evaluer() v1 (section vendeur)
//
// Envoi toujours désactivé (CONFIG_V3.envoiActif = false). Aucun fetch. Compatible donnees_v2.

import {
  evaluer,
  entreesParDefaut,
  validerEntrees,
  PARAMETERS,
  CHAMPS,
  CONFIG,
  TYPES,
  VILLE_IDS,
  num,
  formatters,
  m,
  pct,
  pct1,
  x,
  comparablesVides,
  comparablesDemo,
  construirePayload,
  envoyerResultats,
} from "./evaluation_bloc.js";

import {
  SCHEMA_VERSION_V2,
  FINALITES,
  CONFIG_V2,
  CHAMPS_CONTACT,
  CHAMPS_V2,
  validerContact,
  construirePayloadV2,
  envoyerResultatsV2,
  RE_COURRIEL,
  RE_TELEPHONE,
  RE_CODE_POSTAL,
} from "./donnees_v2.js";

import zonageReferencesCatalog from "./zonage_references_v3.data.js";

export const SCHEMA_VERSION_V3 = "3.0";

export const CONFIG_V3 = {
  envoiActif: false, // DOIT rester false : aucune approbation de mise en ligne, plex-ai.io inaccessible.
  endpoint: null,
  versionConsentement: null,
};

export const SOURCE_ANALYSE = {
  demandee: "plex-ai.io (site d'analyse)",
  utilisee: "Pages Plex.io (rendement + terrain / valeur résiduelle)",
  dateConstat: "2026-11-23",
  fuseau: "America/Toronto",
  plexAiIoAccessible: false,
  manquant: {
    site: "https://plex-ai.io et https://www.plex-ai.io inaccessibles le 2026-11-23 (HTTPS : échec TLS « unrecognized name » ; HTTP : 500, serveur Pingora, corps vide).",
    depot: "Aucun dépôt public sous warden-ops nommé plex, plex-ai, plexai ou plexio. warden-ops/Vendremonplex (https://github.com/warden-ops/Vendremonplex) ne contient que index.html, CNAME, README.md et .gitattributes — pas le code du site d'analyse.",
    copieLocale: "Aucune copie du code de plex-ai.io n'a été trouvée sous /workspace ni /home/box.",
  },
  pages: {
    rendement: "https://cursor.com/canvas/store-250003d8-ebf9-48c2-ab28-60dd54dda29c/4f2296d9-3c28-4635-93d3-7ef120a99ee8",
    gainCapital: "https://cursor.com/canvas/store-250003d8-ebf9-48c2-ab28-60dd54dda29c/cec7299b-ff7d-45e2-ba89-202ee1e88e27",
    terrain: "https://cursor.com/canvas/store-250003d8-ebf9-48c2-ab28-60dd54dda29c/ea70c286-dd54-4260-a0ce-fad8fa8ad3bc",
  },
  perimetrePorte: "Situation actuelle, vue prudente, dépenses détaillées (pas Monte Carlo, pas courte durée, pas fiscalité après impôt, pas refinancement, pas MLI Select, pas coût évité d'occupant — ces modules existent dans la Page rendement mais ne sont pas portés ici).",
};

const leaf = (value, status, source, date, note) => ({ value, status, source, date, note });
const SRC_REND = "Page Plex.io — rendement (canvas 4f2296d9-3c28-4635-93d3-7ef120a99ee8), lue le 2026-11-23";
const SRC_TERR = "Page Plex.io — terrain, promotion, commercial (canvas ea70c286-dd54-4260-a0ce-fad8fa8ad3bc), lue le 2026-11-23";

// Constantes de la Page terrain (aucune valeur inventée).
export const M2_PI2 = 10.7639; // Page terrain, constante M2_PI2
export const DMI_SHERBROOKE = [[62900, 0.005], [315000, 0.01], [500000, 0.015], [Infinity, 0.03]];

export const PARAMETERS_V3 = {
  version: "3.0",
  sourceAnalyse: SOURCE_ANALYSE,
  m2EnPi2: leaf(M2_PI2, "Déduit", SRC_TERR, "2026-11-23", "Constante M2_PI2 de la Page terrain."),
  // Hypothèses de rendement (valeurs DEF de la Page). Exemple fictif si utilisées telles quelles.
  horizonAns: leaf(10, "Hypothèse", SRC_REND + " (champ horizon, DEF)", "2026-11-23", "Valeur par défaut de la Page rendement. À remplacer par une saisie."),
  croissLoyersPct: leaf(3.1, "Sourcé, utilisé comme hypothèse", SRC_REND + " ; taux de base TAL 2026 (tel que présenté dans la Page)", "2026-11-23", "3,1 % dans DEF (croissLoyers). Ce n'est pas une prévision pour l'immeuble saisi."),
  croissMarchePct: leaf(3.1, "Hypothèse", SRC_REND + " (champ croissMarche, DEF)", "2026-11-23", null),
  rotationPct: leaf(10, "Hypothèse", SRC_REND + " (champ rotation, DEF)", "2026-11-23", "Taux de rotation annuel utilisé pour rattraper le loyer de marché après optimisation. Sans effet en situation actuelle."),
  actuPct: leaf(10, "Hypothèse", SRC_REND + " (champ actu, DEF)", "2026-11-23", "Taux d'actualisation k de la VAN."),
  fraisVentePct: leaf(5, "Hypothèse", SRC_REND + " (champ fraisVente, DEF)", "2026-11-23", null),
  ecartSortiePb: leaf(0, "Hypothèse", SRC_REND + " (champ ecartSortie, DEF)", "2026-11-23", "Écart en points de base ajouté au TGA d'entrée pour le TGA de sortie."),
  tFinPct: leaf(5.84, "Hypothèse", SRC_REND + " (champ tFin, DEF)", "2026-11-23", "Taux de financement du MIRR (trimDe)."),
  tReinvPct: leaf(10, "Hypothèse", SRC_REND + " (champ tReinv, DEF)", "2026-11-23", "Taux de réinvestissement du MIRR."),
  croissDepPct: leaf(3.0, "Hypothèse", SRC_REND + " (champ croissDep, DEF)", "2026-11-23", null),
  notaire: leaf(2000, "Hypothèse", SRC_REND + " (champ notaire, DEF)", "2026-11-23", "Exemple fictif de la Page si non saisi."),
  inspection: leaf(1500, "Hypothèse", SRC_REND + " (champ inspection, DEF)", "2026-11-23", "Exemple fictif de la Page si non saisi."),
  evaluationFrais: leaf(3500, "Hypothèse", SRC_REND + " (champ evaluation, DEF)", "2026-11-23", "Exemple fictif de la Page si non saisi."),
  tvqPrimePct: leaf(9, "Hypothèse", SRC_REND + " (champ tvqPrime, DEF)", "2026-11-23", null),
  rcdMin: leaf(1.20, "Hypothèse", SRC_REND + " (champ rcdMin, DEF)", "2026-11-23", null),
  termeAns: leaf(5, "Hypothèse", SRC_REND + " (champ terme, DEF)", "2026-11-23", null),
  amortAns: leaf(25, "Hypothèse", SRC_REND + " (champ amort, DEF)", "2026-11-23", null),
  misePlexPct: leaf(20, "Hypothèse", SRC_REND + " (TYPE_DEF.plex.mise)", "2026-11-23", "Défaut Page pour un plex. À remplacer par une saisie."),
  miseMultiPct: leaf(25, "Hypothèse", SRC_REND + " (TYPE_DEF.multi.mise)", "2026-11-23", "Défaut Page pour un multilogement. À remplacer par une saisie."),
  tauxPlexPct: leaf(5.34, "Sourcé, utilisé comme hypothèse", SRC_REND + " (TYPE_DEF.plex.taux) ; la Page cite un taux affiché (WOWA, immeuble de placement, novembre 2026)", "2026-11-23", "Source secondaire, à valider. Ne pas présenter comme le taux d'un prêteur pour cet immeuble."),
  tauxMultiPct: leaf(5.84, "Sourcé, utilisé comme hypothèse", SRC_REND + " (TYPE_DEF.multi.taux / DEF)", "2026-11-23", "Source secondaire, à valider."),
  // Terrain / résiduel — défauts DEF clairement fictifs
  coutDurPi2: leaf(225, "Sourcé, utilisé comme hypothèse (source secondaire, à valider)", SRC_TERR + " ; Altus Group, 2026 Canadian Cost Guide, Montréal, bois ≤ 6 étages : 225 $ à 290 $ (la Page cite aussi precedentdevelopments.ca comme reprise secondaire)", "2026-11-23", "Proxy hors Sherbrooke. Pas un coût constaté à Sherbrooke."),
  mousPct: leaf(20, "Hypothèse", SRC_TERR + " (champ mousT, DEF)", "2026-11-23", null),
  margePromoteurPct: leaf(15, "Hypothèse", SRC_TERR + " (champ margeT, DEF)", "2026-11-23", null),
  tauxConstructionPct: leaf(7, "Hypothèse", SRC_TERR + " (champ tauxCT, DEF)", "2026-11-23", null),
  dureeConstructionMois: leaf(18, "Hypothèse", SRC_TERR + " (champ dureeCT, DEF)", "2026-11-23", null),
  tauxPortagePct: leaf(7, "Hypothèse", SRC_TERR + " (champ tauxPort, DEF)", "2026-11-23", null),
  dureePortageAns: leaf(2, "Hypothèse", SRC_TERR + " (champ dureePort, DEF)", "2026-11-23", null),
  inocTerrainPct: leaf(2.7, "Confirmé (pour Sherbrooke, SCHL)", SRC_TERR + " (champ inocT, DEF) ; SCHL, inoccupation Sherbrooke, octobre 2025, tel que déjà retenu en v1", "2026-11-23", "Ne pas appliquer automatiquement à une autre municipalité."),
  depTerrainPct: leaf(30, "Hypothèse", SRC_TERR + " (champ depT, DEF)", "2026-11-23", null),
  tgaTerrainPct: leaf(5.00, "Hypothèse", SRC_TERR + " (champ tgaT, DEF)", "2026-11-23", null),
  redevanceParLogement: leaf(0, "Déduit", SRC_TERR + " ; la Page a lu le règlement 1300 de Sherbrooke (version administrative au 2 sept. 2026) et n'y a trouvé aucune redevance de développement, d'où le champ manuel à 0", "2026-11-23", "À vérifier pour chaque municipalité. Saisie manuelle."),
  dmiSherbrooke: leaf(DMI_SHERBROOKE, "Confirmé", "Ville de Sherbrooke, droits de mutation, barème au 1er janvier 2026 (tel que dans la Page terrain et en v1)", "2026-01-01", "Barème par défaut de la Page terrain. Un autre barème municipal peut être fourni (ville ou baremeDmi)."),
};

// Exemple fictif de la Page rendement (DEF + overlay TYPE_DEF). Ne pas présenter comme un immeuble réel.
export const EXEMPLE_FICTIF_RENDEMENT = {
  avertissement: "Exemple fictif repris des valeurs DEF / TYPE_DEF de la Page rendement Plex.io. Ce n'est pas un immeuble réel.",
  multi: {
    type: "multi", ville: "sherbrooke",
    n0: 0, n1: 0, n2: 4, n3: 2,
    l0: 712, l1: 905, l2: 1062, l3: 1375,
    mk0: 712, mk1: 905, mk2: 1062, mk3: 1375,
    inoc: 2.7, autresRev: 0, prix: 1000000,
    notaire: 2000, inspection: 1500, evaluation: 3500,
    taxesMun: 8000, taxesScol: 1000, assur: 4800, entretien: 3600, reserve: 1800, gestion: 5, autres: 2000,
    mise: 25, primePct: 0, tvqPrime: 9, rcdMin: 1.20, taux: 5.84, terme: 5, tauxRenouv: 5.84, amort: 25,
    horizon: 10, croissLoyers: 3.1, croissMarche: 3.1, rotation: 10, actu: 10, fraisVente: 5, ecartSortie: 0, croissDep: 3.0,
    tFin: 5.84, tReinv: 10, facteur: 1.08, perdus: 0, fraisPret: 0, fraisCourt: 0, evalRole: 0,
    zMax: 8, zCos: 0, zImpl: 45, zEtages: 3, zTerrain: 900, zSupLog: 85, zLotBase: 600, zLotBaseLog: 4, zLotAdd: 90, zCpl: 1, zCases: 7, zMaxCh: 12,
  },
  plex: {
    type: "plex", ville: "sherbrooke",
    n0: 0, n1: 0, n2: 2, n3: 1,
    l0: 712, l1: 905, l2: 1062, l3: 1375,
    mk0: 712, mk1: 905, mk2: 1062, mk3: 1375,
    inoc: 2.7, autresRev: 0, prix: 600000,
    notaire: 2000, inspection: 1500, evaluation: 3500,
    taxesMun: 4500, taxesScol: 500, assur: 2500, entretien: 1800, reserve: 900, gestion: 0, autres: 600,
    mise: 20, primePct: 0, tvqPrime: 9, rcdMin: 1.20, taux: 5.34, terme: 5, tauxRenouv: 5.34, amort: 25,
    horizon: 10, croissLoyers: 3.1, croissMarche: 3.1, rotation: 10, actu: 10, fraisVente: 5, ecartSortie: 0, croissDep: 3.0,
    tFin: 5.84, tReinv: 10, facteur: 1.08, perdus: 0, fraisPret: 0, fraisCourt: 0, evalRole: 0,
    zMax: 4, zCos: 0, zImpl: 45, zEtages: 3, zTerrain: 900, zSupLog: 85, zLotBase: 600, zLotBaseLog: 4, zLotAdd: 90, zCpl: 1, zCases: 4, zMaxCh: 12,
  },
};

// Exemple fictif de la Page terrain (légende de la Page : 2000 m², 600 000 $, Sherbrooke).
export const EXEMPLE_FICTIF_RESIDUEL = {
  avertissement: "Exemple fictif repris des valeurs DEF de la Page terrain Plex.io (terrain de 2 000 m² à 600 000 $, Sherbrooke). Ce n'est pas un terrain réel. Les paramètres de zonage doivent être saisis à partir du règlement officiel.",
  tM2: 2000, prixT: 600000, supLog: 85, loyerT: 2000, inocT: 2.7, depT: 30, tgaT: 5.00,
  coutT: 225, mousT: 20, redevT: 0, tauxCT: 7, dureeCT: 18, margeT: 15,
  valAgri: 60000, taxesT: 6000, tauxPort: 7, dureePort: 2, ville: "sherbrooke", agri: false,
  scenarios: [
    { nom: "Zonage actuel", grille: 8, cos: 0, emprise: 40, etages: 3 },
    { nom: "Modification : 4 étages", grille: 0, cos: 0, emprise: 40, etages: 4 },
    { nom: "Modification : COS de 1,5", grille: 0, cos: 1.5, emprise: 0, etages: 0 },
  ],
};

export const TEXTES_ZONAGE_V3 = {
  statut: "À approuver par P-O",
  avertissement: "Les renseignements sur le zonage fournis ici le sont à titre de référence seulement. Ils peuvent avoir changé. Le règlement officiel de la municipalité a préséance. Vérifiez les normes applicables auprès du service d'urbanisme de la municipalité concernée avant toute décision.\n\nCes renseignements ne constituent pas une promesse de potentiel de développement, ni une assurance qu'une modification au zonage sera accordée, ni un avis juridique ou un avis d'urbanisme. Ils ne remplacent pas la consultation du règlement en vigueur ni une demande officielle auprès de la municipalité.\n\nPrésenté par l'Équipe Chiasson De Francesco, RE/MAX D'ABORD.",
  noteOaciq: "Texte rédigé pour être conforme aux règles de l'OACIQ : aucun emploi des mots « expert » ou « meilleur », aucune urgence artificielle.",
  verificationGenerique: "Vérifiez les normes applicables auprès du service d'urbanisme de la municipalité concernée avant toute décision. Le règlement officiel de la municipalité a préséance.",
};

function iMens(r) { return Math.pow(1 + r / 2, 1 / 6) - 1; }
function paiement(L, i, n) {
  if (n <= 0 || L <= 0) return 0;
  return i > 0 ? (L * i) / (1 - Math.pow(1 + i, -n)) : L / n;
}

export function droitsMutation(p, bareme) {
  let d = 0, prev = 0;
  for (const [lim, taux] of bareme) { if (p > prev) d += (Math.min(p, lim) - prev) * taux; prev = lim; }
  return d;
}

export function dette(pret, r1, r2, amortA, termeA, H) {
  const nm = Math.max(1, Math.round(amortA * 12)), tm = Math.max(1, Math.round(termeA * 12));
  const i1 = iMens(r1), i2 = iMens(r2);
  let bal = pret, pmt = paiement(pret, i1, nm);
  const pmt1 = pmt; let pmt2 = pmt;
  const serv = new Array(H).fill(0);
  const intr = new Array(H).fill(0);
  for (let mo = 1; mo <= H * 12; mo++) {
    if (mo === tm + 1 && tm < nm) { pmt = paiement(bal, i2, nm - tm); pmt2 = pmt; }
    const i = mo <= tm ? i1 : i2;
    if (bal > 0) { const int = bal * i; const pp = Math.min(pmt, bal + int); bal = bal + int - pp; serv[Math.floor((mo - 1) / 12)] += pp; intr[Math.floor((mo - 1) / 12)] += int; }
  }
  return { serv, intr, solde: Math.max(0, bal), pmt1, pmt2 };
}

export function triDe(I, cf) {
  const vanK = (k) => -I + cf.reduce((a, c, i) => a + c / Math.pow(1 + k, i + 1), 0);
  let lo = -0.99, hi = 1.5;
  if (!(I > 0 && vanK(lo) * vanK(hi) < 0)) return null;
  for (let it = 0; it < 200; it++) { const md = (lo + hi) / 2; if (vanK(lo) * vanK(md) <= 0) hi = md; else lo = md; }
  return (lo + hi) / 2;
}

export function trimDe(I, fl, tF, tR) {
  const N = fl.length;
  let vaN = I, vfP = 0;
  fl.forEach((v, i) => { if (v < 0) vaN += -v / Math.pow(1 + tF, i + 1); else vfP += v * Math.pow(1 + tR, N - (i + 1)); });
  return vaN > 0 && vfP > 0 && N > 0 ? Math.pow(vfP / vaN, 1 / N) - 1 : null;
}

export function vanDe(I, cft, k) {
  return -I + cft.reduce((a, v, i) => a + v / Math.pow(1 + k, i + 1), 0);
}

function hasOwn(o, k) { return o != null && Object.prototype.hasOwnProperty.call(o, k) && o[k] !== undefined && o[k] !== ""; }
function nField(e, k, defaut) { return hasOwn(e, k) ? num(e[k]) : defaut; }

function baremeDmiPour(entrees) {
  if (Array.isArray(entrees.baremeDmi) && entrees.baremeDmi.length) {
    return { bareme: entrees.baremeDmi, statut: "Saisi", source: "Barème fourni en entrée", note: null };
  }
  const villeId = entrees.ville || "sherbrooke";
  const v = PARAMETERS.villes[villeId];
  if (v && v.droitsMutation && v.droitsMutation.value) {
    return { bareme: v.droitsMutation.value, statut: v.droitsMutation.status, source: v.droitsMutation.source, note: v.droitsMutation.note || null };
  }
  return { bareme: DMI_SHERBROOKE, statut: PARAMETERS_V3.dmiSherbrooke.status, source: PARAMETERS_V3.dmiSherbrooke.source, note: "Ville inconnue : barème de Sherbrooke de la Page terrain, à remplacer." };
}

/**
 * Limites de zonage de la Page rendement (champs saisis, aucun défaut inventé au-delà de la Page).
 * zCos / zImpl / zMax / zLot* / zCpl à 0 = contrainte non appliquée, comme dans la Page.
 */
export function limitesZonageRendement(entrees = {}, options = {}) {
  const f = entrees;
  const ch = options.type === "chambres" || f.type === "chambres";
  const accessoire = Boolean(options.accessoire);
  const usageCh = options.usageChambresPermis !== false;
  const zT = num(f.zTerrain), zSup = num(f.zSupLog);
  const limites = [];
  if (ch) {
    if (!usageCh) limites.push({ label: "Usage maison de chambres non permis", val: 0 });
    if (num(f.zMaxCh) > 0) limites.push({ label: "Nombre maximal de chambres", val: num(f.zMaxCh) });
  } else {
    if (num(f.zMax) > 0) limites.push({ label: accessoire ? "Maximum de la grille (+1 logement accessoire)" : "Maximum de la grille", val: num(f.zMax) + (accessoire ? 1 : 0) });
    if (num(f.zCos) > 0 && zSup > 0) limites.push({ label: "Densité (COS)", val: Math.floor((num(f.zCos) * zT) / zSup) });
    if (num(f.zImpl) > 0 && num(f.zEtages) > 0 && zSup > 0) limites.push({ label: "Densité (implantation × étages)", val: Math.floor((num(f.zImpl) / 100) * zT * num(f.zEtages) / zSup) });
    if (num(f.zLotBase) > 0) limites.push({ label: "Superficie de terrain exigée", val: zT >= num(f.zLotBase) ? num(f.zLotBaseLog) + (num(f.zLotAdd) > 0 ? Math.floor((zT - num(f.zLotBase)) / num(f.zLotAdd)) : 0) : 0 });
  }
  if (num(f.zCpl) > 0) limites.push({ label: "Stationnement", val: Math.floor(num(f.zCases) / num(f.zCpl)) });
  let permis = Infinity, contrainte = "Aucune limite saisie";
  for (const li of limites) { if (li.val < permis) { permis = li.val; contrainte = li.label; } }
  return { limites, permis, contrainte, source: SRC_REND };
}

export function entreesRendementParDefaut(type = "multi", villeId = "sherbrooke") {
  const base = type === "plex" ? EXEMPLE_FICTIF_RENDEMENT.plex : EXEMPLE_FICTIF_RENDEMENT.multi;
  const o = { ...base, type, ville: villeId, fictif: true };
  const c = PARAMETERS.villes[villeId];
  if (c) {
    [o.l0, o.l1, o.l2, o.l3] = c.loyers.value;
    [o.mk0, o.mk1, o.mk2, o.mk3] = c.loyers.value;
    o.inoc = c.inoc.value;
  }
  return o;
}

/**
 * Indicateurs de rendement — situation actuelle, vue prudente, dépenses détaillées
 * (Page rendement, canvas 4f2296d9-...). Pas d'optimisation (après = faux).
 * Si le prix d'analyse est absent : on reprend la valeur centrale de evaluer() (v1) et on le signale.
 */
export function evaluerRendement(entrees = {}) {
  const typeSaisi = entrees.type === "plex" || entrees.type === "multi" ? entrees.type : null;
  const nProbe = [num(entrees.n0), num(entrees.n1), num(entrees.n2), num(entrees.n3)];
  const nbProbe = nProbe.reduce((a, b) => a + b, 0);
  const type = typeSaisi || (nbProbe >= 5 ? "multi" : "plex");
  const typeStatut = typeSaisi ? "Saisi" : "Déduit";
  const villeId = entrees.ville && PARAMETERS.villes[entrees.ville] ? entrees.ville : "sherbrooke";
  const def = entreesRendementParDefaut(type, villeId);
  const f = { ...def };
  for (const k of Object.keys(def)) if (hasOwn(entrees, k)) f[k] = entrees[k];
  // Alias v1. Le prix d'exemple fictif n'est PAS utilisé si la personne n'a rien saisi :
  // on reprend alors la valeur centrale de evaluer() (v1).
  if (!hasOwn(entrees, "prix") && hasOwn(entrees, "prixAchat")) f.prix = entrees.prixAchat;

  const defautsAppliques = [];
  for (const k of Object.keys(def)) {
    if (k === "prix" || k === "fictif") continue;
    if (!hasOwn(entrees, k) && !(k === "prix" && hasOwn(entrees, "prixAchat"))) {
      defautsAppliques.push(k);
    }
  }

  let prixSource = "saisi";
  if (!(hasOwn(entrees, "prix") || hasOwn(entrees, "prixAchat")) || !(num(f.prix) > 0)) {
    const ev = evaluer({ ...entrees, type, ville: villeId });
    f.prix = ev.rec.c;
    prixSource = "valeur_centrale";
  }

  const n = [num(f.n0), num(f.n1), num(f.n2), num(f.n3)];
  const L = [num(f.l0), num(f.l1), num(f.l2), num(f.l3)];
  const M = [nField(f, "mk0", L[0]), nField(f, "mk1", L[1]), nField(f, "mk2", L[2]), nField(f, "mk3", L[3])];
  const nLoue = n.slice();
  const nbLog = n.reduce((a, b) => a + b, 0);
  const autresRev = num(f.autresRev);
  const P = num(f.prix);
  const tau = num(f.croissLoyers) / 100, mu = num(f.croissMarche) / 100;
  const ge = num(f.croissDep) / 100;
  const H = Math.max(1, Math.min(40, Math.round(num(f.horizon))));
  const k = num(f.actu) / 100;
  const fv = num(f.fraisVente) / 100;
  const taux = num(f.taux) / 100, renouv = num(f.tauxRenouv) / 100;
  const amort = num(f.amort), terme = num(f.terme);

  const vacP = num(f.inoc) / 100;
  const fixeDetail = num(f.taxesMun) + num(f.taxesScol) + num(f.assur) + num(f.entretien) + num(f.reserve) + num(f.autres);
  const gestP = num(f.gestion) / 100;
  const vac = vacP, fixe1 = fixeDetail, gest = gestP;

  const rbpExist = (t2) => {
    let s = 0;
    for (let i = 0; i < n.length; i++) {
      const ip = L[i] * Math.pow(1 + tau, t2 - 1);
      s += nLoue[i] * ip * 12;
    }
    return s + autresRev * Math.pow(1 + tau, t2 - 1);
  };
  const annee = (t2) => {
    const rbpL = rbpExist(t2);
    const rbe = rbpL * (1 - vac);
    const dep = fixe1 * Math.pow(1 + ge, t2 - 1) + gest * rbe;
    return { rbp: rbpL, rbe, dep, rne: rbe - dep, perso: rbe - dep };
  };
  const a1 = annee(1);
  const tga0 = P > 0 ? a1.rne / P : 0;

  const dmiInfo = baremeDmiPour(f);
  const miseF = (P * num(f.mise)) / 100;
  const pretBase = Math.max(0, P - miseF);
  const prime = (pretBase * num(f.primePct)) / 100;
  const pret = pretBase + prime; // prime financée (défaut Page : primeMode = "financee")
  const taxePrime = (prime * num(f.tvqPrime)) / 100;
  const baseDmi = P;
  const dmi = droitsMutation(baseDmi, dmiInfo.bareme);
  const fraisFixes = num(f.notaire) + num(f.inspection) + num(f.evaluation);
  const fraisAcq = dmi + fraisFixes;
  const fraisPretM = (pretBase * (num(f.fraisPret) + num(f.fraisCourt))) / 100;
  const effort = miseF + fraisAcq + taxePrime + fraisPretM;

  const tgaSortie = tga0 + num(f.ecartSortie) / 10000;
  const d = dette(pret, taux, renouv, amort, terme, H);
  const cf = [];
  for (let y = 1; y <= H; y++) cf.push(annee(y).perso - d.serv[y - 1]);
  const revente = tgaSortie > 0 ? annee(H + 1).rne / tgaSortie : 0;
  const reventeNette = revente * (1 - fv) - d.solde;
  const cft = cf.map((v, i) => (i === H - 1 ? v + reventeNette : v));
  const I = effort;
  const van = vanDe(I, cft, k);
  const tri = triDe(I, cft);

  const tFin = num(f.tFin) / 100, tRe = num(f.tReinv) / 100;
  const trim = trimDe(I, cft, tFin, tRe);
  const investi = I + cft.reduce((a, v) => a + (v < 0 ? -v : 0), 0);
  const distrib = cft.reduce((a, v) => a + (v > 0 ? v : 0), 0);
  const multiple = investi > 0 ? distrib / investi : NaN;
  const coc = cf.map((v) => (effort > 0 ? v / effort : 0));
  const serv1 = d.serv[0];
  const pointMort = a1.rbp > 0 ? (a1.dep + serv1) / a1.rbp : NaN;
  const rcd = serv1 > 0 ? a1.rne / serv1 : NaN;

  const zonage = limitesZonageRendement(f, { type });

  return {
    vue: "situation actuelle, vue prudente, dépenses détaillées",
    source: SRC_REND,
    type,
    typeStatut,
    ville: villeId,
    prix: P,
    prixSource,
    nbLog,
    a1,
    tga0,
    tgaSortie,
    rcd,
    pret,
    miseF,
    misePct: P > 0 ? miseF / P : 0,
    prime,
    dmi,
    dmiInfo,
    fraisAcq,
    effort,
    I,
    H,
    k,
    cf,
    cft,
    revente,
    reventeNette,
    solde: d.solde,
    serviceAnnuel: d.serv,
    interetsAnnuels: d.intr,
    pmt1: d.pmt1,
    van,
    tri,
    trim,
    multiple,
    coc,
    cocAn1: coc[0],
    pointMort,
    zonage,
    defautsAppliques,
    avertissementDefauts: defautsAppliques.length
      ? "Des champs non saisis ont été remplis avec les valeurs d'exemple de la Page rendement (exemple fictif / hypothèses). Ils sont listés dans defautsAppliques et doivent être remplacés par une saisie."
      : null,
    meta: { sourceAnalyse: SOURCE_ANALYSE, parametresVersion: PARAMETERS_V3.version },
  };
}

function scenariosResiduel(entrees) {
  if (Array.isArray(entrees.scenarios) && entrees.scenarios.length) {
    return entrees.scenarios.map((s, i) => ({
      j: i + 1,
      nom: s.nom ?? `Scénario ${i + 1}`,
      grille: num(s.grille),
      cos: num(s.cos),
      emprise: num(s.emprise),
      etages: num(s.etages),
    }));
  }
  return [1, 2, 3].map((j) => ({
    j,
    nom: entrees[`s${j}Nom`] ?? `Scénario ${j}`,
    grille: num(entrees[`s${j}Grille`]),
    cos: num(entrees[`s${j}Cos`]),
    emprise: num(entrees[`s${j}Empr`]),
    etages: num(entrees[`s${j}Et`]),
  }));
}

/**
 * Valeur résiduelle du terrain / meilleur usage (Page terrain, canvas ea70c286-...).
 * Paramètres de zonage : champs saisis (grille, COS, emprise, étages). Aucun défaut inventé
 * au-delà de l'exemple fictif clairement identifié (EXEMPLE_FICTIF_RESIDUEL).
 */
export function evaluerResiduel(entrees = {}) {
  const exemple = EXEMPLE_FICTIF_RESIDUEL;
  const keysNum = ["tM2", "prixT", "supLog", "loyerT", "inocT", "depT", "tgaT", "coutT", "mousT", "redevT", "tauxCT", "dureeCT", "margeT", "valAgri", "taxesT", "tauxPort", "dureePort"];
  const f = {};
  const defautsAppliques = [];
  for (const k of keysNum) {
    if (hasOwn(entrees, k)) f[k] = entrees[k];
    else { f[k] = exemple[k]; defautsAppliques.push(k); }
  }
  const hasScen = (Array.isArray(entrees.scenarios) && entrees.scenarios.length) || hasOwn(entrees, "s1Grille") || hasOwn(entrees, "s1Nom");
  const raw = hasScen ? entrees : exemple;
  if (!hasScen) defautsAppliques.push("scenarios");
  const agri = Boolean(entrees.agri);
  const tm2 = num(f.tM2), sup = num(f.supLog), prix = num(f.prixT), tga = num(f.tgaT) / 100;
  const dmiInfo = baremeDmiPour({ ville: entrees.ville, baremeDmi: entrees.baremeDmi });
  const scen = scenariosResiduel(raw).map((s) => {
    const lims = [];
    if (s.grille > 0) lims.push(s.grille);
    if (s.cos > 0 && sup > 0) lims.push(Math.floor((s.cos * tm2) / sup));
    if (s.emprise > 0 && s.etages > 0 && sup > 0) lims.push(Math.floor(((s.emprise / 100) * tm2 * s.etages) / sup));
    const n = lims.length ? Math.min(...lims) : 0;
    const sf = n * sup * M2_PI2;
    const durs = sf * num(f.coutT), mous = (durs * num(f.mousT)) / 100, redev = n * num(f.redevT);
    const rne = n * num(f.loyerT) * 12 * (1 - num(f.inocT) / 100) * (1 - num(f.depT) / 100);
    const V = tga > 0 ? rne / tga : 0;
    const fin = (durs + mous + redev) * (num(f.tauxCT) / 100) * (num(f.dureeCT) / 12) * 0.5;
    const marge = (V * num(f.margeT)) / 100;
    const res = V - durs - mous - redev - fin - marge;
    return { j: s.j, nom: s.nom, grille: s.grille, cos: s.cos, emprise: s.emprise, etages: s.etages, n, sf, durs, mous, redev, rne, V, fin, marge, res, parPorte: n > 0 ? res / n : NaN };
  });
  const best = scen.reduce((a, b) => (b.res > a.res ? b : a), scen[0]);
  const dmiP = droitsMutation(prix, dmiInfo.bareme);
  const portAn = num(f.taxesT) + (prix * num(f.tauxPort)) / 100;
  const port = portAn * num(f.dureePort);
  const prixMaxMarche = best ? best.res - port - dmiP : NaN;
  const prixMax = agri ? num(f.valAgri) - port - dmiP : prixMaxMarche;
  return {
    source: SRC_TERR,
    fictif: defautsAppliques.length > 0,
    avertissement: exemple.avertissement,
    formuleLogements: "Logements = min(grille, ⌊COS × terrain / sup. par logement⌋, ⌊emprise × terrain × étages / sup. par logement⌋)",
    formuleResiduel: "Résiduel = valeur finie − coûts durs − mous − redevances − financement − marge",
    formuleFinancement: "Financement ≈ (durs + mous + redev) × taux × (durée mois / 12) × 50 %",
    formulePrixMax: "Prix maximal = résiduel − portage − droits de mutation",
    scen,
    best,
    dmiP,
    dmiInfo,
    portAn,
    port,
    prixMax,
    prixMaxMarche,
    agri,
    tm2,
    prix,
    soutenable: best ? prixMax >= prix : false,
    defautsAppliques,
    meta: { sourceAnalyse: SOURCE_ANALYSE, parametresVersion: PARAMETERS_V3.version },
  };
}

function normaliserNomVille(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/^(ville|municipalite|canton|township) de /g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const ALIAS_VILLE = {
  sherbrooke: "Sherbrooke",
  magog: "Magog",
  coaticook: "Coaticook",
  "cookshire eaton": "Cookshire-Eaton",
  cookshire: "Cookshire-Eaton",
  windsor: "Windsor",
  "val des sources": "Val-des-Sources",
  asbestos: "Val-des-Sources",
  "lac megantic": "Lac-Mégantic",
  "east angus": "East Angus",
  orford: "Orford",
  "canton d orford": "Orford",
  "north hatley": "North Hatley",
  compton: "Compton",
  waterville: "Waterville",
  stoke: "Stoke",
  "ascot corner": "Ascot Corner",
  "saint denis de brompton": "Saint-Denis-de-Brompton",
  "st denis de brompton": "Saint-Denis-de-Brompton",
  sddb: "Saint-Denis-de-Brompton",
  "val joli": "Val-Joli",
};

function nomMunicipaliteCatalogue(nom) {
  const n = normaliserNomVille(nom);
  if (ALIAS_VILLE[n]) return ALIAS_VILLE[n];
  const entries = zonageReferencesCatalog.entrees || [];
  const exact = entries.find((e) => normaliserNomVille(e.municipalite) === n);
  return exact ? exact.municipalite : null;
}

export function texteVerificationZonage(municipalite, lienPrefere = null) {
  const muni = municipalite && String(municipalite).trim();
  if (!muni) return TEXTES_ZONAGE_V3.verificationGenerique;
  let t = `Vérifiez les normes applicables auprès du service d'urbanisme de ${muni} avant toute décision. Le règlement officiel de la municipalité a préséance.`;
  if (lienPrefere && lienPrefere.url) {
    const typ = lienPrefere.typeDocument ? ` (${lienPrefere.typeDocument})` : "";
    t += ` Consultez : ${lienPrefere.url}${typ}.`;
  }
  return t;
}

const PRIORITE_LIEN = [
  "Grille de spécifications",
  "Grilles d'usage",
  "Carte interactive de zonage",
  "Plan de zonage",
  "Règlement de zonage",
  "Page des règlements d'urbanisme",
  "Page d'urbanisme",
];

function scoreType(t) {
  const i = PRIORITE_LIEN.indexOf(t);
  return i === -1 ? PRIORITE_LIEN.length : i;
}

export function referencesZonage(villeOuNom) {
  const catalogue = zonageReferencesCatalog;
  const nom = nomMunicipaliteCatalogue(villeOuNom);
  const entrees = (catalogue.entrees || []).filter((e) => nom && e.municipalite === nom);
  const preferes = entrees.slice().sort((a, b) => scoreType(a.typeDocument) - scoreType(b.typeDocument));
  const lienPrefere = preferes[0] || null;
  return {
    municipaliteDemandee: villeOuNom || null,
    municipalite: nom,
    correspondance: Boolean(nom && entrees.length),
    entrees,
    lienPrefere,
    texteVerification: texteVerificationZonage(nom || villeOuNom, lienPrefere),
    avertissement: TEXTES_ZONAGE_V3.avertissement,
    statutTexte: TEXTES_ZONAGE_V3.statut,
    dateVerificationCatalogue: catalogue.dateVerification || null,
  };
}

const fini = (v) => (typeof v === "number" ? (Number.isFinite(v) ? v : null) : v);
function finiObj(o, profondeur = 0) {
  if (o == null || profondeur > 6) return o;
  if (typeof o === "number") return fini(o);
  if (Array.isArray(o)) return o.map((x) => finiObj(x, profondeur + 1));
  if (typeof o === "object") {
    const out = {};
    for (const [k, v] of Object.entries(o)) {
      if (k === "meta" || k === "sourceAnalyse") { out[k] = v; continue; }
      out[k] = finiObj(v, profondeur + 1);
    }
    return out;
  }
  return o;
}

export function construirePayloadV3(entrees, resultat, meta = {}) {
  const p = construirePayloadV2(entrees, resultat, meta);
  p.schemaVersion = SCHEMA_VERSION_V3;
  p.parametresVersionV3 = PARAMETERS_V3.version;
  p.sourceAnalyse = { utilisee: SOURCE_ANALYSE.utilisee, plexAiIoAccessible: false, dateConstat: SOURCE_ANALYSE.dateConstat };
  const muni = (meta.contact && meta.contact.municipalite) || entrees?.municipalite || entrees?.ville;
  p.zonage = {
    references: referencesZonage(muni),
    avertissement: TEXTES_ZONAGE_V3.avertissement,
    statutTexte: TEXTES_ZONAGE_V3.statut,
  };
  p.modules = {};
  if (meta.inclureRendement === true) {
    p.modules.rendement = finiObj(evaluerRendement({ ...entrees, ...(meta.rendement || {}) }));
  }
  if (meta.inclureResiduel === true) {
    p.modules.residuel = finiObj(evaluerResiduel(meta.residuel || {}));
  }
  return p;
}

export async function envoyerResultatsV3(payload, options = {}) {
  const cfg = options.config || CONFIG_V3;
  return envoyerResultatsV2(payload, { ...options, config: cfg });
}

export {
  evaluer,
  entreesParDefaut,
  validerEntrees,
  PARAMETERS,
  CHAMPS,
  CONFIG,
  TYPES,
  VILLE_IDS,
  num,
  formatters,
  m,
  pct,
  pct1,
  x,
  comparablesVides,
  comparablesDemo,
  construirePayload,
  envoyerResultats,
  SCHEMA_VERSION_V2,
  FINALITES,
  CONFIG_V2,
  CHAMPS_CONTACT,
  CHAMPS_V2,
  validerContact,
  construirePayloadV2,
  envoyerResultatsV2,
  RE_COURRIEL,
  RE_TELEPHONE,
  RE_CODE_POSTAL,
  zonageReferencesCatalog,
};
