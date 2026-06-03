import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
  Modal,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const COLORS = {
  bg:          '#0D0F14',
  surface:     '#141720',
  card:        '#1A1F2E',
  cardBorder:  '#252A3A',
  mint:        '#00E5A0',
  mintDim:     'rgba(0,229,160,0.12)',
  amber:       '#F59E0B',
  amberDim:    'rgba(245,158,11,0.15)',
  violet:      '#818CF8',
  violetDim:   'rgba(129,140,248,0.12)',
  violetGlow:  'rgba(129,140,248,0.25)',
  crimson:     '#EF4444',
  crimsonDim:  'rgba(239,68,68,0.12)',
  sky:         '#38BDF8',
  skyDim:      'rgba(56,189,248,0.12)',
  text:        '#F0F4FF',
  textMuted:   '#6B7A99',
  textDim:     '#3D4A66',
};

const safeFloat = (val, fallback = 0) => {
  const n = parseFloat(val);
  return isFinite(n) ? n : fallback;
};

const fmt = (n) =>
  `₹${safeFloat(n).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const fmtCompact = (n) => {
  const v = safeFloat(n);
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000)   return `₹${(v / 1000).toFixed(1)}K`;
  return `₹${v.toFixed(0)}`;
};

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ─── Helper: get month key ────────────────────────────────────────────────────
const monthKey = (date) => `${date.getFullYear()}-${date.getMonth()}`;
const monthLabel = (date) => `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;

// ─── Micro Components ─────────────────────────────────────────────────────────

const InfoRow = ({ label, value, valueColor = COLORS.text, dimLabel = false }) => (
  <View style={micro.infoRow}>
    <Text style={[micro.infoLabel, dimLabel && { color: COLORS.textDim }]}>{label}</Text>
    <Text style={[micro.infoValue, { color: valueColor }]}>{value}</Text>
  </View>
);

const SectionHeader = ({ title, count }) => (
  <View style={micro.sectionHead}>
    <Text style={micro.sectionTitle}>{title}</Text>
    {count !== undefined && (
      <View style={micro.sectionBadge}>
        <Text style={micro.sectionBadgeText}>{count}</Text>
      </View>
    )}
  </View>
);

const Divider = () => <View style={micro.divider} />;

const micro = StyleSheet.create({
  infoRow:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7 },
  infoLabel:        { fontSize: 12, color: COLORS.textMuted },
  infoValue:        { fontSize: 13, fontWeight: '700', letterSpacing: -0.2 },
  sectionHead:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle:     { fontSize: 14, fontWeight: '700', color: COLORS.text, letterSpacing: 0.1 },
  sectionBadge:     { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  sectionBadgeText: { fontSize: 11, color: COLORS.textMuted },
  divider:          { height: 1, backgroundColor: COLORS.cardBorder, marginVertical: 6 },
});

// ─── Projection Row ───────────────────────────────────────────────────────────
const ProjectionRow = ({ icon, iconColor, label, value, sub, highlight }) => (
  <View style={[projStyles.row, highlight && { backgroundColor: COLORS.violetDim, borderRadius: 10, borderWidth: 1, borderColor: COLORS.violet + '30' }]}>
    <View style={[projStyles.iconBox, { backgroundColor: iconColor + '15' }]}>
      <Ionicons name={icon} size={14} color={iconColor} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={projStyles.label}>{label}</Text>
      {sub ? <Text style={projStyles.sub}>{sub}</Text> : null}
    </View>
    <Text style={[projStyles.value, { color: highlight ? COLORS.violet : COLORS.text }]}>{value}</Text>
  </View>
);

const projStyles = StyleSheet.create({
  row:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 8 },
  iconBox: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  label:   { fontSize: 12, color: COLORS.textMuted },
  sub:     { fontSize: 10, color: COLORS.textDim, marginTop: 1 },
  value:   { fontSize: 14, fontWeight: '700', letterSpacing: -0.3 },
});

