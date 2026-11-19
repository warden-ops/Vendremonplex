# Backend plex-ai.io — questions ouvertes (seul P-O peut y répondre)

> **BROUILLON — À approuver par P-O.** Aucune donnée n'est envoyée, aucun compte n'a été ouvert, rien n'a été touché sur plex-ai.io. Ce document liste ce qui est **inconnu** et propose une conception **par défaut** (marquée *proposition*, pas existante).

## État connu (ce qu'on sait)

| Fait | Statut | Source |
|---|---|---|
| plex-ai.io répond en erreur **HTTP 500 / 504** depuis le **16 nov. 2026** | Confirmé (constaté par l'agent « analyse web seo gso » : 500; 504 aussi signalé) | constats de l'agent SEO |
| plex-ai.io est dans **l'autre compte GoDaddy de P-O** | Confirmé (indiqué par P-O) | P-O |
| **Hébergeur et région** du backend | **INCONNUS** | — |
| La **Loi 25** exige des données au Québec / conformité de l'hébergement | **Ne peut pas être confirmée** tant que l'hébergeur et la région sont inconnus | — |
| vendremonplex.com est un **site statique sur GitHub Pages, sans serveur** | Confirmé (agent SEO) | agent SEO |
| Un site statique ne peut pas stocker de données lui-même | Déduit | — |

> **Tant que l'hébergement n'est pas confirmé, la maquette fonctionne SANS rien envoyer.** Dans `evaluation_bloc.js` : `CONFIG.envoiActif = false`, `CONFIG.endpoint = null`; `envoyerResultats()` retourne `{ envoye: false, raison: "Envoi désactivé…" }` sans jamais appeler `fetch` (testé : `node tests.js`). Aucun changement de ces deux valeurs sans l'approbation de P-O.

## Décisions à prendre (à ma connaissance, rien de ceci n'existe encore)

1. **Où est l'application derrière plex-ai.io?** Quel hébergeur (GoDaddy hébergement partagé / VPS / autre), quelle **région**, quel compte? Qui a les accès? Pourquoi les erreurs 500/504 depuis le 16 nov. (expiration, renouvellement, panne applicative, plafond de ressources)?
2. **Faut-il réparer plex-ai.io ou héberger le point de réception ailleurs** (hébergeur ayant un centre de données au Québec, à confirmer par écrit)? Le nom plex-ai.io peut changer (P-O) mais reste le « backend ».
3. **URL exacte du point de réception (endpoint)** : [À DÉFINIR — inconnue].
4. **Méthode** : POST?
5. **Format de la requête** : JSON conforme à `schema_donnees.json` (voir `schema_donnees.md`)?
6. **Format de la réponse** : code et corps (voir proposition).
7. **CORS** : origines autorisées — `https://vendremonplex.com` seulement? aussi `https://www.vendremonplex.com`? (domaine exact et variantes à confirmer par P-O.) Les aperçus de PR GitHub Pages ne doivent **pas** être autorisés en production.
8. **Limite d'envois** (par adresse IP / par période) et valeurs.
9. **Anti-pollution** : honeypot (`hp`), jeton, ou les deux?
10. **Stockage** : où va la donnée (base, fichier, feuille)? Qui y accède? Comment alimente-t-elle « notre base d'information » (chez nous, au Québec)?
11. **Journalisation** : l'adresse IP vue par le serveur est potentiellement un renseignement personnel : la conserve-t-on? (Proposition : non, hors limitation de débit à court terme.)
12. **Durée de conservation**, suppression, retrait du consentement (voir `textes_a_approuver.md`).
13. **Responsable de la protection des renseignements personnels** (nom, courriel) et **entité responsable**.
14. **Surveillance** : qui est avisé si le point de réception tombe (on ne veut pas que le calculateur bloque quand le backend est en panne)?

## Conception par défaut — **PROPOSITION** (rien de ceci n'existe)

> Valeurs entre crochets = *à ajuster / à décider*. Aucune n'est en place.

- **Requête :** `POST [URL DE L'ENDPOINT — À DÉFINIR]` avec `Content-Type: application/json`, corps = payload de `construirePayload()` (≤ 16 Ko), conforme à `schema_donnees.json`. Aucun cookie (`credentials: "omit"`), aucun en-tête personnalisé (évite une requête de pré-vérification inutile).
- **Réponse :** `204 No Content` (succès, aucun corps); `400` schéma invalide (corps minimal, sans écho des données); `403` origine non permise ou honeypot rempli (réponse volontairement identique à un succès pour ne pas guider les robots : *à décider*); `429` limite dépassée; `5xx` erreur serveur. **Aucun code de référence** n'est renvoyé tant que P-O n'a pas décidé (voir décision 2 de `textes_a_approuver.md`).
- **Honeypot :** champ `hp` (chaîne vide); toute valeur non vide = requête ignorée silencieusement. Côté page, le champ est un `<input>` caché (hors écran, `tabindex="-1"`, `autocomplete="off"`), pas un champ du formulaire visible.
- **Limite d'envois par IP :** [10 par heure — VALEUR PROPOSÉE, À AJUSTER], avec une fenêtre courte; l'IP n'est utilisée que pour la limitation, puis oubliée ([24 h au maximum — À DÉCIDER]); jamais écrite avec les données du calcul.
- **CORS :** `Access-Control-Allow-Origin: https://vendremonplex.com` [variante `www` à confirmer], méthode `POST` (et `OPTIONS` si nécessaire), `Content-Type`; pas de caractère générique `*`.
- **Validation côté serveur :** rejeter toute propriété inconnue; revalider bornes et types; refuser un `consentement.accepte` différent de `true`; rejeter `pageOrigine` hors du site.
- **Jeton (option, plus fort que le honeypot) :** jeton signé de courte durée délivré à l'ouverture de la page; **nécessite un serveur** : non applicable à un site statique seul. À envisager seulement si le honeypot ne suffit pas.
- **Défaillance du backend :** le calculateur affiche toujours le résultat; l'échec d'envoi est silencieux pour la personne (sans relance automatique) et un message neutre peut s'afficher : « Votre estimation est affichée. La transmission des données n'a pas pu être faite. » (*texte proposé, à approuver*).
- **Données au Québec :** aucune activation tant que l'hébergeur et la région ne sont pas confirmés au Québec **par écrit** (ou qu'une évaluation de la conformité est faite si ce n'est pas le cas).

## Comment la maquette fonctionne sans envoyer de données

- `evaluation_bloc.js` : `evaluer()` est pure, sans réseau.
- `construirePayload()` peut être appelée pour **prévisualiser** ce qui partirait (utile pour montrer à P-O), mais n'envoie rien.
- `envoyerResultats()` : **désactivée par défaut**. Elle ne fait rien (et n'appelle jamais `fetch`) tant que `CONFIG.envoiActif !== true`. Même activée, elle exige un endpoint, un consentement vrai et un honeypot vide.
- Pour la PR en brouillon : **ne pas modifier `CONFIG`**; ne pas câbler de bouton d'envoi actif; ne pas afficher la case de consentement tant que le texte n'est pas approuvé. Afficher le texte de transition (a0) : « Aucune donnée n'est transmise… ».

## Ce que l'agent d'intégration NE doit PAS faire sans l'OK de P-O

Fusionner la PR, publier, activer l'envoi, changer `CONFIG`, contacter GoDaddy ou plex-ai.io, modifier GHL ou QBO, inscrire une URL d'endpoint inventée.
