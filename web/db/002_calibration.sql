-- Calibration parameters, raw calibration error, and other-disease false-flag rate.
ALTER TABLE model_versions ADD COLUMN IF NOT EXISTS calib_a real;
ALTER TABLE model_versions ADD COLUMN IF NOT EXISTS calib_b real;
ALTER TABLE model_versions ADD COLUMN IF NOT EXISTS other_disease_false_flag_rate real;
ALTER TABLE eval_results ADD COLUMN IF NOT EXISTS ece_raw real;
ALTER TABLE eval_results ADD COLUMN IF NOT EXISTS note text
