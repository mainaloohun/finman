Here's a comprehensive README file for your FinMan app:

```markdown
# 💰 FinMan - Personal Finance Manager

[![Expo](https://img.shields.io/badge/Expo-51.0.0-blue.svg)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React%20Native-0.74.0-green.svg)](https://reactnative.dev)
[![Platform](https://img.shields.io/badge/platform-Android-brightgreen.svg)](https://developer.android.com)

> **FinMan** is a powerful yet simple personal finance management app designed for students, freelancers, and professionals to track expenses, manage budgets, and build savings effortlessly.

---

## 📱 Screenshots

| Today Screen | History Screen | Savings Screen |
|-------------|----------------|----------------|
| Wallet balance & daily quota | Expense history with filters | Savings tracking & goals |
| Quick expense entry | Category breakdown | Savings projections |
| Budget progress | Monthly analytics | Savings streak |

---

## ✨ Features

### 🏠 Today Screen
- **Wallet Balance** - View your current available balance
- **Daily Budget Quota** - Smart daily spending limit based on remaining days
- **Quick Expense Entry** - Add expenses with category, amount, and notes
- **Visual Progress Bar** - See your daily spending at a glance
- **Budget Rollover** - Unused budget carries over to next day
- **Floating Action Button** - Quick access to add expenses

### 📊 History Screen
- **Transaction History** - View all past expenses with timestamps
- **Category Breakdown** - Visual spending distribution by category
- **Monthly Budget Tracking** - Set and track budgets per category
- **Budget Progress Cards** - See how much you've spent vs budget
- **Filter by Category** - Focus on specific spending types
- **Date Grouping** - Expenses organized by date (Today, Yesterday, etc.)

### 💎 Savings Screen
- **Total Saved Tracker** - See your cumulative savings
- **Monthly/Weekly/Today Statistics** - Track saving patterns
- **Savings Projections** - See future growth based on current habits
- **Saving Streak** - Maintain daily saving momentum
- **Best Saving Day** - Celebrate your most productive days
- **Month Comparison** - Compare month-over-month performance
- **Savings History** - View and manage all saving entries

### ⚙️ Smart Features
- **Budget Alerts** - Get warnings when approaching or exceeding budgets
- **Category Limits** - Set custom monthly budgets for each category
- **Quick Top-up** - Add money to wallet with preset amounts
- **Save from Quota** - Move unused daily budget to savings
- **Collapsible UI** - Clean, space-efficient design
- **Dark Theme** - Easy on the eyes, battery efficient

---

## 🏗️ Technical Architecture

### Tech Stack
- **Framework**: React Native (Expo)
- **Navigation**: Expo Router (File-based routing)
- **Storage**: AsyncStorage (Local persistent storage)
- **UI Components**: Custom components with LinearGradient
- **Icons**: Expo Vector Icons (Ionicons)

### Project Structure
```
finman/
├── app/
│   ├── (tabs)/
│   │   ├── _layout.js          # Tab navigation configuration
│   │   ├── index.js            # Today Screen
│   │   ├── history.js          # History Screen
│   │   └── savings.js          # Savings Screen
│   └── _layout.js              # Root layout
├── components/
│   ├── AddExpenseModal.js      # Expense entry modal
│   ├── AddBalanceModal.js      # Wallet top-up modal
│   ├── BudgetManager.js        # Budget settings modal
│   ├── BudgetProgressCard.js   # Budget progress display
│   ├── ExpenseCard.js          # Expense item component
│   ├── SavingsModal.js         # Savings transfer modal
│   ├── WalletTopUpModal.js     # Add money modal
│   └── RolloverSettingsModal.js # Budget rollover settings
├── utils/
│   ├── rolloverManager.js      # Budget rollover logic
│   └── dayReset.js             # Daily budget reset
├── assets/
│   └── images/                 # App icons and splash screen
└── eas.json                   # EAS Build configuration
```

---

## 📦 Installation

### Prerequisites
- Node.js (v18 or later)
- npm or yarn
- Expo CLI
- Android Studio (for local builds)

### Steps

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/finman.git
cd finman
```

2. **Install dependencies**
```bash
npm install
```

3. **Start the development server**
```bash
npx expo start
```

4. **Run on Android**
- Press `a` to open on Android emulator
- Or scan QR code with Expo Go app on your phone

---

## 🚀 Building APK

