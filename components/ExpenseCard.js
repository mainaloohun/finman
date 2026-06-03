import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Design Tokens (in sync with all screens) ─────────────────────────────────
const COLORS = {
  bg:         '#0D0F14',
  surface:    '#141720',
  card:       '#1A1F2E',
  cardBorder: '#252A3A',
  mint:       '#00E5A0',
  mintDim:    'rgba(0,229,160,0.12)',
  amber:      '#F59E0B',
  crimson:    '#EF4444',
  crimsonDim: 'rgba(239,68,68,0.12)',
  text:       '#F0F4FF',
  textMuted:  '#6B7A99',
  textDim:    '#3D4A66',
  violet:     '#818CF8',
};

const TAGS = [
  { label: 'Food',          icon: 'fast-food-outline',          color: '#FF6B6B' },
  { label: 'Transport',     icon: 'car-outline',                color: '#4ECDC4' },
  { label: 'Shopping',      icon: 'bag-outline',                color: '#45B7D1' },
  { label: 'Entertainment', icon: 'game-controller-outline',    color: '#A78BFA' },
  { label: 'Bills',         icon: 'document-text-outline',      color: '#F59E0B' },
  { label: 'Other',         icon: 'ellipsis-horizontal-outline',color: '#6B7A99' },
];

const TAG_MAP = Object.fromEntries(TAGS.map((t) => [t.label, t]));

// ─── Helpers ──────────────────────────────────────────────────────────────────
const safeFloat = (val, fallback = 0) => {
  const n = parseFloat(val);
  return isFinite(n) ? n : fallback;
};

