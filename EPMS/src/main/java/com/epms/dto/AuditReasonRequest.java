/*
AuditReasonRequest.java file (khn) :
*/

package com.epms.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AuditReasonRequest {
    @Size(max = 150, message = "Reason must not exceed 150 characters")
    private String reason;
}