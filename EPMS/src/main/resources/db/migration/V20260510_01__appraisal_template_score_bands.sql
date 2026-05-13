CREATE TABLE IF NOT EXISTS appraisal_template_score_band (
    id INT AUTO_INCREMENT PRIMARY KEY,
    template_id INT NOT NULL,
    min_score INT NOT NULL,
    max_score INT NOT NULL,
    label VARCHAR(100) NOT NULL,
    description TEXT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    active BIT(1) NOT NULL DEFAULT b'1',
    CONSTRAINT fk_appraisal_template_score_band_template
        FOREIGN KEY (template_id) REFERENCES appraisal_form_template(id)
);
