-- Backend hardening for dynamic 360 question bank scoring policy.
-- Keeps non-rating answers out of score calculations and allows question codes to be backend-generated.

ALTER TABLE feedback_question_bank
    ADD COLUMN IF NOT EXISTS default_scoring_behavior VARCHAR(30) NOT NULL DEFAULT 'SCORED' AFTER default_response_type;

ALTER TABLE feedback_question_versions
    ADD COLUMN IF NOT EXISTS scoring_behavior VARCHAR(30) NOT NULL DEFAULT 'SCORED' AFTER response_type;

ALTER TABLE feedback_assignment_questions
    ADD COLUMN IF NOT EXISTS scoring_behavior VARCHAR(30) NOT NULL DEFAULT 'SCORED' AFTER response_type;

UPDATE feedback_question_bank
SET default_scoring_behavior = CASE
                                   WHEN default_response_type IN ('RATING', 'RATING_WITH_COMMENT') THEN 'SCORED'
                                   WHEN default_response_type = 'YES_NO' THEN 'HR_REVIEW'
                                   ELSE 'NON_SCORED'
    END
WHERE default_scoring_behavior IS NULL OR default_scoring_behavior = '';

UPDATE feedback_question_versions qv
    JOIN feedback_question_bank qb ON qb.id = qv.question_bank_id
SET qv.scoring_behavior = COALESCE(NULLIF(qv.scoring_behavior, ''), qb.default_scoring_behavior)
WHERE qv.scoring_behavior IS NULL OR qv.scoring_behavior = '';

UPDATE feedback_assignment_questions
SET scoring_behavior = CASE
                           WHEN response_type IN ('RATING', 'RATING_WITH_COMMENT') THEN 'SCORED'
                           WHEN response_type = 'YES_NO' THEN 'HR_REVIEW'
                           ELSE 'NON_SCORED'
    END
WHERE scoring_behavior IS NULL OR scoring_behavior = '';

-- Non-scored question rows should not carry misleading weight values.
UPDATE feedback_question_bank
SET default_weight = 1
WHERE default_scoring_behavior <> 'SCORED';

UPDATE feedback_assignment_questions
SET weight = 1
WHERE scoring_behavior <> 'SCORED';
