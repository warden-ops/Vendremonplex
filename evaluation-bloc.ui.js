// Interface du calculateur. N'appelle ni evaluer de façon réseau, ni envoyerResultats, ni construirePayload.
// CONFIG n'est pas importé et n'est pas modifié. Le calcul reste dans le navigateur.

import {
  evaluer,
  entreesParDefaut,
  validerEntrees,
  CHAMPS,
  PARAMETERS,
  num,
  m,
  pct,
  pct1,
  x,
} from "./calculateur/evaluation_bloc.js";
import { validerContact } from "./calculateur/donnees_v2.js";
import {
  evaluerRendement,
  evaluerResiduel,
  referencesZonage,
  TEXTES_ZONAGE_V3,
  zonageReferencesCatalog,
} from "./calculateur/evaluation_bloc_v3.js";

const ZONAGE_REND = [
  ["zMax", "Maximum de la grille"],
  ["zCos", "COS"],
  ["zImpl", "Implantation (%)"],
  ["zEtages", "Étages"],
  ["zTerrain", "Terrain (m²)"],
  ["zSupLog", "Superficie par logement (m²)"],
  ["zLotBase", "Terrain de base (m²)"],
  ["zLotBaseLog", "Logements de base"],
  ["zLotAdd", "Terrain additionnel par logement (m²)"],
  ["zCpl", "Cases par logement"],
  ["zCases", "Cases de stationnement"],
];
const PRIORITE_LIEN = [
  "Grille de spécifications",
  "Grilles d'usage",
  "Carte interactive de zonage",
  "Plan de zonage",
  "Règlement de zonage",
  "Page des règlements d'urbanisme",
  "Page d'urbanisme",
];

const CLES_TYPE = ["n0", "n1", "n2", "n3", "taxesMun", "taxesScol", "assur", "energie", "entretien", "reserve", "autres", "gestion"];
const CLES_VILLE = ["l0", "l1", "l2", "l3", "inoc", "facteur"];
const EXCLUS_DEFAUTS = new Set([
  "prixVente", "commission", "taxesCom", "notaireV", "solde", "penalite", "prixAchat", "fraisAchat",
  "travauxCap", "dpaCum", "terrainAchat", "terrainVente", "anAchat", "anVente", "quote", "tm", "tSpcc",
  "incl", "abat", "autreRev", "rpPct", "rpAns",
]);

const champsPublics = CHAMPS.filter((ch) => ch.groupe !== "Côté vendeur" && ch.groupe !== "Interne");
const parCle = new Map(champsPublics.map((ch) => [ch.cle, ch]));

let resultatAffiche = false;
let videHTML = "";

function texte(id) {
  return document.getElementById(id).textContent.trim();
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function terminer(s) {
  return /[.!?…]$/.test(s) ? s : s + ".";
}

function aidePublique(aide) {
  if (!aide) return "";
  const interdit = /\b(meilleur|garantir|maximiser|experts?|spécialiste)\b|ne pas envoyer|\benvoy|\bdécision\b|visible si|afficher à côté|^afficher\b|^choix\s*:|à ne pas|backend|interne\s*:/i;
  const gardes = [];
  for (const brute of aide.split(/(?<=\.)\s+/)) {
    const phrase = brute.trim();
    if (!phrase) continue;
    if (!interdit.test(phrase)) {
      gardes.push(terminer(phrase));
      continue;
    }
    for (const clause of phrase.split(/;\s+/)) {
      const c = clause.trim();
      if (c && !interdit.test(c)) gardes.push(terminer(c));
    }
  }
  return gardes.join(" ");
}

function formatValeur(ch, value) {
  if (ch.type === "texte" || ch.type === "choix") return value == null ? "" : String(value);
  if (value === "" || value == null) return "";
  const n = typeof value === "number" ? value : num(value);
  if (!Number.isFinite(n)) return "";
  if (ch.cle === "evalAnnee" && n === 0) return "";
  if (ch.type === "entier") return String(Math.trunc(n));
  const dec = (String(n).split(".")[1] || "").length;
  return new Intl.NumberFormat("fr-CA", {
    minimumFractionDigits: dec,
    maximumFractionDigits: Math.max(dec, 2),
    useGrouping: ch.type === "montant",
  }).format(n);
}

function visible(ch, etat) {
  if (!ch.afficheSi) return true;
  return ch.afficheSi.split(/\s+et\s+/).every((part) => {
    const morceau = part.trim().match(/^(\w+)\s*=\s*(\w+)$/);
    if (!morceau) return true;
    return String(etat[morceau[1]]) === morceau[2];
  });
}

function pastille(statut) {
  return `<span class="pastille" data-statut="${esc(statut)}">${esc(statut)}</span>`;
}

function setPastille(id, statut) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = statut;
  el.dataset.statut = statut;
}

function extraPour(ch) {
  if (ch.cle === "ville") return `<p class="schl" id="fiabilite-schl"></p>`;
  if (ch.cle === "facteur") return `<p class="aide" id="facteur-source"></p>`;
  if (/^l[0-3]$/.test(ch.cle)) return `<p class="schl" id="schl_${ch.cle}"></p>`;
  return "";
}

