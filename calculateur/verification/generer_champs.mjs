// Génère ../champs.json et ../champs.md à partir de CHAMPS / PARAMETERS (evaluation_bloc.js).
import { writeFileSync } from "node:fs";
import { CHAMPS, PARAMETERS } from "../evaluation_bloc.js";

const AFFICHAGE = {
  principe: "Toujours afficher une FOURCHETTE (bas, central, haut) accompagnée de l'avertissement « estimation indicative »; jamais une valeur unique présentée comme un prix, une évaluation ou une promesse.",
  blocs: [
    { id: "fourchette", titre: "Fourchette de valeur", contenu: "Texte : « {désignation} : {portes} logements, RNE de {RNE}. Fourchette rapprochée de {k} méthode(s) sur 4, arrondie à {arrondi}. » Quatre métriques : Bas de la fourchette, Valeur centrale, Haut de la fourchette, « Demi-écart autour de la valeur centrale » (± x,x %, = (haut − bas) / 2 / central). Graphique optionnel : une barre par méthode utilisée plus la fourchette rapprochée." },
    { id: "methodes", titre: "Tableau des méthodes", colonnes: ["Méthode", "Base", "Bas", "Central", "Haut", "Pondération", "Statut"], regles: "Méthode non disponible : bas, central, haut = « — », statut « Données manquantes ». Méthode disponible mais de pondération 0 : « Non utilisée ». Sinon pondération = poids / somme des poids des méthodes disponibles (1 décimale). Le statut s'affiche en pastille : Confirmé, Déduit, Estimé, Hypothèse." },
    { id: "vigilance", titre: "Points de vigilance", contenu: "Tableau Point / Précision, affiché seulement s'il y a au moins une alerte (9 alertes possibles, voir resultat.alertes dans evaluation_bloc.js)." },
    { id: "revenu", titre: "Méthode du revenu", contenu: "Tableau de sensibilité à 5 lignes (TGA − écart, − écart/2, central, + écart/2, + écart) avec les positions « Haut de la fourchette du revenu », « Central », « Bas de la fourchette du revenu ». Texte du TGA implicite des comparables. Repère CBRE (T3 2026) : à afficher AVEC la mention « source secondaire, à valider » et « immeubles institutionnels, pas les plex de Sherbrooke »." },
    { id: "comparables", titre: "Comparables, MRB et MRN", contenu: "Tableau Comparable / Date / Prix ajusté / Prix par porte / MRB / MRN / TGA pour les comparables dont le prix vendu est > 0. Sans comparable : « Aucun comparable saisi », méthodes de parité, MRB, MRN non calculées. Rappeler : saisie manuelle de ventes vérifiées; l'outil ne consulte ni Centris ni JLR." },
    { id: "municipale", titre: "Évaluation municipale (référence seulement, exclue du rapprochement)", contenu: "Si terrain + bâtiment > 0 : évaluation totale, évaluation × facteur comparatif, valeur centrale / évaluation, fourchette / (évaluation × facteur), part du terrain. Sinon : « Saisissez l'évaluation inscrite au rôle pour afficher les ratios. »" },
    { id: "financement", titre: "Financement d'un acheteur type", contenu: "Tableau Programme / Point (Bas, Central, Haut) / Prix / Prêt (prime exclue) / Mise de fonds requise ($ et %) / Liquidités totales / RCD / Statut. Statut vert « Mise minimale de X % suffisante » ou orange « Mise de Y % requise ». Ligne par programme : « prix au-delà duquel la mise minimale ne suffit plus » ou « Non plafonné par le RCD (qualification personnelle) ». Texte d'accompagnement : liquidités totales = mise + droits de mutation + frais + taxe sur la prime; RCD sous 1,20 × = seuil indicatif; test du BSIF non appliqué; qualification personnelle non calculée." },
    { id: "vendeur", titre: "Côté vendeur : produit net (désactivé par défaut)", contenu: "Interrupteur « Afficher ». Si activé : tableau Étape / Montant, puis les 3 avertissements de resultat.vendeur.avertissements (estimation à valider avec un CPA; IMR non calculé; simplifications). Toujours étiqueté « Estimation, à valider avec un CPA »; jamais présenté comme un avis fiscal." },
    { id: "sommaire", titre: "Sommaire imprimable", contenu: "Fond blanc. Titre « Sommaire d'évaluation indicative d'un immeuble à revenus », « Préparé le {date}… — Équipe Chiasson De Francesco, RE/MAX D'ABORD, Sherbrooke » (mention RE/MAX D'ABORD À VALIDER par l'agence, voir textes_a_approuver.md). Encadré : « Fourchette indicative : {bas} à {haut} (valeur centrale {central}) » + avertissement. Statuts en pied de page. ATTENTION : la phrase de la Page « Aucune donnée n'est transmise par cet outil » devient FAUSSE si l'envoi est activé : à remplacer par le texte approuvé (voir textes_a_approuver.md)." },
    { id: "limites_sources", titre: "Hypothèses, limites, sources", contenu: "Reprendre sans les retirer : tableau « Hypothèses et statuts » (généré de PARAMETERS), texte « Limites » et liste des sources de la Page. Les mentions « source secondaire, à valider » ne doivent jamais être retirées." },
  ],
  avertissements: [
    "Bandeau permanent en haut : « Estimation indicative, pas une évaluation. » (texte à approuver, voir textes_a_approuver.md).",
    "Fourchette non définie (aucune méthode utilisable : NaN dans le résultat) : n'afficher aucune valeur; afficher « Données insuffisantes : saisissez des loyers et des dépenses valides, ou des comparables. » (TEXTE PROPOSÉ, absent de la Page, à approuver).",
    "Fourchette dont (haut / bas) > 1,3 : alerte « Fourchette large » (déjà dans le résultat).",
    "Comparables fictifs de démonstration : NE PAS offrir le bouton de démo aux visiteurs du site (décision de P-O); l'alerte et les statuts « Hypothèse » existent déjà si la démo est utilisée en interne.",
    "TGA central : toujours « Hypothèse » (aucune source publique pour Sherbrooke).",
  ],
};

