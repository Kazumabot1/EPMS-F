/*
package com.epms.service.impl;

import com.epms.dto.EvaluatorConfigDTO;
import com.epms.dto.FeedbackAssignmentDetailItemResponse;
import com.epms.dto.FeedbackAssignmentGenerationResponse;
import com.epms.dto.FeedbackAssignmentPreviewItemResponse;
import com.epms.dto.FeedbackManualAssignmentRequest;
import com.epms.entity.FeedbackCampaign;
import com.epms.entity.FeedbackEvaluatorAssignment;
import com.epms.entity.FeedbackRequest;
import com.epms.entity.Team;
import com.epms.entity.TeamMember;
import com.epms.entity.User;
import com.epms.entity.enums.AssignmentStatus;
import com.epms.entity.enums.EvaluatorSelectionMethod;
import com.epms.entity.enums.FeedbackCampaignStatus;
import com.epms.entity.enums.FeedbackRelationshipType;
import com.epms.exception.BusinessValidationException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.FeedbackCampaignRepository;
import com.epms.repository.FeedbackEvaluatorAssignmentRepository;
import com.epms.repository.FeedbackRequestRepository;
import com.epms.repository.TeamMemberRepository;
import com.epms.repository.TeamRepository;
import com.epms.repository.UserRepository;
import com.epms.repository.projection.PendingEvaluatorProjection;
import com.epms.service.FeedbackEvaluationService;
import com.epms.service.FeedbackOperationalService;
import com.epms.service.ProjectPeerDirectory;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FeedbackEvaluationServiceImpl implements FeedbackEvaluationService {

    private final FeedbackEvaluatorAssignmentRepository assignmentRepository;
    private final FeedbackRequestRepository feedbackRequestRepository;
    private final FeedbackCampaignRepository feedbackCampaignRepository;
    private final UserRepository userRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final TeamRepository teamRepository;
    private final ProjectPeerDirectory projectPeerDirectory;
    private final FeedbackOperationalService feedbackOperationalService;

    @Override
    @Transactional
    public FeedbackAssignmentGenerationResponse generateAssignments(Long campaignId, EvaluatorConfigDTO config, Long actorUserId) {
        validateConfig(config);

        FeedbackCampaign campaign = getCampaignOrThrow(campaignId);
        ensureDraftCampaign(campaign, "Evaluator assignments can be generated only while the campaign is DRAFT.");

        List<FeedbackRequest> requests = feedbackRequestRepository.findByCampaignIdOrderByTargetEmployeeIdAsc(campaignId);
        if (requests.isEmpty()) {
            throw new BusinessValidationException("Select target employees before generating evaluator assignments.");
        }

        List<FeedbackEvaluatorAssignment> existingAssignments = requests.stream()
                .flatMap(request -> assignmentRepository.findByFeedbackRequestId(request.getId()).stream())
                .toList();
        if (!existingAssignments.isEmpty()) {
            assignmentRepository.deleteAll(existingAssignments);
            assignmentRepository.flush();
        }

        List<String> warnings = new ArrayList<>();
        List<FeedbackEvaluatorAssignment> assignmentsToSave = new ArrayList<>();
        List<FeedbackAssignmentPreviewItemResponse> previewItems = new ArrayList<>();

        for (FeedbackRequest request : requests) {
            List<String> targetWarnings = new ArrayList<>();
            User targetUser = userRepository.findByEmployeeId(request.getTargetEmployeeId().intValue())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "No user account is linked to target employee " + request.getTargetEmployeeId() + "."
                    ));

            Set<Integer> targetTeamIds = findActiveTeamIds(targetUser);
            Set<Long> assignedEvaluatorEmployeeIds = new LinkedHashSet<>();
            Set<Long> subordinateEmployeeIds = findDirectSubordinateEmployeeIds(targetUser);

            Long managerEmployeeId = null;
            int managerAssignments = 0;
            int selfAssignments = 0;
            int subordinateAssignments = 0;
            int peerAssignments = 0;

            if (Boolean.TRUE.equals(config.getIncludeManager())) {
                managerEmployeeId = resolveManagerEmployeeId(targetUser);
                if (managerEmployeeId != null && !Objects.equals(managerEmployeeId, request.getTargetEmployeeId())) {
                    if (addAssignment(assignmentsToSave, assignedEvaluatorEmployeeIds, request, managerEmployeeId,
                            FeedbackRelationshipType.MANAGER, EvaluatorSelectionMethod.AUTO_RELATIONSHIP)) {
                        managerAssignments = 1;
                    }
                } else {
                    targetWarnings.add("No active direct manager found for target employee " + request.getTargetEmployeeId() + ".");
                }
            }

            if (Boolean.TRUE.equals(config.getIncludeSelf())) {
                if (addAssignment(assignmentsToSave, assignedEvaluatorEmployeeIds, request, request.getTargetEmployeeId(),
                        FeedbackRelationshipType.SELF, EvaluatorSelectionMethod.AUTO_RELATIONSHIP)) {
                    selfAssignments = 1;
                }
            }

            if (Boolean.TRUE.equals(config.getIncludeSubordinates())) {
                Long excludedManagerEmployeeId = managerEmployeeId;
                List<Long> selectedSubordinates = subordinateEmployeeIds.stream()
                        .filter(employeeId -> !Objects.equals(employeeId, request.getTargetEmployeeId()))
                        .filter(employeeId -> !Objects.equals(employeeId, excludedManagerEmployeeId))
                        .sorted()
                        .toList();

                if (selectedSubordinates.isEmpty()) {
                    targetWarnings.add("No active direct subordinates found for target employee " + request.getTargetEmployeeId() + ".");
                }

                for (Long subordinateEmployeeId : selectedSubordinates) {
                    if (addAssignment(assignmentsToSave, assignedEvaluatorEmployeeIds, request, subordinateEmployeeId,
                            FeedbackRelationshipType.SUBORDINATE, EvaluatorSelectionMethod.AUTO_RELATIONSHIP)) {
                        subordinateAssignments++;
                    }
                }
            }

            LinkedHashSet<Long> peerPool = new LinkedHashSet<>();
            if (Boolean.TRUE.equals(config.getIncludeTeamPeers())) {
                if (targetTeamIds.isEmpty()) {
                    targetWarnings.add("Target employee " + request.getTargetEmployeeId()
                            + " has no active team; peer selection will use department scope when available.");
                }
                peerPool.addAll(findTeamPeerEmployeeIds(targetUser));
            }
            if (isDepartmentPeerSelectionEnabled(config)) {
                if (targetUser.getDepartmentId() == null) {
                    targetWarnings.add("Target employee " + request.getTargetEmployeeId()
                            + " has no department; department peer selection cannot be applied.");
                }
                peerPool.addAll(findDepartmentPeerEmployeeIds(targetUser));
            }
            if (Boolean.TRUE.equals(config.getIncludeProjectPeers())) {
                peerPool.addAll(projectPeerDirectory.findProjectPeerEmployeeIds(targetUser));
                if (!projectPeerDirectory.isConfigured()) {
                    targetWarnings.add("Project-peer selection is enabled, but no project membership directory is configured yet.");
                }
            }
            if (Boolean.TRUE.equals(config.getIncludeCrossTeamPeers())) {
                peerPool.addAll(findCrossTeamPeerEmployeeIds(targetUser, targetTeamIds));
            }

            peerPool = filterEligiblePeerPool(peerPool, request.getTargetEmployeeId(), managerEmployeeId, subordinateEmployeeIds, assignedEvaluatorEmployeeIds);

            int requestedPeerCount = requestedPeerCount(config);
            List<Long> selectedPeers = hasPeerSource(config) ? selectPeers(peerPool, requestedPeerCount) : List.of();
            if (hasPeerSource(config) && selectedPeers.size() < requestedPeerCount) {
                targetWarnings.add("Target employee " + request.getTargetEmployeeId()
                        + " has only " + selectedPeers.size()
                        + " eligible peer(s) for the requested peer count of " + requestedPeerCount + ".");
            }
            for (Long peerEmployeeId : selectedPeers) {
                if (addAssignment(assignmentsToSave, assignedEvaluatorEmployeeIds, request, peerEmployeeId,
                        FeedbackRelationshipType.PEER, EvaluatorSelectionMethod.AUTO_RANDOM)) {
                    peerAssignments++;
                }
            }

            warnings.addAll(targetWarnings);
            previewItems.add(FeedbackAssignmentPreviewItemResponse.builder()
                    .requestId(request.getId())
                    .targetEmployeeId(request.getTargetEmployeeId())
                    .targetEmployeeName(resolveEmployeeNameForId(request.getTargetEmployeeId()))
                    .managerAssignments(managerAssignments)
                    .selfAssignments(selfAssignments)
                    .subordinateAssignments(subordinateAssignments)
                    .peerAssignments(peerAssignments)
                    .projectStakeholderAssignments(0)
                    .totalAssignments(managerAssignments + selfAssignments + subordinateAssignments + peerAssignments)
                    .autoAssignments(peerAssignments + managerAssignments + selfAssignments + subordinateAssignments)
                    .manualAssignments(0)
                    .warnings(targetWarnings)
                    .build());
        }

        if (assignmentsToSave.isEmpty()) {
            throw new BusinessValidationException("No evaluator assignments could be generated from the selected configuration.");
        }

        assignmentRepository.saveAll(assignmentsToSave);
        feedbackOperationalService.audit(
                actorUserId,
                FeedbackOperationalService.ASSIGNMENTS_GENERATED,
                FeedbackOperationalService.ENTITY_CAMPAIGN,
                campaignId,
                existingAssignments.isEmpty() ? null : "replacedAssignments=" + existingAssignments.size(),
                "generatedAssignments=" + assignmentsToSave.size() + ", targets=" + requests.size(),
                "360 feedback evaluator assignments generated"
        );
        List<FeedbackAssignmentDetailItemResponse> details = buildAssignmentDetails(campaignId);

        return FeedbackAssignmentGenerationResponse.builder()
                .campaignId(campaignId)
                .totalTargets(requests.size())
                .totalEvaluatorsGenerated(assignmentsToSave.size())
                .evaluatorConfig(config)
                .requests(previewItems)
                .assignmentDetails(details)
                .warnings(warnings.stream().distinct().toList())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public FeedbackAssignmentGenerationResponse getAssignmentPreview(Long campaignId) {
        getCampaignOrThrow(campaignId);
        return buildAssignmentResponse(campaignId, null, List.of());
    }

    @Override
    @Transactional
    public FeedbackAssignmentGenerationResponse addManualAssignment(Long campaignId, FeedbackManualAssignmentRequest request, Long actorUserId) {
        FeedbackCampaign campaign = getCampaignOrThrow(campaignId);
        ensureDraftCampaign(campaign, "Manual evaluator changes are allowed only while the campaign is DRAFT.");

        FeedbackRequest feedbackRequest = feedbackRequestRepository
                .findByCampaignIdAndTargetEmployeeId(campaignId, request.getTargetEmployeeId())
                .orElseThrow(() -> new ResourceNotFoundException("Target employee is not part of this campaign."));

        validateManualAssignment(request, feedbackRequest);

        if (assignmentRepository.existsByFeedbackRequestIdAndEvaluatorEmployeeId(
                feedbackRequest.getId(), request.getEvaluatorEmployeeId())) {
            throw new BusinessValidationException("This evaluator is already assigned to the selected target employee.");
        }

        FeedbackEvaluatorAssignment assignment = createAssignment(
                feedbackRequest,
                request.getEvaluatorEmployeeId(),
                request.getRelationshipType(),
                EvaluatorSelectionMethod.MANUAL
        );
        if (request.getAnonymous() != null) {
            assignment.setIsAnonymous(request.getAnonymous());
        }
        FeedbackEvaluatorAssignment savedAssignment = assignmentRepository.save(assignment);
        feedbackOperationalService.audit(
                actorUserId,
                FeedbackOperationalService.ASSIGNMENT_MANUAL_ADDED,
                FeedbackOperationalService.ENTITY_ASSIGNMENT,
                savedAssignment.getId(),
                null,
                "campaignId=" + campaignId + ",targetEmployeeId=" + request.getTargetEmployeeId()
                        + ",evaluatorEmployeeId=" + request.getEvaluatorEmployeeId()
                        + ",relationshipType=" + request.getRelationshipType(),
                "Manual 360 feedback evaluator assignment added"
        );

        return buildAssignmentResponse(campaignId, null, List.of(
                "Manual evaluator #" + request.getEvaluatorEmployeeId()
                        + " added for target employee #" + request.getTargetEmployeeId() + "."
        ));
    }

    @Override
    @Transactional
    public FeedbackAssignmentGenerationResponse removeAssignment(Long campaignId, Long assignmentId, Long actorUserId) {
        FeedbackCampaign campaign = getCampaignOrThrow(campaignId);
        ensureDraftCampaign(campaign, "Evaluator assignments can be removed only while the campaign is DRAFT.");

        FeedbackEvaluatorAssignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Evaluator assignment not found."));
        if (assignment.getFeedbackRequest() == null
                || assignment.getFeedbackRequest().getCampaign() == null
                || !Objects.equals(assignment.getFeedbackRequest().getCampaign().getId(), campaignId)) {
            throw new BusinessValidationException("Evaluator assignment does not belong to this campaign.");
        }
        if (assignment.getStatus() == AssignmentStatus.SUBMITTED || assignment.getResponse() != null) {
            throw new BusinessValidationException("Submitted evaluator assignments cannot be removed.");
        }

        Long targetEmployeeId = assignment.getFeedbackRequest().getTargetEmployeeId();
        Long evaluatorEmployeeId = assignment.getEvaluatorEmployeeId();
        assignmentRepository.delete(assignment);
        feedbackOperationalService.audit(
                actorUserId,
                FeedbackOperationalService.ASSIGNMENT_REMOVED,
                FeedbackOperationalService.ENTITY_ASSIGNMENT,
                assignmentId,
                "campaignId=" + campaignId + ",targetEmployeeId=" + targetEmployeeId + ",evaluatorEmployeeId=" + evaluatorEmployeeId,
                null,
                "360 feedback evaluator assignment removed"
        );

        return buildAssignmentResponse(campaignId, null, List.of(
                "Evaluator #" + evaluatorEmployeeId + " removed from target employee #" + targetEmployeeId + "."
        ));
    }

    @Override
    @Transactional(readOnly = true)
    public List<PendingEvaluatorProjection> getPendingEvaluators(Long requestId) {
        return assignmentRepository.findPendingEvaluatorsByRequestId(requestId);
    }

    private void validateConfig(EvaluatorConfigDTO config) {
        if (config == null) {
            throw new BusinessValidationException("Evaluator configuration is required.");
        }
        boolean anyPeerSourceSelected = hasPeerSource(config);
        boolean anyEvaluatorSourceSelected = Boolean.TRUE.equals(config.getIncludeManager())
                || Boolean.TRUE.equals(config.getIncludeSelf())
                || Boolean.TRUE.equals(config.getIncludeSubordinates())
                || anyPeerSourceSelected;
        if (!anyEvaluatorSourceSelected) {
            throw new BusinessValidationException("Choose at least one evaluator source.");
        }
        if (anyPeerSourceSelected && (config.getPeerCount() == null || config.getPeerCount() <= 0)) {
            throw new BusinessValidationException("Peer count must be greater than zero when peer evaluators are enabled.");
        }
    }

    private void validateManualAssignment(FeedbackManualAssignmentRequest request, FeedbackRequest feedbackRequest) {
        User target = userRepository.findByEmployeeId(request.getTargetEmployeeId().intValue())
                .orElseThrow(() -> new ResourceNotFoundException("Target employee has no active user account."));
        User evaluator = userRepository.findByEmployeeId(request.getEvaluatorEmployeeId().intValue())
                .orElseThrow(() -> new ResourceNotFoundException("Evaluator employee has no active user account."));
        if (Boolean.FALSE.equals(target.getActive())) {
            throw new BusinessValidationException("Target employee must be active.");
        }
        if (Boolean.FALSE.equals(evaluator.getActive())) {
            throw new BusinessValidationException("Evaluator employee must be active.");
        }

        if (feedbackRequest.getCampaign() == null || feedbackRequest.getCampaign().getId() == null) {
            throw new BusinessValidationException("Invalid feedback request for manual assignment.");
        }

        FeedbackRelationshipType relationshipType = request.getRelationshipType();
        if (relationshipType == null) {
            throw new BusinessValidationException("Relationship type is required.");
        }

        if (relationshipType == FeedbackRelationshipType.SELF) {
            if (!Objects.equals(request.getTargetEmployeeId(), request.getEvaluatorEmployeeId())) {
                throw new BusinessValidationException("SELF assignments must use the same target and evaluator employee.");
            }
            return;
        }

        if (Objects.equals(request.getTargetEmployeeId(), request.getEvaluatorEmployeeId())) {
            throw new BusinessValidationException("Only SELF assignments can use the target employee as evaluator.");
        }

        if (relationshipType == FeedbackRelationshipType.MANAGER && !Objects.equals(target.getManagerId(), evaluator.getId())) {
            throw new BusinessValidationException("MANAGER assignment must use the target employee's direct manager. Use PROJECT_STAKEHOLDER for other manual reviewers.");
        }

        if (relationshipType == FeedbackRelationshipType.SUBORDINATE && !Objects.equals(evaluator.getManagerId(), target.getId())) {
            throw new BusinessValidationException("SUBORDINATE assignment must use an employee who directly reports to the target employee.");
        }

        if (relationshipType == FeedbackRelationshipType.PEER) {
            if (Objects.equals(target.getManagerId(), evaluator.getId())) {
                throw new BusinessValidationException("The target employee's manager cannot be added as a PEER evaluator.");
            }
            if (Objects.equals(evaluator.getManagerId(), target.getId())) {
                throw new BusinessValidationException("A direct subordinate cannot be added as a PEER evaluator.");
            }
        }
    }

    private FeedbackAssignmentGenerationResponse buildAssignmentResponse(
            Long campaignId,
            EvaluatorConfigDTO config,
            List<String> extraWarnings
    ) {
        List<FeedbackRequest> requests = feedbackRequestRepository.findByCampaignIdOrderByTargetEmployeeIdAsc(campaignId);
        List<FeedbackEvaluatorAssignment> assignments = assignmentRepository.findByCampaignIdWithRequest(campaignId);
        Map<Long, List<FeedbackEvaluatorAssignment>> assignmentsByRequestId = assignments.stream()
                .collect(Collectors.groupingBy(a -> a.getFeedbackRequest().getId()));

        List<String> warnings = new ArrayList<>(extraWarnings == null ? List.of() : extraWarnings);
        List<FeedbackAssignmentPreviewItemResponse> previewItems = requests.stream()
                .map(request -> buildPreviewItem(request, assignmentsByRequestId.getOrDefault(request.getId(), List.of()), warnings))
                .toList();

        return FeedbackAssignmentGenerationResponse.builder()
                .campaignId(campaignId)
                .totalTargets(requests.size())
                .totalEvaluatorsGenerated(assignments.size())
                .evaluatorConfig(config)
                .requests(previewItems)
                .assignmentDetails(buildAssignmentDetails(assignments))
                .warnings(warnings.stream().distinct().toList())
                .build();
    }

    private FeedbackAssignmentPreviewItemResponse buildPreviewItem(
            FeedbackRequest request,
            List<FeedbackEvaluatorAssignment> assignments,
            List<String> campaignWarnings
    ) {
        Map<FeedbackRelationshipType, Long> countsByType = assignments.stream()
                .collect(Collectors.groupingBy(
                        FeedbackEvaluatorAssignment::getRelationshipType,
                        () -> new EnumMap<>(FeedbackRelationshipType.class),
                        Collectors.counting()
                ));
        long autoCount = assignments.stream()
                .filter(assignment -> assignment.getSelectionMethod() == EvaluatorSelectionMethod.AUTO_RANDOM)
                .count();
        long manualCount = assignments.stream()
                .filter(assignment -> assignment.getSelectionMethod() == EvaluatorSelectionMethod.MANUAL)
                .count();

        List<String> targetWarnings = new ArrayList<>();
        if (assignments.isEmpty()) {
            targetWarnings.add("Target employee " + request.getTargetEmployeeId() + " has no evaluator assignments yet.");
        }
        campaignWarnings.addAll(targetWarnings);

        return FeedbackAssignmentPreviewItemResponse.builder()
                .requestId(request.getId())
                .targetEmployeeId(request.getTargetEmployeeId())
                .targetEmployeeName(resolveEmployeeNameForId(request.getTargetEmployeeId()))
                .managerAssignments(countsByType.getOrDefault(FeedbackRelationshipType.MANAGER, 0L).intValue())
                .selfAssignments(countsByType.getOrDefault(FeedbackRelationshipType.SELF, 0L).intValue())
                .subordinateAssignments(countsByType.getOrDefault(FeedbackRelationshipType.SUBORDINATE, 0L).intValue())
                .peerAssignments(countsByType.getOrDefault(FeedbackRelationshipType.PEER, 0L).intValue())
                .projectStakeholderAssignments(countsByType.getOrDefault(FeedbackRelationshipType.PROJECT_STAKEHOLDER, 0L).intValue())
                .totalAssignments(assignments.size())
                .autoAssignments((int) autoCount)
                .manualAssignments((int) manualCount)
                .warnings(targetWarnings)
                .build();
    }

    private List<FeedbackAssignmentDetailItemResponse> buildAssignmentDetails(Long campaignId) {
        return buildAssignmentDetails(assignmentRepository.findByCampaignIdWithRequest(campaignId));
    }

    private List<FeedbackAssignmentDetailItemResponse> buildAssignmentDetails(List<FeedbackEvaluatorAssignment> assignments) {
        Set<Integer> employeeIds = assignments.stream()
                .flatMap(assignment -> List.of(
                        assignment.getFeedbackRequest().getTargetEmployeeId(),
                        assignment.getEvaluatorEmployeeId()
                ).stream())
                .filter(Objects::nonNull)
                .map(Long::intValue)
                .collect(Collectors.toCollection(LinkedHashSet::new));

        Map<Integer, User> usersByEmployeeId = employeeIds.stream()
                .map(userRepository::findByEmployeeId)
                .flatMap(optional -> optional.stream())
                .collect(Collectors.toMap(User::getEmployeeId, Function.identity(), (left, right) -> left));

        return assignments.stream()
                .map(assignment -> {
                    Long targetEmployeeId = assignment.getFeedbackRequest().getTargetEmployeeId();
                    Long evaluatorEmployeeId = assignment.getEvaluatorEmployeeId();
                    return FeedbackAssignmentDetailItemResponse.builder()
                            .assignmentId(assignment.getId())
                            .requestId(assignment.getFeedbackRequest().getId())
                            .targetEmployeeId(targetEmployeeId)
                            .targetEmployeeName(resolveEmployeeName(usersByEmployeeId, targetEmployeeId))
                            .evaluatorEmployeeId(evaluatorEmployeeId)
                            .evaluatorEmployeeName(resolveEmployeeName(usersByEmployeeId, evaluatorEmployeeId))
                            .relationshipType(assignment.getRelationshipType())
                            .selectionMethod(assignment.getSelectionMethod())
                            .status(assignment.getStatus())
                            .anonymous(assignment.getIsAnonymous())
                            .build();
                })
                .toList();
    }

    private String resolveEmployeeName(Map<Integer, User> usersByEmployeeId, Long employeeId) {
        if (employeeId == null) {
            return null;
        }
        User user = usersByEmployeeId.get(employeeId.intValue());
        if (user == null || user.getFullName() == null || user.getFullName().isBlank()) {
            return "Employee #" + employeeId;
        }
        return user.getFullName();
    }

    private String resolveEmployeeNameForId(Long employeeId) {
        if (employeeId == null) {
            return null;
        }
        return userRepository.findByEmployeeId(employeeId.intValue())
                .map(user -> user.getFullName() == null || user.getFullName().isBlank()
                        ? "Employee #" + employeeId
                        : user.getFullName())
                .orElse("Employee #" + employeeId);
    }

    private FeedbackCampaign getCampaignOrThrow(Long campaignId) {
        return feedbackCampaignRepository.findById(campaignId)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback campaign not found."));
    }

    private void ensureDraftCampaign(FeedbackCampaign campaign, String message) {
        if (campaign.getStatus() != FeedbackCampaignStatus.DRAFT) {
            throw new BusinessValidationException(message);
        }
    }

    private boolean hasPeerSource(EvaluatorConfigDTO config) {
        return Boolean.TRUE.equals(config.getIncludeTeamPeers())
                || isDepartmentPeerSelectionEnabled(config)
                || Boolean.TRUE.equals(config.getIncludeProjectPeers())
                || Boolean.TRUE.equals(config.getIncludeCrossTeamPeers());
    }

    private boolean isDepartmentPeerSelectionEnabled(EvaluatorConfigDTO config) {
        return Boolean.TRUE.equals(config.getIncludeDepartmentPeers())
                || (config.getIncludeDepartmentPeers() == null && Boolean.TRUE.equals(config.getIncludeTeamPeers()));
    }

    private int requestedPeerCount(EvaluatorConfigDTO config) {
        return config.getPeerCount() == null ? 0 : config.getPeerCount();
    }

    private boolean addAssignment(
            List<FeedbackEvaluatorAssignment> assignmentsToSave,
            Set<Long> assignedEvaluatorEmployeeIds,
            FeedbackRequest request,
            Long evaluatorEmployeeId,
            FeedbackRelationshipType relationshipType,
            EvaluatorSelectionMethod selectionMethod
    ) {
        if (evaluatorEmployeeId == null || !assignedEvaluatorEmployeeIds.add(evaluatorEmployeeId)) {
            return false;
        }
        assignmentsToSave.add(createAssignment(request, evaluatorEmployeeId, relationshipType, selectionMethod));
        return true;
    }

    private FeedbackEvaluatorAssignment createAssignment(
            FeedbackRequest request,
            Long evaluatorEmployeeId,
            FeedbackRelationshipType relationshipType,
            EvaluatorSelectionMethod selectionMethod
    ) {
        FeedbackEvaluatorAssignment assignment = new FeedbackEvaluatorAssignment();
        assignment.setFeedbackRequest(request);
        assignment.setEvaluatorEmployeeId(evaluatorEmployeeId);
        assignment.setRelationshipType(relationshipType);
        assignment.setSelectionMethod(selectionMethod);
        assignment.setIsAnonymous(isAnonymous(relationshipType));
        assignment.setStatus(AssignmentStatus.PENDING);
        return assignment;
    }

    private boolean isAnonymous(FeedbackRelationshipType relationshipType) {
        return relationshipType == FeedbackRelationshipType.PEER
                || relationshipType == FeedbackRelationshipType.SUBORDINATE;
    }

    private Long resolveManagerEmployeeId(User targetUser) {
        if (targetUser.getManagerId() == null) {
            return null;
        }
        return userRepository.findById(targetUser.getManagerId())
                .filter(manager -> !Boolean.FALSE.equals(manager.getActive()))
                .map(User::getEmployeeId)
                .filter(Objects::nonNull)
                .map(Integer::longValue)
                .orElse(null);
    }

    private Set<Long> findDirectSubordinateEmployeeIds(User targetUser) {
        return userRepository.findByManagerIdAndActiveTrue(targetUser.getId()).stream()
                .map(User::getEmployeeId)
                .filter(Objects::nonNull)
                .map(Integer::longValue)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private LinkedHashSet<Long> filterEligiblePeerPool(
            Set<Long> rawPeerPool,
            Long targetEmployeeId,
            Long managerEmployeeId,
            Set<Long> subordinateEmployeeIds,
            Set<Long> alreadyAssignedEmployeeIds
    ) {
        LinkedHashSet<Long> filtered = new LinkedHashSet<>(rawPeerPool == null ? Set.of() : rawPeerPool);
        filtered.remove(null);
        filtered.remove(targetEmployeeId);
        if (managerEmployeeId != null) {
            filtered.remove(managerEmployeeId);
        }
        if (subordinateEmployeeIds != null) {
            subordinateEmployeeIds.forEach(filtered::remove);
        }
        if (alreadyAssignedEmployeeIds != null) {
            alreadyAssignedEmployeeIds.forEach(filtered::remove);
        }
        return filtered.stream()
                .filter(this::hasActiveUserForEmployeeId)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private boolean hasActiveUserForEmployeeId(Long employeeId) {
        if (employeeId == null) {
            return false;
        }
        return userRepository.findByEmployeeId(employeeId.intValue())
                .filter(user -> !Boolean.FALSE.equals(user.getActive()))
                .isPresent();
    }

    private List<Long> selectPeers(Set<Long> peerPool, int peerCount) {
        if (peerPool.isEmpty() || peerCount <= 0) {
            return List.of();
        }
        List<Long> candidates = new ArrayList<>(peerPool);
        Collections.shuffle(candidates);
        return candidates.stream().limit(peerCount).toList();
    }

    private Set<Long> findDepartmentPeerEmployeeIds(User targetUser) {
        if (targetUser.getDepartmentId() == null) {
            return Set.of();
        }
        return userRepository.findByDepartmentIdAndActiveTrue(targetUser.getDepartmentId()).stream()
                .filter(candidate -> candidate.getEmployeeId() != null)
                .filter(candidate -> !Objects.equals(candidate.getId(), targetUser.getId()))
                .map(candidate -> candidate.getEmployeeId().longValue())
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private Set<Long> findTeamPeerEmployeeIds(User targetUser) {
        Set<Long> employeeIds = new LinkedHashSet<>();
        for (Team team : findActiveTeams(targetUser)) {
            if (team.getTeamLeader() != null
                    && team.getTeamLeader().getEmployeeId() != null
                    && !Boolean.FALSE.equals(team.getTeamLeader().getActive())) {
                employeeIds.add(team.getTeamLeader().getEmployeeId().longValue());
            }
            List<TeamMember> members = team.getTeamMembers() != null
                    ? team.getTeamMembers()
                    : teamMemberRepository.findByTeamId(team.getId());
            for (TeamMember member : members) {
                if (member.getMemberUser() != null
                        && member.getMemberUser().getEmployeeId() != null
                        && !Boolean.FALSE.equals(member.getMemberUser().getActive())) {
                    employeeIds.add(member.getMemberUser().getEmployeeId().longValue());
                }
            }
        }
        return employeeIds;
    }

    private Set<Long> findCrossTeamPeerEmployeeIds(User targetUser, Set<Integer> targetTeamIds) {
        Set<Long> candidateEmployeeIds = new LinkedHashSet<>();

        for (User candidate : findActiveUsers()) {
            if (candidate.getEmployeeId() == null || Objects.equals(candidate.getId(), targetUser.getId())) {
                continue;
            }
            if (targetUser.getDepartmentId() != null
                    && !Objects.equals(candidate.getDepartmentId(), targetUser.getDepartmentId())) {
                continue;
            }
            Set<Integer> candidateTeamIds = findActiveTeamIds(candidate);
            if (!targetTeamIds.isEmpty()) {
                if (candidateTeamIds.isEmpty() || !Collections.disjoint(candidateTeamIds, targetTeamIds)) {
                    continue;
                }
            } else if (candidateTeamIds.isEmpty()) {
                continue;
            }
            candidateEmployeeIds.add(candidate.getEmployeeId().longValue());
        }

        return candidateEmployeeIds;
    }

    private List<User> findActiveUsers() {
        return userRepository.findAll().stream()
                .filter(candidate -> !Boolean.FALSE.equals(candidate.getActive()))
                .sorted(Comparator.comparing(User::getId))
                .toList();
    }

    private List<Team> findActiveTeams(User user) {
        Map<Integer, Team> teams = teamMemberRepository.findByMemberUserId(user.getId()).stream()
                .map(TeamMember::getTeam)
                .filter(Objects::nonNull)
                .filter(team -> "Active".equalsIgnoreCase(team.getStatus()))
                .collect(Collectors.toMap(Team::getId, team -> team, (left, right) -> left));

        for (Team ledTeam : teamRepository.findByTeamLeaderIdAndStatusIgnoreCase(user.getId(), "Active")) {
            teams.put(ledTeam.getId(), ledTeam);
        }

        return teams.values().stream()
                .sorted(Comparator.comparing(Team::getId))
                .toList();
    }

    private Set<Integer> findActiveTeamIds(User user) {
        return findActiveTeams(user).stream()
                .map(Team::getId)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }
}
*/




