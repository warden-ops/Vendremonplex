// Extraction d'un sous-ensemble comparable des résultats (oracle de la Page ET evaluation_bloc.js).
// NaN / Infinity sont codés en chaînes pour le JSON.
const enc = (v) => (typeof v === "number" ? (Number.isNaN(v) ? "NaN" : v === Infinity ? "Infinity" : v === -Infinity ? "-Infinity" : v) : v);
const o = (obj, cles) => Object.fromEntries(cles.map((k) => [k, enc(obj[k])]));
export function extraire(r) {
  return {
    nb: r.nb, rbp: enc(r.rbp), vac: enc(r.vac), rbe: enc(r.rbe), postes: r.postes.map((p) => [p[0], enc(p[1])]), dep: enc(r.dep), rne: enc(r.rne), tga: enc(r.tga), ec: enc(r.ec),
    sens: r.sens.map((s) => ({ g: enc(s.g), v: enc(s.v) })),
    comps: r.comps.map((c) => o(c, ["j", "nom", "date", "pr", "po", "rb", "rn", "adj", "pa", "ppo", "mrb", "mrn", "tga"])),
    sPpo: o(r.sPpo, ["n", "min", "moy", "max"]), sMrb: o(r.sMrb, ["n", "min", "moy", "max"]), sMrn: o(r.sMrn, ["n", "min", "moy", "max"]), sTga: o(r.sTga, ["n", "min", "moy", "max"]),
    meth: r.meth.map((q) => o(q, ["id", "nom", "b", "c", "h", "w", "ok", "stat", "note"])),
    wTot: r.wTot, rec: o(r.rec, ["b", "c", "h"]), evalTot: enc(r.evalTot), evalMarche: enc(r.evalMarche),
    alertes: r.alertes.map((a) => [a[0], a[1]]),
    progs: r.progs.map((g) => ({ ...o(g, ["id", "label", "ltv", "rate", "am", "rcd", "rcdApplies", "note"]) })),
    fin: r.fin.map((z) => o(z, ["prog", "prixLab", "P", "Lb", "prime", "mise", "miseP", "cash", "rcd", "pStar", "ok", "rcdApplies", "minMise"])),
    fraisAch: r.fraisAch,
    vendeur: o(r, ["Pv", "comm", "fv", "net", "q", "achat", "terr", "cout", "dpa", "fnacc", "tv", "tvSrc", "netT", "netB", "rec0", "pf", "gainB", "gainT", "realloc", "gainBrut", "N", "exo", "G", "R", "PF", "TCG", "baseImp", "imp", "dette", "netVendeur", "ati"]),
  };
}
const ws = (s) => s.replace(/[\s\u00a0\u202f]+/g, " ");
// Comparaison profonde : nombres à tolérance relative 1e-9; chaînes sans distinction d'espaces (nbsp / fines).
export function comparer(a, b, chemin = "", tol = 1e-9, diffs = []) {
  if (typeof a === "number" && typeof b === "number") {
    const d = Math.abs(a - b); if (!(d <= tol * Math.max(1, Math.abs(a), Math.abs(b)))) diffs.push(`${chemin} : ${a} ≠ ${b}`);
  } else if (typeof a === "string" && typeof b === "string") { if (ws(a) !== ws(b)) diffs.push(`${chemin} : « ${a} » ≠ « ${b} »`); }
  else if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) diffs.push(`${chemin} : longueur ${a.length} ≠ ${b.length}`);
    else a.forEach((v, i) => comparer(v, b[i], `${chemin}[${i}]`, tol, diffs));
  } else if (a && b && typeof a === "object" && typeof b === "object") {
    const ks = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of ks) comparer(a[k], b[k], `${chemin}.${k}`, tol, diffs);
  } else if (a !== b) diffs.push(`${chemin} : ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`);
  return diffs;
}
