package com.epms.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.util.Date;

@Entity
@Table(name = "one_on_one_action_items")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class OneOnOneActionItem {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    private Integer meetingId;
    private String description;
    private String owner;
    @Temporal(TemporalType.DATE)
    private Date dueDate;
    private String status; // PENDING, COMPLETED
    @Temporal(TemporalType.TIMESTAMP)
    private Date createdAt = new Date();
}