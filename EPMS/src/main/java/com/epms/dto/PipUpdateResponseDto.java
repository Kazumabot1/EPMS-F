//package com.epms.dto;
//
//import lombok.AllArgsConstructor;
//import lombok.Data;
//import lombok.NoArgsConstructor;
//
//import java.util.Date;
//
//@Data
//@NoArgsConstructor
//@AllArgsConstructor
//public class PipUpdateResponseDto {
//
//    private Integer id;
//    private Integer pipId;
//    private String comments;
//    private String status;
//    private Integer updatedBy;
//    private Date updatedAt;
//}

package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Why this file exists:
 * - This keeps the old PipUpdateController/PipUpdateService compatible.
 * - The new PIP feature mainly uses PipUpdateHistoryDto for full history display.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PipUpdateResponseDto {
    private Integer id;
    private Integer pipId;
    private String comments;
    private String status;
    private Integer updatedBy;
    private LocalDateTime updatedAt;
}