package com.epms.entity;

import jakarta.persistence.*;

import java.util.List;

@Entity
@Table(name = "feedback_form")
public class FeedbackForm {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long feedbackFormId;

    private Long cycleId;

    private String formName;

    private Boolean anonymousAllowed;

    private String status;

    private Long createdByUserId;

    @OneToMany(mappedBy = "feedbackForm", cascade = CascadeType.ALL)
    private List<FeedbackSection> sections;
}