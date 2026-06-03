import React, { useState, useEffect } from 'react';


// After adding an expense

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
} from 'react-native';
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

  useEffect(() => {
    if (!visible) resetForm();
  }, [visible]);

  const resetForm = () => {
    setAmount('');
    setExpenseName('');
    setSelectedTag('Food');
    setNote('');
  };

  const handleSubmit = async () => {
    const expenseAmount = safeFloat(amount);

    if (expenseAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid positive amount.');
      return;
    }
    
    

    const success = await onSubmit({
      amount: expenseAmount,
      name:   expenseName.trim(),
      tag:    selectedTag,
      note:   note.trim(),
    });

    if (success) onClose();
  };

  // Progress of current amount vs remaining budget
  const typedAmount   = safeFloat(amount);
  const budgetPct     = remainingBudget > 0 ? Math.min((typedAmount / remainingBudget) * 100, 100) : 0;
  const isOverBudget  = typedAmount > remainingBudget && remainingBudget > 0;
  const barColor      = isOverBudget ? COLORS.crimson : budgetPct > 75 ? COLORS.amber : COLORS.mint;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            {/* Handle bar */}
            <View style={styles.handle} />

            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.headerTitle}>New Expense</Text>
                <Text style={styles.headerSub}>Log what you spent</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              {/* Budget Banner */}
              <View style={styles.budgetBanner}>
                <View>
                  <Text style={styles.bannerLabel}>REMAINING TODAY</Text>
                  <Text style={[styles.bannerAmount, { color: isOverBudget ? COLORS.crimson : COLORS.mint }]}>
                    {formatAmount(remainingBudget)}
                  </Text>
                </View>
                <View style={styles.bannerRight}>
                  <Text style={styles.bannerMeta}>Quota  <Text style={styles.bannerMetaVal}>{formatAmount(dailyQuota)}</Text></Text>
                  <Text style={styles.bannerMeta}>Spent  <Text style={styles.bannerMetaVal}>{formatAmount(todaySpent)}</Text></Text>
                </View>
              </View>

              {/* Amount Input */}
              <View style={styles.section}>
                <Text style={styles.label}>AMOUNT</Text>
                <View style={[styles.amountRow, isOverBudget && { borderColor: COLORS.crimson + '60' }]}>
                  <Text style={[styles.rupee, { color: isOverBudget ? COLORS.crimson : COLORS.mint }]}>₹</Text>
                  <TextInput
                    style={[styles.amountInput, { color: isOverBudget ? COLORS.crimson : COLORS.text }]}
                    placeholder="0.00"
                    placeholderTextColor={COLORS.textDim}
                    keyboardType="numeric"
                    value={amount}
                    onChangeText={setAmount}
                    autoFocus
                  />
                  {typedAmount > 0 && (
                    <TouchableOpacity onPress={() => setAmount('')} style={styles.clearBtn}>
                      <Ionicons name="close-circle" size={18} color={COLORS.textDim} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Mini progress bar */}
                {typedAmount > 0 && (
                  <View style={styles.miniTrack}>
                    <View style={[styles.miniFill, { width: `${budgetPct}%`, backgroundColor: barColor }]} />
                  </View>
                )}
                {isOverBudget && (
                  <Text style={styles.overText}>
                    Exceeds remaining budget by {formatAmount(typedAmount - remainingBudget)}
                  </Text>
                )}
              </View>

              {/* Expense Name */}
              <View style={styles.section}>
                <Text style={styles.label}>EXPENSE NAME</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Coffee, Auto, Groceries…"
                  placeholderTextColor={COLORS.textDim}
                  value={expenseName}
                  onChangeText={setExpenseName}
                />
              </View>

              {/* Tags */}
              <View style={styles.section}>
                <Text style={styles.label}>CATEGORY</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.tagRow}>
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
                          onPress={() => setSelectedTag(tag.label)}
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
                  </View>
                </ScrollView>
              </View>

              {/* Note */}
              <View style={styles.section}>
                <Text style={styles.label}>NOTE <Text style={styles.optional}>(OPTIONAL)</Text></Text>
                <TextInput
                  style={[styles.textInput, styles.noteInput]}
                  placeholder="Any extra detail…"
                  placeholderTextColor={COLORS.textDim}
                  value={note}
                  onChangeText={setNote}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              {/* Submit - Always green, always enabled */}
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleSubmit}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#00E5A0', '#00B87C']}
                  style={styles.submitGrad}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="add-circle-outline" size={20} color={COLORS.bg} />
                  <Text style={styles.submitText}>Add Expense</Text>
                </LinearGradient>
              </TouchableOpacity>

              <View style={{ height: 30 }} />
            </ScrollView>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: '92%',
    borderTopWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.cardBorder,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: 0.2,
  },
  headerSub: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Budget Banner
  budgetBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  bannerLabel: {
    fontSize: 9,
    letterSpacing: 1.8,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  bannerAmount: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  bannerRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  bannerMeta: {
    fontSize: 11,
    color: COLORS.textDim,
    letterSpacing: 0.3,
  },
  bannerMetaVal: {
    color: COLORS.textMuted,
    fontWeight: '600',
  },

  // Section
  section: {
    marginBottom: 22,
  },
  label: {
    fontSize: 9,
    letterSpacing: 1.8,
    color: COLORS.textMuted,
    marginBottom: 10,
  },
  optional: {
    color: COLORS.textDim,
    letterSpacing: 1,
  },

  // Amount
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingHorizontal: 16,
  },
  rupee: {
    fontSize: 26,
    fontWeight: '700',
    marginRight: 4,
  },
  amountInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: '700',
    paddingVertical: 14,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
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
    fontSize: 11,
    color: COLORS.crimson,
    marginTop: 6,
    letterSpacing: 0.2,
  },

  // Text inputs
  textInput: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: COLORS.text,
  },
  noteInput: {
    minHeight: 80,
  },

  // Tags
  tagRow: {
    flexDirection: 'row',
    gap: 10,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
  },
  tagLabel: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Submit - Always green
  submitBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 10,
  },
  submitGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.bg,
    letterSpacing: 0.3,
  },
});

export default AddExpenseModal;