package com.epms.service.impl;

import com.epms.dto.EvaluatorConfigDTO;
import com.epms.dto.FeedbackAssignmentDetailItemResponse;
import com.epms.dto.FeedbackAssignmentGenerationResponse;
import com.epms.dto.FeedbackAssignmentPreviewItemResponse;
import com.epms.dto.FeedbackManualAssignmentRequest;
import com.epms.entity.FeedbackCampaign;
import com.epms.entity.FeedbackEvaluatorAssignment;
import com.epms.entity.FeedbackRequest;
import com.epms.entity.Team;
import com.epms.entity.TeamMember;
import com.epms.entity.User;
import com.epms.entity.enums.AssignmentStatus;
import com.epms.entity.enums.EvaluatorSelectionMethod;
import com.epms.entity.enums.FeedbackCampaignStatus;
import com.epms.entity.enums.FeedbackRelationshipType;
import com.epms.exception.BusinessValidationException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.FeedbackCampaignRepository;
import com.epms.repository.FeedbackEvaluatorAssignmentRepository;
import com.epms.repository.FeedbackRequestRepository;
import com.epms.repository.TeamMemberRepository;
import com.epms.repository.TeamRepository;
import com.epms.repository.UserRepository;
import com.epms.repository.projection.PendingEvaluatorProjection;
import com.epms.service.FeedbackEvaluationService;
import com.epms.service.FeedbackOperationalService;
import com.epms.service.ProjectPeerDirectory;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FeedbackEvaluationServiceImpl implements FeedbackEvaluationService {

    private final FeedbackEvaluatorAssignmentRepository assignmentRepository;
    private final FeedbackRequestRepository feedbackRequestRepository;
    private final FeedbackCampaignRepository feedbackCampaignRepository;
    private final UserRepository userRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final TeamRepository teamRepository;
    private final ProjectPeerDirectory projectPeerDirectory;
    private final FeedbackOperationalService feedbackOperationalService;

    /**
     * Backward-compatible overload for existing tests/older callers.
     * New code should pass actorUserId so audit fields can record who generated assignments.
     */
    @Transactional
    public FeedbackAssignmentGenerationResponse generateAssignments(Long campaignId, EvaluatorConfigDTO config) {
        return generateAssignments(campaignId, config, null);
    }

    @Override
    @Transactional
    public FeedbackAssignmentGenerationResponse generateAssignments(Long campaignId, EvaluatorConfigDTO config, Long actorUserId) {
        validateConfig(config);

        FeedbackCampaign campaign = getCampaignOrThrow(campaignId);
        ensureDraftCampaign(campaign, "Evaluator assignments can be generated only while the campaign is DRAFT.");

        List<FeedbackRequest> requests = feedbackRequestRepository.findByCampaignIdOrderByTargetEmployeeIdAsc(campaignId);
        if (requests.isEmpty()) {
            throw new BusinessValidationException("Select target employees before generating evaluator assignments.");
        }

        List<FeedbackEvaluatorAssignment> existingAssignments = requests.stream()
                .flatMap(request -> assignmentRepository.findByFeedbackRequestId(request.getId()).stream())
                .toList();
        if (!existingAssignments.isEmpty()) {
            assignmentRepository.deleteAll(existingAssignments);
            assignmentRepository.flush();
        }

        List<String> warnings = new ArrayList<>();
        List<FeedbackEvaluatorAssignment> assignmentsToSave = new ArrayList<>();
        List<FeedbackAssignmentPreviewItemResponse> previewItems = new ArrayList<>();

        for (FeedbackRequest request : requests) {
            List<String> targetWarnings = new ArrayList<>();
            User targetUser = userRepository.findByEmployeeId(request.getTargetEmployeeId().intValue())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "No user account is linked to target employee " + request.getTargetEmployeeId() + "."
                    ));

            Set<Integer> targetTeamIds = findActiveTeamIds(targetUser);
            Set<Long> assignedEvaluatorEmployeeIds = new LinkedHashSet<>();
            Set<Long> subordinateEmployeeIds = findDirectSubordinateEmployeeIds(targetUser);

            Long managerEmployeeId = null;
            int managerAssignments = 0;
            int selfAssignments = 0;
            int subordinateAssignments = 0;
            int peerAssignments = 0;

            if (Boolean.TRUE.equals(config.getIncludeManager())) {
                managerEmployeeId = resolveManagerEmployeeId(targetUser);
                if (managerEmployeeId != null && !Objects.equals(managerEmployeeId, request.getTargetEmployeeId())) {
                    if (addAssignment(assignmentsToSave, assignedEvaluatorEmployeeIds, request, managerEmployeeId,
                            FeedbackRelationshipType.MANAGER, EvaluatorSelectionMethod.AUTO_RELATIONSHIP)) {
                        managerAssignments = 1;
                    }
                } else {
                    targetWarnings.add("No active direct manager found for target employee " + request.getTargetEmployeeId() + ".");
                }
            }

            if (Boolean.TRUE.equals(config.getIncludeSelf())) {
                if (addAssignment(assignmentsToSave, assignedEvaluatorEmployeeIds, request, request.getTargetEmployeeId(),
                        FeedbackRelationshipType.SELF, EvaluatorSelectionMethod.AUTO_RELATIONSHIP)) {
                    selfAssignments = 1;
                }
            }

            if (Boolean.TRUE.equals(config.getIncludeSubordinates())) {
                Long excludedManagerEmployeeId = managerEmployeeId;
                List<Long> selectedSubordinates = subordinateEmployeeIds.stream()
                        .filter(employeeId -> !Objects.equals(employeeId, request.getTargetEmployeeId()))
                        .filter(employeeId -> !Objects.equals(employeeId, excludedManagerEmployeeId))
                        .sorted()
                        .toList();

                if (selectedSubordinates.isEmpty()) {
                    targetWarnings.add("No active direct subordinates found for target employee " + request.getTargetEmployeeId() + ".");
                }

                for (Long subordinateEmployeeId : selectedSubordinates) {
                    if (addAssignment(assignmentsToSave, assignedEvaluatorEmployeeIds, request, subordinateEmployeeId,
                            FeedbackRelationshipType.SUBORDINATE, EvaluatorSelectionMethod.AUTO_RELATIONSHIP)) {
                        subordinateAssignments++;
                    }
                }
            }

            LinkedHashSet<Long> peerPool = new LinkedHashSet<>();
            if (Boolean.TRUE.equals(config.getIncludeTeamPeers())) {
                if (targetTeamIds.isEmpty()) {
                    targetWarnings.add("Target employee " + request.getTargetEmployeeId()
                            + " has no active team; peer selection will use department scope when available.");
                }
                peerPool.addAll(findTeamPeerEmployeeIds(targetUser));
            }
            if (isDepartmentPeerSelectionEnabled(config)) {
                if (targetUser.getDepartmentId() == null) {
                    targetWarnings.add("Target employee " + request.getTargetEmployeeId()
                            + " has no department; department peer selection cannot be applied.");
                }
                peerPool.addAll(findDepartmentPeerEmployeeIds(targetUser));
            }
            if (Boolean.TRUE.equals(config.getIncludeProjectPeers())) {
                peerPool.addAll(projectPeerDirectory.findProjectPeerEmployeeIds(targetUser));
                if (!projectPeerDirectory.isConfigured()) {
                    targetWarnings.add("Project-peer selection is enabled, but no project membership directory is configured yet.");
                }
            }
            if (Boolean.TRUE.equals(config.getIncludeCrossTeamPeers())) {
                peerPool.addAll(findCrossTeamPeerEmployeeIds(targetUser, targetTeamIds));
            }

            peerPool = filterEligiblePeerPool(peerPool, request.getTargetEmployeeId(), managerEmployeeId, subordinateEmployeeIds, assignedEvaluatorEmployeeIds);

            int requestedPeerCount = requestedPeerCount(config);
            List<Long> selectedPeers = hasPeerSource(config) ? selectPeers(peerPool, requestedPeerCount) : List.of();
            if (hasPeerSource(config) && selectedPeers.size() < requestedPeerCount) {
                targetWarnings.add("Target employee " + request.getTargetEmployeeId()
                        + " has only " + selectedPeers.size()
                        + " eligible peer(s) for the requested peer count of " + requestedPeerCount + ".");
            }
            for (Long peerEmployeeId : selectedPeers) {
                if (addAssignment(assignmentsToSave, assignedEvaluatorEmployeeIds, request, peerEmployeeId,
                        FeedbackRelationshipType.PEER, EvaluatorSelectionMethod.AUTO_RANDOM)) {
                    peerAssignments++;
                }
            }

            warnings.addAll(targetWarnings);
            previewItems.add(FeedbackAssignmentPreviewItemResponse.builder()
                    .requestId(request.getId())
                    .targetEmployeeId(request.getTargetEmployeeId())
                    .targetEmployeeName(resolveEmployeeNameForId(request.getTargetEmployeeId()))
                    .managerAssignments(managerAssignments)
                    .selfAssignments(selfAssignments)
                    .subordinateAssignments(subordinateAssignments)
                    .peerAssignments(peerAssignments)
                    .projectStakeholderAssignments(0)
                    .totalAssignments(managerAssignments + selfAssignments + subordinateAssignments + peerAssignments)
                    .autoAssignments(peerAssignments + managerAssignments + selfAssignments + subordinateAssignments)
                    .manualAssignments(0)
                    .warnings(targetWarnings)
                    .build());
        }

        if (assignmentsToSave.isEmpty()) {
            throw new BusinessValidationException("No evaluator assignments could be generated from the selected configuration.");
        }

        assignmentRepository.saveAll(assignmentsToSave);
        feedbackOperationalService.audit(
                actorUserId,
                FeedbackOperationalService.ASSIGNMENTS_GENERATED,
                FeedbackOperationalService.ENTITY_CAMPAIGN,
                campaignId,
                existingAssignments.isEmpty() ? null : "replacedAssignments=" + existingAssignments.size(),
                "generatedAssignments=" + assignmentsToSave.size() + ", targets=" + requests.size(),
                "360 feedback evaluator assignments generated"
        );
        List<FeedbackAssignmentDetailItemResponse> details = buildAssignmentDetails(campaignId);

        return FeedbackAssignmentGenerationResponse.builder()
                .campaignId(campaignId)
                .totalTargets(requests.size())
                .totalEvaluatorsGenerated(assignmentsToSave.size())
                .evaluatorConfig(config)
                .requests(previewItems)
                .assignmentDetails(details)
                .warnings(warnings.stream().distinct().toList())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public FeedbackAssignmentGenerationResponse getAssignmentPreview(Long campaignId) {
        getCampaignOrThrow(campaignId);
        return buildAssignmentResponse(campaignId, null, List.of());
    }

    @Override
    @Transactional
    public FeedbackAssignmentGenerationResponse addManualAssignment(Long campaignId, FeedbackManualAssignmentRequest request, Long actorUserId) {
        FeedbackCampaign campaign = getCampaignOrThrow(campaignId);
        ensureDraftCampaign(campaign, "Manual evaluator changes are allowed only while the campaign is DRAFT.");

        FeedbackRequest feedbackRequest = feedbackRequestRepository
                .findByCampaignIdAndTargetEmployeeId(campaignId, request.getTargetEmployeeId())
                .orElseThrow(() -> new ResourceNotFoundException("Target employee is not part of this campaign."));

        validateManualAssignment(request, feedbackRequest);

        if (assignmentRepository.existsByFeedbackRequestIdAndEvaluatorEmployeeId(
                feedbackRequest.getId(), request.getEvaluatorEmployeeId())) {
            throw new BusinessValidationException("This evaluator is already assigned to the selected target employee.");
        }

        FeedbackEvaluatorAssignment assignment = createAssignment(
                feedbackRequest,
                request.getEvaluatorEmployeeId(),
                request.getRelationshipType(),
                EvaluatorSelectionMethod.MANUAL
        );
        if (request.getAnonymous() != null) {
            assignment.setIsAnonymous(request.getAnonymous());
        }
        FeedbackEvaluatorAssignment savedAssignment = assignmentRepository.save(assignment);
        feedbackOperationalService.audit(
                actorUserId,
                FeedbackOperationalService.ASSIGNMENT_MANUAL_ADDED,
                FeedbackOperationalService.ENTITY_ASSIGNMENT,
                savedAssignment.getId(),
                null,
                "campaignId=" + campaignId + ",targetEmployeeId=" + request.getTargetEmployeeId()
                        + ",evaluatorEmployeeId=" + request.getEvaluatorEmployeeId()
                        + ",relationshipType=" + request.getRelationshipType(),
                "Manual 360 feedback evaluator assignment added"
        );

        return buildAssignmentResponse(campaignId, null, List.of(
                "Manual evaluator #" + request.getEvaluatorEmployeeId()
                        + " added for target employee #" + request.getTargetEmployeeId() + "."
        ));
    }

    @Override
    @Transactional
    public FeedbackAssignmentGenerationResponse removeAssignment(Long campaignId, Long assignmentId, Long actorUserId) {
        FeedbackCampaign campaign = getCampaignOrThrow(campaignId);
        ensureDraftCampaign(campaign, "Evaluator assignments can be removed only while the campaign is DRAFT.");

        FeedbackEvaluatorAssignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Evaluator assignment not found."));
        if (assignment.getFeedbackRequest() == null
                || assignment.getFeedbackRequest().getCampaign() == null
                || !Objects.equals(assignment.getFeedbackRequest().getCampaign().getId(), campaignId)) {
            throw new BusinessValidationException("Evaluator assignment does not belong to this campaign.");
        }
        if (assignment.getStatus() == AssignmentStatus.SUBMITTED || assignment.getResponse() != null) {
            throw new BusinessValidationException("Submitted evaluator assignments cannot be removed.");
        }

        Long targetEmployeeId = assignment.getFeedbackRequest().getTargetEmployeeId();
        Long evaluatorEmployeeId = assignment.getEvaluatorEmployeeId();
        assignmentRepository.delete(assignment);
        feedbackOperationalService.audit(
                actorUserId,
                FeedbackOperationalService.ASSIGNMENT_REMOVED,
                FeedbackOperationalService.ENTITY_ASSIGNMENT,
                assignmentId,
                "campaignId=" + campaignId + ",targetEmployeeId=" + targetEmployeeId + ",evaluatorEmployeeId=" + evaluatorEmployeeId,
                null,
                "360 feedback evaluator assignment removed"
        );

        return buildAssignmentResponse(campaignId, null, List.of(
                "Evaluator #" + evaluatorEmployeeId + " removed from target employee #" + targetEmployeeId + "."
        ));
    }

    @Override
    @Transactional(readOnly = true)
    public List<PendingEvaluatorProjection> getPendingEvaluators(Long requestId) {
        return assignmentRepository.findPendingEvaluatorsByRequestId(requestId);
    }

    private void validateConfig(EvaluatorConfigDTO config) {
        if (config == null) {
            throw new BusinessValidationException("Evaluator configuration is required.");
        }
        boolean anyPeerSourceSelected = hasPeerSource(config);
        boolean anyEvaluatorSourceSelected = Boolean.TRUE.equals(config.getIncludeManager())
                || Boolean.TRUE.equals(config.getIncludeSelf())
                || Boolean.TRUE.equals(config.getIncludeSubordinates())
                || anyPeerSourceSelected;
        if (!anyEvaluatorSourceSelected) {
            throw new BusinessValidationException("Choose at least one evaluator source.");
        }
        if (anyPeerSourceSelected && (config.getPeerCount() == null || config.getPeerCount() <= 0)) {
            throw new BusinessValidationException("Peer count must be greater than zero when peer evaluators are enabled.");
        }
    }

    private void validateManualAssignment(FeedbackManualAssignmentRequest request, FeedbackRequest feedbackRequest) {
        User target = userRepository.findByEmployeeId(request.getTargetEmployeeId().intValue())
                .orElseThrow(() -> new ResourceNotFoundException("Target employee has no active user account."));
        User evaluator = userRepository.findByEmployeeId(request.getEvaluatorEmployeeId().intValue())
                .orElseThrow(() -> new ResourceNotFoundException("Evaluator employee has no active user account."));
        if (Boolean.FALSE.equals(target.getActive())) {
            throw new BusinessValidationException("Target employee must be active.");
        }
        if (Boolean.FALSE.equals(evaluator.getActive())) {
            throw new BusinessValidationException("Evaluator employee must be active.");
        }

        if (feedbackRequest.getCampaign() == null || feedbackRequest.getCampaign().getId() == null) {
            throw new BusinessValidationException("Invalid feedback request for manual assignment.");
        }

        FeedbackRelationshipType relationshipType = request.getRelationshipType();
        if (relationshipType == null) {
            throw new BusinessValidationException("Relationship type is required.");
        }

        if (relationshipType == FeedbackRelationshipType.SELF) {
            if (!Objects.equals(request.getTargetEmployeeId(), request.getEvaluatorEmployeeId())) {
                throw new BusinessValidationException("SELF assignments must use the same target and evaluator employee.");
            }
            return;
        }

        if (Objects.equals(request.getTargetEmployeeId(), request.getEvaluatorEmployeeId())) {
            throw new BusinessValidationException("Only SELF assignments can use the target employee as evaluator.");
        }

        if (relationshipType == FeedbackRelationshipType.MANAGER && !Objects.equals(target.getManagerId(), evaluator.getId())) {
            throw new BusinessValidationException("MANAGER assignment must use the target employee's direct manager. Use PROJECT_STAKEHOLDER for other manual reviewers.");
        }

        if (relationshipType == FeedbackRelationshipType.SUBORDINATE && !Objects.equals(evaluator.getManagerId(), target.getId())) {
            throw new BusinessValidationException("SUBORDINATE assignment must use an employee who directly reports to the target employee.");
        }

        if (relationshipType == FeedbackRelationshipType.PEER) {
            if (Objects.equals(target.getManagerId(), evaluator.getId())) {
                throw new BusinessValidationException("The target employee's manager cannot be added as a PEER evaluator.");
            }
            if (Objects.equals(evaluator.getManagerId(), target.getId())) {
                throw new BusinessValidationException("A direct subordinate cannot be added as a PEER evaluator.");
            }
        }
    }

    private FeedbackAssignmentGenerationResponse buildAssignmentResponse(
            Long campaignId,
            EvaluatorConfigDTO config,
            List<String> extraWarnings
    ) {
        List<FeedbackRequest> requests = feedbackRequestRepository.findByCampaignIdOrderByTargetEmployeeIdAsc(campaignId);
        List<FeedbackEvaluatorAssignment> assignments = assignmentRepository.findByCampaignIdWithRequest(campaignId);
        Map<Long, List<FeedbackEvaluatorAssignment>> assignmentsByRequestId = assignments.stream()
                .collect(Collectors.groupingBy(a -> a.getFeedbackRequest().getId()));

        List<String> warnings = new ArrayList<>(extraWarnings == null ? List.of() : extraWarnings);
        List<FeedbackAssignmentPreviewItemResponse> previewItems = requests.stream()
                .map(request -> buildPreviewItem(request, assignmentsByRequestId.getOrDefault(request.getId(), List.of()), warnings))
                .toList();

        return FeedbackAssignmentGenerationResponse.builder()
                .campaignId(campaignId)
                .totalTargets(requests.size())
                .totalEvaluatorsGenerated(assignments.size())
                .evaluatorConfig(config)
                .requests(previewItems)
                .assignmentDetails(buildAssignmentDetails(assignments))
                .warnings(warnings.stream().distinct().toList())
                .build();
    }

    private FeedbackAssignmentPreviewItemResponse buildPreviewItem(
            FeedbackRequest request,
            List<FeedbackEvaluatorAssignment> assignments,
            List<String> campaignWarnings
    ) {
        Map<FeedbackRelationshipType, Long> countsByType = assignments.stream()
                .collect(Collectors.groupingBy(
                        FeedbackEvaluatorAssignment::getRelationshipType,
                        () -> new EnumMap<>(FeedbackRelationshipType.class),
                        Collectors.counting()
                ));
        long autoCount = assignments.stream()
                .filter(assignment -> assignment.getSelectionMethod() == EvaluatorSelectionMethod.AUTO_RANDOM)
                .count();
        long manualCount = assignments.stream()
                .filter(assignment -> assignment.getSelectionMethod() == EvaluatorSelectionMethod.MANUAL)
                .count();

        List<String> targetWarnings = new ArrayList<>();
        if (assignments.isEmpty()) {
            targetWarnings.add("Target employee " + request.getTargetEmployeeId() + " has no evaluator assignments yet.");
        }
        campaignWarnings.addAll(targetWarnings);

        return FeedbackAssignmentPreviewItemResponse.builder()
                .requestId(request.getId())
                .targetEmployeeId(request.getTargetEmployeeId())
                .targetEmployeeName(resolveEmployeeNameForId(request.getTargetEmployeeId()))
                .managerAssignments(countsByType.getOrDefault(FeedbackRelationshipType.MANAGER, 0L).intValue())
                .selfAssignments(countsByType.getOrDefault(FeedbackRelationshipType.SELF, 0L).intValue())
                .subordinateAssignments(countsByType.getOrDefault(FeedbackRelationshipType.SUBORDINATE, 0L).intValue())
                .peerAssignments(countsByType.getOrDefault(FeedbackRelationshipType.PEER, 0L).intValue())
                .projectStakeholderAssignments(countsByType.getOrDefault(FeedbackRelationshipType.PROJECT_STAKEHOLDER, 0L).intValue())
                .totalAssignments(assignments.size())
                .autoAssignments((int) autoCount)
                .manualAssignments((int) manualCount)
                .warnings(targetWarnings)
                .build();
    }

    private List<FeedbackAssignmentDetailItemResponse> buildAssignmentDetails(Long campaignId) {
        return buildAssignmentDetails(assignmentRepository.findByCampaignIdWithRequest(campaignId));
    }

    private List<FeedbackAssignmentDetailItemResponse> buildAssignmentDetails(List<FeedbackEvaluatorAssignment> assignments) {
        Set<Integer> employeeIds = assignments.stream()
                .flatMap(assignment -> List.of(
                        assignment.getFeedbackRequest().getTargetEmployeeId(),
                        assignment.getEvaluatorEmployeeId()
                ).stream())
                .filter(Objects::nonNull)
                .map(Long::intValue)
                .collect(Collectors.toCollection(LinkedHashSet::new));

        Map<Integer, User> usersByEmployeeId = employeeIds.stream()
                .map(userRepository::findByEmployeeId)
                .flatMap(optional -> optional.stream())
                .collect(Collectors.toMap(User::getEmployeeId, Function.identity(), (left, right) -> left));

        return assignments.stream()
                .map(assignment -> {
                    Long targetEmployeeId = assignment.getFeedbackRequest().getTargetEmployeeId();
                    Long evaluatorEmployeeId = assignment.getEvaluatorEmployeeId();
                    return FeedbackAssignmentDetailItemResponse.builder()
                            .assignmentId(assignment.getId())
                            .requestId(assignment.getFeedbackRequest().getId())
                            .targetEmployeeId(targetEmployeeId)
                            .targetEmployeeName(resolveEmployeeName(usersByEmployeeId, targetEmployeeId))
                            .evaluatorEmployeeId(evaluatorEmployeeId)
                            .evaluatorEmployeeName(resolveEmployeeName(usersByEmployeeId, evaluatorEmployeeId))
                            .relationshipType(assignment.getRelationshipType())
                            .selectionMethod(assignment.getSelectionMethod())
                            .status(assignment.getStatus())
                            .anonymous(assignment.getIsAnonymous())
                            .build();
                })
                .toList();
    }

    private String resolveEmployeeName(Map<Integer, User> usersByEmployeeId, Long employeeId) {
        if (employeeId == null) {
            return null;
        }
        User user = usersByEmployeeId.get(employeeId.intValue());
        if (user == null || user.getFullName() == null || user.getFullName().isBlank()) {
            return "Employee #" + employeeId;
        }
        return user.getFullName();
    }

    private String resolveEmployeeNameForId(Long employeeId) {
        if (employeeId == null) {
            return null;
        }
        return userRepository.findByEmployeeId(employeeId.intValue())
                .map(user -> user.getFullName() == null || user.getFullName().isBlank()
                        ? "Employee #" + employeeId
                        : user.getFullName())
                .orElse("Employee #" + employeeId);
    }

    private FeedbackCampaign getCampaignOrThrow(Long campaignId) {
        return feedbackCampaignRepository.findById(campaignId)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback campaign not found."));
    }

    private void ensureDraftCampaign(FeedbackCampaign campaign, String message) {
        if (campaign.getStatus() != FeedbackCampaignStatus.DRAFT) {
            throw new BusinessValidationException(message);
        }
    }

    private boolean hasPeerSource(EvaluatorConfigDTO config) {
        return Boolean.TRUE.equals(config.getIncludeTeamPeers())
                || isDepartmentPeerSelectionEnabled(config)
                || Boolean.TRUE.equals(config.getIncludeProjectPeers())
                || Boolean.TRUE.equals(config.getIncludeCrossTeamPeers());
    }

    private boolean isDepartmentPeerSelectionEnabled(EvaluatorConfigDTO config) {
        return Boolean.TRUE.equals(config.getIncludeDepartmentPeers())
                || (config.getIncludeDepartmentPeers() == null && Boolean.TRUE.equals(config.getIncludeTeamPeers()));
    }

    private int requestedPeerCount(EvaluatorConfigDTO config) {
        return config.getPeerCount() == null ? 0 : config.getPeerCount();
    }

    private boolean addAssignment(
            List<FeedbackEvaluatorAssignment> assignmentsToSave,
            Set<Long> assignedEvaluatorEmployeeIds,
            FeedbackRequest request,
            Long evaluatorEmployeeId,
            FeedbackRelationshipType relationshipType,
            EvaluatorSelectionMethod selectionMethod
    ) {
        if (evaluatorEmployeeId == null || !assignedEvaluatorEmployeeIds.add(evaluatorEmployeeId)) {
            return false;
        }
        assignmentsToSave.add(createAssignment(request, evaluatorEmployeeId, relationshipType, selectionMethod));
        return true;
    }

    private FeedbackEvaluatorAssignment createAssignment(
            FeedbackRequest request,
            Long evaluatorEmployeeId,
            FeedbackRelationshipType relationshipType,
            EvaluatorSelectionMethod selectionMethod
    ) {
        FeedbackEvaluatorAssignment assignment = new FeedbackEvaluatorAssignment();
        assignment.setFeedbackRequest(request);
        assignment.setEvaluatorEmployeeId(evaluatorEmployeeId);
        assignment.setRelationshipType(relationshipType);
        assignment.setSelectionMethod(selectionMethod);
        assignment.setIsAnonymous(isAnonymous(relationshipType));
        assignment.setStatus(AssignmentStatus.PENDING);
        return assignment;
    }

    private boolean isAnonymous(FeedbackRelationshipType relationshipType) {
        return relationshipType == FeedbackRelationshipType.PEER
                || relationshipType == FeedbackRelationshipType.SUBORDINATE;
    }

    private Long resolveManagerEmployeeId(User targetUser) {
        if (targetUser.getManagerId() == null) {
            return null;
        }
        return userRepository.findById(targetUser.getManagerId())
                .filter(manager -> !Boolean.FALSE.equals(manager.getActive()))
                .map(User::getEmployeeId)
                .filter(Objects::nonNull)
                .map(Integer::longValue)
                .orElse(null);
    }

    private Set<Long> findDirectSubordinateEmployeeIds(User targetUser) {
        return userRepository.findByManagerIdAndActiveTrue(targetUser.getId()).stream()
                .map(User::getEmployeeId)
                .filter(Objects::nonNull)
                .map(Integer::longValue)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private LinkedHashSet<Long> filterEligiblePeerPool(
            Set<Long> rawPeerPool,
            Long targetEmployeeId,
            Long managerEmployeeId,
            Set<Long> subordinateEmployeeIds,
            Set<Long> alreadyAssignedEmployeeIds
    ) {
        LinkedHashSet<Long> filtered = new LinkedHashSet<>(rawPeerPool == null ? Set.of() : rawPeerPool);
        filtered.remove(null);
        filtered.remove(targetEmployeeId);
        if (managerEmployeeId != null) {
            filtered.remove(managerEmployeeId);
        }
        if (subordinateEmployeeIds != null) {
            subordinateEmployeeIds.forEach(filtered::remove);
        }
        if (alreadyAssignedEmployeeIds != null) {
            alreadyAssignedEmployeeIds.forEach(filtered::remove);
        }
        return filtered.stream()
                .filter(this::hasActiveUserForEmployeeId)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private boolean hasActiveUserForEmployeeId(Long employeeId) {
        if (employeeId == null) {
            return false;
        }
        return userRepository.findByEmployeeId(employeeId.intValue())
                .filter(user -> !Boolean.FALSE.equals(user.getActive()))
                .isPresent();
    }

    private List<Long> selectPeers(Set<Long> peerPool, int peerCount) {
        if (peerPool.isEmpty() || peerCount <= 0) {
            return List.of();
        }
        List<Long> candidates = new ArrayList<>(peerPool);
        Collections.shuffle(candidates);
        return candidates.stream().limit(peerCount).toList();
    }

    private Set<Long> findDepartmentPeerEmployeeIds(User targetUser) {
        if (targetUser.getDepartmentId() == null) {
            return Set.of();
        }
        return userRepository.findByDepartmentIdAndActiveTrue(targetUser.getDepartmentId()).stream()
                .filter(candidate -> candidate.getEmployeeId() != null)
                .filter(candidate -> !Objects.equals(candidate.getId(), targetUser.getId()))
                .map(candidate -> candidate.getEmployeeId().longValue())
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private Set<Long> findTeamPeerEmployeeIds(User targetUser) {
        Set<Long> employeeIds = new LinkedHashSet<>();
        for (Team team : findActiveTeams(targetUser)) {
            if (team.getTeamLeader() != null
                    && team.getTeamLeader().getEmployeeId() != null
                    && !Boolean.FALSE.equals(team.getTeamLeader().getActive())) {
                employeeIds.add(team.getTeamLeader().getEmployeeId().longValue());
            }
            List<TeamMember> members = team.getTeamMembers() != null
                    ? team.getTeamMembers()
                    : teamMemberRepository.findByTeamId(team.getId());
            for (TeamMember member : members) {
                if (member.getMemberUser() != null
                        && member.getMemberUser().getEmployeeId() != null
                        && !Boolean.FALSE.equals(member.getMemberUser().getActive())) {
                    employeeIds.add(member.getMemberUser().getEmployeeId().longValue());
                }
            }
        }
        return employeeIds;
    }

    private Set<Long> findCrossTeamPeerEmployeeIds(User targetUser, Set<Integer> targetTeamIds) {
        Set<Long> candidateEmployeeIds = new LinkedHashSet<>();

        for (User candidate : findActiveUsers()) {
            if (candidate.getEmployeeId() == null || Objects.equals(candidate.getId(), targetUser.getId())) {
                continue;
            }
            if (targetUser.getDepartmentId() != null
                    && !Objects.equals(candidate.getDepartmentId(), targetUser.getDepartmentId())) {
                continue;
            }
            Set<Integer> candidateTeamIds = findActiveTeamIds(candidate);
            if (!targetTeamIds.isEmpty()) {
                if (candidateTeamIds.isEmpty() || !Collections.disjoint(candidateTeamIds, targetTeamIds)) {
                    continue;
                }
            } else if (candidateTeamIds.isEmpty()) {
                continue;
            }
            candidateEmployeeIds.add(candidate.getEmployeeId().longValue());
        }

        return candidateEmployeeIds;
    }

    private List<User> findActiveUsers() {
        return userRepository.findAll().stream()
                .filter(candidate -> !Boolean.FALSE.equals(candidate.getActive()))
                .sorted(Comparator.comparing(User::getId))
                .toList();
    }

    private List<Team> findActiveTeams(User user) {
        Map<Integer, Team> teams = teamMemberRepository.findByMemberUserId(user.getId()).stream()
                .map(TeamMember::getTeam)
                .filter(Objects::nonNull)
                .filter(team -> "Active".equalsIgnoreCase(team.getStatus()))
                .collect(Collectors.toMap(Team::getId, team -> team, (left, right) -> left));

        for (Team ledTeam : teamRepository.findByTeamLeaderIdAndStatusIgnoreCase(user.getId(), "Active")) {
            teams.put(ledTeam.getId(), ledTeam);
        }

        return teams.values().stream()
                .sorted(Comparator.comparing(Team::getId))
                .toList();
    }

    private Set<Integer> findActiveTeamIds(User user) {
        return findActiveTeams(user).stream()
                .map(Team::getId)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }
}
