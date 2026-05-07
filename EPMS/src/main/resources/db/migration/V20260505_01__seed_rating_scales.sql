-- Seed client-required 1-5 rating scale and score bands for feedback/appraisal forms.
-- Important boundary rule: rating scale labels are not promotion/salary decisions.
-- 360 Feedback exports feedback score only; overall performance, promotion eligibility,
-- and salary increment decisions are handled by the cross-module performance engine.
-- MySQL-compatible and safe to rerun.

START TRANSACTION;

INSERT INTO rating_scales (scales, description, performance_level, promotion_eligibility)
VALUES
    (5, 'Outstanding',        'Outstanding feedback rating',        NULL),
    (4, 'Good',               'Good feedback rating',               NULL),
    (3, 'Meet requirement',   'Meets feedback requirement',          NULL),
    (2, 'Needs improvement',  'Needs improvement feedback rating',   NULL),
    (1, 'Unsatisfactory',     'Unsatisfactory feedback rating',      NULL)
ON DUPLICATE KEY UPDATE
                     description = VALUES(description),
                     performance_level = VALUES(performance_level),
                     promotion_eligibility = NULL;

INSERT INTO rating_score (score_range, description_id, explanation)
SELECT '86-100', rs.id,
       '360 feedback score band only. Overall promotion or salary increment decisions must combine KPI, appraisal, and feedback scores in the performance engine.'
FROM rating_scales rs
WHERE rs.scales = 5
ON DUPLICATE KEY UPDATE
                     description_id = VALUES(description_id),
                     explanation = VALUES(explanation);

INSERT INTO rating_score (score_range, description_id, explanation)
SELECT '71-85', rs.id,
       '360 feedback score band only. Overall promotion or salary increment decisions must combine KPI, appraisal, and feedback scores in the performance engine.'
FROM rating_scales rs
WHERE rs.scales = 4
ON DUPLICATE KEY UPDATE
                     description_id = VALUES(description_id),
                     explanation = VALUES(explanation);

INSERT INTO rating_score (score_range, description_id, explanation)
SELECT '60-70', rs.id,
       '360 feedback score band only. Overall promotion or salary increment decisions must combine KPI, appraisal, and feedback scores in the performance engine.'
FROM rating_scales rs
WHERE rs.scales = 3
ON DUPLICATE KEY UPDATE
                     description_id = VALUES(description_id),
                     explanation = VALUES(explanation);

INSERT INTO rating_score (score_range, description_id, explanation)
SELECT '40-59', rs.id,
       '360 feedback score band only. Overall promotion or salary increment decisions must combine KPI, appraisal, and feedback scores in the performance engine.'
FROM rating_scales rs
WHERE rs.scales = 2
ON DUPLICATE KEY UPDATE
                     description_id = VALUES(description_id),
                     explanation = VALUES(explanation);

INSERT INTO rating_score (score_range, description_id, explanation)
SELECT '00-39', rs.id,
       '360 feedback score band only. Overall promotion or salary increment decisions must combine KPI, appraisal, and feedback scores in the performance engine.'
FROM rating_scales rs
WHERE rs.scales = 1
ON DUPLICATE KEY UPDATE
                     description_id = VALUES(description_id),
                     explanation = VALUES(explanation);

COMMIT;
