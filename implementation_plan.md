# Self-Assessment Form Workflow — Full Fix

## Background

The backend workflow is **fully implemented** and correct:

```
DRAFT → (employee submits) → PENDING_MANAGER
      → (manager signs)    → PENDING_DEPARTMENT_HEAD
      → (dept head signs)  → PENDING_HR
      → (HR approves)      → APPROVED   (immutable / "SUBMITTED" shown to employee)
      → (HR declines)      → DECLINED
```

- **Date-gating** is enforced: employees can only fill/submit during the form's `startDate`–`endDate` window.
- **All 4 signatures** (employee, manager, dept-head, HR) are stored in `EmployeeAssessment`.
- **Visibility** is gated: employee sees own, manager sees their team's, dept-head sees department's, HR sees all.

The **frontend has not been wired up** to match any of this. The problems are listed below.

---

## Bugs Found

### Bug 1 — Employee page uses wrong "locked" check
`EmployeeSelfAssessmentPage.tsx` line 404:
```ts
const isSubmitted = assessment.status === 'SUBMITTED'; // ← legacy only!
```
This must be `isLocked` and must include ALL non-editable statuses:
`SUBMITTED | PENDING_MANAGER | PENDING_DEPARTMENT_HEAD | PENDING_HR | APPROVED | DECLINED`

### Bug 2 — Employee page shows no status-context banners
Only one generic "Submitted" banner is shown. Employee needs to see exactly where the form is in the workflow (e.g. *"Waiting for manager's signature"*, *"Approved ✓"*, *"Declined — reason: …"*).

### Bug 3 — Employee page shows empty signature placeholders
The signature grid only has two empty placeholders — it never renders the actual collected signatures (manager, dept-head, HR).

### Bug 4 — HR detail modal shows no signatures, no approve/decline
`AssessmentScoreTablePage.tsx` → `AssessmentDetailModal`: signature area is just placeholder text. No HR approve / decline buttons. Status filter missing PENDING_* and DECLINED options.

### Bug 5 — Manager has no assessment review interface
`ManagerDashboard.tsx` is an unimplemented stub. There is **no page** where the manager can see `PENDING_MANAGER` assessments and sign them.

### Bug 6 — Dept Head can't sign from the detail modal
Dept Head accesses `AssessmentScoreTablePage` but the modal has no "Sign" button for `PENDING_DEPARTMENT_HEAD` assessments.

### Bug 7 — Service layer missing API methods
`employeeAssessmentService.ts` has no `managerSign`, `departmentHeadSign`, `hrApprove`, `hrDecline` methods. Also `normalizeAssessment` doesn't map manager/dept-head/HR signature fields.

---

## Proposed Changes

### Frontend — `src/services/employeeAssessmentService.ts`

#### [MODIFY] [employeeAssessmentService.ts](file:///C:/Users/User%20X/IdeaProjects/EPMS/frontend/src/services/employeeAssessmentService.ts)
- Fix `normalizeAssessment` to map all manager/dept-head/HR signature fields (`managerSignatureImageData`, `managerSignedAt`, `departmentHeadSignature*`, `hrSignature*`, `approvedAt`, `declinedAt`).
- Add `getById(id)` alias (already exists — confirm).
- Add:
  - `managerSign(id, comment?)` → `POST /employee-assessments/{id}/manager-sign`
  - `departmentHeadSign(id)` → `POST /employee-assessments/{id}/department-head-sign`
  - `hrApprove(id, comment?)` → `POST /employee-assessments/{id}/hr-approve`
  - `hrDecline(id, reason, comment?)` → `POST /employee-assessments/{id}/hr-decline`

---

### Frontend — Employee Self-Assessment Page

#### [MODIFY] [EmployeeSelfAssessmentPage.tsx](file:///C:/Users/User%20X/IdeaProjects/EPMS/frontend/src/pages/employee/EmployeeSelfAssessmentPage.tsx)

- Replace `isSubmitted` with `isLocked` that covers all non-DRAFT statuses.
- Add a **workflow status banner** at the top of the form showing the current stage with color-coded context:
  - 🟡 `PENDING_MANAGER` → "Waiting for your manager's signature"
  - 🟠 `PENDING_DEPARTMENT_HEAD` → "Manager signed. Waiting for department head"
  - 🔵 `PENDING_HR` → "All signatures collected. Awaiting HR approval"
  - ✅ `APPROVED` → "This assessment has been approved and is now final"
  - ❌ `DECLINED` → "Declined by HR — *reason shown here*"
- Add a **full signature grid** at the bottom showing all 4 signature slots with actual images when collected (employee, manager, dept-head, HR) including signed-by name and date.
- Show `hrComment`, `managerComment`, `declineReason` in read-only review blocks.
- Keep form inputs **fully disabled** for all `isLocked` statuses.

---

### Frontend — HR Assessment Score Table Page

