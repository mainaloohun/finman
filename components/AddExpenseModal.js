import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  KeyboardAvoidingView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// ─── Design Tokens (must stay in sync with TodayScreen) ──────────────────────
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
  { label: 'Food',          icon: 'fast-food-outline',     color: '#FF6B6B' },
  { label: 'Transport',     icon: 'car-outline',            color: '#4ECDC4' },
  { label: 'Shopping',      icon: 'bag-outline',            color: '#45B7D1' },
  { label: 'Entertainment', icon: 'game-controller-outline',color: '#A78BFA' },
  { label: 'Bills',         icon: 'document-text-outline',  color: '#F59E0B' },
  { label: 'Other',         icon: 'ellipsis-horizontal-outline', color: '#6B7A99' },
];

const safeFloat = (val, fallback = 0) => {
  const n = parseFloat(val);
  return isFinite(n) ? n : fallback;
};

const formatAmount = (n) =>
  `₹${safeFloat(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ─── Component ────────────────────────────────────────────────────────────────
const AddExpenseModal = ({ visible, onClose, onSubmit, remainingBudget = 0, todaySpent = 0, dailyQuota = 0 }) => {
  const [amount, setAmount]           = useState('');
  const [expenseName, setExpenseName] = useState('');
  const [selectedTag, setSelectedTag] = useState('Food');
  const [note, setNote]               = useState('');
  const [categoryBudgetInfo, setCategoryBudgetInfo] = useState(null);
  const [isLoading, setIsLoading]     = useState(false);
  const amountInputRef = useRef(null);
  const scrollViewRef = useRef(null);
  const budgetCacheRef = useRef({});

  useEffect(() => {
    if (!visible) {
      resetForm();
    } else {
      setTimeout(() => {
        amountInputRef.current?.focus();
      }, 300);
    }
  }, [visible]);

  const resetForm = () => {
    setAmount('');
    setExpenseName('');
    setSelectedTag('Food');
    setNote('');
    setCategoryBudgetInfo(null);
    setIsLoading(false);
  };

  // Memoized budget check to prevent unnecessary re-renders
  const checkCategoryBudget = useCallback(async (amountValue, category) => {
    if (amountValue <= 0) return true;
    
    // Create cache key
    const cacheKey = `${category}_${amountValue}`;
    
    // Check cache first
    if (budgetCacheRef.current[cacheKey]) {
      setCategoryBudgetInfo(budgetCacheRef.current[cacheKey]);
      return budgetCacheRef.current[cacheKey].willExceed === false;
    }
    
    try {
      const savedBudgets = await AsyncStorage.getItem('categoryBudgets');
      if (!savedBudgets) return true;

      const budgets = JSON.parse(savedBudgets);
      const categoryBudget = budgets[category];
      if (!categoryBudget) return true;

      const savedExpenses = await AsyncStorage.getItem('expenses');
      let currentSpending = 0;
      
      if (savedExpenses) {
        const allExpenses = JSON.parse(savedExpenses);
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        currentSpending = allExpenses
          .filter(expense => {
            const expenseDate = new Date(expense.timestamp);
            return expense.tag === category && 
                   expenseDate.getMonth() === currentMonth && 
                   expenseDate.getFullYear() === currentYear;
          })
          .reduce((sum, expense) => sum + expense.amount, 0);
      }

      const newTotal = currentSpending + amountValue;
      const budgetInfo = {
        budget: categoryBudget,
        spent: currentSpending,
        remaining: categoryBudget - currentSpending,
        newTotal: newTotal,
        willExceed: newTotal > categoryBudget
      };
      
      // Store in cache
      budgetCacheRef.current[cacheKey] = budgetInfo;
      setCategoryBudgetInfo(budgetInfo);
      
      return !budgetInfo.willExceed;
    } catch (error) {
      console.error('Error checking category budget:', error);
      return true;
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (isLoading) return;
    
    const expenseAmount = safeFloat(amount);

    if (expenseAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid positive amount.');
      return;
    }
    
    setIsLoading(true);
    const finalName = expenseName.trim() || selectedTag;
    const isWithinBudget = await checkCategoryBudget(expenseAmount, selectedTag);

    if (!isWithinBudget && categoryBudgetInfo) {
      setIsLoading(false);
      Alert.alert(
        'Budget Warning',
        `This will exceed your ${selectedTag} budget!\n\n` +
        `Budget: ${formatAmount(categoryBudgetInfo.budget)}\n` +
        `Current: ${formatAmount(categoryBudgetInfo.spent)}\n` +
        `This expense: ${formatAmount(expenseAmount)}\n` +
        `Over by: ${formatAmount(categoryBudgetInfo.newTotal - categoryBudgetInfo.budget)}`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Add Anyway', 
            onPress: async () => {
              const success = await onSubmit({
                amount: expenseAmount,
                name: finalName,
                tag: selectedTag,
                note: note.trim(),
              });
              if (success) onClose();
              setIsLoading(false);
            }
          }
        ]
      );
      return;
    }

    const success = await onSubmit({
      amount: expenseAmount,
      name: finalName,
      tag: selectedTag,
      note: note.trim(),
    });

    setIsLoading(false);
    if (success) onClose();
  }, [amount, expenseName, selectedTag, note, categoryBudgetInfo, isLoading]);

  // Debounced budget check
  useEffect(() => {
    const timer = setTimeout(() => {
      const typedAmount = safeFloat(amount);
      if (typedAmount > 0) {
        checkCategoryBudget(typedAmount, selectedTag);
      } else {
        setCategoryBudgetInfo(null);
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [amount, selectedTag, checkCategoryBudget]);

  // Handle tag change without causing flicker
  const handleTagChange = useCallback((tag) => {
    setSelectedTag(tag);
    // Clear cache when tag changes to force fresh calculation
    budgetCacheRef.current = {};
    // Re-check budget with current amount
    const typedAmount = safeFloat(amount);
    if (typedAmount > 0) {
      checkCategoryBudget(typedAmount, tag);
    }
  }, [amount, checkCategoryBudget]);

  // Scroll to amount input when keyboard opens
  const handleAmountFocus = useCallback(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 120, animated: true });
    }, 100);
  }, []);

  const typedAmount = safeFloat(amount);
  const budgetPct = remainingBudget > 0 ? Math.min((typedAmount / remainingBudget) * 100, 100) : 0;
  const isOverBudget = typedAmount > remainingBudget && remainingBudget > 0;
  const barColor = isOverBudget ? COLORS.crimson : budgetPct > 75 ? COLORS.amber : COLORS.mint;

  // Memoize tag buttons to prevent unnecessary re-renders
  const tagButtons = useMemo(() => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.tagScrollContent}
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
  ), [selectedTag, handleTagChange]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView 
          style={styles.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <View style={styles.sheet}>
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
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scrollContent}
              automaticallyAdjustKeyboardInsets={true}
              keyboardDismissMode="interactive"
            >
              {/* Budget Banner - Compact */}
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

              {/* Tags - Memoized */}
              <View style={styles.section}>
                <Text style={styles.label}>CATEGORY</Text>
                {tagButtons}
              </View>

              {/* Amount Input - Auto-focused with scroll */}
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
                    onFocus={handleAmountFocus}
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

              {/* Category Budget Info - Compact */}
              {categoryBudgetInfo && typedAmount > 0 && categoryBudgetInfo.willExceed && (
                <View style={styles.budgetWarningChip}>
                  <Ionicons name="alert-circle" size={14} color={COLORS.crimson} />
                  <Text style={styles.budgetWarningText}>
                    Will exceed budget by {formatAmount(categoryBudgetInfo.newTotal - categoryBudgetInfo.budget)}
                  </Text>
                </View>
              )}

              {/* Expense Name - Compact */}
              <View style={styles.section}>
                <Text style={styles.label}>EXPENSE NAME <Text style={styles.optional}>(OPTIONAL)</Text></Text>
                <TextInput
                  style={styles.textInput}
                  placeholder={selectedTag}
                  placeholderTextColor={COLORS.textDim}
                  value={expenseName}
                  onChangeText={setExpenseName}
                />
              </View>

              {/* Note - Compact */}
              <View style={styles.section}>
                <Text style={styles.label}>NOTE <Text style={styles.optional}>(OPTIONAL)</Text></Text>
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

              {/* Submit Button - Compact */}
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
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
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
  budgetLeft: {
    flex: 1,
  },
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
  budgetRight: {
    alignItems: 'flex-end',
  },
  bannerMeta: {
    fontSize: 10,
    color: COLORS.textDim,
  },

  section: {
    marginBottom: 16,
  },
  amountSection: {
    marginBottom: 8,
  },
  label: {
    fontSize: 9,
    letterSpacing: 1.2,
    color: COLORS.textMuted,
    marginBottom: 6,
  },
  optional: {
    color: COLORS.textDim,
  },

  tagScrollContent: {
    paddingRight: 8,
  },
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
  clearBtn: {
    padding: 4,
  },
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
  submitBtnDisabled: {
    opacity: 0.6,
  },
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