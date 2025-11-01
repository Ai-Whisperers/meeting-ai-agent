/**
 * Insights Panel Component
 * Displays color-coded B2B strategy insights
 */

import { useEffect, useRef, useState } from 'react';
import type { Insight, InsightType } from '../types';

interface InsightsPanelProps {
  insights: Insight[];
}

const INSIGHT_CONFIG: Record<InsightType, { label: string; icon: string; color: string; bgColor: string }> = {
  'opportunity': {
    label: 'Opportunities',
    icon: '🟢',
    color: '#059669',
    bgColor: '#d1fae5'
  },
  'caution': {
    label: 'Cautions',
    icon: '🟡',
    color: '#d97706',
    bgColor: '#fef3c7'
  },
  'risk': {
    label: 'Risks',
    icon: '🔴',
    color: '#dc2626',
    bgColor: '#fee2e2'
  },
  'next-step': {
    label: 'Next Steps',
    icon: '🔵',
    color: '#2563eb',
    bgColor: '#dbeafe'
  }
};

export function InsightsPanel({ insights }: InsightsPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<InsightType | 'all'>('all');

  // Auto-scroll to bottom when new insights arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [insights]);

  const filteredInsights = filter === 'all'
    ? insights
    : insights.filter(i => i.type === filter);

  const insightsByType = {
    'opportunity': insights.filter(i => i.type === 'opportunity'),
    'caution': insights.filter(i => i.type === 'caution'),
    'risk': insights.filter(i => i.type === 'risk'),
    'next-step': insights.filter(i => i.type === 'next-step')
  };

  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Strategic Insights</h2>
        <span style={styles.count}>{insights.length} total</span>
      </div>

      {/* Filter tabs */}
      <div style={styles.filterTabs}>
        <button
          onClick={() => setFilter('all')}
          style={{
            ...styles.filterTab,
            ...(filter === 'all' ? styles.filterTabActive : {})
          }}
        >
          All ({insights.length})
        </button>
        {(Object.keys(INSIGHT_CONFIG) as InsightType[]).map(type => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            style={{
              ...styles.filterTab,
              ...(filter === type ? styles.filterTabActive : {}),
              borderBottom: filter === type ? `2px solid ${INSIGHT_CONFIG[type].color}` : 'none'
            }}
          >
            {INSIGHT_CONFIG[type].icon} {insightsByType[type].length}
          </button>
        ))}
      </div>

      {/* Insights list */}
      <div ref={scrollRef} style={styles.insightsList}>
        {filteredInsights.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>
              {filter === 'all'
                ? 'Strategic insights will appear here as the AI analyzes your conversation...'
                : `No ${INSIGHT_CONFIG[filter as InsightType]?.label.toLowerCase()} yet`}
            </p>
          </div>
        ) : (
          filteredInsights.map((insight) => {
            const config = INSIGHT_CONFIG[insight.type];
            return (
              <div
                key={insight.id}
                style={{
                  ...styles.insightCard,
                  backgroundColor: config.bgColor,
                  borderLeft: `4px solid ${config.color}`
                }}
              >
                <div style={styles.insightHeader}>
                  <span style={{ ...styles.insightType, color: config.color }}>
                    {config.icon} {config.label}
                  </span>
                  <span style={styles.timestamp}>{formatTime(insight.timestamp)}</span>
                </div>
                <p style={styles.insightContent}>{insight.content}</p>
                {insight.context && (
                  <div style={styles.context}>
                    <em>Context: {insight.context}</em>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Summary stats */}
      {insights.length > 0 && (
        <div style={styles.summary}>
          <h3 style={styles.summaryTitle}>Summary</h3>
          <div style={styles.summaryGrid}>
            {(Object.entries(insightsByType) as [InsightType, Insight[]][]).map(([type, typeInsights]) => (
              <div key={type} style={styles.summaryItem}>
                <div style={{ ...styles.summaryCount, color: INSIGHT_CONFIG[type].color }}>
                  {typeInsights.length}
                </div>
                <div style={styles.summaryLabel}>
                  {INSIGHT_CONFIG[type].icon} {INSIGHT_CONFIG[type].label}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: '#ffffff'
  },
  header: {
    padding: '1rem 1.5rem',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: {
    margin: 0,
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#111827'
  },
  count: {
    fontSize: '0.875rem',
    color: '#6b7280',
    fontWeight: '500'
  },
  filterTabs: {
    display: 'flex',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
    overflowX: 'auto'
  },
  filterTab: {
    padding: '0.5rem 1rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    color: '#6b7280',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap'
  },
  filterTabActive: {
    color: '#111827',
    fontWeight: '600'
  },
  insightsList: {
    flex: 1,
    overflowY: 'auto',
    padding: '1rem'
  },
  emptyState: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%'
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: '0.875rem',
    textAlign: 'center',
    padding: '0 2rem'
  },
  insightCard: {
    marginBottom: '0.75rem',
    padding: '1rem',
    borderRadius: '0.5rem',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
  },
  insightHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem'
  },
  insightType: {
    fontSize: '0.75rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  timestamp: {
    fontSize: '0.75rem',
    color: '#6b7280',
    fontFamily: 'monospace'
  },
  insightContent: {
    margin: 0,
    fontSize: '0.875rem',
    lineHeight: '1.5',
    color: '#1f2937'
  },
  context: {
    marginTop: '0.5rem',
    padding: '0.5rem',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: '0.25rem',
    fontSize: '0.75rem',
    color: '#6b7280'
  },
  summary: {
    padding: '1rem 1.5rem',
    borderTop: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb'
  },
  summaryTitle: {
    margin: '0 0 0.75rem 0',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '0.75rem'
  },
  summaryItem: {
    textAlign: 'center'
  },
  summaryCount: {
    fontSize: '1.5rem',
    fontWeight: '700'
  },
  summaryLabel: {
    fontSize: '0.75rem',
    color: '#6b7280',
    marginTop: '0.25rem'
  }
};
