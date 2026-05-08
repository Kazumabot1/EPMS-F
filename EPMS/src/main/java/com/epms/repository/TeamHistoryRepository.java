package com.epms.repository;

import com.epms.entity.TeamHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TeamHistoryRepository extends JpaRepository<TeamHistory, Integer> {

    List<TeamHistory> findByTeamIdOrderByChangedAtDesc(Integer teamId);

    List<TeamHistory> findByTeamDepartmentIdOrderByChangedAtDesc(Integer departmentId);
}