// evaluation_bloc.js — Calculateur « Évaluation de bloc » (estimation INDICATIVE d'un plex / multilogement)
// Module ES vanilla, sans bibliothèque, sans accès réseau (sauf envoyerResultats, DÉSACTIVÉ par défaut).
//
// Origine : logique reprise à l'identique de la Page « plex-ai.io — Évaluation de bloc (prototype) »
// (canvas dd69dd2b-19a5-4bee-aae7-4fb0b4074466), elle-même bâtie sur les trois Pages Plex.io :
//   4f2296d9-… (rendement), cec7299b-… (gain en capital), ea70c286-… (terrain, commercial, industriel).
// Extraction : 2026-11-19. Statut du fichier : BROUILLON À APPROUVER PAR P-O; rien n'est publié.
//
// Règles : aucune valeur inventée. Chaque paramètre de PARAMETERS porte { value, status, source, date }.
// Statuts : « Confirmé » (source officielle citée), « Déduit » (calculé de données saisies ou de barèmes officiels),
//           « Estimé » (source secondaire, à valider), « Hypothèse » (valeur de travail modifiable).
// Les mentions « source secondaire, à valider » de la Page sont conservées dans `source`.
//
// API publique :
//   evaluer(entrees)                       -> résultat (fonction pure; mêmes champs que le calcul `r` de la Page)
//   entreesParDefaut(type, ville)          -> entrées de départ (équivalent de choisirType / choisirVille de la Page)
//   construirePayload(entrees, resultat, meta) -> objet conforme à schema_donnees.json (sans donnée nominative)
//   envoyerResultats(payload, options)     -> DÉSACTIVÉ par défaut (CONFIG.envoiActif === false)
//   validerEntrees(entrees)                -> { erreurs, avertissements } (PROPOSITION pour la version web)
//   PARAMETERS, CHAMPS, CONFIG, COMPARABLES_DEMO, formatters

// ───────────────────────────── PARAMÈTRES (valeur, statut, source, date) ─────────────────────────────
const p = (value, status, source, date, note) => (note ? { value, status, source, date, note } : { value, status, source, date });

const SRC_SCHL_LOYERS = "SCHL, Québec : loyer moyen selon le nombre de chambres, par centre (oct. 2025); repris de Plex.io";
const SRC_SCHL_INOC = "SCHL, Québec : taux d'inoccupation par centre (oct. 2025); repris de Plex.io";
const SRC_DMI_BASE = "Loi concernant les droits sur les mutations immobilières, art. 2 (LégisQuébec, 2026) : barème de base";

const BASE_DMI = [[62900, 0.005], [315000, 0.01], [Infinity, 0.015]];

function ville(nom, loyers, inoc, fiab, dmi, dmiStat, dmiSrc, fc, fcStat, fcSrc, noteLoyers) {
  return {
    nom,
    loyers: p(loyers, "Confirmé", SRC_SCHL_LOYERS, "2025-10", noteLoyers),
    inoc: p(inoc, "Confirmé", SRC_SCHL_INOC, "2025-10"),
    fiabilite: p(fiab, "Confirmé", "SCHL (cote de fiabilité du centre)", "2025-10"),
    droitsMutation: p(dmi, dmiStat, dmiSrc, "2026", dmiStat === "Confirmé" ? undefined : "Non confirmé dans la Page pour cette ville : à vérifier auprès de la municipalité (taux additionnels possibles)."),
    facteurComparatif: p(fc, fcStat, fcSrc, "2026"),
  };
}

