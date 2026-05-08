/*
package com.epms.dto;

import lombok.Data;

import java.time.LocalDateTime;

*/
/**
 * Why this file is updated:
 * - Follow-up meeting also needs location.
 *//*

@Data
public class FollowUpRequestDto {
    private LocalDateTime followUpDate;
    private String location;
    private String followUpNotes;
}*/










package com.epms.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class FollowUpRequestDto {
    private LocalDateTime followUpDate;
    private String location;
    private String followUpGoal;
    private String followUpNotes;
}