#### [MODIFY] [AssessmentScoreTablePage.tsx](file:///C:/Users/User%20X/IdeaProjects/EPMS/frontend/src/pages/hr/AssessmentScoreTablePage.tsx)

- Fix `AssessmentDetailModal` to render **all 4 signature images** (employee, manager, dept-head, HR) with name and date.
- Add **HR Approve / HR Decline** action buttons visible when `status === 'PENDING_HR'` (inside the detail modal):
  - Approve: optional comment textarea + green confirm button
  - Decline: required reason textarea + optional comment + red decline button
- Add all new statuses to the status filter dropdown: `PENDING_MANAGER`, `PENDING_DEPARTMENT_HEAD`, `PENDING_HR`, `DECLINED`.
- Show `managerComment`, `hrComment`, `declineReason` in the detail modal.
- Show signature status indicator badges in the score table rows (✓ employee signed, ✓ manager signed, etc.).
- After HR action, reload the score table.

---

### Frontend — NEW Manager Assessment Review Page

#### [NEW] [ManagerAssessmentReviewPage.tsx](file:///C:/Users/User%20X/IdeaProjects/EPMS/frontend/src/pages/manager/ManagerAssessmentReviewPage.tsx)

- Fetches `GET /employee-assessments/score-table` (backend filters by manager for MANAGER role).
- Lists all assessments assigned to the current manager.
- **Review/Sign modal**:
  - Shows employee full assessment (read-only form with answers).
  - Shows employee signature image.
  - Has an optional comment field.
  - Has a **"Sign & Forward to Dept Head"** button → calls `managerSign(id, comment)`.
  - Shows an informational note if status is not `PENDING_MANAGER`.
- After signing, reloads the list.

---

### Frontend — Dept Head Signing (in existing score table page)

#### [MODIFY] [AssessmentScoreTablePage.tsx](file:///C:/Users/User%20X/IdeaProjects/EPMS/frontend/src/pages/hr/AssessmentScoreTablePage.tsx) *(same file as HR fix above)*

- The detail modal already renders for dept-head via `/department-head/assessment-scores`.
- Add a **"Sign & Forward to HR"** button visible when `status === 'PENDING_DEPARTMENT_HEAD'` (controlled by the current user's role — detect via `authStorage.getUser().roles`).
- After dept-head signing, reload the list.

---

### Frontend — Routing

#### [MODIFY] [App.tsx](file:///C:/Users/User%20X/IdeaProjects/EPMS/frontend/src/App.tsx)

- Add route under Manager section: `/manager/assessment-review` → `<ManagerAssessmentReviewPage />`

---

## Verification Plan

### Automated checks
- Build frontend: `npm run build` in `frontend/` — zero TypeScript errors.
- Build backend: `./mvnw compile` in `EPMS/` — zero errors.

### Manual flow test (browser)

| Step | Actor | Action | Expected |
|------|-------|--------|---------|
| 1 | HR | Create form with active dates | Form appears in form builder |
| 2 | Employee | Go to `/employee/self-assessment` | Form loads with DRAFT status, editable |
| 3 | Employee | Fill form + sign + submit | Status → `PENDING_MANAGER`; form locked with yellow banner |
| 4 | Manager | Go to `/manager/assessment-review` | Employee's assessment listed |
| 5 | Manager | Open detail, add comment, click Sign | Status → `PENDING_DEPARTMENT_HEAD` |
| 6 | Employee | Reload page | Orange banner "Waiting for dept head" + manager signature visible |
| 7 | DeptHead | Go to `/department-head/assessment-scores`, open detail | "Sign & Forward to HR" button visible |
| 8 | DeptHead | Click Sign | Status → `PENDING_HR` |
| 9 | HR | Open detail at `/hr/assessment-scores` | Approve/Decline buttons visible, all 3 signatures shown |
| 10 | HR | Click Approve (with comment) | Status → `APPROVED` |
| 11 | Employee | Reload form | Green "Approved" banner; all 4 signatures visible; no edit buttons |
| 12 | HR | Try to edit/decline APPROVED assessment | Backend rejects with 400 |
| 13 | HR | Test DECLINED flow | Employee sees red banner + decline reason |
| 14 | Date test | Outside form date window | Employee sees "form not yet open" or "period ended" error |

---

## Open Questions

> [!NOTE]
> **Dept Head sign — does the form also need to capture a dept-head comment?**
> Currently the backend `departmentHeadSign` doesn't persist a comment. If you want one, I'll add a `deptHeadComment` field. Let me know.

> [!NOTE]
> **Manager review page — full form or just a summary?**
> The plan shows a full read-only form with answers. If you only want a summary card with a sign button (simpler), let me know.

> [!IMPORTANT]
> **Role detection for dept-head "Sign" button in the shared modal:**
> The `AssessmentScoreTablePage` is used by both HR and DeptHead. The sign button will be shown based on the logged-in user's role from `authStorage.getUser()`. Confirm this is acceptable, or should we create separate pages for HR and DeptHead?
