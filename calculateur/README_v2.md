# Dossier de remise — VERSION 2 (collecte avec renseignements personnels)

**BROUILLON — À approuver par P-O. Rien n'est publié ni envoyé; envoi désactivé par défaut.** Décision de P-O du 2026-11-19 : conserver nom, téléphone, courriel, adresse exacte, nombre de logements, prix payé et toutes les entrées, avec la Loi 25. La v1 est conservée intacte (`README.md`, `schema_donnees.json`, `champs.*`, `textes_a_approuver.md`, `backend_questions.md`, `tests.js`).

| Fichier v2 | Rôle |
|---|---|
| `donnees_v2.js` | Champs de contact, `construirePayloadV2()` (consentement obligatoire), `envoyerResultatsV2()` (**désactivé**), `CONFIG_V2`; réutilise le calcul inchangé de `evaluation_bloc.js` |
| `schema_donnees_v2.json`, `schema_donnees_v2.md` | Schéma du payload v2 (identité, immeuble, consentement, règle conditionnelle) |
| `champs_v2.json`, `champs_v2.md` | Champs ajoutés et changements d'envoi |
| `textes_a_approuver_v2.md` | Consentement Loi 25 v2 (deux cases, avis détaillé, note ÉFVP) |
| `backend_questions_v2.md` | Questions ajoutées pour un backend qui reçoit des renseignements personnels |
| `tests_v2.js` | `node tests_v2.js` |
| `verification/mini_schema_v2.mjs`, `generer_schema_v2.mjs`, `generer_champs_v2.mjs` | Validateur et générateurs v2 |

Tous les tests : `node tests.js && node tests_v2.js` (ou `npm test`).
