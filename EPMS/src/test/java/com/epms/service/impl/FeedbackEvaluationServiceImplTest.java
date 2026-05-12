//package com.epms.service.impl;
//
//import com.epms.dto.EvaluatorConfigDTO;
//import com.epms.dto.FeedbackAssignmentGenerationResponse;
//import com.epms.entity.FeedbackCampaign;
//import com.epms.entity.FeedbackEvaluatorAssignment;
//import com.epms.entity.FeedbackRequest;
//import com.epms.entity.Team;
//import com.epms.entity.TeamMember;
//import com.epms.entity.User;
//import com.epms.entity.enums.AssignmentStatus;
//import com.epms.entity.enums.FeedbackCampaignStatus;
//import com.epms.entity.enums.FeedbackRelationshipType;
//import com.epms.exception.BusinessValidationException;
//import com.epms.repository.FeedbackCampaignRepository;
//import com.epms.repository.FeedbackEvaluatorAssignmentRepository;
//import com.epms.repository.FeedbackRequestRepository;
//import com.epms.repository.TeamMemberRepository;
//import com.epms.repository.TeamRepository;
//import com.epms.repository.UserRepository;
//import com.epms.service.ProjectPeerDirectory;
//import org.junit.jupiter.api.Test;
//import org.junit.jupiter.api.extension.ExtendWith;
//import org.mockito.ArgumentCaptor;
//import org.mockito.InjectMocks;
//import org.mockito.Mock;
//import org.mockito.junit.jupiter.MockitoExtension;
//
//import java.util.List;
//import java.util.Optional;
//
//import static org.assertj.core.api.Assertions.assertThat;
//import static org.assertj.core.api.Assertions.assertThatThrownBy;
//import static org.mockito.Mockito.verify;
//import static org.mockito.Mockito.when;
//
//@ExtendWith(MockitoExtension.class)
//class FeedbackEvaluationServiceImplTest {
//
//    @Mock
//    private FeedbackEvaluatorAssignmentRepository assignmentRepository;
//
//    @Mock
//    private FeedbackRequestRepository feedbackRequestRepository;
//
//    @Mock
//    private FeedbackCampaignRepository feedbackCampaignRepository;
//
//    @Mock
//    private UserRepository userRepository;
//
//    @Mock
//    private TeamMemberRepository teamMemberRepository;
//
//    @Mock
//    private TeamRepository teamRepository;
//
//    @Mock
//    private ProjectPeerDirectory projectPeerDirectory;
//
//    @InjectMocks
//    private FeedbackEvaluationServiceImpl service;
//
//    @Test
//    void generateAssignmentsCreatesManagerAndPeerAssignmentsWithCorrectAnonymity() {
//        FeedbackCampaign campaign = new FeedbackCampaign();
//        campaign.setId(5L);
//        campaign.setStatus(FeedbackCampaignStatus.DRAFT);
//
//        FeedbackRequest request = new FeedbackRequest();
//        request.setId(9L);
//        request.setCampaign(campaign);
//        request.setTargetEmployeeId(100L);
//
//        User targetUser = new User();
//        targetUser.setId(10);
//        targetUser.setEmployeeId(100);
//        targetUser.setManagerId(2);
//        targetUser.setActive(true);
//
//        User managerUser = new User();
//        managerUser.setId(2);
//        managerUser.setEmployeeId(200);
//        managerUser.setActive(true);
//
//        User peerUser = new User();
//        peerUser.setId(11);
//        peerUser.setEmployeeId(300);
//        peerUser.setActive(true);
//
//        Team team = new Team();
//        team.setId(1);
//        team.setStatus("Active");
//        team.setTeamLeader(managerUser);
//
//        TeamMember targetMember = new TeamMember();
//        targetMember.setTeam(team);
//        targetMember.setMemberUser(targetUser);
//
//        TeamMember peerMember = new TeamMember();
//        peerMember.setTeam(team);
//        peerMember.setMemberUser(peerUser);
//
//        team.setTeamMembers(List.of(targetMember, peerMember));
//
//        EvaluatorConfigDTO config = new EvaluatorConfigDTO();
//        config.setIncludeManager(true);
//        config.setIncludeTeamPeers(true);
//        config.setIncludeProjectPeers(false);
//        config.setIncludeCrossTeamPeers(false);
//        config.setPeerCount(1);
//
//        when(feedbackCampaignRepository.findById(5L)).thenReturn(Optional.of(campaign));
//        when(feedbackRequestRepository.findByCampaignIdOrderByTargetEmployeeIdAsc(5L)).thenReturn(List.of(request));
//        when(assignmentRepository.findByFeedbackRequestId(9L)).thenReturn(List.of());
//        when(userRepository.findByEmployeeId(100)).thenReturn(Optional.of(targetUser));
//        when(userRepository.findById(2)).thenReturn(Optional.of(managerUser));
//        when(userRepository.findByManagerIdAndActiveTrue(10)).thenReturn(List.of());
//        when(teamMemberRepository.findByMemberUserId(10)).thenReturn(List.of(targetMember));
//        when(teamRepository.findByTeamLeaderIdAndStatusIgnoreCase(10, "Active")).thenReturn(List.of());
//
//        FeedbackAssignmentGenerationResponse response = service
//                .generateAssignments(5L, config);
//
//        ArgumentCaptor<List<FeedbackEvaluatorAssignment>> captor = ArgumentCaptor.forClass(List.class);
//        verify(assignmentRepository).saveAll(captor.capture());
//        List<FeedbackEvaluatorAssignment> savedAssignments = captor.getValue();
//        assertThat(savedAssignments).hasSize(2);
//
//        FeedbackEvaluatorAssignment managerAssignment = savedAssignments.stream()
//                .filter(item -> item.getRelationshipType() == FeedbackRelationshipType.MANAGER)
//                .findFirst()
//                .orElseThrow();
//        FeedbackEvaluatorAssignment peerAssignment = savedAssignments.stream()
//                .filter(item -> item.getRelationshipType() == FeedbackRelationshipType.PEER)
//                .findFirst()
//                .orElseThrow();
//
//        assertThat(managerAssignment.getEvaluatorEmployeeId()).isEqualTo(200L);
//        assertThat(managerAssignment.getIsAnonymous()).isFalse();
//        assertThat(managerAssignment.getStatus()).isEqualTo(AssignmentStatus.PENDING);
//
//        assertThat(peerAssignment.getEvaluatorEmployeeId()).isEqualTo(300L);
//        assertThat(peerAssignment.getIsAnonymous()).isTrue();
//        assertThat(response.getTotalEvaluatorsGenerated()).isEqualTo(2);
//        assertThat(response.getTotalTargets()).isEqualTo(1);
//    }
//
//    @Test
//    void generateAssignmentsUsesDepartmentPeersWhenTargetHasNoTeam() {
//        FeedbackCampaign campaign = new FeedbackCampaign();
//        campaign.setId(6L);
//        campaign.setStatus(FeedbackCampaignStatus.DRAFT);
//
//        FeedbackRequest request = new FeedbackRequest();
//        request.setId(10L);
//        request.setCampaign(campaign);
//        request.setTargetEmployeeId(101L);
//
//        User targetUser = new User();
//        targetUser.setId(20);
//        targetUser.setEmployeeId(101);
//        targetUser.setDepartmentId(7);
//        targetUser.setActive(true);
//
//        User peerOne = new User();
//        peerOne.setId(21);
//        peerOne.setEmployeeId(301);
//        peerOne.setDepartmentId(7);
//        peerOne.setActive(true);
//
//        User peerTwo = new User();
//        peerTwo.setId(22);
//        peerTwo.setEmployeeId(302);
//        peerTwo.setDepartmentId(7);
//        peerTwo.setActive(true);
//
//        EvaluatorConfigDTO config = new EvaluatorConfigDTO();
//        config.setIncludeManager(false);
//        config.setIncludeTeamPeers(false);
//        config.setIncludeDepartmentPeers(true);
//        config.setIncludeProjectPeers(false);
//        config.setIncludeCrossTeamPeers(false);
//        config.setPeerCount(2);
//
//        when(feedbackCampaignRepository.findById(6L)).thenReturn(Optional.of(campaign));
//        when(feedbackRequestRepository.findByCampaignIdOrderByTargetEmployeeIdAsc(6L)).thenReturn(List.of(request));
//        when(assignmentRepository.findByFeedbackRequestId(10L)).thenReturn(List.of());
//        when(userRepository.findByEmployeeId(101)).thenReturn(Optional.of(targetUser));
//        when(userRepository.findByManagerIdAndActiveTrue(20)).thenReturn(List.of());
//        when(teamMemberRepository.findByMemberUserId(20)).thenReturn(List.of());
//        when(teamRepository.findByTeamLeaderIdAndStatusIgnoreCase(20, "Active")).thenReturn(List.of());
//        when(userRepository.findByDepartmentIdAndActiveTrue(7)).thenReturn(List.of(targetUser, peerOne, peerTwo));
//
//        FeedbackAssignmentGenerationResponse response = service.generateAssignments(6L, config);
//
//        ArgumentCaptor<List<FeedbackEvaluatorAssignment>> captor = ArgumentCaptor.forClass(List.class);
//        verify(assignmentRepository).saveAll(captor.capture());
//        List<FeedbackEvaluatorAssignment> savedAssignments = captor.getValue();
//
//        assertThat(savedAssignments).hasSize(2);
//        assertThat(savedAssignments)
//                .allMatch(item -> item.getRelationshipType() == FeedbackRelationshipType.PEER)
//                .extracting(FeedbackEvaluatorAssignment::getEvaluatorEmployeeId)
//                .containsExactlyInAnyOrder(301L, 302L);
//        assertThat(response.getRequests().get(0).getPeerAssignments()).isEqualTo(2);
//    }
//
//    @Test
//    void generateAssignmentsExcludesDirectSubordinatesFromPeerPool() {
//        FeedbackCampaign campaign = new FeedbackCampaign();
//        campaign.setId(7L);
//        campaign.setStatus(FeedbackCampaignStatus.DRAFT);
//
//        FeedbackRequest request = new FeedbackRequest();
//        request.setId(11L);
//        request.setCampaign(campaign);
//        request.setTargetEmployeeId(102L);
//
//        User targetUser = new User();
//        targetUser.setId(30);
//        targetUser.setEmployeeId(102);
//        targetUser.setDepartmentId(8);
//        targetUser.setActive(true);
//
//        User peerUser = new User();
//        peerUser.setId(31);
//        peerUser.setEmployeeId(401);
//        peerUser.setDepartmentId(8);
//        peerUser.setActive(true);
//
//        User subordinateUser = new User();
//        subordinateUser.setId(32);
//        subordinateUser.setEmployeeId(402);
//        subordinateUser.setDepartmentId(8);
//        subordinateUser.setManagerId(30);
//        subordinateUser.setActive(true);
//
//        EvaluatorConfigDTO config = new EvaluatorConfigDTO();
//        config.setIncludeManager(false);
//        config.setIncludeTeamPeers(false);
//        config.setIncludeDepartmentPeers(true);
//        config.setIncludeProjectPeers(false);
//        config.setIncludeCrossTeamPeers(false);
//        config.setIncludeSubordinates(true);
//        config.setPeerCount(1);
//
//        when(feedbackCampaignRepository.findById(7L)).thenReturn(Optional.of(campaign));
//        when(feedbackRequestRepository.findByCampaignIdOrderByTargetEmployeeIdAsc(7L)).thenReturn(List.of(request));
//        when(assignmentRepository.findByFeedbackRequestId(11L)).thenReturn(List.of());
//        when(userRepository.findByEmployeeId(102)).thenReturn(Optional.of(targetUser));
//        when(userRepository.findByManagerIdAndActiveTrue(30)).thenReturn(List.of(subordinateUser));
//        when(teamMemberRepository.findByMemberUserId(30)).thenReturn(List.of());
//        when(teamRepository.findByTeamLeaderIdAndStatusIgnoreCase(30, "Active")).thenReturn(List.of());
//        when(userRepository.findByDepartmentIdAndActiveTrue(8)).thenReturn(List.of(targetUser, peerUser, subordinateUser));
//
//        service.generateAssignments(7L, config);
//
//        ArgumentCaptor<List<FeedbackEvaluatorAssignment>> captor = ArgumentCaptor.forClass(List.class);
//        verify(assignmentRepository).saveAll(captor.capture());
//        List<FeedbackEvaluatorAssignment> savedAssignments = captor.getValue();
//
//        assertThat(savedAssignments).hasSize(2);
//        assertThat(savedAssignments.stream()
//                .filter(item -> item.getRelationshipType() == FeedbackRelationshipType.SUBORDINATE)
//                .map(FeedbackEvaluatorAssignment::getEvaluatorEmployeeId))
//                .containsExactly(402L);
//        assertThat(savedAssignments.stream()
//                .filter(item -> item.getRelationshipType() == FeedbackRelationshipType.PEER)
//                .map(FeedbackEvaluatorAssignment::getEvaluatorEmployeeId))
//                .containsExactly(401L);
//    }
//
//    @Test
//    void generateAssignmentsRejectsEmptyEvaluatorSourceSelection() {
//        EvaluatorConfigDTO config = new EvaluatorConfigDTO();
//        config.setIncludeManager(false);
//        config.setIncludeTeamPeers(false);
//        config.setIncludeDepartmentPeers(false);
//        config.setIncludeProjectPeers(false);
//        config.setIncludeCrossTeamPeers(false);
//        config.setPeerCount(1);
//
//        assertThatThrownBy(() -> service.generateAssignments(5L, config))
//                .isInstanceOf(BusinessValidationException.class)
//                .hasMessage("Choose at least one evaluator source.");
//    }
//}
