package com.epms.repository;

import com.epms.entity.Position;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PositionRepository extends JpaRepository<Position, Integer> {
    Optional<Position> findByPositionTitleIgnoreCase(String positionTitle);
}