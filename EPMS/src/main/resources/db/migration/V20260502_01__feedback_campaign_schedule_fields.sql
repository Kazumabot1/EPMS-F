ALTER TABLE feedback_campaigns
    ADD COLUMN IF NOT EXISTS review_year INT NULL,
    ADD COLUMN IF NOT EXISTS review_round VARCHAR(32) NULL,
    ADD COLUMN IF NOT EXISTS start_time TIME NULL,
    ADD COLUMN IF NOT EXISTS end_time TIME NULL,
    ADD COLUMN IF NOT EXISTS description TEXT NULL,
    ADD COLUMN IF NOT EXISTS instructions TEXT NULL;

UPDATE feedback_campaigns
SET review_year = COALESCE(review_year, YEAR(start_date)),
    review_round = COALESCE(review_round, 'ANNUAL'),
    start_time = COALESCE(start_time, '09:00:00'),
    end_time = COALESCE(end_time, '17:00:00')
WHERE review_year IS NULL OR review_round IS NULL OR start_time IS NULL OR end_time IS NULL;

CREATE INDEX IF NOT EXISTS idx_feedback_campaigns_round_status
    ON feedback_campaigns (review_year, review_round, status);

CREATE INDEX IF NOT EXISTS idx_feedback_campaigns_schedule
    ON feedback_campaigns (start_date, end_date, status);
