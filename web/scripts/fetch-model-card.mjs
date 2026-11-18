// Build step: copy the model card numbers from Neon into src/data/model_card.json.
// If DATABASE_URL is missing or the query fails, the committed JSON is kept (the build never fails on this).
import { neon } from "@neondatabase/serverless";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const OUT = "src/data/model_card.json";
const man = JSON.parse(readFileSync("model_manifest.json", "utf8"));
if (!process.env.DATABASE_URL) {
  console.log(`[model-card] no DATABASE_URL; using committed ${OUT}`);
  process.exit(0);
}
try {
  const sql = neon(process.env.DATABASE_URL);
  const [mv] = await sql`select * from model_versions where version = ${man.version}`;
  if (!mv) throw new Error(`model version ${man.version} not in database`);
  const results = await sql`select * from eval_results where model_version_id = ${mv.id} order by id`;
  writeFileSync(OUT, JSON.stringify({ model: mv, results, source: "neon", fetched: new Date().toISOString().slice(0, 10) }, null, 1));
  console.log(`[model-card] wrote ${results.length} results for ${mv.version} from Neon`);
} catch (e) {
  console.log(`[model-card] database read failed (${e.message}); using committed ${existsSync(OUT) ? OUT : "NOTHING"}`);
}
