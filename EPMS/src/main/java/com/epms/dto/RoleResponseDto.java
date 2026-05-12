/*
package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RoleResponseDto {

    private Integer id;
    private String name;
    private String description;
}
*/


package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RoleResponseDto {

    private Integer id;
    private String name;
    private String description;
    private Boolean active;
    private Date createdAt;
    private Integer createdBy;
    private Date updatedAt;
}