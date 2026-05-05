package com.epms.service;

import com.epms.entity.FeedbackForm;
import java.util.List;

public interface FeedbackFormService {
    FeedbackForm createForm(FeedbackForm form);
    FeedbackForm updateFormStructure(Long formId, FeedbackForm form);
    FeedbackForm createNewVersion(Long formId, FeedbackForm newForm);
    FeedbackForm changeFormStatus(Long formId, com.epms.entity.enums.FeedbackFormStatus newStatus);
    FeedbackForm getFormById(Long formId);
    List<FeedbackForm> getAllForms();
    List<FeedbackForm> getAllActiveForms();
    List<FeedbackForm> getFormVersions(Long formId);
}