export const PARAMETERS = {
  version: "0.1.0-brouillon-2026-11-19",
  pageSource: "canvas dd69dd2b-19a5-4bee-aae7-4fb0b4074466 (lue le 2026-11-19)",
  villes: {
    sherbrooke: ville("Sherbrooke (RMR)", [712, 905, 1062, 1375], 2.7, "a (excellente)",
      [[62900, 0.005], [315000, 0.01], [500000, 0.015], [Infinity, 0.03]], "Confirmé", "Ville de Sherbrooke, droits de mutation (barème au 1er janvier 2026), sherbrooke.ca; LégisQuébec",
      1.08, "Confirmé", "Ville de Sherbrooke : 1,08 (sherbrooke.ca, relevé dans Plex.io)"),
    magog: ville("Magog (zone de la RMR de Sherbrooke)", [562, 925, 940, 1217], 3.8, "b à d, utiliser avec prudence",
      BASE_DMI, "Hypothèse", SRC_DMI_BASE, 1.00, "Hypothèse", "hypothèse, à vérifier auprès de la Ville de Magog", "Fiabilité SCHL « b à d » : utiliser avec prudence."),
    montreal: ville("Montréal (RMR)", [1005, 1131, 1346, 1625], 2.9, "a",
      [[62900, 0.005], [315000, 0.01], [552300, 0.015], [1104700, 0.02], [2136500, 0.025], [3113000, 0.035], [Infinity, 0.04]], "Confirmé", "Ville de Montréal (montreal.ca); LégisQuébec",
      1.00, "Confirmé", "Ville de Montréal : 1,00 (montreal.ca)"),
    quebec: ville("Québec (RMR)", [855, 1107, 1276, 1464], 2.4, "a à c",
      [[62900, 0.005], [315000, 0.01], [500000, 0.015], [750000, 0.025], [Infinity, 0.03]], "Confirmé", "Ville de Québec (ville.quebec.qc.ca); LégisQuébec",
      1.08, "Confirmé", "Ville de Québec : 1,08 (ville.quebec.qc.ca)"),
    gatineau: ville("Gatineau (partie québécoise de la RMR)", [1046, 1362, 1451, 1508], 3.8, "a à c",
      BASE_DMI, "Hypothèse", SRC_DMI_BASE, 1.00, "Hypothèse", "hypothèse, à vérifier auprès de la Ville de Gatineau"),
    troisrivieres: ville("Trois-Rivières (RMR)", [699, 828, 1017, 1111], 2.7, "a à b",
      BASE_DMI, "Hypothèse", SRC_DMI_BASE, 1.00, "Hypothèse", "hypothèse, à vérifier auprès de la Ville de Trois-Rivières"),
    saguenay: ville("Saguenay (RMR)", [658, 762, 986, 997], 1.3, "a à b",
      BASE_DMI, "Hypothèse", SRC_DMI_BASE, 1.00, "Hypothèse", "hypothèse, à vérifier auprès de la Ville de Saguenay"),
  },
  tailles: ["Studio", "1 chambre (3 ½)", "2 chambres (4 ½)", "3 chambres + (5 ½ +)"],

  // SCHL, grille « logement locatif standard » : [RPV max, construction %, autres fins %]. La Page utilise la colonne « autres fins ».
  primesSchlStandard: p([[0.65, 3.25, 2.60], [0.70, 3.75, 2.85], [0.75, 4.25, 3.35], [0.80, 5.00, 4.35], [0.85, 6.00, 5.35], [0.90, 6.75, 5.90], [0.95, 7.00, 6.15]],
    "Confirmé", "SCHL, Multi-unit Fees and Premiums at a glance (vérifié le 4 nov. 2026); fiche logement locatif standard", "2026-11-04"),
  surprimeAmortissement: p({ pointsParTranche: 0.25, tranche: 5, auDela: 25 }, "Confirmé",
    "SCHL, grille des primes (surprime d'amortissement, reprise telle quelle de la Page; source détaillée non reproduite dans la Page : à revalider)", "2026"),
  rcdSchlStandard: p({ cinqOuSixLogements: 1.10, septEtPlus: 1.30, seuilLogements: 6 }, "Confirmé",
    "SCHL, logement locatif standard : RCD 1,10 (5 ou 6 logements), 1,30 (7 logements et plus, terme de moins de 10 ans)", "2026-11-04"),

  baremesImpot: {
    federal: p([[0, 14], [58523, 20.5], [117045, 26], [181440, 29], [258482, 33]], "Confirmé", "ARC, taux d'imposition fédéraux 2026 (canada.ca)", "2026"),
    quebec: p([[0, 14], [54345, 19], [108680, 24], [132245, 25.75]], "Confirmé", "Revenu Québec, taux d'imposition 2026 des particuliers", "2026"),
  },

  // Valeurs par défaut des champs (clés identiques à celles de la Page). Les nombres remplacent les chaînes « 4 500 » de la Page.
  defauts: {
    // Exemple de départ (plex) et (5 logements et plus)
    n0: p({ plex: 0, multi: 0 }, "Hypothèse", "Exemple Plex.io (triplex fictif : 2 × 4 ½ et 1 × 5 ½; multi : 4 × 4 ½ et 2 × 5 ½), à remplacer par les baux", "2026"),
    n1: p({ plex: 0, multi: 0 }, "Hypothèse", "Exemple Plex.io, à remplacer par les baux", "2026"),
    n2: p({ plex: 2, multi: 4 }, "Hypothèse", "Exemple Plex.io, à remplacer par les baux", "2026"),
    n3: p({ plex: 1, multi: 2 }, "Hypothèse", "Exemple Plex.io, à remplacer par les baux", "2026"),
    taxesMun: p({ plex: 4500, multi: 8000 }, "Hypothèse", "Exemple Plex.io; à remplacer par le compte de taxes", "2026"),
    taxesScol: p({ plex: 500, multi: 1000 }, "Hypothèse", "Exemple Plex.io; à remplacer par le compte de taxes", "2026"),
    assur: p({ plex: 2500, multi: 4800 }, "Hypothèse", "Exemple Plex.io; à remplacer par la prime réelle", "2026"),
    energie: p({ plex: 600, multi: 2000 }, "Hypothèse", "Exemple Plex.io (aires communes, chauffage payé par le propriétaire)", "2026"),
    entretien: p({ plex: 1800, multi: 3600 }, "Hypothèse", "Exemple Plex.io; aucun ratio public fiable pour les plex québécois", "2026"),
    reserve: p({ plex: 900, multi: 1800 }, "Hypothèse", "Exemple Plex.io", "2026"),
    autres: p({ plex: 0, multi: 0 }, "Hypothèse", "Exemple Plex.io (déneigement, conciergerie, contrats)", "2026"),
    gestion: p({ plex: 5, multi: 5 }, "Hypothèse", "Plex.io, version prudente : 5 % du revenu brut effectif, comptée même si autogéré", "2026"),
    autresRev: p(0, "Hypothèse", "À saisir (stationnement, buanderie, rangement)", "2026"),
    // Revenu
    tga: p(5.00, "Hypothèse", "TGA de référence de Plex.io; aucune source publique pour Sherbrooke", "2026"),
    ecart: p(50, "Hypothèse", "Écart de sensibilité en points de base (valeur de travail)", "2026"),
    // MRB / MRN
    mrbB: p(0, "Hypothèse", "Introuvable dans une source publique fiable (constat Plex.io) : aucune valeur par défaut", "2026"),
    mrbC: p(0, "Hypothèse", "Idem", "2026"), mrbH: p(0, "Hypothèse", "Idem", "2026"),
    mrnB: p(0, "Hypothèse", "Idem", "2026"), mrnC: p(0, "Hypothèse", "Idem", "2026"), mrnH: p(0, "Hypothèse", "Idem", "2026"),
    // Rapprochement
    wRev: p(40, "Hypothèse", "Valeur de travail (pondération du revenu)", "2026"),
    wPar: p(30, "Hypothèse", "Valeur de travail (pondération de la parité)", "2026"),
    wMrb: p(15, "Hypothèse", "Valeur de travail (pondération MRB)", "2026"),
    wMrn: p(15, "Hypothèse", "Valeur de travail (pondération MRN)", "2026"),
    arrondi: p(5000, "Hypothèse", "Valeur de travail (arrondi de la fourchette, en $)", "2026"),
    // Évaluation municipale
    evalTerrain: p(0, "Hypothèse", "Rôle d'évaluation, à saisir", "2026"),
    evalBat: p(0, "Hypothèse", "Rôle d'évaluation, à saisir", "2026"),
    evalAnnee: p("", "Hypothèse", "Année du rôle, à saisir", "2026"),
    // Financement acheteur
    pcLtv: p(80, "Hypothèse", "Profils de financement Plex.io (mise de 20 % pour un investisseur non occupant), à valider avec un prêteur", "2026"),
    pcTaux: p(5.34, "Confirmé", "WOWA, taux hypothécaires au Québec, 5 ans fixe, immeuble de placement locatif", "2026-11-03"),
    pcAm: p(25, "Hypothèse", "Profils de financement Plex.io, à valider avec un prêteur", "2026"),
    pcRcd: p(1.20, "Hypothèse", "Profils de financement Plex.io : seuil indicatif; l'exigence réelle varie selon le prêteur", "2026"),
    poLtv: p(90, "Confirmé", "SCHL : 90 % pour 3 ou 4 logements (propriétaire occupant)", "2026"),
    poPrime: p(3.10, "Confirmé", "SCHL, primes d'assurance prêt hypothécaire : 3,10 % à 90 %, 25 ans", "2026"),
    poTaux: p(4.84, "Estimé", "RBC 5 ans assuré, via Ratehub (source secondaire, à valider)", "2026-11-03"),
    poAm: p(25, "Hypothèse", "Amortissement de 25 ans = hypothèse de travail (la prime de 3,10 % est confirmée à 25 ans); la Page n'attribue pas de statut à ce champ", "2026"),
    mcLtv: p(75, "Hypothèse", "Plex.io, à valider avec un prêteur", "2026"),
    mcTaux: p(5.84, "Hypothèse", "5,34 % WOWA + 0,5 point (Plex.io), à confirmer avec un prêteur", "2026-11-03"),
    mcAm: p(25, "Hypothèse", "Plex.io, à valider avec un prêteur", "2026"),
    mcRcd: p(1.20, "Hypothèse", "Plex.io, à valider avec un prêteur", "2026"),
    msLtv: p(85, "Confirmé", "SCHL, logement locatif standard : 85 %", "2026-11-04"),
    msTaux: p(4.64, "Estimé", "OHC 5 ans 3,64 % + 0,5 à 1,0 point; Providon et CCM Lending (source secondaire, à valider)", "2026"),
    msAm: p(40, "Confirmé", "SCHL, logement locatif standard : 40 ans pour un immeuble existant", "2026-11-04"),
    notaire: p(2000, "Hypothèse", "Plex.io", "2026"),
    inspection: p(1500, "Hypothèse", "Plex.io", "2026"),
    evaluation: p(3500, "Hypothèse", "Plex.io", "2026"),
    tvqPrime: p(9, "Confirmé", "Revenu Québec, taxe sur les primes d'assurance : 9 % (9,975 % après le 31 déc. 2026, selon la Page)", "2026"),
    // Vendeur
    prixVente: p(0, "Hypothèse", "0 = valeur centrale de la fourchette", "2026"),
    commission: p(4, "Hypothèse", "Exemple du calculateur de gain en capital; selon le contrat de courtage", "2026"),
    taxesCom: p(14.975, "Confirmé", "Revenu Québec, calcul des taxes : TPS 5 % + TVQ 9,975 %", "2026"),
    notaireV: p(1500, "Hypothèse", "Exemple du calculateur de gain en capital", "2026"),
    solde: p(0, "Hypothèse", "À obtenir du prêteur", "2026"),
    penalite: p(0, "Hypothèse", "À obtenir du prêteur", "2026"),
    prixAchat: p(0, "Hypothèse", "0 = impôt non calculé", "2026"),
    fraisAchat: p(0, "Hypothèse", "À saisir", "2026"),
    travauxCap: p(0, "Hypothèse", "À saisir; le classement des travaux en capital dépend des faits", "2026"),
    dpaCum: p(0, "Hypothèse", "DPA réellement réclamée (T776, TP-128), à saisir", "2026"),
    terrainAchat: p(25, "Hypothèse", "Plex.io; utiliser le rôle à l'achat", "2026"),
    terrainVente: p(0, "Hypothèse", "0 = ratio du rôle saisi", "2026"),
    anAchat: p(2016, "Hypothèse", "Valeur d'exemple de la Page, à saisir", "2026"),
    anVente: p(2026, "Hypothèse", "Valeur d'exemple de la Page", "2026"),
    quote: p(100, "Hypothèse", "Quote-part détenue (%), à saisir", "2026"),
    tm: p(53.31, "Déduit", "Calculé des barèmes officiels 2026 (palier supérieur), Plex.io", "2026"),
    tSpcc: p(50.17, "Estimé", "EY et CQFF 2026 (source secondaire, à valider)", "2026"),
    incl: p(50, "Confirmé", "ARC, Revenu Québec : taux d'inclusion de 50 % (annulation de la hausse, 2025)", "2025"),
    abat: p(16.5, "Confirmé", "Revenu Québec / ARC : abattement du Québec 16,5 %", "2026"),
    autreRev: p(0, "Hypothèse", "Autre revenu imposable de l'année, à saisir", "2026"),
    rpPct: p(0, "Hypothèse", "À saisir", "2026"),
    rpAns: p(0, "Hypothèse", "À saisir", "2026"),
  },

  // Seuils des points de vigilance (repris de Plex.io)
  seuilsAlertes: p({ depensesSousRBP: 0.25, gestionSousRBP: 0.03, ecartFourchette: 1.3, anneeRoleMin: 2026 }, "Hypothèse", "Points de vigilance repris de Plex.io (seuils de travail)", "2026"),
  // Repères textuels affichés seulement (non utilisés dans le calcul)
  exemptionIMR2026: p(181440, "Estimé", "Source secondaire, à valider (calculateur de gain en capital Plex.io)", "2026"),
  repereTgaCbre: p({ montreal: "4,25 % à 4,75 %", quebec: "4,25 % à 6,00 %" }, "Estimé", "CBRE, Canadian Cap Rates & Investment Insights T3 2026, relevé par rentalmath.ca (source secondaire, à valider); immeubles institutionnels, pas les plex de Sherbrooke", "2026"),
};

export const COMPARABLES_DEMO = [
  { nom: "Comparable fictif A (démo)", date: "démo", prix: 960000, portes: 6, rbp: 82000, rne: 0, adj: 2 },
  { nom: "Comparable fictif B (démo)", date: "démo", prix: 1320000, portes: 8, rbp: 110000, rne: 0, adj: -3 },
  { nom: "Comparable fictif C (démo)", date: "démo", prix: 845000, portes: 5, rbp: 69000, rne: 0, adj: 0 },
];

