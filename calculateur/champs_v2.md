# Champs du calculateur — VERSION 2 (avec renseignements personnels sous consentement)

> **BROUILLON — À approuver par P-O.** Décision de P-O du 2026-11-19 : conserver le nom, le téléphone, le courriel, l'adresse exacte de l'immeuble, le nombre de logements, le prix payé (prix d'achat, prix payé par porte) et toutes les entrées de l'évaluation, avec la Loi 25 (« Ok pour loi 25 »).
> La v1 (`champs.md`) est conservée. Les champs de calcul sont inchangés (voir `champs.md` pour leur liste détaillée, leurs bornes, statuts et règles d'affichage); ce document décrit les **ajouts** et les **changements d'envoi**.

## Champs ajoutés (identité, coordonnées, immeuble, consentement)

| Clé | Étiquette (français) | Type | Obligatoire | Format / longueur | Défaut | Envoyé | Aide |
|---|---|---|---|---|---|---|---|
| `prenom` | Prénom | texte | oui, si consentement « contact » | ≤ 60 | — | oui (si consentement « contact ») | Requis si la personne accepte d'être contactée. |
| `nom` | Nom | texte | oui, si consentement « contact » | ≤ 80 | — | oui (si consentement « contact ») | Requis si la personne accepte d'être contactée. |
| `telephone` | Téléphone | texte | voir aide | motif, ≤ 25 | — | oui (si consentement « contact ») | Téléphone OU courriel requis. Numéro nord-américain à 10 chiffres. |
| `courriel` | Courriel | texte | voir aide | motif, ≤ 120 | — | oui (si consentement « contact ») | Téléphone OU courriel requis. |
| `adresseImmeuble` | Adresse de l'immeuble (numéro et rue) | texte | oui, si consentement « contact » | ≤ 120 | — | oui (si consentement « contact ») | Adresse exacte de l'immeuble évalué. Aucune recherche n'est faite à partir de l'adresse. |
| `municipalite` | Municipalité | texte | oui, si consentement « contact » | ≤ 80 | — | oui (si consentement « contact ») | Municipalité de l'immeuble (peut différer de la ville de référence SCHL). |
| `codePostal` | Code postal | texte | voir aide | motif, ≤ 7 | — | oui (si consentement « contact ») | Format A1A 1A1. |
| `consentContact` | J'accepte d'être contacté(e) au sujet de mon évaluation (texte exact : textes_a_approuver_v2.md) | booleen | non (case libre) | — | **non cochée** | oui (dans consentement.finalites) | Case NON cochée par défaut. Sans elle : aucune identité, coordonnée ni adresse exacte n'est envoyée. |
| `consentStats` | J'accepte que mes données servent à produire des statistiques de marché (texte exact : textes_a_approuver_v2.md) | booleen | non (case libre) | — | **non cochée** | oui (dans consentement.finalites) | Case NON cochée par défaut. Indépendante de la précédente. |

Formats proposés : téléphone nord-américain à 10 chiffres; courriel standard; code postal canadien `A1A 1A1` (normalisé en majuscules avec espace).

## Champs déjà présents, mis en évidence

| Clé | Étiquette | Envoi v2 |
|---|---|---|
| `n0`…`n3` | Nombre de logements par taille (total = nombre de logements, envoyé aussi dans `immeuble.nombreLogements`) | toujours |
| `prixAchat` | Prix d'achat ($) (aussi `immeuble.prixAchat`) | toujours (si > 0) |
| — | **Prix payé par porte** = prix d'achat / nombre de logements (*Déduit*, calculé, pas saisi) | toujours (si prix d'achat > 0) |
| `anAchat` | Année d'achat (aussi `immeuble.anneeAchat`) | toujours (si prix d'achat > 0) |
| `adresse` | Désignation libre | seulement avec « contact » |
| `prepare` | Préparé par (courtier) | seulement avec « contact » |
| `c1Nom`…`c5Nom`, `c1Date`…`c5Date` | Désignation et date des comparables | seulement avec « contact » |

**Remarque :** le prix d'achat et l'année d'achat sont dans le volet vendeur (désactivé par défaut). Pour toujours recueillir le prix payé, il faut afficher ces deux champs hors du volet vendeur (décision d'interface à confirmer par P-O).

## Changements d'envoi par rapport à la v1

- v1 : rien de nominatif, volet vendeur exclu. **v2 : toutes les entrées de calcul sont envoyées** (122 champs, volet vendeur compris : solde hypothécaire, pénalité, DPA, etc.), plus l'identité, les coordonnées et l'adresse exacte **si la case « contact » est cochée**.
- Le champ interne `demo` est envoyé (permet d'écarter les calculs faits avec des comparables fictifs).

## Affichage (ajouts v2)

- Bloc « Vos coordonnées » et « Immeuble » placés APRÈS l'affichage de la fourchette (le calcul reste utilisable sans rien fournir).
- Deux cases de consentement séparées, NON cochées par défaut, avec le texte exact de textes_a_approuver_v2.md et un lien vers l'avis détaillé. Le bouton « Envoyer » reste inactif tant qu'aucune case n'est cochée.
- Si seule la case « statistiques » est cochée : masquer ou ignorer les champs d'identité, de coordonnées et d'adresse exacte (ils ne sont pas envoyés).
- Champs « Adresse de l'immeuble », « Municipalité », « Code postal » : aucune recherche ni autocomplétion par un service externe (aucune donnée ne doit partir vers un tiers sans décision de P-O).
- Tant que CONFIG_V2.envoiActif = false : NE PAS afficher le bloc coordonnées ni les cases de consentement sur le site public; garder la mention « Aucune donnée n'est transmise ».
