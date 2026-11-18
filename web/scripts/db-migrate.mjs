// Usage: node --env-file=.env.local scripts/db-migrate.mjs   (applies db/*.sql in order; idempotent)
import { neon } from "@neondatabase/serverless";
import { readdirSync, readFileSync } from "node:fs";
const sql = neon(process.env.DATABASE_URL);
for (const f of readdirSync("db").filter((f) => f.endsWith(".sql")).sort()) {
  const stmts = readFileSync(`db/${f}`, "utf8").split(/;\s*\n/).map((s) => s.trim()).filter(Boolean);
  for (const s of stmts) await sql.query(s);
  console.log(`applied ${f} (${stmts.length} statements)`);
}
const t = await sql`select table_name from information_schema.tables where table_schema='public' order by 1`;
console.log("tables:", t.map((r) => r.table_name).join(", "));
