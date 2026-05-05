-- Feedback form versioning columns for EPMS-94
ALTER TABLE feedback_forms
    ADD COLUMN IF NOT EXISTS root_form_id BIGINT NULL,
    ADD COLUMN IF NOT EXISTS version_number INT NOT NULL DEFAULT 1;

-- Backfill lineage for existing rows
UPDATE feedback_forms
SET root_form_id = id
WHERE root_form_id IS NULL;

-- Helpful lookup index for version browsing
CREATE INDEX IF NOT EXISTS idx_feedback_forms_root_version
    ON feedback_forms (root_form_id, version_number);
