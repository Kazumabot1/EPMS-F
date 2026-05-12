-- Simplify HR question-bank status values for the dynamic 360 workspace.
-- Existing draft/archived question-bank rows become INACTIVE. Campaign snapshots remain unchanged.
UPDATE feedback_question_bank
SET status = 'INACTIVE'
WHERE status IN ('DRAFT', 'ARCHIVED');
