-- Manual fix for Step 9: HR-controlled feedback summary publish rules.
-- Safe to rerun on MySQL versions that support ADD COLUMN IF NOT EXISTS.

ALTER TABLE feedback_summary
    ADD COLUMN IF NOT EXISTS visibility_status VARCHAR(30) NOT NULL DEFAULT 'HIDDEN' AFTER score_calculation_note,
    ADD COLUMN IF NOT EXISTS published_at DATETIME NULL AFTER visibility_status,
    ADD COLUMN IF NOT EXISTS published_by_user_id BIGINT NULL AFTER published_at,
    ADD COLUMN IF NOT EXISTS publish_note TEXT NULL AFTER published_by_user_id;

UPDATE feedback_summary
SET visibility_status = CASE
                            WHEN visibility_status IS NULL OR visibility_status = '' THEN 'HIDDEN'
                            ELSE visibility_status
    END;

CREATE INDEX IF NOT EXISTS idx_feedback_summary_visibility
    ON feedback_summary (campaign_id, target_employee_id, visibility_status);
