package com.epms.entity;

import jakarta.persistence.*;

import java.util.List;

@Entity
@Table(name = "feedback_question")
public class FeedbackQuestion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long feedbackQuestionId;

    private String questionText;

    private Integer questionOrder;

    private Boolean isRequired;

    private Long ratingScaleId;

    @ManyToOne
    @JoinColumn(name = "feedback_section_id")
    private FeedbackSection section;

    @OneToMany(mappedBy = "feedbackQuestion", cascade = CascadeType.ALL)
    private List<FeedbackResponseItem> responseItems;
}
