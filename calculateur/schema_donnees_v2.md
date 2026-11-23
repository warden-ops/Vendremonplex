# Données envoyées au backend — VERSION 2 (`schema_donnees_v2.json`)

> **BROUILLON — À approuver par P-O.** Décision de P-O du 2026-11-19 : conserver les renseignements nominatifs (nom, téléphone, courriel, adresse exacte de l'immeuble, nombre de logements, prix payé, toutes les entrées) sous la Loi 25. La v1 (`schema_donnees.json`, sans donnée nominative) est conservée.
> **Rien n'est envoyé :** `CONFIG_V2.envoiActif = false` (`donnees_v2.js`). Backend inconnu : plex-ai.io est dans l'autre compte GoDaddy de P-O et répond en erreur 500/504 depuis le 16 nov. 2026; hébergeur et région inconnus.

Le schéma est généré par `node verification/generer_schema_v2.mjs`; le payload par `construirePayloadV2(entrees, resultat, meta)` dans `donnees_v2.js`; `node tests_v2.js` valide les payloads.

## Consentement (obligatoire avant tout envoi)

| Clé | Contenu |
|---|---|
| `consentement.accepte` | `true` (constante) |
| `consentement.methode` | `"case_a_cocher_non_precochee"` (constante) : provient d'une case **cochée par la personne**, jamais précochée |
| `consentement.version` | version du texte de consentement **approuvé par P-O** (inconnue à ce jour; sans elle, `construirePayloadV2` refuse) |
| `consentement.horodatage` | moment où la case a été cochée |
| `consentement.finalites` | au moins une : `contact_evaluation` (vous contacter au sujet de votre évaluation), `statistiques_marche` (statistiques de marché) — **une case par finalité** |

`construirePayloadV2` lève une erreur si aucune case n'est cochée (`true` strict), si la version ou l'horodatage manque, ou si la page d'origine manque. `envoyerResultatsV2` refuse aussi un payload sans consentement, un endpoint non HTTPS, ou une identité sans la finalité `contact_evaluation`.

## Contenu

| Bloc | Contenu | Condition |
|---|---|---|
| `identite` | `prenom`, `nom`, `telephone`, `courriel` (téléphone OU courriel requis) | **seulement avec `contact_evaluation`**, sinon `null` |
| `immeuble` | `adresse` exacte, `municipalite`, `codePostal` | adresse, municipalité et code postal **seulement avec `contact_evaluation`**, sinon `null` |
| `immeuble` | `ville` (RMR de référence), `nombreLogements`, `prixAchat`, `anneeAchat`, `prixPayeParPorte` (*Déduit* : prix d'achat / logements) | toujours |
| `entrees` | **toutes** les entrées de l'évaluation (122 champs : loyers, dépenses, TGA, comparables, financement, volet vendeur, etc.) | toujours; textes libres pouvant identifier (`adresse`, `prepare`, `c#Nom`, `c#Date`) **seulement avec `contact_evaluation`** |
| `resultat` | fourchette, RBP, RBE, dépenses, RNE, portes, valeur centrale par porte, 4 méthodes, alertes, financement au prix central, volet vendeur (si activé) | toujours |
| `horodatage`, `pageOrigine`, `parametresVersion`, `hp` | comme en v1 (`hp` = honeypot, doit être vide) | toujours |

Le schéma applique la règle conditionnelle (`if` / `then` / `else`) : sans `contact_evaluation`, `identite` doit être `null`, l'adresse exacte `null`, et les textes libres identifiants absents. Toute propriété hors schéma est refusée (`additionalProperties: false`).

## Garde-fous pour le backend (à mettre en place, rien n'existe)

- Revalider le schéma côté serveur; HTTPS obligatoire; chiffrement au repos; accès restreint et journalisé; aucune donnée dans les journaux d'erreurs.
- Les renseignements personnels ne doivent **pas** être communiqués à un tiers (dont des outils d'autocomplétion d'adresse ou d'analyse) sans décision de P-O et mention dans l'avis.
- Hébergement au Québec à confirmer; sinon **évaluation des facteurs relatifs à la vie privée (ÉFVP) obligatoire** avant toute communication hors Québec (Loi 25, voir `textes_a_approuver_v2.md`).

## Décisions pour P-O (données v2)

1. **Règle « statistiques seulement »** (proposée) : sans la case « contact », aucune identité, coordonnée ni adresse exacte n'est envoyée. Garder cette règle? (Recommandé : oui; les statistiques n'ont pas besoin de l'identité.)
2. **Une ou deux cases** de consentement? (Deux recommandées : la Loi 25 demande un consentement pour chaque fin précise.)
3. **Volet vendeur** (solde hypothécaire, pénalité, DPA, impôt estimé) : maintenant envoyé avec le reste (« toutes les entrées »). Le confirmer, car ce sont des renseignements financiers sensibles.
4. **Prix payé** : l'afficher hors du volet vendeur pour le recueillir à chaque fois?
5. **Lien avec GHL** : faut-il aussi pousser les contacts dans GHL? (Rien n'est fait dans GHL; un transfert vers GHL serait une communication à un tiers à mentionner dans l'avis et à faire évaluer.)
