# Champs du calculateur « Évaluation de bloc » (vendremonplex.com)

> **BROUILLON — À approuver par P-O.** Généré de `evaluation_bloc.js` (`CHAMPS`); la version lisible par machine est `champs.json`.
> Clés plates identiques à celles de la Page canvas `dd69dd2b-19a5-4bee-aae7-4fb0b4074466` (lue le 2026-11-19).
> Les valeurs numériques s'acceptent au format québécois (« 1 062 », « 5,34 », « 4 500 $ ») ou comme nombres.

## Lecture des colonnes

- **Obligatoire**, **Min**, **Max** : *propositions pour la version web*. La Page n'impose aucune validation (valeur vide = 0). `validerEntrees()` applique ces propositions (erreurs bloquantes) mais `evaluer()` n'en applique aucune, comme la Page.
- **Défaut** : valeur de départ de la Page (triplex fictif, Sherbrooke, type plex). Le type et la ville rechargent des valeurs (voir plus bas).
- **Statut / Source / Date** : repris de la Page (Confirmé, Déduit, Estimé, Hypothèse). Une cellule « — » = aucun statut (champ de choix ou de saisie libre).
- **Envoyé** : `oui` = fait partie du payload (voir `schema_donnees.md`); `non` = jamais envoyé, affichage et calcul locaux seulement.

## Règles de rechargement (comme la Page)

