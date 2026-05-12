package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamOptionResponseDto {
    private Integer id;
    private String teamName;
    private Integer departmentId;
    private String departmentName;
    private Integer teamLeaderId;
    private String teamLeaderName;
    private Integer projectManagerId;
    private String projectManagerName;
}