// donnees_v2.js — Collecte des données, VERSION 2 (décision de P-O du 2026-11-19 : conserver les renseignements nominatifs).
// BROUILLON À APPROUVER PAR P-O. Ne remplace pas la v1 : evaluation_bloc.js (calcul + payload v1) reste intact.
//
// Différences avec la v1 :
//   - collecte de l'identité (prénom, nom), des coordonnées (téléphone, courriel), de l'adresse exacte de l'immeuble,
//     du prix payé (prix d'achat, prix payé par porte) et de TOUTES les entrées de l'évaluation;
//   - consentement explicite obligatoire avant tout envoi : case à cocher NON précochée, version du texte, finalités;
//   - deux finalités distinctes (Loi 25 : consentement demandé pour chacune des fins) :
//       « contact_evaluation » (vous contacter au sujet de votre évaluation) et « statistiques_marche ».
//     RÈGLE PROPOSÉE (à confirmer par P-O) : sans la finalité « contact_evaluation », aucune donnée d'identité,
//     de coordonnées ni d'adresse exacte n'est envoyée (l'envoi se limite aux données de calcul, comme en v1).
//   - l'envoi reste DÉSACTIVÉ par défaut (CONFIG_V2.envoiActif = false) : backend inconnu (plex-ai.io dans l'autre compte
//     GoDaddy de P-O, erreurs 500/504 depuis le 16 nov. 2026, hébergeur et région inconnus).
import { evaluer, entreesParDefaut, CHAMPS, num, PARAMETERS, VILLE_IDS } from "./evaluation_bloc.js";

export const SCHEMA_VERSION_V2 = "2.0";
export const FINALITES = {
  contact_evaluation: "Vous contacter au sujet de votre évaluation",
  statistiques_marche: "Produire des statistiques de marché",
};
export const CONFIG_V2 = {
  envoiActif: false,          // DOIT rester false : hébergeur et région inconnus (Loi 25), aucune approbation de mise en ligne.
  endpoint: null,             // INCONNU (voir backend_questions_v2.md). Ne rien inventer.
  versionConsentement: null,  // version du texte de consentement approuvé : à définir après approbation de P-O.
};

// Expressions de validation (propositions)
export const RE_COURRIEL = "^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$";
export const RE_TELEPHONE = "^(\\+?1[\\s.-]?)?\\(?[2-9]\\d{2}\\)?[\\s.-]?\\d{3}[\\s.-]?\\d{4}$"; // numéro nord-américain à 10 chiffres
export const RE_CODE_POSTAL = "^[ABCEGHJ-NPRSTVXY]\\d[ABCEGHJ-NPRSTV-Z] ?\\d[ABCEGHJ-NPRSTV-Z]\\d$";

// Champs ajoutés en v2 (identité, coordonnées, adresse exacte, consentement)
const c2 = (cle, groupe, type, obligatoire, etiquette, aide, extra = {}) => ({ cle, groupe, type, unite: null, obligatoire, min: null, max: null, defaut: type === "booleen" ? false : "", etiquette, aide, statut: null, source: "Saisie de la personne", date: null, envoye: "oui (si consentement « contact »)", nominatif: true, ...extra });
export const CHAMPS_CONTACT = [
  c2("prenom", "Vos coordonnées", "texte", true, "Prénom", "Requis si la personne accepte d'être contactée.", { maxLength: 60 }),
  c2("nom", "Vos coordonnées", "texte", true, "Nom", "Requis si la personne accepte d'être contactée.", { maxLength: 80 }),
  c2("telephone", "Vos coordonnées", "texte", false, "Téléphone", "Téléphone OU courriel requis. Numéro nord-américain à 10 chiffres.", { maxLength: 25, pattern: RE_TELEPHONE }),
  c2("courriel", "Vos coordonnées", "texte", false, "Courriel", "Téléphone OU courriel requis.", { maxLength: 120, pattern: RE_COURRIEL }),
  c2("adresseImmeuble", "Immeuble", "texte", true, "Adresse de l'immeuble (numéro et rue)", "Adresse exacte de l'immeuble évalué. Aucune recherche n'est faite à partir de l'adresse.", { maxLength: 120 }),
  c2("municipalite", "Immeuble", "texte", true, "Municipalité", "Municipalité de l'immeuble (peut différer de la ville de référence SCHL).", { maxLength: 80 }),
  c2("codePostal", "Immeuble", "texte", false, "Code postal", "Format A1A 1A1.", { maxLength: 7, pattern: RE_CODE_POSTAL }),
  c2("consentContact", "Consentement", "booleen", false, "J'accepte d'être contacté(e) au sujet de mon évaluation (texte exact : textes_a_approuver_v2.md)", "Case NON cochée par défaut. Sans elle : aucune identité, coordonnée ni adresse exacte n'est envoyée.", { envoye: "oui (dans consentement.finalites)", nominatif: false }),
  c2("consentStats", "Consentement", "booleen", false, "J'accepte que mes données servent à produire des statistiques de marché (texte exact : textes_a_approuver_v2.md)", "Case NON cochée par défaut. Indépendante de la précédente.", { envoye: "oui (dans consentement.finalites)", nominatif: false }),
];