function controle(ch, aide) {
  const ids = [];
  if (aide) ids.push(`aide_${ch.cle}`);
  if (/^l[0-3]$/.test(ch.cle)) ids.push(`schl_${ch.cle}`);
  if (ch.cle === "ville") ids.push("fiabilite-schl");
  if (ch.cle === "facteur") ids.push("facteur-source");
  const described = ids.length ? ` aria-describedby="${ids.join(" ")}"` : "";
  const req = ch.obligatoire ? ` aria-required="true"` : "";
  if (ch.type === "choix") {
    const opts = (ch.options || []).map((o) => `<option value="${esc(o.valeur)}">${esc(o.etiquette)}</option>`).join("");
    return `<select id="f_${ch.cle}" name="${esc(ch.cle)}"${described}${req}>${opts}</select>`;
  }
  const mode = ch.type === "entier" ? "numeric" : ch.type === "texte" ? "text" : "decimal";
  const ml = ch.maxLength ? ` maxlength="${Number(ch.maxLength)}"` : "";
  return `<input id="f_${ch.cle}" name="${esc(ch.cle)}" type="text" inputmode="${mode}" autocomplete="off" spellcheck="false" autocapitalize="off"${ml}${described}${req}>`;
}

function champHTML(ch, opts = {}) {
  const aide = opts.sansAide ? "" : aidePublique(ch.aide);
  const badge = ch.statut ? `<span class="pastille" id="stat_${ch.cle}" data-statut="${esc(ch.statut)}">${esc(ch.statut)}</span>` : "";
  return `<div class="champ" id="w_${ch.cle}" data-cle="${esc(ch.cle)}">
    <div class="champ-entete"><label for="f_${ch.cle}">${esc(ch.etiquette)}</label>${badge}</div>
    ${controle(ch, aide)}
    ${extraPour(ch)}
    ${aide ? `<p class="aide" id="aide_${ch.cle}">${esc(aide)}</p>` : ""}
  </div>`;
}

function renduLoyers(champs) {
  let html = `<p class="rappel">Au moins un logement requis au total. Valeurs de départ = exemple Plex.io (triplex : 2 × 4 ½ et 1 × 5 ½). Remplacer par les baux réels.</p>`;
  for (const i of [0, 1, 2, 3]) {
    const n = champs.find((c) => c.cle === `n${i}`);
    const l = champs.find((c) => c.cle === `l${i}`);
    html += `<div class="paire-loyer">${champHTML(n, { sansAide: true })}${champHTML(l, { sansAide: true })}</div>`;
  }
  for (const cle of ["autresRev", "inoc"]) html += champHTML(champs.find((c) => c.cle === cle));
  return html;
}

function renduComparables(champs) {
  let html = `<p class="rappel">Saisie manuelle de ventes vérifiées; l'outil ne consulte ni Centris ni JLR.</p>`;
  for (let j = 1; j <= 5; j += 1) {
    const sous = champs.filter((c) => c.cle.startsWith(`c${j}`));
    html += `<details><summary>Comparable ${j}</summary>${sous.map((ch) => champHTML(ch)).join("")}</details>`;
  }
  return html;
}

function classeGrille(nom) {
  if (nom.startsWith("Dépenses") || nom.startsWith("Rapprochement") || nom.startsWith("Évaluation") || nom.startsWith("Financement")) return "grille cols-2";
  return "";
}

function interieur(g) {
  if (g.nom === "Loyers actuels") return renduLoyers(g.champs);
  if (g.nom === "Comparables") return renduComparables(g.champs);
  if (g.nom === "Méthode du revenu") return `${g.champs.map((ch) => champHTML(ch)).join("")}<p class="repere" id="repere-cbre"></p>`;
  const inner = g.champs.map((ch) => champHTML(ch)).join("");
  const grille = classeGrille(g.nom);
  return grille ? `<div class="${grille}">${inner}</div>` : inner;
}

function groupes() {
  const out = [];
  for (const ch of champsPublics) {
    const last = out[out.length - 1];
    if (!last || last.nom !== ch.groupe) out.push({ nom: ch.groupe, champs: [ch] });
    else last.champs.push(ch);
  }
  return out;
}

function val(cle) {
  return document.getElementById(`f_${cle}`).value;
}

function appliquer(entrees, cles) {
  for (const cle of cles) {
    const ch = parCle.get(cle);
    const input = document.getElementById(`f_${cle}`);
    if (!ch || !input) continue;
    input.value = formatValeur(ch, entrees[cle]);
  }
}

function majVisibilite() {
  const etat = { type: val("type"), srcMrb: val("srcMrb"), srcMrn: val("srcMrn") };
  for (const ch of champsPublics) {
    const wrap = document.getElementById(`w_${ch.cle}`);
    if (wrap) wrap.hidden = !visible(ch, etat);
  }
  document.querySelectorAll("fieldset[data-groupe]").forEach((fs) => {
    fs.hidden = !fs.querySelector(".champ:not([hidden])");
  });
}

function majSchl() {
  const v = PARAMETERS.villes[val("ville")];
  const fiab = document.getElementById("fiabilite-schl");
  if (fiab) fiab.textContent = `Fiabilité SCHL : ${v.fiabilite.value}`;
  v.loyers.value.forEach((loyer, i) => {
    const s = document.getElementById(`schl_l${i}`);
    if (s) s.textContent = `SCHL : ${m(loyer)}`;
  });
}

function majInoc() {
  const v = PARAMETERS.villes[val("ville")];
  setPastille("stat_inoc", v.inoc.value === num(val("inoc")) ? "Confirmé" : "Hypothèse");
}

