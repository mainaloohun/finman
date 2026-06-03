import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import ExpenseCard from '../../components/ExpenseCard';

// ─── Design Tokens (in sync with TodayScreen) ─────────────────────────────────
const COLORS = {
  bg:         '#0D0F14',
  surface:    '#141720',
  card:       '#1A1F2E',
  cardBorder: '#252A3A',
  mint:       '#00E5A0',
  mintDim:    'rgba(0,229,160,0.12)',
  mintGlow:   'rgba(0,229,160,0.25)',
  amber:      '#F59E0B',
  amberDim:   'rgba(245,158,11,0.15)',
  crimson:    '#EF4444',
  text:       '#F0F4FF',
  textMuted:  '#6B7A99',
  textDim:    '#3D4A66',
};

const TAGS = [
  { label: 'All',           icon: 'apps-outline',           color: COLORS.mint  },
  { label: 'Food',          icon: 'fast-food-outline',       color: '#FF6B6B'    },
  { label: 'Transport',     icon: 'car-outline',             color: '#4ECDC4'    },
  { label: 'Shopping',      icon: 'bag-outline',             color: '#45B7D1'    },
  { label: 'Entertainment', icon: 'game-controller-outline', color: '#A78BFA'    },
  { label: 'Bills',         icon: 'document-text-outline',   color: '#F59E0B'    },
  { label: 'Other',         icon: 'ellipsis-horizontal-outline', color: '#6B7A99'},
];

const TAG_MAP = Object.fromEntries(TAGS.map((t) => [t.label, t]));

// ─── Helpers ──────────────────────────────────────────────────────────────────
const safeFloat = (val, fallback = 0) => {
  const n = parseFloat(val);
  return isFinite(n) ? n : fallback;
};

