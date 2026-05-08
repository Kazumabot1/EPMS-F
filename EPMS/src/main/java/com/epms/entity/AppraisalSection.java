package com.epms.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "appraisal_sections")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AppraisalSection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "form_id")
    private AppraisalForm form;

    private String title;

    @Column(name = "order_no")
    private Integer orderNo;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }

    @Builder.Default
    @OneToMany(mappedBy = "section", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("weight DESC")
    private List<AppraisalQuestion> questions = new ArrayList<>();

    public void addQuestion(AppraisalQuestion question) {
        questions.add(question);
        question.setSection(this);
    }
}
