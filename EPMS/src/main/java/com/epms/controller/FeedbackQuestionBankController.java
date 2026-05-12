package com.epms.controller;

import com.epms.dto.FeedbackDynamicFormPreviewResponse;
import com.epms.dto.FeedbackQuestionBankResponse;
import com.epms.dto.FeedbackQuestionBankUpsertRequest;
import com.epms.dto.FeedbackQuestionRuleResponse;
import com.epms.dto.FeedbackQuestionRuleUpsertRequest;
import com.epms.dto.GenericApiResponse;
import com.epms.exception.UnauthorizedActionException;
import com.epms.security.SecurityUtils;
import com.epms.service.FeedbackQuestionBankService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/api/v1/feedback/question-bank")
@RequiredArgsConstructor
public class FeedbackQuestionBankController {

    private final FeedbackQuestionBankService questionBankService;

    @GetMapping("/questions")
    public ResponseEntity<GenericApiResponse<List<FeedbackQuestionBankResponse>>> getQuestions() {
        ensureHrOrAdmin();
        return ResponseEntity.ok(GenericApiResponse.success(
                "Question bank retrieved successfully",
                questionBankService.getQuestions()
        ));
    }

    @PostMapping("/questions")
    public ResponseEntity<GenericApiResponse<FeedbackQuestionBankResponse>> createQuestion(
            @Valid @RequestBody FeedbackQuestionBankUpsertRequest request
    ) {
        ensureHrOrAdmin();
        FeedbackQuestionBankResponse response = questionBankService.createQuestion(
                request,
                SecurityUtils.currentUserId().longValue()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(GenericApiResponse.success(
                "Question created successfully",
                response
        ));
    }

    @PutMapping("/questions/{questionId}")
    public ResponseEntity<GenericApiResponse<FeedbackQuestionBankResponse>> updateQuestion(
            @PathVariable Long questionId,
            @Valid @RequestBody FeedbackQuestionBankUpsertRequest request
    ) {
        ensureHrOrAdmin();
        return ResponseEntity.ok(GenericApiResponse.success(
                "Question updated successfully",
                questionBankService.updateQuestion(questionId, request)
        ));
    }

    @GetMapping("/rules")
    public ResponseEntity<GenericApiResponse<List<FeedbackQuestionRuleResponse>>> getRules() {
        ensureHrOrAdmin();
        return ResponseEntity.ok(GenericApiResponse.success(
                "Question applicability rules retrieved successfully",
                questionBankService.getRules()
        ));
    }

    @PostMapping("/rules")
    public ResponseEntity<GenericApiResponse<List<FeedbackQuestionRuleResponse>>> createRule(
            @Valid @RequestBody FeedbackQuestionRuleUpsertRequest request
    ) {
        ensureHrOrAdmin();
        List<FeedbackQuestionRuleResponse> createdRules = questionBankService.createRule(request);
        String message = createdRules.size() == 1
                ? "Question applicability rule created successfully"
                : "Question applicability rules created successfully";
        return ResponseEntity.status(HttpStatus.CREATED).body(GenericApiResponse.success(
                message,
                createdRules
        ));
    }

    @PutMapping("/rules/{ruleId}")
    public ResponseEntity<GenericApiResponse<FeedbackQuestionRuleResponse>> updateRule(
            @PathVariable Long ruleId,
            @Valid @RequestBody FeedbackQuestionRuleUpsertRequest request
    ) {
        ensureHrOrAdmin();
        return ResponseEntity.ok(GenericApiResponse.success(
                "Question applicability rule updated successfully",
                questionBankService.updateRule(ruleId, request)
        ));
    }

    @DeleteMapping("/rules/{ruleId}")
    public ResponseEntity<GenericApiResponse<Void>> deactivateRule(@PathVariable Long ruleId) {
        ensureHrOrAdmin();
        questionBankService.deactivateRule(ruleId);
        return ResponseEntity.ok(GenericApiResponse.<Void>success("Question applicability rule deactivated successfully", null));
    }



    @PatchMapping("/rules/{ruleId}/activate")
    public ResponseEntity<GenericApiResponse<FeedbackQuestionRuleResponse>> activateRule(@PathVariable Long ruleId) {
        ensureHrOrAdmin();
        return ResponseEntity.ok(GenericApiResponse.success(
                "Question applicability rule activated successfully",
                questionBankService.activateRule(ruleId)
        ));
    }

    @GetMapping("/preview")
    public ResponseEntity<GenericApiResponse<FeedbackDynamicFormPreviewResponse>> previewDynamicForm(
            @RequestParam(defaultValue = "L06") String levelCode,
            @RequestParam(defaultValue = "PEER") String relationshipType,
            @RequestParam(required = false) Long targetPositionId,
            @RequestParam(required = false) Long targetDepartmentId
    ) {
        ensureHrOrAdmin();
        return ResponseEntity.ok(GenericApiResponse.success(
                "Dynamic form preview generated successfully",
                questionBankService.previewDynamicForm(levelCode, relationshipType, targetPositionId, targetDepartmentId)
        ));
    }

    private void ensureHrOrAdmin() {
        List<String> roles = SecurityUtils.currentUser().getRoles();
        boolean authorized = roles != null && roles.stream()
                .filter(role -> role != null && !role.isBlank())
                .map(this::normalizeRole)
                .anyMatch(role -> role.equals("HR")
                        || role.equals("ADMIN")
                        || role.equals("HR_ADMIN")
                        || role.equals("HUMAN_RESOURCES")
                        || role.equals("HUMAN_RESOURCE")
                        || role.equals("HR_MANAGER")
                        || role.equals("SUPER_ADMIN"));
        if (!authorized) {
            throw new UnauthorizedActionException("Only HR/Admin can manage dynamic feedback questions.");
        }
    }

    private String normalizeRole(String role) {
        return role
                .replaceFirst("(?i)^ROLE_", "")
                .trim()
                .replaceAll("[^A-Za-z0-9]+", "_")
                .replaceAll("^_+|_+$", "")
                .toUpperCase(Locale.ROOT);
    }
}