// Champs de calcul repris de la v1 : en v2, TOUTES les entrées de l'évaluation sont envoyées (décision de P-O).
// Les textes libres pouvant identifier (désignation/adresse libre, courtier, noms et dates de comparables) partent seulement avec la finalité « contact ».
const TEXTE_IDENTIFIANT = new Set(["adresse", "prepare", ...[1, 2, 3, 4, 5].flatMap((j) => [`c${j}Nom`, `c${j}Date`])]);
export const CHAMPS_V2 = [
  ...CHAMPS_CONTACT,
  ...CHAMPS.map((c) => ({ ...c, envoye: TEXTE_IDENTIFIANT.has(c.cle) ? "oui (si consentement « contact »)" : "oui", nominatif: TEXTE_IDENTIFIANT.has(c.cle) })),
];

const fini = (v) => (typeof v === "number" ? (Number.isFinite(v) ? v : null) : v);
const txt = (v) => (typeof v === "string" ? v.trim() : v === undefined || v === null ? "" : String(v).trim());

// Valide les champs de contact (PROPOSITION de règles). Retourne la liste des erreurs (vide = valide).
export function validerContact(contact = {}) {
  const e = [];
  if (!txt(contact.prenom)) e.push("Prénom requis.");
  if (!txt(contact.nom)) e.push("Nom requis.");
  const tel = txt(contact.telephone), cou = txt(contact.courriel);
  if (!tel && !cou) e.push("Téléphone ou courriel requis.");
  if (tel && !new RegExp(RE_TELEPHONE).test(tel)) e.push("Téléphone invalide.");
  if (cou && !new RegExp(RE_COURRIEL).test(cou)) e.push("Courriel invalide.");
  if (!txt(contact.adresseImmeuble)) e.push("Adresse de l'immeuble requise.");
  if (!txt(contact.municipalite)) e.push("Municipalité requise.");
  const cp = txt(contact.codePostal).toUpperCase();
  if (cp && !new RegExp(RE_CODE_POSTAL).test(cp)) e.push("Code postal invalide.");
  for (const c of CHAMPS_CONTACT) if (c.maxLength && txt(contact[c.cle]).length > c.maxLength) e.push(`${c.etiquette} : trop long.`);
  return e;
}

