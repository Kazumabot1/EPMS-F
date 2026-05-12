/*
package com.epms.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PositionLevelRequestDto {

    @NotBlank(message = "Level code must not be blank")
    private String levelCode;
}
*/


package com.epms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PositionLevelRequestDto {

    @NotBlank(message = "Level code must not be blank")
    private String levelCode;

    private Boolean active;

    @Size(max = 150, message = "Reason must not exceed 150 characters")
    private String reason;
}