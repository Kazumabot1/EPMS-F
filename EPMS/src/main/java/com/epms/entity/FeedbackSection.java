package com.epms.entity;

import jakarta.persistence.*;

import java.util.List;

@Entity
@Table(name = "feedback_section")
public class FeedbackSection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long feedbackSectionId;

    private String title;

    private Integer orderNo;

    @ManyToOne
    @JoinColumn(name = "feedback_form_id")
    private FeedbackForm feedbackForm;

    @OneToMany(mappedBy = "section", cascade = CascadeType.ALL)
    private List<FeedbackQuestion> questions;
}
