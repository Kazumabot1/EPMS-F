package com.epms.dto;

import com.epms.entity.enums.SignatureRole;
import com.epms.entity.enums.SignatureSourceType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class SignatureResponse {
    private Long id;
    private Long userId;
    private SignatureRole role;
    private String name;
    private String imageData;
    private String imageType;
    private SignatureSourceType sourceType;
    private Boolean isDefault;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
