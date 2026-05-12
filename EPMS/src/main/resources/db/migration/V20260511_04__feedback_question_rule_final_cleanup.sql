-- Final cleanup for the dynamic question-rule workspace.
-- The HR-facing rule editor no longer supports ANY / all-role rules.
-- Existing broad ANY rules are split into one row per supported evaluator role,
-- then the legacy ANY rows are deactivated so they no longer affect preview or future campaigns.

INSERT INTO feedback_question_applicability_rules (
    question_version_id,
    target_level_min_rank,
    target_level_max_rank,
    target_position_id,
    target_department_id,
    evaluator_relationship_type,
    section_code,
    section_title,
    section_order,
    display_order,
    required_override,
    weight_override,
    rule_priority,
    active,
    valid_from,
    valid_to,
    condition_json
)
SELECT
    r.question_version_id,
    r.target_level_min_rank,
    r.target_level_max_rank,
    r.target_position_id,
    r.target_department_id,
    roles.relationship_type,
    r.section_code,
    r.section_title,
    r.section_order,
    r.display_order,
    r.required_override,
    r.weight_override,
    r.rule_priority,
    r.active,
    r.valid_from,
    r.valid_to,
    r.condition_json
FROM feedback_question_applicability_rules r
         CROSS JOIN (
    SELECT 'MANAGER' AS relationship_type UNION ALL
    SELECT 'PEER' UNION ALL
    SELECT 'SUBORDINATE' UNION ALL
    SELECT 'SELF'
) roles
WHERE r.evaluator_relationship_type = 'ANY'
  AND NOT EXISTS (
    SELECT 1
    FROM feedback_question_applicability_rules existing
    WHERE existing.active = TRUE
      AND existing.question_version_id = r.question_version_id
      AND existing.target_level_min_rank = r.target_level_min_rank
      AND existing.target_level_max_rank = r.target_level_max_rank
      AND existing.evaluator_relationship_type = roles.relationship_type
      AND existing.section_code = r.section_code
      AND existing.display_order = r.display_order
      AND ((existing.target_position_id IS NULL AND r.target_position_id IS NULL) OR existing.target_position_id = r.target_position_id)
      AND ((existing.target_department_id IS NULL AND r.target_department_id IS NULL) OR existing.target_department_id = r.target_department_id)
);

UPDATE feedback_question_applicability_rules
SET active = FALSE
WHERE evaluator_relationship_type = 'ANY';
