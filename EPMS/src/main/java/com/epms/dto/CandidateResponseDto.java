/*
package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CandidateResponseDto {
    private Integer id;
    private String name;
    private String type; // "USER" (for leaders) or "EMPLOYEE" (for members)
    private Integer departmentId; // Only relevant for leaders
    private String departmentName; // Only relevant for leaders
    // Modified by KHN
    // (Renamed from isAvailable to available - Jackson strips "is" prefix which caused frontend null bug)
    private Boolean available;
    // END HERE
    private Integer currentTeamId;
    private String currentTeamName;
}
*/





package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CandidateResponseDto {
    private Integer id;
    private String name;
    private String type;
    private Integer departmentId;
    private String departmentName;

    private Boolean available;

    private Integer currentTeamId;
    private String currentTeamName;

    /**
     * Used mostly for Project Manager selection.
     * Example: "Already in Team A, Team B"
     */
    private String currentTeamNames;

    /**
     * Backward-compatible constructor for older code that passes only one team.
     */
    public CandidateResponseDto(
            Integer id,
            String name,
            String type,
            Integer departmentId,
            String departmentName,
            Boolean available,
            Integer currentTeamId,
            String currentTeamName
    ) {
        this.id = id;
        this.name = name;
        this.type = type;
        this.departmentId = departmentId;
        this.departmentName = departmentName;
        this.available = available;
        this.currentTeamId = currentTeamId;
        this.currentTeamName = currentTeamName;
        this.currentTeamNames = currentTeamName;
    }
}