### Development Build
```bash
# Local debug APK
npx expo prebuild --clean
cd android && ./gradlew assembleDebug

# EAS development build
eas build --platform android --profile development
```

### Production Release
```bash
# EAS production build (recommended)
eas build --platform android --profile production

# Local release build (requires keystore)
cd android && ./gradlew assembleRelease
```

### APK Locations
- Debug: `android/app/build/outputs/apk/debug/app-debug.apk`
- Release: `android/app/build/outputs/apk/release/app-release.apk`

---

## 🎮 Usage Guide

### Adding Your First Expense
1. Tap the **+** button on Today screen
2. Enter the **amount**
3. Select a **category** (Food, Transport, etc.)
4. Add optional **name** and **note**
5. Tap **Add Expense**

### Setting Monthly Budgets
1. Go to **History** tab
2. Tap **Set Budgets** button
3. Enter budget amounts for each category
4. Save your preferences

### Saving Money
1. On Today screen, tap **Save from today's quota**
2. Enter amount to save
3. Add optional note
4. Money moves from wallet to savings

### Adding Money to Wallet
1. Tap the **+** icon on the wallet card
2. Select preset amount or enter custom
3. Tap **Add to Wallet**

---

## 📊 Data Management

### Storage Keys
```javascript
'walletBalance'        // Current wallet balance
'expenses'             // All expense transactions
'savingsWallet'        // Savings data (total + entries)
'categoryBudgets'      // Monthly budget per category
'rollover_data'        // Budget rollover information
```

### Data Persistence
All data is stored locally using AsyncStorage. No cloud servers or external databases are used. Your financial data stays on your device only.

---

## 🎨 Design System

### Color Palette
| Color | Hex | Usage |
|-------|-----|-------|
| Background | `#0D0F14` | Main background |
| Surface | `#141720` | Cards, modals |
| Primary Mint | `#00E5A0` | Success, positive actions |
| Amber | `#F59E0B` | Warnings, near limits |
| Crimson | `#EF4444` | Over budget, errors |
| Violet | `#818CF8` | Savings, highlights |
| Text | `#F0F4FF` | Primary text |
| Text Muted | `#6B7A99` | Secondary text |

### Typography
- **Headings**: 20-28px, Bold
- **Body**: 12-16px, Regular/Semi-bold
- **Labels**: 8-11px, Uppercase
- **Values**: 28-48px, Bold

---

## 🔧 Troubleshooting

### Common Issues

**1. App won't build**
```bash
# Clear all caches
npx expo start -c
rm -rf node_modules
npm install
```

**2. CMake errors on Windows**
- Disable new architecture in `app.json`
```json
"newArchEnabled": false
```

**3. Emulator not starting**
- Enable virtualization in BIOS
- Install Intel HAXM or Windows Hypervisor Platform

**4. Keyboard hides input**
- Already fixed with KeyboardAvoidingView
- Modal includes auto-scroll to input

---

## 📱 Requirements

### Minimum Requirements
- **Android**: 6.0 (API 23) or higher
- **RAM**: 2GB minimum
- **Storage**: 100MB free space

### Recommended
- **Android**: 10 (API 29) or higher
- **RAM**: 4GB+
- **Storage**: 200MB+ for optimal performance

---

## 🛡️ Privacy & Security

- **No internet required** - All data stored locally
- **No data collection** - No analytics or tracking
- **No permissions needed** - Minimal permissions requested
- **Your data stays yours** - No cloud sync, no external servers

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

MIT License - Free for personal and commercial use

---

## 👨‍💻 Author

**Asad Khan**
- Student & Part-time Teacher
- B.Tech in Computer Science

*Built with 💚 to help people take control of their finances*

---

## 🙏 Acknowledgments

- Expo team for the amazing framework
- React Native community for continuous support
- All beta testers who provided valuable feedback

---

## 📞 Support

For issues, feature requests, or questions:
- Open an issue on GitHub
- Contact: [your-email@example.com]

---

## 🎯 Future Roadmap

- [ ] iOS support
- [ ] Cloud backup option
- [ ] Export to CSV/PDF
- [ ] Recurring expenses
- [ ] Financial goals
- [ ] Spending insights & analytics
- [ ] Multi-currency support
- [ ] Fingerprint/Biometric lock
- [ ] Widget support
- [ ] Voice input for expenses

---

**⭐ Star this repo if you find it useful!**
