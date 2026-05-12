package com.epms.dto;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;

@Value
@Builder
public class FeedbackQuestionRuleResponse {
    Long id;
    Long questionBankId;
    Long questionVersionId;
    String questionCode;
    String competencyCode;
    String questionText;
    String responseType;
    String scoringBehavior;
    String questionStatus;
    Boolean effectiveActive;
    Integer targetLevelMinRank;
    Integer targetLevelMaxRank;
    Long targetPositionId;
    Long targetDepartmentId;
    String evaluatorRelationshipType;
    String sectionCode;
    String sectionTitle;
    Integer sectionOrder;
    Integer displayOrder;
    Boolean required;
    Double weight;
    Integer rulePriority;
    Boolean active;
    LocalDateTime updatedAt;
}
