// ORACLE DE VÉRIFICATION — extrait TEXTUEL (copie) de la logique de la Page canvas
// dd69dd2b-19a5-4bee-aae7-4fb0b4074466 « plex-ai.io — Évaluation de bloc (prototype) », lue le 2026-11-19.
// Seuls l'interface (JSX), l'impression et le visuel sont retirés; les hooks React sont remplacés par des
// bouchons. Sert UNIQUEMENT à produire les résultats attendus de tests.js de façon indépendante de
// evaluation_bloc.js. Ne pas déployer. Exécution : node (Node 22.18+ / 24, types effacés automatiquement).

type VilleId = "sherbrooke" | "magog" | "montreal" | "quebec" | "gatineau" | "troisrivieres" | "saguenay";
type TypeImm = "plex" | "multi";
type Det = "particulier" | "spcc";
type ModeImp = "constant" | "tranches";
type SrcM = "comps" | "manuel";
type Stat = "Confirmé" | "Déduit" | "Estimé" | "Hypothèse";
type F = Record<string, string>;

interface Ville { nom: string; loyers: number[]; inoc: number; fiab: string; dmi: number[][]; fc: string; fcStat: Stat; fcNote: string }
interface Meth { id: string; nom: string; base: string; b: number; c: number; h: number; w: number; ok: boolean; stat: Stat; note: string }
interface Comp { j: number; nom: string; date: string; pr: number; po: number; rb: number; rn: number; adj: number; pa: number; ppo: number; mrb: number; mrn: number; tga: number }
interface ProgDef { id: string; label: string; ltv: number; rate: number; am: number; rcd: number; rcdApplies: boolean; primeFn: (ltv: number) => number; note: string }
interface FinRow { prog: string; prixLab: string; P: number; Lb: number; prime: number; mise: number; miseP: number; cash: number; rcd: number; pStar: number; ok: boolean; rcdApplies: boolean; minMise: number }

const BASE_DMI: number[][] = [[62900, 0.005], [315000, 0.01], [Infinity, 0.015]];
const VILLES: Record<VilleId, Ville> = {
  sherbrooke: { nom: "Sherbrooke (RMR)", loyers: [712, 905, 1062, 1375], inoc: 2.7, fiab: "a (excellente)", dmi: [[62900, 0.005], [315000, 0.01], [500000, 0.015], [Infinity, 0.03]], fc: "1,08", fcStat: "Confirmé", fcNote: "Ville de Sherbrooke : 1,08 (sherbrooke.ca, relevé dans Plex.io)" },
  magog: { nom: "Magog (zone de la RMR de Sherbrooke)", loyers: [562, 925, 940, 1217], inoc: 3.8, fiab: "b à d, utiliser avec prudence", dmi: BASE_DMI, fc: "1,00", fcStat: "Hypothèse", fcNote: "hypothèse, à vérifier auprès de la Ville de Magog" },
  montreal: { nom: "Montréal (RMR)", loyers: [1005, 1131, 1346, 1625], inoc: 2.9, fiab: "a", dmi: [[62900, 0.005], [315000, 0.01], [552300, 0.015], [1104700, 0.02], [2136500, 0.025], [3113000, 0.035], [Infinity, 0.04]], fc: "1,00", fcStat: "Confirmé", fcNote: "Ville de Montréal : 1,00 (montreal.ca)" },
  quebec: { nom: "Québec (RMR)", loyers: [855, 1107, 1276, 1464], inoc: 2.4, fiab: "a à c", dmi: [[62900, 0.005], [315000, 0.01], [500000, 0.015], [750000, 0.025], [Infinity, 0.03]], fc: "1,08", fcStat: "Confirmé", fcNote: "Ville de Québec : 1,08 (ville.quebec.qc.ca)" },
  gatineau: { nom: "Gatineau (partie québécoise de la RMR)", loyers: [1046, 1362, 1451, 1508], inoc: 3.8, fiab: "a à c", dmi: BASE_DMI, fc: "1,00", fcStat: "Hypothèse", fcNote: "hypothèse, à vérifier auprès de la Ville de Gatineau" },
  troisrivieres: { nom: "Trois-Rivières (RMR)", loyers: [699, 828, 1017, 1111], inoc: 2.7, fiab: "a à b", dmi: BASE_DMI, fc: "1,00", fcStat: "Hypothèse", fcNote: "hypothèse, à vérifier auprès de la Ville de Trois-Rivières" },
  saguenay: { nom: "Saguenay (RMR)", loyers: [658, 762, 986, 997], inoc: 1.3, fiab: "a à b", dmi: BASE_DMI, fc: "1,00", fcStat: "Hypothèse", fcNote: "hypothèse, à vérifier auprès de la Ville de Saguenay" },
};
const TAILLES: string[] = ["Studio", "1 chambre (3 ½)", "2 chambres (4 ½)", "3 chambres + (5 ½ +)"];

