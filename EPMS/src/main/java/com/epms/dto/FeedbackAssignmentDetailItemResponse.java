package com.epms.dto;

import com.epms.entity.enums.AssignmentStatus;
import com.epms.entity.enums.EvaluatorSelectionMethod;
import com.epms.entity.enums.FeedbackRelationshipType;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class FeedbackAssignmentDetailItemResponse {
    Long assignmentId;
    Long requestId;
    Long targetEmployeeId;
    String targetEmployeeName;
    Long evaluatorEmployeeId;
    String evaluatorEmployeeName;
    FeedbackRelationshipType relationshipType;
    EvaluatorSelectionMethod selectionMethod;
    AssignmentStatus status;
    Boolean anonymous;
}
