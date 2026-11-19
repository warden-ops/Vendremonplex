// Mini validateur JSON Schema (sans dépendance) : type, const, enum, required, properties, additionalProperties:false,
// minimum, maximum, minLength, maxLength, pattern, minItems, maxItems, items, anyOf. Suffit pour schema_donnees.json.
export function valider(schema, valeur, chemin = "$", erreurs = []) {
  if (schema.anyOf) { const ok = schema.anyOf.some((s) => valider(s, valeur, chemin, []).length === 0); if (!ok) erreurs.push(`${chemin} : aucune alternative (anyOf) ne convient`); return erreurs; }
  if ("const" in schema && valeur !== schema.const) erreurs.push(`${chemin} : doit valoir ${JSON.stringify(schema.const)}`);
  if (schema.enum && !schema.enum.includes(valeur)) erreurs.push(`${chemin} : valeur hors énumération (${JSON.stringify(valeur)})`);
  if (schema.type) {
    const t = valeur === null ? "null" : Array.isArray(valeur) ? "array" : typeof valeur;
    if (t !== schema.type) { erreurs.push(`${chemin} : type ${t} au lieu de ${schema.type}`); return erreurs; }
  }
  if (typeof valeur === "number") {
    if (!Number.isFinite(valeur)) erreurs.push(`${chemin} : nombre non fini`);
    if (schema.minimum !== undefined && valeur < schema.minimum) erreurs.push(`${chemin} : ${valeur} < minimum ${schema.minimum}`);
    if (schema.maximum !== undefined && valeur > schema.maximum) erreurs.push(`${chemin} : ${valeur} > maximum ${schema.maximum}`);
  }
  if (typeof valeur === "string") {
    if (schema.minLength !== undefined && valeur.length < schema.minLength) erreurs.push(`${chemin} : trop court`);
    if (schema.maxLength !== undefined && valeur.length > schema.maxLength) erreurs.push(`${chemin} : trop long`);
    if (schema.pattern && !new RegExp(schema.pattern).test(valeur)) erreurs.push(`${chemin} : ne respecte pas le motif`);
    if (schema.format === "date-time" && Number.isNaN(Date.parse(valeur))) erreurs.push(`${chemin} : date-heure invalide`);
  }
  if (Array.isArray(valeur)) {
    if (schema.minItems !== undefined && valeur.length < schema.minItems) erreurs.push(`${chemin} : trop peu d'éléments`);
    if (schema.maxItems !== undefined && valeur.length > schema.maxItems) erreurs.push(`${chemin} : trop d'éléments`);
    if (schema.items) valeur.forEach((v, i) => valider(schema.items, v, `${chemin}[${i}]`, erreurs));
  }
  if (valeur && typeof valeur === "object" && !Array.isArray(valeur)) {
    for (const k of schema.required || []) if (!(k in valeur)) erreurs.push(`${chemin}.${k} : requis`);
    const props = schema.properties || {};
    for (const [k, v] of Object.entries(valeur)) {
      if (k in props) valider(props[k], v, `${chemin}.${k}`, erreurs);
      else if (schema.additionalProperties === false) erreurs.push(`${chemin}.${k} : propriété non permise`);
    }
  }
  return erreurs;
}