- **Changer le type** (plex ⇄ 5 logements et plus) recharge : nombres de logements et les 8 postes de dépenses (valeurs d'exemple Plex.io, statut Hypothèse). Plex : 0, 0, 2, 1; taxes mun. 4 500, scol. 500, assurances 2 500, énergie 600, entretien 1 800, réserve 900, autres 0, gestion 5 %. Multi : 0, 0, 4, 2; 8 000, 1 000, 4 800, 2 000, 3 600, 1 800, 0, 5 %.
- **Changer la ville** recharge : loyers SCHL par taille, inoccupation SCHL et facteur comparatif (voir `PARAMETERS.villes`). Sherbrooke : 712, 905, 1 062, 1 375 $; 2,7 %; 1,08. Afficher à côté de chaque loyer « SCHL : {loyer moyen de la ville} » et sous la liste « Fiabilité SCHL : {cote} ».
- Dans le code : `entreesParDefaut(type, ville)`.

## Villes offertes

| Valeur | Libellé | Fiabilité SCHL | Droits de mutation | Facteur comparatif |
|---|---|---|---|---|
| `sherbrooke` | Sherbrooke (RMR) | a (excellente) | Confirmé | 1.08 (Confirmé) |
| `magog` | Magog (zone de la RMR de Sherbrooke) | b à d, utiliser avec prudence | Hypothèse | 1 (Hypothèse) |
| `montreal` | Montréal (RMR) | a | Confirmé | 1 (Confirmé) |
| `quebec` | Québec (RMR) | a à c | Confirmé | 1.08 (Confirmé) |
| `gatineau` | Gatineau (partie québécoise de la RMR) | a à c | Hypothèse | 1 (Hypothèse) |
| `troisrivieres` | Trois-Rivières (RMR) | a à b | Hypothèse | 1 (Hypothèse) |
| `saguenay` | Saguenay (RMR) | a à b | Hypothèse | 1 (Hypothèse) |

## Identification

| Clé | Étiquette (français) | Type | Unité | Obligatoire | Min | Max | Défaut | Statut | Envoyé | Aide / remarque |
|---|---|---|---|---|---|---|---|---|---|---|
| `adresse` | Adresse ou désignation (texte libre, aucune recherche faite) | texte | — | non | — | — | — | — | non | Affichage seulement dans le sommaire. NE PAS ENVOYER au backend (donnée nominative). Longueur max. 80. |
| `prepare` | Préparé par (courtier) | texte | — | non | — | — | — | — | non | Affichage seulement dans le sommaire. NE PAS ENVOYER au backend. Longueur max. 60. |
| `type` | Type d'immeuble | choix | — | oui | — | — | plex | — | oui | Choix : « Plex 2 à 4 logements » (plex) ou « 5 logements et plus » (multi). Changer le type recharge les dépenses d'exemple. Options : plex = Plex 2 à 4 logements; multi = 5 logements et plus. |
| `ville` | Ville (loyers et inoccupation SCHL, droits de mutation, facteur comparatif) | choix | — | oui | — | — | sherbrooke | — | oui | Changer la ville recharge les loyers SCHL, l'inoccupation et le facteur comparatif. Afficher « Fiabilité SCHL : … » sous la liste. Localisation grossière : c'est la seule envoyée. Options : sherbrooke = Sherbrooke (RMR); magog = Magog (zone de la RMR de Sherbrooke); montreal = Montréal (RMR); quebec = Québec (RMR); gatineau = Gatineau (partie québécoise de la RMR); troisrivieres = Trois-Rivières (RMR); saguenay = Saguenay (RMR). |

## Loyers actuels

| Clé | Étiquette (français) | Type | Unité | Obligatoire | Min | Max | Défaut | Statut | Envoyé | Aide / remarque |
|---|---|---|---|---|---|---|---|---|---|---|
| `n0` | Studio : Nombre | entier | logements | non | 0 | 200 | 0 | Hypothèse | oui | Au moins un logement requis au total. Valeurs de départ = exemple Plex.io (triplex : 2 × 4 ½ et 1 × 5 ½). |
| `l0` | Studio : Loyer ($/mois) | montant | $/mois | oui | 0 | 20000 | 712 | Confirmé | oui | Afficher à côté « SCHL : <loyer moyen de la ville> ». Remplacer par les baux réels. |
| `n1` | 1 chambre (3 ½) : Nombre | entier | logements | non | 0 | 200 | 0 | Hypothèse | oui | Au moins un logement requis au total. Valeurs de départ = exemple Plex.io (triplex : 2 × 4 ½ et 1 × 5 ½). |
| `l1` | 1 chambre (3 ½) : Loyer ($/mois) | montant | $/mois | oui | 0 | 20000 | 905 | Confirmé | oui | Afficher à côté « SCHL : <loyer moyen de la ville> ». Remplacer par les baux réels. |
| `n2` | 2 chambres (4 ½) : Nombre | entier | logements | non | 0 | 200 | 2 | Hypothèse | oui | Au moins un logement requis au total. Valeurs de départ = exemple Plex.io (triplex : 2 × 4 ½ et 1 × 5 ½). |
| `l2` | 2 chambres (4 ½) : Loyer ($/mois) | montant | $/mois | oui | 0 | 20000 | 1062 | Confirmé | oui | Afficher à côté « SCHL : <loyer moyen de la ville> ». Remplacer par les baux réels. |
| `n3` | 3 chambres + (5 ½ +) : Nombre | entier | logements | non | 0 | 200 | 1 | Hypothèse | oui | Au moins un logement requis au total. Valeurs de départ = exemple Plex.io (triplex : 2 × 4 ½ et 1 × 5 ½). |
| `l3` | 3 chambres + (5 ½ +) : Loyer ($/mois) | montant | $/mois | oui | 0 | 20000 | 1375 | Confirmé | oui | Afficher à côté « SCHL : <loyer moyen de la ville> ». Remplacer par les baux réels. |
| `autresRev` | Autres revenus ($/an : stationnement, buanderie, rangement) | montant | $/an | non | 0 | 1000000 | 0 | Hypothèse | oui | À saisir. |
| `inoc` | Inoccupation et mauvaises créances (%) | pourcentage | % | oui | 0 | 100 | 2.7 | Confirmé | oui | Confirmé tant que la valeur égale celle de la SCHL pour la ville (Sherbrooke : 2,7 %, SCHL oct. 2025); sinon Hypothèse. Modifiable. |

## Dépenses d'exploitation

| Clé | Étiquette (français) | Type | Unité | Obligatoire | Min | Max | Défaut | Statut | Envoyé | Aide / remarque |
|---|---|---|---|---|---|---|---|---|---|---|
| `taxesMun` | Taxes municipales | montant | $/an | oui | 0 | 1000000 | 4500 | Hypothèse | oui | Hypothèse tant que le compte de taxes n'est pas saisi. |
| `taxesScol` | Taxes scolaires | montant | $/an | oui | 0 | 1000000 | 500 | Hypothèse | oui | Hypothèse tant que le compte de taxes n'est pas saisi. |
| `assur` | Assurances | montant | $/an | oui | 0 | 1000000 | 2500 | Hypothèse | oui | Hypothèse. Alerte si 0. |
| `energie` | Énergie : aires communes, chauffage payé par le propriétaire | montant | $/an | oui | 0 | 1000000 | 600 | Hypothèse | oui | Hypothèse. |
| `entretien` | Entretien et réparations | montant | $/an | oui | 0 | 1000000 | 1800 | Hypothèse | oui | Hypothèse. Alerte si 0. |
| `gestion` | Gestion (% du revenu brut effectif) | pourcentage | % du revenu brut effectif | oui | 0 | 100 | 5 | Hypothèse | oui | 5 %, hypothèse, comptée même si l'immeuble est autogéré. |
| `reserve` | Réserve de remplacement | montant | $/an | oui | 0 | 1000000 | 900 | Hypothèse | oui | Hypothèse. Alerte si 0. |
| `autres` | Autres (déneigement, conciergerie, contrats) | montant | $/an | non | 0 | 1000000 | 0 | Hypothèse | oui | Hypothèse. |

## Méthode du revenu

| Clé | Étiquette (français) | Type | Unité | Obligatoire | Min | Max | Défaut | Statut | Envoyé | Aide / remarque |
|---|---|---|---|---|---|---|---|---|---|---|
| `tga` | TGA central (%) | pourcentage | % | oui | 0.5 | 20 | 5 | Hypothèse | oui | Hypothèse : aucune source publique pour Sherbrooke. Afficher le TGA implicite des comparables saisis et le repère CBRE (source secondaire, à valider; immeubles institutionnels, pas les plex de Sherbrooke). |
| `ecart` | Écart de sensibilité (points de base) | entier | points de base | oui | 0 | 400 | 50 | Hypothèse | oui | Hypothèse. Le TGA haut (TGA − écart) doit rester > 0 sinon la méthode du revenu n'est pas utilisée. |

## Comparables

| Clé | Étiquette (français) | Type | Unité | Obligatoire | Min | Max | Défaut | Statut | Envoyé | Aide / remarque |
|---|---|---|---|---|---|---|---|---|---|---|
| `c1Nom` | Comparable 1 : désignation | texte | — | non | — | — | — | — | non | Texte libre. NE PAS ENVOYER au backend (peut contenir une adresse). Longueur max. 80. |
| `c1Date` | Comparable 1 : date de vente | texte | — | non | — | — | — | — | non | Texte libre (aaaa-mm recommandé). Non envoyé par défaut (décision P-O). Longueur max. 20. |
| `c1Prix` | Comparable 1 : prix vendu ($) | montant | $ | non | 0 | 100000000 | 0 | — | oui | Prix vendu (pas le prix demandé), vente récente vérifiée. 0 = comparable ignoré. |
| `c1Portes` | Comparable 1 : portes | entier | portes | non | 0 | 500 | 0 | — | oui | Nécessaire pour le prix par porte. |
| `c1Rbp` | Comparable 1 : RBP ($/an) | montant | $/an | non | 0 | 100000000 | 0 | — | oui | Nécessaire pour le MRB. |
| `c1Rne` | Comparable 1 : RNE ($/an, si connu) | montant | $/an | non | 0 | 100000000 | 0 | — | oui | Nécessaire pour le MRN et le TGA implicite; doit être normalisé comme celui du sujet. |
| `c1Adj` | Comparable 1 : ajustement total (%) | pourcentage | % (peut être négatif) | non | -50 | 50 | 0 | — | oui | Écart en % pour la date, l'emplacement, l'état, le stationnement et les baux par rapport au sujet; un comparable meilleur que le sujet reçoit un ajustement négatif. |
| `c2Nom` | Comparable 2 : désignation | texte | — | non | — | — | — | — | non | Texte libre. NE PAS ENVOYER au backend (peut contenir une adresse). Longueur max. 80. |
| `c2Date` | Comparable 2 : date de vente | texte | — | non | — | — | — | — | non | Texte libre (aaaa-mm recommandé). Non envoyé par défaut (décision P-O). Longueur max. 20. |
| `c2Prix` | Comparable 2 : prix vendu ($) | montant | $ | non | 0 | 100000000 | 0 | — | oui | Prix vendu (pas le prix demandé), vente récente vérifiée. 0 = comparable ignoré. |
| `c2Portes` | Comparable 2 : portes | entier | portes | non | 0 | 500 | 0 | — | oui | Nécessaire pour le prix par porte. |
| `c2Rbp` | Comparable 2 : RBP ($/an) | montant | $/an | non | 0 | 100000000 | 0 | — | oui | Nécessaire pour le MRB. |
| `c2Rne` | Comparable 2 : RNE ($/an, si connu) | montant | $/an | non | 0 | 100000000 | 0 | — | oui | Nécessaire pour le MRN et le TGA implicite; doit être normalisé comme celui du sujet. |
| `c2Adj` | Comparable 2 : ajustement total (%) | pourcentage | % (peut être négatif) | non | -50 | 50 | 0 | — | oui | Écart en % pour la date, l'emplacement, l'état, le stationnement et les baux par rapport au sujet; un comparable meilleur que le sujet reçoit un ajustement négatif. |
| `c3Nom` | Comparable 3 : désignation | texte | — | non | — | — | — | — | non | Texte libre. NE PAS ENVOYER au backend (peut contenir une adresse). Longueur max. 80. |
| `c3Date` | Comparable 3 : date de vente | texte | — | non | — | — | — | — | non | Texte libre (aaaa-mm recommandé). Non envoyé par défaut (décision P-O). Longueur max. 20. |
| `c3Prix` | Comparable 3 : prix vendu ($) | montant | $ | non | 0 | 100000000 | 0 | — | oui | Prix vendu (pas le prix demandé), vente récente vérifiée. 0 = comparable ignoré. |
| `c3Portes` | Comparable 3 : portes | entier | portes | non | 0 | 500 | 0 | — | oui | Nécessaire pour le prix par porte. |
| `c3Rbp` | Comparable 3 : RBP ($/an) | montant | $/an | non | 0 | 100000000 | 0 | — | oui | Nécessaire pour le MRB. |
| `c3Rne` | Comparable 3 : RNE ($/an, si connu) | montant | $/an | non | 0 | 100000000 | 0 | — | oui | Nécessaire pour le MRN et le TGA implicite; doit être normalisé comme celui du sujet. |
| `c3Adj` | Comparable 3 : ajustement total (%) | pourcentage | % (peut être négatif) | non | -50 | 50 | 0 | — | oui | Écart en % pour la date, l'emplacement, l'état, le stationnement et les baux par rapport au sujet; un comparable meilleur que le sujet reçoit un ajustement négatif. |
| `c4Nom` | Comparable 4 : désignation | texte | — | non | — | — | — | — | non | Texte libre. NE PAS ENVOYER au backend (peut contenir une adresse). Longueur max. 80. |
| `c4Date` | Comparable 4 : date de vente | texte | — | non | — | — | — | — | non | Texte libre (aaaa-mm recommandé). Non envoyé par défaut (décision P-O). Longueur max. 20. |
| `c4Prix` | Comparable 4 : prix vendu ($) | montant | $ | non | 0 | 100000000 | 0 | — | oui | Prix vendu (pas le prix demandé), vente récente vérifiée. 0 = comparable ignoré. |
| `c4Portes` | Comparable 4 : portes | entier | portes | non | 0 | 500 | 0 | — | oui | Nécessaire pour le prix par porte. |
| `c4Rbp` | Comparable 4 : RBP ($/an) | montant | $/an | non | 0 | 100000000 | 0 | — | oui | Nécessaire pour le MRB. |
| `c4Rne` | Comparable 4 : RNE ($/an, si connu) | montant | $/an | non | 0 | 100000000 | 0 | — | oui | Nécessaire pour le MRN et le TGA implicite; doit être normalisé comme celui du sujet. |
| `c4Adj` | Comparable 4 : ajustement total (%) | pourcentage | % (peut être négatif) | non | -50 | 50 | 0 | — | oui | Écart en % pour la date, l'emplacement, l'état, le stationnement et les baux par rapport au sujet; un comparable meilleur que le sujet reçoit un ajustement négatif. |
| `c5Nom` | Comparable 5 : désignation | texte | — | non | — | — | — | — | non | Texte libre. NE PAS ENVOYER au backend (peut contenir une adresse). Longueur max. 80. |
| `c5Date` | Comparable 5 : date de vente | texte | — | non | — | — | — | — | non | Texte libre (aaaa-mm recommandé). Non envoyé par défaut (décision P-O). Longueur max. 20. |
| `c5Prix` | Comparable 5 : prix vendu ($) | montant | $ | non | 0 | 100000000 | 0 | — | oui | Prix vendu (pas le prix demandé), vente récente vérifiée. 0 = comparable ignoré. |
| `c5Portes` | Comparable 5 : portes | entier | portes | non | 0 | 500 | 0 | — | oui | Nécessaire pour le prix par porte. |
| `c5Rbp` | Comparable 5 : RBP ($/an) | montant | $/an | non | 0 | 100000000 | 0 | — | oui | Nécessaire pour le MRB. |
| `c5Rne` | Comparable 5 : RNE ($/an, si connu) | montant | $/an | non | 0 | 100000000 | 0 | — | oui | Nécessaire pour le MRN et le TGA implicite; doit être normalisé comme celui du sujet. |
| `c5Adj` | Comparable 5 : ajustement total (%) | pourcentage | % (peut être négatif) | non | -50 | 50 | 0 | — | oui | Écart en % pour la date, l'emplacement, l'état, le stationnement et les baux par rapport au sujet; un comparable meilleur que le sujet reçoit un ajustement négatif. |

## MRB

| Clé | Étiquette (français) | Type | Unité | Obligatoire | Min | Max | Défaut | Statut | Envoyé | Aide / remarque |
|---|---|---|---|---|---|---|---|---|---|---|
| `srcMrb` | MRB : source | choix | — | oui | — | — | comps | — | oui | « Des comparables » ou « Saisie manuelle ». Options : comps = Des comparables; manuel = Saisie manuelle. |
| `mrbB` | MRB bas (×) | nombre | × | non | 0 | 100 | 0 | Hypothèse | oui | Visible si saisie manuelle. Aucune valeur par défaut (aucune source publique fiable). Visible si : srcMrb = manuel. |
| `mrbC` | MRB central (×) | nombre | × | non | 0 | 100 | 0 | Hypothèse | oui | Hypothèse. Obligatoire si saisie manuelle (sinon méthode MRB non utilisée). Visible si : srcMrb = manuel. |
| `mrbH` | MRB haut (×) | nombre | × | non | 0 | 100 | 0 | Hypothèse | oui | Visible si saisie manuelle. Visible si : srcMrb = manuel. |

## MRN

| Clé | Étiquette (français) | Type | Unité | Obligatoire | Min | Max | Défaut | Statut | Envoyé | Aide / remarque |
|---|---|---|---|---|---|---|---|---|---|---|
| `srcMrn` | MRN : source | choix | — | oui | — | — | comps | — | oui | « Des comparables » ou « Saisie manuelle ». Options : comps = Des comparables; manuel = Saisie manuelle. |
| `mrnB` | MRN bas (×) | nombre | × | non | 0 | 200 | 0 | Hypothèse | oui | Visible si saisie manuelle. Le MRN est l'inverse du TGA : 20 × équivaut à 5 %. Visible si : srcMrn = manuel. |
| `mrnC` | MRN central (×) | nombre | × | non | 0 | 200 | 0 | Hypothèse | oui | Hypothèse. Obligatoire si saisie manuelle. Visible si : srcMrn = manuel. |
| `mrnH` | MRN haut (×) | nombre | × | non | 0 | 200 | 0 | Hypothèse | oui | Visible si saisie manuelle. Visible si : srcMrn = manuel. |

## Rapprochement

| Clé | Étiquette (français) | Type | Unité | Obligatoire | Min | Max | Défaut | Statut | Envoyé | Aide / remarque |
|---|---|---|---|---|---|---|---|---|---|---|
| `wRev` | Pondération : revenu (%) | pourcentage | pondération | oui | 0 | 100 | 40 | Hypothèse | oui | Hypothèse. Se répartit entre les méthodes disponibles seulement. |
| `wPar` | Pondération : parité (%) | pourcentage | pondération | oui | 0 | 100 | 30 | Hypothèse | oui | Hypothèse. |
| `wMrb` | Pondération : MRB (%) | pourcentage | pondération | oui | 0 | 100 | 15 | Hypothèse | oui | Hypothèse. |
| `wMrn` | Pondération : MRN (%) | pourcentage | pondération | oui | 0 | 100 | 15 | Hypothèse | oui | Hypothèse. |
| `arrondi` | Arrondi ($) | montant | $ | oui | 0 | 1000000 | 5000 | Hypothèse | oui | 0 = pas d'arrondi. |

## Évaluation municipale

| Clé | Étiquette (français) | Type | Unité | Obligatoire | Min | Max | Défaut | Statut | Envoyé | Aide / remarque |
|---|---|---|---|---|---|---|---|---|---|---|
| `evalTerrain` | Terrain ($) — rôle | montant | $ | non | 0 | 100000000 | 0 | Hypothèse | oui | Référence seulement, exclue du rapprochement. |
| `evalBat` | Bâtiment ($) — rôle | montant | $ | non | 0 | 100000000 | 0 | Hypothèse | oui | Référence seulement, exclue du rapprochement. |
| `evalAnnee` | Année du rôle | entier | année | non | 0 | 2100 | — | Hypothèse | oui | Laisser vide ou 0 = non saisie; sinon 1990 à 2100. Alerte si antérieure à 2026. |
| `facteur` | Facteur comparatif 2026 | nombre | × | non | 0.5 | 3 | 1.08 | Confirmé | oui | Change avec la ville (Sherbrooke 1,08 Confirmé; Québec 1,08 Confirmé; Montréal 1,00 Confirmé; autres 1,00 Hypothèse). |

## Financement : Conventionnel, investisseur

| Clé | Étiquette (français) | Type | Unité | Obligatoire | Min | Max | Défaut | Statut | Envoyé | Aide / remarque |
|---|---|---|---|---|---|---|---|---|---|---|
| `pcLtv` | Prêt-valeur maximal (%) | pourcentage | % | non | 1 | 95 | 80 | Hypothèse | oui | Visible si type = plex. Visible si : type = plex. |
| `pcTaux` | Taux (%) | pourcentage | % | non | 0.1 | 20 | 5.34 | Confirmé | oui | Visible si type = plex. Visible si : type = plex. |
| `pcAm` | Amortissement (ans) | entier | ans | non | 1 | 40 | 25 | Hypothèse | oui | Visible si type = plex. Visible si : type = plex. |
| `pcRcd` | RCD minimal | nombre | × | non | 0.5 | 3 | 1.2 | Hypothèse | oui | Visible si type = plex. Visible si : type = plex. |

## Financement : Propriétaire occupant, assuré SCHL

| Clé | Étiquette (français) | Type | Unité | Obligatoire | Min | Max | Défaut | Statut | Envoyé | Aide / remarque |
|---|---|---|---|---|---|---|---|---|---|---|
| `poLtv` | Prêt-valeur maximal (%) | pourcentage | % | non | 1 | 95 | 90 | Confirmé | oui | Visible si type = plex. La qualification selon le revenu personnel de l'acheteur n'est pas calculée. Visible si : type = plex. |
| `poPrime` | Prime SCHL (% du prêt) | pourcentage | % | non | 0 | 10 | 3.1 | Confirmé | oui | Visible si type = plex. La qualification selon le revenu personnel de l'acheteur n'est pas calculée. Visible si : type = plex. |
| `poTaux` | Taux assuré (%) | pourcentage | % | non | 0.1 | 20 | 4.84 | Estimé | oui | Visible si type = plex. La qualification selon le revenu personnel de l'acheteur n'est pas calculée. Visible si : type = plex. |
| `poAm` | Amortissement (ans) | entier | ans | non | 1 | 40 | 25 | Hypothèse | oui | Visible si type = plex. La qualification selon le revenu personnel de l'acheteur n'est pas calculée. Visible si : type = plex. |

## Financement : Conventionnel non assuré

| Clé | Étiquette (français) | Type | Unité | Obligatoire | Min | Max | Défaut | Statut | Envoyé | Aide / remarque |
|---|---|---|---|---|---|---|---|---|---|---|
| `mcLtv` | Prêt-valeur maximal (%) | pourcentage | % | non | 1 | 95 | 75 | Hypothèse | oui | Visible si type = multi. Visible si : type = multi. |
| `mcTaux` | Taux (%) | pourcentage | % | non | 0.1 | 20 | 5.84 | Hypothèse | oui | Visible si type = multi. Visible si : type = multi. |
| `mcAm` | Amortissement (ans) | entier | ans | non | 1 | 40 | 25 | Hypothèse | oui | Visible si type = multi. Visible si : type = multi. |
| `mcRcd` | RCD minimal | nombre | × | non | 0.5 | 3 | 1.2 | Hypothèse | oui | Visible si type = multi. Visible si : type = multi. |

## Financement : SCHL standard

| Clé | Étiquette (français) | Type | Unité | Obligatoire | Min | Max | Défaut | Statut | Envoyé | Aide / remarque |
|---|---|---|---|---|---|---|---|---|---|---|
| `msLtv` | Prêt-valeur maximal (%) | pourcentage | % | non | 1 | 95 | 85 | Confirmé | oui | Visible si type = multi. Le RCD SCHL (1,10 ou 1,30) et la prime (grille avec surprime d'amortissement) sont calculés, non saisis. Visible si : type = multi. |
| `msTaux` | Taux assuré (%) | pourcentage | % | non | 0.1 | 20 | 4.64 | Estimé | oui | Visible si type = multi. Le RCD SCHL (1,10 ou 1,30) et la prime (grille avec surprime d'amortissement) sont calculés, non saisis. Visible si : type = multi. |
| `msAm` | Amortissement (ans) | entier | ans | non | 1 | 50 | 40 | Confirmé | oui | Visible si type = multi. Le RCD SCHL (1,10 ou 1,30) et la prime (grille avec surprime d'amortissement) sont calculés, non saisis. Visible si : type = multi. |

## Financement : frais de l'acheteur

| Clé | Étiquette (français) | Type | Unité | Obligatoire | Min | Max | Défaut | Statut | Envoyé | Aide / remarque |
|---|---|---|---|---|---|---|---|---|---|---|
| `notaire` | Notaire de l'acheteur ($) | montant | $ | non | 0 | 100000 | 2000 | Hypothèse | oui | Hypothèse. |
| `inspection` | Inspection ($) | montant | $ | non | 0 | 100000 | 1500 | Hypothèse | oui | Hypothèse. |
| `evaluation` | Évaluation ($) | montant | $ | non | 0 | 100000 | 3500 | Hypothèse | oui | Hypothèse. |
| `tvqPrime` | Taxe sur la prime (%) | pourcentage | % | non | 0 | 20 | 9 | Confirmé | oui | Confirmé : Revenu Québec, 9 % (9,975 % après le 31 déc. 2026, selon la Page). |

## Côté vendeur

| Clé | Étiquette (français) | Type | Unité | Obligatoire | Min | Max | Défaut | Statut | Envoyé | Aide / remarque |
|---|---|---|---|---|---|---|---|---|---|---|
| `vendeur` | Afficher le côté vendeur : produit net | booleen | — | non | — | — | false | — | non | Désactivé par défaut. Section « estimation, à valider avec un CPA ». |
| `prixVente` | Prix de vente ($) — 0 = valeur centrale | montant | $ | non | 0 | 100000000 | 0 | Hypothèse | non | Visible si le côté vendeur est activé. NON ENVOYÉ par défaut (donnée financière personnelle; décision P-O). Visible si : vendeur = vrai. |
| `commission` | Commission (% du prix, avant taxes) | pourcentage | % du prix, avant taxes | non | 0 | 20 | 4 | Hypothèse | non | Visible si le côté vendeur est activé. NON ENVOYÉ par défaut (donnée financière personnelle; décision P-O). Visible si : vendeur = vrai. |
| `taxesCom` | TPS et TVQ sur la commission (%) | pourcentage | % | non | 0 | 30 | 14.975 | Confirmé | non | Visible si le côté vendeur est activé. NON ENVOYÉ par défaut (donnée financière personnelle; décision P-O). Visible si : vendeur = vrai. |
| `notaireV` | Notaire et autres frais de vente ($) | montant | $ | non | 0 | 100000 | 1500 | Hypothèse | non | Visible si le côté vendeur est activé. NON ENVOYÉ par défaut (donnée financière personnelle; décision P-O). Visible si : vendeur = vrai. |
| `solde` | Solde hypothécaire ($) — à obtenir du prêteur | montant | $ | non | 0 | 100000000 | 0 | Hypothèse | non | Visible si le côté vendeur est activé. NON ENVOYÉ par défaut (donnée financière personnelle; décision P-O). Visible si : vendeur = vrai. |
| `penalite` | Pénalité de remboursement anticipé ($) — à obtenir du prêteur | montant | $ | non | 0 | 100000000 | 0 | Hypothèse | non | Visible si le côté vendeur est activé. NON ENVOYÉ par défaut (donnée financière personnelle; décision P-O). Visible si : vendeur = vrai. |
| `quote` | Quote-part détenue (%) | pourcentage | % | non | 0 | 100 | 100 | Hypothèse | non | Visible si le côté vendeur est activé. NON ENVOYÉ par défaut (donnée financière personnelle; décision P-O). Visible si : vendeur = vrai. |
| `prixAchat` | Prix d'achat ($) — 0 = impôt non calculé | montant | $ | non | 0 | 100000000 | 0 | Hypothèse | non | Visible si le côté vendeur est activé. NON ENVOYÉ par défaut (donnée financière personnelle; décision P-O). Visible si : vendeur = vrai. |
| `fraisAchat` | Frais d'acquisition capitalisés ($) | montant | $ | non | 0 | 10000000 | 0 | Hypothèse | non | Visible si le côté vendeur est activé. NON ENVOYÉ par défaut (donnée financière personnelle; décision P-O). Visible si : vendeur = vrai. |
| `travauxCap` | Travaux en capital ($) | montant | $ | non | 0 | 100000000 | 0 | Hypothèse | non | Visible si le côté vendeur est activé. NON ENVOYÉ par défaut (donnée financière personnelle; décision P-O). Visible si : vendeur = vrai. |
| `dpaCum` | DPA cumulée réellement réclamée ($) — formulaires T776 et TP-128 | montant | $ | non | 0 | 100000000 | 0 | Hypothèse | non | Visible si le côté vendeur est activé. NON ENVOYÉ par défaut (donnée financière personnelle; décision P-O). Visible si : vendeur = vrai. |
| `terrainAchat` | Part du terrain à l'achat (%) | pourcentage | % | non | 0 | 100 | 25 | Hypothèse | non | Visible si le côté vendeur est activé. NON ENVOYÉ par défaut (donnée financière personnelle; décision P-O). Visible si : vendeur = vrai. |
| `terrainVente` | Part du terrain à la vente (%) — 0 = ratio du rôle saisi | pourcentage | % | non | 0 | 100 | 0 | Hypothèse | non | Visible si le côté vendeur est activé. NON ENVOYÉ par défaut (donnée financière personnelle; décision P-O). Visible si : vendeur = vrai. |
| `anAchat` | Année d'achat | entier | année | non | 1950 | 2100 | 2016 | Hypothèse | non | Visible si le côté vendeur est activé. NON ENVOYÉ par défaut (donnée financière personnelle; décision P-O). Visible si : vendeur = vrai. |
| `anVente` | Année de vente | entier | année | non | 1950 | 2100 | 2026 | Hypothèse | non | Visible si le côté vendeur est activé. NON ENVOYÉ par défaut (donnée financière personnelle; décision P-O). Visible si : vendeur = vrai. |
| `det` | Détenteur | choix | — | non | — | — | particulier | — | non | Particulier ou SPCC. Visible si : vendeur = vrai. Options : particulier = Particulier; spcc = SPCC. |
| `modeImp` | Mode d'impôt (particulier) | choix | — | non | — | — | constant | — | non | « Taux marginal constant » ou « Impôt par tranches ». Visible si : vendeur = vrai et det = particulier. Options : constant = Taux marginal constant; tranches = Impôt par tranches. |
| `tm` | Taux marginal (%) | pourcentage | % | non | 0 | 60 | 53.31 | Déduit | non | Déduit : palier supérieur 2026, barèmes officiels. Visible si particulier + taux constant. Visible si : vendeur = vrai, det = particulier, modeImp = constant. |
| `autreRev` | Autre revenu imposable de l'année ($) | montant | $ | non | 0 | 100000000 | 0 | Hypothèse | non | Visible si particulier + impôt par tranches. Visible si : vendeur = vrai, det = particulier, modeImp = tranches. |
| `tSpcc` | Taux SPCC, revenu de placement (%) | pourcentage | % | non | 0 | 70 | 50.17 | Estimé | non | Estimé : EY et CQFF 2026, source secondaire, à valider. Visible si SPCC. Visible si : vendeur = vrai et det = spcc. |
| `incl` | Taux d'inclusion du gain en capital (%) | pourcentage | % | non | 0 | 100 | 50 | Confirmé | non | Confirmé : 50 % (ARC, Revenu Québec). Champ non exposé dans la Page (valeur fixe) : à afficher en lecture seule. Visible si : vendeur = vrai. Lecture seule. |
| `abat` | Abattement du Québec (%) | pourcentage | % | non | 0 | 100 | 16.5 | Confirmé | non | Confirmé : 16,5 % (Revenu Québec / ARC). Champ non exposé dans la Page (valeur fixe) : lecture seule. Visible si : vendeur = vrai et modeImp = tranches. Lecture seule. |
| `rp` | Une partie est la résidence principale du vendeur | booleen | — | non | — | — | false | — | non | Affiche rpPct et rpAns. Visible si : vendeur = vrai. |
| `rpPct` | Partie habitée (%) | pourcentage | % | non | 0 | 100 | 0 | Hypothèse | non | Visible si résidence principale. Visible si : vendeur = vrai et rp = vrai. |
| `rpAns` | Années désignées | entier | années | non | 0 | 100 | 0 | Hypothèse | non | Visible si résidence principale. Visible si : vendeur = vrai et rp = vrai. |

## Interne

| Clé | Étiquette (français) | Type | Unité | Obligatoire | Min | Max | Défaut | Statut | Envoyé | Aide / remarque |
|---|---|---|---|---|---|---|---|---|---|---|
| `demo` | Comparables fictifs de démonstration chargés | booleen | — | non | — | — | false | — | non | Interne : vrai si les 3 comparables fictifs sont chargés. Ajoute l'alerte « Comparables fictifs » et passe les statuts à Hypothèse. À NE PAS exposer au public ni à envoyer (voir décision P-O : faut-il offrir la démo sur le site ?). |

## Affichage des résultats

**Principe :** Toujours afficher une FOURCHETTE (bas, central, haut) accompagnée de l'avertissement « estimation indicative »; jamais une valeur unique présentée comme un prix, une évaluation ou une promesse.

### Fourchette de valeur

Texte : « {désignation} : {portes} logements, RNE de {RNE}. Fourchette rapprochée de {k} méthode(s) sur 4, arrondie à {arrondi}. » Quatre métriques : Bas de la fourchette, Valeur centrale, Haut de la fourchette, « Demi-écart autour de la valeur centrale » (± x,x %, = (haut − bas) / 2 / central). Graphique optionnel : une barre par méthode utilisée plus la fourchette rapprochée.

### Tableau des méthodes



Colonnes : Méthode · Base · Bas · Central · Haut · Pondération · Statut.

Méthode non disponible : bas, central, haut = « — », statut « Données manquantes ». Méthode disponible mais de pondération 0 : « Non utilisée ». Sinon pondération = poids / somme des poids des méthodes disponibles (1 décimale). Le statut s'affiche en pastille : Confirmé, Déduit, Estimé, Hypothèse.

### Points de vigilance

Tableau Point / Précision, affiché seulement s'il y a au moins une alerte (9 alertes possibles, voir resultat.alertes dans evaluation_bloc.js).

### Méthode du revenu

Tableau de sensibilité à 5 lignes (TGA − écart, − écart/2, central, + écart/2, + écart) avec les positions « Haut de la fourchette du revenu », « Central », « Bas de la fourchette du revenu ». Texte du TGA implicite des comparables. Repère CBRE (T3 2026) : à afficher AVEC la mention « source secondaire, à valider » et « immeubles institutionnels, pas les plex de Sherbrooke ».

### Comparables, MRB et MRN

Tableau Comparable / Date / Prix ajusté / Prix par porte / MRB / MRN / TGA pour les comparables dont le prix vendu est > 0. Sans comparable : « Aucun comparable saisi », méthodes de parité, MRB, MRN non calculées. Rappeler : saisie manuelle de ventes vérifiées; l'outil ne consulte ni Centris ni JLR.

### Évaluation municipale (référence seulement, exclue du rapprochement)

Si terrain + bâtiment > 0 : évaluation totale, évaluation × facteur comparatif, valeur centrale / évaluation, fourchette / (évaluation × facteur), part du terrain. Sinon : « Saisissez l'évaluation inscrite au rôle pour afficher les ratios. »

### Financement d'un acheteur type

Tableau Programme / Point (Bas, Central, Haut) / Prix / Prêt (prime exclue) / Mise de fonds requise ($ et %) / Liquidités totales / RCD / Statut. Statut vert « Mise minimale de X % suffisante » ou orange « Mise de Y % requise ». Ligne par programme : « prix au-delà duquel la mise minimale ne suffit plus » ou « Non plafonné par le RCD (qualification personnelle) ». Texte d'accompagnement : liquidités totales = mise + droits de mutation + frais + taxe sur la prime; RCD sous 1,20 × = seuil indicatif; test du BSIF non appliqué; qualification personnelle non calculée.

### Côté vendeur : produit net (désactivé par défaut)

Interrupteur « Afficher ». Si activé : tableau Étape / Montant, puis les 3 avertissements de resultat.vendeur.avertissements (estimation à valider avec un CPA; IMR non calculé; simplifications). Toujours étiqueté « Estimation, à valider avec un CPA »; jamais présenté comme un avis fiscal.

### Sommaire imprimable

Fond blanc. Titre « Sommaire d'évaluation indicative d'un immeuble à revenus », « Préparé le {date}… — Équipe Chiasson De Francesco, RE/MAX D'ABORD, Sherbrooke » (mention RE/MAX D'ABORD À VALIDER par l'agence, voir textes_a_approuver.md). Encadré : « Fourchette indicative : {bas} à {haut} (valeur centrale {central}) » + avertissement. Statuts en pied de page. ATTENTION : la phrase de la Page « Aucune donnée n'est transmise par cet outil » devient FAUSSE si l'envoi est activé : à remplacer par le texte approuvé (voir textes_a_approuver.md).

### Hypothèses, limites, sources

Reprendre sans les retirer : tableau « Hypothèses et statuts » (généré de PARAMETERS), texte « Limites » et liste des sources de la Page. Les mentions « source secondaire, à valider » ne doivent jamais être retirées.

## Avertissements et cas limites à l'affichage

- Bandeau permanent en haut : « Estimation indicative, pas une évaluation. » (texte à approuver, voir textes_a_approuver.md).
- Fourchette non définie (aucune méthode utilisable : NaN dans le résultat) : n'afficher aucune valeur; afficher « Données insuffisantes : saisissez des loyers et des dépenses valides, ou des comparables. » (TEXTE PROPOSÉ, absent de la Page, à approuver).
- Fourchette dont (haut / bas) > 1,3 : alerte « Fourchette large » (déjà dans le résultat).
- Comparables fictifs de démonstration : NE PAS offrir le bouton de démo aux visiteurs du site (décision de P-O); l'alerte et les statuts « Hypothèse » existent déjà si la démo est utilisée en interne.
- TGA central : toujours « Hypothèse » (aucune source publique pour Sherbrooke).

## Champs non exposés dans la Page (valeurs fixes) à afficher en lecture seule ou à garder fixes

`incl` (taux d'inclusion 50 %, Confirmé), `abat` (abattement du Québec 16,5 %, Confirmé), `tm` (53,31 %, Déduit; exposé seulement en mode taux constant), `tSpcc` (50,17 %, Estimé : source secondaire, à valider).

## Décisions pour P-O (champs)

1. Faut-il afficher le **côté vendeur** (produit net, gain en capital) au public ou le réserver à l'usage interne du courtier? (Désactivé par défaut; ses champs ne sont jamais envoyés par défaut.)
2. Faut-il offrir le bouton de **comparables fictifs (démo)** sur le site? Recommandation : non.
3. Les **bornes** et les champs **obligatoires** ci-dessus sont des propositions; à ajuster.
4. Les **comparables** : le public a-t-il accès à cette saisie (il faudrait de vraies ventes vérifiées), ou la méthode de parité/MRB/MRN est-elle réservée au courtier? Sans comparables, seule la méthode du revenu s'applique (fourchette large et basée sur le TGA, qui est une Hypothèse).