// ─── Monthly Analytics Block (no graph) ──────────────────────────────────────
const MonthBlock = ({ label, total, entries, prevTotal, isCurrent }) => {
  const pct = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : null;
  const up  = pct !== null && pct >= 0;
  const avg = entries > 0 ? total / entries : 0;

  return (
    <View style={[monthStyles.block, isCurrent && { borderColor: COLORS.violet + '50' }]}>
      <View style={monthStyles.top}>
        <View>
          <Text style={monthStyles.month}>{label}</Text>
          {isCurrent && (
            <View style={monthStyles.currentTag}>
              <Text style={monthStyles.currentTagText}>Current</Text>
            </View>
          )}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={monthStyles.total}>{fmt(total)}</Text>
          {pct !== null && (
            <View style={[monthStyles.changePill, { backgroundColor: up ? COLORS.mintDim : COLORS.crimsonDim }]}>
              <Ionicons name={up ? 'arrow-up' : 'arrow-down'} size={9} color={up ? COLORS.mint : COLORS.crimson} />
              <Text style={[monthStyles.changePct, { color: up ? COLORS.mint : COLORS.crimson }]}>
                {Math.abs(pct).toFixed(1)}%
              </Text>
            </View>
          )}
        </View>
      </View>
      <Divider />
      <View style={monthStyles.stats}>
        <View style={monthStyles.stat}>
          <Text style={monthStyles.statVal}>{entries}</Text>
          <Text style={monthStyles.statLab}>entries</Text>
        </View>
        <View style={monthStyles.statDiv} />
        <View style={monthStyles.stat}>
          <Text style={monthStyles.statVal}>{fmtCompact(avg)}</Text>
          <Text style={monthStyles.statLab}>avg/entry</Text>
        </View>
        <View style={monthStyles.statDiv} />
        <View style={monthStyles.stat}>
          <Text style={[monthStyles.statVal, { color: up ? COLORS.mint : entries > 0 ? COLORS.amber : COLORS.textDim }]}>
            {total > 0 ? (up ? '↑ Better' : '↓ Lower') : '—'}
          </Text>
          <Text style={monthStyles.statLab}>vs prev</Text>
        </View>
      </View>
    </View>
  );
};

