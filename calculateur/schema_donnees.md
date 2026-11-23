# Données envoyées au backend — schéma (`schema_donnees.json`)

> **BROUILLON — À approuver par P-O.** Rien n'est envoyé aujourd'hui : l'envoi est désactivé (`CONFIG.envoiActif = false` dans `evaluation_bloc.js`) tant que l'hébergeur et la région du backend ne sont pas confirmés (Loi 25) et que P-O n'a pas approuvé. Voir `backend_questions.md`.

Le schéma (`schema_donnees.json`, JSON Schema 2020-12) est **généré** de `CHAMPS` (`node verification/generer_schema.mjs`) et le payload est produit par `construirePayload(entrees, resultat, meta)`. Les tests (`node tests.js`) valident les payloads des 10 cas contre ce schéma.

## Contenu du payload (requête POST JSON)

| Clé | Contenu | Remarque |
|---|---|---|
| `schemaVersion` | `"1.0"` | |
| `horodatage` | date-heure ISO 8601 de l'envoi | |
| `pageOrigine` | chemin ou URL de la page (≤ 200 caractères) | sans paramètre de requête personnel |
| `parametresVersion` | version de `PARAMETERS` (ex. `0.1.0-brouillon-2026-11-19`) | permet de relire d'anciennes données avec les bons taux et barèmes |
| `consentement` | `{ accepte: true, version, horodatage }` | **aucun payload sans consentement explicite**; `version` = version du texte approuvé (inconnue à ce jour : `construirePayload` refuse tant qu'elle est absente) |
| `localisation` | `{ ville, secteur }` | `ville` = une des 7 villes (niveau RMR, seule localisation obligatoire); `secteur` = quartier optionnel, texte libre **sans chiffre** (≤ 60 caractères; un chiffre = refusé, donc ni numéro civique ni code postal) |
| `entrees` | valeurs saisies, **numériques ou choix seulement** | type d'immeuble, ville, nombre de portes et loyers par taille, autres revenus, inoccupation, 8 postes de dépenses, TGA, écart, pondérations, arrondi, 5 comparables (prix, portes, RBP, RNE, ajustement), MRB et MRN manuels, évaluation municipale (terrain, bâtiment, année), paramètres de financement, frais de l'acheteur |
| `resultat` | fourchette (bas, central, haut, arrondi), RBP, RBE, dépenses, RNE, portes, les 4 méthodes (utilisée?, bas, central, haut, poids, statut), titres des alertes, financement au prix central (mise en %, RCD, mise minimale suffisante), `vendeur` | `null` = non défini (ex. aucune méthode utilisable) |
| `hp` | chaîne **vide** | anti-pollution (honeypot) : toute valeur = robot, requête ignorée |

## Jamais dans le payload (garanti par le code et testé)

- Nom, courriel, téléphone, **adresse exacte**, nom du courtier (`adresse`, `prepare`).
- Désignation et date des comparables (`c1Nom`…`c5Nom`, `c1Date`…`c5Date`) : peuvent contenir une adresse ou identifier une vente.
- Le drapeau `demo` (comparables fictifs).
- Toute propriété hors schéma (`additionalProperties: false`).
- Les coordonnées d'une personne qui demande à être contactée : elles passent **uniquement par le formulaire GHL habituel**, jamais par ce payload, et ne sont **pas liées** au payload (aucun identifiant commun) à moins que P-O le décide expressément.

## Volet vendeur (désactivé par défaut)

Les champs du volet vendeur (solde hypothécaire, pénalité, prix d'achat, DPA, etc.) et son résultat sont des **données financières personnelles** : ils sont **absents** du payload par défaut, même si la personne utilise le volet. Le schéma les accepte comme propriétés *optionnelles*; ils ne partent que si l'intégrateur passe `inclureVendeur: true`, ce qui exige une approbation de P-O (voir décisions).

## Garde-fous techniques

- Valeurs non finies (`NaN`, `Infinity`) converties en `null`.
- Bornes (`minimum`, `maximum`) = *propositions* issues de `champs.json`.
- Le backend doit **revalider** le schéma côté serveur (ne jamais faire confiance au navigateur), refuser toute propriété inconnue, et limiter la taille du corps (proposition : 16 Ko).
- Le payload ne contient volontairement ni adresse IP ni identifiant de visiteur. L'adresse IP vue par le serveur est un renseignement potentiellement personnel : à traiter dans `backend_questions.md` (journalisation, limitation de débit).

## Décisions pour P-O (données)

1. **Autre chose que ce schéma est-il voulu ?** (ex. plus de détail, moins de détail, ou une localisation plus fine que la ville.) Recommandation : s'en tenir à ce schéma minimal.
2. **Secteur / quartier** : l'offrir (utile pour des statistiques par secteur) ou n'envoyer que la ville?
3. **Volet vendeur** : jamais envoyé (recommandé), ou envoyé avec consentement distinct?
4. **Dates de comparables** : exclure (actuel) ou envoyer au mois près (`aaaa-mm`) pour analyser la fraîcheur des ventes?
5. **Lien avec le formulaire GHL** : aucun (actuel, recommandé), ou un code de référence aléatoire affiché à la personne pour qu'elle puisse demander la suppression de son envoi? (Sans code, un envoi non nominatif ne peut pas être retrouvé pour un retrait de consentement : voir `textes_a_approuver.md`.)
6. **Finalité exacte** de la base de données (statistiques de marché, amélioration de l'outil, autre) : elle doit être dans le texte de consentement.
