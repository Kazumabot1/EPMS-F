-- Links KPI-related notifications to kpi_form.id for deep-linking in the UI.
ALTER TABLE notifications ADD COLUMN reference_id INTEGER NULL;
