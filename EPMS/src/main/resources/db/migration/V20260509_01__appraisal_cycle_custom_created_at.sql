-- Appraisal cycle UI now supports annual, semi-annual, and custom cycles.
-- The JPA entity stores enum values as strings, so CUSTOM works for varchar columns.
-- This migration only removes the old generated uniqueness constraint when it exists;
-- created_at already exists in the JPA entity but is added defensively for local databases.

SET @schema_name := DATABASE();

SET @drop_cycle_unique_sql := (
    SELECT IF(
        COUNT(*) > 0,
        'ALTER TABLE appraisal_cycle DROP INDEX uk_appraisal_cycle_type_year_period',
        'SELECT ''uk_appraisal_cycle_type_year_period does not exist'' AS message'
    )
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = @schema_name
      AND TABLE_NAME = 'appraisal_cycle'
      AND INDEX_NAME = 'uk_appraisal_cycle_type_year_period'
);
PREPARE drop_cycle_unique_stmt FROM @drop_cycle_unique_sql;
EXECUTE drop_cycle_unique_stmt;
DEALLOCATE PREPARE drop_cycle_unique_stmt;

SET @add_cycle_created_at_sql := (
    SELECT IF(
        COUNT(*) = 0,
        'ALTER TABLE appraisal_cycle ADD COLUMN created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)',
        'SELECT ''appraisal_cycle.created_at already exists'' AS message'
    )
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @schema_name
      AND TABLE_NAME = 'appraisal_cycle'
      AND COLUMN_NAME = 'created_at'
);
PREPARE add_cycle_created_at_stmt FROM @add_cycle_created_at_sql;
EXECUTE add_cycle_created_at_stmt;
DEALLOCATE PREPARE add_cycle_created_at_stmt;
