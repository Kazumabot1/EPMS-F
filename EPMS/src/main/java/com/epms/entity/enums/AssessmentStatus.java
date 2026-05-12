package com.epms.entity.enums;

public enum AssessmentStatus {
    DRAFT,

    /*
     * Legacy statuses.
     * Keep these because old submitted/rejected records may already exist
     * in the database.
     */
    SUBMITTED,
    REJECTED,

    /*
     * New self-assessment approval workflow.
     */
    PENDING_MANAGER,
    PENDING_DEPARTMENT_HEAD,
    PENDING_HR,

    APPROVED,
    DECLINED
}