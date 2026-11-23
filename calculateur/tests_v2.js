// tests_v2.js — collecte v2 (renseignements personnels sous consentement). Sans dépendance : node tests_v2.js
// Les données de contact ci-dessous sont FICTIVES (domaine exemple.ca, numéros 555).
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { evaluer, entreesParDefaut } from "./evaluation_bloc.js";
import { construirePayloadV2, envoyerResultatsV2, validerContact, CONFIG_V2, CHAMPS_V2, CHAMPS_CONTACT } from "./donnees_v2.js";
import { valider } from "./verification/mini_schema_v2.mjs";

const lire = (f) => JSON.parse(readFileSync(new URL(f, import.meta.url), "utf8"));
const schema = lire("./schema_donnees_v2.json");
const { cas } = lire("./tests_cas.json");
let ok = 0, ko = 0; const echecs = [];
async function t(nom, fn) { try { await fn(); ok++; console.log("  ✓", nom); } catch (e) { ko++; echecs.push(nom); console.log("  ✗", nom, "\n    ", String(e.message).split("\n").slice(0, 6).join("\n     ")); } }
const json = (p) => JSON.parse(JSON.stringify(p));

const CONTACT = { prenom: "Prénom-Test", nom: "Nom-Test", telephone: "819 555-0142", courriel: "test@exemple.ca", adresseImmeuble: "123 rue Fictive", municipalite: "Sherbrooke", codePostal: "j1h0a0" };
const consent = (contact, statistiques) => ({ caseCochee: { contact, statistiques }, version: "TEST-NON-APPROUVE", horodatage: "2026-11-19T12:50:00-05:00" });
const META = (c = true, s = true, extra = {}) => ({ pageOrigine: "/evaluation-bloc/", horodatage: "2026-11-19T12:51:00-05:00", consentement: consent(c, s), contact: CONTACT, ...extra });

console.log("A. Consentement obligatoire");
await t("Refus sans aucune case cochée (cases non précochées par défaut)", () => {
  const e = entreesParDefaut();
  assert.throws(() => construirePayloadV2(e, evaluer(e), META(false, false)), /Consentement absent/);
  assert.throws(() => construirePayloadV2(e, evaluer(e), { ...META(), consentement: undefined }), /Consentement absent/);
  assert.throws(() => construirePayloadV2(e, evaluer(e), { ...META(), consentement: { caseCochee: { contact: "oui" }, version: "v", horodatage: "2026-11-19T12:00:00Z" } }), /Consentement absent/, "seul true strict compte");
});
await t("Refus sans version du texte de consentement, sans horodatage ou sans page d'origine", () => {
  const e = entreesParDefaut(), r = evaluer(e);
  assert.throws(() => construirePayloadV2(e, r, { ...META(), consentement: { caseCochee: { contact: true }, horodatage: "2026-11-19T12:00:00Z" } }), /Version/);
  assert.throws(() => construirePayloadV2(e, r, { ...META(), consentement: { caseCochee: { contact: true }, version: "v" } }), /Horodatage/);
  assert.throws(() => construirePayloadV2(e, r, { ...META(), pageOrigine: "" }), /pageOrigine/);
});
await t("Les cases de consentement sont des booléens à défaut FAUX dans CHAMPS_V2", () => {
  for (const k of ["consentContact", "consentStats"]) { const c = CHAMPS_V2.find((x) => x.cle === k); assert.equal(c.type, "booleen"); assert.equal(c.defaut, false); }
});
await t("Schéma : refuse un consentement faux, sans finalité, sans version ou d'une autre méthode", () => {
  const e = entreesParDefaut(); const p = json(construirePayloadV2(e, evaluer(e), META()));
  assert.equal(valider(schema, p).length, 0, valider(schema, p).join("; "));
  for (const mod of [{ accepte: false }, { finalites: [] }, { version: "" }, { methode: "precochee" }, { finalites: ["autre"] }])
    assert.ok(valider(schema, { ...p, consentement: { ...p.consentement, ...mod } }).length > 0, JSON.stringify(mod));
  const sansCons = { ...p }; delete sansCons.consentement; assert.ok(valider(schema, sansCons).length > 0);
});

