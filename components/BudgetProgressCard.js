import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  card: '#1A1F2E',
  cardBorder: '#252A3A',
  surface: '#141720',
  mint: '#00E5A0',
  mintDim: 'rgba(0,229,160,0.12)',
  amber: '#F59E0B',
  amberDim: 'rgba(245,158,11,0.15)',
  crimson: '#EF4444',
  crimsonDim: 'rgba(239,68,68,0.12)',
  text: '#F0F4FF',
  textMuted: '#6B7A99',
  textDim: '#3D4A66',
};

const BudgetProgressCard = ({ category, spent, budget, icon, color }) => {
  const [expanded, setExpanded] = useState(false);
  
  const percentage = budget > 0 ? (spent / budget) * 100 : 0;
  const isWarning = percentage >= 80 && percentage < 100;
  const isOverBudget = percentage >= 100;
  const remaining = Math.max(0, budget - spent);
  
  const statusColor = isOverBudget ? COLORS.crimson : isWarning ? COLORS.amber : COLORS.mint;
  const statusText = isOverBudget ? 'Over!' : isWarning ? 'Near!' : 'OK';

  return (
    <View style={styles.card}>
      {/* Header - Always visible */}
      <TouchableOpacity 
        style={styles.header} 
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.titleContainer}>
          <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
            <Ionicons name={icon} size={16} color={color} />
          </View>
          <Text style={styles.category}>{category}</Text>
        </View>
        
        <View style={styles.headerRight}>
          <View style={styles.statsRow}>
            <Text style={[styles.spentText, { color: isOverBudget ? COLORS.crimson : COLORS.text }]}>
              ₹{spent.toFixed(0)}
            </Text>
            <Text style={styles.separator}>/</Text>
            <Text style={styles.budgetText}>₹{budget.toFixed(0)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.status, { color: statusColor }]}>{statusText}</Text>
          </View>
          <Ionicons 
            name={expanded ? 'chevron-up' : 'chevron-down'} 
            size={18} 
            color={COLORS.textMuted} 
          />
        </View>
      </TouchableOpacity>

      {/* Progress Bar - Always visible */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { 
                width: `${Math.min(percentage, 100)}%`,
                backgroundColor: statusColor 
              }
            ]} 
          />
        </View>
        <Text style={[styles.percentage, { color: statusColor }]}>
          {percentage.toFixed(0)}%
        </Text>
      </View>

      {/* Expanded Details */}
      {expanded && (
        <View style={styles.expandedContent}>
          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Spent</Text>
              <Text style={[styles.detailValue, { color: isOverBudget ? COLORS.crimson : COLORS.text }]}>
                ₹{spent.toFixed(2)}
              </Text>
            </View>
            <View style={styles.detailDivider} />
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Budget</Text>
              <Text style={styles.detailValue}>₹{budget.toFixed(2)}</Text>
            </View>
            <View style={styles.detailDivider} />
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Remaining</Text>
              <Text style={[styles.detailValue, { color: statusColor }]}>
                ₹{remaining.toFixed(2)}
              </Text>
            </View>
          </View>

          {isOverBudget && (
            <View style={[styles.warning, { backgroundColor: COLORS.crimsonDim }]}>
              <Ionicons name="alert-circle" size={12} color={COLORS.crimson} />
              <Text style={styles.warningText}>
                Over budget by ₹{(spent - budget).toFixed(2)}!
              </Text>
            </View>
          )}
          {isWarning && !isOverBudget && (
            <View style={[styles.warning, { backgroundColor: COLORS.amberDim }]}>
              <Ionicons name="warning" size={12} color={COLORS.amber} />
              <Text style={[styles.warningText, { color: COLORS.amber }]}>
                Only ₹{remaining.toFixed(2)} left
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  category: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  spentText: {
    fontSize: 13,
    fontWeight: '700',
  },
  budgetText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  separator: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  status: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.surface,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  percentage: {
    fontSize: 10,
    fontWeight: '700',
    width: 32,
    textAlign: 'right',
  },
  expandedContent: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailItem: {
    flex: 1,
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 9,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  detailDivider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.cardBorder,
  },
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    padding: 8,
    borderRadius: 8,
  },
  warningText: {
    fontSize: 10,
    color: COLORS.crimson,
    fontWeight: '500',
  },
});

export default BudgetProgressCard;