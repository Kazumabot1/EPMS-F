package com.epms.service;

import com.epms.dto.SignatureCreateRequest;
import com.epms.dto.SignatureResponse;
import com.epms.dto.SignatureUpdateRequest;

import java.util.List;

public interface SignatureService {
    SignatureResponse createSignature(SignatureCreateRequest request, Long requestedUserId);

    List<SignatureResponse> getSignatures(Long requestedUserId);

    SignatureResponse getSignatureById(Long id, Long requestedUserId);

    SignatureResponse updateSignature(Long id, SignatureUpdateRequest request, Long requestedUserId);

    void deleteSignature(Long id, Long requestedUserId);

    SignatureResponse setDefaultSignature(Long id, Long requestedUserId);
}