// ───────────────────────────── CONFIGURATION DE L'ENVOI (DÉSACTIVÉ) ─────────────────────────────
export const CONFIG = {
  envoiActif: false,          // DOIT rester false tant que l'hébergeur et la région du backend ne sont pas confirmés (Loi 25) et que P-O n'a pas approuvé.
  endpoint: null,             // URL du backend : INCONNUE à ce jour (voir backend_questions.md). Ne rien inventer.
  versionConsentement: null,  // version du texte de consentement approuvé (à définir)
};

// ───────────────────────────── FORMATTEURS (fr-CA, comme la Page) ─────────────────────────────
const money = new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });
const dec2 = new Intl.NumberFormat("fr-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dec1 = new Intl.NumberFormat("fr-CA", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const m = (v) => (isFinite(v) ? money.format(v) : "n.d.");
export const pct = (v) => (isFinite(v) ? dec2.format(v * 100) + " %" : "n.d.");
export const pct1 = (v) => (isFinite(v) ? dec1.format(v * 100) + " %" : "n.d.");
export const x = (v) => (isFinite(v) && v > 0 ? dec2.format(v) + " ×" : "n.d.");
export const formatters = { m, pct, pct1, x };

// ───────────────────────────── OUTILS NUMÉRIQUES (identiques à la Page) ─────────────────────────────
// num accepte un nombre ou une chaîne au format québécois (« 1 062 », « 5,34 », « 50 % », « 4 500 $ »).
export function num(s) {
  if (s === undefined || s === null) return 0;
  if (typeof s === "number") return isFinite(s) ? s : 0;
  const v = parseFloat(String(s).replace(/[\s\u00a0\u202f$%×]/g, "").replace(",", "."));
  return isFinite(v) ? v : 0;
}
function primeMulti(ltv, amortA) {
  if (ltv <= 0) return 0;
  const grille = PARAMETERS.primesSchlStandard.value;
  let row = grille[grille.length - 1];
  for (const r0 of grille) { if (ltv <= r0[0] + 1e-9) { row = r0; break; } }
  const sp = PARAMETERS.surprimeAmortissement.value;
  const sur = Math.max(0, Math.ceil((amortA - sp.auDela) / sp.tranche - 1e-9)) * sp.pointsParTranche;
  return (row[2] + sur) / 100;
}
function bareme(xv, b) {
  const y = Math.max(0, xv); let s = 0;
  for (let i = 0; i < b.length; i++) {
    const lo = b[i][0]; const hi = i + 1 < b.length ? b[i + 1][0] : Infinity;
    if (y > lo) s += (Math.min(y, hi) - lo) * b[i][1] / 100;
  }
  return s;
}
function impotPerso(xv, abat) { return bareme(xv, PARAMETERS.baremesImpot.federal.value) * (1 - abat) + bareme(xv, PARAMETERS.baremesImpot.quebec.value); }
function droits(pr, tr) {
  let d = 0, prev = 0;
  for (const [lim, taux] of tr) { if (pr > prev) d += (Math.min(pr, lim) - prev) * taux; prev = lim; }
  return d;
}
function iMens(r) { return Math.pow(1 + r / 2, 1 / 6) - 1; }
function paiement(L, i, n) {
  if (n <= 0 || L <= 0) return 0;
  return i > 0 ? (L * i) / (1 - Math.pow(1 + i, -n)) : L / n;
}
function pretMaxFn(rne, rcd, rate, am) {
  const pmt = rcd > 0 ? rne / rcd / 12 : 0;
  if (pmt <= 0) return 0;
  const i = iMens(rate), n = Math.max(1, Math.round(am * 12));
  return i > 0 ? (pmt * (1 - Math.pow(1 + i, -n))) / i : pmt * n;
}
function stats(vs) {
  const ok = vs.filter((v) => isFinite(v) && v > 0);
  if (!ok.length) return { n: 0, min: NaN, moy: NaN, max: NaN };
  return { n: ok.length, min: Math.min(...ok), moy: ok.reduce((a, v) => a + v, 0) / ok.length, max: Math.max(...ok) };
}

// ───────────────────────────── ENTRÉES : défauts, normalisation ─────────────────────────────
export const TYPES = ["plex", "multi"];
export const VILLE_IDS = Object.keys(PARAMETERS.villes);
const COMP_KEYS = ["Nom", "Date", "Prix", "Portes", "Rbp", "Rne", "Adj"];

export function comparablesVides() {
  const o = {};
  for (let j = 1; j <= 5; j++) for (const k of COMP_KEYS) o[`c${j}${k}`] = k === "Nom" || k === "Date" ? "" : 0;
  return o;
}
export function comparablesDemo() {
  const o = {};
  COMPARABLES_DEMO.forEach((c, i) => {
    const j = i + 1;
    o[`c${j}Nom`] = c.nom; o[`c${j}Date`] = c.date; o[`c${j}Prix`] = c.prix; o[`c${j}Portes`] = c.portes; o[`c${j}Rbp`] = c.rbp; o[`c${j}Rne`] = c.rne; o[`c${j}Adj`] = c.adj;
  });
  return o;
}

// Équivalent de l'état de départ de la Page après choisirType(type) puis choisirVille(ville).
export function entreesParDefaut(type = "plex", villeId = "sherbrooke") {
  if (!TYPES.includes(type)) throw new RangeError(`Type d'immeuble inconnu : ${type}`);
  if (!PARAMETERS.villes[villeId]) throw new RangeError(`Ville inconnue : ${villeId}`);
  const D = PARAMETERS.defauts;
  const c = PARAMETERS.villes[villeId];
  const o = { adresse: "", prepare: "", type, ville: villeId, srcMrb: "comps", srcMrn: "comps", vendeur: false, det: "particulier", modeImp: "constant", rp: false, demo: false };
  for (const [k, leaf] of Object.entries(D)) {
    const v = leaf.value;
    o[k] = v !== null && typeof v === "object" ? v[type] : v;
  }
  [o.l0, o.l1, o.l2, o.l3] = c.loyers.value;
  o.inoc = c.inoc.value;
  o.facteur = c.facteurComparatif.value;
  return { ...o, ...comparablesVides() };
}

function normaliser(entrees) {
  const e = entrees || {};
  const type = e.type ?? "plex";
  const villeId = e.ville ?? "sherbrooke";
  const base = entreesParDefaut(type, villeId);
  const out = { ...base };
  for (const k of Object.keys(base)) if (k in e && e[k] !== undefined) out[k] = e[k];
  if (!["comps", "manuel"].includes(out.srcMrb) || !["comps", "manuel"].includes(out.srcMrn)) throw new RangeError("srcMrb et srcMrn doivent valoir « comps » ou « manuel ».");
  if (!["particulier", "spcc"].includes(out.det)) throw new RangeError("det doit valoir « particulier » ou « spcc ».");
  if (!["constant", "tranches"].includes(out.modeImp)) throw new RangeError("modeImp doit valoir « constant » ou « tranches ».");
  for (const k of ["vendeur", "rp", "demo"]) out[k] = Boolean(out[k]);
  return out;
}

// ───────────────────────────── CALCUL (fonction pure) ─────────────────────────────
// Entrées : objet plat (mêmes clés que la Page; nombres ou chaînes au format québécois).
// Sortie  : tous les champs `r` de la Page, plus `fourchette`, `demiEcartPct`, `methodesRetenues`, `reperes`, `municipale`,
//           `financementCentral`, `vendeur` (null si la section est désactivée) et `meta`.
// Valeurs non finies (NaN / Infinity) conservées comme dans la Page; construirePayload les convertit en null.
export function evaluer(entrees) {
  const f = normaliser(entrees);
  const { type, srcMrb, srcMrn, det, modeImp, rp, demo } = f;
  const c = PARAMETERS.villes[f.ville];
  const cDmi = c.droitsMutation.value;
  const S = PARAMETERS.seuilsAlertes.value;

  const n = [num(f.n0), num(f.n1), num(f.n2), num(f.n3)];
  const L = [num(f.l0), num(f.l1), num(f.l2), num(f.l3)];
  const nb = n.reduce((a, v) => a + v, 0);
  const rbp = n.reduce((a, v, i) => a + v * L[i] * 12, 0) + num(f.autresRev);
  const vac = num(f.inoc) / 100;
  const rbe = rbp * (1 - vac);
  const postes = [
    ["Taxes municipales", num(f.taxesMun)], ["Taxes scolaires", num(f.taxesScol)], ["Assurances", num(f.assur)],
    ["Énergie (aires communes, chauffage payé par le propriétaire)", num(f.energie)], ["Entretien et réparations", num(f.entretien)],
    ["Gestion", (rbe * num(f.gestion)) / 100], ["Réserve de remplacement", num(f.reserve)], ["Autres", num(f.autres)],
  ];
  const dep = postes.reduce((a, p0) => a + p0[1], 0);
  const rne = rbe - dep;

  // Méthode du revenu : valeur = RNE / TGA, sensibilité ± écart (points de base)
  const tga = num(f.tga) / 100, ec = num(f.ecart) / 10000;
  const capAt = (g) => (g > 0 ? rne / g : NaN);
  const sens = [-1, -0.5, 0, 0.5, 1].map((k) => ({ g: tga + k * ec, v: capAt(tga + k * ec) }));

  // Comparables (maximum 5; ceux sans prix vendu sont ignorés)
  const comps = [1, 2, 3, 4, 5].map((j) => {
    const g = (k) => num(f[`c${j}${k}`]);
    const pr = g("Prix"), po = g("Portes"), rb = g("Rbp"), rn = g("Rne"), adj = g("Adj") / 100;
    const pa = pr * (1 + adj);
    return { j, nom: f[`c${j}Nom`] || `Comparable ${j}`, date: f[`c${j}Date`] || "", pr, po, rb, rn, adj, pa, ppo: po > 0 ? pa / po : NaN, mrb: rb > 0 ? pa / rb : NaN, mrn: rn > 0 ? pa / rn : NaN, tga: rn > 0 && pa > 0 ? rn / pa : NaN };
  }).filter((q) => q.pr > 0);
  const sPpo = stats(comps.map((q) => q.ppo));
  const sMrb = stats(comps.map((q) => q.mrb));
  const sMrn = stats(comps.map((q) => q.mrn));
  const sTga = stats(comps.map((q) => q.tga));

  const manuel = (bk, ck, hk) => {
    const cc = num(f[ck]);
    if (cc <= 0) return null;
    return { b: num(f[bk]) > 0 ? num(f[bk]) : cc, c: cc, h: num(f[hk]) > 0 ? num(f[hk]) : cc };
  };
  const mMrb = srcMrb === "manuel" ? manuel("mrbB", "mrbC", "mrbH") : sMrb.n ? { b: sMrb.min, c: sMrb.moy, h: sMrb.max } : null;
  const mMrn = srcMrn === "manuel" ? manuel("mrnB", "mrnC", "mrnH") : sMrn.n ? { b: sMrn.min, c: sMrn.moy, h: sMrn.max } : null;

  const meth = [
    { id: "rev", nom: "Revenu : RNE / TGA", base: `RNE ${m(rne)}; TGA ${pct(tga)} ± ${Math.round(ec * 10000)} pb`, b: capAt(tga + ec), c: capAt(tga), h: capAt(tga - ec), w: num(f.wRev), ok: rne > 0 && tga - ec > 0, stat: "Hypothèse", note: "TGA saisi : aucune source publique pour Sherbrooke" },
    { id: "par", nom: "Parité : prix par porte des comparables", base: sPpo.n ? `${sPpo.n} comparable(s); ${m(sPpo.min)} à ${m(sPpo.max)} par porte × ${nb} portes` : "Aucun comparable saisi", b: sPpo.min * nb, c: sPpo.moy * nb, h: sPpo.max * nb, w: num(f.wPar), ok: sPpo.n > 0 && nb > 0, stat: demo ? "Hypothèse" : "Déduit", note: demo ? "comparables fictifs de démonstration" : "déduit des ventes saisies" },
    { id: "mrb", nom: "MRB × revenu brut potentiel", base: mMrb ? `MRB ${x(mMrb.b)} à ${x(mMrb.h)} × RBP ${m(rbp)}` : "Aucun MRB disponible", b: mMrb ? mMrb.b * rbp : NaN, c: mMrb ? mMrb.c * rbp : NaN, h: mMrb ? mMrb.h * rbp : NaN, w: num(f.wMrb), ok: mMrb !== null && rbp > 0, stat: srcMrb === "manuel" || demo ? "Hypothèse" : "Déduit", note: srcMrb === "manuel" ? "MRB saisi" : "déduit des comparables" },
    { id: "mrn", nom: "MRN × revenu net d'exploitation", base: mMrn ? `MRN ${x(mMrn.b)} à ${x(mMrn.h)} × RNE ${m(rne)}` : "Aucun MRN disponible (RNE des comparables non saisi)", b: mMrn ? mMrn.b * rne : NaN, c: mMrn ? mMrn.c * rne : NaN, h: mMrn ? mMrn.h * rne : NaN, w: num(f.wMrn), ok: mMrn !== null && rne > 0, stat: srcMrn === "manuel" || demo ? "Hypothèse" : "Déduit", note: srcMrn === "manuel" ? "MRN saisi" : "déduit des comparables" },
  ];
  // Rapprochement pondéré (bas, central, haut séparément), arrondi comme la Page
  const dispo = meth.filter((q) => q.ok && q.w > 0 && isFinite(q.c));
  const wTot = dispo.reduce((a, q) => a + q.w, 0);
  const arr = num(f.arrondi);
  const rnd = (v) => (arr > 0 && isFinite(v) ? Math.round(v / arr) * arr : v);
  const pond = (k) => (wTot > 0 ? dispo.reduce((a, q) => a + q[k] * q.w, 0) / wTot : NaN);
  const rec = { b: rnd(pond("b")), c: rnd(pond("c")), h: rnd(pond("h")) };

  // Évaluation municipale : référence seulement, exclue du rapprochement
  const evalTot = num(f.evalTerrain) + num(f.evalBat);
  const evalMarche = evalTot * num(f.facteur);

  // Points de vigilance (repris de Plex.io); tuples [titre, précision] comme la Page
  const alertes = [];
  if (num(f.assur) <= 0) alertes.push(["Assurances absentes", "Aucun montant d'assurance n'est saisi."]);
  if (rbp > 0 && dep / rbp < S.depensesSousRBP) alertes.push(["Dépenses totales sous 25 % des revenus bruts", `Dépenses retenues : ${pct(dep / rbp)} du RBP. Un acheteur et son prêteur normaliseront probablement à la hausse.`]);
  if (rbp > 0 && (rbe * num(f.gestion)) / 100 / rbp < S.gestionSousRBP) alertes.push(["Gestion absente ou symbolique", "La gestion est nulle ou inférieure à 3 % des revenus bruts."]);
  if (num(f.inoc) <= 0) alertes.push(["Aucune inoccupation", "Aucun taux d'inoccupation n'est saisi."]);
  if (num(f.entretien) <= 0) alertes.push(["Entretien absent", "Aucun montant d'entretien n'est saisi."]);
  if (num(f.reserve) <= 0) alertes.push(["Pas de réserve", "Aucune réserve de remplacement n'est saisie."]);
  if (num(f.evalAnnee) > 0 && num(f.evalAnnee) < S.anneeRoleMin) alertes.push(["Évaluation municipale d'une année antérieure", `L'évaluation saisie porte sur ${f.evalAnnee}.`]);
  if (demo) alertes.push(["Comparables fictifs", "Les comparables chargés sont des données de démonstration, pas des ventes réelles."]);
  if (rec.h > 0 && rec.b > 0 && rec.h / rec.b > S.ecartFourchette) alertes.push(["Fourchette large", "L'écart entre le haut et le bas dépasse 30 % : les méthodes divergent, à expliquer au client."]);

  // Financement de l'acheteur type (RCD, grille de primes SCHL)
  const rcdS = PARAMETERS.rcdSchlStandard.value;
  const progs = type === "plex"
    ? [
        { id: "pc", label: "Conventionnel, acheteur investisseur", ltv: num(f.pcLtv) / 100, rate: num(f.pcTaux) / 100, am: num(f.pcAm), rcd: num(f.pcRcd), rcdApplies: true, primeFn: () => 0, note: "Mise minimale 20 % pour un investisseur non occupant (Plex.io); RCD 1,20 : hypothèse." },
        { id: "po", label: "Propriétaire occupant, assuré SCHL", ltv: num(f.poLtv) / 100, rate: num(f.poTaux) / 100, am: num(f.poAm), rcd: 0, rcdApplies: false, primeFn: () => num(f.poPrime) / 100, note: "3 ou 4 logements : 90 % de prêt-valeur, prime 3,10 % (SCHL). Qualification selon le revenu personnel de l'acheteur, non calculée ici." },
      ]
    : [
        { id: "mc", label: "Conventionnel non assuré", ltv: num(f.mcLtv) / 100, rate: num(f.mcTaux) / 100, am: num(f.mcAm), rcd: num(f.mcRcd), rcdApplies: true, primeFn: () => 0, note: "75 %, 25 ans, RCD 1,20 : hypothèse à valider avec un prêteur (Plex.io)." },
        { id: "ms", label: "SCHL standard (logement locatif standard)", ltv: num(f.msLtv) / 100, rate: num(f.msTaux) / 100, am: num(f.msAm), rcd: nb <= rcdS.seuilLogements ? rcdS.cinqOuSixLogements : rcdS.septEtPlus, rcdApplies: true, primeFn: (lv) => primeMulti(lv, num(f.msAm)), note: `RCD ${nb <= rcdS.seuilLogements ? "1,10 (5 ou 6 logements)" : "1,30 (7 logements et plus, terme de moins de 10 ans)"}, prime de la grille SCHL avec surprime d'amortissement.` },
      ];
  const fraisAch = num(f.notaire) + num(f.inspection) + num(f.evaluation);
  const tvq = num(f.tvqPrime) / 100;
  const prix = [["Bas", rec.b], ["Central", rec.c], ["Haut", rec.h]];
  const fin = [];
  for (const g of progs) {
    const pmax = g.rcdApplies ? pretMaxFn(rne, g.rcd, g.rate, g.am) : Infinity;
    const pAtMax = g.primeFn(g.ltv);
    const pStar = g.rcdApplies && g.ltv > 0 ? pmax / (1 + pAtMax) / g.ltv : Infinity;
    for (const [lab, P] of prix) {
      if (!(P > 0)) continue;
      let Lb = g.ltv * P, pr = 0;
      for (let it = 0; it < 6; it++) { pr = g.primeFn(Lb / P); Lb = Math.max(0, Math.min(g.ltv * P, g.rcdApplies ? pmax / (1 + pr) : Infinity)); }
      pr = g.primeFn(Lb / P);
      const prime = Lb * pr;
      const serv = paiement(Lb + prime, iMens(g.rate), Math.round(g.am * 12)) * 12;
      const mise = P - Lb;
      fin.push({ prog: g.label, prixLab: lab, P, Lb, prime, mise, miseP: mise / P, cash: mise + droits(P, cDmi) + fraisAch + prime * tvq, rcd: serv > 0 ? rne / serv : NaN, pStar, ok: P <= pStar + 1, rcdApplies: g.rcdApplies, minMise: 1 - g.ltv });
    }
  }

  // Vendeur : produit net et gain en capital (catégorie 1 seulement, comme le calculateur de gain en capital Plex.io)
  const Pv = num(f.prixVente) > 0 ? num(f.prixVente) : rec.c;
  const comm = Pv * (num(f.commission) / 100) * (1 + num(f.taxesCom) / 100);
  const fv = comm + num(f.notaireV);
  const net = Pv - fv;
  const q = num(f.quote) / 100;
  const achat = num(f.prixAchat);
  const base = achat + num(f.fraisAchat);
  const terrA = Math.min(1, Math.max(0, num(f.terrainAchat) / 100));
  const terr = base * terrA;
  const cout = base - terr + num(f.travauxCap);
  const dpa = Math.min(num(f.dpaCum), cout);
  const fnacc = cout - dpa;
  const tvSrc = num(f.terrainVente) > 0 ? "saisie" : evalTot > 0 ? "rôle" : "achat";
  const tv = num(f.terrainVente) > 0 ? num(f.terrainVente) / 100 : evalTot > 0 ? num(f.evalTerrain) / evalTot : terrA;
  const netT = net * tv, netB = net - netT;
  const rec0 = Math.max(0, Math.min(netB, cout) - fnacc);
  let pf = Math.max(0, fnacc - Math.min(netB, cout));
  const gainB = Math.max(0, netB - cout);
  let gainT = netT - terr;
  let realloc = 0;
  if (pf > 0 && gainT > 0) { realloc = Math.min(pf, gainT); pf -= realloc; gainT -= realloc; }
  const gainBrut = gainT + gainB;
  const N = Math.max(1, num(f.anVente) - num(f.anAchat));
  const exo = rp ? Math.max(0, gainBrut) * (num(f.rpPct) / 100) * Math.min(1, (1 + num(f.rpAns)) / N) : 0;
  const G = Math.max(0, (gainBrut - exo) * q);
  const R = rec0 * q, PF = pf * q;
  const TCG = G * (num(f.incl) / 100);
  const baseImp = TCG + R - PF;
  const abat = num(f.abat) / 100;
  const imp = achat <= 0 ? 0 : det === "spcc" ? Math.max(0, baseImp) * (num(f.tSpcc) / 100)
    : modeImp === "tranches" ? impotPerso(num(f.autreRev) + baseImp, abat) - impotPerso(num(f.autreRev), abat)
    : baseImp * (num(f.tm) / 100);
  const dette = (num(f.solde) + num(f.penalite)) * q;
  const netVendeur = net * q - imp - dette;
  const ati = num(f.autreRev) + G + R - PF;

  // ── Compléments d'affichage (mêmes formules que la Page) ──
  const okMeth = meth.filter((z) => z.ok && isFinite(z.c));
  const demiEcartPct = rec.c > 0 ? (rec.h - rec.b) / 2 / rec.c : NaN;
  const poids = (z) => (z.ok && wTot > 0 && z.w > 0 ? z.w / wTot : null); // part de la méthode dans le rapprochement (null = non utilisée)
  const methodesAffichage = meth.map((z) => ({ ...z, poidsPct: poids(z), utilisee: poids(z) !== null }));
  const reperes = {
    tgaImplicite: rec.c > 0 ? rne / rec.c : NaN,
    mrbImplicite: rbp > 0 ? rec.c / rbp : NaN,
    mrnImplicite: rne > 0 ? rec.c / rne : NaN,
    prixParPorte: nb > 0 ? rec.c / nb : NaN,
    valeurCentraleSurEvalMunicipale: evalTot > 0 ? rec.c / evalTot : NaN,
  };
  const municipale = {
    total: evalTot, marche: evalMarche, partTerrain: evalTot > 0 ? num(f.evalTerrain) / evalTot : NaN,
    ratioCentral: evalTot > 0 ? rec.c / evalTot : NaN,
    ratioBas: evalTot > 0 ? rec.b / evalMarche : NaN, ratioHaut: evalTot > 0 ? rec.h / evalMarche : NaN,
    referenceSeulement: true,
  };
  const financementCentral = fin.filter((z) => z.prixLab === "Central").map((z) => ({ programme: z.prog, miseP: z.miseP, rcd: z.rcdApplies ? z.rcd : null, ok: z.ok, message: z.ok ? "mise minimale suffisante" : "mise plus élevée requise" }));

  let vendeur = null;
  if (f.vendeur) {
    const avert = [{ id: "estimation_cpa", texte: "Estimation seulement, à valider avec un CPA." }];
    if (det === "particulier" && achat > 0) avert.push({ id: "imr", texte: `Impôt minimum de remplacement : depuis 2024, le revenu imposable rajusté de l'IMR fédéral inclut 100 % des gains en capital; base approximative ici ${m(ati)}, à comparer à l'exemption de base (181 440 $ en 2026 : source secondaire, à valider). L'IMR n'est pas calculé. La DPA à saisir est celle réellement réclamée; le classement des travaux en capital dépend des faits.` });
    avert.push({ id: "simplifications", texte: "Simplifications reprises du calculateur de gain en capital : catégorie 1 seulement, un seul immeuble dans la catégorie, 13(21.1) au calcul A, exemption de résidence principale par la formule (1 + années désignées) / années de détention, sans IMR ni réserve. Ce n'est pas un avis fiscal." });
    vendeur = {
      actif: true, prixVenteRetenu: Pv, commission: comm, fraisVente: fv, produitNetVente: net, impotCalcule: achat > 0,
      sourceTerrainVente: tvSrc, partTerrainVente: tv, coutCapitalBatiment: cout, fnacc, recuperationDpa: R, perteFinale: PF, reallocation1321: realloc,
      gainCapitalAvantExemption: gainBrut, exemptionResidencePrincipale: exo, gainCapitalApresQuotePart: G, gainImposable: TCG, impotEstime: imp,
      detteEtPenalite: dette, produitNetVendeur: netVendeur, baseImrApprox: ati, avertissements: avert,
      statut: "Estimé", note: "Estimation à valider avec un CPA; section désactivée par défaut.",
    };
  }

  return {
    // champs identiques à `r` de la Page
    c, n, L, nb, rbp, vac, rbe, postes, dep, rne, tga, ec, sens, comps, sPpo, sMrb, sMrn, sTga, meth, wTot, rec, evalTot, evalMarche, alertes,
    progs, fin, fraisAch, Pv, comm, fv, net, q, achat, terr, cout, dpa, fnacc, tv, tvSrc, netT, netB, rec0, pf, gainB, gainT, realloc, gainBrut, N, exo, G, R, PF, TCG, baseImp, imp, dette, netVendeur, ati,
    // compléments
    fourchette: { bas: rec.b, central: rec.c, haut: rec.h, arrondi: arr, nbMethodesUtilisees: okMeth.length, nbMethodes: 4 },
    demiEcartPct, methodesAffichage, reperes, municipale, financementCentral, vendeur,
    statuts: {
      inoccupation: PARAMETERS.villes[f.ville].inoc.value === num(f.inoc) ? "Confirmé" : "Hypothèse",
      facteurComparatif: PARAMETERS.villes[f.ville].facteurComparatif.status,
      droitsMutation: PARAMETERS.villes[f.ville].droitsMutation.status,
      tga: "Hypothèse", depenses: "Hypothèse",
    },
    meta: { parametresVersion: PARAMETERS.version, estimationIndicative: true },
  };
}

// ───────────────────────────── VALIDATION (PROPOSITION pour la version web; la Page ne valide rien) ─────────────────────────────
export function validerEntrees(entrees) {
  const erreurs = [], avertissements = [];
  let f;
  try { f = normaliser(entrees); } catch (e) { return { erreurs: [e.message], avertissements }; }
  for (const ch of CHAMPS) {
    if (ch.type === "choix" || ch.type === "booleen" || ch.type === "texte") continue;
    const brut = f[ch.cle];
    if (typeof brut === "string" && brut.trim() !== "" && !isFinite(parseFloat(brut.replace(/[\s\u00a0\u202f$%×]/g, "").replace(",", ".")))) { erreurs.push(`${ch.etiquette} : valeur non numérique.`); continue; }
    const v = num(brut);
    if (ch.min !== null && ch.min !== undefined && v < ch.min) erreurs.push(`${ch.etiquette} : minimum ${ch.min}.`);
    if (ch.max !== null && ch.max !== undefined && v > ch.max) erreurs.push(`${ch.etiquette} : maximum ${ch.max}.`);
  }
  const nb = ["n0", "n1", "n2", "n3"].reduce((a, k) => a + num(f[k]), 0);
  if (!(nb > 0)) erreurs.push("Indiquez au moins un logement.");
  if (f.type === "plex" && (nb < 2 || nb > 4)) avertissements.push("Le type « plex » vise 2 à 4 logements.");
  if (f.type === "multi" && nb < 5) avertissements.push("Le type « 5 logements et plus » vise 5 logements ou plus.");
  return { erreurs, avertissements };
}

// ───────────────────────────── CHAMPS (source unique de champs.json / champs.md) ─────────────────────────────
// Bornes, « obligatoire » et « envoye » : PROPOSITIONS pour la version web (la Page n'impose rien). Étiquettes : reprises de la Page.
const D = PARAMETERS.defauts;
const defDe = (k) => { const v = D[k].value; return v !== null && typeof v === "object" ? v.plex : v; };
const ch = (cle, groupe, type, unite, obligatoire, min, max, etiquette, aide, extra = {}) =>
  ({ cle, groupe, type, unite, obligatoire, min, max, defaut: cle in D ? defDe(cle) : null, etiquette, aide,
     statut: cle in D ? D[cle].status : null, source: cle in D ? D[cle].source : null, date: cle in D ? D[cle].date : null, envoye: "oui", ...extra });
const PL = "Pourcentage (0 à 100)";

export const CHAMPS = [
  // Identification
  ch("adresse", "Identification", "texte", null, false, null, null, "Adresse ou désignation (texte libre, aucune recherche faite)", "Affichage seulement dans le sommaire. NE PAS ENVOYER au backend (donnée nominative).", { defaut: "", envoye: "non", maxLength: 80 }),
  ch("prepare", "Identification", "texte", null, false, null, null, "Préparé par (courtier)", "Affichage seulement dans le sommaire. NE PAS ENVOYER au backend.", { defaut: "", envoye: "non", maxLength: 60 }),
  ch("type", "Identification", "choix", null, true, null, null, "Type d'immeuble", "Choix : « Plex 2 à 4 logements » (plex) ou « 5 logements et plus » (multi). Changer le type recharge les dépenses d'exemple.", { defaut: "plex", options: [{ valeur: "plex", etiquette: "Plex 2 à 4 logements" }, { valeur: "multi", etiquette: "5 logements et plus" }], statut: null }),
  ch("ville", "Identification", "choix", null, true, null, null, "Ville (loyers et inoccupation SCHL, droits de mutation, facteur comparatif)", "Changer la ville recharge les loyers SCHL, l'inoccupation et le facteur comparatif. Afficher « Fiabilité SCHL : … » sous la liste. Localisation grossière : c'est la seule envoyée.", { defaut: "sherbrooke", options: Object.entries(PARAMETERS.villes).map(([valeur, v]) => ({ valeur, etiquette: v.nom, fiabiliteSchl: v.fiabilite.value })), statut: null }),
  // Loyers actuels
  ...[0, 1, 2, 3].flatMap((i) => [
    ch(`n${i}`, "Loyers actuels", "entier", "logements", false, 0, 200, `${PARAMETERS.tailles[i]} : Nombre`, "Au moins un logement requis au total. Valeurs de départ = exemple Plex.io (triplex : 2 × 4 ½ et 1 × 5 ½).", { defaut: D[`n${i}`].value.plex }),
    ch(`l${i}`, "Loyers actuels", "montant", "$/mois", true, 0, 20000, `${PARAMETERS.tailles[i]} : Loyer ($/mois)`, "Afficher à côté « SCHL : <loyer moyen de la ville> ». Remplacer par les baux réels.", { defaut: PARAMETERS.villes.sherbrooke.loyers.value[i], statut: "Confirmé", source: SRC_SCHL_LOYERS + " (valeur de départ = Sherbrooke; change avec la ville)", date: "2025-10" }),
  ]),
  ch("autresRev", "Loyers actuels", "montant", "$/an", false, 0, 1000000, "Autres revenus ($/an : stationnement, buanderie, rangement)", "À saisir."),
  ch("inoc", "Loyers actuels", "pourcentage", "%", true, 0, 100, "Inoccupation et mauvaises créances (%)", "Confirmé tant que la valeur égale celle de la SCHL pour la ville (Sherbrooke : 2,7 %, SCHL oct. 2025); sinon Hypothèse. Modifiable.", { defaut: PARAMETERS.villes.sherbrooke.inoc.value, statut: "Confirmé", source: SRC_SCHL_INOC + " (valeur de départ = Sherbrooke; change avec la ville)", date: "2025-10" }),
  // Dépenses
  ch("taxesMun", "Dépenses d'exploitation", "montant", "$/an", true, 0, 1000000, "Taxes municipales", "Hypothèse tant que le compte de taxes n'est pas saisi."),
  ch("taxesScol", "Dépenses d'exploitation", "montant", "$/an", true, 0, 1000000, "Taxes scolaires", "Hypothèse tant que le compte de taxes n'est pas saisi."),
  ch("assur", "Dépenses d'exploitation", "montant", "$/an", true, 0, 1000000, "Assurances", "Hypothèse. Alerte si 0."),
  ch("energie", "Dépenses d'exploitation", "montant", "$/an", true, 0, 1000000, "Énergie : aires communes, chauffage payé par le propriétaire", "Hypothèse."),
  ch("entretien", "Dépenses d'exploitation", "montant", "$/an", true, 0, 1000000, "Entretien et réparations", "Hypothèse. Alerte si 0."),
  ch("gestion", "Dépenses d'exploitation", "pourcentage", "% du revenu brut effectif", true, 0, 100, "Gestion (% du revenu brut effectif)", "5 %, hypothèse, comptée même si l'immeuble est autogéré."),
  ch("reserve", "Dépenses d'exploitation", "montant", "$/an", true, 0, 1000000, "Réserve de remplacement", "Hypothèse. Alerte si 0."),
  ch("autres", "Dépenses d'exploitation", "montant", "$/an", false, 0, 1000000, "Autres (déneigement, conciergerie, contrats)", "Hypothèse."),
  // Méthode du revenu
  ch("tga", "Méthode du revenu", "pourcentage", "%", true, 0.5, 20, "TGA central (%)", "Hypothèse : aucune source publique pour Sherbrooke. Afficher le TGA implicite des comparables saisis et le repère CBRE (source secondaire, à valider; immeubles institutionnels, pas les plex de Sherbrooke)."),
  ch("ecart", "Méthode du revenu", "entier", "points de base", true, 0, 400, "Écart de sensibilité (points de base)", "Hypothèse. Le TGA haut (TGA − écart) doit rester > 0 sinon la méthode du revenu n'est pas utilisée."),
  // Comparables
  ...[1, 2, 3, 4, 5].flatMap((j) => [
    ch(`c${j}Nom`, "Comparables", "texte", null, false, null, null, `Comparable ${j} : désignation`, "Texte libre. NE PAS ENVOYER au backend (peut contenir une adresse).", { defaut: "", envoye: "non", maxLength: 80 }),
    ch(`c${j}Date`, "Comparables", "texte", null, false, null, null, `Comparable ${j} : date de vente`, "Texte libre (aaaa-mm recommandé). Non envoyé par défaut (décision P-O).", { defaut: "", envoye: "non", maxLength: 20 }),
    ch(`c${j}Prix`, "Comparables", "montant", "$", false, 0, 100000000, `Comparable ${j} : prix vendu ($)`, "Prix vendu (pas le prix demandé), vente récente vérifiée. 0 = comparable ignoré.", { defaut: 0 }),
    ch(`c${j}Portes`, "Comparables", "entier", "portes", false, 0, 500, `Comparable ${j} : portes`, "Nécessaire pour le prix par porte.", { defaut: 0 }),
    ch(`c${j}Rbp`, "Comparables", "montant", "$/an", false, 0, 100000000, `Comparable ${j} : RBP ($/an)`, "Nécessaire pour le MRB.", { defaut: 0 }),
    ch(`c${j}Rne`, "Comparables", "montant", "$/an", false, 0, 100000000, `Comparable ${j} : RNE ($/an, si connu)`, "Nécessaire pour le MRN et le TGA implicite; doit être normalisé comme celui du sujet.", { defaut: 0 }),
    ch(`c${j}Adj`, "Comparables", "pourcentage", "% (peut être négatif)", false, -50, 50, `Comparable ${j} : ajustement total (%)`, "Écart en % pour la date, l'emplacement, l'état, le stationnement et les baux par rapport au sujet; un comparable meilleur que le sujet reçoit un ajustement négatif.", { defaut: 0 }),
  ]),
  ch("srcMrb", "MRB", "choix", null, true, null, null, "MRB : source", "« Des comparables » ou « Saisie manuelle ».", { defaut: "comps", options: [{ valeur: "comps", etiquette: "Des comparables" }, { valeur: "manuel", etiquette: "Saisie manuelle" }], statut: null }),
  ch("mrbB", "MRB", "nombre", "×", false, 0, 100, "MRB bas (×)", "Visible si saisie manuelle. Aucune valeur par défaut (aucune source publique fiable).", { afficheSi: "srcMrb = manuel" }),
  ch("mrbC", "MRB", "nombre", "×", false, 0, 100, "MRB central (×)", "Hypothèse. Obligatoire si saisie manuelle (sinon méthode MRB non utilisée).", { afficheSi: "srcMrb = manuel" }),
  ch("mrbH", "MRB", "nombre", "×", false, 0, 100, "MRB haut (×)", "Visible si saisie manuelle.", { afficheSi: "srcMrb = manuel" }),
  ch("srcMrn", "MRN", "choix", null, true, null, null, "MRN : source", "« Des comparables » ou « Saisie manuelle ».", { defaut: "comps", options: [{ valeur: "comps", etiquette: "Des comparables" }, { valeur: "manuel", etiquette: "Saisie manuelle" }], statut: null }),
  ch("mrnB", "MRN", "nombre", "×", false, 0, 200, "MRN bas (×)", "Visible si saisie manuelle. Le MRN est l'inverse du TGA : 20 × équivaut à 5 %.", { afficheSi: "srcMrn = manuel" }),
  ch("mrnC", "MRN", "nombre", "×", false, 0, 200, "MRN central (×)", "Hypothèse. Obligatoire si saisie manuelle.", { afficheSi: "srcMrn = manuel" }),
  ch("mrnH", "MRN", "nombre", "×", false, 0, 200, "MRN haut (×)", "Visible si saisie manuelle.", { afficheSi: "srcMrn = manuel" }),
  // Rapprochement
  ch("wRev", "Rapprochement", "pourcentage", "pondération", true, 0, 100, "Pondération : revenu (%)", "Hypothèse. Se répartit entre les méthodes disponibles seulement."),
  ch("wPar", "Rapprochement", "pourcentage", "pondération", true, 0, 100, "Pondération : parité (%)", "Hypothèse."),
  ch("wMrb", "Rapprochement", "pourcentage", "pondération", true, 0, 100, "Pondération : MRB (%)", "Hypothèse."),
  ch("wMrn", "Rapprochement", "pourcentage", "pondération", true, 0, 100, "Pondération : MRN (%)", "Hypothèse."),
  ch("arrondi", "Rapprochement", "montant", "$", true, 0, 1000000, "Arrondi ($)", "0 = pas d'arrondi."),
  // Évaluation municipale
  ch("evalTerrain", "Évaluation municipale", "montant", "$", false, 0, 100000000, "Terrain ($) — rôle", "Référence seulement, exclue du rapprochement."),
  ch("evalBat", "Évaluation municipale", "montant", "$", false, 0, 100000000, "Bâtiment ($) — rôle", "Référence seulement, exclue du rapprochement."),
  ch("evalAnnee", "Évaluation municipale", "entier", "année", false, 0, 2100, "Année du rôle", "Laisser vide ou 0 = non saisie; sinon 1990 à 2100. Alerte si antérieure à 2026.", { defaut: "" }),
  ch("facteur", "Évaluation municipale", "nombre", "×", false, 0.5, 3, "Facteur comparatif 2026", "Change avec la ville (Sherbrooke 1,08 Confirmé; Québec 1,08 Confirmé; Montréal 1,00 Confirmé; autres 1,00 Hypothèse).", { defaut: 1.08, statut: "Confirmé", source: PARAMETERS.villes.sherbrooke.facteurComparatif.source + " (valeur de départ = Sherbrooke; change avec la ville)", date: "2026" }),
  // Financement acheteur
  ...[["pcLtv", "Conventionnel, investisseur", "Prêt-valeur maximal (%)", 1, 95], ["pcTaux", "Conventionnel, investisseur", "Taux (%)", 0.1, 20], ["pcAm", "Conventionnel, investisseur", "Amortissement (ans)", 1, 40], ["pcRcd", "Conventionnel, investisseur", "RCD minimal", 0.5, 3]]
    .map(([k, g, e, mn, mx]) => ch(k, "Financement : " + g, k.endsWith("Ltv") || k.endsWith("Taux") ? "pourcentage" : k.endsWith("Am") ? "entier" : "nombre", k.endsWith("Am") ? "ans" : k.endsWith("Rcd") ? "×" : "%", false, mn, mx, e, "Visible si type = plex.", { afficheSi: "type = plex" })),
  ...[["poLtv", "Propriétaire occupant, assuré SCHL", "Prêt-valeur maximal (%)", 1, 95], ["poPrime", "Propriétaire occupant, assuré SCHL", "Prime SCHL (% du prêt)", 0, 10], ["poTaux", "Propriétaire occupant, assuré SCHL", "Taux assuré (%)", 0.1, 20], ["poAm", "Propriétaire occupant, assuré SCHL", "Amortissement (ans)", 1, 40]]
    .map(([k, g, e, mn, mx]) => ch(k, "Financement : " + g, k.endsWith("Am") ? "entier" : "pourcentage", k.endsWith("Am") ? "ans" : "%", false, mn, mx, e, "Visible si type = plex. La qualification selon le revenu personnel de l'acheteur n'est pas calculée.", { afficheSi: "type = plex" })),
  ...[["mcLtv", "Conventionnel non assuré", "Prêt-valeur maximal (%)", 1, 95], ["mcTaux", "Conventionnel non assuré", "Taux (%)", 0.1, 20], ["mcAm", "Conventionnel non assuré", "Amortissement (ans)", 1, 40], ["mcRcd", "Conventionnel non assuré", "RCD minimal", 0.5, 3]]
    .map(([k, g, e, mn, mx]) => ch(k, "Financement : " + g, k.endsWith("Ltv") || k.endsWith("Taux") ? "pourcentage" : k.endsWith("Am") ? "entier" : "nombre", k.endsWith("Am") ? "ans" : k.endsWith("Rcd") ? "×" : "%", false, mn, mx, e, "Visible si type = multi.", { afficheSi: "type = multi" })),
  ...[["msLtv", "SCHL standard", "Prêt-valeur maximal (%)", 1, 95], ["msTaux", "SCHL standard", "Taux assuré (%)", 0.1, 20], ["msAm", "SCHL standard", "Amortissement (ans)", 1, 50]]
    .map(([k, g, e, mn, mx]) => ch(k, "Financement : " + g, k.endsWith("Am") ? "entier" : "pourcentage", k.endsWith("Am") ? "ans" : "%", false, mn, mx, e, "Visible si type = multi. Le RCD SCHL (1,10 ou 1,30) et la prime (grille avec surprime d'amortissement) sont calculés, non saisis.", { afficheSi: "type = multi" })),
  ch("notaire", "Financement : frais de l'acheteur", "montant", "$", false, 0, 100000, "Notaire de l'acheteur ($)", "Hypothèse."),
  ch("inspection", "Financement : frais de l'acheteur", "montant", "$", false, 0, 100000, "Inspection ($)", "Hypothèse."),
  ch("evaluation", "Financement : frais de l'acheteur", "montant", "$", false, 0, 100000, "Évaluation ($)", "Hypothèse."),
  ch("tvqPrime", "Financement : frais de l'acheteur", "pourcentage", "%", false, 0, 20, "Taxe sur la prime (%)", "Confirmé : Revenu Québec, 9 % (9,975 % après le 31 déc. 2026, selon la Page)."),
  // Vendeur
  ch("vendeur", "Côté vendeur", "booleen", null, false, null, null, "Afficher le côté vendeur : produit net", "Désactivé par défaut. Section « estimation, à valider avec un CPA ».", { defaut: false, statut: null, envoye: "non" }),
  ...[["prixVente", "montant", "$", 0, 100000000, "Prix de vente ($) — 0 = valeur centrale"], ["commission", "pourcentage", "% du prix, avant taxes", 0, 20, "Commission (% du prix, avant taxes)"], ["taxesCom", "pourcentage", "%", 0, 30, "TPS et TVQ sur la commission (%)"], ["notaireV", "montant", "$", 0, 100000, "Notaire et autres frais de vente ($)"], ["solde", "montant", "$", 0, 100000000, "Solde hypothécaire ($) — à obtenir du prêteur"], ["penalite", "montant", "$", 0, 100000000, "Pénalité de remboursement anticipé ($) — à obtenir du prêteur"], ["quote", "pourcentage", "%", 0, 100, "Quote-part détenue (%)"],
    ["prixAchat", "montant", "$", 0, 100000000, "Prix d'achat ($) — 0 = impôt non calculé"], ["fraisAchat", "montant", "$", 0, 10000000, "Frais d'acquisition capitalisés ($)"], ["travauxCap", "montant", "$", 0, 100000000, "Travaux en capital ($)"], ["dpaCum", "montant", "$", 0, 100000000, "DPA cumulée réellement réclamée ($) — formulaires T776 et TP-128"], ["terrainAchat", "pourcentage", "%", 0, 100, "Part du terrain à l'achat (%)"], ["terrainVente", "pourcentage", "%", 0, 100, "Part du terrain à la vente (%) — 0 = ratio du rôle saisi"], ["anAchat", "entier", "année", 1950, 2100, "Année d'achat"], ["anVente", "entier", "année", 1950, 2100, "Année de vente"]]
    .map(([k, t, u, mn, mx, e]) => ch(k, "Côté vendeur", t, u, false, mn, mx, e, "Visible si le côté vendeur est activé. NON ENVOYÉ par défaut (donnée financière personnelle; décision P-O).", { afficheSi: "vendeur = vrai", envoye: "non" })),
  ch("det", "Côté vendeur", "choix", null, false, null, null, "Détenteur", "Particulier ou SPCC.", { defaut: "particulier", options: [{ valeur: "particulier", etiquette: "Particulier" }, { valeur: "spcc", etiquette: "SPCC" }], afficheSi: "vendeur = vrai", envoye: "non", statut: null }),
  ch("modeImp", "Côté vendeur", "choix", null, false, null, null, "Mode d'impôt (particulier)", "« Taux marginal constant » ou « Impôt par tranches ».", { defaut: "constant", options: [{ valeur: "constant", etiquette: "Taux marginal constant" }, { valeur: "tranches", etiquette: "Impôt par tranches" }], afficheSi: "vendeur = vrai et det = particulier", envoye: "non", statut: null }),
  ch("tm", "Côté vendeur", "pourcentage", "%", false, 0, 60, "Taux marginal (%)", "Déduit : palier supérieur 2026, barèmes officiels. Visible si particulier + taux constant.", { afficheSi: "vendeur = vrai, det = particulier, modeImp = constant", envoye: "non" }),
  ch("autreRev", "Côté vendeur", "montant", "$", false, 0, 100000000, "Autre revenu imposable de l'année ($)", "Visible si particulier + impôt par tranches.", { afficheSi: "vendeur = vrai, det = particulier, modeImp = tranches", envoye: "non" }),
  ch("tSpcc", "Côté vendeur", "pourcentage", "%", false, 0, 70, "Taux SPCC, revenu de placement (%)", "Estimé : EY et CQFF 2026, source secondaire, à valider. Visible si SPCC.", { afficheSi: "vendeur = vrai et det = spcc", envoye: "non" }),
  ch("incl", "Côté vendeur", "pourcentage", "%", false, 0, 100, "Taux d'inclusion du gain en capital (%)", "Confirmé : 50 % (ARC, Revenu Québec). Champ non exposé dans la Page (valeur fixe) : à afficher en lecture seule.", { afficheSi: "vendeur = vrai", envoye: "non", lectureSeule: true }),
  ch("abat", "Côté vendeur", "pourcentage", "%", false, 0, 100, "Abattement du Québec (%)", "Confirmé : 16,5 % (Revenu Québec / ARC). Champ non exposé dans la Page (valeur fixe) : lecture seule.", { afficheSi: "vendeur = vrai et modeImp = tranches", envoye: "non", lectureSeule: true }),
  ch("rp", "Côté vendeur", "booleen", null, false, null, null, "Une partie est la résidence principale du vendeur", "Affiche rpPct et rpAns.", { defaut: false, afficheSi: "vendeur = vrai", envoye: "non", statut: null }),
  ch("rpPct", "Côté vendeur", "pourcentage", "%", false, 0, 100, "Partie habitée (%)", "Visible si résidence principale.", { afficheSi: "vendeur = vrai et rp = vrai", envoye: "non" }),
  ch("rpAns", "Côté vendeur", "entier", "années", false, 0, 100, "Années désignées", "Visible si résidence principale.", { afficheSi: "vendeur = vrai et rp = vrai", envoye: "non" }),
  // Drapeau interne
  ch("demo", "Interne", "booleen", null, false, null, null, "Comparables fictifs de démonstration chargés", "Interne : vrai si les 3 comparables fictifs sont chargés. Ajoute l'alerte « Comparables fictifs » et passe les statuts à Hypothèse. À NE PAS exposer au public ni à envoyer (voir décision P-O : faut-il offrir la démo sur le site ?).", { defaut: false, envoye: "non", statut: null }),
];

// ───────────────────────────── PAYLOAD (sans donnée nominative) ─────────────────────────────
const num2null = (v) => (typeof v === "number" ? (isFinite(v) ? v : null) : v);
const SECTEUR_RE = /^[^\d]{1,60}$/; // refuse tout chiffre (numéro civique, code postal)

// meta : { pageOrigine, consentement: { accepte:boolean, version:string, horodatage:string ISO }, secteur?:string, inclureVendeur?:boolean, horodatage?:string ISO, hp?:string }
export function construirePayload(entrees, resultat, meta = {}) {
  const f = normaliser(entrees);
  const r = resultat || evaluer(entrees);
  const consent = meta.consentement || {};
  if (consent.accepte !== true) throw new Error("Consentement absent : aucun payload ne doit être construit sans consentement explicite (Loi 25).");
  if (typeof consent.version !== "string" || !consent.version) throw new Error("Version du texte de consentement absente : le texte doit être approuvé par P-O avant tout envoi.");
  if (typeof meta.pageOrigine !== "string" || !meta.pageOrigine) throw new Error("pageOrigine requise.");
  const inclureVendeur = meta.inclureVendeur === true && f.vendeur;
  const interdit = new Set(["adresse", "prepare", "demo"].concat([1, 2, 3, 4, 5].flatMap((j) => [`c${j}Nom`, `c${j}Date`])));
  const entreesEnvoyees = {};
  for (const c of CHAMPS) {
    const envoyable = c.envoye === "oui" || (inclureVendeur && c.groupe === "Côté vendeur");
    if (!envoyable || interdit.has(c.cle)) continue;
    entreesEnvoyees[c.cle] = c.type === "choix" || c.type === "booleen" ? f[c.cle] : num(f[c.cle]);
  }
  const secteur = meta.secteur && SECTEUR_RE.test(meta.secteur) ? meta.secteur.trim() : null;
  const payload = {
    schemaVersion: "1.0",
    horodatage: meta.horodatage || new Date().toISOString(),
    pageOrigine: meta.pageOrigine || null,
    parametresVersion: PARAMETERS.version,
    consentement: { accepte: true, version: consent.version ?? null, horodatage: consent.horodatage ?? null },
    localisation: { ville: f.ville, secteur },
    entrees: entreesEnvoyees,
    resultat: {
      fourchette: { bas: num2null(r.rec.b), central: num2null(r.rec.c), haut: num2null(r.rec.h), arrondi: num(f.arrondi) },
      rbp: num2null(r.rbp), rbe: num2null(r.rbe), depenses: num2null(r.dep), rne: num2null(r.rne), portes: r.nb,
      methodes: r.meth.map((z) => { const ptc = r.wTot > 0 && z.ok && z.w > 0 ? z.w / r.wTot : null; return { id: z.id, utilisee: ptc !== null && isFinite(z.c), bas: z.ok ? num2null(z.b) : null, central: z.ok ? num2null(z.c) : null, haut: z.ok ? num2null(z.h) : null, poids: ptc, statut: z.stat }; }),
      alertes: r.alertes.map((a) => a[0]),
      financementCentral: r.financementCentral.map((z) => ({ programme: z.programme, miseP: num2null(z.miseP), rcd: num2null(z.rcd), miseMinimaleSuffisante: z.ok })),
      vendeur: inclureVendeur && r.vendeur ? { produitNetVendeur: num2null(r.vendeur.produitNetVendeur), impotEstime: num2null(r.vendeur.impotEstime), statut: "Estimé" } : null,
    },
    hp: meta.hp ?? "",
  };
  return payload;
}

// ───────────────────────────── ENVOI (DÉSACTIVÉ PAR DÉFAUT) ─────────────────────────────
// Ne fait RIEN tant que CONFIG.envoiActif !== true. Même activé, exige : endpoint défini, consentement vrai, fetch disponible.
// options : { fetchImpl?, endpoint?, config? } (config permet aux tests de passer une copie; la valeur par défaut est CONFIG).
export async function envoyerResultats(payload, options = {}) {
  const cfg = options.config || CONFIG;
  if (cfg.envoiActif !== true) return { envoye: false, raison: "Envoi désactivé (CONFIG.envoiActif = false) : aucune donnée n'a quitté le navigateur." };
  const endpoint = options.endpoint || cfg.endpoint;
  if (!endpoint) return { envoye: false, raison: "Aucun endpoint configuré." };
  if (!payload || !payload.consentement || payload.consentement.accepte !== true) return { envoye: false, raison: "Consentement absent." };
  if (payload.hp) return { envoye: false, raison: "Champ anti-pollution rempli." };
  const fi = options.fetchImpl || (typeof fetch === "function" ? fetch : null);
  if (!fi) return { envoye: false, raison: "fetch indisponible." };
  try {
    const rep = await fi(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), credentials: "omit", referrerPolicy: "no-referrer" });
    return { envoye: Boolean(rep && rep.ok), statutHttp: rep ? rep.status : null };
  } catch (e) {
    return { envoye: false, raison: "Échec réseau (aucune relance automatique)." };
  }
}
