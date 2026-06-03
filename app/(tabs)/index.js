import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native'; // Add this import
import AddExpenseModal from '../../components/AddExpenseModal';
import ExpenseCard from '../../components/ExpenseCard';
import WalletTopUpModal from '../../components/WalletTopUpModal';
import SavingsModal from '../../components/SavingModal';


const { width } = Dimensions.get('window');

// ─── Design Tokens ────────────────────────────────────────────────────────────
const COLORS = {
  bg:          '#0D0F14',
  surface:     '#141720',
  card:        '#1A1F2E',
  cardBorder:  '#252A3A',
  mint:        '#00E5A0',
  mintDim:     'rgba(0,229,160,0.12)',
  mintGlow:    'rgba(0,229,160,0.25)',
  amber:       '#F59E0B',
  amberDim:    'rgba(245,158,11,0.15)',
  crimson:     '#EF4444',
  crimsonDim:  'rgba(239,68,68,0.15)',
  text:        '#F0F4FF',
  textMuted:   '#6B7A99',
  textDim:     '#3D4A66',
  white:       '#FFFFFF',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const safeFloat = (val, fallback = 0) => {
  const n = parseFloat(val);
  return isFinite(n) ? n : fallback;
};

const formatAmount = (n) =>
  `₹${safeFloat(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const calculateRemainingDays = () => {
  const now = new Date();
  let target = new Date(now.getFullYear(), now.getMonth() + 1, 4);
  if (now >= target) {
    target = new Date(now.getFullYear(), now.getMonth() + 2, 4);
  }
  return Math.max(1, Math.ceil((target - now) / 86400000));
};

// ─── Sub-components ───────────────────────────────────────────────────────────
const StatPill = ({ icon, label, value, color }) => (
  <View style={[pillStyles.pill, { borderColor: color + '40', backgroundColor: color + '10' }]}>
    <Ionicons name={icon} size={12} color={color} />
    <Text style={[pillStyles.label, { color: COLORS.textMuted }]}>{label}</Text>
    <Text style={[pillStyles.value, { color }]}>{value}</Text>
  </View>
);

const pillStyles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
  },
  label: { fontSize: 10, letterSpacing: 0.3 },
  value: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function TodayScreen() {
  const [modalVisible, setModalVisible]   = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [todayQuota, setTodayQuota]       = useState(0);
  const [todayExpenses, setTodayExpenses] = useState([]);
  const [remainingDays, setRemainingDays] = useState(0);
  const [todaySpent, setTodaySpent]       = useState(0);
  const [topUpVisible, setTopUpVisible]   = useState(false);
  const [savingsVisible, setSavingsVisible] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const savedWallet = await AsyncStorage.getItem('walletBalance');

      let currentWallet = 0;
      if (savedWallet === null) {
        await AsyncStorage.setItem('walletBalance', '0');
      } else {
        currentWallet = safeFloat(savedWallet, 0);
      }

      setWalletBalance(currentWallet);

      const today = new Date().toDateString();
      const savedExpenses = await AsyncStorage.getItem('expenses');
      let todayList  = [];
      let totalSpent = 0;

      if (savedExpenses !== null) {
        const all = JSON.parse(savedExpenses);
        todayList  = all.filter((e) => e.date === today);
        totalSpent = todayList.reduce((sum, e) => sum + safeFloat(e.amount), 0);
      }

      setTodayExpenses(todayList);
      setTodaySpent(totalSpent);

      const days = calculateRemainingDays();
      setRemainingDays(days);

      const quota = currentWallet > 0 ? Math.max(0, currentWallet / days) : 0;
      setTodayQuota(quota);
    } catch (err) {
      console.error('Error loading data:', err);
    }
  }, []);

  // Initial load
  useEffect(() => { loadData(); }, [loadData]);

  // Refresh data whenever screen comes into focus (when navigating to this tab)
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const addExpense = async (expenseData) => {
    const amount = safeFloat(expenseData.amount);

    if (amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid positive amount.');
      return false;
    }
    if (amount > walletBalance) {
      Alert.alert('Insufficient Balance', "You don't have enough balance in your wallet.");
      return false;
    }

    const remainingQuota = todayQuota - todaySpent;
    if (todayQuota > 0 && amount > remainingQuota) {
      Alert.alert(
        'Daily Limit Exceeded',
        `Only ${formatAmount(remainingQuota)} left today.\nBudget: ${formatAmount(todayQuota)} · Spent: ${formatAmount(todaySpent)}`
      );
      return false;
    }

    const newExpense = {
      id:        Date.now().toString(),
      ...expenseData,
      amount,
      date:      new Date().toDateString(),
      timestamp: new Date().toISOString(),
    };

    try {
      const savedExpenses = await AsyncStorage.getItem('expenses');
      const allExpenses   = savedExpenses ? JSON.parse(savedExpenses) : [];
      allExpenses.push(newExpense);
      await AsyncStorage.setItem('expenses', JSON.stringify(allExpenses));

      const newBalance = walletBalance - amount;
      await AsyncStorage.setItem('walletBalance', newBalance.toString());

      const days = calculateRemainingDays();
      const newQuota = newBalance > 0 ? Math.max(0, newBalance / days) : 0;

      setWalletBalance(newBalance);
      setTodaySpent((prev) => prev + amount);
      setTodayExpenses((prev) => [...prev, newExpense]);
      setRemainingDays(days);
      setTodayQuota(newQuota);

      return true;
    } catch (err) {
      console.error('Error adding expense:', err);
      return false;
    }
  };

  const handleDeleteExpense = async (expenseId, expenseAmount) => {
    try {
      const savedExpenses = await AsyncStorage.getItem('expenses');
      const all = savedExpenses ? JSON.parse(savedExpenses) : [];
      const filtered = all.filter((e) => e.id !== expenseId);
      await AsyncStorage.setItem('expenses', JSON.stringify(filtered));

      const newBalance = walletBalance + safeFloat(expenseAmount);
      await AsyncStorage.setItem('walletBalance', newBalance.toString());

      await loadData();
    } catch (err) {
      console.error('Error deleting expense:', err);
      Alert.alert('Error', 'Failed to delete expense.');
    }
  };

  const handleUpdateExpense = useCallback(() => loadData(), [loadData]);

  const handleSavings = async (savedAmount) => {
    try {
      const newBalance = Math.max(0, walletBalance - savedAmount);
      await AsyncStorage.setItem('walletBalance', newBalance.toString());
      await loadData();
    } catch (err) {
      console.error('Error saving from quota:', err);
    }
  };

  const handleTopUp = async (amount) => {
    try {
      const newBalance = walletBalance + amount;
      await AsyncStorage.setItem('walletBalance', newBalance.toString());
      const days = calculateRemainingDays();
      const newQuota = newBalance > 0 ? Math.max(0, newBalance / days) : 0;
      setWalletBalance(newBalance);
      setRemainingDays(days);
      setTodayQuota(newQuota);
    } catch (err) {
      console.error('Error topping up wallet:', err);
    }
  };

  const rawProgress  = todayQuota > 0 ? (todaySpent / todayQuota) * 100 : 0;
  const progress     = Math.min(rawProgress, 100);
  const isOverBudget = todaySpent > todayQuota && todayQuota > 0;
  const isWarning    = progress >= 75 && !isOverBudget;
  const barColor     = isOverBudget ? COLORS.crimson : isWarning ? COLORS.amber : COLORS.mint;
  const remaining    = Math.max(0, todayQuota - todaySpent);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ─────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, Asad!</Text>
            <Text style={styles.headerSub}>Track your daily spending</Text>
          </View>
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person-outline" size={16} color={COLORS.mint} />
          </View>
        </View>

        {/* ── Balance Card ────────────────────────────────────────── */}
        <View style={styles.balanceCard}>
          <LinearGradient
            colors={['#1A2A20', '#141720']}
            style={styles.balanceGrad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.glowBlob} />

            <View style={styles.balanceTop}>
              <View>
                <Text style={styles.balanceLabel}>WALLET BALANCE</Text>
                <Text style={styles.balanceAmount}>{formatAmount(walletBalance)}</Text>
                {walletBalance === 0 && (
                  <Text style={styles.balanceHint}>Tap + to add money</Text>
                )}
              </View>
              <TouchableOpacity style={styles.balanceBadge} onPress={() => setTopUpVisible(true)}>
                <Ionicons name="add" size={18} color={COLORS.mint} />
              </TouchableOpacity>
            </View>

            <View style={styles.balancePills}>
              <StatPill
                icon="trending-up-outline"
                label="Daily Budget"
                value={formatAmount(todayQuota)}
                color={COLORS.mint}
              />
              <StatPill
                icon="calendar-outline"
                label="Days Left"
                value={`${remainingDays}d`}
                color={COLORS.amber}
              />
            </View>
          </LinearGradient>
        </View>

        {/* ── Save from Today's Quota Button ── */}
        {remaining > 0 && (
          <TouchableOpacity
            style={styles.savingsRow}
            onPress={() => setSavingsVisible(true)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['rgba(129,140,248,0.12)', 'rgba(129,140,248,0.05)']}
              style={styles.savingsGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View style={styles.savingsRowLeft}>
                <View style={styles.savingsIconContainer}>
                  <Ionicons name="leaf-outline" size={14} color="#818CF8" />
                </View>
                <View>
                  <Text style={styles.savingsRowTitle}>Save from today's quota</Text>
                  <Text style={styles.savingsRowSubtext}>Set aside for future goals</Text>
                </View>
              </View>
              <View style={styles.savingsRowBadge}>
                <Text style={styles.savingsRowBadgeText}>up to {formatAmount(remaining)}</Text>
                <Ionicons name="chevron-forward" size={12} color="#818CF8" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* ── Today's Budget Card ──────────────────────────────────── */}
        <View style={styles.budgetCard}>
          <View style={styles.budgetHeader}>
            <View style={styles.budgetTitleRow}>
              <View style={[styles.dot, { backgroundColor: barColor }]} />
              <Text style={styles.budgetTitle}>Today's Spending</Text>
            </View>
            <Text style={[styles.budgetStatus,
              isOverBudget ? { color: COLORS.crimson } :
              isWarning    ? { color: COLORS.amber   } :
                             { color: COLORS.mint    }
            ]}>
              {isOverBudget ? 'OVER LIMIT' : isWarning ? 'NEAR LIMIT' : 'ON TRACK'}
            </Text>
          </View>

          <View style={styles.budgetNumbers}>
            <View style={styles.budgetNumberItem}>
              <Text style={styles.numLabel}>SPENT</Text>
              <Text style={[styles.numValue, { color: isOverBudget ? COLORS.crimson : COLORS.text }]}>
                {formatAmount(todaySpent)}
              </Text>
            </View>
            <View style={styles.numDivider} />
            <View style={styles.budgetNumberItem}>
              <Text style={styles.numLabel}>LEFT</Text>
              <Text style={[styles.numValue, { color: isOverBudget ? COLORS.crimson : COLORS.mint }]}>
                {formatAmount(remaining)}
              </Text>
            </View>
            <View style={styles.numDivider} />
            <View style={styles.budgetNumberItem}>
              <Text style={styles.numLabel}>TOTAL</Text>
              <Text style={[styles.numValue, { color: COLORS.textMuted }]}>
                {formatAmount(todayQuota)}
              </Text>
            </View>
          </View>

          <View style={styles.trackOuter}>
            <View style={styles.trackBg}>
              <View
                style={[
                  styles.trackFill,
                  {
                    width: `${progress}%`,
                    backgroundColor: barColor,
                  },
                ]}
              />
            </View>
            <Text style={[styles.trackPct, { color: barColor }]}>{Math.round(progress)}%</Text>
          </View>
        </View>

        {/* ── Expense List ────────────────────────────────────────── */}
        <View style={styles.listSection}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>Today's Transactions</Text>
            <Text style={styles.listCount}>{todayExpenses.length}</Text>
          </View>

          {todayExpenses.length > 0 ? (
            [...todayExpenses].reverse().map((expense) => (
              <ExpenseCard
                key={expense.id}
                expense={expense}
                onUpdate={handleUpdateExpense}
                onDelete={handleDeleteExpense}
              />
            ))
          ) : (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="receipt-outline" size={32} color={COLORS.textDim} />
              </View>
              <Text style={styles.emptyTitle}>No transactions yet</Text>
              <Text style={styles.emptyText}>Tap + to add expense</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── FAB ─────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={['#00E5A0', '#00B87C']}
          style={styles.fabGrad}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="add" size={24} color={COLORS.bg} />
        </LinearGradient>
      </TouchableOpacity>

      <AddExpenseModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={addExpense}
        remainingBudget={remaining}
        todaySpent={todaySpent}
        dailyQuota={todayQuota}
      />
      <WalletTopUpModal
        visible={topUpVisible}
        onClose={() => setTopUpVisible(false)}
        onTopUp={handleTopUp}
        currentBalance={walletBalance}
      />

      <SavingsModal
        visible={savingsVisible}
        onClose={() => setSavingsVisible(false)}
        remainingQuota={remaining}
        onSave={handleSavings}
        onRefreshData={loadData}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollContent: {
    paddingBottom: 100,
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
  greeting: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.mintDim,
    borderWidth: 1,
    borderColor: COLORS.mint + '50',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Balance Card
  balanceCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  balanceGrad: {
    padding: 18,
    position: 'relative',
    overflow: 'hidden',
  },
  glowBlob: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.mintGlow,
  },
  balanceTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  balanceLabel: {
    fontSize: 9,
    letterSpacing: 1.5,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  balanceHint: {
    fontSize: 10,
    color: COLORS.amber,
    marginTop: 2,
  },
  balanceBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.mintDim,
    borderWidth: 1,
    borderColor: COLORS.mint + '40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balancePills: {
    flexDirection: 'row',
    gap: 8,
  },

  // Savings Row
  savingsRow: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(129,140,248,0.3)',
  },
  savingsGradient: {
    padding: 12,
  },
  savingsRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  savingsIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(129,140,248,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(129,140,248,0.3)',
  },
  savingsRowTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#818CF8',
    marginBottom: 1,
  },
  savingsRowSubtext: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  savingsRowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(129,140,248,0.2)',
  },
  savingsRowBadgeText: {
    fontSize: 11,
    color: '#818CF8',
    fontWeight: '600',
  },

  // Budget Card
  budgetCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  budgetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  budgetTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  budgetStatus: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
  },
  budgetNumbers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  budgetNumberItem: {
    flex: 1,
    alignItems: 'center',
  },
  numLabel: {
    fontSize: 8,
    letterSpacing: 1.2,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  numValue: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  numDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.cardBorder,
  },
  trackOuter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  trackBg: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.surface,
    borderRadius: 2,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    borderRadius: 2,
  },
  trackPct: {
    fontSize: 10,
    fontWeight: '700',
    width: 32,
    textAlign: 'right',
  },

  // Expense List
  listSection: {
    paddingHorizontal: 16,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  listTitle: {
    fontSize: 16,
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

  // Empty State
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

  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    elevation: 8,
    shadowColor: COLORS.mint,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabGrad: {
    width: '100%',
    height: '100%',
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
});