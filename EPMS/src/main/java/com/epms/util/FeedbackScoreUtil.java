package com.epms.util;

/**
 * Centralized helpers for 360 feedback scores.
 * Scores are normalized percentages from 0 to 100.
 */
public final class FeedbackScoreUtil {

    public static final String OUTSTANDING = "Outstanding";
    public static final String GOOD = "Good";
    public static final String MEETS_REQUIREMENT = "Meets Requirement";
    public static final String NEEDS_IMPROVEMENT = "Needs Improvement";
    public static final String UNSATISFACTORY = "Unsatisfactory";

    private FeedbackScoreUtil() {
    }

    public static String category(Double percentageScore) {
        if (percentageScore == null) {
            return UNSATISFACTORY;
        }
        double score = Math.max(0.0, Math.min(100.0, percentageScore));
        if (score >= 86.0) {
            return OUTSTANDING;
        }
        if (score >= 71.0) {
            return GOOD;
        }
        if (score >= 60.0) {
            return MEETS_REQUIREMENT;
        }
        if (score >= 40.0) {
            return NEEDS_IMPROVEMENT;
        }
        return UNSATISFACTORY;
    }

    public static double averageOrZero(java.util.stream.Stream<Double> scores) {
        return scores
                .filter(java.util.Objects::nonNull)
                .mapToDouble(Double::doubleValue)
                .average()
                .orElse(0.0);
    }
}