const PRIME_STD: number[][] = [[0.65, 3.25, 2.60], [0.70, 3.75, 2.85], [0.75, 4.25, 3.35], [0.80, 5.00, 4.35], [0.85, 6.00, 5.35], [0.90, 6.75, 5.90], [0.95, 7.00, 6.15]];
function primeMulti(ltv: number, amortA: number): number {
  if (ltv <= 0) return 0;
  let row = PRIME_STD[PRIME_STD.length - 1];
  for (const r0 of PRIME_STD) { if (ltv <= r0[0] + 1e-9) { row = r0; break; } }
  const sur = Math.max(0, Math.ceil((amortA - 25) / 5 - 1e-9)) * 0.25;
  return (row[2] + sur) / 100;
}
const FED: [number, number][] = [[0, 14], [58523, 20.5], [117045, 26], [181440, 29], [258482, 33]];
const QC: [number, number][] = [[0, 14], [54345, 19], [108680, 24], [132245, 25.75]];
function bareme(xv: number, b: [number, number][]): number {
  const y = Math.max(0, xv); let s = 0;
  for (let i = 0; i < b.length; i++) {
    const lo = b[i][0]; const hi = i + 1 < b.length ? b[i + 1][0] : Infinity;
    if (y > lo) s += (Math.min(y, hi) - lo) * b[i][1] / 100;
  }
  return s;
}
function impotPerso(xv: number, abat: number): number { return bareme(xv, FED) * (1 - abat) + bareme(xv, QC); }

function num(s: string | undefined): number {
  if (s === undefined) return 0;
  const v = parseFloat(s.replace(/[\s\u00a0\u202f$%×]/g, "").replace(",", "."));
  return isFinite(v) ? v : 0;
}
function frStr(n: number): string { return String(n).replace(".", ","); }
function droits(p: number, tr: number[][]): number {
  let d = 0, prev = 0;
  for (const [lim, taux] of tr) { if (p > prev) d += (Math.min(p, lim) - prev) * taux; prev = lim; }
  return d;
}
function iMens(r: number): number { return Math.pow(1 + r / 2, 1 / 6) - 1; }
function paiement(L: number, i: number, n: number): number {
  if (n <= 0 || L <= 0) return 0;
  return i > 0 ? (L * i) / (1 - Math.pow(1 + i, -n)) : L / n;
}
function pretMaxFn(rne: number, rcd: number, rate: number, am: number): number {
  const pmt = rcd > 0 ? rne / rcd / 12 : 0;
  if (pmt <= 0) return 0;
  const i = iMens(rate), n = Math.max(1, Math.round(am * 12));
  return i > 0 ? (pmt * (1 - Math.pow(1 + i, -n))) / i : pmt * n;
}
function stats(vs: number[]): { n: number; min: number; moy: number; max: number } {
  const ok = vs.filter((v: number) => isFinite(v) && v > 0);
  if (!ok.length) return { n: 0, min: NaN, moy: NaN, max: NaN };
  return { n: ok.length, min: Math.min(...ok), moy: ok.reduce((a: number, v: number) => a + v, 0) / ok.length, max: Math.max(...ok) };
}

