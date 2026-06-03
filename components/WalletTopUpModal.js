// components/WalletTopUpModal.js
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TextInput,
  TouchableOpacity, TouchableWithoutFeedback, Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const COLORS = {
  bg: '#0D0F14', surface: '#141720', card: '#1A1F2E',
  cardBorder: '#252A3A', mint: '#00E5A0', amber: '#F59E0B',
  text: '#F0F4FF', textMuted: '#6B7A99', textDim: '#3D4A66',
};

const QUICK_AMOUNTS = [500,3000,4500,10000];

const WalletTopUpModal = ({ visible, onClose, onTopUp, currentBalance }) => {
  const [amount, setAmount] = useState('');

  const handleSubmit = () => {
    const n = parseFloat(amount);
    if (!isFinite(n) || n <= 0) return;
    onTopUp(n);
    setAmount('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.handle} />

            <View style={s.header}>
              <View>
                <Text style={s.title}>Add Balance</Text>
                <Text style={s.sub}>Current: ₹{parseFloat(currentBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={s.closeBtn}>
                <Ionicons name="close" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Quick amounts */}
            <View style={s.quickRow}>
              {QUICK_AMOUNTS.map((q) => (
                <TouchableOpacity
                  key={q}
                  style={[s.quickChip, amount === String(q) && s.quickChipActive]}
                  onPress={() => setAmount(String(q))}
                >
                  <Text style={[s.quickLabel, amount === String(q) && { color: COLORS.mint }]}>
                    +₹{q.toLocaleString('en-IN')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Custom amount input */}
            <Text style={s.label}>CUSTOM AMOUNT</Text>
            <View style={s.amountRow}>
              <Text style={s.rupee}>₹</Text>
              <TextInput
                style={s.amountInput}
                placeholder="0.00"
                placeholderTextColor={COLORS.textDim}
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
                autoFocus
              />
            </View>

            <TouchableOpacity
              style={[s.btn, (!amount || parseFloat(amount) <= 0) && s.btnDisabled]}
              onPress={handleSubmit}
              activeOpacity={0.85}
            >
              <LinearGradient colors={['#00E5A0', '#00B87C']} style={s.btnGrad}>
                <Ionicons name="add-circle-outline" size={20} color={COLORS.bg} />
                <Text style={s.btnText}>Add to Wallet</Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={{ height: 30 }} />
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderColor: COLORS.cardBorder,
  },
  handle: { width: 40, height: 4, backgroundColor: COLORS.cardBorder, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  sub: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  closeBtn: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.card,
    borderWidth: 1, borderColor: COLORS.cardBorder, alignItems: 'center', justifyContent: 'center',
  },
  quickRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  quickChip: {
    flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: COLORS.card,
    borderWidth: 1, borderColor: COLORS.cardBorder, alignItems: 'center',
  },
  quickChipActive: { borderColor: COLORS.mint + '70', backgroundColor: COLORS.mint + '12' },
  quickLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  label: { fontSize: 9, letterSpacing: 1.8, color: COLORS.textMuted, marginBottom: 10 },
  amountRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card,
    borderRadius: 14, borderWidth: 1, borderColor: COLORS.cardBorder, paddingHorizontal: 16, marginBottom: 24,
  },
  rupee: { fontSize: 26, fontWeight: '700', color: COLORS.mint, marginRight: 4 },
  amountInput: { flex: 1, fontSize: 32, fontWeight: '700', color: COLORS.text, paddingVertical: 14 },
  btn: { borderRadius: 14, overflow: 'hidden' },
  btnDisabled: { opacity: 0.4 },
  btnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  btnText: { fontSize: 16, fontWeight: '700', color: COLORS.bg },
});

export default WalletTopUpModal;