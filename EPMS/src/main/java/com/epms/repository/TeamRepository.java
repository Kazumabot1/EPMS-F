/*

package com.epms.repository;

import com.epms.entity.Team;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

*/
/**
 * Why this file is modified:
 * - PIP permission depends on team relationship.
 * - Team Leader can create PIP only for employees in their team.
 * - Department Head can create PIP for employees in their department.
 * - These queries load team leader, department, and team members together.
 *//*

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
*/




/*

package com.epms.repository;

import com.epms.entity.Team;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TeamRepository extends JpaRepository<Team, Integer> {
    long count();

    @Override
    @EntityGraph(attributePaths = {"teamLeader", "department", "teamMembers", "teamMembers.memberUser"})
    List<Team> findAll();

    @EntityGraph(attributePaths = {"teamLeader", "department", "teamMembers", "teamMembers.memberUser"})
    List<Team> findByTeamLeaderId(Integer teamLeaderId);

    @EntityGraph(attributePaths = {"teamLeader", "department", "teamMembers", "teamMembers.memberUser"})
    List<Team> findByTeamLeaderIdAndStatusIgnoreCase(Integer teamLeaderId, String status);

    @EntityGraph(attributePaths = {"teamLeader", "department", "teamMembers", "teamMembers.memberUser"})
    List<Team> findByDepartmentId(Integer departmentId);

    @EntityGraph(attributePaths = {"teamLeader", "department", "teamMembers", "teamMembers.memberUser"})
    List<Team> findByDepartmentIdAndStatusIgnoreCase(Integer departmentId, String status);
}*/









/*

package com.epms.repository;

import com.epms.entity.Team;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TeamRepository extends JpaRepository<Team, Integer> {
    long count();

    @EntityGraph(attributePaths = {
            "teamLeader",
            "teamLeader.position",
            "createdByUser",
            "createdByUser.position",
            "department",
            "teamMembers",
            "teamMembers.memberUser",
            "teamMembers.memberUser.position"
    })
    List<Team> findByTeamLeaderId(Integer teamLeaderId);

    @EntityGraph(attributePaths = {
            "teamLeader",
            "teamLeader.position",
            "createdByUser",
            "createdByUser.position",
            "department",
            "teamMembers",
            "teamMembers.memberUser",
            "teamMembers.memberUser.position"
    })
    List<Team> findByTeamLeaderIdAndStatusIgnoreCase(Integer teamLeaderId, String status);

    @EntityGraph(attributePaths = {
            "teamLeader",
            "teamLeader.position",
            "createdByUser",
            "createdByUser.position",
            "department",
            "teamMembers",
            "teamMembers.memberUser",
            "teamMembers.memberUser.position"
    })
    List<Team> findByDepartmentId(Integer departmentId);
}*/










package com.epms.repository;

import com.epms.entity.Team;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TeamRepository extends JpaRepository<Team, Integer> {
    long count();

    @Override
    @EntityGraph(attributePaths = {
            "teamLeader",
            "teamLeader.position",
            "projectManager",
            "projectManager.position",
            "createdByUser",
            "createdByUser.position",
            "department",
            "teamMembers",
            "teamMembers.memberUser",
            "teamMembers.memberUser.position"
    })
    List<Team> findAll();

    @EntityGraph(attributePaths = {
            "teamLeader",
            "teamLeader.position",
            "projectManager",
            "projectManager.position",
            "createdByUser",
            "createdByUser.position",
            "department",
            "teamMembers",
            "teamMembers.memberUser",
            "teamMembers.memberUser.position"
    })
    List<Team> findByTeamLeaderId(Integer teamLeaderId);

    @EntityGraph(attributePaths = {
            "teamLeader",
            "teamLeader.position",
            "projectManager",
            "projectManager.position",
            "createdByUser",
            "createdByUser.position",
            "department",
            "teamMembers",
            "teamMembers.memberUser",
            "teamMembers.memberUser.position"
    })
    List<Team> findByTeamLeaderIdAndStatusIgnoreCase(Integer teamLeaderId, String status);

    @EntityGraph(attributePaths = {
            "teamLeader",
            "teamLeader.position",
            "projectManager",
            "projectManager.position",
            "createdByUser",
            "createdByUser.position",
            "department",
            "teamMembers",
            "teamMembers.memberUser",
            "teamMembers.memberUser.position"
    })
    List<Team> findByDepartmentId(Integer departmentId);

    @EntityGraph(attributePaths = {
            "teamLeader",
            "teamLeader.position",
            "projectManager",
            "projectManager.position",
            "createdByUser",
            "createdByUser.position",
            "department",
            "teamMembers",
            "teamMembers.memberUser",
            "teamMembers.memberUser.position"
    })
    List<Team> findByDepartmentIdAndStatusIgnoreCase(Integer departmentId, String status);

    @EntityGraph(attributePaths = {
            "teamLeader",
            "teamLeader.position",
            "projectManager",
            "projectManager.position",
            "createdByUser",
            "createdByUser.position",
            "department",
            "teamMembers",
            "teamMembers.memberUser",
            "teamMembers.memberUser.position"
    })
    List<Team> findByProjectManagerId(Integer projectManagerId);

    @EntityGraph(attributePaths = {
            "teamLeader",
            "teamLeader.position",
            "projectManager",
            "projectManager.position",
            "createdByUser",
            "createdByUser.position",
            "department",
            "teamMembers",
            "teamMembers.memberUser",
            "teamMembers.memberUser.position"
    })
    List<Team> findByProjectManagerIdAndStatusIgnoreCase(Integer projectManagerId, String status);
}