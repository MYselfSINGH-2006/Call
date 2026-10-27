# PureSuite Phone & Contacts (Honor MagicOS Edition)

A high-fidelity, native Android dialer and contacts suite modelled faithfully after Honor MagicOS / EMUI with integrated silent security protection, comprehensive offline persistence, and seamless Android APK export readiness.

---

## 🌟 Key Features & Architecture

### 1. Silent Anti-Bomber Shield (Zero Popup, Zero Notification)
- **100% Silent Operation**: Operates strictly in the background without any banners, toasts, popups, or notification sounds.
- **Unknown Caller Drop**: Automatically drops calls from unknown numbers, robocall gateways (140/160 series, shortcodes), and high-frequency rate-limited flooders.
- **OTP SMS Bombing Quarantine**: Quarantines OTP verification codes and spam SMS silently into an isolated log (`blockedOtps`), preventing inbox clutter and SMS harassment.
- **Instant Quick-Toggle**: 1-tap toggle pill (`Anti-Bomber ON / OFF`) accessible right in the top header bar and options menu across Phone, Contacts, and Favourites.
- **Offline Persistence**: Retains active security state and blocked counters in device storage across reboots.

### 2. Wallpapers & 12+ Honor Themes
- **Dynamic Theme Engine**: 1-tap palette selector button in every top bar (`palette` icon) and 4-dot menu.
- **12 Curated Themes**:
  1. Honor Magic Default (Clean Frost White & Emerald/Blue)
  2. Emerald Obsidian (Deep MagicOS Emerald & Dark Glass)
  3. Midnight Titanium (Sleek Dark OLED & Cyan Accent)
  4. Royal Amber (Warm Amber Gold & Slate)
  5. Cyber Violet (Neon Purple & Deep Navy)
  6. Sakura Blossom (Soft Rose & Coral)
  7. Nordic Forest (Deep Alpine Green & Mint)
  8. Arctic Glacier (Cool Ice Blue & Frost)
  9. Sunset Mirage (Warm Orange Gradient)
  10. Minimalist Monochrome (High-Contrast Clean Grey)
  11. Deep Space OLED (Pure Black #000000 for AMOLED battery savings)
  12. Desert Sand (Warm Terracotta & Parchment)
- **Unified Consistency**: Selected theme instantly updates the Keypad, Recent Call Log, Contacts directory, In-Call screens, and Modals.

### 3. Keypad & Dialing Engine
- **Honor Fluid T9 Dialing**: Instant search matching names and phone numbers as digits are typed.
- **Interactive Cursor & Teardrop Handle**: Draggable cursor positioning and tap-to-insert anywhere within dialed numbers.
- **Direct Carrier SIM & WebRTC Calling**: Native carrier dialer launch via `tel:` intent and WebRTC peer-to-peer real-time audio.
- **Audio DTMF Tone Generator**: Authentic dual-tone multi-frequency synthesizer for numeric keypad feedback.
- **Audio Call Recorder**: Real live microphone PCM capture with WAV encoding and local playback player with waveform scrubber.

### 4. Contacts & Address Book
- **Multi-Storage Routing**: Save to Mobile (Phone Memory), SIM Card, or Google Account (Gmail).
- **Zero-Login Google Contacts Sync**: Integrates with Android `AccountManager` and Gmail CSV format without requiring web OAuth login flows.
- **vCard (.vcf) Export/Import**: Universal 1-tap backup and restore of address book.
- **QR Code Contact Sharing**: Generates high-resolution QR codes to instantly share contact cards with any smartphone camera.
- **WhatsApp Direct Access**: Dedicated WhatsApp chat & call launcher with automatic country code normalization (+91 / E.164).

### 5. In-Call Controls & Multi-Party Calling
- **Complete Control Matrix**: Mute microphone, Speakerphone toggle, DTMF keypad drawer, live Audio Recording, Call Hold.
- **2nd Call & Merge**: Place active call on hold, initiate second line, swap between active/held callers, or merge into multi-party conference.
- **Honor Dual View**: Fluid switching between floating Top-Notch Banner mode and Full-Screen in-call interface.

### 6. Android Default Role & 3-App Split
- **Default Dialer Handler**: Compliant with Android TelecomManager `TelecomManager.ACTION_CHANGE_DEFAULT_DIALER`.
- **Default SMS App**: Role compliance for `RoleManager.ROLE_SMS`.
- **Split App Architecture**: Can be bundled as 3 distinct home screen shortcuts: Pure Phone, Pure Contacts, and Pure Messages.

---

## 📱 Building into Android APK

### Step 1: Build the Web App
```bash
npm run build
```

### Step 2: Initialize & Sync Capacitor Android
```bash
# Install Capacitor CLI & Core if building for the first time
npx cap init "PureSuite Phone" "com.puresuite.phone" --web-dir dist

# Add and sync the Android native platform
npx cap add android
npx cap sync android
```

### Step 3: Android Permissions Setup
Ensure `android/app/src/main/AndroidManifest.xml` includes the necessary telephony and audio permissions:
```xml
<uses-permission android:name="android.permission.CALL_PHONE" />
<uses-permission android:name="android.permission.READ_PHONE_STATE" />
<uses-permission android:name="android.permission.READ_CALL_LOG" />
<uses-permission android:name="android.permission.WRITE_CALL_LOG" />
<uses-permission android:name="android.permission.READ_CONTACTS" />
<uses-permission android:name="android.permission.WRITE_CONTACTS" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.RECEIVE_SMS" />
<uses-permission android:name="android.permission.READ_SMS" />
<uses-permission android:name="android.permission.SEND_SMS" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
<uses-permission android:name="android.permission.VIBRATE" />
```

### Step 4: Open in Android Studio & Generate APK
```bash
npx cap open android
```
In Android Studio:
1. Select **Build > Generate Signed Bundle / APK...**
2. Choose **APK**
3. Create or select your keystore, then select **release** or **debug** build variant.
4. Click **Create** to output the `.apk` file for installation on any Android phone.
