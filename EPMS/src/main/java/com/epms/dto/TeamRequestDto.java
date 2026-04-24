package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TeamRequestDto {
    private String teamName;
    private Integer departmentId;
    private Integer teamLeaderId;
    private Integer createdById;
    private String teamGoal;
    private String status;

    // Preferred field: these are USER ids from the users table.
    private List<Integer> memberUserIds;

    // Backward-compatible field for your current frontend.
    // Despite the old name, TeamMember.memberUser points to users.id, not employee.id.
    private List<Integer> memberEmployeeIds;

    public List<Integer> getEffectiveMemberUserIds() {
        if (memberUserIds != null) {
            return memberUserIds;
        }
        return memberEmployeeIds;
    }
}