const formatAmount = (n) =>
  `₹${safeFloat(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDateTime = (timestamp) => {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (date.toDateString() === today.toDateString())     return `Today · ${time}`;
  if (date.toDateString() === yesterday.toDateString()) return `Yesterday · ${time}`;
  return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
};

// ─── Component ────────────────────────────────────────────────────────────────
const ExpenseCard = ({ expense, onUpdate, onDelete }) => {
  const [showOptions, setShowOptions] = useState(false);
  const [isEditing,   setIsEditing]   = useState(false);
  const [edited, setEdited] = useState({
    name:   expense.name,
    amount: expense.amount.toString(),
    tag:    expense.tag,
    note:   expense.note || '',
  });

  const meta = TAG_MAP[expense.tag] || TAG_MAP['Other'];

  const handleDelete = () => {
    Alert.alert(
      'Delete Expense',
      `Remove "${expense.name}" and refund ${formatAmount(expense.amount)} to wallet?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const raw = await AsyncStorage.getItem('expenses');
              const all = raw ? JSON.parse(raw) : [];
              await AsyncStorage.setItem(
                'expenses',
                JSON.stringify(all.filter((e) => e.id !== expense.id))
              );
              setShowOptions(false);
              if (onDelete) onDelete(expense.id, expense.amount);
            } catch (err) {
              console.error('Error deleting expense:', err);
              Alert.alert('Error', 'Failed to delete expense.');
            }
          },
        },
      ]
    );
  };

  const handleUpdate = async () => {
    const amount = safeFloat(edited.amount);
    if (amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid positive amount.');
      return;
    }
    if (!edited.name.trim()) {
      Alert.alert('Missing Name', 'Please enter an expense name.');
      return;
    }

    try {
      const raw = await AsyncStorage.getItem('expenses');
      const all = raw ? JSON.parse(raw) : [];
      const idx = all.findIndex((e) => e.id === expense.id);

      if (idx !== -1) {
        const diff = all[idx].amount - amount;
        all[idx] = {
          ...all[idx],
          name:      edited.name.trim(),
          amount,
          tag:       edited.tag,
          note:      edited.note.trim(),
          updatedAt: new Date().toISOString(),
        };
        await AsyncStorage.setItem('expenses', JSON.stringify(all));

        if (diff !== 0) {
          const savedWallet = await AsyncStorage.getItem('walletBalance');
          const newBal = safeFloat(savedWallet) + diff;
          await AsyncStorage.setItem('walletBalance', newBal.toString());
        }

        setIsEditing(false);
        setShowOptions(false);
        if (onUpdate) onUpdate();
      }
    } catch (err) {
      console.error('Error updating expense:', err);
      Alert.alert('Error', 'Failed to update expense.');
    }
  };

  return (
    <>
      <TouchableOpacity
        style={styles.card}
        onLongPress={() => setShowOptions(true)}
        delayLongPress={400}
        activeOpacity={0.7}
      >
        <View style={[styles.accentLine, { backgroundColor: meta.color }]} />
        
        <View style={[styles.iconWrap, { backgroundColor: meta.color + '12' }]}>
          <Ionicons name={meta.icon} size={16} color={meta.color} />
        </View>

        <View style={styles.details}>
          <Text style={styles.name} numberOfLines={1}>{expense.name}</Text>
          <View style={styles.metaRow}>
            <View style={[styles.tagPill, { backgroundColor: meta.color + '12', borderColor: meta.color + '30' }]}>
              <Text style={[styles.tagPillText, { color: meta.color }]}>{expense.tag}</Text>
            </View>
            <Text style={styles.time}>{formatDateTime(expense.timestamp)}</Text>
          </View>
          {expense.note ? (
            <Text style={styles.note} numberOfLines={1}>
              <Ionicons name="chatbubble-outline" size={10} color={COLORS.textDim} /> {expense.note}
            </Text>
          ) : null}
        </View>

        <View style={styles.right}>
          <Text style={styles.amount}>-{formatAmount(expense.amount)}</Text>
          <TouchableOpacity
            style={styles.menuBtn}
            onPress={() => setShowOptions(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="ellipsis-vertical" size={14} color={COLORS.textDim} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {/* Options Modal */}
      <Modal
        visible={showOptions}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOptions(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setShowOptions(false)}
        >
          <View style={styles.optionsMenu}>
            <View style={styles.previewChip}>
              <View style={[styles.previewIcon, { backgroundColor: meta.color + '15' }]}>
                <Ionicons name={meta.icon} size={14} color={meta.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.previewName} numberOfLines={1}>{expense.name}</Text>
                <Text style={styles.previewAmt}>{formatAmount(expense.amount)}</Text>
              </View>
            </View>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => { setShowOptions(false); setIsEditing(true); }}
            >
              <View style={[styles.menuIconWrap, { backgroundColor: COLORS.mintDim }]}>
                <Ionicons name="create-outline" size={14} color={COLORS.mint} />
              </View>
              <Text style={[styles.menuLabel, { color: COLORS.mint }]}>Edit</Text>
              <Ionicons name="chevron-forward" size={12} color={COLORS.textDim} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleDelete}
            >
              <View style={[styles.menuIconWrap, { backgroundColor: COLORS.crimsonDim }]}>
                <Ionicons name="trash-outline" size={14} color={COLORS.crimson} />
              </View>
              <Text style={[styles.menuLabel, { color: COLORS.crimson }]}>Delete</Text>
              <Ionicons name="chevron-forward" size={12} color={COLORS.textDim} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit Modal */}
      <Modal
        visible={isEditing}
        animationType="slide"
        transparent
        onRequestClose={() => setIsEditing(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.editSheet}>
            <View style={styles.handle} />

            <View style={styles.editHeader}>
              <View>
                <Text style={styles.editTitle}>Edit Expense</Text>
                <Text style={styles.editSub}>Update the details</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsEditing(false)}
                style={styles.closeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>AMOUNT</Text>
                <View style={styles.amountRow}>
                  <Text style={styles.rupee}>₹</Text>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="0.00"
                    placeholderTextColor={COLORS.textDim}
                    keyboardType="numeric"
                    value={edited.amount}
                    onChangeText={(t) => setEdited({ ...edited, amount: t })}
                  />
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formLabel}>EXPENSE NAME</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Coffee, Lunch..."
                  placeholderTextColor={COLORS.textDim}
                  value={edited.name}
                  onChangeText={(t) => setEdited({ ...edited, name: t })}
                />
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formLabel}>CATEGORY</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.tagRow}>
                    {TAGS.map((tag) => {
                      const active = edited.tag === tag.label;
                      return (
                        <TouchableOpacity
                          key={tag.label}
                          style={[
                            styles.tagChip,
                            active
                              ? { backgroundColor: tag.color + '18', borderColor: tag.color + '60' }
                              : { backgroundColor: COLORS.surface, borderColor: COLORS.cardBorder },
                          ]}
                          onPress={() => setEdited({ ...edited, tag: tag.label })}
                        >
                          <Ionicons name={tag.icon} size={11} color={active ? tag.color : COLORS.textDim} />
                          <Text style={[styles.tagChipLabel, { color: active ? tag.color : COLORS.textMuted }]}>
                            {tag.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formLabel}>
                  NOTE <Text style={styles.optional}>(OPTIONAL)</Text>
                </Text>
                <TextInput
                  style={[styles.textInput, styles.noteInput]}
                  placeholder="Add a note..."
                  placeholderTextColor={COLORS.textDim}
                  value={edited.note}
                  onChangeText={(t) => setEdited({ ...edited, note: t })}
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.updateBtn,
                  (!edited.name.trim() || safeFloat(edited.amount) <= 0) && styles.updateBtnDisabled,
                ]}
                onPress={handleUpdate}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#00E5A0', '#00B87C']}
                  style={styles.updateGrad}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="checkmark" size={18} color={COLORS.bg} />
                  <Text style={styles.updateBtnText}>Update</Text>
                </LinearGradient>
              </TouchableOpacity>

              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 8,
    overflow: 'hidden',
    paddingVertical: 10,
    paddingRight: 10,
  },
  accentLine: {
    width: 3,
    alignSelf: 'stretch',
    marginRight: 10,
    borderRadius: 2,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  details: {
    flex: 1,
    marginRight: 6,
    gap: 4,
  },
  name: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tagPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.5,
  },
  tagPillText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  time: {
    fontSize: 9,
    color: COLORS.textDim,
  },
  note: {
    fontSize: 10,
    color: COLORS.textMuted,
    flexDirection: 'row',
    alignItems: 'center',
  },
  right: {
    alignItems: 'flex-end',
    gap: 4,
  },
  amount: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.crimson,
  },
  menuBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  optionsMenu: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 12,
    width: 220,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    gap: 2,
  },
  previewChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 10,
  },
  previewIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  previewAmt: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  menuDivider: {
    height: 1,
    backgroundColor: COLORS.cardBorder,
    marginBottom: 6,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 2,
    borderRadius: 10,
  },
  menuIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },

  editSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 10,
    maxHeight: '90%',
    borderTopWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: COLORS.cardBorder,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  editHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  editTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  editSub: {
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

  formSection: {
    marginBottom: 18,
  },
  formLabel: {
    fontSize: 9,
    letterSpacing: 1.5,
    color: COLORS.textMuted,
    marginBottom: 8,
  },
  optional: {
    color: COLORS.textDim,
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
    color: COLORS.mint,
    marginRight: 4,
  },
  amountInput: {
    flex: 1,
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.text,
    paddingVertical: 10,
  },
  textInput: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: COLORS.text,
  },
  noteInput: {
    minHeight: 60,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
  },
  tagChipLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  updateBtn: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 6,
    marginBottom: 10,
  },
  updateBtnDisabled: {
    opacity: 0.4,
  },
  updateGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  updateBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.bg,
  },
});

export default ExpenseCard;