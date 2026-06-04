import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const COLORS = {
  bg: '#0D0F14',
  surface: '#141720',
  card: '#1A1F2E',
  cardBorder: '#252A3A',
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

const BUDGET_CATEGORIES = [
  { name: 'Food', icon: 'fast-food-outline', defaultBudget: 5000, color: '#FF6B6B' },
  { name: 'Transport', icon: 'car-outline', defaultBudget: 3000, color: '#4ECDC4' },
  { name: 'Shopping', icon: 'bag-outline', defaultBudget: 4000, color: '#45B7D1' },
  { name: 'Entertainment', icon: 'game-controller-outline', defaultBudget: 3000, color: '#A78BFA' },
  { name: 'Bills', icon: 'document-text-outline', defaultBudget: 10000, color: '#F59E0B' },
  { name: 'Other', icon: 'ellipsis-horizontal-outline', defaultBudget: 2000, color: '#6B7A99' },
];

const BudgetManager = ({ visible, onClose, onBudgetUpdate }) => {
  const [budgets, setBudgets] = useState({});
  const [editingCategory, setEditingCategory] = useState(null);
  const [editAmount, setEditAmount] = useState('');

  useEffect(() => {
    if (visible) {
      loadBudgets();
    }
  }, [visible]);

  const loadBudgets = async () => {
    try {
      const savedBudgets = await AsyncStorage.getItem('categoryBudgets');
      if (savedBudgets) {
        setBudgets(JSON.parse(savedBudgets));
      } else {
        // Initialize default budgets
        const defaultBudgets = {};
        BUDGET_CATEGORIES.forEach(cat => {
          defaultBudgets[cat.name] = cat.defaultBudget;
        });
        setBudgets(defaultBudgets);
        await AsyncStorage.setItem('categoryBudgets', JSON.stringify(defaultBudgets));
      }
    } catch (error) {
      console.error('Error loading budgets:', error);
    }
  };

  const saveBudgets = async (newBudgets) => {
    try {
      await AsyncStorage.setItem('categoryBudgets', JSON.stringify(newBudgets));
      setBudgets(newBudgets);
      if (onBudgetUpdate) onBudgetUpdate(newBudgets);
    } catch (error) {
      console.error('Error saving budgets:', error);
    }
  };

  const handleEditBudget = (category) => {
    setEditingCategory(category);
    setEditAmount(budgets[category]?.toString() || '0');
  };

  const handleSaveBudget = () => {
    const amount = parseFloat(editAmount);
    if (isNaN(amount) || amount < 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid positive amount');
      return;
    }

    const newBudgets = { ...budgets, [editingCategory]: amount };
    saveBudgets(newBudgets);
    setEditingCategory(null);
    setEditAmount('');
  };

  const handleResetAll = () => {
    Alert.alert(
      'Reset All Budgets',
      'Are you sure you want to reset all budgets to default values?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          onPress: () => {
            const defaultBudgets = {};
            BUDGET_CATEGORIES.forEach(cat => {
              defaultBudgets[cat.name] = cat.defaultBudget;
            });
            saveBudgets(defaultBudgets);
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Budget Settings</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {BUDGET_CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category.name}
                style={styles.budgetItem}
                onPress={() => handleEditBudget(category.name)}
              >
                <View style={styles.budgetLeft}>
                  <View style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}>
                    <Ionicons name={category.icon} size={20} color={category.color} />
                  </View>
                  <View>
                    <Text style={styles.categoryName}>{category.name}</Text>
                    <Text style={styles.categoryDefault}>Default: ₹{category.defaultBudget}</Text>
                  </View>
                </View>
                <View style={styles.budgetRight}>
                  <Text style={styles.budgetAmount}>₹{budgets[category.name]?.toFixed(2) || '0'}</Text>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.textDim} />
                </View>
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={styles.resetButton} onPress={handleResetAll}>
              <Ionicons name="refresh-outline" size={20} color={COLORS.crimson} />
              <Text style={styles.resetText}>Reset All to Default</Text>
            </TouchableOpacity>

            <View style={styles.infoCard}>
              <Ionicons name="information-circle-outline" size={20} color={COLORS.mint} />
              <Text style={styles.infoText}>
                Set monthly budgets for each category. You'll get warnings when spending reaches 80% and 100% of your budget.
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>

      {/* Edit Budget Modal */}
      <Modal
        visible={editingCategory !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingCategory(null)}
      >
        <View style={styles.editOverlay}>
          <View style={styles.editModal}>
            <Text style={styles.editTitle}>Edit {editingCategory} Budget</Text>
            <TextInput
              style={styles.editInput}
              keyboardType="numeric"
              value={editAmount}
              onChangeText={setEditAmount}
              placeholder="Enter amount"
              placeholderTextColor={COLORS.textDim}
              autoFocus
            />
            <View style={styles.editButtons}>
              <TouchableOpacity
                style={[styles.editButton, styles.cancelButton]}
                onPress={() => setEditingCategory(null)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editButton, styles.saveButton]}
                onPress={handleSaveBudget}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
  },
  budgetItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  budgetLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  categoryDefault: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  budgetRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  budgetAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.mint,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    marginTop: 10,
    backgroundColor: COLORS.crimsonDim,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.crimson + '40',
  },
  resetText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.crimson,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
  editOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editModal: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    width: '80%',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  editTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  editInput: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 14,
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.mint,
    textAlign: 'center',
    marginBottom: 20,
  },
  editButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  saveButton: {
    backgroundColor: COLORS.mint,
  },
  cancelButtonText: {
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  saveButtonText: {
    color: COLORS.bg,
    fontWeight: '700',
  },
});

export default BudgetManager;