function majFacteur() {
  const f = PARAMETERS.villes[val("ville")].facteurComparatif;
  setPastille("stat_facteur", f.status);
  const src = document.getElementById("facteur-source");
  if (src) src.textContent = f.source;
}

function texteCbre() {
  const rep = PARAMETERS.repereTgaCbre;
  return `Estimé. Repère CBRE (T3 2026) : Montréal ${rep.value.montreal}; Québec ${rep.value.quebec}. ${rep.source}`;
}

function remplirDefauts() {
  const e = entreesParDefaut("plex", "sherbrooke");
  for (const ch of champsPublics) {
    const input = document.getElementById(`f_${ch.cle}`);
    if (!input) continue;
    input.value = ch.type === "choix" ? (e[ch.cle] ?? "") : formatValeur(ch, e[ch.cle]);
  }
}

function lireEntrees() {
  const type = val("type");
  const ville = val("ville");
  const e = entreesParDefaut(type, ville);
  for (const ch of champsPublics) {
    const input = document.getElementById(`f_${ch.cle}`);
    if (!input) continue;
    if (ch.type === "choix" || ch.type === "texte") e[ch.cle] = input.value;
    else if (input.value.trim() === "") e[ch.cle] = ch.cle === "evalAnnee" ? "" : 0;
    else e[ch.cle] = input.value;
  }
  e.type = type;
  e.ville = ville;
  e.vendeur = false;
  e.demo = false;
  const prix = document.getElementById("f_prixAchat");
  const annee = document.getElementById("f_anAchat");
  if (prix) e.prixAchat = prix.value;
  if (annee && annee.value.trim() !== "") e.anAchat = annee.value;
  return e;
}

function lireContact() {
  const v = (id) => document.getElementById(id)?.value ?? "";
  return {
    prenom: v("f_prenom"),
    nom: v("f_nom"),
    telephone: v("f_telephone"),
    courriel: v("f_courriel"),
    adresseImmeuble: v("f_adresseImmeuble"),
    municipalite: v("f_municipalite"),
    codePostal: v("f_codePostal"),
  };
}

let contactTouche = false;

function majConsentement() {
  const contact = document.getElementById("f_consentContact").checked === true;
  document.getElementById("bloc-identite").hidden = !contact;
  if (!contact) document.getElementById("erreurs-contact").innerHTML = "";
  else if (contactTouche) majErreursContact();
}

function majErreursContact() {
  const boite = document.getElementById("erreurs-contact");
  if (document.getElementById("f_consentContact").checked !== true) {
    boite.innerHTML = "";
    return;
  }
  const erreurs = validerContact(lireContact());
  boite.innerHTML = erreurs.length ? `<ul>${erreurs.map((e) => `<li>${esc(e)}</li>`).join("")}</ul>` : "";
}

function majPrix() {
  const nb = ["n0", "n1", "n2", "n3"].reduce((a, k) => a + num(document.getElementById(`f_${k}`)?.value), 0);
  const prix = num(document.getElementById("f_prixAchat")?.value);
  const nbTxt = Number.isInteger(nb) ? String(nb) : new Intl.NumberFormat("fr-CA", { maximumFractionDigits: 2 }).format(nb);
  document.getElementById("nombre-logements").textContent = nbTxt;
  document.getElementById("prix-par-logement").textContent = prix > 0 && nb > 0 ? m(prix / nb) : "—";
}

function afficherVide() {
  document.getElementById("annonce-visible").textContent = "";
  document.getElementById("annonce-chiffres").textContent = "";
  document.getElementById("resultat-corps").innerHTML = videHTML;
  document.getElementById("btn-imprimer").hidden = true;
  resultatAffiche = false;
}

function onSaisie() {
  if (resultatAffiche) afficherVide();
}

function montrerMessages(erreurs, avertissements) {
  const boiteE = document.getElementById("erreurs");
  const boiteA = document.getElementById("avertissements");
  boiteE.innerHTML = erreurs.length ? `<ul>${erreurs.map((e) => `<li>${esc(e)}</li>`).join("")}</ul>` : "";
  boiteA.innerHTML = avertissements.length ? `<ul>${avertissements.map((e) => `<li>${esc(e)}</li>`).join("")}</ul>` : "";
  for (const ch of champsPublics) {
    const input = document.getElementById(`f_${ch.cle}`);
    if (!input) continue;
    input.setAttribute("aria-invalid", erreurs.some((e) => e.startsWith(ch.etiquette)) ? "true" : "false");
  }
  if (erreurs.some((e) => e.includes("logement"))) {
    for (const k of ["n0", "n1", "n2", "n3"]) document.getElementById(`f_${k}`)?.setAttribute("aria-invalid", "true");
  }
}

function designation(entrees) {
  const adresse = String(entrees.adresse || "").trim();
  if (adresse) return adresse;
  const type = parCle.get("type");
  const opt = type?.options?.find((o) => o.valeur === entrees.type);
  return opt ? opt.etiquette : String(entrees.type || "");
}

function fmtCompte(n) {
  return Number.isInteger(n) ? String(n) : new Intl.NumberFormat("fr-CA", { maximumFractionDigits: 2 }).format(n);
}

