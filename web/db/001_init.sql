-- AMD screening: model registry + evaluation results. No images, no personal data.
CREATE TABLE IF NOT EXISTS model_versions (
  id          serial PRIMARY KEY,
  version     text UNIQUE NOT NULL,          -- e.g. 'v0.1-resnet18'
  architecture text NOT NULL,
  sha256      text NOT NULL,
  release_url text NOT NULL,
  threshold   real NOT NULL CHECK (threshold BETWEEN 0 AND 1),
  trained_at  date,
  notes       text
);

CREATE TABLE IF NOT EXISTS eval_results (
  id                serial PRIMARY KEY,
  model_version_id  integer NOT NULL REFERENCES model_versions(id) ON DELETE CASCADE,
  test_set          text NOT NULL,           -- e.g. 'rfmid_amd_vs_healthy'
  is_external       boolean NOT NULL,        -- true = dataset never seen in training
  n                 integer NOT NULL,
  n_pos             integer NOT NULL,
  auroc real, auroc_lo real, auroc_hi real,
  sensitivity real, sens_lo real, sens_hi real,
  specificity real, spec_lo real, spec_hi real,
  brier real, ece real,
  UNIQUE (model_version_id, test_set)
);
