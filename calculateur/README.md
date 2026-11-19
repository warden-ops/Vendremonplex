# Dossier de remise — calculateur « Évaluation de bloc » pour vendremonplex.com

**BROUILLON — À approuver par P-O. Rien n'est publié, rien n'est envoyé, GHL et QBO ne sont pas touchés.**

Source : Page canvas `dd69dd2b-19a5-4bee-aae7-4fb0b4074466` « plex-ai.io — Évaluation de bloc (prototype) » (lue le 2026-11-19), bâtie sur les Pages Plex.io `4f2296d9-…`, `cec7299b-…`, `ea70c286-…`.

| Fichier | Rôle |
|---|---|
| `evaluation_bloc.js` | Module ES vanilla : `evaluer()` (pure), `PARAMETERS` (valeur, statut, source, date), `entreesParDefaut()`, `validerEntrees()`, `construirePayload()`, `envoyerResultats()` (**désactivé par défaut**), `CHAMPS`, `CONFIG` |
| `tests.js` | `node tests.js` — 35 contrôles dont 10 cas de calcul comparés à la logique de la Page |
| `tests_cas.json`, `tests_attendus.json` | Cas et résultats attendus (calculés par l'oracle, pas par le module) |
| `champs.md`, `champs.json` | Liste exacte des champs et règles d'affichage |
| `schema_donnees.json`, `schema_donnees.md` | Schéma du payload (sans donnée nominative) |
| `textes_a_approuver.md` | Consentement Loi 25, mise en garde, conformité OACIQ — **À approuver par P-O** |
| `backend_questions.md` | Inconnues du backend plex-ai.io et conception proposée |
| `verification/` | `page_oracle.ts` (copie de la logique de la Page), générateurs, comparaison aléatoire (`fuzz_oracle.mjs`), mini validateur de schéma |

## Utilisation (page statique)

```html
<script type="module">
  import { evaluer, entreesParDefaut } from "./evaluation_bloc.js";
  const entrees = { ...entreesParDefaut("plex", "sherbrooke"), n2: 3, l2: "1 100" };
  const r = evaluer(entrees);
  // r.fourchette = { bas, central, haut, arrondi, nbMethodesUtilisees, nbMethodes }
  // NaN = non défini (aucune méthode utilisable) : ne rien afficher, voir champs.md
</script>
```

Ne pas modifier `CONFIG` (envoi désactivé). `evaluation_bloc.js` doit être servi comme module (`type="module"`).

## Fidélité à la Page

`evaluer()` reprend la logique de la Page ligne à ligne (mêmes champs de résultat que le calcul `r` de la Page). Vérification : 10 cas fixes + 3 000 cas aléatoires (graine fixe) identiques à l'oracle (`node verification/fuzz_oracle.mjs`). Différences voulues avec la Page : (1) `entreesParDefaut(type, ville)` remplace les boutons de rechargement; (2) `evaluer` accepte nombres ou chaînes québécoises; (3) compléments d'affichage (`fourchette`, `reperes`, `municipale`, `vendeur`…); (4) validation et bornes = propositions, absentes de la Page.

## Limites connues (à ne pas masquer)

- Statut `Hypothèse` ajouté (non indiqué dans la Page) pour : droits de mutation de Magog, Gatineau, Trois-Rivières et Saguenay (barème de base, la Page ne confirme que Sherbrooke, Québec, Montréal); amortissement par défaut du propriétaire occupant (25 ans); années d'achat et de vente d'exemple. À valider.
- La surprime d'amortissement de la grille SCHL est reprise telle quelle de la Page; sa source détaillée n'y figure pas : à revalider.
- Le TGA central reste une **Hypothèse** (aucune source publique pour Sherbrooke); les taux assurés (4,84 %, 4,64 %) et le taux SPCC sont des **sources secondaires, à valider**.
- Les taxes sur la prime SCHL passent de 9 % à 9,975 % après le 31 déc. 2026 (selon la Page) : mettre à jour la valeur à ce moment-là.
