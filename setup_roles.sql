-- ============================================================
-- EPMS Role Setup SQL — Run once on your MySQL database
-- Modified by KHN
-- ============================================================

-- Step 1: Rename ROLE_STAFF → ROLE_EMPLOYEE
UPDATE roles SET name = 'ROLE_EMPLOYEE', description = 'Regular employee access'
WHERE name = 'ROLE_STAFF';

-- Step 2: Add new roles (CEO, Department Head, Project Manager)
INSERT INTO roles (name, description) VALUES
('ROLE_CEO',              'Full view access - executive level'),
('ROLE_DEPARTMENT_HEAD',  'Department-scoped view access'),
('ROLE_PROJECT_MANAGER',  'Project and team management access')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- Step 3: Verify all 6 roles exist
SELECT id, name, description FROM roles ORDER BY id;

-- Expected result:
-- 1 | ROLE_ADMIN           | Full system access
-- 2 | ROLE_HR              | HR department access
-- 3 | ROLE_MANAGER         | Team leader / manager access
-- 4 | ROLE_EMPLOYEE        | Regular employee access  ← was ROLE_STAFF
-- 5 | ROLE_CEO             | Full view access - executive level
-- 6 | ROLE_DEPARTMENT_HEAD | Department-scoped view access
-- 7 | ROLE_PROJECT_MANAGER | Project and team management access
