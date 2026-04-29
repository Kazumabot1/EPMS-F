package com.epms.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

@Data
public class EvaluatorConfigDTO {

    @NotNull(message = "Manager inclusion flag is required.")
    private Boolean includeManager;

    @NotNull(message = "Team peer inclusion flag is required.")
    private Boolean includeTeamPeers;

    @NotNull(message = "Project peer inclusion flag is required.")
    private Boolean includeProjectPeers;

    @NotNull(message = "Cross-team peer inclusion flag is required.")
    private Boolean includeCrossTeamPeers;

    @NotNull(message = "Peer count is required.")
    @Positive(message = "Peer count must be greater than zero.")
    private Integer peerCount;
}
