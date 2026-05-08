package com.epms.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Entity
@Table(name = "appraisal_forms")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AppraisalForm {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "form_name", nullable = false)
    private String formName;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Builder.Default
    @Column(name = "is_active")
    private Boolean isActive = true;

    /** Comma-separated role names this form targets, e.g. "Employee,Manager,DepartmentHead" */
    @Column(name = "target_roles", length = 500)
    private String targetRoles;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Builder.Default
    @OneToMany(mappedBy = "form", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("orderNo ASC")
    private List<AppraisalSection> sections = new ArrayList<>();

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }

    /** Convenience: parse targetRoles CSV into a list. */
    public List<String> getTargetRoleList() {
        if (targetRoles == null || targetRoles.isBlank()) return List.of();
        return Arrays.stream(targetRoles.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toList());
    }

    /** Convenience: set targetRoles from a list. */
    public void setTargetRoleList(List<String> roles) {
        if (roles == null || roles.isEmpty()) {
            this.targetRoles = null;
        } else {
            this.targetRoles = String.join(",", roles);
        }
    }
}
