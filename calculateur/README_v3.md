# Évaluation de bloc — version 3 (brouillon)

À l'attention de P-O et de l'agent « analyse web seo gso ». **Brouillon à approuver.** Les fichiers v1 et v2 ne sont pas remplacés.

Calculs dans le navigateur. **Rien n'est envoyé** (`CONFIG_V3.envoiActif = false`, aucun `fetch`). Compatible avec la logique de consentement de `donnees_v2.js`.

## Source du « site d'analyse »

La demande était d'appliquer les calculs du site d'analyse **plex-ai.io**.

**Constat du 2026-11-23 (America/Toronto) : plex-ai.io n'était pas accessible.** Les formules de la v3 sont donc celles des **Pages Plex.io** déjà utilisées comme outils d'analyse internes :

- rendement : canvas `4f2296d9-3c28-4635-93d3-7ef120a99ee8` (cash-on-cash, TRI, VAN, MIRR, multiple des capitaux, point mort, limites de zonage saisies — **situation actuelle, vue prudente, dépenses détaillées**);
- terrain / valeur résiduelle et meilleur usage : canvas `ea70c286-dd54-4260-a0ce-fad8fa8ad3bc`;
- gain en capital : déjà présent dans `evaluer()` v1 (section vendeur). Le canvas `cec7299b-ff7d-45e2-ba89-202ee1e88e27` n'ajoute pas de formule manquante à porter pour ce périmètre.

### Ce qui a été vérifié (lecture seule, rien n'a été modifié)

- `https://plex-ai.io` et `https://www.plex-ai.io` : échec TLS (« unrecognized name ») en HTTPS ; en HTTP, réponse **500** (serveur Pingora, corps vide). Cohérent avec les 500/504 observés depuis le 16 novembre 2026.
- GitHub, compte connecté, lecture seule : le dépôt public `warden-ops/Vendremonplex` (https://github.com/warden-ops/Vendremonplex) existe, mais ne contient que `index.html`, `CNAME`, `README.md` et `.gitattributes` — pas le code du calculateur d'analyse.
- Aucun dépôt public sous `warden-ops` nommé `plex`, `plex-ai`, `plexai` ou `plexio`. Recherche de code correspondante : aucun résultat.
- Aucune copie locale du code de plex-ai.io n'a été trouvée sous `/workspace` ni `/home/box`.
- Le compte GoDaddy qui héberge plex-ai.io n'a pas été ouvert.

### Périmètre volontairement non porté

La Page rendement contient aussi Monte Carlo, courte durée, fiscalité après impôt, refinancement, programmes MLI Select, coût évité d'occupant, etc. Ces modules **ne sont pas** reproduits en v3. Seul le chemin « situation actuelle / vue prudente / dépenses détaillées » l'est, plus le module résiduel de la Page terrain.

Chaque paramètre porté a un statut (Confirmé / Déduit / Estimé / Hypothèse / Sourcé, utilisé comme hypothèse), une source et une date, dans `PARAMETERS_V3`. Les valeurs numériques de départ des Pages sont des **exemples fictifs** clairement identifiés (`EXEMPLE_FICTIF_RENDEMENT`, `EXEMPLE_FICTIF_RESIDUEL`). Les paramètres de zonage du module résiduel sont des champs à saisir ; au-delà de cet exemple fictif, aucun défaut « réel » n'est inventé.

Si un prix d'analyse n'est pas saisi, `evaluerRendement()` reprend la valeur centrale de `evaluer()` (v1) et le signale (`prixSource = "valeur_centrale"`).

## Références de zonage

`zonage_references_v3.json` : liens officiels (règlements, grilles, cartes) pour des municipalités principales de **l'Estrie** (Granby / Montérégie exclus). Chaque entrée : municipalité, type de document, URL, date de vérification (2026-11-23, America/Toronto), statut HTTP et statut d'accès.

Les URL qui ont renvoyé **404** sont exclues. Les **403**, délais et erreurs TLS sont **conservés et signalés**. Une réponse 200 confirme seulement que le document chargeait ce jour-là.

Textes d'avertissement et d'invitation à vérifier : `textes_a_approuver_v3.md` (**À approuver par P-O**). L'interface peut appeler `referencesZonage(municipalite)` et `texteVerificationZonage(...)`.

## Fichiers nouveaux (v3 seulement)

- `evaluation_bloc_v3.js` — réexporte la v1 et la v2 ; ajoute `evaluerRendement`, `limitesZonageRendement`, `evaluerResiduel`, `referencesZonage`, `construirePayloadV3`, `envoyerResultatsV3`
- `zonage_references_v3.json`
- `textes_a_approuver_v3.md`
- `tests_v3.js`
- `README_v3.md` (ce fichier)

## Tests

```bash
node tests.js          # v1, inchangé
node tests_v2.js       # v2, inchangé
node tests_v3.js       # v3 (y compris : les résultats v1 et v2 restent identiques)
npm test               # les trois suites
```

## Intégration

Importer `evaluation_bloc_v3.js` (et le JSON de zonage à côté). Ne pas activer l'envoi. Ne pas pointer vers plex-ai.io tant que le site, l'hébergeur et la région (Loi 25) ne sont pas confirmés.
