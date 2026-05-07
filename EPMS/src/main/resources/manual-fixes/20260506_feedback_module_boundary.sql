-- Manual safety fix if your local DB did not run migrations consistently.
-- Run with: mysql -u root -p epms < EPMS/src/main/resources/db/manual-fixes/20260506_feedback_module_boundary.sql

ALTER TABLE feedback_summary
    MODIFY COLUMN average_score DOUBLE NULL;

ALTER TABLE feedback_summary
    ADD COLUMN IF NOT EXISTS raw_average_score DOUBLE NULL AFTER average_score,
    ADD COLUMN IF NOT EXISTS self_responses BIGINT NOT NULL DEFAULT 0 AFTER subordinate_responses,
    ADD COLUMN IF NOT EXISTS assigned_evaluator_count BIGINT NOT NULL DEFAULT 0 AFTER self_responses,
    ADD COLUMN IF NOT EXISTS submitted_evaluator_count BIGINT NOT NULL DEFAULT 0 AFTER assigned_evaluator_count,
    ADD COLUMN IF NOT EXISTS pending_evaluator_count BIGINT NOT NULL DEFAULT 0 AFTER submitted_evaluator_count,
    ADD COLUMN IF NOT EXISTS completion_rate DOUBLE NOT NULL DEFAULT 0 AFTER pending_evaluator_count,
    ADD COLUMN IF NOT EXISTS confidence_level VARCHAR(32) NOT NULL DEFAULT 'INSUFFICIENT' AFTER completion_rate,
    ADD COLUMN IF NOT EXISTS insufficient_feedback BOOLEAN NOT NULL DEFAULT TRUE AFTER confidence_level,
    ADD COLUMN IF NOT EXISTS score_calculation_method VARCHAR(64) NOT NULL DEFAULT 'SUBMITTED_RESPONSE_AVERAGE' AFTER insufficient_feedback,
    ADD COLUMN IF NOT EXISTS score_calculation_note VARCHAR(500) NULL AFTER score_calculation_method,
    ADD COLUMN IF NOT EXISTS manager_average_score DOUBLE NULL AFTER score_calculation_note,
    ADD COLUMN IF NOT EXISTS peer_average_score DOUBLE NULL AFTER manager_average_score,
    ADD COLUMN IF NOT EXISTS subordinate_average_score DOUBLE NULL AFTER peer_average_score,
    ADD COLUMN IF NOT EXISTS self_average_score DOUBLE NULL AFTER subordinate_average_score;

UPDATE rating_scales
SET promotion_eligibility = NULL,
    performance_level = CASE scales
                            WHEN 5 THEN 'Outstanding feedback rating'
                            WHEN 4 THEN 'Good feedback rating'
                            WHEN 3 THEN 'Meets feedback requirement'
                            WHEN 2 THEN 'Needs improvement feedback rating'
                            WHEN 1 THEN 'Unsatisfactory feedback rating'
                            ELSE performance_level
        END
WHERE scales IN (1, 2, 3, 4, 5);

UPDATE rating_score rs
    JOIN rating_scales scale ON scale.id = rs.description_id
    SET rs.explanation = '360 feedback score band only. Overall promotion or salary increment decisions must combine KPI, appraisal, and feedback scores in the performance engine.'
WHERE scale.scales IN (1, 2, 3, 4, 5);
