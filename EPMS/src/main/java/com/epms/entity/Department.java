//package com.epms.entity;
//
//import jakarta.persistence.*;
//import lombok.Data;
//import lombok.NoArgsConstructor;
//import lombok.AllArgsConstructor;
//import java.util.Date;
//import java.util.List;
//
//// added by KHN ( Chatgpt)
//import com.fasterxml.jackson.annotation.JsonIgnore;
//
//@Entity
//@Table(name = "department")
//@Data
//@NoArgsConstructor
//@AllArgsConstructor
//
//public class Department {
//
//    @Id
//    @GeneratedValue(strategy = GenerationType.IDENTITY)
//    private Integer id;
//
//    @Column(nullable = false, unique = true)
//    private String departmentName;
//
//    @Column(unique = true)
//    private String departmentCode;
//
//    private String headEmployee;  // employee name or ID (simplified)
//
//    private Boolean status = true;
//
//    @Temporal(TemporalType.TIMESTAMP)
//    private Date createdAt = new Date();
//
//    private String createdBy;
//
//    // One department can have many EmployeeDepartment records (history tracking)
////    @OneToMany(mappedBy = "department", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
////    private List<EmployeeDepartment> employeeDepartments;
//
//// modified by KHN ( Chatgpt)
//    @JsonIgnore
//    @OneToMany(mappedBy = "department", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
//    private List<EmployeeDepartment> employeeDepartments;
//}

package com.epms.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.Date;

/**
 * Why this file is changed:
 * - employee_department.department_id will be removed.
 * - Because of that, Department can no longer have:
 *     @OneToMany(mappedBy = "department")
 *   because EmployeeDepartment no longer has a department field.
 *
 * Department is still used as the master table for department names.
 * Other features can still select department.id and then use department.departmentName.
 */
@Entity
@Table(name = "department")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Department {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, unique = true)
    private String departmentName;

    @Column(unique = true)
    private String departmentCode;

    /**
     * Existing simple field in your project.
     */
    private String headEmployee;

    private Boolean status = true;

    @Temporal(TemporalType.TIMESTAMP)
    private Date createdAt = new Date();

    private String createdBy;
}