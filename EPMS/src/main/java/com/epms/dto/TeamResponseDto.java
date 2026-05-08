/*
package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TeamResponseDto {
    private Integer id;
    private String teamName;
    private Integer departmentId;
    private String departmentName;
    private Integer teamLeaderId;
    private String teamLeaderName;
    private Integer createdById;
    private String createdByName;
    private Date createdDate;
    private String status;
    private String teamGoal;
    private List<MemberInfo> members;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MemberInfo {
        // Preferred field for frontend.
        private Integer userId;
        private String userName;
        private Date startedDate;

        // Backward-compatible getters for frontend code that still reads employeeId/employeeName.
        public Integer getEmployeeId() {
            return userId;
        }

        public String getEmployeeName() {
            return userName;
        }
    }
}
*/


package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TeamResponseDto {
    private Integer id;
    private String teamName;

    private Integer departmentId;
    private String departmentName;

    private Integer teamLeaderId;
    private String teamLeaderName;

    private Integer projectManagerId;
    private String projectManagerName;
    private String projectManagerTeams;

    private Integer createdById;
    private String createdByName;

    private Date createdDate;
    private String status;
    private String teamGoal;

    private List<MemberInfo> members;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MemberInfo {
        private Integer userId;
        private String userName;
        private Date startedDate;

        public Integer getEmployeeId() {
            return userId;
        }

        public String getEmployeeName() {
            return userName;
        }
    }
}