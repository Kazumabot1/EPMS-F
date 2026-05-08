-- One-time cleanup for the removed Appraisal Template soft-delete feature.
-- Run this if a previous local schema contains appraisal_form_template.deleted
-- or appraisal_form_template.deleted_at. These columns are no longer used.

SET @current_schema := DATABASE();

SET @drop_deleted_sql := (
    SELECT IF(
        COUNT(*) > 0,
        'ALTER TABLE appraisal_form_template DROP COLUMN deleted',
        'SELECT ''appraisal_form_template.deleted already removed'' AS message'
    )
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @current_schema
      AND TABLE_NAME = 'appraisal_form_template'
      AND COLUMN_NAME = 'deleted'
);
PREPARE drop_deleted_stmt FROM @drop_deleted_sql;
EXECUTE drop_deleted_stmt;
DEALLOCATE PREPARE drop_deleted_stmt;

SET @drop_deleted_at_sql := (
    SELECT IF(
        COUNT(*) > 0,
        'ALTER TABLE appraisal_form_template DROP COLUMN deleted_at',
        'SELECT ''appraisal_form_template.deleted_at already removed'' AS message'
    )
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @current_schema
      AND TABLE_NAME = 'appraisal_form_template'
      AND COLUMN_NAME = 'deleted_at'
);
PREPARE drop_deleted_at_stmt FROM @drop_deleted_at_sql;
EXECUTE drop_deleted_at_stmt;
DEALLOCATE PREPARE drop_deleted_at_stmt;