writeFileSync(new URL("../champs.json", import.meta.url), JSON.stringify({
  _note: "Généré par verification/generer_champs.mjs depuis CHAMPS de evaluation_bloc.js. Les clés sont celles de la Page (champs plats). Bornes (min, max), « obligatoire » et « envoye » : PROPOSITIONS pour la version web (la Page n'impose aucune borne). Étiquettes, aides et statuts : repris de la Page. Les valeurs par défaut des champs « plex / multi » sont celles du type plex; voir PARAMETERS.defauts pour multi.",
  parametresVersion: PARAMETERS.version,
  champs: CHAMPS.map((c) => ({ ...c })),
  affichage: AFFICHAGE,
}, null, 2));

const g = {};
for (const c of CHAMPS) (g[c.groupe] ||= []).push(c);
const cell = (v) => (v === null || v === undefined || v === "" ? "—" : String(v).replace(/\|/g, "\\|"));
let md = `# Champs du calculateur « Évaluation de bloc » (vendremonplex.com)

> **BROUILLON — À approuver par P-O.** Généré de \`evaluation_bloc.js\` (\`CHAMPS\`); la version lisible par machine est \`champs.json\`.
> Clés plates identiques à celles de la Page canvas \`dd69dd2b-19a5-4bee-aae7-4fb0b4074466\` (lue le 2026-11-19).
> Les valeurs numériques s'acceptent au format québécois (« 1 062 », « 5,34 », « 4 500 $ ») ou comme nombres.

## Lecture des colonnes

- **Obligatoire**, **Min**, **Max** : *propositions pour la version web*. La Page n'impose aucune validation (valeur vide = 0). \`validerEntrees()\` applique ces propositions (erreurs bloquantes) mais \`evaluer()\` n'en applique aucune, comme la Page.
- **Défaut** : valeur de départ de la Page (triplex fictif, Sherbrooke, type plex). Le type et la ville rechargent des valeurs (voir plus bas).
- **Statut / Source / Date** : repris de la Page (Confirmé, Déduit, Estimé, Hypothèse). Une cellule « — » = aucun statut (champ de choix ou de saisie libre).
- **Envoyé** : \`oui\` = fait partie du payload (voir \`schema_donnees.md\`); \`non\` = jamais envoyé, affichage et calcul locaux seulement.

## Règles de rechargement (comme la Page)

- **Changer le type** (plex ⇄ 5 logements et plus) recharge : nombres de logements et les 8 postes de dépenses (valeurs d'exemple Plex.io, statut Hypothèse). Plex : 0, 0, 2, 1; taxes mun. 4 500, scol. 500, assurances 2 500, énergie 600, entretien 1 800, réserve 900, autres 0, gestion 5 %. Multi : 0, 0, 4, 2; 8 000, 1 000, 4 800, 2 000, 3 600, 1 800, 0, 5 %.
- **Changer la ville** recharge : loyers SCHL par taille, inoccupation SCHL et facteur comparatif (voir \`PARAMETERS.villes\`). Sherbrooke : 712, 905, 1 062, 1 375 $; 2,7 %; 1,08. Afficher à côté de chaque loyer « SCHL : {loyer moyen de la ville} » et sous la liste « Fiabilité SCHL : {cote} ».
- Dans le code : \`entreesParDefaut(type, ville)\`.

## Villes offertes

| Valeur | Libellé | Fiabilité SCHL | Droits de mutation | Facteur comparatif |
|---|---|---|---|---|
${Object.entries(PARAMETERS.villes).map(([k, v]) => `| \`${k}\` | ${v.nom} | ${v.fiabilite.value} | ${v.droitsMutation.status} | ${v.facteurComparatif.value} (${v.facteurComparatif.status}) |`).join("\n")}

