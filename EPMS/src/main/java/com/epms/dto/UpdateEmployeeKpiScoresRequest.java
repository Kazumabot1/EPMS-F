package com.epms.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateEmployeeKpiScoresRequest {

    @NotEmpty
    @Valid
    private List<EmployeeKpiScoreUpdateDto> scores;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EmployeeKpiScoreUpdateDto {
        private Integer kpiFormItemId;
        /** Manager-entered actual; achievement % = (actual/target)×100 when present. */
        private Double actualValue;
        /** Legacy: direct 0–100 achievement when {@code actualValue} is not sent. */
        private Double score;
    }
}
