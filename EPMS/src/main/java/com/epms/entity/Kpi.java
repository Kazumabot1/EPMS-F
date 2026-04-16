package com.epms.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.util.*;

@Entity
@Table(name = "kpis")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Kpi {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private String title;
    private String kpiCategory;
    private Double target;
    private String unit;
    private Integer weight;

    // Relationship with User (creator)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", referencedColumnName = "id")
    private User createdByUser;

    @Temporal(TemporalType.TIMESTAMP)
    private Date createdAt;

    // Keep the string field for backward compatibility if needed
    @Column(name = "created_by_string")
    private String createdBy;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "updated_at")
    private Date updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by", referencedColumnName = "id")
    private User updatedByUser;

    @Column(name = "version")
    private Integer version = 1;

    // One-to-Many relationship with KpiPosition
    @OneToMany(mappedBy = "kpi", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private Set<KpiPosition> kpiPositions = new HashSet<>();

    // One-to-Many relationship with Version History
    @OneToMany(mappedBy = "kpi", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @OrderBy("changedAt DESC")
    private List<KpiVersionHistory> versionHistory = new ArrayList<>();

    // Helper method to get all positions for this KPI
    public Set<Position> getPositions() {
        Set<Position> positions = new HashSet<>();
        for (KpiPosition kp : kpiPositions) {
            positions.add(kp.getPosition());
        }
        return positions;
    }

    // Helper method to get score for a specific position
    public Double getScoreForPosition(Integer positionId) {
        for (KpiPosition kp : kpiPositions) {
            if (kp.getPosition().getId().equals(positionId)) {
                return kp.getScore();
            }
        }
        return null;
    }

    // Helper method to add version history entry
    public void addVersionHistory(KpiVersionHistory history) {
        versionHistory.add(history);
        history.setKpi(this);
    }

    // Helper method to get latest changes
    public List<KpiVersionHistory> getLatestChanges(int limit) {
        return versionHistory.stream()
                .limit(limit)
                .collect(ArrayList::new, ArrayList::add, ArrayList::addAll);
    }

    // Helper method to get changes by column
    public List<KpiVersionHistory> getChangesByColumn(String columnName) {
        return versionHistory.stream()
                .filter(h -> h.getKpiColumnName().equals(columnName))
                .collect(ArrayList::new, ArrayList::add, ArrayList::addAll);
    }
}