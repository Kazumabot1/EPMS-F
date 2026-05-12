/*
package com.epms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "position_levels")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PositionLevel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    // Example: LD1, LD2
    @Column(name = "level_code", nullable = false, unique = true)
    private String levelCode;

    // Optional reverse mapping
    @OneToMany(mappedBy = "level", fetch = FetchType.LAZY)
    private Set<Position> positions = new HashSet<>();
}*/

package com.epms.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "position_levels")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PositionLevel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "level_code", nullable = false, unique = true)
    private String levelCode;

    private Boolean active = true;

    @Temporal(TemporalType.TIMESTAMP)
    private Date createdAt = new Date();

    private Integer createdBy;

    @Temporal(TemporalType.TIMESTAMP)
    private Date updatedAt;

    @OneToMany(mappedBy = "level", fetch = FetchType.LAZY)
    private Set<Position> positions = new HashSet<>();
}