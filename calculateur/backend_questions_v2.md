# Backend plex-ai.io — questions ouvertes, VERSION 2 (renseignements personnels)

> **BROUILLON — À approuver par P-O.** La v1 (`backend_questions.md`) reste valide; ce document ajoute ce qui change parce que le backend recevra maintenant des **renseignements personnels** (décision de P-O du 2026-11-19). Rien n'a été envoyé, rien n'a été touché sur plex-ai.io, GoDaddy, GHL ou QBO.

## État (inchangé)

- plex-ai.io répond en erreur **HTTP 500/504 depuis le 16 nov. 2026**; il est dans **l'autre compte GoDaddy de P-O**; **hébergeur et région inconnus**.
- vendremonplex.com est un site statique (GitHub Pages), sans serveur.
- **L'envoi reste désactivé** : `CONFIG_V2.envoiActif = false`, `endpoint = null`, `versionConsentement = null` dans `donnees_v2.js`. `envoyerResultatsV2()` n'appelle jamais `fetch` dans cet état (testé).

## Nouvelles questions (renseignements personnels)

1. **Hébergeur et région** : au Québec? Sinon, **ÉFVP obligatoire avant tout envoi** (Loi 25) et mention dans l'avis.
2. **Chiffrement** : HTTPS (exigé par `envoyerResultatsV2`) et chiffrement au repos de la base?
3. **Accès** : qui a accès aux données (comptes nominatifs, double authentification, journal des accès)?
4. **Conservation et suppression** : durée, procédure de suppression sur demande (accès, rectification, retrait du consentement).
5. **Registre des incidents** et procédure d'avis en cas d'incident de confidentialité.
6. **Communication à des tiers** : transfert vers GHL ou un autre outil? (Aucun aujourd'hui.)
7. **Journaux** : ne pas journaliser le corps des requêtes (il contient nom, coordonnées, adresse).
8. **Endpoint, méthode, format, CORS, limite d'envois, honeypot** : mêmes questions que la v1, toujours sans réponse.

## Conception proposée (inchangée sauf ajouts) — **PROPOSITION**, rien n'existe

- POST JSON conforme à `schema_donnees_v2.json`, HTTPS seulement, `credentials: "omit"`, CORS limité à vendremonplex.com [variantes à confirmer], honeypot `hp`, limite par IP [valeur à décider].
- Le serveur revalide la règle de consentement : sans `contact_evaluation`, refuser toute identité ou adresse exacte.
- Stockage séparé possible (proposition) : identité/coordonnées d'un côté, données de calcul de l'autre, reliées par un identifiant interne, pour faciliter les statistiques sans accès aux noms.

## Ce que l'agent d'intégration NE doit PAS faire sans l'OK de P-O

Activer l'envoi, modifier `CONFIG` ou `CONFIG_V2`, afficher le bloc coordonnées ou les cases sur le site public avant l'approbation des textes, inscrire une URL d'endpoint inventée, brancher une autocomplétion d'adresse externe, pousser des données vers GHL, fusionner ou publier.
