package com.epms.dto;

import com.epms.entity.enums.SignatureRole;
import com.epms.entity.enums.SignatureSourceType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SignatureCreateRequest {

    @NotBlank(message = "Signature name is required")
    private String name;

    @NotBlank(message = "Image data is required")
    private String imageData;

    @NotBlank(message = "Image type is required")
    private String imageType;

    @NotNull(message = "Source type is required")
    private SignatureSourceType sourceType;

    private Boolean isDefault;

    private SignatureRole role;

    private Long userId;
}