const monthStyles = StyleSheet.create({
  block:      { backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.cardBorder, padding: 14, marginBottom: 10 },
  top:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  month:      { fontSize: 15, fontWeight: '700', color: COLORS.text },
  currentTag: { backgroundColor: COLORS.violetDim, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginTop: 3, alignSelf: 'flex-start' },
  currentTagText: { fontSize: 9, color: COLORS.violet, fontWeight: '700', letterSpacing: 0.5 },
  total:      { fontSize: 18, fontWeight: '800', color: COLORS.violet, letterSpacing: -0.3 },
  changePill: { flexDirection: 'row', alignItems: 'center', gap: 2, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, marginTop: 3 },
  changePct:  { fontSize: 10, fontWeight: '700' },
  stats:      { flexDirection: 'row', alignItems: 'center', paddingTop: 8 },
  stat:       { flex: 1, alignItems: 'center' },
  statDiv:    { width: 1, height: 24, backgroundColor: COLORS.cardBorder },
  statVal:    { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  statLab:    { fontSize: 9, color: COLORS.textDim, letterSpacing: 0.4 },
});

// ─── Savings Entry Row ────────────────────────────────────────────────────────
const SavingsEntry = ({ entry, onLongPress }) => (
  <TouchableOpacity
    style={entryStyles.card}
    onLongPress={() => onLongPress(entry)}
    delayLongPress={400}
    activeOpacity={0.7}
  >
    <View style={entryStyles.iconWrap}>
      <Ionicons name="leaf-outline" size={14} color={COLORS.violet} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={entryStyles.note} numberOfLines={1}>{entry.note || 'Daily saving'}</Text>
      <Text style={entryStyles.date}>{entry.date}</Text>
    </View>
    <View style={{ alignItems: 'flex-end' }}>
      <Text style={entryStyles.amount}>+{fmt(entry.amount)}</Text>
      <Ionicons name="ellipsis-vertical" size={12} color={COLORS.textDim} style={{ marginTop: 2 }} />
    </View>
  </TouchableOpacity>
);

const entryStyles = StyleSheet.create({
  card:     { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.cardBorder, padding: 12, marginBottom: 8 },
  iconWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.violetDim, borderWidth: 1, borderColor: COLORS.violet + '40', alignItems: 'center', justifyContent: 'center' },
  note:     { fontSize: 13, fontWeight: '600', color: COLORS.text },
  date:     { fontSize: 10, color: COLORS.textDim, marginTop: 1 },
  amount:   { fontSize: 14, fontWeight: '700', color: COLORS.violet },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function SavingsScreen() {
  const [totalSaved,    setTotalSaved]    = useState(0);
  const [history,       setHistory]       = useState([]);
  const [activeTab,     setActiveTab]     = useState('overview'); // overview | monthly | history
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [isEditing,     setIsEditing]     = useState(false);
  const [editedNote,    setEditedNote]    = useState('');
  const [editedAmount,  setEditedAmount]  = useState('');

  // ── Load ────────────────────────────────────────────────────────────────────
  const loadSavings = useCallback(async () => {
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
  }, []);

  useFocusEffect(useCallback(() => { loadSavings(); }, [loadSavings]));

  // ── Derived stats ───────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const now       = new Date();
    const thisMonK  = monthKey(now);
    const lastMon   = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonK  = monthKey(lastMon);
    const todayStr  = now.toDateString();

    let todayTotal = 0, thisMonTotal = 0, lastMonTotal = 0;
    let thisMonEntries = 0, lastMonEntries = 0;
    let streak = 0, streakMap = {};
    let allTimeMax = 0, allTimeMaxDate = '';
    const monthMap = {}; // monthKey → { total, entries, label, date }

    // Sort entries newest-first for streak calc
    const sorted = [...history].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    sorted.forEach((e) => {
      const d   = new Date(e.timestamp);
      const mk  = monthKey(d);
      if (!monthMap[mk]) monthMap[mk] = { total: 0, entries: 0, label: monthLabel(d), date: d };
      monthMap[mk].total   += e.amount;
      monthMap[mk].entries += 1;

      if (mk === thisMonK) { thisMonTotal += e.amount; thisMonEntries += 1; }
      if (mk === lastMonK) { lastMonTotal += e.amount; lastMonEntries += 1; }
      if (d.toDateString() === todayStr) todayTotal += e.amount;
      if (e.amount > allTimeMax) { allTimeMax = e.amount; allTimeMaxDate = e.date; }
      streakMap[d.toDateString()] = true;
    });

    // Streak: count consecutive days ending today
    let checkDate = new Date();
    while (streakMap[checkDate.toDateString()]) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    // Projection
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dayOfMonth  = now.getDate();
    const daysLeft    = daysInMonth - dayOfMonth;
    const dailyAvg    = thisMonEntries > 0 ? thisMonTotal / dayOfMonth : 0;
    const projectedEOM = thisMonTotal + dailyAvg * daysLeft;
    const proj3M      = totalSaved + dailyAvg * 90;
    const proj6M      = totalSaved + dailyAvg * 180;
    const projYear    = totalSaved + dailyAvg * 365;

    // Months array (last 6, oldest first)
    const sortedMonths = Object.entries(monthMap)
      .sort(([, a], [, b]) => a.date - b.date)
      .slice(-6);

    return {
      todayTotal, thisMonTotal, lastMonTotal,
      thisMonEntries, lastMonEntries,
      streak, allTimeMax, allTimeMaxDate,
      dailyAvg, projectedEOM, proj3M, proj6M, projYear,
      daysLeft, dayOfMonth, daysInMonth,
      sortedMonths, thisMonK, lastMonK,
    };
  }, [history, totalSaved]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleLongPress = (entry) => {
    setSelectedEntry(entry);
    setOptionsVisible(true);
  };

  const handleDelete = async () => {
  Alert.alert('Delete Savings', `Remove ${fmt(selectedEntry.amount)}? This amount will be added back to your wallet.`, [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Delete', style: 'destructive',
      onPress: async () => {
        try {
          const raw  = await AsyncStorage.getItem('savingsWallet');
          const data = JSON.parse(raw);
          const entries = data.entries.filter(e => e.id !== selectedEntry.id);
          
          // Update savings wallet
          await AsyncStorage.setItem('savingsWallet', JSON.stringify({
            total: entries.reduce((s, e) => s + e.amount, 0),
            entries,
          }));
          
          // Add the deleted amount back to wallet balance
          const savedWallet = await AsyncStorage.getItem('walletBalance');
          const currentWallet = savedWallet !== null ? safeFloat(savedWallet) : 0;
          const newWalletBalance = currentWallet + selectedEntry.amount;
          await AsyncStorage.setItem('walletBalance', newWalletBalance.toString());
          
          setOptionsVisible(false);
          await loadSavings();
          Alert.alert('Success', `₹${selectedEntry.amount.toFixed(2)} added back to wallet.`);
        } catch (err) { 
          Alert.alert('Error', 'Failed to delete.'); 
        }
      },
    },
  ]);
};
  const openEdit = () => {
    setEditedNote(selectedEntry.note || '');
    setEditedAmount(selectedEntry.amount.toString());
    setOptionsVisible(false);
    setIsEditing(true);
  };

  const handleUpdate = async () => {
    const amt = safeFloat(editedAmount);
    if (amt <= 0) { Alert.alert('Invalid Amount'); return; }
    try {
      const raw  = await AsyncStorage.getItem('savingsWallet');
      const data = JSON.parse(raw);
      const idx  = data.entries.findIndex(e => e.id === selectedEntry.id);
      if (idx !== -1) {
        data.entries[idx] = { ...data.entries[idx], amount: amt, note: editedNote.trim() || data.entries[idx].note, updatedAt: new Date().toISOString() };
        data.total = data.entries.reduce((s, e) => s + e.amount, 0);
        await AsyncStorage.setItem('savingsWallet', JSON.stringify(data));
        setIsEditing(false);
        await loadSavings();
      }
    } catch (err) { Alert.alert('Error', 'Failed to update.'); }
  };

  // ── Tabs ─────────────────────────────────────────────────────────────────────
  const TABS = [
    { id: 'overview', label: 'Overview', icon: 'grid-outline' },
    { id: 'monthly',  label: 'Monthly',  icon: 'calendar-outline' },
    { id: 'history',  label: 'History',  icon: 'time-outline' },
  ];

  const recentHistory = useMemo(() => [...history].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)), [history]);

  return (
    <View style={S.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={S.scroll}>

        {/* ── Header ──────────────────────────────────────────────── */}
        <View style={S.header}>
          <View>
            <Text style={S.headerTitle}>Savings</Text>
            <Text style={S.headerSub}>Your financial future</Text>
          </View>
          <View style={S.headerBadge}>
            <Ionicons name="leaf-outline" size={16} color={COLORS.mint} />
          </View>
        </View>

        {/* ── Hero Banner ──────────────────────────────────────────── */}
        <LinearGradient
          colors={[COLORS.violet + '25', COLORS.violet + '06']}
          style={S.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={S.heroGlow} />
          <Text style={S.heroLabel}>TOTAL SAVED</Text>
          <Text style={S.heroAmount}>{fmt(totalSaved)}</Text>
          <View style={S.heroPills}>
            <View style={S.heroPill}>
              <Ionicons name="flame-outline" size={11} color={COLORS.amber} />
              <Text style={[S.heroPillText, { color: COLORS.amber }]}>{stats.streak}d streak</Text>
            </View>
            <View style={[S.heroPill, { borderColor: COLORS.mint + '40', backgroundColor: COLORS.mintDim }]}>
              <Ionicons name="trending-up" size={11} color={COLORS.mint} />
              <Text style={[S.heroPillText, { color: COLORS.mint }]}>
                {totalSaved > 0 ? 'Growing' : 'Start saving'}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── Quick Stats Strip ────────────────────────────────────── */}
        <View style={S.strip}>
          {[
            { label: 'Today',      value: fmtCompact(stats.todayTotal),   color: COLORS.violet },
            { label: 'This Month', value: fmtCompact(stats.thisMonTotal), color: COLORS.mint },
            { label: 'Last Month', value: fmtCompact(stats.lastMonTotal), color: COLORS.amber },
            { label: 'Daily Avg',  value: fmtCompact(stats.dailyAvg),     color: COLORS.sky },
          ].map(({ label, value, color }) => (
            <View key={label} style={S.stripItem}>
              <Text style={[S.stripValue, { color }]}>{value}</Text>
              <Text style={S.stripLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* ── Tab Bar ─────────────────────────────────────────────── */}
        <View style={S.tabBar}>
          {TABS.map(t => (
            <TouchableOpacity
              key={t.id}
              style={[S.tab, activeTab === t.id && S.tabActive]}
              onPress={() => setActiveTab(t.id)}
              activeOpacity={0.7}
            >
              <Ionicons name={t.icon} size={13} color={activeTab === t.id ? COLORS.violet : COLORS.textMuted} />
              <Text style={[S.tabText, activeTab === t.id && S.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ══════════════════════════════════════════════════════════ */}
        {/*  TAB: OVERVIEW                                            */}
        {/* ══════════════════════════════════════════════════════════ */}
        {activeTab === 'overview' && (
          <View style={S.tabContent}>

            {/* Savings Goal Block */}
            <View style={S.card}>
              <SectionHeader title="This Month" />
              <InfoRow label="Saved so far"        value={fmt(stats.thisMonTotal)}  valueColor={COLORS.violet} />
              <InfoRow label="Entries"              value={`${stats.thisMonEntries}`} />
              <InfoRow label="Avg per entry"        value={fmt(stats.thisMonEntries > 0 ? stats.thisMonTotal / stats.thisMonEntries : 0)} />
              <Divider />
              <InfoRow label="Days completed"       value={`${stats.dayOfMonth} / ${stats.daysInMonth}`} dimLabel />
              <InfoRow label="Days remaining"       value={`${stats.daysLeft}`} dimLabel />

              {/* Month progress bar */}
              <View style={S.progressWrap}>
                <View style={S.progressBg}>
                  <View style={[S.progressFill, { width: `${Math.min(100, (stats.dayOfMonth / stats.daysInMonth) * 100)}%`, backgroundColor: COLORS.violet }]} />
                </View>
                <Text style={[S.progressPct, { color: COLORS.violet }]}>
                  {Math.round((stats.dayOfMonth / stats.daysInMonth) * 100)}%
                </Text>
              </View>
            </View>

            {/* Projection Card */}
            <View style={S.card}>
              <SectionHeader title="Projections" />
              <Text style={S.projNote}>Based on your daily avg of {fmt(stats.dailyAvg)}</Text>

              <ProjectionRow
                icon="today-outline"
                iconColor={COLORS.mint}
                label="End of this month"
                sub={`${stats.daysLeft} days left`}
                value={fmt(stats.projectedEOM)}
              />
              <ProjectionRow
                icon="calendar-outline"
                iconColor={COLORS.amber}
                label="In 3 months"
                sub="from total saved"
                value={fmt(stats.proj3M)}
              />
              <ProjectionRow
                icon="bar-chart-outline"
                iconColor={COLORS.sky}
                label="In 6 months"
                sub="from total saved"
                value={fmt(stats.proj6M)}
              />
              <ProjectionRow
                icon="trophy-outline"
                iconColor={COLORS.violet}
                label="In 1 year"
                sub="from total saved"
                value={fmt(stats.projYear)}
                highlight
              />

              {stats.dailyAvg === 0 && (
                <View style={S.noProjNote}>
                  <Ionicons name="information-circle-outline" size={14} color={COLORS.textDim} />
                  <Text style={S.noProjText}>Save at least once this month to see projections</Text>
                </View>
              )}
            </View>

            {/* Last Month vs This Month Comparison */}
            {stats.lastMonTotal > 0 || stats.thisMonTotal > 0 ? (
              <View style={S.card}>
                <SectionHeader title="Month Comparison" />

                <View style={S.compareRow}>
                  <View style={S.compareItem}>
                    <Text style={S.compareMonthLabel}>Last Month</Text>
                    <Text style={[S.compareAmount, { color: COLORS.amber }]}>{fmt(stats.lastMonTotal)}</Text>
                    <Text style={S.compareEntries}>{stats.lastMonEntries} entries</Text>
                  </View>

                  {/* Arrow */}
                  <View style={S.compareArrow}>
                    {stats.thisMonTotal >= stats.lastMonTotal
                      ? <Ionicons name="arrow-forward" size={16} color={COLORS.mint} />
                      : <Ionicons name="arrow-forward" size={16} color={COLORS.crimson} />
                    }
                    {stats.lastMonTotal > 0 && (
                      <Text style={[S.compareDelta, {
                        color: stats.thisMonTotal >= stats.lastMonTotal ? COLORS.mint : COLORS.crimson
                      }]}>
                        {stats.thisMonTotal >= stats.lastMonTotal ? '+' : ''}
                        {(((stats.thisMonTotal - stats.lastMonTotal) / stats.lastMonTotal) * 100).toFixed(0)}%
                      </Text>
                    )}
                  </View>

                  <View style={S.compareItem}>
                    <Text style={S.compareMonthLabel}>This Month</Text>
                    <Text style={[S.compareAmount, { color: COLORS.violet }]}>{fmt(stats.thisMonTotal)}</Text>
                    <Text style={S.compareEntries}>{stats.thisMonEntries} entries</Text>
                  </View>
                </View>

                {stats.allTimeMax > 0 && (
                  <>
                    <Divider />
                    <InfoRow label="🏆 Best single save"  value={fmt(stats.allTimeMax)}  valueColor={COLORS.amber} />
                    <InfoRow label="On"                   value={stats.allTimeMaxDate}   dimLabel />
                  </>
                )}
              </View>
            ) : null}

          </View>
        )}

        {/* ══════════════════════════════════════════════════════════ */}
        {/*  TAB: MONTHLY ANALYTICS                                   */}
        {/* ══════════════════════════════════════════════════════════ */}
        {activeTab === 'monthly' && (
          <View style={S.tabContent}>
            {stats.sortedMonths.length === 0 ? (
              <View style={S.emptyState}>
                <Ionicons name="calendar-outline" size={32} color={COLORS.textDim} />
                <Text style={S.emptyTitle}>No monthly data yet</Text>
                <Text style={S.emptyText}>Start saving to see analytics</Text>
              </View>
            ) : (
              [...stats.sortedMonths].reverse().map(([mk, data], idx) => {
                const prevIdx   = stats.sortedMonths.length - 1 - idx - 1;
                const prevTotal = prevIdx >= 0 ? stats.sortedMonths[prevIdx][1].total : null;
                const isCurrent = mk === stats.thisMonK;
                return (
                  <MonthBlock
                    key={mk}
                    label={data.label}
                    total={data.total}
                    entries={data.entries}
                    prevTotal={prevTotal}
                    isCurrent={isCurrent}
                  />
                );
              })
            )}

            {/* Lifetime summary */}
            {history.length > 0 && (
              <View style={[S.card, { marginTop: 4 }]}>
                <SectionHeader title="Lifetime Summary" />
                <InfoRow label="Total entries"  value={`${history.length}`} />
                <InfoRow label="Total saved"    value={fmt(totalSaved)}    valueColor={COLORS.violet} />
                <InfoRow label="Months tracked" value={`${stats.sortedMonths.length}`} />
                <InfoRow label="Monthly avg"    value={fmt(stats.sortedMonths.length > 0 ? totalSaved / stats.sortedMonths.length : 0)} valueColor={COLORS.mint} />
              </View>
            )}
          </View>
        )}

        {/* ══════════════════════════════════════════════════════════ */}
        {/*  TAB: HISTORY                                             */}
        {/* ══════════════════════════════════════════════════════════ */}
        {activeTab === 'history' && (
          <View style={S.tabContent}>
            <SectionHeader title="All Entries" count={history.length} />
            {recentHistory.length === 0 ? (
              <View style={S.emptyState}>
                <Ionicons name="leaf-outline" size={32} color={COLORS.textDim} />
                <Text style={S.emptyTitle}>No savings yet</Text>
                <Text style={S.emptyText}>Go to Today tab and start saving</Text>
              </View>
            ) : (
              recentHistory.map((entry) => (
                <SavingsEntry key={entry.id} entry={entry} onLongPress={handleLongPress} />
              ))
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Options Modal ─────────────────────────────────────────── */}
      <Modal visible={optionsVisible} transparent animationType="fade" onRequestClose={() => setOptionsVisible(false)}>
        <TouchableOpacity style={S.overlay} activeOpacity={1} onPress={() => setOptionsVisible(false)}>
          <View style={S.optionsMenu}>
            <View style={S.previewChip}>
              <View style={[S.previewIcon, { backgroundColor: COLORS.violetDim }]}>
                <Ionicons name="leaf-outline" size={14} color={COLORS.violet} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={S.previewName} numberOfLines={1}>{selectedEntry?.note || 'Daily saving'}</Text>
                <Text style={S.previewAmt}>{fmt(selectedEntry?.amount || 0)}</Text>
              </View>
            </View>
            <Divider />
            <TouchableOpacity style={S.menuItem} onPress={openEdit}>
              <View style={[S.menuIcon, { backgroundColor: COLORS.mintDim }]}>
                <Ionicons name="create-outline" size={14} color={COLORS.mint} />
              </View>
              <Text style={[S.menuLabel, { color: COLORS.mint }]}>Edit</Text>
              <Ionicons name="chevron-forward" size={12} color={COLORS.textDim} />
            </TouchableOpacity>
            <TouchableOpacity style={S.menuItem} onPress={handleDelete}>
              <View style={[S.menuIcon, { backgroundColor: COLORS.crimsonDim }]}>
                <Ionicons name="trash-outline" size={14} color={COLORS.crimson} />
              </View>
              <Text style={[S.menuLabel, { color: COLORS.crimson }]}>Delete</Text>
              <Ionicons name="chevron-forward" size={12} color={COLORS.textDim} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Edit Modal ────────────────────────────────────────────── */}
      <Modal visible={isEditing} transparent animationType="slide" onRequestClose={() => setIsEditing(false)}>
        <View style={S.overlay}>
          <View style={S.editSheet}>
            <View style={S.handle} />
            <View style={S.editHeader}>
              <View>
                <Text style={S.editTitle}>Edit Savings</Text>
                <Text style={S.editSub}>Update the details</Text>
              </View>
              <TouchableOpacity onPress={() => setIsEditing(false)} style={S.closeBtn}>
                <Ionicons name="close" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={S.formSection}>
              <Text style={S.formLabel}>AMOUNT</Text>
              <View style={S.amountRow}>
                <Text style={S.rupee}>₹</Text>
                <TextInput
                  style={S.amountInput}
                  placeholder="0.00"
                  placeholderTextColor={COLORS.textDim}
                  keyboardType="numeric"
                  value={editedAmount}
                  onChangeText={setEditedAmount}
                />
              </View>
            </View>

            <View style={S.formSection}>
              <Text style={S.formLabel}>NOTE <Text style={{ color: COLORS.textDim }}>(OPTIONAL)</Text></Text>
              <TextInput
                style={[S.textInput, { minHeight: 60 }]}
                placeholder="Add a note..."
                placeholderTextColor={COLORS.textDim}
                value={editedNote}
                onChangeText={setEditedNote}
                multiline
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              style={[S.updateBtn, (!editedAmount || safeFloat(editedAmount) <= 0) && { opacity: 0.4 }]}
              onPress={handleUpdate}
              activeOpacity={0.8}
            >
              <LinearGradient colors={['#818CF8', '#6366F1']} style={S.updateGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <Ionicons name="checkmark" size={18} color="#fff" />
                <Text style={S.updateBtnText}>Update</Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={{ height: 30 }} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  root:   { flex: 1, backgroundColor: COLORS.bg },
  scroll: { paddingBottom: 20 },

  // Header
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 60, paddingHorizontal: 16, paddingBottom: 16 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: COLORS.text, letterSpacing: -0.3 },
  headerSub:   { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  headerBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.mintDim, borderWidth: 1, borderColor: COLORS.mint + '50', alignItems: 'center', justifyContent: 'center' },

  // Hero
  hero:       { marginHorizontal: 16, marginBottom: 14, borderRadius: 20, borderWidth: 1, borderColor: COLORS.violet + '35', overflow: 'hidden', padding: 20, alignItems: 'center', position: 'relative' },
  heroGlow:   { position: 'absolute', top: -30, right: -30, width: 90, height: 90, borderRadius: 45, backgroundColor: COLORS.violetGlow },
  heroLabel:  { fontSize: 9, letterSpacing: 1.8, color: COLORS.textMuted, marginBottom: 5 },
  heroAmount: { fontSize: 38, fontWeight: '800', color: COLORS.violet, letterSpacing: -1, marginBottom: 12 },
  heroPills:  { flexDirection: 'row', gap: 8 },
  heroPill:   { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16, backgroundColor: COLORS.amberDim, borderWidth: 1, borderColor: COLORS.amber + '40' },
  heroPillText: { fontSize: 10, fontWeight: '700' },

  // Strip
  strip:      { flexDirection: 'row', marginHorizontal: 16, marginBottom: 14, backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.cardBorder, paddingVertical: 12 },
  stripItem:  { flex: 1, alignItems: 'center' },
  stripValue: { fontSize: 14, fontWeight: '800', letterSpacing: -0.3, marginBottom: 3 },
  stripLabel: { fontSize: 9, color: COLORS.textDim, letterSpacing: 0.4 },

  // Tab Bar
  tabBar:       { flexDirection: 'row', marginHorizontal: 16, marginBottom: 16, backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.cardBorder, padding: 3, gap: 2 },
  tab:          { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 8, borderRadius: 10 },
  tabActive:    { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.violet + '40' },
  tabText:      { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  tabTextActive: { color: COLORS.violet },

  // Content
  tabContent: { paddingHorizontal: 16 },
  card:       { backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.cardBorder, padding: 14, marginBottom: 12 },

  // Progress
  progressWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  progressBg:   { flex: 1, height: 4, backgroundColor: COLORS.surface, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  progressPct:  { fontSize: 10, fontWeight: '700', width: 32, textAlign: 'right' },

  // Projection
  projNote: { fontSize: 11, color: COLORS.textDim, marginBottom: 8 },
  noProjNote: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, padding: 10, backgroundColor: COLORS.surface, borderRadius: 10 },
  noProjText: { fontSize: 11, color: COLORS.textDim, flex: 1 },

  // Compare
  compareRow:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  compareItem:       { flex: 1, alignItems: 'center' },
  compareMonthLabel: { fontSize: 10, color: COLORS.textMuted, marginBottom: 4 },
  compareAmount:     { fontSize: 16, fontWeight: '800', letterSpacing: -0.3, marginBottom: 3 },
  compareEntries:    { fontSize: 10, color: COLORS.textDim },
  compareArrow:      { alignItems: 'center', gap: 4, paddingHorizontal: 8 },
  compareDelta:      { fontSize: 10, fontWeight: '700' },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyTitle: { fontSize: 14, fontWeight: '600', color: COLORS.textMuted },
  emptyText:  { fontSize: 11, color: COLORS.textDim, textAlign: 'center' },

  // Modal / Overlay
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center' },
  optionsMenu: { backgroundColor: COLORS.card, borderRadius: 16, padding: 12, width: 220, borderWidth: 1, borderColor: COLORS.cardBorder, gap: 2 },
  previewChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 10 },
  previewIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  previewName: { fontSize: 12, fontWeight: '600', color: COLORS.text },
  previewAmt:  { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  menuItem:    { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 2, borderRadius: 10 },
  menuIcon:    { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  menuLabel:   { flex: 1, fontSize: 13, fontWeight: '600' },

  // Edit Sheet
  editSheet:   { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 10, maxHeight: '70%', borderTopWidth: 1, borderColor: COLORS.cardBorder },
  handle:      { width: 36, height: 4, backgroundColor: COLORS.cardBorder, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  editHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  editTitle:   { fontSize: 18, fontWeight: '700', color: COLORS.text },
  editSub:     { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  closeBtn:    { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder, alignItems: 'center', justifyContent: 'center' },
  formSection: { marginBottom: 18 },
  formLabel:   { fontSize: 9, letterSpacing: 1.5, color: COLORS.textMuted, marginBottom: 8 },
  amountRow:   { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.cardBorder, paddingHorizontal: 12 },
  rupee:       { fontSize: 22, fontWeight: '700', color: COLORS.violet, marginRight: 4 },
  amountInput: { flex: 1, fontSize: 26, fontWeight: '700', color: COLORS.text, paddingVertical: 10 },
  textInput:   { backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.cardBorder, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: COLORS.text },
  updateBtn:   { borderRadius: 12, overflow: 'hidden', marginTop: 6, marginBottom: 10 },
  updateGrad:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  updateBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});