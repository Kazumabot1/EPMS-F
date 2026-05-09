package com.epms.repository;

import com.epms.entity.OneOnOneActionItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OneOnOneActionItemRepository extends JpaRepository<OneOnOneActionItem, Integer> {

    Optional<OneOnOneActionItem> findByMeetingId(Integer meetingId);

    List<OneOnOneActionItem> findAllByOrderByUpdatedAtDesc();
}