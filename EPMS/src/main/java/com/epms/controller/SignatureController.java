package com.epms.controller;

import com.epms.dto.*;
import com.epms.service.SignatureService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/signatures")
@RequiredArgsConstructor
public class SignatureController {

    private final SignatureService signatureService;

    @PostMapping
    public ResponseEntity<GenericApiResponse<SignatureResponse>> createSignature(
            @Valid @RequestBody SignatureCreateRequest request,
            @RequestParam(value = "userId", required = false) Long userId
    ) {
        SignatureResponse response = signatureService.createSignature(request, userId);
        return ResponseEntity.ok(GenericApiResponse.success("Signature created successfully", response));
    }

    @GetMapping
    public ResponseEntity<GenericApiResponse<List<SignatureResponse>>> getSignatures(
            @RequestParam(value = "userId", required = false) Long userId
    ) {
        List<SignatureResponse> data = signatureService.getSignatures(userId);
        return ResponseEntity.ok(GenericApiResponse.success("Signatures fetched successfully", data));
    }

    @GetMapping("/{id}")
    public ResponseEntity<GenericApiResponse<SignatureResponse>> getSignatureById(
            @PathVariable Long id,
            @RequestParam(value = "userId", required = false) Long userId
    ) {
        SignatureResponse response = signatureService.getSignatureById(id, userId);
        return ResponseEntity.ok(GenericApiResponse.success("Signature fetched successfully", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<GenericApiResponse<SignatureResponse>> updateSignature(
            @PathVariable Long id,
            @Valid @RequestBody SignatureUpdateRequest request,
            @RequestParam(value = "userId", required = false) Long userId
    ) {
        SignatureResponse response = signatureService.updateSignature(id, request, userId);
        return ResponseEntity.ok(GenericApiResponse.success("Signature updated successfully", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<GenericApiResponse<Void>> deleteSignature(
            @PathVariable Long id,
            @RequestParam(value = "userId", required = false) Long userId
    ) {
        signatureService.deleteSignature(id, userId);
        return ResponseEntity.ok(GenericApiResponse.success("Signature deleted successfully", null));
    }

    @PatchMapping("/{id}/default")
    public ResponseEntity<GenericApiResponse<SignatureResponse>> setDefaultSignature(
            @PathVariable Long id,
            @RequestBody(required = false) SetDefaultSignatureRequest request
    ) {
        Long userId = request != null ? request.getUserId() : null;
        SignatureResponse response = signatureService.setDefaultSignature(id, userId);
        return ResponseEntity.ok(GenericApiResponse.success("Default signature updated successfully", response));
    }
}
