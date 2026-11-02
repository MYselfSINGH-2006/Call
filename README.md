# PureSuite Phone & Contacts (Honor MagicOS Edition)

A high-fidelity, native Android dialler and contacts suite modeled after Honor MagicOS / EMUI with integrated silent security protection, dual-party call recording, genuine network call rejection, and comprehensive offline persistence.

---

## 📋 Comprehensive Feature & Settings Reference

### 1. Outgoing Call Cadence & Accurate Call Timing (No Fake Auto-Answer)
- **Real Call State Transitions**: When dialing an outgoing number, the call starts in `Calling...` and smoothly transitions to `Ringing...` with an authentic ringback cadence.
- **Strict Countdown Timing**: The call duration countdown timer (`00:00`, `00:01`, `00:02`...) **ONLY** starts when the other person actually picks up the phone (`Connected`).
- **No Automatic Timer**: Outgoing calls remain in `Ringing...` until the remote party answers via WebRTC signaling, native Android Telecom bridge `state === 4` (`Call.STATE_ACTIVE` / `EXTRA_STATE_OFFHOOK`), or manual pickup.
- **Simulator Pickup Trigger**: During testing in the web preview, a "Recipient answers" button is provided while ringing to easily test the connected state on demand.

### 2. Dual-Party Clear Silent Call Recording (Zero Empty Audio)
- **Master Audio Mixer**: Combines both audio channels—the user's hardware microphone and the remote caller's audio stream—into a unified Web Audio graph (`pcmMixerGain`).
- **100% Silent Background Recording**: Operates silently when auto-record is enabled (`autoRecordEnabled`), with zero audible announcements or warning beeps to either party.
- **No Blank/Silent MP3/WAV**: Ensures `AudioContext.resume()` is properly invoked and sample buffers are populated with non-zero audio energy.
- **Native 16-Bit PCM WAV Storage**: Captures clean 16-bit PCM WAV audio with valid RIFF headers and saves recordings locally as Base64 data URLs in offline storage.
- **In-App Call Recordings Player**: Includes an integrated player with play/pause, duration seeking, scrub bar, and recording deletion.

### 3. Silent Anti-Bomber Shield (Zero Popup, Zero Notification)
- **100% Silent Operation**: Operates strictly in the background with **zero popups, zero notification banners, zero ringtones, and zero vibration**.
- **Unknown Caller Drop**: Automatically blocks incoming calls from unknown non-contacts, robocall gateways (e.g., 140/160 series, shortcodes), and high-frequency rate-limited flooders.
- **OTP SMS Bombing Quarantine**: Quarantines OTP verification codes and automated SMS bombing bursts silently into an isolated log (`blockedOtps`), preventing inbox clutter and notification spam.
- **Quick-Toggle**: Accessible via the top header bar and options menu across Phone, Contacts, and Favourites.

### 4. Custom Network Call Rejection (Silent Block)
- **Preselected Network Causes**: Configure a specific cellular network rejection reason for individual phone numbers *before* they call:
  - **Line busy**: Q.850 Cause 17 / SIP 486 (Native Android Telephony `CallScreeningService` rejection).
  - **Number unreachable**: Q.850 Cause 20 / SIP 480 (3GPP Call Forwarding on Busy `*67*` trunk routing).
  - **Phone switched off**: Q.850 Cause 19 / SIP 480 (GSM CFB `*67*` trunk routing).
  - **Invalid number**: Q.850 Cause 1 / SIP 404 (Carrier unallocated test trunk routing).
- **Per-Contact Configuration**: Save distinct rejection behaviors individually for each blocked number.
- **No Simulated Voice/TTS**: Does not answer the call or play fake recorded voice messages from the dialler; triggers genuine carrier-level handling.
- **100% Silent**: Dispatches a 0ms rejection with zero device ringing or notification alerts.

### 5. Android Default Roles & Permissions Setup
- **Zero Visual Friction**: The visual modal/screen prompting to "Set as default phone & contact app" has been completely removed from the user interface, eliminating unwanted popups and interruptions on startup.
- **Default Permissions Retained**: Internal default roles (`isDefaultCaller`, `isDefaultContacts`, and `CallScreeningService` for silent Anti-Bomber) are pre-enabled and persistently stored, ensuring complete functional capability without visual prompts.
Android isolates telephony into 3 distinct system permissions and roles:
1. **Default Phone App (`ROLE_DIALER`)**:
   - Implements Android Telecom `InCallService` with `<meta-data android:name="android.telecom.IN_CALL_SERVICE_UI" android:value="true" />`.
   - Declares `android.intent.action.DIAL` (both scheme-less and `tel:` scheme) and `android.intent.action.CALL`.
2. **Default Contacts App (`READ_CONTACTS`, `WRITE_CONTACTS`, `GET_ACCOUNTS`)**:
   - Registers Contacts Provider intent filters (`PICK`, `VIEW`, `INSERT`, `EDIT`) for all contact MIME types.
   - Uses Web Contact Picker API (`navigator.contacts.select`) and native runtime permission requests.
3. **Spam & Caller ID Detector (`ROLE_CALL_SCREENING`)**:
   - Binds `CallScreeningService` for silent background anti-bomber call filtering.

