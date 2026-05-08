-- Manual fallback for controlled early close approval workflow.
-- Run only if Flyway does not apply V20260507_02 automatically.

ALTER TABLE feedback_campaigns
    ADD COLUMN IF NOT EXISTS early_close_request_status VARCHAR(32) NOT NULL DEFAULT 'NONE' AFTER auto_submit_completed_drafts_on_close,
    ADD COLUMN IF NOT EXISTS early_close_requested_at DATETIME NULL AFTER early_close_request_status,
    ADD COLUMN IF NOT EXISTS early_close_requested_by_user_id BIGINT NULL AFTER early_close_requested_at,
    ADD COLUMN IF NOT EXISTS early_close_request_reason TEXT NULL AFTER early_close_requested_by_user_id,
    ADD COLUMN IF NOT EXISTS early_close_reviewed_at DATETIME NULL AFTER early_close_request_reason,
    ADD COLUMN IF NOT EXISTS early_close_reviewed_by_user_id BIGINT NULL AFTER early_close_reviewed_at,
    ADD COLUMN IF NOT EXISTS early_close_review_reason TEXT NULL AFTER early_close_reviewed_by_user_id,
    ADD COLUMN IF NOT EXISTS closed_at DATETIME NULL AFTER early_close_review_reason,
    ADD COLUMN IF NOT EXISTS closed_by_user_id BIGINT NULL AFTER closed_at,
    ADD COLUMN IF NOT EXISTS close_reason TEXT NULL AFTER closed_by_user_id,
    ADD COLUMN IF NOT EXISTS closed_early BOOLEAN NOT NULL DEFAULT FALSE AFTER close_reason;

CREATE INDEX idx_feedback_campaigns_early_close_status
    ON feedback_campaigns (early_close_request_status);
