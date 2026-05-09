package com.epms.dto;

import com.epms.entity.enums.SignatureSourceType;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SignatureUpdateRequest {

    @NotBlank(message = "Signature name is required")
    private String name;

    private String imageData;

    private String imageType;

    private SignatureSourceType sourceType;
}
