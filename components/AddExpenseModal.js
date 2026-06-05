import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
  Alert,
  Platform,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// ─── Design Tokens ────────────────────────────────────────────────────────────
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
  crimsonDim: 'rgba(239,68,68,0.12)',
  text:       '#F0F4FF',
  textMuted:  '#6B7A99',
  textDim:    '#3D4A66',
};

const TAGS = [
  { label: 'Food',          icon: 'fast-food-outline',          color: '#FF6B6B' },
  { label: 'Transport',     icon: 'car-outline',                color: '#4ECDC4' },
  { label: 'Shopping',      icon: 'bag-outline',                color: '#45B7D1' },
  { label: 'Entertainment', icon: 'game-controller-outline',    color: '#A78BFA' },
  { label: 'Bills',         icon: 'document-text-outline',      color: '#F59E0B' },
  { label: 'Other',         icon: 'ellipsis-horizontal-outline',color: '#6B7A99' },
];

const safeFloat = (val, fallback = 0) => {
  const n = parseFloat(val);
  return isFinite(n) ? n : fallback;
};

const formatAmount = (n) =>
  `₹${safeFloat(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ─── Component ────────────────────────────────────────────────────────────────
const AddExpenseModal = ({
  visible,
  onClose,
  onSubmit,
  remainingBudget = 0,
  todaySpent = 0,
  dailyQuota = 0,
}) => {
  const [amount, setAmount]           = useState('');
  const [expenseName, setExpenseName] = useState('');
  const [selectedTag, setSelectedTag] = useState('Food');
  const [note, setNote]               = useState('');
  const [categoryBudgetInfo, setCategoryBudgetInfo] = useState(null);
  const [isLoading, setIsLoading]     = useState(false);

  const amountInputRef  = useRef(null);
  const scrollViewRef   = useRef(null);
  const budgetCacheRef  = useRef({});
  const debounceTimer   = useRef(null);
  // Animated value to lift the sheet above the keyboard
  const sheetOffset     = useRef(new Animated.Value(0)).current;

  // ── Keyboard listener — lifts the sheet above the keyboard on ALL platforms ─
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e) => {
      Animated.timing(sheetOffset, {
        toValue: e.endCoordinates.height,
        duration: Platform.OS === 'ios' ? e.duration || 250 : 200,
        useNativeDriver: true,
      }).start();
    };

    const onHide = (e) => {
      Animated.timing(sheetOffset, {
        toValue: 0,
        duration: Platform.OS === 'ios' ? e.duration || 200 : 160,
        useNativeDriver: true,
      }).start();
    };

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [sheetOffset]);

  // ── Reset on close ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!visible) {
      setAmount('');
      setExpenseName('');
      setSelectedTag('Food');
      setNote('');
      setCategoryBudgetInfo(null);
      setIsLoading(false);
      budgetCacheRef.current = {};
    } else {
      const t = setTimeout(() => amountInputRef.current?.focus(), 300);
      return () => clearTimeout(t);
    }
  }, [visible]);

  // ── Budget checker (stable reference – no deps that change per keystroke) ──
  const checkCategoryBudget = useCallback(async (amountValue, category) => {
    if (amountValue <= 0) {
      setCategoryBudgetInfo(null);
      return true;
    }

    const cacheKey = `${category}_${amountValue}`;
    if (budgetCacheRef.current[cacheKey]) {
      setCategoryBudgetInfo(budgetCacheRef.current[cacheKey]);
      return !budgetCacheRef.current[cacheKey].willExceed;
    }

    try {
      const savedBudgets = await AsyncStorage.getItem('categoryBudgets');
      if (!savedBudgets) { setCategoryBudgetInfo(null); return true; }

      const budgets = JSON.parse(savedBudgets);
      const categoryBudget = budgets[category];
      if (!categoryBudget) { setCategoryBudgetInfo(null); return true; }

      const savedExpenses = await AsyncStorage.getItem('expenses');
      let currentSpending = 0;

      if (savedExpenses) {
        const allExpenses  = JSON.parse(savedExpenses);
        const currentMonth = new Date().getMonth();
        const currentYear  = new Date().getFullYear();
        currentSpending = allExpenses
          .filter(e => {
            const d = new Date(e.timestamp);
            return e.tag === category &&
              d.getMonth() === currentMonth &&
              d.getFullYear() === currentYear;
          })
          .reduce((sum, e) => sum + e.amount, 0);
      }

      const newTotal   = currentSpending + amountValue;
      const budgetInfo = {
        budget:     categoryBudget,
        spent:      currentSpending,
        remaining:  categoryBudget - currentSpending,
        newTotal,
        willExceed: newTotal > categoryBudget,
      };

      budgetCacheRef.current[cacheKey] = budgetInfo;
      setCategoryBudgetInfo(budgetInfo);
      return !budgetInfo.willExceed;
    } catch (err) {
      console.error('Error checking category budget:', err);
      setCategoryBudgetInfo(null);
      return true;
    }
  }, []); // ← truly stable, no deps

  // ── Debounced budget check triggered by amount OR tag change ───────────────
  //    Key fix: we DON'T put checkCategoryBudget in deps (it's stable anyway),
  //    and we DON'T recreate any handler that tagButtons depends on.
  useEffect(() => {
    clearTimeout(debounceTimer.current);
    const typedAmount = safeFloat(amount);
    if (typedAmount <= 0) {
      setCategoryBudgetInfo(null);
      return;
    }
    debounceTimer.current = setTimeout(() => {
      checkCategoryBudget(typedAmount, selectedTag);
    }, 300);
    return () => clearTimeout(debounceTimer.current);
  }, [amount, selectedTag]); // checkCategoryBudget is stable so omitting is safe

  // ── Tag change: clear cache, let the effect above re-check ─────────────────
  //    handleTagChange NO LONGER calls checkCategoryBudget directly,
  //    so it doesn't need `amount` in its deps → no re-creation on each keystroke.
  const handleTagChange = useCallback((tag) => {
    budgetCacheRef.current = {};       // clear stale cache
    setSelectedTag(tag);               // triggers the effect above
  }, []);

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (isLoading) return;
    const expenseAmount = safeFloat(amount);
    if (expenseAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid positive amount.');
      return;
    }

    setIsLoading(true);
    const finalName = expenseName.trim() || selectedTag;

    // Use the latest cached info if available; otherwise do a fresh check
    const cacheKey = `${selectedTag}_${expenseAmount}`;
    let info = budgetCacheRef.current[cacheKey] || null;

    if (!info) {
      await checkCategoryBudget(expenseAmount, selectedTag);
      info = budgetCacheRef.current[cacheKey] || null;
    }

    if (info && info.willExceed) {
      setIsLoading(false);
      Alert.alert(
        'Budget Warning',
        `This will exceed your ${selectedTag} budget!\n\n` +
        `Budget: ${formatAmount(info.budget)}\n` +
        `Current: ${formatAmount(info.spent)}\n` +
        `This expense: ${formatAmount(expenseAmount)}\n` +
        `Over by: ${formatAmount(info.newTotal - info.budget)}`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Add Anyway',
            onPress: async () => {
              setIsLoading(true);
              const success = await onSubmit({
                amount: expenseAmount,
                name:   finalName,
                tag:    selectedTag,
                note:   note.trim(),
              });
              setIsLoading(false);
              if (success) onClose();
            },
          },
        ]
      );
      return;
    }

    const success = await onSubmit({
      amount: expenseAmount,
      name:   finalName,
      tag:    selectedTag,
      note:   note.trim(),
    });
    setIsLoading(false);
    if (success) onClose();
  }, [amount, expenseName, selectedTag, note, isLoading, onSubmit, onClose, checkCategoryBudget]);

  // ── Derived display values ──────────────────────────────────────────────────
  const typedAmount  = safeFloat(amount);
  const budgetPct    = remainingBudget > 0
    ? Math.min((typedAmount / remainingBudget) * 100, 100)
    : 0;
  const isOverBudget = typedAmount > remainingBudget && remainingBudget > 0;
  const barColor     = isOverBudget
    ? COLORS.crimson
    : budgetPct > 75 ? COLORS.amber : COLORS.mint;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      {/* Full-screen container */}
      <View style={styles.overlay}>
        {/* Backdrop — tapping dismisses keyboard */}
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        {/*
          Animated.View lifts the entire sheet by exactly the keyboard height.
          translateY is negative to move UP. useNativeDriver keeps it on the
          UI thread — no JS re-renders triggered by keyboard events.
        */}
        <Animated.View
          style={[
            styles.sheet,
            { transform: [{ translateY: Animated.multiply(sheetOffset, -1) }] },
          ]}
        >
          <View style={styles.handle} />

          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>New Expense</Text>
              <Text style={styles.headerSub}>Log what you spent</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={scrollViewRef}
            showsVerticalScrollIndicator={false}
            // FIX: 'handled' lets inner inputs capture taps without
            // dismissing the keyboard unexpectedly
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
            // FIX: Remove automaticallyAdjustKeyboardInsets — it conflicts
            // with KeyboardAvoidingView and causes double-adjustment loops
            // FIX: Remove keyboardDismissMode="interactive" — on Android this
            // fires layout events that re-trigger the re-render cycle
          >
            {/* ── Budget Banner ─────────────────────────────────────────── */}
            <View style={styles.budgetBanner}>
              <View style={styles.budgetLeft}>
                <Text style={styles.bannerLabel}>REMAINING TODAY</Text>
                <Text style={[styles.bannerAmount, { color: isOverBudget ? COLORS.crimson : COLORS.mint }]}>
                  {formatAmount(remainingBudget)}
                </Text>
              </View>
              <View style={styles.budgetDivider} />
              <View style={styles.budgetRight}>
                <Text style={styles.bannerMeta}>Quota: {formatAmount(dailyQuota)}</Text>
                <Text style={styles.bannerMeta}>Spent: {formatAmount(todaySpent)}</Text>
              </View>
            </View>

            {/* ── Category Tags ─────────────────────────────────────────── */}
            <View style={styles.section}>
              <Text style={styles.label}>CATEGORY</Text>
              {/*
                FIX: Render tags inline (no useMemo) — memoizing a JSX block
                that depends on selectedTag + handleTagChange was the main
                source of stale closure bugs. React's own reconciler is fast
                enough for 6 chips; useMemo here causes more harm than good.
              */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tagScrollContent}
                keyboardShouldPersistTaps="handled"
              >
                {TAGS.map((tag) => {
                  const active = selectedTag === tag.label;
                  return (
                    <TouchableOpacity
                      key={tag.label}
                      style={[
                        styles.tagChip,
                        active
                          ? { backgroundColor: tag.color + '22', borderColor: tag.color + '80' }
                          : { backgroundColor: COLORS.surface, borderColor: COLORS.cardBorder },
                      ]}
                      onPress={() => handleTagChange(tag.label)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={tag.icon}
                        size={14}
                        color={active ? tag.color : COLORS.textDim}
                      />
                      <Text style={[styles.tagLabel, { color: active ? tag.color : COLORS.textMuted }]}>
                        {tag.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* ── Amount Input ──────────────────────────────────────────── */}
            <View style={[styles.section, styles.amountSection]}>
              <Text style={styles.label}>AMOUNT *</Text>
              <View style={[styles.amountRow, isOverBudget && { borderColor: COLORS.crimson + '60' }]}>
                <Text style={[styles.rupee, { color: isOverBudget ? COLORS.crimson : COLORS.mint }]}>₹</Text>
                <TextInput
                  ref={amountInputRef}
                  style={[styles.amountInput, { color: isOverBudget ? COLORS.crimson : COLORS.text }]}
                  placeholder="0.00"
                  placeholderTextColor={COLORS.textDim}
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={setAmount}
                />
                {typedAmount > 0 && (
                  <TouchableOpacity onPress={() => setAmount('')} style={styles.clearBtn}>
                    <Ionicons name="close-circle" size={16} color={COLORS.textDim} />
                  </TouchableOpacity>
                )}
              </View>

              {typedAmount > 0 && (
                <View style={styles.miniTrack}>
                  <View style={[styles.miniFill, { width: `${budgetPct}%`, backgroundColor: barColor }]} />
                </View>
              )}
              {isOverBudget && (
                <Text style={styles.overText}>
                  Over by {formatAmount(typedAmount - remainingBudget)}
                </Text>
              )}
            </View>

            {/* ── Category Budget Warning ───────────────────────────────── */}
            {categoryBudgetInfo && typedAmount > 0 && categoryBudgetInfo.willExceed && (
              <View style={styles.budgetWarningChip}>
                <Ionicons name="alert-circle" size={14} color={COLORS.crimson} />
                <Text style={styles.budgetWarningText}>
                  Will exceed budget by{' '}
                  {formatAmount(categoryBudgetInfo.newTotal - categoryBudgetInfo.budget)}
                </Text>
              </View>
            )}

            {/* ── Expense Name ──────────────────────────────────────────── */}
            <View style={styles.section}>
              <Text style={styles.label}>
                EXPENSE NAME <Text style={styles.optional}>(OPTIONAL)</Text>
              </Text>
              <TextInput
                style={styles.textInput}
                placeholder={selectedTag}
                placeholderTextColor={COLORS.textDim}
                value={expenseName}
                onChangeText={setExpenseName}
              />
            </View>

            {/* ── Note ─────────────────────────────────────────────────── */}
            <View style={styles.section}>
              <Text style={styles.label}>
                NOTE <Text style={styles.optional}>(OPTIONAL)</Text>
              </Text>
              <TextInput
                style={[styles.textInput, styles.noteInput]}
                placeholder="Add a note..."
                placeholderTextColor={COLORS.textDim}
                value={note}
                onChangeText={setNote}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />
            </View>

            {/* ── Submit ────────────────────────────────────────────────── */}
            <TouchableOpacity
              style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              activeOpacity={0.85}
              disabled={isLoading}
            >
              <LinearGradient
                colors={['#00E5A0', '#00B87C']}
                style={styles.submitGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="add" size={18} color={COLORS.bg} />
                <Text style={styles.submitText}>
                  {isLoading ? 'Adding...' : 'Add Expense'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={{ height: Platform.OS === 'ios' ? 40 : 20 }} />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  // FIX: Dedicated backdrop view — sits behind the sheet, absorbs taps to dismiss keyboard
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 10,
    maxHeight: '90%',
    borderTopWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  scrollContent: {
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: COLORS.cardBorder,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  budgetBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  budgetLeft: { flex: 1 },
  bannerLabel: {
    fontSize: 9,
    letterSpacing: 1.2,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  bannerAmount: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  budgetDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.cardBorder,
    marginHorizontal: 12,
  },
  budgetRight: { alignItems: 'flex-end' },
  bannerMeta: {
    fontSize: 10,
    color: COLORS.textDim,
  },
  section: { marginBottom: 16 },
  amountSection: { marginBottom: 8 },
  label: {
    fontSize: 9,
    letterSpacing: 1.2,
    color: COLORS.textMuted,
    marginBottom: 6,
  },
  optional: { color: COLORS.textDim },
  tagScrollContent: { paddingRight: 8, gap: 8 },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
  },
  tagLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingHorizontal: 12,
  },
  rupee: {
    fontSize: 22,
    fontWeight: '700',
    marginRight: 4,
  },
  amountInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: '700',
    paddingVertical: 10,
    letterSpacing: -0.5,
  },
  clearBtn: { padding: 4 },
  miniTrack: {
    height: 3,
    backgroundColor: COLORS.cardBorder,
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  miniFill: {
    height: '100%',
    borderRadius: 2,
  },
  overText: {
    fontSize: 10,
    color: COLORS.crimson,
    marginTop: 4,
  },
  textInput: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
  },
  noteInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  budgetWarningChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.crimsonDim,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 16,
  },
  budgetWarningText: {
    fontSize: 11,
    color: COLORS.crimson,
    fontWeight: '500',
  },
  submitBtn: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  submitText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.bg,
  },
});

export default AddExpenseModal;