function phraseFourchette(r, des) {
  const k = r.fourchette.nbMethodesUtilisees;
  const motP = r.nb > 1 || r.nb === 0 ? "logements" : "logement";
  const motM = k > 1 || k === 0 ? "méthodes" : "méthode";
  return `${des} : ${fmtCompte(r.nb)} ${motP}, RNE de ${m(r.rne)}. Fourchette rapprochée de ${k} ${motM} sur 4, arrondie à ${m(r.fourchette.arrondi)}.`;
}

function fmtPoints(ratio) {
  if (!Number.isFinite(ratio)) return "n.d.";
  const n = Math.round(ratio * 1000) / 10;
  const digits = Number.isInteger(n) ? 0 : 1;
  return `${new Intl.NumberFormat("fr-CA", { minimumFractionDigits: digits, maximumFractionDigits: 1 }).format(n)} %`;
}

function piedSommaire(entrees) {
  const dateTxt = new Date().toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" });
  let html = `<p class="prepare-ligne">Préparé le ${esc(dateTxt)} — Équipe Chiasson De Francesco, RE/MAX D'ABORD, Sherbrooke</p>`;
  if (String(entrees.prepare || "").trim()) html += `<p class="prepare-ligne">Préparé par (courtier) : ${esc(String(entrees.prepare).trim())}</p>`;
  html += `<p>${esc(texte("texte-a0"))}</p><p class="rappel">${esc(texte("texte-b4"))}</p>`;
  return html;
}

function metriques(r) {
  const demi = Number.isFinite(r.demiEcartPct) ? `± ${pct1(r.demiEcartPct)}` : "—";
  return `<dl class="metriques">
    <div><dt>Bas de la fourchette</dt><dd>${esc(m(r.fourchette.bas))}</dd></div>
    <div class="centrale"><dt>Valeur centrale</dt><dd>${esc(m(r.fourchette.central))}</dd></div>
    <div><dt>Haut de la fourchette</dt><dd>${esc(m(r.fourchette.haut))}</dd></div>
    <div class="pleine"><dt>Demi-écart autour de la valeur centrale</dt><dd>${esc(demi)}</dd></div>
  </dl>`;
}

function ligneReperes(r) {
  const b = [];
  if (Number.isFinite(r.reperes.tgaImplicite)) b.push(`TGA implicite ${pct(r.reperes.tgaImplicite)}`);
  if (Number.isFinite(r.reperes.mrbImplicite)) b.push(`MRB ${x(r.reperes.mrbImplicite)}`);
  if (Number.isFinite(r.reperes.mrnImplicite)) b.push(`MRN ${x(r.reperes.mrnImplicite)}`);
  if (Number.isFinite(r.reperes.prixParPorte)) b.push(`Prix par porte ${m(r.reperes.prixParPorte)}`);
  return b.length ? `<p class="reperes">${esc(b.join(" · "))}</p>` : "";
}

function tableauRevenus(r) {
  const lignes = [
    ["Revenu brut potentiel", m(r.rbp)],
    ["Revenu brut effectif", m(r.rbe)],
    ...r.postes.map((p) => [p[0], m(p[1])]),
    ["Dépenses", m(r.dep)],
    ["RNE", m(r.rne)],
  ];
  const rows = lignes.map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`).join("");
  return `<div class="bloc-resultat table-enveloppe"><table><caption>Revenu net d'exploitation</caption><tbody>${rows}</tbody></table></div>`;
}

function tableauMethodes(r) {
  const rows = r.methodesAffichage.map((z) => {
    const poids = !z.ok ? "—" : z.poidsPct === null ? "Non utilisée" : `${new Intl.NumberFormat("fr-CA", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(z.poidsPct * 100)} %`;
    const statut = !z.ok ? "Données manquantes" : z.stat;
    const mont = (k) => (!z.ok || !Number.isFinite(z[k]) ? "—" : m(z[k]));
    const note = z.ok && z.note ? `<span class="note-methode">${esc(z.note)}</span>` : "";
    return `<tr>
      <th scope="row">${esc(z.nom)}${note}</th>
      <td>${esc(z.base)}</td>
      <td>${esc(mont("b"))}</td>
      <td>${esc(mont("c"))}</td>
      <td>${esc(mont("h"))}</td>
      <td>${esc(poids)}</td>
      <td>${pastille(statut)}</td>
    </tr>`;
  }).join("");
  return `<div class="bloc-resultat table-enveloppe"><table>
    <caption>Méthodes</caption>
    <thead><tr><th>Méthode</th><th>Base</th><th>Bas</th><th>Central</th><th>Haut</th><th>Pondération</th><th>Statut</th></tr></thead>
    <tbody>${rows}</tbody>
  </table></div>`;
}

function graphique(r) {
  const lignes = [];
  for (const z of r.methodesAffichage) {
    if (z.utilisee && Number.isFinite(z.c)) lignes.push({ nom: z.nom, v: z.c, fourchette: false });
  }
  if (Number.isFinite(r.rec.c)) lignes.push({ nom: "Fourchette rapprochée, valeur centrale", v: r.rec.c, fourchette: true });
  if (!lignes.length) return "";
  const max = Math.max(...lignes.map((l) => l.v));
  const rows = lignes.map((l) => {
    const largeur = Math.max(2, Math.round((l.v / max) * 100));
    return `<div class="barre-ligne${l.fourchette ? " fourchette" : ""}">
      <div class="barre-nom">${esc(l.nom)}</div>
      <div>${esc(m(l.v))}</div>
      <div class="barre-piste" aria-hidden="true"><span class="barre-remplissage" data-barre="${largeur}"></span></div>
    </div>`;
  }).join("");
  return `<div class="bloc-resultat"><h3>Méthodes utilisées</h3>${rows}</div>`;
}

