//package com.epms.repository;
//
//import com.epms.entity.Team;
//import org.springframework.data.jpa.repository.EntityGraph;
//import org.springframework.data.jpa.repository.JpaRepository;
//import org.springframework.stereotype.Repository;
//
//import java.util.List;
//import java.util.Optional;
//
//@Repository
//public interface TeamRepository extends JpaRepository<Team, Integer> {
//
//    @EntityGraph(attributePaths = {
//            "department",
//            "teamLeader",
//            "createdByUser",
//            "teamMembers",
//            "teamMembers.memberUser"
//    })
//    List<Team> findAll();
//
//    @EntityGraph(attributePaths = {
//            "department",
//            "teamLeader",
//            "createdByUser",
//            "teamMembers",
//            "teamMembers.memberUser"
//    })
//    Optional<Team> findById(Integer id);
//
//    @EntityGraph(attributePaths = {
//            "department",
//            "teamLeader",
//            "createdByUser",
//            "teamMembers",
//            "teamMembers.memberUser"
//    })
//    List<Team> findByDepartmentId(Integer departmentId);
//
//    List<Team> findByTeamLeaderId(Integer leaderId);
//
//    List<Team> findByTeamLeaderIdAndStatusIgnoreCase(Integer leaderId, String status);
//}

package com.epms.repository;

import com.epms.entity.Team;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Why this file is modified:
 * - PIP permission depends on team relationship.
 * - Team Leader can create PIP only for employees in their team.
 * - Department Head can create PIP for employees in their department.
 * - These queries load team leader, department, and team members together.
 */
@Repository
public interface TeamRepository extends JpaRepository<Team, Integer> {
    long count();

    @EntityGraph(attributePaths = {"teamLeader", "department", "teamMembers", "teamMembers.memberUser"})
    List<Team> findByTeamLeaderId(Integer teamLeaderId);

    @EntityGraph(attributePaths = {"teamLeader", "department", "teamMembers", "teamMembers.memberUser"})
    List<Team> findByTeamLeaderIdAndStatusIgnoreCase(Integer teamLeaderId, String status);

    @EntityGraph(attributePaths = {"teamLeader", "department", "teamMembers", "teamMembers.memberUser"})
    List<Team> findByDepartmentId(Integer departmentId);
}