const TYPE_F: Record<TypeImm, F> = {
  plex: { n0: "0", n1: "0", n2: "2", n3: "1", taxesMun: "4 500", taxesScol: "500", assur: "2 500", energie: "600", entretien: "1 800", reserve: "900", autres: "0", gestion: "5" },
  multi: { n0: "0", n1: "0", n2: "4", n3: "2", taxesMun: "8 000", taxesScol: "1 000", assur: "4 800", energie: "2 000", entretien: "3 600", reserve: "1 800", autres: "0", gestion: "5" },
};
const COMP_KEYS: string[] = ["Nom", "Date", "Prix", "Portes", "Rbp", "Rne", "Adj"];
function compsVides(): F {
  const o: F = {};
  for (let j = 1; j <= 5; j++) for (const k of COMP_KEYS) o[`c${j}${k}`] = k === "Nom" || k === "Date" ? "" : "0";
  return o;
}
const DEMO: F = {
  c1Nom: "Comparable fictif A (démo)", c1Date: "démo", c1Prix: "960 000", c1Portes: "6", c1Rbp: "82 000", c1Rne: "0", c1Adj: "2",
  c2Nom: "Comparable fictif B (démo)", c2Date: "démo", c2Prix: "1 320 000", c2Portes: "8", c2Rbp: "110 000", c2Rne: "0", c2Adj: "-3",
  c3Nom: "Comparable fictif C (démo)", c3Date: "démo", c3Prix: "845 000", c3Portes: "5", c3Rbp: "69 000", c3Rne: "0", c3Adj: "0",
};

const DEF: F = {
  adresse: "", prepare: "",
  ...TYPE_F.plex,
  l0: "712", l1: "905", l2: "1062", l3: "1375", autresRev: "0", inoc: "2,7",
  evalTerrain: "0", evalBat: "0", evalAnnee: "", facteur: "1,08",
  tga: "5,00", ecart: "50",
  mrbB: "0", mrbC: "0", mrbH: "0", mrnB: "0", mrnC: "0", mrnH: "0",
  wRev: "40", wPar: "30", wMrb: "15", wMrn: "15", arrondi: "5 000",
  ...compsVides(),
  pcLtv: "80", pcTaux: "5,34", pcAm: "25", pcRcd: "1,20",
  poLtv: "90", poPrime: "3,10", poTaux: "4,84", poAm: "25",
  mcLtv: "75", mcTaux: "5,84", mcAm: "25", mcRcd: "1,20",
  msLtv: "85", msTaux: "4,64", msAm: "40",
  notaire: "2 000", inspection: "1 500", evaluation: "3 500", tvqPrime: "9",
  prixVente: "0", commission: "4", taxesCom: "14,975", notaireV: "1 500", solde: "0", penalite: "0",
  prixAchat: "0", fraisAchat: "0", travauxCap: "0", dpaCum: "0", terrainAchat: "25", terrainVente: "0",
  anAchat: "2016", anVente: "2026", quote: "100", tm: "53,31", tSpcc: "50,17", incl: "50", abat: "16,5", autreRev: "0", rpPct: "0", rpAns: "0",
};

