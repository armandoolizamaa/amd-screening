// Usage: node --env-file=.env.local scripts/db-seed.mjs   (upserts v0.1 + its eval results from training/out/eval.json)
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
const sql = neon(process.env.DATABASE_URL);
const ev = JSON.parse(readFileSync("../training/out/eval.json", "utf8"));
const man = JSON.parse(readFileSync("model_manifest.json", "utf8"));
const [mv] = await sql`
  insert into model_versions (version, architecture, sha256, release_url, threshold, trained_at, notes, calib_a, calib_b, other_disease_false_flag_rate)
  values (${man.version}, 'ResNet-18 (ImageNet init)', ${man.sha256}, ${man.url}, ${ev.threshold_from_val}, current_date,
          ${man.notes ?? "Trained on ODIR-5K + AMDNet23; calibration + threshold fitted on validation; external test = RFMiD"},
          ${ev.calibration?.a ?? null}, ${ev.calibration?.b ?? null}, ${ev.rfmid_other_disease_false_flag_rate ?? null})
  on conflict (version) do update set sha256=excluded.sha256, release_url=excluded.release_url, threshold=excluded.threshold,
    calib_a=excluded.calib_a, calib_b=excluded.calib_b, other_disease_false_flag_rate=excluded.other_disease_false_flag_rate, notes=excluded.notes
  returning id`;
const sets = { internal_test: false, internal_test_odir: false, internal_test_amdnet23: false,
  external_rfmid_pos_vs_healthy: true, external_rfmid_pos_vs_all_nonAMD: true };
const notes = { internal_test: "Pooled across sources; inflated by dataset-source differences. Do not headline.",
  internal_test_amdnet23: "AMDNet23 has CLAHE baked in and 26% AMD; likely source shortcut.",
  external_rfmid_pos_vs_healthy: "Headline result: dataset never used in training, thresholds or calibration." };
for (const [k, ext] of Object.entries(sets)) {
  const r = ev[k], c = r.ci95;
  await sql`
    insert into eval_results (model_version_id, test_set, is_external, n, n_pos, auroc, auroc_lo, auroc_hi,
      sensitivity, sens_lo, sens_hi, specificity, spec_lo, spec_hi, brier, ece, ece_raw, note)
    values (${mv.id}, ${k}, ${ext}, ${r.n}, ${r.pos}, ${r.auroc}, ${c.auroc[0]}, ${c.auroc[1]},
      ${r.sens}, ${c.sens[0]}, ${c.sens[1]}, ${r.spec}, ${c.spec[0]}, ${c.spec[1]}, ${r.brier}, ${r.ece}, ${r.ece_raw ?? null}, ${notes[k] ?? null})
    on conflict (model_version_id, test_set) do update set n=excluded.n, auroc=excluded.auroc,
      sensitivity=excluded.sensitivity, specificity=excluded.specificity, ece=excluded.ece, ece_raw=excluded.ece_raw, note=excluded.note`;
}
const rows = await sql`select test_set, is_external, n, round(auroc::numeric,3) auroc from eval_results order by id`;
console.table(rows);
