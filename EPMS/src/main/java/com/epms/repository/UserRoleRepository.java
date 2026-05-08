/*
package com.epms.repository;

import com.epms.entity.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UserRoleRepository extends JpaRepository<UserRole, Integer> {
    boolean existsByUserIdAndRoleId(Integer userId, Integer roleId);
    List<UserRole> findByUserId(Integer userId);
}
*/




package com.epms.repository;

import com.epms.entity.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserRoleRepository extends JpaRepository<UserRole, Integer> {

    List<UserRole> findByUserId(Integer userId);

    boolean existsByUserIdAndRoleId(Integer userId, Integer roleId);
}