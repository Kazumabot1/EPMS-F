-- 360 Feedback module boundary cleanup.
-- These columns already exist in newer schemas from V20260503_01. Keep this file focused on
-- removing promotion/salary decision meaning from feedback rating rows.
-- Feedback summaries remain feedback-only integration outputs for KPI/Appraisal teammates.

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
