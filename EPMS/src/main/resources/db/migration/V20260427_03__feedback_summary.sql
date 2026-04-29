CREATE TABLE IF NOT EXISTS feedback_summary (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    campaign_id BIGINT NOT NULL,
    target_employee_id BIGINT NOT NULL,
    average_score DOUBLE NOT NULL,
    total_responses BIGINT NOT NULL,
    manager_responses BIGINT NOT NULL,
    peer_responses BIGINT NOT NULL,
    subordinate_responses BIGINT NOT NULL,
    summarized_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uk_feedback_summary_campaign_target UNIQUE (campaign_id, target_employee_id)
);

CREATE INDEX idx_feedback_summary_campaign ON feedback_summary (campaign_id);
CREATE INDEX idx_feedback_summary_target ON feedback_summary (target_employee_id);
