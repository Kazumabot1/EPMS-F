package com.epms.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.util.Date;

@Entity
@Table(name = "pip_updates")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PipUpdate {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    private Integer pipId;
    private String comments;
    private String status;
    private Integer updatedBy;
    @Temporal(TemporalType.TIMESTAMP)
    private Date updatedAt = new Date();
}