// --- bouchons de hooks (remplacent React) ---
let __ov: Record<string, any> = {};
let __i = 0;
const __noms = ["f", "type", "ville", "srcMrb", "srcMrn", "vendeur", "det", "modeImp", "rp", "demo", "msg"];
function useState(init: any): [any, any] { const k = __noms[__i++]; return [k in __ov ? __ov[k] : init, () => {}]; }
function useMemo(fn: () => any, _deps: any[]): any { return fn(); }
const money = new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });
const dec2 = new Intl.NumberFormat("fr-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function m(v: number): string { return isFinite(v) ? money.format(v) : "n.d."; }
function pct(v: number): string { return isFinite(v) ? dec2.format(v * 100) + " %" : "n.d."; }
function x(v: number): string { return isFinite(v) && v > 0 ? dec2.format(v) + " ×" : "n.d."; }

// Reprise de choisirVille / choisirType de la Page (état de départ après sélection)
export function etatInitial(typeSel: TypeImm, villeSel: VilleId, extra: F): F {
  const c = VILLES[villeSel];
  return { ...DEF, ...TYPE_F[typeSel], l0: String(c.loyers[0]), l1: String(c.loyers[1]), l2: String(c.loyers[2]), l3: String(c.loyers[3]), inoc: frStr(c.inoc), facteur: c.fc, ...extra };
}

export function calc(ov: Record<string, any>): any {
  __ov = ov; __i = 0;
  const [f, ] = useState(DEF);
  const [type, ] = useState("plex");
  const [ville, ] = useState("sherbrooke");
  const [srcMrb, ] = useState("comps");
  const [srcMrn, ] = useState("comps");
  const [vendeur, ] = useState(false);
  const [det, ] = useState("particulier");
  const [modeImp, ] = useState("constant");
  const [rp, ] = useState(false);
  const [demo, ] = useState(false);
  void vendeur; void TAILLES; void m; void pct; void x;

  const r = useMemo(() => {
    const c = VILLES[ville as VilleId];
    const n = [num(f.n0), num(f.n1), num(f.n2), num(f.n3)];
    const L = [num(f.l0), num(f.l1), num(f.l2), num(f.l3)];
    const nb = n.reduce((a: number, v: number) => a + v, 0);
    const rbp = n.reduce((a: number, v: number, i: number) => a + v * L[i] * 12, 0) + num(f.autresRev);
    const vac = num(f.inoc) / 100;
    const rbe = rbp * (1 - vac);
    const postes: [string, number][] = [
      ["Taxes municipales", num(f.taxesMun)], ["Taxes scolaires", num(f.taxesScol)], ["Assurances", num(f.assur)],
      ["Énergie (aires communes, chauffage payé par le propriétaire)", num(f.energie)], ["Entretien et réparations", num(f.entretien)],
      ["Gestion", (rbe * num(f.gestion)) / 100], ["Réserve de remplacement", num(f.reserve)], ["Autres", num(f.autres)],
    ];
    const dep = postes.reduce((a: number, p0: [string, number]) => a + p0[1], 0);
    const rne = rbe - dep;

    // Méthode du revenu
    const tga = num(f.tga) / 100, ec = num(f.ecart) / 10000;
    const capAt = (g: number): number => (g > 0 ? rne / g : NaN);
    const sens = [-1, -0.5, 0, 0.5, 1].map((k: number) => ({ g: tga + k * ec, v: capAt(tga + k * ec) }));

    // Comparables
    const comps: Comp[] = [1, 2, 3, 4, 5].map((j: number) => {
      const g = (k: string): number => num(f[`c${j}${k}`]);
      const pr = g("Prix"), po = g("Portes"), rb = g("Rbp"), rn = g("Rne"), adj = g("Adj") / 100;
      const pa = pr * (1 + adj);
      return { j, nom: f[`c${j}Nom`] || `Comparable ${j}`, date: f[`c${j}Date`] || "", pr, po, rb, rn, adj, pa, ppo: po > 0 ? pa / po : NaN, mrb: rb > 0 ? pa / rb : NaN, mrn: rn > 0 ? pa / rn : NaN, tga: rn > 0 && pa > 0 ? rn / pa : NaN };
    }).filter((q: Comp) => q.pr > 0);
    const sPpo = stats(comps.map((q: Comp) => q.ppo));
    const sMrb = stats(comps.map((q: Comp) => q.mrb));
    const sMrn = stats(comps.map((q: Comp) => q.mrn));
    const sTga = stats(comps.map((q: Comp) => q.tga));

    const manuel = (bk: string, ck: string, hk: string): { b: number; c: number; h: number } | null => {
      const cc = num(f[ck]);
      if (cc <= 0) return null;
      return { b: num(f[bk]) > 0 ? num(f[bk]) : cc, c: cc, h: num(f[hk]) > 0 ? num(f[hk]) : cc };
    };
    const mMrb = srcMrb === "manuel" ? manuel("mrbB", "mrbC", "mrbH") : sMrb.n ? { b: sMrb.min, c: sMrb.moy, h: sMrb.max } : null;
    const mMrn = srcMrn === "manuel" ? manuel("mrnB", "mrnC", "mrnH") : sMrn.n ? { b: sMrn.min, c: sMrn.moy, h: sMrn.max } : null;

    const meth: Meth[] = [
      { id: "rev", nom: "Revenu : RNE / TGA", base: `RNE ${m(rne)}; TGA ${pct(tga)} ± ${Math.round(ec * 10000)} pb`, b: capAt(tga + ec), c: capAt(tga), h: capAt(tga - ec), w: num(f.wRev), ok: rne > 0 && tga - ec > 0, stat: "Hypothèse", note: "TGA saisi : aucune source publique pour Sherbrooke" },
      { id: "par", nom: "Parité : prix par porte des comparables", base: sPpo.n ? `${sPpo.n} comparable(s); ${m(sPpo.min)} à ${m(sPpo.max)} par porte × ${nb} portes` : "Aucun comparable saisi", b: sPpo.min * nb, c: sPpo.moy * nb, h: sPpo.max * nb, w: num(f.wPar), ok: sPpo.n > 0 && nb > 0, stat: demo ? "Hypothèse" : "Déduit", note: demo ? "comparables fictifs de démonstration" : "déduit des ventes saisies" },
      { id: "mrb", nom: "MRB × revenu brut potentiel", base: mMrb ? `MRB ${x(mMrb.b)} à ${x(mMrb.h)} × RBP ${m(rbp)}` : "Aucun MRB disponible", b: mMrb ? mMrb.b * rbp : NaN, c: mMrb ? mMrb.c * rbp : NaN, h: mMrb ? mMrb.h * rbp : NaN, w: num(f.wMrb), ok: mMrb !== null && rbp > 0, stat: srcMrb === "manuel" || demo ? "Hypothèse" : "Déduit", note: srcMrb === "manuel" ? "MRB saisi" : "déduit des comparables" },
      { id: "mrn", nom: "MRN × revenu net d'exploitation", base: mMrn ? `MRN ${x(mMrn.b)} à ${x(mMrn.h)} × RNE ${m(rne)}` : "Aucun MRN disponible (RNE des comparables non saisi)", b: mMrn ? mMrn.b * rne : NaN, c: mMrn ? mMrn.c * rne : NaN, h: mMrn ? mMrn.h * rne : NaN, w: num(f.wMrn), ok: mMrn !== null && rne > 0, stat: srcMrn === "manuel" || demo ? "Hypothèse" : "Déduit", note: srcMrn === "manuel" ? "MRN saisi" : "déduit des comparables" },
    ];
    const dispo = meth.filter((q: Meth) => q.ok && q.w > 0 && isFinite(q.c));
    const wTot = dispo.reduce((a: number, q: Meth) => a + q.w, 0);
    const arr = num(f.arrondi);
    const rnd = (v: number): number => (arr > 0 && isFinite(v) ? Math.round(v / arr) * arr : v);
    const pond = (k: "b" | "c" | "h"): number => (wTot > 0 ? dispo.reduce((a: number, q: Meth) => a + q[k] * q.w, 0) / wTot : NaN);
    const rec = { b: rnd(pond("b")), c: rnd(pond("c")), h: rnd(pond("h")) };

    // Évaluation municipale (référence)
    const evalTot = num(f.evalTerrain) + num(f.evalBat);
    const evalMarche = evalTot * num(f.facteur);

    // Points de vigilance (repris de Plex.io)
    const alertes: [string, string][] = [];
    if (num(f.assur) <= 0) alertes.push(["Assurances absentes", "Aucun montant d'assurance n'est saisi."]);
    if (rbp > 0 && dep / rbp < 0.25) alertes.push(["Dépenses totales sous 25 % des revenus bruts", `Dépenses retenues : ${pct(dep / rbp)} du RBP. Un acheteur et son prêteur normaliseront probablement à la hausse.`]);
    if (rbp > 0 && (rbe * num(f.gestion)) / 100 / rbp < 0.03) alertes.push(["Gestion absente ou symbolique", "La gestion est nulle ou inférieure à 3 % des revenus bruts."]);
    if (num(f.inoc) <= 0) alertes.push(["Aucune inoccupation", "Aucun taux d'inoccupation n'est saisi."]);
    if (num(f.entretien) <= 0) alertes.push(["Entretien absent", "Aucun montant d'entretien n'est saisi."]);
    if (num(f.reserve) <= 0) alertes.push(["Pas de réserve", "Aucune réserve de remplacement n'est saisie."]);
    if (num(f.evalAnnee) > 0 && num(f.evalAnnee) < 2026) alertes.push(["Évaluation municipale d'une année antérieure", `L'évaluation saisie porte sur ${f.evalAnnee}.`]);
    if (demo) alertes.push(["Comparables fictifs", "Les comparables chargés sont des données de démonstration, pas des ventes réelles."]);
    if (rec.h > 0 && rec.b > 0 && rec.h / rec.b > 1.3) alertes.push(["Fourchette large", `L'écart entre le haut et le bas dépasse 30 % : les méthodes divergent, à expliquer au client.`]);

    // Financement de l'acheteur
    const progs: ProgDef[] = type === "plex"
      ? [
          { id: "pc", label: "Conventionnel, acheteur investisseur", ltv: num(f.pcLtv) / 100, rate: num(f.pcTaux) / 100, am: num(f.pcAm), rcd: num(f.pcRcd), rcdApplies: true, primeFn: () => 0, note: "Mise minimale 20 % pour un investisseur non occupant (Plex.io); RCD 1,20 : hypothèse." },
          { id: "po", label: "Propriétaire occupant, assuré SCHL", ltv: num(f.poLtv) / 100, rate: num(f.poTaux) / 100, am: num(f.poAm), rcd: 0, rcdApplies: false, primeFn: () => num(f.poPrime) / 100, note: "3 ou 4 logements : 90 % de prêt-valeur, prime 3,10 % (SCHL). Qualification selon le revenu personnel de l'acheteur, non calculée ici." },
        ]
      : [
          { id: "mc", label: "Conventionnel non assuré", ltv: num(f.mcLtv) / 100, rate: num(f.mcTaux) / 100, am: num(f.mcAm), rcd: num(f.mcRcd), rcdApplies: true, primeFn: () => 0, note: "75 %, 25 ans, RCD 1,20 : hypothèse à valider avec un prêteur (Plex.io)." },
          { id: "ms", label: "SCHL standard (logement locatif standard)", ltv: num(f.msLtv) / 100, rate: num(f.msTaux) / 100, am: num(f.msAm), rcd: nb <= 6 ? 1.1 : 1.3, rcdApplies: true, primeFn: (lv: number) => primeMulti(lv, num(f.msAm)), note: `RCD ${nb <= 6 ? "1,10 (5 ou 6 logements)" : "1,30 (7 logements et plus, terme de moins de 10 ans)"}, prime de la grille SCHL avec surprime d'amortissement.` },
        ];
    const fraisAch = num(f.notaire) + num(f.inspection) + num(f.evaluation);
    const tvq = num(f.tvqPrime) / 100;
    const prix: [string, number][] = [["Bas", rec.b], ["Central", rec.c], ["Haut", rec.h]];
    const fin: FinRow[] = [];
    for (const g of progs) {
      const pmax = g.rcdApplies ? pretMaxFn(rne, g.rcd, g.rate, g.am) : Infinity;
      const pAtMax = g.primeFn(g.ltv);
      const pStar = g.rcdApplies && g.ltv > 0 ? pmax / (1 + pAtMax) / g.ltv : Infinity;
      for (const [lab, P] of prix) {
        if (!(P > 0)) continue;
        let Lb = g.ltv * P, p = 0;
        for (let it = 0; it < 6; it++) { p = g.primeFn(Lb / P); Lb = Math.max(0, Math.min(g.ltv * P, g.rcdApplies ? pmax / (1 + p) : Infinity)); }
        p = g.primeFn(Lb / P);
        const prime = Lb * p;
        const serv = paiement(Lb + prime, iMens(g.rate), Math.round(g.am * 12)) * 12;
        const mise = P - Lb;
        fin.push({ prog: g.label, prixLab: lab, P, Lb, prime, mise, miseP: mise / P, cash: mise + droits(P, c.dmi) + fraisAch + prime * tvq, rcd: serv > 0 ? rne / serv : NaN, pStar, ok: P <= pStar + 1, rcdApplies: g.rcdApplies, minMise: 1 - g.ltv });
      }
    }

    // Vendeur : produit net et gain en capital (logique du calculateur de gain en capital, catégorie 1 seulement)
    const Pv = num(f.prixVente) > 0 ? num(f.prixVente) : rec.c;
    const comm = Pv * (num(f.commission) / 100) * (1 + num(f.taxesCom) / 100);
    const fv = comm + num(f.notaireV);
    const net = Pv - fv;
    const q = num(f.quote) / 100;
    const achat = num(f.prixAchat);
    const base = achat + num(f.fraisAchat);
    const terrA = Math.min(1, Math.max(0, num(f.terrainAchat) / 100));
    const terr = base * terrA;
    const cout = base - terr + num(f.travauxCap);
    const dpa = Math.min(num(f.dpaCum), cout);
    const fnacc = cout - dpa;
    const tvSrc = num(f.terrainVente) > 0 ? "saisie" : evalTot > 0 ? "rôle" : "achat";
    const tv = num(f.terrainVente) > 0 ? num(f.terrainVente) / 100 : evalTot > 0 ? num(f.evalTerrain) / evalTot : terrA;
    const netT = net * tv, netB = net - netT;
    const rec0 = Math.max(0, Math.min(netB, cout) - fnacc);
    let pf = Math.max(0, fnacc - Math.min(netB, cout));
    const gainB = Math.max(0, netB - cout);
    let gainT = netT - terr;
    let realloc = 0;
    if (pf > 0 && gainT > 0) { realloc = Math.min(pf, gainT); pf -= realloc; gainT -= realloc; }
    const gainBrut = gainT + gainB;
    const N = Math.max(1, num(f.anVente) - num(f.anAchat));
    const exo = rp ? Math.max(0, gainBrut) * (num(f.rpPct) / 100) * Math.min(1, (1 + num(f.rpAns)) / N) : 0;
    const G = Math.max(0, (gainBrut - exo) * q);
    const R = rec0 * q, PF = pf * q;
    const TCG = G * (num(f.incl) / 100);
    const baseImp = TCG + R - PF;
    const abat = num(f.abat) / 100;
    const imp = achat <= 0 ? 0 : det === "spcc" ? Math.max(0, baseImp) * (num(f.tSpcc) / 100)
      : modeImp === "tranches" ? impotPerso(num(f.autreRev) + baseImp, abat) - impotPerso(num(f.autreRev), abat)
      : baseImp * (num(f.tm) / 100);
    const dette = (num(f.solde) + num(f.penalite)) * q;
    const netVendeur = net * q - imp - dette;
    const ati = num(f.autreRev) + G + R - PF;

    return {
      c, n, L, nb, rbp, vac, rbe, postes, dep, rne, tga, ec, sens, comps, sPpo, sMrb, sMrn, sTga, meth, wTot, rec, evalTot, evalMarche, alertes,
      progs, fin, fraisAch, Pv, comm, fv, net, q, achat, terr, cout, dpa, fnacc, tv, tvSrc, netT, netB, rec0, pf, gainB, gainT, realloc, gainBrut, N, exo, G, R, PF, TCG, baseImp, imp, dette, netVendeur, ati,
    };
  }, [f, type, ville, srcMrb, srcMrn, det, modeImp, rp, demo]);
  return r;
}
