package com.epms.service.impl;

import com.epms.dto.UserRoleRequestDto;
import com.epms.dto.UserRoleResponseDto;
import com.epms.entity.UserRole;
import com.epms.repository.RoleRepository;
import com.epms.repository.UserRepository;
import com.epms.repository.UserRoleRepository;
import com.epms.service.UserRoleService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserRoleServiceImpl implements UserRoleService {

    private final UserRoleRepository userRoleRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;

    @Override
    public UserRoleResponseDto createUserRole(UserRoleRequestDto requestDto) {
        validateUserAndRole(requestDto.getUserId(), requestDto.getRoleId());

        if (userRoleRepository.existsByUserIdAndRoleId(requestDto.getUserId(), requestDto.getRoleId())) {
            throw new RuntimeException("This role is already assigned to this user");
        }

        UserRole userRole = new UserRole();
        userRole.setUserId(requestDto.getUserId());
        userRole.setRoleId(requestDto.getRoleId());

        UserRole savedUserRole = userRoleRepository.save(userRole);
        return mapToResponseDto(savedUserRole);
    }

    @Override
    public List<UserRoleResponseDto> getAllUserRoles() {
        return userRoleRepository.findAll()
                .stream()
                .map(this::mapToResponseDto)
                .toList();
    }

    @Override
    public UserRoleResponseDto getUserRoleById(Integer id) {
        UserRole userRole = getUserRoleEntityById(id);
        return mapToResponseDto(userRole);
    }

    @Override
    public UserRoleResponseDto updateUserRole(Integer id, UserRoleRequestDto requestDto) {
        UserRole existingUserRole = getUserRoleEntityById(id);

        validateUserAndRole(requestDto.getUserId(), requestDto.getRoleId());

        existingUserRole.setUserId(requestDto.getUserId());
        existingUserRole.setRoleId(requestDto.getRoleId());

        UserRole updatedUserRole = userRoleRepository.save(existingUserRole);
        return mapToResponseDto(updatedUserRole);
    }

    @Override
    public void deleteUserRole(Integer id) {
        UserRole userRole = getUserRoleEntityById(id);
        userRoleRepository.delete(userRole);
    }

    private UserRole getUserRoleEntityById(Integer id) {
        return userRoleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User role not found with id: " + id));
    }

    private void validateUserAndRole(Integer userId, Integer roleId) {
        if (!userRepository.existsById(userId)) {
            throw new RuntimeException("User not found with id: " + userId);
        }

        if (!roleRepository.existsById(roleId)) {
            throw new RuntimeException("Role not found with id: " + roleId);
        }
    }

    private UserRoleResponseDto mapToResponseDto(UserRole userRole) {
        return new UserRoleResponseDto(
                userRole.getId(),
                userRole.getUserId(),
                userRole.getRoleId()
        );
    }
}