// meta : { pageOrigine, consentement: { caseCochee: { contact:boolean, statistiques:boolean }, version, horodatage }, contact: {...}, horodatage?, hp? }
export function construirePayloadV2(entrees, resultat, meta = {}) {
  const cons = meta.consentement || {};
  const coche = cons.caseCochee || {};
  const finalites = [];
  if (coche.contact === true) finalites.push("contact_evaluation");
  if (coche.statistiques === true) finalites.push("statistiques_marche");
  if (!finalites.length) throw new Error("Consentement absent : aucune case de consentement n'est cochée; rien ne doit être envoyé (Loi 25).");
  if (typeof cons.version !== "string" || !cons.version) throw new Error("Version du texte de consentement absente : le texte doit être approuvé par P-O avant tout envoi.");
  if (typeof cons.horodatage !== "string" || Number.isNaN(Date.parse(cons.horodatage))) throw new Error("Horodatage du consentement requis.");
  if (typeof meta.pageOrigine !== "string" || !meta.pageOrigine) throw new Error("pageOrigine requise.");
  const avecContact = finalites.includes("contact_evaluation");

  const base = entreesParDefaut(entrees?.type ?? "plex", entrees?.ville ?? "sherbrooke");
  const f = { ...base };
  for (const k of Object.keys(base)) if (entrees && k in entrees && entrees[k] !== undefined) f[k] = entrees[k];
  const r = resultat || evaluer(f);

  let identite = null, immeubleExact = { adresse: null, municipalite: null, codePostal: null };
  if (avecContact) {
    const ct = meta.contact || {};
    const err = validerContact(ct);
    if (err.length) throw new Error("Coordonnées invalides : " + err.join(" "));
    identite = { prenom: txt(ct.prenom), nom: txt(ct.nom), telephone: txt(ct.telephone) || null, courriel: txt(ct.courriel) || null };
    const cp = txt(ct.codePostal).toUpperCase().replace(/^(\w{3})\s?(\w{3})$/, "$1 $2");
    immeubleExact = { adresse: txt(ct.adresseImmeuble), municipalite: txt(ct.municipalite), codePostal: cp || null };
  }

  const entreesEnvoyees = {};
  for (const c of CHAMPS) {
    if (TEXTE_IDENTIFIANT.has(c.cle)) { if (avecContact) entreesEnvoyees[c.cle] = txt(f[c.cle]).slice(0, c.maxLength || 120); continue; }
    entreesEnvoyees[c.cle] = c.type === "choix" || c.type === "booleen" ? f[c.cle] : num(f[c.cle]);
  }

  const nb = r.nb;
  const prixAchat = num(f.prixAchat);
  return {
    schemaVersion: SCHEMA_VERSION_V2,
    horodatage: meta.horodatage || new Date().toISOString(),
    pageOrigine: meta.pageOrigine,
    parametresVersion: PARAMETERS.version,
    consentement: { accepte: true, methode: "case_a_cocher_non_precochee", version: cons.version, horodatage: cons.horodatage, finalites },
    identite,
    immeuble: { ...immeubleExact, ville: f.ville, nombreLogements: nb, prixAchat: prixAchat > 0 ? prixAchat : null, anneeAchat: prixAchat > 0 ? num(f.anAchat) : null, prixPayeParPorte: prixAchat > 0 && nb > 0 ? prixAchat / nb : null },
    entrees: entreesEnvoyees,
    resultat: {
      fourchette: { bas: fini(r.rec.b), central: fini(r.rec.c), haut: fini(r.rec.h), arrondi: num(f.arrondi) },
      valeurCentraleParPorte: fini(nb > 0 ? r.rec.c / nb : NaN),
      rbp: fini(r.rbp), rbe: fini(r.rbe), depenses: fini(r.dep), rne: fini(r.rne), portes: nb,
      methodes: r.meth.map((z) => { const ptc = r.wTot > 0 && z.ok && z.w > 0 ? z.w / r.wTot : null; return { id: z.id, utilisee: ptc !== null && Number.isFinite(z.c), bas: z.ok ? fini(z.b) : null, central: z.ok ? fini(z.c) : null, haut: z.ok ? fini(z.h) : null, poids: ptc, statut: z.stat }; }),
      alertes: r.alertes.map((a) => a[0]),
      financementCentral: r.financementCentral.map((z) => ({ programme: z.programme, miseP: fini(z.miseP), rcd: fini(z.rcd), miseMinimaleSuffisante: z.ok })),
      vendeur: r.vendeur ? { produitNetVendeur: fini(r.vendeur.produitNetVendeur), impotEstime: fini(r.vendeur.impotEstime), gainCapitalAvantExemption: fini(r.vendeur.gainCapitalAvantExemption), statut: "Estimé" } : null,
    },
    hp: meta.hp ?? "",
  };
}

// Envoi : DÉSACTIVÉ par défaut. N'appelle jamais fetch tant que config.envoiActif !== true.
export async function envoyerResultatsV2(payload, options = {}) {
  const cfg = options.config || CONFIG_V2;
  if (cfg.envoiActif !== true) return { envoye: false, raison: "Envoi désactivé (CONFIG_V2.envoiActif = false) : aucune donnée n'a quitté le navigateur." };
  const endpoint = options.endpoint || cfg.endpoint;
  if (!endpoint) return { envoye: false, raison: "Aucun endpoint configuré." };
  if (!/^https:\/\//.test(endpoint)) return { envoye: false, raison: "Endpoint non HTTPS refusé (renseignements personnels)." };
  const c = payload && payload.consentement;
  if (!c || c.accepte !== true || !Array.isArray(c.finalites) || !c.finalites.length || !c.version) return { envoye: false, raison: "Consentement absent." };
  if (payload.identite && !c.finalites.includes("contact_evaluation")) return { envoye: false, raison: "Identité présente sans consentement « contact »." };
  if (payload.hp) return { envoye: false, raison: "Champ anti-pollution rempli." };
  const fi = options.fetchImpl || (typeof fetch === "function" ? fetch : null);
  if (!fi) return { envoye: false, raison: "fetch indisponible." };
  try {
    const rep = await fi(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), credentials: "omit", referrerPolicy: "no-referrer" });
    return { envoye: Boolean(rep && rep.ok), statutHttp: rep ? rep.status : null };
  } catch {
    return { envoye: false, raison: "Échec réseau (aucune relance automatique)." };
  }
}

export { VILLE_IDS };