console.log("B. Contenu nominatif (décision de P-O)");
await t("Avec la finalité « contact » : nom, téléphone, courriel, adresse exacte, municipalité, code postal normalisé", () => {
  const e = entreesParDefaut(); const p = construirePayloadV2(e, evaluer(e), META(true, false));
  assert.deepEqual(p.identite, { prenom: "Prénom-Test", nom: "Nom-Test", telephone: "819 555-0142", courriel: "test@exemple.ca" });
  assert.equal(p.immeuble.adresse, "123 rue Fictive"); assert.equal(p.immeuble.codePostal, "J1H 0A0"); assert.deepEqual(p.consentement.finalites, ["contact_evaluation"]);
  assert.equal(valider(schema, json(p)).length, 0);
});
await t("Nombre de logements, prix d'achat et prix payé par porte (prix d'achat / logements)", () => {
  const e = { ...entreesParDefaut(), n2: 3, n3: 1, prixAchat: "480 000", anAchat: 2015 };
  const p = construirePayloadV2(e, evaluer(e), META());
  assert.equal(p.immeuble.nombreLogements, 4); assert.equal(p.immeuble.prixAchat, 480000); assert.equal(p.immeuble.prixPayeParPorte, 120000); assert.equal(p.immeuble.anneeAchat, 2015);
  assert.equal(p.resultat.valeurCentraleParPorte, p.resultat.fourchette.central / 4);
});
await t("TOUTES les entrées de l'évaluation sont envoyées (y compris volet vendeur, désignation, comparables) avec « contact »", () => {
  const e = { ...cas.find((c) => c.id === "T07").entrees, adresse: "Triplex secteur Nord", prepare: "Courtier-Test" };
  const p = construirePayloadV2(e, evaluer(e), META());
  for (const k of ["solde", "prixAchat", "dpaCum", "c1Nom", "c1Date", "adresse", "prepare", "vendeur", "det", "tm"]) assert.ok(k in p.entrees, k);
  assert.equal(p.entrees.c1Nom, "Fictif P1"); assert.ok(p.resultat.vendeur && p.resultat.vendeur.statut === "Estimé");
  const nbChamps = CHAMPS_V2.length - CHAMPS_CONTACT.length; assert.equal(Object.keys(p.entrees).length, nbChamps);
  assert.equal(valider(schema, json(p)).length, 0, valider(schema, json(p)).join("; "));
});
await t("Statistiques SEULEMENT : aucune identité, coordonnée, adresse exacte ni texte libre identifiant (règle proposée)", () => {
  const e = { ...entreesParDefaut(), adresse: "123 rue Fictive", c1Nom: "456 rue Test", c1Prix: 600000, c1Portes: 3 };
  const p = construirePayloadV2(e, evaluer(e), META(false, true)); const s = JSON.stringify(p);
  assert.equal(p.identite, null); assert.equal(p.immeuble.adresse, null); assert.equal(p.immeuble.codePostal, null);
  for (const x of ["Nom-Test", "555-0142", "test@exemple.ca", "123 rue", "456 rue", "J1H"]) assert.ok(!s.includes(x), x);
  assert.equal(p.entrees.c1Prix, 600000); assert.equal(valider(schema, json(p)).length, 0, valider(schema, json(p)).join("; "));
});
await t("Schéma : refuse une identité ou une adresse exacte quand seule la finalité « statistiques » est consentie", () => {
  const e = entreesParDefaut(); const p = json(construirePayloadV2(e, evaluer(e), META(true, true)));
  const statsSeul = { ...p, consentement: { ...p.consentement, finalites: ["statistiques_marche"] } };
  assert.ok(valider(schema, statsSeul).length > 0);
  const p2 = json(construirePayloadV2(e, evaluer(e), META(false, true)));
  assert.ok(valider(schema, { ...p2, entrees: { ...p2.entrees, adresse: "1 rue X" } }).length > 0);
  assert.ok(valider(schema, { ...p2, immeuble: { ...p2.immeuble, adresse: "1 rue X" } }).length > 0);
});
await t("Schéma : avec « contact », identité obligatoire; téléphone OU courriel; formats; propriété inconnue refusée", () => {
  const e = entreesParDefaut(); const p = json(construirePayloadV2(e, evaluer(e), META()));
  assert.ok(valider(schema, { ...p, identite: null }).length > 0);
  assert.ok(valider(schema, { ...p, identite: { ...p.identite, telephone: null, courriel: null } }).length > 0);
  assert.equal(valider(schema, { ...p, identite: { ...p.identite, telephone: null } }).length, 0);
  assert.ok(valider(schema, { ...p, identite: { ...p.identite, courriel: "pas-un-courriel" } }).length > 0);
  assert.ok(valider(schema, { ...p, identite: { ...p.identite, telephone: "12" } }).length > 0);
  assert.ok(valider(schema, { ...p, immeuble: { ...p.immeuble, codePostal: "12345" } }).length > 0);
  assert.ok(valider(schema, { ...p, nas: "123" }).length > 0); assert.ok(valider(schema, { ...p, hp: "robot" }).length > 0);
});
await t("validerContact / construirePayloadV2 : coordonnées incomplètes ou invalides refusées", () => {
  assert.deepEqual(validerContact(CONTACT), []);
  assert.ok(validerContact({ ...CONTACT, telephone: "", courriel: "" }).some((x) => x.includes("Téléphone ou courriel")));
  assert.ok(validerContact({ ...CONTACT, courriel: "x@y" }).length > 0); assert.ok(validerContact({ ...CONTACT, adresseImmeuble: "" }).length > 0);
  const e = entreesParDefaut(); assert.throws(() => construirePayloadV2(e, evaluer(e), { ...META(), contact: { ...CONTACT, nom: "" } }), /Coordonnées invalides/);
});
await t("Les 10 cas de calcul produisent un payload v2 valide (contact + statistiques, et statistiques seulement)", () => {
  for (const c of cas) for (const [cc, cs] of [[true, true], [false, true], [true, false]]) {
    const p = json(construirePayloadV2(c.entrees, evaluer(c.entrees), META(cc, cs)));
    const err = valider(schema, p); assert.equal(err.length, 0, `${c.id} ${cc}/${cs} : ${err.slice(0, 4).join("; ")}`);
  }
});