function tableauAlertes(r) {
  if (!r.alertes.length) return "";
  const rows = r.alertes.map((a) => `<tr><th scope="row">${esc(a[0])}</th><td>${esc(a[1])}</td></tr>`).join("");
  return `<div class="bloc-resultat table-enveloppe"><table>
    <caption>Points de vigilance</caption>
    <thead><tr><th>Point</th><th>Précision</th></tr></thead>
    <tbody>${rows}</tbody>
  </table></div>`;
}

function tableauSens(r) {
  const libs = [
    "TGA − écart — Haut de la fourchette du revenu",
    "TGA − écart/2",
    "TGA central — Central",
    "TGA + écart/2",
    "TGA + écart — Bas de la fourchette du revenu",
  ];
  const rows = r.sens.map((s, i) => `<tr><th scope="row">${esc(libs[i])}</th><td>${esc(pct(s.g))}</td><td>${esc(m(s.v))}</td></tr>`).join("");
  const tgaComp = r.sTga.n > 0
    ? `<p class="reperes">TGA implicite des comparables : ${esc(pct(r.sTga.min))} à ${esc(pct(r.sTga.max))}, moyenne ${esc(pct(r.sTga.moy))}.</p>`
    : "";
  return `<div class="bloc-resultat"><h3>Méthode du revenu</h3>
    <div class="table-enveloppe"><table>
      <caption>Tableau de sensibilité</caption>
      <thead><tr><th>Position</th><th>TGA</th><th>Valeur</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
    ${tgaComp}
    <p class="repere">${esc(texteCbre())}</p>
  </div>`;
}

function tableauComps(r) {
  const rappel = `<p class="rappel">Saisie manuelle de ventes vérifiées; l'outil ne consulte ni Centris ni JLR.</p>`;
  let corps;
  if (!r.comps.length) corps = `<p>Aucun comparable saisi.</p>${rappel}`;
  else {
    const rows = r.comps.map((c) => `<tr>
      <th scope="row">${esc(c.nom)}</th>
      <td>${esc(c.date)}</td>
      <td>${esc(m(c.pa))}</td>
      <td>${esc(m(c.ppo))}</td>
      <td>${esc(x(c.mrb))}</td>
      <td>${esc(x(c.mrn))}</td>
      <td>${esc(pct(c.tga))}</td>
    </tr>`).join("");
    corps = `<div class="table-enveloppe"><table>
      <caption>Comparables</caption>
      <thead><tr><th>Comparable</th><th>Date</th><th>Prix ajusté</th><th>Prix par porte</th><th>MRB</th><th>MRN</th><th>TGA</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>${rappel}`;
  }
  return `<div class="bloc-resultat"><h3>Comparables, MRB et MRN</h3>${corps}</div>`;
}