const formatAmount = (n) =>
  `₹${safeFloat(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDateHeader = (dateString) => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString())     return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function HistoryScreen() {
  const [allExpenses,      setAllExpenses]      = useState([]);
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [selectedTag,      setSelectedTag]      = useState('All');

  const loadExpenses = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem('expenses');
      if (!raw) {
        setAllExpenses([]);
        setFilteredExpenses([]);
        return;
      }
      const parsed = JSON.parse(raw).map((e) => ({
        ...e,
        amount: safeFloat(e.amount),
        date:   e.date || new Date(e.timestamp).toDateString(),
      }));
      const sorted = parsed.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setAllExpenses(sorted);
      applyFilter(selectedTag, sorted);
    } catch (err) {
      console.error('Error loading expenses:', err);
    }
  }, [selectedTag]);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadExpenses();
    }, [loadExpenses])
  );

  const applyFilter = (tag, list) => {
    setSelectedTag(tag);
    setFilteredExpenses(tag === 'All' ? list : list.filter((e) => e.tag === tag));
  };

  const handleFilterChange = (tag) => applyFilter(tag, allExpenses);

  const handleDeleteExpense = async (expenseId, expenseAmount) => {
    try {
      const raw = await AsyncStorage.getItem('expenses');
      const all = raw ? JSON.parse(raw) : [];
      const updated = all.filter((e) => e.id !== expenseId);
      await AsyncStorage.setItem('expenses', JSON.stringify(updated));

      const savedWallet = await AsyncStorage.getItem('walletBalance');
      const newBalance  = safeFloat(savedWallet) + safeFloat(expenseAmount);
      await AsyncStorage.setItem('walletBalance', newBalance.toString());

      await loadExpenses();
    } catch (err) {
      console.error('Error deleting expense:', err);
      Alert.alert('Error', 'Failed to delete expense.');
    }
  };

  const handleUpdateExpense = useCallback(() => loadExpenses(), [loadExpenses]);

  // Category breakdown from ALL expenses (not filtered)
  const tagStats = allExpenses.reduce((acc, e) => {
    acc[e.tag] = (acc[e.tag] || 0) + e.amount;
    return acc;
  }, {});
  const allTotal = Object.values(tagStats).reduce((s, v) => s + v, 0);

  // Grouped by date
  const grouped = filteredExpenses.reduce((acc, e) => {
    const key = e.date;
    if (!acc[key]) acc[key] = [];
    acc[key].push(e);
    return acc;
  }, {});
  const dates = Object.keys(grouped).sort((a, b) => new Date(b) - new Date(a));

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Header ─────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>History</Text>
            <Text style={styles.headerSub}>Your spending timeline</Text>
          </View>
          <View style={styles.headerBadge}>
            <Ionicons name="time-outline" size={16} color={COLORS.mint} />
          </View>
        </View>

        {/* ── Category Breakdown ───────────────────────────────────── */}
        {Object.keys(tagStats).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Spending by Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.breakdownRow}>
                {Object.entries(tagStats)
                  .sort(([, a], [, b]) => b - a)
                  .map(([tag, amount]) => {
                    const meta = TAG_MAP[tag] || TAG_MAP['Other'];
                    const pct  = allTotal > 0 ? (amount / allTotal) * 100 : 0;
                    return (
                      <View key={tag} style={styles.breakdownChip}>
                        <View style={[styles.breakdownIcon, { backgroundColor: meta.color + '20' }]}>
                          <Ionicons name={meta.icon} size={14} color={meta.color} />
                        </View>
                        <Text style={styles.breakdownTag}>{tag}</Text>
                        <Text style={[styles.breakdownAmt, { color: meta.color }]}>
                          {formatAmount(amount)}
                        </Text>
                        <View style={styles.breakdownTrack}>
                          <View
                            style={[
                              styles.breakdownFill,
                              { width: `${pct}%`, backgroundColor: meta.color },
                            ]}
                          />
                        </View>
                        <Text style={styles.breakdownPct}>{Math.round(pct)}%</Text>
                      </View>
                    );
                  })}
              </View>
            </ScrollView>
          </View>
        )}

        {/* ── Filter Tags ──────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Filter by Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.filterRow}>
              {TAGS.map((tag) => {
                const active = selectedTag === tag.label;
                return (
                  <TouchableOpacity
                    key={tag.label}
                    style={[
                      styles.filterChip,
                      active
                        ? { backgroundColor: tag.color + '20', borderColor: tag.color + '70' }
                        : { backgroundColor: COLORS.surface, borderColor: COLORS.cardBorder },
                    ]}
                    onPress={() => handleFilterChange(tag.label)}
                  >
                    <Ionicons name={tag.icon} size={11} color={active ? tag.color : COLORS.textDim} />
                    <Text style={[styles.filterLabel, { color: active ? tag.color : COLORS.textMuted }]}>
                      {tag.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* ── Transaction List ─────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>
              {selectedTag === 'All' ? 'All Transactions' : `${selectedTag} Expenses`}
            </Text>
            <Text style={styles.listCount}>{filteredExpenses.length}</Text>
          </View>

          {filteredExpenses.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="document-text-outline" size={32} color={COLORS.textDim} />
              </View>
              <Text style={styles.emptyTitle}>
                {allExpenses.length === 0 ? 'No transactions yet' : `No ${selectedTag} expenses`}
              </Text>
              <Text style={styles.emptyText}>
                {allExpenses.length === 0
                  ? 'Add your first expense from the Today tab'
                  : 'Try a different category'}
              </Text>
            </View>
          ) : (
            dates.map((date) => (
              <View key={date} style={styles.dateGroup}>
                {/* Date Header */}
                <View style={styles.dateHeader}>
                  <View style={styles.dateTitleRow}>
                    <View style={styles.dateDot} />
                    <Text style={styles.dateLabel}>{formatDateHeader(date)}</Text>
                  </View>
                  <View style={styles.dateTotalPill}>
                    <Text style={styles.dateTotalText}>
                      {formatAmount(grouped[date].reduce((s, e) => s + e.amount, 0))}
                    </Text>
                  </View>
                </View>

                {/* Expenses */}
                {grouped[date].map((expense) => (
                  <ExpenseCard
                    key={expense.id}
                    expense={expense}
                    onUpdate={handleUpdateExpense}
                    onDelete={handleDeleteExpense}
                  />
                ))}
              </View>
            ))
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scroll: {
    paddingBottom: 20,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  headerBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.mintDim,
    borderWidth: 1,
    borderColor: COLORS.mint + '50',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Section
  section: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: 0.3,
    marginBottom: 12,
  },

  // Category Breakdown
  breakdownRow: {
    flexDirection: 'row',
    gap: 10,
  },
  breakdownChip: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 12,
    width: 110,
    gap: 4,
  },
  breakdownIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  breakdownTag: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  breakdownAmt: {
    fontSize: 13,
    fontWeight: '700',
  },
  breakdownTrack: {
    height: 2,
    backgroundColor: COLORS.surface,
    borderRadius: 1,
    overflow: 'hidden',
    marginTop: 4,
  },
  breakdownFill: {
    height: '100%',
    borderRadius: 1,
  },
  breakdownPct: {
    fontSize: 9,
    color: COLORS.textDim,
    letterSpacing: 0.2,
  },

  // Filter chips
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '500',
  },

  // List header
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  listCount: {
    fontSize: 11,
    color: COLORS.textMuted,
    backgroundColor: COLORS.card,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },

  // Date groups
  dateGroup: {
    marginBottom: 16,
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORS.mint,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  dateTotalPill: {
    backgroundColor: COLORS.mintDim,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: COLORS.mint + '30',
  },
  dateTotalText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.mint,
  },

  // Empty
  empty: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 11,
    color: COLORS.textDim,
    textAlign: 'center',
  },
});