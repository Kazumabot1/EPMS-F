package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamEmployeeOptionResponseDto {
    private Integer id;
    private Integer employeeId;
    private Integer userId;
    private String firstName;
    private String lastName;
    private String email;
    private String positionTitle;
}