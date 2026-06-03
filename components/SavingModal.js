import React, { useState, useEffect } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Design Tokens ─────────────────────────────────────────────────────────
const COLORS = {
  bg:         '#0D0F14',
  surface:    '#141720',
  card:       '#1A1F2E',
  cardBorder: '#252A3A',
  mint:       '#00E5A0',
  mintDim:    'rgba(0,229,160,0.12)',
  amber:      '#F59E0B',
  amberDim:   'rgba(245,158,11,0.15)',
  violet:     '#818CF8',
  violetDim:  'rgba(129,140,248,0.12)',
  violetGlow: 'rgba(129,140,248,0.25)',
  crimson:    '#EF4444',
  text:       '#F0F4FF',
  textMuted:  '#6B7A99',
  textDim:    '#3D4A66',
};

const safeFloat = (val, fallback = 0) => {
  const n = parseFloat(val);
  return isFinite(n) ? n : fallback;
};

const formatAmount = (n) =>
  `₹${safeFloat(n).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

// ─── Savings History Entry with delete/update ──────────────────────────────────
const SavingsEntry = ({ entry, onLongPress }) => (
  <TouchableOpacity 
    style={s.entry}
    onLongPress={() => onLongPress(entry)}
    delayLongPress={400}
    activeOpacity={0.7}
  >
    <View style={s.entryLeft}>
      <View style={s.entryIcon}>
        <Ionicons name="leaf-outline" size={14} color={COLORS.violet} />
      </View>
      <View>
        <Text style={s.entryLabel}>{entry.note || 'Daily saving'}</Text>
        <Text style={s.entryDate}>{entry.date}</Text>
      </View>
    </View>
    <View style={s.entryRight}>
      <Text style={s.entryAmount}>+{formatAmount(entry.amount)}</Text>
      <Ionicons name="ellipsis-vertical" size={14} color={COLORS.textDim} />
    </View>
  </TouchableOpacity>
);

// ─── Main Component ─────────────────────────────────────────────────────────
const SavingsModal = ({
  visible,
  onClose,
  remainingQuota,
  onSave,
  onRefreshData, // New prop to refresh parent data
}) => {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [totalSaved, setTotalSaved] = useState(0);
  const [history, setHistory] = useState([]);
  const [tab, setTab] = useState('save');
  const [error, setError] = useState('');
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedNote, setEditedNote] = useState('');
  const [editedAmount, setEditedAmount] = useState('');

  // Load savings data whenever modal opens
  useEffect(() => {
    if (visible) {
      loadSavings();
      setAmount('');
      setNote('');
      setError('');
      setTab('save');
    }
  }, [visible]);

  const loadSavings = async () => {
    try {
      const raw = await AsyncStorage.getItem('savingsWallet');
      if (raw) {
        const data = JSON.parse(raw);
        setTotalSaved(safeFloat(data.total));
        setHistory(data.entries || []);
      } else {
        setTotalSaved(0);
        setHistory([]);
      }
    } catch (err) {
      console.error('Error loading savings:', err);
    }
  };

  // Function to refresh all data (wallet balance, quota, etc.)
  const refreshAllData = async () => {
    try {
      // Refresh wallet balance and quota by calling onRefreshData if provided
      if (onRefreshData) {
        await onRefreshData();
      }
    } catch (err) {
      console.error('Error refreshing data:', err);
    }
  };

  const QUICK_PCTS = [25, 50, 75, 100];

  const handleQuickPct = (pct) => {
    const val = (remainingQuota * pct) / 100;
    setAmount(val.toFixed(2));
    setError('');
  };

  const handleAmountChange = (text) => {
    setAmount(text);
    setError('');
  };

  const handleSave = async () => {
    const saveAmount = safeFloat(amount);

    if (saveAmount <= 0) {
      setError('Please enter a valid amount.');
      return;
    }
    if (saveAmount > remainingQuota) {
      setError(`Max you can save today is ${formatAmount(remainingQuota)}.`);
      return;
    }

    try {
      // 1. Update wallet balance (deduct from wallet)
      const savedWallet = await AsyncStorage.getItem('walletBalance');
      const currentWallet = savedWallet !== null ? safeFloat(savedWallet) : 0;
      
      if (saveAmount > currentWallet) {
        setError(`Insufficient wallet balance. You only have ${formatAmount(currentWallet)}`);
        return;
      }
      
      const newWalletBalance = currentWallet - saveAmount;
      await AsyncStorage.setItem('walletBalance', newWalletBalance.toString());

      // 2. Update savings wallet
      const raw = await AsyncStorage.getItem('savingsWallet');
      const existing = raw ? JSON.parse(raw) : { total: 0, entries: [] };

      const newEntry = {
        id: Date.now().toString(),
        amount: saveAmount,
        note: note.trim() || 'Daily saving',
        date: new Date().toLocaleDateString('en-IN', {
          day: 'numeric', month: 'short', year: 'numeric',
        }),
        timestamp: new Date().toISOString(),
      };

      const updated = {
        total: safeFloat(existing.total) + saveAmount,
        entries: [newEntry, ...(existing.entries || [])],
      };

      await AsyncStorage.setItem('savingsWallet', JSON.stringify(updated));

      // 3. Notify parent to update UI (quota and spent)
      if (onSave) onSave(saveAmount);

      // 4. Refresh all data
      await refreshAllData();

      // 5. Refresh local savings data
      await loadSavings();
      
      setAmount('');
      setNote('');
      setError('');
      setTab('history');
      
      Alert.alert('Success', `₹${saveAmount.toFixed(2)} moved to savings!`);
    } catch (err) {
      console.error('Error saving:', err);
      setError('Something went wrong. Please try again.');
    }
  };

  // Handle delete savings entry
  const handleDeleteEntry = async () => {
    Alert.alert(
      'Delete Savings',
      `Remove ${formatAmount(selectedEntry.amount)} from savings?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const raw = await AsyncStorage.getItem('savingsWallet');
              if (raw) {
                const data = JSON.parse(raw);
                const updatedEntries = data.entries.filter(e => e.id !== selectedEntry.id);
                const newTotal = updatedEntries.reduce((sum, e) => sum + e.amount, 0);
                
                await AsyncStorage.setItem('savingsWallet', JSON.stringify({
                  total: newTotal,
                  entries: updatedEntries
                }));
                
                setOptionsVisible(false);
                await loadSavings();
                await refreshAllData();
                Alert.alert('Success', 'Savings entry deleted');
              }
            } catch (err) {
              console.error('Error deleting savings:', err);
              Alert.alert('Error', 'Failed to delete savings entry');
            }
          },
        },
      ]
    );
  };

  // Handle update savings entry
  const handleUpdateEntry = async () => {
    const newAmount = safeFloat(editedAmount);
    if (newAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid positive amount');
      return;
    }

    try {
      const raw = await AsyncStorage.getItem('savingsWallet');
      if (raw) {
        const data = JSON.parse(raw);
        const entryIndex = data.entries.findIndex(e => e.id === selectedEntry.id);
        
        if (entryIndex !== -1) {
          const oldAmount = data.entries[entryIndex].amount;
          const amountDiff = newAmount - oldAmount;
          
          // Update wallet balance if amount changed
          if (amountDiff !== 0) {
            const savedWallet = await AsyncStorage.getItem('walletBalance');
            const currentWallet = safeFloat(savedWallet);
            // If amount increased, deduct more from wallet
            // If amount decreased, add back to wallet
            const newWalletBalance = currentWallet - amountDiff;
            await AsyncStorage.setItem('walletBalance', newWalletBalance.toString());
          }
          
          data.entries[entryIndex] = {
            ...data.entries[entryIndex],
            amount: newAmount,
            note: editedNote.trim() || data.entries[entryIndex].note,
            updatedAt: new Date().toISOString()
          };
          
          data.total = data.entries.reduce((sum, e) => sum + e.amount, 0);
          
          await AsyncStorage.setItem('savingsWallet', JSON.stringify(data));
          
          setIsEditing(false);
          setOptionsVisible(false);
          await loadSavings();
          await refreshAllData();
          Alert.alert('Success', 'Savings entry updated');
        }
      }
    } catch (err) {
      console.error('Error updating savings:', err);
      Alert.alert('Error', 'Failed to update savings entry');
    }
  };

  const openEditModal = () => {
    setEditedNote(selectedEntry.note || '');
    setEditedAmount(selectedEntry.amount.toString());
    setOptionsVisible(false);
    setIsEditing(true);
  };

  const typedAmount = safeFloat(amount);
  const isOver = typedAmount > remainingQuota;
  const barPct = remainingQuota > 0
    ? Math.min((typedAmount / remainingQuota) * 100, 100)
    : 0;
  const barColor = isOver ? COLORS.crimson : barPct > 75 ? COLORS.amber : COLORS.violet;

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent
        onRequestClose={onClose}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={s.overlay}>
            <View style={s.sheet}>
              <View style={s.handle} />

              <View style={s.header}>
                <View style={s.headerLeft}>
                  <View style={s.headerIcon}>
                    <Ionicons name="leaf-outline" size={18} color={COLORS.violet} />
                  </View>
                  <View>
                    <Text style={s.title}>Savings Wallet</Text>
                    <Text style={s.sub}>Move money to savings</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={onClose} style={s.closeBtn}>
                  <Ionicons name="close" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={s.savingsBanner}>
                <View style={s.glowBlob} />
                <View>
                  <Text style={s.bannerLabel}>TOTAL SAVED</Text>
                  <Text style={s.bannerAmount}>{formatAmount(totalSaved)}</Text>
                </View>
                <View style={s.bannerRight}>
                  <Text style={s.bannerMeta}>
                    Available to save{'\n'}
                    <Text style={s.bannerMetaVal}>{formatAmount(remainingQuota)}</Text>
                  </Text>
                </View>
              </View>

              <View style={s.tabRow}>
                {['save', 'history'].map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[s.tabBtn, tab === t && s.tabBtnActive]}
                    onPress={() => setTab(t)}
                  >
                    <Ionicons
                      name={t === 'save' ? 'add-circle-outline' : 'time-outline'}
                      size={14}
                      color={tab === t ? COLORS.violet : COLORS.textDim}
                    />
                    <Text style={[s.tabLabel, tab === t && { color: COLORS.violet }]}>
                      {t === 'save' ? 'Save Today' : 'History'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {tab === 'save' && (
                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  <Text style={s.label}>QUICK SAVE</Text>
                  <View style={s.quickRow}>
                    {QUICK_PCTS.map((pct) => (
                      <TouchableOpacity
                        key={pct}
                        style={[
                          s.quickChip,
                          amount === ((remainingQuota * pct) / 100).toFixed(2) && s.quickChipActive,
                        ]}
                        onPress={() => handleQuickPct(pct)}
                      >
                        <Text style={[
                          s.quickPct,
                          amount === ((remainingQuota * pct) / 100).toFixed(2) && { color: COLORS.violet },
                        ]}>
                          {pct}%
                        </Text>
                        <Text style={[
                          s.quickAmt,
                          amount === ((remainingQuota * pct) / 100).toFixed(2) && { color: COLORS.violet },
                        ]}>
                          {formatAmount((remainingQuota * pct) / 100)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={[s.label, { marginTop: 8 }]}>CUSTOM AMOUNT</Text>
                  <View style={[s.amountRow, isOver && { borderColor: COLORS.crimson + '60' }]}>
                    <Text style={[s.rupee, { color: isOver ? COLORS.crimson : COLORS.violet }]}>₹</Text>
                    <TextInput
                      style={[s.amountInput, { color: isOver ? COLORS.crimson : COLORS.text }]}
                      placeholder="0.00"
                      placeholderTextColor={COLORS.textDim}
                      keyboardType="numeric"
                      value={amount}
                      onChangeText={handleAmountChange}
                    />
                    {typedAmount > 0 && (
                      <TouchableOpacity onPress={() => { setAmount(''); setError(''); }}>
                        <Ionicons name="close-circle" size={18} color={COLORS.textDim} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {typedAmount > 0 && (
                    <View style={s.miniTrack}>
                      <View style={[s.miniFill, { width: `${barPct}%`, backgroundColor: barColor }]} />
                    </View>
                  )}

                  {error ? (
                    <Text style={s.errorText}>{error}</Text>
                  ) : typedAmount > 0 && !isOver ? (
                    <Text style={s.hintText}>
                      {formatAmount(remainingQuota - typedAmount)} will remain spendable today
                    </Text>
                  ) : null}

                  <Text style={[s.label, { marginTop: 16 }]}>
                    NOTE <Text style={s.optional}>(OPTIONAL)</Text>
                  </Text>
                  <TextInput
                    style={s.noteInput}
                    placeholder="e.g., Salary savings, Daily saving..."
                    placeholderTextColor={COLORS.textDim}
                    value={note}
                    onChangeText={setNote}
                  />

                  <TouchableOpacity
                    style={[s.saveBtn, (typedAmount <= 0 || isOver) && s.saveBtnDisabled]}
                    onPress={handleSave}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={['#818CF8', '#6366F1']}
                      style={s.saveBtnGrad}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Ionicons name="leaf-outline" size={20} color="#fff" />
                      <Text style={s.saveBtnText}>Move to Savings</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <View style={{ height: 30 }} />
                </ScrollView>
              )}

              {tab === 'history' && (
                <ScrollView showsVerticalScrollIndicator={false}>
                  {history.length === 0 ? (
                    <View style={s.emptyHistory}>
                      <View style={s.emptyIcon}>
                        <Ionicons name="leaf-outline" size={30} color={COLORS.textDim} />
                      </View>
                      <Text style={s.emptyTitle}>No savings yet</Text>
                      <Text style={s.emptyText}>
                        Switch to Save Today to start saving
                      </Text>
                    </View>
                  ) : (
                    history.map((entry) => (
                      <SavingsEntry 
                        key={entry.id} 
                        entry={entry}
                        onLongPress={(entry) => {
                          setSelectedEntry(entry);
                          setOptionsVisible(true);
                        }}
                      />
                    ))
                  )}
                  <View style={{ height: 30 }} />
                </ScrollView>
              )}
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Options Modal for Savings Entry */}
      <Modal
        visible={optionsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setOptionsVisible(false)}
      >
        <TouchableOpacity
          style={s.overlay}
          activeOpacity={1}
          onPress={() => setOptionsVisible(false)}
        >
          <View style={s.optionsMenu}>
            <View style={s.previewChip}>
              <View style={[s.previewIcon, { backgroundColor: COLORS.violet + '15' }]}>
                <Ionicons name="leaf-outline" size={14} color={COLORS.violet} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.previewName} numberOfLines={1}>
                  {selectedEntry?.note || 'Daily saving'}
                </Text>
                <Text style={s.previewAmt}>
                  {formatAmount(selectedEntry?.amount || 0)}
                </Text>
              </View>
            </View>

            <View style={s.menuDivider} />

            <TouchableOpacity style={s.menuItem} onPress={openEditModal}>
              <View style={[s.menuIconWrap, { backgroundColor: COLORS.mintDim }]}>
                <Ionicons name="create-outline" size={14} color={COLORS.mint} />
              </View>
              <Text style={[s.menuLabel, { color: COLORS.mint }]}>Edit</Text>
              <Ionicons name="chevron-forward" size={12} color={COLORS.textDim} />
            </TouchableOpacity>

            <TouchableOpacity style={s.menuItem} onPress={handleDeleteEntry}>
              <View style={[s.menuIconWrap, { backgroundColor: COLORS.crimsonDim }]}>
                <Ionicons name="trash-outline" size={14} color={COLORS.crimson} />
              </View>
              <Text style={[s.menuLabel, { color: COLORS.crimson }]}>Delete</Text>
              <Ionicons name="chevron-forward" size={12} color={COLORS.textDim} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit Modal for Savings Entry */}
      <Modal
        visible={isEditing}
        animationType="slide"
        transparent
        onRequestClose={() => setIsEditing(false)}
      >
        <View style={s.overlay}>
          <View style={s.editSheet}>
            <View style={s.handle} />

            <View style={s.editHeader}>
              <View>
                <Text style={s.editTitle}>Edit Savings</Text>
                <Text style={s.editSub}>Update the details</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsEditing(false)}
                style={s.closeBtn}
              >
                <Ionicons name="close" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={s.formSection}>
                <Text style={s.formLabel}>AMOUNT</Text>
                <View style={s.amountRow}>
                  <Text style={s.rupee}>₹</Text>
                  <TextInput
                    style={s.amountInput}
                    placeholder="0.00"
                    placeholderTextColor={COLORS.textDim}
                    keyboardType="numeric"
                    value={editedAmount}
                    onChangeText={setEditedAmount}
                  />
                </View>
              </View>

              <View style={s.formSection}>
                <Text style={s.formLabel}>
                  NOTE <Text style={s.optional}>(OPTIONAL)</Text>
                </Text>
                <TextInput
                  style={[s.textInput, s.noteInput]}
                  placeholder="Add a note..."
                  placeholderTextColor={COLORS.textDim}
                  value={editedNote}
                  onChangeText={setEditedNote}
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity
                style={[s.updateBtn, (!editedAmount || safeFloat(editedAmount) <= 0) && s.updateBtnDisabled]}
                onPress={handleUpdateEntry}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#818CF8', '#6366F1']}
                  style={s.updateGrad}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="checkmark" size={18} color="#fff" />
                  <Text style={s.updateBtnText}>Update</Text>
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

// ─── Styles ────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
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

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.violetDim,
    borderWidth: 1,
    borderColor: COLORS.violet + '40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  sub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 1,
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

  savingsBanner: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.violet + '30',
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  glowBlob: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.violetGlow,
  },
  bannerLabel: {
    fontSize: 9,
    letterSpacing: 2,
    color: COLORS.textMuted,
    marginBottom: 6,
  },
  bannerAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.violet,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  bannerRight: {
    alignItems: 'flex-end',
  },
  bannerMeta: {
    fontSize: 11,
    color: COLORS.textDim,
    textAlign: 'right',
    lineHeight: 18,
  },
  bannerMetaVal: {
    color: COLORS.mint,
    fontWeight: '700',
    fontSize: 13,
  },

  tabRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 4,
    marginBottom: 20,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: COLORS.violetDim,
    borderWidth: 1,
    borderColor: COLORS.violet + '40',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textDim,
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

  quickRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  quickChip: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 3,
  },
  quickChipActive: {
    borderColor: COLORS.violet + '70',
    backgroundColor: COLORS.violetDim,
  },
  quickPct: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  quickAmt: {
    fontSize: 9,
    color: COLORS.textDim,
    letterSpacing: 0.3,
    fontVariant: ['tabular-nums'],
  },

  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingHorizontal: 16,
    marginBottom: 8,
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
  miniTrack: {
    height: 3,
    backgroundColor: COLORS.cardBorder,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  miniFill: {
    height: '100%',
    borderRadius: 2,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.crimson,
    marginBottom: 8,
  },
  hintText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 8,
  },
  noteInput: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 20,
  },

  saveBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  saveBtnDisabled: {
    opacity: 0.4,
  },
  saveBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },

  entry: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 14,
    marginBottom: 10,
  },
  entryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  entryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  entryIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.violetDim,
    borderWidth: 1,
    borderColor: COLORS.violet + '40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  entryDate: {
    fontSize: 11,
    color: COLORS.textDim,
    marginTop: 2,
  },
  entryAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.violet,
    fontVariant: ['tabular-nums'],
  },

  emptyHistory: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textDim,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Options Menu Styles
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
    maxHeight: '60%',
    borderTopWidth: 1,
    borderColor: COLORS.cardBorder,
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
  formSection: {
    marginBottom: 18,
  },
  formLabel: {
    fontSize: 9,
    letterSpacing: 1.5,
    color: COLORS.textMuted,
    marginBottom: 8,
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
    color: '#fff',
  },
});

export default SavingsModal;