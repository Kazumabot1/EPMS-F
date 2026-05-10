package com.epms.entity;

import com.epms.entity.enums.AppraisalCycleType;
import com.epms.entity.enums.AppraisalTemplateStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

@Entity
@Table(name = "appraisal_form_template")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AppraisalFormTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, length = 180)
    private String templateName;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "appraisee_signature_id")
    private Long appraiseeSignatureId;

    @Column(name = "appraiser_signature_id")
    private Long appraiserSignatureId;

    @Column(name = "hr_signature_id")
    private Long hrSignatureId;

    @Column(name = "signature_date_format", length = 20)
    private String signatureDateFormat = "DD/MM/YYYY";

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private AppraisalCycleType formType;

    /**
     * true = template can be used by every department.
     * false = use AppraisalTemplateDepartment rows as the selected departments.
     */
    @Column(nullable = false)
    private Boolean targetAllDepartments = false;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private AppraisalTemplateStatus status = AppraisalTemplateStatus.DRAFT;

    @Column(nullable = false)
    private Integer versionNo = 1;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_user_id")
    private User createdByUser;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(nullable = false, updatable = false)
    private Date createdAt;

    @Temporal(TemporalType.TIMESTAMP)
    private Date updatedAt;


    @OneToMany(mappedBy = "template", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<AppraisalTemplateDepartment> targetDepartments = new ArrayList<>();

    @OneToMany(mappedBy = "template", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("sortOrder ASC")
    private List<AppraisalSection> sections = new ArrayList<>();

    @OneToMany(mappedBy = "template", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("sortOrder ASC")
    private List<AppraisalTemplateScoreBand> scoreBands = new ArrayList<>();

    @OneToMany(mappedBy = "template", fetch = FetchType.LAZY)
    private List<AppraisalCycle> cycles = new ArrayList<>();

    @PrePersist
    public void prePersist() {
        Date now = new Date();
        this.createdAt = now;
        this.updatedAt = now;
        if (this.status == null) {
            this.status = AppraisalTemplateStatus.DRAFT;
        }
        if (this.versionNo == null) {
            this.versionNo = 1;
        }
        if (this.targetAllDepartments == null) {
            this.targetAllDepartments = false;
        }
        if (this.signatureDateFormat == null || this.signatureDateFormat.isBlank()) {
            this.signatureDateFormat = "DD/MM/YYYY";
        }
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = new Date();
    }
}
