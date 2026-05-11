package com.epms.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "assessment_form_questions")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AssessmentFormQuestionDefinition {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "section_id", nullable = false)
    private AssessmentFormSectionDefinition section;

    @Column(name = "question_text", nullable = false, columnDefinition = "TEXT")
    private String questionText;

    @Column(name = "response_type", nullable = false, length = 30)
    private String responseType = "YES_NO_RATING";

    @Column(name = "is_required", nullable = false)
    private Boolean required = true;

    @Column(nullable = false)
    private Double weight = 1.0;

    @PrePersist
    public void prePersist() {
        if (responseType == null || responseType.isBlank()) {
            responseType = "YES_NO_RATING";
        }

        if (required == null) {
            required = true;
        }

        if (weight == null) {
            weight = 1.0;
        }
    }
}