### 6. Answer Button UI Settings
- **Click to Answer**: Standard 1-tap green button to answer incoming calls immediately.
- **Click and Swipe to Answer**: 360-degree drag gesture where the call is only answered when the user pulls the button past the 55px activation threshold and releases their finger. Releasing inside the threshold springs the button back safely without answering.

### 7. Wallpapers & 12+ Honor Themes
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
  11. Deep Space OLED (Pure Black #000000 for AMOLED power saving)
  12. Desert Sand (Warm Terracotta & Parchment)
- **Custom Photo Wallpaper**: Select any photo from device storage to use as the backdrop for all screens and the in-call display.

### 8. Android Back Navigation Gesture & Safe Exit
- Intercepts Android swipe gestures and hardware back buttons (`popstate` and `keydown Escape`).
- Order of dismissal:
  1. Closes open in-call dialpads, participant sheets, or overlays.
  2. Closes active modals (Silent Block, Themes, Default Roles, etc.).
  3. Returns from subviews (`Recordings`, `Contact Details`) back to the main dialler/contacts screen.
  4. Double-back tap on the root screen within 2 seconds to exit the application safely.

### 9. Multi-Storage Contact Management & Export
- **Storage Routing**: Save contacts directly to Phone Memory (`mobile`), SIM Card (`sim`), or Google Account (`gmail`).
- **Direct Import/Export**: Export/Import contacts via `.vcf` vCard files or device contact picker.
- **Direct WhatsApp Integration**: 1-tap WhatsApp chat and call launcher with automatic phone number normalization (+91 / E.164).

---

## 🛠️ Building into an Android APK

### Step 1: Compile the Web App
```bash
npm run build
```

### Step 2: Initialize & Sync Android Platform (Capacitor)
```bash
npx cap init "PureSuite Phone" "com.puredial.suite" --web-dir dist/app/browser
npx cap add android
npx cap sync android
```

### Step 3: Android Manifest Configuration
Ensure `android/app/src/main/AndroidManifest.xml` includes the necessary permissions and services:
```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.puredial.suite">

  <!-- Core Telephony, Call & Contacts Permissions -->
  <uses-permission android:name="android.permission.CALL_PHONE" />
  <uses-permission android:name="android.permission.READ_PHONE_STATE" />
  <uses-permission android:name="android.permission.READ_PHONE_NUMBERS" />
  <uses-permission android:name="android.permission.ANSWER_PHONE_CALLS" />
  <uses-permission android:name="android.permission.MANAGE_OWN_CALLS" />
  <uses-permission android:name="android.permission.RECORD_AUDIO" />
  <uses-permission android:name="android.permission.READ_CALL_LOG" />
  <uses-permission android:name="android.permission.WRITE_CALL_LOG" />
  <uses-permission android:name="android.permission.READ_CONTACTS" />
  <uses-permission android:name="android.permission.WRITE_CONTACTS" />
  <uses-permission android:name="android.permission.GET_ACCOUNTS" />

  <application android:label="PureSuite">
    <!-- Mandatory for Default Phone App: InCallService -->
    <service
        android:name=".InCallServiceImpl"
        android:permission="android.permission.BIND_INCALL_SERVICE"
        android:exported="true">
      <meta-data
          android:name="android.telecom.IN_CALL_SERVICE_UI"
          android:value="true" />
      <intent-filter>
        <action android:name="android.telecom.InCallService" />
      </intent-filter>
    </service>

    <!-- Silent Anti-Bomber Call Screening Service -->
    <service
        android:name=".AntiBomberCallScreeningService"
        android:permission="android.permission.BIND_SCREENING_SERVICE"
        android:exported="true">
      <intent-filter>
        <action android:name="android.telecom.CallScreeningService" />
      </intent-filter>
    </service>

    <!-- Split Launcher Alias #1: Phone (ROLE_DIALER) -->
    <activity-alias
        android:name=".CallerLauncherAlias"
        android:targetActivity=".MainActivity"
        android:label="Phone"
        android:enabled="true"
        android:exported="true">
      <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
      </intent-filter>
      <intent-filter>
        <action android:name="android.intent.action.DIAL" />
        <category android:name="android.intent.category.DEFAULT" />
      </intent-filter>
      <intent-filter>
        <action android:name="android.intent.action.DIAL" />
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="tel" />
      </intent-filter>
    </activity-alias>

    <!-- Split Launcher Alias #2: Contacts -->
    <activity-alias
        android:name=".ContactsLauncherAlias"
        android:targetActivity=".MainActivity"
        android:label="Contacts"
        android:enabled="true"
        android:exported="true">
      <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
      </intent-filter>
      <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <action android:name="android.intent.action.PICK" />
        <action android:name="android.intent.action.INSERT" />
        <action android:name="android.intent.action.EDIT" />
        <category android:name="android.intent.category.DEFAULT" />
        <data android:mimeType="vnd.android.cursor.dir/contact" />
      </intent-filter>
    </activity-alias>
  </application>
</manifest>
```

### Step 4: Open in Android Studio & Generate APK
```bash
npx cap open android
```
In Android Studio:
1. Select **Build > Generate Signed Bundle / APK...**
2. Choose **APK**
3. Select build variant (**debug** or **release**).
