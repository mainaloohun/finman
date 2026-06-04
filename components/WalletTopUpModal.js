// components/WalletTopUpModal.js
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TextInput,
  TouchableOpacity, TouchableWithoutFeedback, Keyboard,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const COLORS = {
  bg: '#0D0F14', surface: '#141720', card: '#1A1F2E',
  cardBorder: '#252A3A', mint: '#00E5A0', amber: '#F59E0B',
  text: '#F0F4FF', textMuted: '#6B7A99', textDim: '#3D4A66',
};

const QUICK_AMOUNTS = [500, 3000, 4500, 10000];

const WalletTopUpModal = ({ visible, onClose, onTopUp, currentBalance }) => {
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef(null);
  const scrollViewRef = useRef(null);

  // Auto-focus when modal opens
  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    } else {
      setAmount('');
      setIsLoading(false);
    }
  }, [visible]);

  const handleSubmit = async () => {
    if (isLoading) return;
    
    const n = parseFloat(amount);
    if (!isFinite(n) || n <= 0) return;
    
    setIsLoading(true);
    await onTopUp(n);
    setIsLoading(false);
    setAmount('');
    onClose();
  };

  const handleQuickAmount = (value) => {
    setAmount(String(value));
    // Keep focus on input for continuous adding
    inputRef.current?.focus();
  };

  const handleClear = () => {
    setAmount('');
    inputRef.current?.focus();
  };

  const scrollToInput = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const typedAmount = parseFloat(amount) || 0;
  const isValid = typedAmount > 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
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
                <Text style={styles.title}>Add Balance</Text>
                <Text style={styles.sub}>
                  Current: ₹{parseFloat(currentBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView
              ref={scrollViewRef}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scrollContent}
              automaticallyAdjustKeyboardInsets={true}
            >
              {/* Quick amounts */}
              <View style={styles.quickRow}>
                {QUICK_AMOUNTS.map((q) => (
                  <TouchableOpacity
                    key={q}
                    style={[
                      styles.quickChip,
                      amount === String(q) && styles.quickChipActive
                    ]}
                    onPress={() => handleQuickAmount(q)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.quickLabel,
                      amount === String(q) && { color: COLORS.mint }
                    ]}>
                      +₹{q.toLocaleString('en-IN')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Custom amount input */}
              <Text style={styles.label}>CUSTOM AMOUNT</Text>
              <View style={styles.amountRow}>
                <Text style={styles.rupee}>₹</Text>
                <TextInput
                  ref={inputRef}
                  style={styles.amountInput}
                  placeholder="0.00"
                  placeholderTextColor={COLORS.textDim}
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={setAmount}
                  onFocus={scrollToInput}
                />
                {amount.length > 0 && (
                  <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
                    <Ionicons name="close-circle" size={18} color={COLORS.textDim} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Preview banner */}
              {typedAmount > 0 && (
                <View style={styles.previewBanner}>
                  <View style={styles.previewLeft}>
                    <Text style={styles.previewLabel}>New Balance</Text>
                    <Text style={styles.previewAmount}>
                      ₹{(currentBalance + typedAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </Text>
                  </View>
                  <View style={styles.previewDivider} />
                  <View style={styles.previewRight}>
                    <Text style={styles.previewLabel}>Adding</Text>
                    <Text style={[styles.previewAdd, { color: COLORS.mint }]}>
                      +₹{typedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </Text>
                  </View>
                </View>
              )}

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.btn, (!isValid || isLoading) && styles.btnDisabled]}
                onPress={handleSubmit}
                activeOpacity={0.85}
                disabled={!isValid || isLoading}
              >
                <LinearGradient
                  colors={['#00E5A0', '#00B87C']}
                  style={styles.btnGrad}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="add-circle-outline" size={20} color={COLORS.bg} />
                  <Text style={styles.btnText}>
                    {isLoading ? 'Adding...' : 'Add to Wallet'}
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
    maxHeight: '85%',
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
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  sub: {
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
  quickRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  quickChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
  },
  quickChipActive: {
    borderColor: COLORS.mint + '70',
    backgroundColor: COLORS.mint + '12',
  },
  quickLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  label: {
    fontSize: 9,
    letterSpacing: 1.5,
    color: COLORS.textMuted,
    marginBottom: 8,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  rupee: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.mint,
    marginRight: 4,
  },
  amountInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    paddingVertical: 10,
    letterSpacing: -0.5,
  },
  clearBtn: {
    padding: 4,
  },
  previewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  previewLeft: {
    flex: 1,
  },
  previewRight: {
    alignItems: 'flex-end',
  },
  previewDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.cardBorder,
    marginHorizontal: 12,
  },
  previewLabel: {
    fontSize: 9,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  previewAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  previewAdd: {
    fontSize: 14,
    fontWeight: '700',
  },
  btn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  btnDisabled: {
    opacity: 0.4,
  },
  btnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  btnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.bg,
  },
});

export default WalletTopUpModal;