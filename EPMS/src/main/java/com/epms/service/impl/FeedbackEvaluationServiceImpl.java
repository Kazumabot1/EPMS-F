package com.epms.service.impl;

import com.epms.dto.EvaluatorConfigDTO;
import com.epms.dto.FeedbackAssignmentGenerationResponse;
import com.epms.dto.FeedbackAssignmentPreviewItemResponse;
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
import com.epms.service.ProjectPeerDirectory;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
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

    @Override
    @Transactional
    public FeedbackAssignmentGenerationResponse generateAssignments(Long campaignId, EvaluatorConfigDTO config) {
        validateConfig(config);

        FeedbackCampaign campaign = feedbackCampaignRepository.findById(campaignId)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback campaign not found."));
        if (campaign.getStatus() == FeedbackCampaignStatus.CLOSED) {
            throw new BusinessValidationException("Closed campaigns cannot generate evaluator assignments.");
        }

        List<FeedbackRequest> requests = feedbackRequestRepository.findByCampaignIdOrderByTargetEmployeeIdAsc(campaignId);
        if (requests.isEmpty()) {
            throw new BusinessValidationException("Select target employees before generating evaluator assignments.");
        }

        List<FeedbackEvaluatorAssignment> existingAssignments = requests.stream()
                .flatMap(request -> assignmentRepository.findByFeedbackRequestId(request.getId()).stream())
                .toList();
        if (!existingAssignments.isEmpty()) {
            assignmentRepository.deleteAll(existingAssignments);
        }

        List<String> warnings = new ArrayList<>();
        List<FeedbackEvaluatorAssignment> assignmentsToSave = new ArrayList<>();
        List<FeedbackAssignmentPreviewItemResponse> previewItems = new ArrayList<>();

        for (FeedbackRequest request : requests) {
            User targetUser = userRepository.findByEmployeeId(request.getTargetEmployeeId().intValue())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "No user account is linked to target employee " + request.getTargetEmployeeId() + "."
                    ));

            Set<Integer> targetTeamIds = findActiveTeamIds(targetUser);
            Long managerEmployeeId = null;
            int managerAssignments = 0;
            int peerAssignments = 0;

            if (Boolean.TRUE.equals(config.getIncludeManager())) {
                managerEmployeeId = resolveManagerEmployeeId(targetUser);
                if (managerEmployeeId != null) {
                    assignmentsToSave.add(createAssignment(
                            request,
                            managerEmployeeId,
                            FeedbackRelationshipType.MANAGER,
                            EvaluatorSelectionMethod.MANUAL
                    ));
                    managerAssignments = 1;
                } else {
                    warnings.add("No direct manager found for target employee " + request.getTargetEmployeeId() + ".");
                }
            }

            LinkedHashSet<Long> peerPool = new LinkedHashSet<>();
            if (Boolean.TRUE.equals(config.getIncludeTeamPeers())) {
                peerPool.addAll(findTeamPeerEmployeeIds(targetUser));
            }
            if (Boolean.TRUE.equals(config.getIncludeProjectPeers())) {
                peerPool.addAll(projectPeerDirectory.findProjectPeerEmployeeIds(targetUser));
                if (!projectPeerDirectory.isConfigured()) {
                    warnings.add("Project-peer selection is enabled, but no project membership directory is configured yet.");
                }
            }
            if (Boolean.TRUE.equals(config.getIncludeCrossTeamPeers())) {
                peerPool.addAll(findCrossTeamPeerEmployeeIds(targetUser, targetTeamIds));
            }

            peerPool.remove(request.getTargetEmployeeId());
            if (managerEmployeeId != null) {
                peerPool.remove(managerEmployeeId);
            }

            List<Long> selectedPeers = selectPeers(peerPool, config.getPeerCount());
            if (hasPeerSource(config) && selectedPeers.size() < config.getPeerCount()) {
                warnings.add("Target employee " + request.getTargetEmployeeId()
                        + " has only " + selectedPeers.size()
                        + " eligible peer(s) for the requested peer count of " + config.getPeerCount() + ".");
            }
            for (Long peerEmployeeId : selectedPeers) {
                assignmentsToSave.add(createAssignment(
                        request,
                        peerEmployeeId,
                        FeedbackRelationshipType.PEER,
                        EvaluatorSelectionMethod.AUTO_RANDOM
                ));
            }
            peerAssignments = selectedPeers.size();

            previewItems.add(FeedbackAssignmentPreviewItemResponse.builder()
                    .requestId(request.getId())
                    .targetEmployeeId(request.getTargetEmployeeId())
                    .managerAssignments(managerAssignments)
                    .peerAssignments(peerAssignments)
                    .totalAssignments(managerAssignments + peerAssignments)
                    .build());
        }

        if (assignmentsToSave.isEmpty()) {
            throw new BusinessValidationException("No evaluator assignments could be generated from the selected configuration.");
        }

        assignmentRepository.saveAll(assignmentsToSave);

        return FeedbackAssignmentGenerationResponse.builder()
                .campaignId(campaignId)
                .totalTargets(requests.size())
                .totalEvaluatorsGenerated(assignmentsToSave.size())
                .evaluatorConfig(config)
                .requests(previewItems)
                .warnings(warnings.stream().distinct().toList())
                .build();
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
        if (config.getPeerCount() == null || config.getPeerCount() <= 0) {
            throw new BusinessValidationException("Peer count must be greater than zero.");
        }
        boolean anyPeerSourceSelected = hasPeerSource(config);
        if (!Boolean.TRUE.equals(config.getIncludeManager()) && !anyPeerSourceSelected) {
            throw new BusinessValidationException("Choose at least one evaluator source.");
        }
    }

    private boolean hasPeerSource(EvaluatorConfigDTO config) {
        return Boolean.TRUE.equals(config.getIncludeTeamPeers())
                || Boolean.TRUE.equals(config.getIncludeProjectPeers())
                || Boolean.TRUE.equals(config.getIncludeCrossTeamPeers());
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
                .map(User::getEmployeeId)
                .filter(Objects::nonNull)
                .map(Integer::longValue)
                .orElse(null);
    }

    private List<Long> selectPeers(Set<Long> peerPool, int peerCount) {
        if (peerPool.isEmpty()) {
            return List.of();
        }
        List<Long> candidates = new ArrayList<>(peerPool);
        Collections.shuffle(candidates);
        return candidates.stream().limit(peerCount).toList();
    }

    private Set<Long> findTeamPeerEmployeeIds(User targetUser) {
        Set<Long> employeeIds = new LinkedHashSet<>();
        for (Team team : findActiveTeams(targetUser)) {
            if (team.getTeamLeader() != null && team.getTeamLeader().getEmployeeId() != null) {
                employeeIds.add(team.getTeamLeader().getEmployeeId().longValue());
            }
            List<TeamMember> members = team.getTeamMembers() != null
                    ? team.getTeamMembers()
                    : teamMemberRepository.findByTeamId(team.getId());
            for (TeamMember member : members) {
                if (member.getMemberUser() != null && member.getMemberUser().getEmployeeId() != null) {
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
