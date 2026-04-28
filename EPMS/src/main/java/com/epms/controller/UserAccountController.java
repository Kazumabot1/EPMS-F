package com.epms.controller;

import com.epms.dto.AccountProvisionResult;
import com.epms.dto.GenericApiResponse;
import com.epms.dto.HrEmployeeAccountCreateRequest;
import com.epms.service.HrEmployeeAccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserAccountController {

    private final HrEmployeeAccountService hrEmployeeAccountService;

    @PostMapping
    public ResponseEntity<GenericApiResponse<AccountProvisionResult>> createUser(
            @RequestBody HrEmployeeAccountCreateRequest request
    ) {
        AccountProvisionResult result = hrEmployeeAccountService.createOrUpdateEmployeeAccount(request);
        return ResponseEntity.ok(
                GenericApiResponse.success(result.isSuccess() ? "Account processed" : "Account processing failed", result)
        );
    }

    @PostMapping("/{id}/resend-temporary-password")
    public ResponseEntity<GenericApiResponse<AccountProvisionResult>> resendTemporaryPassword(
            @PathVariable Integer id) {
        AccountProvisionResult result = hrEmployeeAccountService.resendTemporaryPassword(id);
        String summary = result.isSuccess()
                ? "Onboarding email was accepted for delivery"
                : "Onboarding email could not be sent";
        return ResponseEntity.ok(GenericApiResponse.success(summary, result));
    }
}