console.log("C. Envoi désactivé par défaut");
await t("CONFIG_V2 : envoiActif = false, endpoint = null, versionConsentement = null", () => { assert.equal(CONFIG_V2.envoiActif, false); assert.equal(CONFIG_V2.endpoint, null); assert.equal(CONFIG_V2.versionConsentement, null); });
await t("envoyerResultatsV2 n'appelle JAMAIS fetch par défaut, même avec un payload complet et un endpoint", async () => {
  let n = 0; const fetchImpl = async () => { n++; return { ok: true, status: 204 }; };
  const e = entreesParDefaut(); const p = construirePayloadV2(e, evaluer(e), META());
  const rep = await envoyerResultatsV2(p, { fetchImpl, endpoint: "https://exemple.invalide/api" });
  assert.equal(rep.envoye, false); assert.equal(n, 0); assert.match(rep.raison, /désactivé/);
});
await t("Même activé via une configuration de test : refuse sans consentement, endpoint non HTTPS, identité sans « contact », honeypot", async () => {
  const appels = []; const fetchImpl = async (u, o) => { appels.push([u, o]); return { ok: true, status: 204 }; };
  const cfg = { envoiActif: true, endpoint: "https://exemple.invalide/api" };
  const e = entreesParDefaut(); const p = construirePayloadV2(e, evaluer(e), META());
  assert.equal((await envoyerResultatsV2({ ...p, consentement: { ...p.consentement, accepte: false } }, { fetchImpl, config: cfg })).envoye, false);
  assert.equal((await envoyerResultatsV2({ ...p, consentement: { ...p.consentement, finalites: [] } }, { fetchImpl, config: cfg })).envoye, false);
  assert.equal((await envoyerResultatsV2({ ...p, consentement: { ...p.consentement, finalites: ["statistiques_marche"] } }, { fetchImpl, config: cfg })).envoye, false);
  assert.equal((await envoyerResultatsV2(p, { fetchImpl, config: { envoiActif: true, endpoint: "http://exemple.invalide/api" } })).envoye, false);
  assert.equal((await envoyerResultatsV2({ ...p, hp: "x" }, { fetchImpl, config: cfg })).envoye, false);
  assert.equal(appels.length, 0);
  const rep = await envoyerResultatsV2(p, { fetchImpl, config: cfg });
  assert.equal(rep.envoye, true); assert.equal(appels.length, 1); assert.equal(appels[0][1].method, "POST"); assert.equal(appels[0][1].credentials, "omit");
  assert.equal(CONFIG_V2.envoiActif, false, "CONFIG_V2 globale intacte");
});

console.log(`\nRésultat v2 : ${ok} réussis, ${ko} échoués (sur ${ok + ko})`);
if (ko) { console.log("Échecs :", echecs.join(" | ")); process.exit(1); }
