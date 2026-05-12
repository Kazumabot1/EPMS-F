package com.epms.service.impl;

import com.epms.dto.FeedbackAssignmentQuestionDetailResponse;
import com.epms.dto.FeedbackAssignmentSectionDetailResponse;
import com.epms.dto.FeedbackDynamicFormPreviewResponse;
import com.epms.dto.FeedbackQuestionBankResponse;
import com.epms.dto.FeedbackQuestionBankUpsertRequest;
import com.epms.dto.FeedbackQuestionRuleResponse;
import com.epms.dto.FeedbackQuestionRuleUpsertRequest;
import com.epms.entity.FeedbackQuestionApplicabilityRule;
import com.epms.entity.FeedbackQuestionBank;
import com.epms.entity.FeedbackQuestionVersion;
import com.epms.exception.BadRequestException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.FeedbackQuestionApplicabilityRuleRepository;
import com.epms.repository.FeedbackQuestionBankRepository;
import com.epms.repository.FeedbackQuestionVersionRepository;
import com.epms.service.FeedbackQuestionBankService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class FeedbackQuestionBankServiceImpl implements FeedbackQuestionBankService {

    private static final String DEFAULT_RESPONSE_TYPE = "RATING_WITH_COMMENT";
    private static final String RESPONSE_RATING_WITH_COMMENT = "RATING_WITH_COMMENT";
    private static final String RESPONSE_RATING = "RATING";
    private static final String RESPONSE_TEXT = "TEXT";
    private static final String RESPONSE_YES_NO = "YES_NO";

    private static final String SCORING_SCORED = "SCORED";
    private static final String SCORING_NON_SCORED = "NON_SCORED";
    private static final String SCORING_HR_REVIEW = "HR_REVIEW";

    private static final Set<String> SUPPORTED_STATUSES = Set.of("ACTIVE", "INACTIVE", "DRAFT", "ARCHIVED");
    private static final Set<String> SUPPORTED_RULE_RELATIONSHIPS = Set.of("MANAGER", "PEER", "SUBORDINATE", "SELF");

    private static final Map<String, String> COMPETENCY_CODE_PREFIXES = Map.ofEntries(
            Map.entry("COMMUNICATION", "COMM"),
            Map.entry("TEAMWORK", "TEAM"),
            Map.entry("LEADERSHIP", "LEAD"),
            Map.entry("TECHNICAL_SKILL", "TECH"),
            Map.entry("WORK_QUALITY", "WORK"),
            Map.entry("ACCOUNTABILITY", "ACCT"),
            Map.entry("PROBLEM_SOLVING", "PROB"),
            Map.entry("LEARNING_IMPROVEMENT", "LEARN"),
            Map.entry("PROFESSIONALISM", "PROF"),
            Map.entry("ATTENDANCE_RELIABILITY", "RELY"),
            Map.entry("RELIABILITY", "RELY"),
            Map.entry("COMPLIANCE_SAFETY", "SAFE"),
            Map.entry("RESULTS_ORIENTATION", "RESULT"),
            Map.entry("COACHING", "COACH"),
            Map.entry("ADAPTABILITY", "ADAPT")
    );

    private final FeedbackQuestionBankRepository questionBankRepository;
    private final FeedbackQuestionVersionRepository questionVersionRepository;
    private final FeedbackQuestionApplicabilityRuleRepository ruleRepository;

    @Override
    @Transactional(readOnly = true)
    public List<FeedbackQuestionBankResponse> getQuestions() {
        Map<Long, FeedbackQuestionBank> byId = new LinkedHashMap<>();
        for (FeedbackQuestionBank question : questionBankRepository.findAllWithVersions()) {
            if (question != null && question.getId() != null) {
                byId.putIfAbsent(question.getId(), question);
            }
        }
        return byId.values().stream()
                .map(this::toQuestionResponse)
                .toList();
    }

    @Override
    @Transactional
    public FeedbackQuestionBankResponse createQuestion(FeedbackQuestionBankUpsertRequest request, Long actorUserId) {
        String questionCode = resolveQuestionCodeForCreate(request);
        if (questionBankRepository.existsByQuestionCodeIgnoreCase(questionCode)) {
            throw new BadRequestException("A feedback question with code " + questionCode + " already exists.");
        }

        FeedbackQuestionBank bank = new FeedbackQuestionBank();
        bank.setQuestionCode(questionCode);
        applyQuestionDefaults(bank, request);
        bank.setCreatedByUserId(actorUserId == null ? 0L : actorUserId);
        FeedbackQuestionBank savedBank = questionBankRepository.save(bank);

        FeedbackQuestionVersion version = new FeedbackQuestionVersion();
        version.setQuestionBank(savedBank);
        version.setVersionNumber(1);
        applyVersionFields(version, request);
        questionVersionRepository.save(version);

        return toQuestionResponse(savedBank);
    }

    @Override
    @Transactional
    public FeedbackQuestionBankResponse updateQuestion(Long questionId, FeedbackQuestionBankUpsertRequest request) {
        FeedbackQuestionBank bank = questionBankRepository.findById(questionId)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback question not found."));

        String newCode = request.getQuestionCode() == null || request.getQuestionCode().isBlank()
                ? bank.getQuestionCode()
                : normalizeCode(request.getQuestionCode(), "Question code is required.");
        questionBankRepository.findByQuestionCodeIgnoreCase(newCode)
                .filter(existing -> !Objects.equals(existing.getId(), bank.getId()))
                .ifPresent(existing -> {
                    throw new BadRequestException("A feedback question with code " + newCode + " already exists.");
                });

        bank.setQuestionCode(newCode);
        applyQuestionDefaults(bank, request);
        FeedbackQuestionBank savedBank = questionBankRepository.save(bank);

        FeedbackQuestionVersion activeVersion = questionVersionRepository
                .findTopByQuestionBank_IdAndActiveTrueOrderByVersionNumberDesc(savedBank.getId())
                .orElse(null);

        if (activeVersion == null) {
            FeedbackQuestionVersion newVersion = new FeedbackQuestionVersion();
            newVersion.setQuestionBank(savedBank);
            newVersion.setVersionNumber(Math.max(1, questionVersionRepository.findMaxVersionNumber(savedBank.getId()) + 1));
            applyVersionFields(newVersion, request);
            questionVersionRepository.save(newVersion);
        } else {
            // Keep question editing simple for HR: ordinary edits update the active version in place.
            // Historical campaign integrity is still protected by feedback_assignment_questions snapshots.
            applyVersionFields(activeVersion, request);
            questionVersionRepository.save(activeVersion);
        }

        return toQuestionResponse(savedBank);
    }

    @Override
    @Transactional(readOnly = true)
    public List<FeedbackQuestionRuleResponse> getRules() {
        return ruleRepository.findAllDetailed().stream()
                .map(this::toRuleResponse)
                .toList();
    }

    @Override
    @Transactional
    public List<FeedbackQuestionRuleResponse> createRule(FeedbackQuestionRuleUpsertRequest request) {
        List<String> relationshipTypes = resolveRelationshipTypes(request);
        FeedbackQuestionVersion version = questionVersionRepository.findById(request.getQuestionVersionId())
                .orElseThrow(() -> new ResourceNotFoundException("Question version not found."));
        Integer minRank = request.getTargetLevelMinRank() == null ? 1 : request.getTargetLevelMinRank();
        Integer maxRank = request.getTargetLevelMaxRank() == null ? 9 : request.getTargetLevelMaxRank();
        String sectionCode = normalizeCode(request.getSectionCode(), "Section code is required.");

        List<FeedbackQuestionRuleResponse> responses = new ArrayList<>();
        for (String relationshipType : relationshipTypes) {
            FeedbackQuestionApplicabilityRule rule = ruleRepository.findFirstInactiveDuplicateRule(
                    version.getId(),
                    minRank,
                    maxRank,
                    relationshipType,
                    sectionCode,
                    request.getTargetPositionId(),
                    request.getTargetDepartmentId()
            ).orElseGet(FeedbackQuestionApplicabilityRule::new);
            applyRuleFields(rule, request, relationshipType, rule.getId());
            responses.add(toRuleResponse(ruleRepository.save(rule)));
        }
        return responses;
    }

    @Override
    @Transactional
    public FeedbackQuestionRuleResponse updateRule(Long ruleId, FeedbackQuestionRuleUpsertRequest request) {
        FeedbackQuestionApplicabilityRule rule = ruleRepository.findById(ruleId)
                .orElseThrow(() -> new ResourceNotFoundException("Question applicability rule not found."));
        List<String> relationshipTypes = resolveRelationshipTypes(request);
        if (relationshipTypes.size() > 1) {
            throw new BadRequestException("Update one evaluator role at a time. Create new rules for additional roles.");
        }
        applyRuleFields(rule, request, relationshipTypes.get(0), ruleId);
        return toRuleResponse(ruleRepository.save(rule));
    }

    @Override
    @Transactional
    public void deactivateRule(Long ruleId) {
        FeedbackQuestionApplicabilityRule rule = ruleRepository.findById(ruleId)
                .orElseThrow(() -> new ResourceNotFoundException("Question applicability rule not found."));
        rule.setActive(false);
        ruleRepository.save(rule);
    }

    @Override
    @Transactional
    public FeedbackQuestionRuleResponse activateRule(Long ruleId) {
        FeedbackQuestionApplicabilityRule rule = ruleRepository.findById(ruleId)
                .orElseThrow(() -> new ResourceNotFoundException("Question applicability rule not found."));
        if (!SUPPORTED_RULE_RELATIONSHIPS.contains(rule.getEvaluatorRelationshipType())) {
            throw new BadRequestException("Legacy all-role rules cannot be reactivated. Create role-specific rules instead.");
        }
        validateDuplicateRule(
                rule.getQuestionVersion() == null ? null : rule.getQuestionVersion().getId(),
                rule.getTargetLevelMinRank(),
                rule.getTargetLevelMaxRank(),
                rule.getEvaluatorRelationshipType(),
                rule.getSectionCode(),
                rule.getTargetPositionId(),
                rule.getTargetDepartmentId(),
                rule.getId(),
                true
        );
        rule.setActive(true);
        return toRuleResponse(ruleRepository.save(rule));
    }

    @Override
    @Transactional(readOnly = true)
    public FeedbackDynamicFormPreviewResponse previewDynamicForm(
            String levelCode,
            String relationshipType,
            Long targetPositionId,
            Long targetDepartmentId
    ) {
        int levelRank = parseLevelRank(levelCode);
        String normalizedRelationship = normalizeRelationship(relationshipType);
        List<FeedbackQuestionApplicabilityRule> rules = ruleRepository.findApplicableRules(
                levelRank,
                targetPositionId,
                targetDepartmentId,
                normalizedRelationship,
                LocalDate.now()
        );

        Map<String, FeedbackAssignmentQuestionDetailResponse> questionsByCode = new LinkedHashMap<>();
        Map<String, SectionBucket> sectionsByCode = new LinkedHashMap<>();

        for (FeedbackQuestionApplicabilityRule rule : rules) {
            FeedbackQuestionVersion version = rule.getQuestionVersion();
            if (version == null || version.getQuestionBank() == null) {
                continue;
            }
            FeedbackQuestionBank bank = version.getQuestionBank();
            String questionCode = firstNonBlank(bank.getQuestionCode(), "BANK-Q-" + version.getId());
            if (questionsByCode.containsKey(questionCode)) {
                continue;
            }
            String sectionCode = firstNonBlank(rule.getSectionCode(), "GENERAL");
            SectionBucket bucket = sectionsByCode.computeIfAbsent(sectionCode, ignored -> new SectionBucket(
                    sectionCode,
                    firstNonBlank(rule.getSectionTitle(), "General Feedback"),
                    rule.getSectionOrder() == null ? 1 : rule.getSectionOrder()
            ));
            String responseType = normalizeResponseType(firstNonBlank(version.getResponseType(), bank.getDefaultResponseType(), DEFAULT_RESPONSE_TYPE));
            String scoringBehavior = resolveStoredScoringBehavior(version, bank, responseType);
            FeedbackAssignmentQuestionDetailResponse question = FeedbackAssignmentQuestionDetailResponse.builder()
                    .id(version.getId())
                    .assignmentQuestionId(null)
                    .sourceQuestionId(null)
                    .questionCode(questionCode)
                    .competencyCode(bank.getCompetencyCode())
                    .responseType(responseType)
                    .scoringBehavior(scoringBehavior)
                    .questionText(firstNonBlank(version.getQuestionText(), bank.getDefaultText()))
                    .questionOrder(rule.getDisplayOrder() == null ? bucket.questions.size() + 1 : rule.getDisplayOrder())
                    .ratingScaleId(isRatingResponseType(responseType) ? version.getRatingScaleId() != null ? version.getRatingScaleId() : bank.getDefaultRatingScaleId() : null)
                    .ratingScaleMin(isRatingResponseType(responseType) ? 1 : null)
                    .ratingScaleMax(isRatingResponseType(responseType) ? 5 : null)
                    .ratingOptions(List.of())
                    .weight(resolveEffectiveWeight(responseType, scoringBehavior, rule.getWeightOverride(), bank.getDefaultWeight()))
                    .required(rule.getRequiredOverride() != null ? rule.getRequiredOverride() : Boolean.TRUE.equals(bank.getDefaultRequired()))
                    .existingRatingValue(null)
                    .existingComment(null)
                    .build();
            questionsByCode.put(questionCode, question);
            bucket.questions.add(question);
        }

        List<FeedbackAssignmentSectionDetailResponse> sections = sectionsByCode.values().stream()
                .sorted(Comparator.comparingInt(bucket -> bucket.orderNo))
                .map(bucket -> FeedbackAssignmentSectionDetailResponse.builder()
                        .id(null)
                        .sectionCode(bucket.sectionCode)
                        .title(bucket.title)
                        .orderNo(bucket.orderNo)
                        .questions(bucket.questions.stream()
                                .sorted(Comparator.comparing(FeedbackAssignmentQuestionDetailResponse::getQuestionOrder, Comparator.nullsLast(Comparator.naturalOrder())))
                                .toList())
                        .build())
                .toList();

        return FeedbackDynamicFormPreviewResponse.builder()
                .levelCode(firstNonBlank(levelCode, "L" + String.format("%02d", levelRank)))
                .levelRank(levelRank)
                .relationshipType(normalizedRelationship)
                .targetPositionId(targetPositionId)
                .targetDepartmentId(targetDepartmentId)
                .totalQuestions(questionsByCode.size())
                .sections(sections)
                .build();
    }

    private void applyQuestionDefaults(FeedbackQuestionBank bank, FeedbackQuestionBankUpsertRequest request) {
        String responseType = normalizeResponseType(firstNonBlank(request.getResponseType(), DEFAULT_RESPONSE_TYPE));
        String scoringBehavior = normalizeScoringBehavior(request.getScoringBehavior(), responseType);
        bank.setCompetencyCode(normalizeCode(request.getCompetencyCode(), "Competency code is required."));
        bank.setDefaultText(requireText(request.getQuestionText(), "Question text is required."));
        bank.setDefaultResponseType(responseType);
        bank.setDefaultScoringBehavior(scoringBehavior);
        bank.setDefaultRatingScaleId(isRatingResponseType(responseType) ? request.getRatingScaleId() : null);
        bank.setDefaultWeight(resolveEffectiveWeight(responseType, scoringBehavior, request.getWeight(), 1.0));
        bank.setDefaultRequired(!Boolean.FALSE.equals(request.getRequired()));
        bank.setStatus(normalizeStatus(request.getStatus()));
    }

    private void applyVersionFields(FeedbackQuestionVersion version, FeedbackQuestionBankUpsertRequest request) {
        String responseType = normalizeResponseType(firstNonBlank(request.getResponseType(), DEFAULT_RESPONSE_TYPE));
        String scoringBehavior = normalizeScoringBehavior(request.getScoringBehavior(), responseType);
        version.setQuestionText(requireText(request.getQuestionText(), "Question text is required."));
        version.setResponseType(responseType);
        version.setScoringBehavior(scoringBehavior);
        version.setRatingScaleId(isRatingResponseType(responseType) ? request.getRatingScaleId() : null);
        version.setHelpText(request.getHelpText());
        version.setActive(true);
    }

    private void applyRuleFields(
            FeedbackQuestionApplicabilityRule rule,
            FeedbackQuestionRuleUpsertRequest request,
            String relationshipType,
            Long excludeRuleId
    ) {
        if (request.getTargetLevelMinRank() != null && request.getTargetLevelMaxRank() != null
                && request.getTargetLevelMinRank() > request.getTargetLevelMaxRank()) {
            throw new BadRequestException("Minimum level rank cannot be greater than maximum level rank.");
        }
        FeedbackQuestionVersion version = questionVersionRepository.findById(request.getQuestionVersionId())
                .orElseThrow(() -> new ResourceNotFoundException("Question version not found."));

        Integer minRank = request.getTargetLevelMinRank() == null ? 1 : request.getTargetLevelMinRank();
        Integer maxRank = request.getTargetLevelMaxRank() == null ? 9 : request.getTargetLevelMaxRank();
        String sectionCode = normalizeCode(request.getSectionCode(), "Section code is required.");
        boolean desiredActive = !Boolean.FALSE.equals(request.getActive());
        validateDuplicateRule(version.getId(), minRank, maxRank, relationshipType, sectionCode,
                request.getTargetPositionId(), request.getTargetDepartmentId(), excludeRuleId, desiredActive);

        String responseType = normalizeResponseType(version.getResponseType());
        String scoringBehavior = resolveStoredScoringBehavior(version, version.getQuestionBank(), responseType);

        rule.setQuestionVersion(version);
        rule.setTargetLevelMinRank(minRank);
        rule.setTargetLevelMaxRank(maxRank);
        rule.setTargetPositionId(request.getTargetPositionId());
        rule.setTargetDepartmentId(request.getTargetDepartmentId());
        rule.setEvaluatorRelationshipType(relationshipType);
        rule.setSectionCode(sectionCode);
        rule.setSectionTitle(requireText(request.getSectionTitle(), "Section title is required."));
        rule.setSectionOrder(request.getSectionOrder() == null ? 1 : request.getSectionOrder());
        rule.setDisplayOrder(request.getDisplayOrder() == null ? 1 : request.getDisplayOrder());
        rule.setRequiredOverride(request.getRequiredOverride());
        rule.setWeightOverride(isScored(responseType, scoringBehavior) ? request.getWeightOverride() : null);
        rule.setRulePriority(request.getRulePriority() == null ? 100 : request.getRulePriority());
        rule.setActive(desiredActive);
    }

    private FeedbackQuestionBankResponse toQuestionResponse(FeedbackQuestionBank bank) {
        FeedbackQuestionVersion activeVersion = bank.getVersions() == null ? null : bank.getVersions().stream()
                                                                                    .filter(version -> Boolean.TRUE.equals(version.getActive()))
                                                                                    .max(Comparator.comparing(FeedbackQuestionVersion::getVersionNumber, Comparator.nullsLast(Comparator.naturalOrder())))
                                                                                    .orElse(null);
        if (activeVersion == null && bank.getId() != null) {
            activeVersion = questionVersionRepository.findTopByQuestionBank_IdAndActiveTrueOrderByVersionNumberDesc(bank.getId()).orElse(null);
        }
        String responseType = normalizeResponseType(activeVersion == null ? bank.getDefaultResponseType() : activeVersion.getResponseType());
        String scoringBehavior = activeVersion == null
                ? normalizeScoringBehavior(bank.getDefaultScoringBehavior(), responseType)
                : resolveStoredScoringBehavior(activeVersion, bank, responseType);
        return FeedbackQuestionBankResponse.builder()
                .id(bank.getId())
                .questionCode(bank.getQuestionCode())
                .competencyCode(bank.getCompetencyCode())
                .questionText(activeVersion == null ? bank.getDefaultText() : activeVersion.getQuestionText())
                .responseType(responseType)
                .scoringBehavior(scoringBehavior)
                .ratingScaleId(isRatingResponseType(responseType) ? activeVersion == null ? bank.getDefaultRatingScaleId() : activeVersion.getRatingScaleId() : null)
                .weight(resolveEffectiveWeight(responseType, scoringBehavior, bank.getDefaultWeight(), 1.0))
                .required(Boolean.TRUE.equals(bank.getDefaultRequired()))
                .helpText(activeVersion == null ? null : activeVersion.getHelpText())
                .status(bank.getStatus())
                .activeVersionId(activeVersion == null ? null : activeVersion.getId())
                .activeVersionNumber(activeVersion == null ? null : activeVersion.getVersionNumber())
                .createdAt(bank.getCreatedAt())
                .updatedAt(bank.getUpdatedAt())
                .build();
    }

    private FeedbackQuestionRuleResponse toRuleResponse(FeedbackQuestionApplicabilityRule rule) {
        FeedbackQuestionVersion version = rule.getQuestionVersion();
        FeedbackQuestionBank bank = version == null ? null : version.getQuestionBank();
        String responseType = normalizeResponseType(version == null ? null : version.getResponseType());
        String scoringBehavior = version == null ? inferDefaultScoringBehavior(responseType) : resolveStoredScoringBehavior(version, bank, responseType);
        return FeedbackQuestionRuleResponse.builder()
                .id(rule.getId())
                .questionBankId(bank == null ? null : bank.getId())
                .questionVersionId(version == null ? null : version.getId())
                .questionCode(bank == null ? null : bank.getQuestionCode())
                .competencyCode(bank == null ? null : bank.getCompetencyCode())
                .questionText(version == null ? null : version.getQuestionText())
                .responseType(responseType)
                .scoringBehavior(scoringBehavior)
                .questionStatus(bank == null ? null : bank.getStatus())
                .effectiveActive(Boolean.TRUE.equals(rule.getActive()) && bank != null && "ACTIVE".equals(bank.getStatus()))
                .targetLevelMinRank(rule.getTargetLevelMinRank())
                .targetLevelMaxRank(rule.getTargetLevelMaxRank())
                .targetPositionId(rule.getTargetPositionId())
                .targetDepartmentId(rule.getTargetDepartmentId())
                .evaluatorRelationshipType(rule.getEvaluatorRelationshipType())
                .sectionCode(rule.getSectionCode())
                .sectionTitle(rule.getSectionTitle())
                .sectionOrder(rule.getSectionOrder())
                .displayOrder(rule.getDisplayOrder())
                .required(rule.getRequiredOverride() != null ? rule.getRequiredOverride() : bank != null && Boolean.TRUE.equals(bank.getDefaultRequired()))
                .weight(resolveEffectiveWeight(responseType, scoringBehavior, rule.getWeightOverride(), bank == null ? 1.0 : bank.getDefaultWeight()))
                .rulePriority(rule.getRulePriority())
                .active(Boolean.TRUE.equals(rule.getActive()))
                .updatedAt(rule.getUpdatedAt())
                .build();
    }

    private String resolveQuestionCodeForCreate(FeedbackQuestionBankUpsertRequest request) {
        if (request.getQuestionCode() != null && !request.getQuestionCode().isBlank()) {
            return normalizeCode(request.getQuestionCode(), "Question code is required.");
        }
        String competencyCode = normalizeCode(request.getCompetencyCode(), "Competency code is required.");
        String prefix = buildQuestionCodePrefix(competencyCode);
        int next = findNextQuestionSequence(prefix);
        String candidate;
        do {
            candidate = prefix + String.format("%03d", next++);
        } while (questionBankRepository.existsByQuestionCodeIgnoreCase(candidate));
        return candidate;
    }

    private String buildQuestionCodePrefix(String competencyCode) {
        String codePart = COMPETENCY_CODE_PREFIXES.get(competencyCode);
        if (codePart == null) {
            String normalized = competencyCode.replaceAll("[^A-Z0-9]", "");
            codePart = normalized.length() <= 5 ? normalized : normalized.substring(0, 5);
        }
        return "FB-" + codePart + "-";
    }

    private int findNextQuestionSequence(String prefix) {
        Pattern suffixPattern = Pattern.compile(Pattern.quote(prefix) + "(\\d+)$", Pattern.CASE_INSENSITIVE);
        return questionBankRepository.findQuestionCodesByPrefix(prefix.toUpperCase(Locale.ROOT)).stream()
                .map(suffixPattern::matcher)
                .filter(Matcher::find)
                .map(matcher -> matcher.group(1))
                .mapToInt(value -> {
                    try {
                        return Integer.parseInt(value);
                    } catch (NumberFormatException ignored) {
                        return 0;
                    }
                })
                .max()
                .orElse(0) + 1;
    }

    private void validateDuplicateRule(
            Long questionVersionId,
            Integer minRank,
            Integer maxRank,
            String relationshipType,
            String sectionCode,
            Long targetPositionId,
            Long targetDepartmentId,
            Long excludeRuleId,
            boolean desiredActive
    ) {
        if (!desiredActive) {
            return;
        }
        long duplicates = ruleRepository.countDuplicateRules(
                questionVersionId,
                minRank,
                maxRank,
                relationshipType,
                sectionCode,
                targetPositionId,
                targetDepartmentId,
                excludeRuleId
        );
        if (duplicates > 0) {
            throw new BadRequestException("Another active rule already exists for this question, level range, evaluator role, section, and targeting scope. Deactivate the existing active rule first.");
        }
    }

    private List<String> resolveRelationshipTypes(FeedbackQuestionRuleUpsertRequest request) {
        List<String> rawValues = request.getEvaluatorRelationshipTypes() != null && !request.getEvaluatorRelationshipTypes().isEmpty()
                ? request.getEvaluatorRelationshipTypes()
                : List.of(firstNonBlank(request.getEvaluatorRelationshipType(), ""));
        List<String> normalized = rawValues.stream()
                .filter(value -> value != null && !value.isBlank())
                .map(this::normalizeRelationship)
                .distinct()
                .toList();
        if (normalized.isEmpty()) {
            throw new BadRequestException("At least one evaluator relationship type is required.");
        }
        return normalized;
    }

    private String normalizeResponseType(String responseType) {
        String value = firstNonBlank(responseType, DEFAULT_RESPONSE_TYPE)
                .trim()
                .toUpperCase(Locale.ROOT)
                .replace('-', '_')
                .replace(' ', '_');
        if (value.equals("RATING_ONLY")) {
            value = RESPONSE_RATING;
        }
        if (value.equals("WRITTEN_ANSWER") || value.equals("WRITTEN_ANSWER_ONLY")) {
            value = RESPONSE_TEXT;
        }
        if (value.equals("YESNO") || value.equals("YES_OR_NO")) {
            value = RESPONSE_YES_NO;
        }
        if (List.of(RESPONSE_RATING_WITH_COMMENT, RESPONSE_RATING, RESPONSE_TEXT, RESPONSE_YES_NO).contains(value)) {
            return value;
        }
        throw new BadRequestException("Unsupported response type: " + responseType);
    }

    private String normalizeScoringBehavior(String scoringBehavior, String responseType) {
        String value = firstNonBlank(scoringBehavior, inferDefaultScoringBehavior(responseType))
                .trim()
                .toUpperCase(Locale.ROOT)
                .replace('-', '_')
                .replace(' ', '_');
        if (value.equals("NOT_SCORED")) {
            value = SCORING_NON_SCORED;
        }
        if (value.equals("HRREVIEW") || value.equals("ELIGIBILITY") || value.equals("ELIGIBILITY_CHECK")) {
            value = SCORING_HR_REVIEW;
        }
        if (!List.of(SCORING_SCORED, SCORING_NON_SCORED, SCORING_HR_REVIEW).contains(value)) {
            throw new BadRequestException("Unsupported scoring behavior: " + scoringBehavior);
        }
        if (!isRatingResponseType(responseType) && SCORING_SCORED.equals(value)) {
            throw new BadRequestException("Only rating-based response types can be included in the 360 score.");
        }
        return value;
    }

    private String resolveStoredScoringBehavior(FeedbackQuestionVersion version, FeedbackQuestionBank bank, String responseType) {
        String scoring = firstNonBlank(
                version == null ? null : version.getScoringBehavior(),
                bank == null ? null : bank.getDefaultScoringBehavior(),
                inferDefaultScoringBehavior(responseType)
        );
        return normalizeScoringBehavior(scoring, responseType);
    }

    private String inferDefaultScoringBehavior(String responseType) {
        String normalizedResponseType = normalizeResponseType(responseType);
        if (isRatingResponseType(normalizedResponseType)) {
            return SCORING_SCORED;
        }
        if (RESPONSE_YES_NO.equals(normalizedResponseType)) {
            return SCORING_HR_REVIEW;
        }
        return SCORING_NON_SCORED;
    }

    private boolean isRatingResponseType(String responseType) {
        String normalizedResponseType = normalizeResponseType(responseType);
        return RESPONSE_RATING_WITH_COMMENT.equals(normalizedResponseType) || RESPONSE_RATING.equals(normalizedResponseType);
    }

    private boolean isScored(String responseType, String scoringBehavior) {
        return isRatingResponseType(responseType) && SCORING_SCORED.equals(normalizeScoringBehavior(scoringBehavior, responseType));
    }

    private Double resolveEffectiveWeight(String responseType, String scoringBehavior, Double primary, Double fallback) {
        if (!isScored(responseType, scoringBehavior)) {
            return 1.0;
        }
        return resolveWeight(primary, fallback);
    }

    private int parseLevelRank(String levelCode) {
        String value = firstNonBlank(levelCode, "L09");
        String digits = value.replaceAll("\\D+", "");
        if (digits.isBlank()) {
            return 9;
        }
        try {
            int rank = Integer.parseInt(digits);
            return Math.max(1, Math.min(9, rank));
        } catch (NumberFormatException ex) {
            return 9;
        }
    }

    private String normalizeRelationship(String relationshipType) {
        String value = firstNonBlank(relationshipType, "");
        if (value == null || value.isBlank()) {
            throw new BadRequestException("Evaluator relationship type is required.");
        }
        value = value.trim().toUpperCase(Locale.ROOT).replace('-', '_').replace(' ', '_');
        if (SUPPORTED_RULE_RELATIONSHIPS.contains(value)) {
            return value;
        }
        throw new BadRequestException("Unsupported evaluator relationship type for question rules: " + relationshipType);
    }

    private String normalizeStatus(String status) {
        String value = firstNonBlank(status, "ACTIVE").trim().toUpperCase(Locale.ROOT).replace('-', '_').replace(' ', '_');
        if (!SUPPORTED_STATUSES.contains(value)) {
            throw new BadRequestException("Unsupported question status: " + status);
        }
        if ("DRAFT".equals(value) || "ARCHIVED".equals(value)) {
            return "INACTIVE";
        }
        return value;
    }

    private String normalizeCode(String value, String message) {
        return requireText(value, message)
                .trim()
                .replaceAll("[^A-Za-z0-9]+", "_")
                .replaceAll("^_+|_+$", "")
                .toUpperCase(Locale.ROOT);
    }

    private String requireText(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new BadRequestException(message);
        }
        return value.trim();
    }

    private Double resolveWeight(Double primary, Double fallback) {
        if (primary != null && primary > 0) {
            return primary;
        }
        if (fallback != null && fallback > 0) {
            return fallback;
        }
        return 1.0;
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        return null;
    }

    private static class SectionBucket {
        private final String sectionCode;
        private final String title;
        private final int orderNo;
        private final List<FeedbackAssignmentQuestionDetailResponse> questions = new ArrayList<>();

        private SectionBucket(String sectionCode, String title, int orderNo) {
            this.sectionCode = sectionCode;
            this.title = title;
            this.orderNo = orderNo;
        }
    }
}