`;
for (const [grp, lst] of Object.entries(g)) {
  md += `## ${grp}\n\n| Clé | Étiquette (français) | Type | Unité | Obligatoire | Min | Max | Défaut | Statut | Envoyé | Aide / remarque |\n|---|---|---|---|---|---|---|---|---|---|---|\n`;
  for (const c of lst) {
    const aide = [c.aide, c.afficheSi ? `Visible si : ${c.afficheSi}.` : "", c.options ? `Options : ${c.options.map((o) => `${o.valeur} = ${o.etiquette}`).join("; ")}.` : "", c.lectureSeule ? "Lecture seule." : "", c.maxLength ? `Longueur max. ${c.maxLength}.` : ""].filter(Boolean).join(" ");
    md += `| \`${c.cle}\` | ${cell(c.etiquette)} | ${c.type} | ${cell(c.unite)} | ${c.obligatoire ? "oui" : "non"} | ${cell(c.min)} | ${cell(c.max)} | ${cell(c.defaut)} | ${cell(c.statut)} | ${c.envoye} | ${cell(aide)} |\n`;
  }
  md += "\n";
}
md += `## Affichage des résultats

**Principe :** ${AFFICHAGE.principe}

${AFFICHAGE.blocs.map((b) => `### ${b.titre}\n\n${b.contenu || ""}${b.colonnes ? `\n\nColonnes : ${b.colonnes.join(" · ")}.\n\n${b.regles}` : ""}`).join("\n\n")}

## Avertissements et cas limites à l'affichage

${AFFICHAGE.avertissements.map((a) => `- ${a}`).join("\n")}

## Champs non exposés dans la Page (valeurs fixes) à afficher en lecture seule ou à garder fixes

\`incl\` (taux d'inclusion 50 %, Confirmé), \`abat\` (abattement du Québec 16,5 %, Confirmé), \`tm\` (53,31 %, Déduit; exposé seulement en mode taux constant), \`tSpcc\` (50,17 %, Estimé : source secondaire, à valider).

## Décisions pour P-O (champs)

1. Faut-il afficher le **côté vendeur** (produit net, gain en capital) au public ou le réserver à l'usage interne du courtier? (Désactivé par défaut; ses champs ne sont jamais envoyés par défaut.)
2. Faut-il offrir le bouton de **comparables fictifs (démo)** sur le site? Recommandation : non.
3. Les **bornes** et les champs **obligatoires** ci-dessus sont des propositions; à ajuster.
4. Les **comparables** : le public a-t-il accès à cette saisie (il faudrait de vraies ventes vérifiées), ou la méthode de parité/MRB/MRN est-elle réservée au courtier? Sans comparables, seule la méthode du revenu s'applique (fourchette large et basée sur le TGA, qui est une Hypothèse).
`;
writeFileSync(new URL("../champs.md", import.meta.url), md);
console.log("champs.json et champs.md écrits;", CHAMPS.length, "champs");
