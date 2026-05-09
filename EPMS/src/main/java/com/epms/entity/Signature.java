package com.epms.entity;

import com.epms.entity.enums.SignatureRole;
import com.epms.entity.enums.SignatureSourceType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "signatures")
@Getter
@Setter
@NoArgsConstructor
public class Signature {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private SignatureRole role;

    @Column(nullable = false, length = 120)
    private String name;

    @Lob
    @Column(name = "image_data", nullable = false, columnDefinition = "LONGTEXT")
    private String imageData;

    @Column(name = "image_type", nullable = false, length = 50)
    private String imageType;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_type", nullable = false, length = 20)
    private SignatureSourceType sourceType;

    @Column(name = "is_default", nullable = false)
    private Boolean isDefault;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
        if (this.isActive == null) {
            this.isActive = true;
        }
        if (this.isDefault == null) {
            this.isDefault = false;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
