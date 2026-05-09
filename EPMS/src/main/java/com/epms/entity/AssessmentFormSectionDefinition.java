package com.epms.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "assessment_form_sections")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AssessmentFormSectionDefinition {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "form_id", nullable = false)
    private AssessmentFormDefinition form;

    @Column(nullable = false, length = 180)
    private String title;

    @Column(name = "order_no", nullable = false)
    private Integer orderNo = 1;

    @OneToMany(
            mappedBy = "section",
            cascade = CascadeType.ALL,
            orphanRemoval = true,
            fetch = FetchType.LAZY
    )
    @OrderBy("id ASC")
    private List<AssessmentFormQuestionDefinition> questions = new ArrayList<>();

    @PrePersist
    public void prePersist() {
        if (orderNo == null) {
            orderNo = 1;
        }
    }
}