function blocMunicipal(r) {
  const ref = `<p class="rappel">Référence seulement, exclue du rapprochement.</p>`;
  if (!(r.municipale.total > 0)) {
    return `<div class="bloc-resultat"><h3>Évaluation municipale</h3>${ref}<p>Saisissez l'évaluation inscrite au rôle pour afficher les ratios.</p></div>`;
  }
  const mu = r.municipale;
  const lignes = [
    ["Évaluation totale", m(mu.total)],
    ["Évaluation × facteur comparatif", m(mu.marche)],
    ["Valeur centrale / évaluation", x(mu.ratioCentral)],
    ["Fourchette / (évaluation × facteur)", `${x(mu.ratioBas)} à ${x(mu.ratioHaut)}`],
    ["Part du terrain", pct(mu.partTerrain)],
  ];
  const rows = lignes.map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`).join("");
  return `<div class="bloc-resultat"><h3>Évaluation municipale</h3>${ref}<div class="table-enveloppe"><table><tbody>${rows}</tbody></table></div></div>`;
}

function blocFin(r) {
  if (!r.fin.length) return "";
  const groupesFin = new Map();
  for (const z of r.fin) {
    if (!groupesFin.has(z.prog)) groupesFin.set(z.prog, []);
    groupesFin.get(z.prog).push(z);
  }
  const d = r.c.droitsMutation;
  let html = `<div class="bloc-resultat"><h3>Financement d'un acheteur type</h3>
    <p class="rappel">Liquidités totales = mise + droits de mutation + frais + taxe sur la prime. RCD sous 1,20 × = seuil indicatif. Test du BSIF non appliqué. Qualification personnelle non calculée.</p>
    <p class="rappel">Droits de mutation — ${esc(d.status)}. ${esc(d.source)}${d.note ? `. ${esc(d.note)}` : ""}</p>`;
  for (const [prog, rows] of groupesFin) {
    const note = r.progs.find((p) => p.label === prog)?.note || "";
    const z0 = rows[0];
    const plafond = z0.rcdApplies && Number.isFinite(z0.pStar)
      ? `${m(z0.pStar)} : prix au-delà duquel la mise minimale ne suffit plus`
      : "Non plafonné par le RCD (qualification personnelle)";
    const body = rows.map((z) => `<tr>
      <th scope="row">${esc(z.prixLab)}</th>
      <td>${esc(m(z.P))}</td>
      <td>${esc(m(z.Lb))}</td>
      <td>${esc(m(z.mise))} (${esc(fmtPoints(z.miseP))})</td>
      <td>${esc(m(z.cash))}</td>
      <td>${z.rcdApplies ? esc(x(z.rcd)) : "—"}</td>
      <td class="statut-fin ${z.ok ? "suffisant" : "requis"}">${esc(z.ok ? `Mise minimale de ${fmtPoints(z.minMise)} suffisante` : `Mise de ${fmtPoints(z.miseP)} requise`)}</td>
    </tr>`).join("");
    html += `<div class="table-enveloppe"><table>
      <caption>${esc(prog)}${note ? `<span class="note-prog">${esc(note)}</span>` : ""}<span class="note-prog">${esc(plafond)}</span></caption>
      <thead><tr><th>Point</th><th>Prix</th><th>Prêt (prime exclue)</th><th>Mise de fonds requise</th><th>Liquidités totales</th><th>RCD</th><th>Statut</th></tr></thead>
      <tbody>${body}</tbody>
    </table></div>`;
  }
  return `${html}</div>`;
}

function afficherResultat(r, entrees) {
  document.getElementById("btn-imprimer").hidden = false;
  if (!Number.isFinite(r.fourchette.central)) {
    document.getElementById("annonce-visible").textContent = texte("texte-insuffisant");
    document.getElementById("annonce-chiffres").textContent = "";
    document.getElementById("resultat-corps").innerHTML = `<p class="mention">${esc(texte("texte-b2"))}</p>${piedSommaire(entrees)}`;
    resultatAffiche = true;
    return;
  }
  const phrase = phraseFourchette(r, designation(entrees));
  document.getElementById("annonce-visible").textContent = phrase;
  document.getElementById("annonce-chiffres").textContent = `Bas ${m(r.fourchette.bas)}, valeur centrale ${m(r.fourchette.central)}, haut ${m(r.fourchette.haut)}.`;
  document.getElementById("resultat-corps").innerHTML = `
    ${metriques(r)}
    <p class="mention">${esc(texte("texte-b2"))}</p>
    ${ligneReperes(r)}
    ${tableauRevenus(r)}
    ${tableauMethodes(r)}
    ${graphique(r)}
    ${tableauAlertes(r)}
    ${tableauSens(r)}
    ${tableauComps(r)}
    ${blocMunicipal(r)}
    ${blocFin(r)}
    ${piedSommaire(entrees)}`;
  document.querySelectorAll("[data-barre]").forEach((el) => {
    el.style.width = `${el.getAttribute("data-barre")}%`;
  });
  resultatAffiche = true;
}

function calculer() {
  const entrees = lireEntrees();
  let validation;
  try {
    validation = validerEntrees(entrees);
  } catch (e) {
    montrerMessages([e.message], []);
    afficherVide();
    return;
  }
  montrerMessages(validation.erreurs, validation.avertissements);
  if (validation.erreurs.length) {
    afficherVide();
    const boite = document.getElementById("erreurs");
    boite.tabIndex = -1;
    boite.focus();
    return;
  }
  let r;
  try {
    r = evaluer(entrees);
  } catch (e) {
    montrerMessages([e.message], []);
    afficherVide();
    return;
  }
  afficherResultat(r, entrees);
  const titre = document.getElementById("resultat-titre");
  if (window.matchMedia("(max-width: 1099px)").matches) {
    const y = titre.getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo(0, Math.max(0, y));
  }
  titre.focus({ preventScroll: true });
}

function feuilles(obj, chemin, sortie) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return;
  if ("status" in obj && "value" in obj && "source" in obj) {
    sortie.push({ chemin, value: obj.value, status: obj.status, source: obj.source, date: obj.date || "", note: obj.note || "" });
    return;
  }
  for (const [k, v] of Object.entries(obj)) {
    if (["version", "pageSource", "nom", "tailles"].includes(k)) continue;
    if (chemin.length === 0 && (k === "baremesImpot" || k === "exemptionIMR2026")) continue;
    if (chemin.length === 1 && chemin[0] === "defauts" && EXCLUS_DEFAUTS.has(k)) continue;
    feuilles(v, chemin.concat(k), sortie);
  }
}

function formatParam(v) {
  if (typeof v === "number") return new Intl.NumberFormat("fr-CA", { maximumFractionDigits: 4 }).format(v);
  if (typeof v === "string") return v === "" ? "—" : v;
  if (Array.isArray(v)) {
    if (v.length && v.every((x) => Array.isArray(x))) return v.map((row) => row.map(formatParam).join(" · ")).join(" ; ");
    return v.map(formatParam).join(", ");
  }
  if (v && typeof v === "object") return Object.entries(v).map(([k, val]) => `${k} : ${formatParam(val)}`).join(", ");
  return String(v ?? "—");
}

function tableauParametres() {
  const lignes = [];
  feuilles(PARAMETERS, [], lignes);
  const rows = lignes.map((l) => `<tr>
    <th scope="row">${esc(l.chemin.join(" · "))}</th>
    <td>${esc(formatParam(l.value))}${l.note ? `<span class="note-methode">${esc(l.note)}</span>` : ""}</td>
    <td>${pastille(l.status)}</td>
    <td>${esc(l.source)}</td>
    <td>${esc(l.date)}</td>
  </tr>`).join("");
  document.getElementById("table-parametres").innerHTML = `<div class="table-enveloppe"><table class="parametres">
    <caption class="visually-hidden">Hypothèses et statuts</caption>
    <thead><tr><th>Paramètre</th><th>Valeur</th><th>Statut</th><th>Source</th><th>Date</th></tr></thead>
    <tbody>${rows}</tbody>
  </table></div>`;
}

function init() {
  videHTML = document.getElementById("resultat-corps").innerHTML;
  const form = document.createElement("form");
  form.id = "formulaire";
  form.noValidate = true;
  form.autocomplete = "off";
  form.innerHTML = `<div id="erreurs" role="alert"></div><div id="avertissements" role="status"></div><div class="barre-calcul barre-haut"><button type="submit" class="bouton">Calculer la fourchette</button></div>${groupes().map((g) => `<fieldset data-groupe="${esc(g.nom)}"><legend>${esc(g.nom)}</legend>${interieur(g)}</fieldset>`).join("")}<div class="barre-calcul"><button type="submit" class="bouton">Calculer la fourchette</button></div>`;
  document.getElementById("colonne-formulaire").appendChild(form);
  remplirDefauts();
  majVisibilite();
  majSchl();
  majInoc();
  majFacteur();
  document.getElementById("repere-cbre").textContent = texteCbre();
  tableauParametres();

  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    calculer();
  });
  form.addEventListener("input", () => { onSaisie(); majPrix(); });
  form.addEventListener("change", onSaisie);
  document.getElementById("f_consentContact").addEventListener("change", majConsentement);
  document.getElementById("f_consentStats").addEventListener("change", majConsentement);
  document.getElementById("bloc-identite").addEventListener("input", () => {
    contactTouche = true;
    majErreursContact();
  });
  document.getElementById("f_prixAchat").addEventListener("input", () => { onSaisie(); majPrix(); });
  document.getElementById("f_anAchat").addEventListener("input", onSaisie);
  majPrix();
  majConsentement();
  document.getElementById("f_type").addEventListener("change", () => {
    appliquer(entreesParDefaut(val("type"), val("ville")), CLES_TYPE);
    majVisibilite();
    majPrix();
  });
  document.getElementById("f_ville").addEventListener("change", () => {
    appliquer(entreesParDefaut(val("type"), val("ville")), CLES_VILLE);
    majSchl();
    majInoc();
    majFacteur();
  });
  document.getElementById("f_inoc").addEventListener("input", majInoc);
  document.getElementById("f_srcMrb").addEventListener("change", majVisibilite);
  document.getElementById("f_srcMrn").addEventListener("change", majVisibilite);
  document.getElementById("btn-imprimer").addEventListener("click", () => window.print());
  document.getElementById("btn-calcul-haut").addEventListener("click", () => form.requestSubmit());
  preparerModulesV3();
}

function fmtRatio(v) {
  return Number.isFinite(v) ? pct(v) : "—";
}

function fmtMultiple(v) {
  if (!Number.isFinite(v)) return "—";
  return `${new Intl.NumberFormat("fr-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)} ×`;
}

function lireZonageRendement() {
  const o = {};
  for (const [cle] of ZONAGE_REND) {
    const el = document.getElementById(`f_${cle}`);
    o[cle] = el && el.value.trim() !== "" ? el.value : 0;
  }
  return o;
}

function metrique(libelle, valeur) {
  const wrap = document.createElement("div");
  const dt = document.createElement("dt");
  dt.textContent = libelle;
  const dd = document.createElement("dd");
  dd.textContent = valeur;
  wrap.append(dt, dd);
  return wrap;
}

function afficherRendement() {
  const r = evaluerRendement({ ...lireEntrees(), ...lireZonageRendement() });
  const corps = document.getElementById("rendement-corps");
  corps.replaceChildren();
  if (r.avertissementDefauts) {
    const note = document.createElement("p");
    note.className = "mention";
    note.textContent = r.avertissementDefauts;
    corps.append(note);
  }
  const prix = document.createElement("p");
  prix.textContent = r.prixSource === "valeur_centrale"
    ? `Prix d'analyse : ${m(r.prix)} (valeur centrale de la fourchette).`
    : `Prix d'analyse : ${m(r.prix)}.`;
  const dl = document.createElement("dl");
  dl.className = "metriques";
  dl.append(
    metrique("Cash-on-cash (année 1)", fmtRatio(r.cocAn1)),
    metrique("TRI", r.tri == null ? "—" : pct(r.tri)),
    metrique("VAN", m(r.van)),
    metrique("MIRR", r.trim == null ? "—" : pct(r.trim)),
    metrique("Multiple des capitaux", fmtMultiple(r.multiple)),
    metrique("Point mort", fmtRatio(r.pointMort)),
  );
  corps.append(prix, dl);
  if (r.zonage && r.zonage.limites.length) {
    const h = document.createElement("h3");
    h.textContent = "Logements permis par les limites saisies";
    const table = document.createElement("table");
    const body = document.createElement("tbody");
    for (const li of r.zonage.limites) {
      const tr = document.createElement("tr");
      const th = document.createElement("th");
      th.scope = "row";
      th.textContent = li.label;
      const td = document.createElement("td");
      td.textContent = String(li.val);
      tr.append(th, td);
      body.append(tr);
    }
    const tr = document.createElement("tr");
    const th = document.createElement("th");
    th.scope = "row";
    th.textContent = "Limite retenue";
    const td = document.createElement("td");
    td.textContent = `${r.zonage.permis} (${r.zonage.contrainte})`;
    tr.append(th, td);
    body.append(tr);
    table.append(body);
    corps.append(h, table);
  }
}

function lienAffichable(entree) {
  if (!entree || !entree.url) return false;
  if (entree.aRetravailler) return false;
  if (entree.statutAcces === "404" || entree.statutHttp === 404) return false;
  return true;
}

function afficherZonage() {
  const demandee = document.getElementById("zonage-muni").value;
  const ref = referencesZonage(demandee);
  const corps = document.getElementById("zonage-corps");
  corps.replaceChildren();
  const visibles = (ref.entrees || [])
    .filter(lienAffichable)
    .slice()
    .sort((a, b) => {
      const ia = PRIORITE_LIEN.indexOf(a.typeDocument);
      const ib = PRIORITE_LIEN.indexOf(b.typeDocument);
      return (ia === -1 ? PRIORITE_LIEN.length : ia) - (ib === -1 ? PRIORITE_LIEN.length : ib);
    });
  if (!visibles.length) {
    const p = document.createElement("p");
    p.className = "ligne-verification";
    p.textContent = TEXTES_ZONAGE_V3.verificationGenerique;
    corps.append(p);
    return;
  }
  const muni = ref.municipalite;
  for (const lien of visibles) {
    const art = document.createElement("article");
    const h = document.createElement("h3");
    h.textContent = lien.typeDocument;
    const p = document.createElement("p");
    p.className = "ligne-verification";
    p.append(`Vérifiez les normes applicables auprès du service d'urbanisme de ${muni} avant toute décision. Le règlement officiel de la municipalité a préséance. Consultez : `);
    const a = document.createElement("a");
    a.href = lien.url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = lien.url;
    const hors = document.createElement("span");
    hors.className = "visually-hidden";
    hors.textContent = " (s'ouvre dans un nouvel onglet)";
    a.append(hors);
    p.append(a, ` (${lien.typeDocument}).`);
    art.append(h, p);
    corps.append(art);
  }
}

function afficherResiduel() {
  const corps = document.getElementById("residuel-corps");
  corps.replaceChildren();
  const valeurs = ["f_tM2", "f_prixT", "f_supLog", "f_s1Grille", "f_s1Cos", "f_s1Empr", "f_s1Et"].map((id) => document.getElementById(id).value.trim());
  if (valeurs.every((v) => v === "")) {
    const p = document.createElement("p");
    p.textContent = "Saisissez la superficie, le prix et au moins un paramètre de zonage (grille, COS ou emprise et étages).";
    corps.append(p);
    return;
  }
  const R = evaluerResiduel({
    tM2: document.getElementById("f_tM2").value,
    prixT: document.getElementById("f_prixT").value,
    supLog: document.getElementById("f_supLog").value,
    ville: document.getElementById("f_ville")?.value || "sherbrooke",
    scenarios: [{
      nom: document.getElementById("f_s1Nom").value || "Scénario 1",
      grille: document.getElementById("f_s1Grille").value,
      cos: document.getElementById("f_s1Cos").value,
      emprise: document.getElementById("f_s1Empr").value,
      etages: document.getElementById("f_s1Et").value,
    }],
  });
  const repliExemple = (R.defautsAppliques || []).some((k) => k === "tM2" || k === "prixT" || k === "scenarios");
  if (repliExemple && R.avertissement) {
    const note = document.createElement("p");
    note.className = "mention";
    note.textContent = R.avertissement;
    corps.append(note);
  }
  const s = R.scen[0];
  const dl = document.createElement("dl");
  dl.className = "metriques";
  dl.append(
    metrique("Logements (grille, COS, emprise × étages)", s ? String(s.n) : "—"),
    metrique("Valeur résiduelle", s ? m(s.res) : "—"),
    metrique("Prix maximal", m(R.prixMax)),
  );
  corps.append(dl);
}

function preparerModulesV3() {
  const hote = document.getElementById("champs-zonage-rendement");
  for (const [cle, libelle] of ZONAGE_REND) {
    const wrap = document.createElement("div");
    wrap.className = "champ";
    const label = document.createElement("label");
    label.htmlFor = `f_${cle}`;
    label.textContent = libelle;
    const input = document.createElement("input");
    input.id = `f_${cle}`;
    input.type = "text";
    input.inputMode = "decimal";
    input.autocomplete = "off";
    input.spellcheck = false;
    wrap.append(label, input);
    hote.append(wrap);
  }
  const sel = document.getElementById("zonage-muni");
  for (const nom of zonageReferencesCatalog.municipalites || []) {
    const opt = document.createElement("option");
    opt.value = nom;
    opt.textContent = nom;
    if (nom === "Sherbrooke") opt.selected = true;
    sel.append(opt);
  }
  sel.addEventListener("change", afficherZonage);
  afficherZonage();
  document.getElementById("btn-rendement").addEventListener("click", afficherRendement);
  document.getElementById("btn-residuel").addEventListener("click", afficherResiduel);
}

init();
