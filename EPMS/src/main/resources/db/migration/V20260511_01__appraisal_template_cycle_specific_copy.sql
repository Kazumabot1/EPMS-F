ALTER TABLE appraisal_form_template
    ADD COLUMN cycle_specific_copy BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE appraisal_form_template
SET cycle_specific_copy = TRUE
WHERE cycle_specific_copy = FALSE
  AND template_name LIKE '% Template Copy %'
  AND description LIKE 'Reusable copy created from %';

UPDATE appraisal_form_template
SET cycle_specific_copy = TRUE
WHERE cycle_specific_copy = FALSE
  AND description LIKE 'Internal cycle-only copy created from %';
