// Génère ../schema_donnees.json (JSON Schema 2020-12) à partir de CHAMPS (evaluation_bloc.js).
import { writeFileSync } from "node:fs";
import { CHAMPS, VILLE_IDS, PARAMETERS } from "../evaluation_bloc.js";

const entreesProps = {};
for (const c of CHAMPS) {
  const optionnelVendeur = c.groupe === "Côté vendeur" && c.envoye === "non";
  if (c.envoye !== "oui" && !optionnelVendeur) continue;
  if (["adresse", "prepare", "demo"].includes(c.cle) || /^c\dNom$|^c\dDate$/.test(c.cle)) continue;
  let s;
  if (c.type === "choix") s = { enum: c.options.map((o) => o.valeur) };
  else if (c.type === "booleen") s = { type: "boolean" };
  else { s = { type: "number" }; if (c.min !== null) s.minimum = c.min; if (c.max !== null) s.maximum = c.max; }
  s.description = `${c.etiquette}${c.unite ? " (" + c.unite + ")" : ""}${optionnelVendeur ? " — OPTIONNEL, absent par défaut : décision de P-O (donnée financière personnelle du vendeur)" : ""}`;
  entreesProps[c.cle] = s;
}
const nul = (s) => ({ anyOf: [s, { type: "null" }] });
const nombreOuNull = nul({ type: "number" });
const schema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://vendremonplex.com/schemas/evaluation-bloc-donnees-1.0.json",
  $comment: "BROUILLON À APPROUVER PAR P-O. L'$id est un identifiant logique, pas une URL publiée. Aucune donnée nominative (nom, courriel, téléphone, adresse exacte) : toute demande de contact passe par le formulaire GHL habituel, jamais par ce payload.",
  title: "Évaluation de bloc : données envoyées au backend (sans donnée nominative)",
  type: "object",
  additionalProperties: false,
  required: ["schemaVersion", "horodatage", "pageOrigine", "parametresVersion", "consentement", "localisation", "entrees", "resultat", "hp"],
  properties: {
    schemaVersion: { const: "1.0" },
    horodatage: { type: "string", format: "date-time", description: "Date et heure de l'envoi (ISO 8601)." },
    pageOrigine: { type: "string", maxLength: 200, description: "Page d'origine (chemin ou URL sans paramètre de requête personnel)." },
    parametresVersion: { type: "string", description: `Version des paramètres de evaluation_bloc.js (actuelle : ${PARAMETERS.version}).` },
    consentement: {
      type: "object", additionalProperties: false, required: ["accepte", "version", "horodatage"],
      properties: { accepte: { const: true, description: "Aucun envoi sans consentement explicite." }, version: { type: "string", minLength: 1, description: "Version du texte de consentement approuvé par P-O (inconnue à ce jour)." }, horodatage: { type: "string", format: "date-time" } },
    },
    localisation: {
      type: "object", additionalProperties: false, required: ["ville", "secteur"],
      properties: { ville: { enum: VILLE_IDS, description: "Ville (niveau RMR), seule localisation obligatoire." }, secteur: { anyOf: [{ type: "string", maxLength: 60, pattern: "^[^0-9]*$" }, { type: "null" }], description: "Quartier ou secteur, texte libre SANS chiffre (ni numéro civique ni code postal). Optionnel : décision de P-O." } },
    },
    entrees: { type: "object", additionalProperties: false, required: ["type", "ville"], properties: entreesProps },
    resultat: {
      type: "object", additionalProperties: false, required: ["fourchette", "rbp", "rbe", "depenses", "rne", "portes", "methodes", "alertes", "financementCentral", "vendeur"],
      properties: {
        fourchette: { type: "object", additionalProperties: false, required: ["bas", "central", "haut", "arrondi"], properties: { bas: nombreOuNull, central: nombreOuNull, haut: nombreOuNull, arrondi: { type: "number" } }, description: "null = fourchette non définie (aucune méthode utilisable)." },
        rbp: nombreOuNull, rbe: nombreOuNull, depenses: nombreOuNull, rne: nombreOuNull, portes: { type: "number" },
        methodes: { type: "array", minItems: 4, maxItems: 4, items: { type: "object", additionalProperties: false, required: ["id", "utilisee", "bas", "central", "haut", "poids", "statut"], properties: { id: { enum: ["rev", "par", "mrb", "mrn"] }, utilisee: { type: "boolean" }, bas: nombreOuNull, central: nombreOuNull, haut: nombreOuNull, poids: nul({ type: "number", minimum: 0, maximum: 1 }), statut: { enum: ["Confirmé", "Déduit", "Estimé", "Hypothèse"] } } } },
        alertes: { type: "array", items: { type: "string", maxLength: 120 }, description: "Titres des points de vigilance." },
        financementCentral: { type: "array", items: { type: "object", additionalProperties: false, required: ["programme", "miseP", "rcd", "miseMinimaleSuffisante"], properties: { programme: { type: "string" }, miseP: nombreOuNull, rcd: nombreOuNull, miseMinimaleSuffisante: { type: "boolean" } } } },
        vendeur: { anyOf: [{ type: "null" }, { type: "object", additionalProperties: false, required: ["produitNetVendeur", "impotEstime", "statut"], properties: { produitNetVendeur: nombreOuNull, impotEstime: nombreOuNull, statut: { const: "Estimé" } } }], description: "null par défaut. Présent seulement si P-O approuve l'envoi du volet vendeur ET que la personne l'a activé." },
      },
    },
    hp: { type: "string", maxLength: 0, description: "Anti-pollution (honeypot) : doit être vide. Un champ rempli = robot, le serveur ignore la requête." },
  },
};
writeFileSync(new URL("../schema_donnees.json", import.meta.url), JSON.stringify(schema, null, 2));
console.log("schema_donnees.json écrit;", Object.keys(entreesProps).length, "propriétés d'entrées");
