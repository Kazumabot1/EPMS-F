//package com.epms.entity;
//
//import jakarta.persistence.*;
//import lombok.Data;
//import lombok.NoArgsConstructor;
//import lombok.AllArgsConstructor;
//import java.util.Date;
//
//@Entity
//@Table(name = "pip_updates")
//@Data
//@NoArgsConstructor
//@AllArgsConstructor
//public class PipUpdate {
//    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
//    private Integer id;
//    private Integer pipId;
//    private String comments;
//    private String status;
//    private Integer updatedBy;
//    @Temporal(TemporalType.TIMESTAMP)
//    private Date updatedAt = new Date();
//}


package com.epms.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Why this file exists:
 * - This table tracks PIP history.
 * - Every important action is stored here:
 *   PIP_CREATED, PHASE_UPDATED, PIP_FINISHED, etc.
 * - It lets HR/manager know who edited, when edited, and what changed.
 * - comments can store extra notes from the creator.
 */
@Entity
@Table(name = "pip_updates")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PipUpdate {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "pip_id", nullable = false)
    private Integer pipId;

    @Column(name = "phase_id")
    private Integer phaseId;

    @Column(name = "action_type", length = 80)
    private String actionType;

    @Column(name = "old_value", length = 4000)
    private String oldValue;

    @Column(name = "new_value", length = 4000)
    private String newValue;

    @Column(name = "comments", length = 4000)
    private String comments;

    @Column(name = "updated_by")
    private Integer updatedBy;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    /*
     * Kept for compatibility with the old PipUpdate DTO/service.
     * The new feature mainly uses actionType, oldValue, newValue, and comments.
     */
    @Column(name = "status", length = 80)
    private String status;
}