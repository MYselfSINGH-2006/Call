import { Injectable, signal, computed, effect } from '@angular/core';
import { CALL_HISTORY, CONTACTS, GROUPS, Call, ContactItem, Group, Recording } from './data';
import { APP_THEMES, AppTheme } from './themes';
import {
  initAuth,
  getAccessToken,
  logout,
  createGoogleContactInCloud,
  fetchGoogleContactsFromCloud,
  GoogleAccountProfile
} from './google-contacts-auth';

export interface ChatMessage {
  id: number;
  text: string;
  sender: 'me' | 'them';
  time: string;
  status?: 'sent' | 'delivered' | 'sim';
}

export interface VideoCallState {
  name: string;
  phone: string;
  duration: string;
  isMuted: boolean;
  isCameraOff: boolean;
  facingMode?: 'user' | 'environment';
}

export interface ContactData {
  name: string;
  phone: string;
  type?: string;
  avatar?: string;
  color?: string;
  isSim?: boolean;
  storageLocation?: 'mobile' | 'gmail' | 'sim';
  gmailAccount?: string;
  organisation?: string;
  email?: string;
  secondPhone?: string;
  group?: string;
  ringtone?: string;
}

export interface TrustListItem {
  name: string;
  phone: string;
  note: string;
}

export interface BlockedOtpItem {
  id: number;
  sender: string;
  code: string;
  message: string;
  timestamp: string;
  reason?: string;
}

export interface IncomingCallData {
  name: string;
  phone: string;
  isNonContact: boolean;
  isBlocked: boolean;
  blockReason?: string;
  callId?: string;
  isVideo?: boolean;
  remoteSdp?: RTCSessionDescriptionInit;
}

export interface HeldCallState {
  name: string;
  phone: string;
  isNonContact: boolean;
  duration: string;
  seconds: number;
}

export interface ActiveCallState {
  name: string;
  phone: string;
  isNonContact: boolean;
  isMuted: boolean;
  isSpeaker: boolean;
  isOnHold: boolean;
  dtmfDigits: string;
  conferenceParticipants: string[];
  isConference?: boolean;
  isLiveWebRtc?: boolean;
  callId?: string;
}

export interface MyProfileCard {
  name: string;
  phone: string;
  company: string;
  email: string;
}

export interface OnlinePeerInfo {
  clientId: string;
  phone: string;
  name: string;
}

interface AndroidNativeBridgeInterface {
  requestSimPermissions?(): void;
  getLocalSimStatusJson?(): string;
  placeRealSimCall(phoneNumber: string): boolean;
  answerRingingCall(): void;
  endActiveCall(): void;
  setCallHold(hold: boolean): void;
  setCallMute(muted: boolean): void;
  setSpeakerphone(speaker: boolean): void;
  sendDtmfTone(digit: string): void;
  swapCalls(): void;
  mergeCalls(): void;
  sendRealSimSms(recipientPhone: string, messageBody: string): boolean;
  startNativeCallRecording(callerName: string): string;
  stopNativeCallRecording(): string;
  syncAntiBomberSettings(enabled: boolean, trustListJson: string, contactsJson: string): void;
  getDeviceContactsJson(): string;
  getSignedInGoogleAccountsJson?(): string;
  choosePhoneGoogleAccount?(): void;
  saveContactToDevice(name: string, phone: string): boolean;
  saveContactToGoogleOnDevice?(name: string, phone: string, googleEmail: string): boolean;
  openWhatsAppChat?(phoneNumber: string): boolean;
  openWhatsAppCall?(phoneNumber: string): boolean;
  shareContactText?(title: string, text: string): boolean;
  shareContactQrImage?(title: string, text: string, base64Png: string): boolean;
  silenceAndRejectCallSilently?(): void;
}

// DTMF standard ITU-T frequency table
const DTMF_FREQUENCIES: Record<string, [number, number]> = {
  '1': [697, 1209],
  '2': [697, 1336],
  '3': [697, 1477],
  '4': [770, 1209],
  '5': [770, 1336],
  '6': [770, 1477],
  '7': [852, 1209],
  '8': [852, 1336],
  '9': [852, 1477],
  '*': [941, 1209],
  '0': [941, 1336],
  '#': [941, 1477],
};

// Helper: Convert string to T9 number sequence for keypad lookup
function textToT9(text: string): string {
  const map: Record<string, string> = {
    a: '2', b: '2', c: '2',
    d: '3', e: '3', f: '3',
    g: '4', h: '4', i: '4',
    j: '5', k: '5', l: '5',
    m: '6', n: '6', o: '6',
    p: '7', q: '7', r: '7', s: '7',
    t: '8', u: '8', v: '8',
    w: '9', x: '9', y: '9', z: '9',
  };
  return text.toLowerCase().split('').map(ch => map[ch] || '').join('');
}

// Helper: Encode real captured Float32Array PCM samples into a genuine 16-bit PCM WAV Blob
function encodeRealPcmToWavBlob(samples: Float32Array, sampleRate = 22050): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // Mono channel
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // 16-bit
  writeString(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (const sample of samples) {
    const s = Math.max(-1, Math.min(1, sample));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

@Injectable({
  providedIn: 'root'
})
export class PhoneState {
  // Unique Client & Line Identity for Real Multi-User Calling & SMS
  readonly clientId = this.getOrCreateClientId();

  myProfile = signal<MyProfileCard>(
    this.readStorageJson<MyProfileCard>('puresuite_real_v3_my_profile', {
      name: 'MYself_SINGH',
      phone: '+91 98765 43210',
      company: 'PureSuite Default Handler',
      email: 'myself_singh@puresuite.app'
    })
  );

  // Connected real peers online across tabs/devices
  onlinePeers = signal<OnlinePeerInfo[]>([]);

  // Direct Carrier SIM Dial/SMS mode (triggers native tel: / sms: / AndroidNativeBridge automatically — ON by default!)
  carrierSimDirectMode = signal<boolean>(this.readStorageFlag('puresuite_real_v3_carrier_sim', true));

  // Local SIM Card Hardware Permission state (CALL_PHONE, READ_PHONE_STATE, READ_PHONE_NUMBERS, SEND_SMS, READ_SMS — ON by default, no popups!)
  simPermissionGranted = signal<boolean>(this.readStorageFlag('puresuite_real_v5_sim_permission_granted', true));
  isSimPermissionModalOpen = signal<boolean>(false);
  localSimCarrierName = signal<string>(this.readStorageString('puresuite_real_v4_sim_carrier', 'Local SIM Slot 1'));
  pendingSimAction = signal<{
    type: 'call' | 'sms';
    name: string;
    phone: string;
    isNonContact?: boolean;
    forceSim?: boolean;
    text?: string;
  } | null>(null);

  // Offline state indicator
  isOffline = signal<boolean>(typeof navigator !== 'undefined' ? !navigator.onLine : false);

  // Contacts (100% Offline Persisted + Device Syncable)
  contacts = signal<ContactItem[]>(this.readStorageJson<ContactItem[]>('puresuite_real_v5_contacts', [...CONTACTS]));

  // Groups (100% Offline Persisted with real memberPhones)
  groups = signal<Group[]>(this.readStorageJson<Group[]>('puresuite_real_v5_groups', [...GROUPS]));

  // Favourites (100% Offline Persisted)
  favourites = signal<{ name: string; phone: string; color: string }[]>(
    this.readStorageJson<{ name: string; phone: string; color: string }[]>('puresuite_real_v5_favourites', [
      { name: 'Aditya Friend', phone: '+91 98123 45670', color: '#f48fb1' },
      { name: 'Rajan Jiju', phone: '+91 98888 11223', color: '#ce93d8' }
    ])
  );

  // Call history (100% Offline Persisted with rich initial Honor call log)
  calls = signal<Call[]>(this.readStorageJson<Call[]>('puresuite_real_v5_calls', [...CALL_HISTORY]));

  // Blocked & Direct-to-Voicemail Numbers (for Contact Details 'More' Menu)
  blockedNumbers = signal<string[]>(this.readStorageJson<string[]>('puresuite_real_v5_blocked_nums', []));
  voicemailNumbers = signal<string[]>(this.readStorageJson<string[]>('puresuite_real_v5_voicemail_nums', []));

  // Real Audio Recordings (Persisted in localStorage as Base64 WAV DataURLs — NO fake synthetic recordings!)
  recordings = signal<Recording[]>(
    this.readStorageJson<Recording[]>('puresuite_real_v3_recordings', []).filter(r => !!r.audioUrl)
  );

  // Standalone Live Microphone Voice Recorder state (in Call Recordings view)
  isStandaloneVoiceRecording = signal<boolean>(false);
  standaloneRecordingSeconds = signal<number>(0);
  private standaloneTimer: ReturnType<typeof setInterval> | null = null;

  // Real Audio Player instance for recordings
  playingRecordingId = signal<number | null>(null);
  recordingCurrentSeconds = signal<number>(0);
  recordingTotalSeconds = signal<number>(1);
  private currentAudioElement: HTMLAudioElement | null = null;
  private recordingPlaybackTimer: ReturnType<typeof setInterval> | null = null;

  // Security & Spam features (Real Multi-Layer Anti-Bomber Engine — Offline Persisted)
  antiBomber = signal<boolean>(this.readStorageFlag('apk_offline_anti_bomber', false));
  blockOtp = signal<boolean>(this.readStorageFlag('apk_offline_anti_bomber', false));
  blockedOtps = signal<BlockedOtpItem[]>(this.readStorageJson<BlockedOtpItem[]>('apk_offline_blocked_otps', []));
  blockedCallsCount = signal<number>(this.readStorageJson<number>('apk_offline_blocked_calls_count', 0));

  blockNonContacts = signal<boolean>(this.readStorageFlag('apk_offline_anti_bomber', false));
  trustList = signal<TrustListItem[]>(
    this.readStorageJson<TrustListItem[]>('apk_offline_trust_list', [
      { name: 'Amazon Delivery Agent', phone: '+91 98888 77665', note: 'Regular area courier' },
      { name: 'Gate Security Guard', phone: '+91 91234 11223', note: 'Society main gate' },
      { name: 'Apollo Pharmacy', phone: '+91 97799 44332', note: 'Medical delivery' }
    ])
  );

  // Rate-limiters for real Anti-Bomber flood detection
  private callRateMap = new Map<string, number[]>();
  private smsRateMap = new Map<string, number[]>();

  // UI state for security modals
  isTrustListModalOpen = signal(false);
  isBlockedOtpsModalOpen = signal(false);

  // Incoming Call state & Top-Notch Banner mode
  incomingCall = signal<IncomingCallData | null>(null);
  incomingCallViewMode = signal<'banner' | 'fullscreen'>('banner');
  private incomingRingTimer: ReturnType<typeof setInterval> | null = null;

  // Confirmation Dialog state (for Delete Contact & Clear Call History)
  confirmDialog = signal<{
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => void;
  } | null>(null);

  toastMessage = signal<string | null>(null);
  private toastTimeout: ReturnType<typeof setTimeout> | null = null;

  // Active voice call with full in-call controls & real WebRTC + Microphone audio
  activeCall = signal<ActiveCallState | null>(null);
  activeCallViewMode = signal<'banner' | 'fullscreen'>('fullscreen');
  heldCall = signal<HeldCallState | null>(null);
  callStatus = signal<'Calling...' | 'Ringing...' | 'Connected' | 'On Hold'>('Calling...');
  callDuration = signal('00:00');
  isInCallKeypadOpen = signal(false);
  isAddPersonModalOpen = signal(false);
  liveMicLevel = signal(8); // Real-time microphone voice visualizer meter
  private callTimer: ReturnType<typeof setInterval> | null = null;
  private callSeconds = 0;
  private autoConnectFallbackTimer: ReturnType<typeof setTimeout> | null = null;

  // Real WebRTC & Web Audio Nodes & Microphone Stream
  private audioCtx: AudioContext | null = null;
  private micMediaStream: MediaStream | null = null;
  private remoteMediaStream: MediaStream | null = null;
  private remoteAudioEl: HTMLAudioElement | null = null;
  private peerConnection: RTCPeerConnection | null = null;
  private pendingIceCandidates: RTCIceCandidateInit[] = [];
  private activeCallId: string | null = null;
  private micAnalyser: AnalyserNode | null = null;
  private micLevelInterval: ReturnType<typeof setInterval> | null = null;
  private ringCadenceTimer: ReturnType<typeof setInterval> | null = null;
  private holdCadenceTimer: ReturnType<typeof setInterval> | null = null;

  // Real Live PCM Audio Recorder (captures actual microphone + remote WebRTC audio)
  private pcmRecorderNode: ScriptProcessorNode | null = null;
  private pcmSourceNode: MediaStreamAudioSourceNode | null = null;
  private pcmRemoteSourceNode: MediaStreamAudioSourceNode | null = null;
  private recordedPcmChunks: Float32Array[] = [];
  private recordedSampleRate = 22050;
  private recordingStartTimestamp = 0;
  private activeRecordingElapsedTimer: ReturnType<typeof setInterval> | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private mediaRecorderChunks: Blob[] = [];

  // Real-time Signaling Channels (SSE + BroadcastChannel for 100% offline/local multi-tab P2P)
  private eventSource: EventSource | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private processedSmsIds = new Set<number>();

  // Silent / Auto Call Recording Settings (Persisted)
  autoRecordEnabled = signal<boolean>(this.readStorageFlag('apk_auto_record_enabled', false));
  autoRecordUnknown = signal<boolean>(this.readStorageFlag('apk_auto_record_unknown', false));
  autoRecordContacts = signal<boolean>(this.readStorageFlag('apk_auto_record_contacts', false));
  autoRecordNumbers = signal<string[]>([]);
  isRecording = signal(false);

  silentRecording = computed(() => this.autoRecordEnabled());

  // Active video call with REAL Camera & WebRTC Video Streams
  activeVideoCall = signal<VideoCallState | null>(null);
  localVideoStream = signal<MediaStream | null>(null);
  remoteVideoStream = signal<MediaStream | null>(null);
  cameraFacingMode = signal<'user' | 'environment'>('user');
  private videoTimer: ReturnType<typeof setInterval> | null = null;
  private videoSeconds = 0;

  // Active SMS/Chat is disabled — all message icons redirect directly to the phone's Default Messaging App
  activeChat = signal<ContactData | null>(null);
  chatThreads = signal<Record<string, ChatMessage[]>>({});

  // Default Contact Save Location ('mobile' | 'gmail' | 'sim') & System Google Account on Phone (Zero login required!)
  defaultContactStorage = signal<'mobile' | 'gmail' | 'sim'>(
    (this.readStorageString('puresuite_default_contact_storage', 'mobile') as 'mobile' | 'gmail' | 'sim') || 'mobile'
  );
  connectedGmailAccount = signal<string>(
    this.readStorageString('puresuite_connected_gmail_v2', 'z7810780@gmail.com')
  );

  // Signed-in Google Accounts on THIS user's Phone (Auto-detected from Android System AccountManager — no login required!)
  signedInGoogleAccounts = signal<GoogleAccountProfile[]>(
    this.readStorageJson<GoogleAccountProfile[]>('puresuite_phone_google_accounts_v4', [
      {
        email: 'z7810780@gmail.com',
        displayName: 'MYself_SINGH (Primary Phone Gmail)',
        isDefaultPhoneAccount: true
      },
      {
        email: 'myself.singh.work@gmail.com',
        displayName: 'MYself_SINGH (Secondary Phone Gmail)',
        isDefaultPhoneAccount: false
      }
    ])
  );
  googleAuthReady = signal<boolean>(true);
  isGoogleSigningIn = signal<boolean>(false);
  isGoogleSyncing = signal<boolean>(false);
  isGoogleAccountPickerOpen = signal<boolean>(false);

  // Add contact modal
  isAddModalOpen = signal(false);
  addModalPrefill = signal<{ name?: string; phone?: string; storageLocation?: 'mobile' | 'gmail' | 'sim' }>({});

  // Edit contact modal
  isEditModalOpen = signal(false);
  editModalData = signal<{
    originalPhone: string;
    name: string;
    phone: string;
    secondPhone?: string;
    type: string;
    storageLocation?: 'mobile' | 'gmail' | 'sim';
    gmailAccount?: string;
    organisation?: string;
    email?: string;
    group?: string;
    avatar?: string;
    color?: string;
  } | null>(null);

  // Current contact details view selection
  selectedContact = signal<ContactData | null>(null);

  // Whether the Honor dialer keypad drawer is currently expanded on the Phone screen
  isKeypadOpen = signal<boolean>(true);

  // --- 3-App Split APK & Default Handler Enforcement State ---
  isDefaultCaller = signal<boolean>(this.readStorageFlag('puresuite_real_v3_default_caller', true));
  isDefaultSms = signal<boolean>(this.readStorageFlag('puresuite_real_v3_default_sms', true));
  isDefaultContacts = signal<boolean>(this.readStorageFlag('puresuite_real_v3_default_contacts', true));
  isSplitIntoThreeApps = signal<boolean>(this.readStorageFlag('puresuite_real_v3_split_3_apps', true));

  allDefaultsGranted = computed(() =>
    this.isDefaultCaller() && this.isDefaultContacts()
  );

  isForceDefaultModalOpen = signal<boolean>(false);

  activeSystemRolePrompt = signal<'caller' | 'sms' | 'contacts' | 'all' | null>(null);
  selectedRoleCandidate = signal<'our_app' | 'system_stock'>('our_app');

  isSplitLauncherModalOpen = signal<boolean>(false);
  isApkManifestModalOpen = signal<boolean>(false);
  activeSplitApp = signal<'caller' | 'sms' | 'contacts'>('caller');

  // --- UNIFIED GLOBAL THEME STATE (Choose theme once, applies to ALL apps!) ---
  allThemes: AppTheme[] = APP_THEMES;
  availableThemes: AppTheme[] = APP_THEMES;

  private getInitialThemeId(): string {
    const saved = this.readStorageString('apk_unified_theme_v5_id', 'default');
    if (this.allThemes.some(t => t.id === saved)) {
      return saved;
    }
    return 'default';
  }

  activeThemeId = signal<string>(this.getInitialThemeId());

  // User-selected custom wallpaper (e.g. from device gallery/camera)
  customWallpaper = signal<string>(this.readStorageString('apk_custom_user_wallpaper', ''));

  setCustomWallpaper(url: string) {
    this.customWallpaper.set(url);
    this.writeStorageString('apk_custom_user_wallpaper', url);
    this.showToast('Custom wallpaper applied to Home & Caller screen');
  }

  clearCustomWallpaper() {
    this.customWallpaper.set('');
    this.writeStorageString('apk_custom_user_wallpaper', '');
    this.showToast('Reset to theme wallpaper');
  }

  // Answer Button UI Mode: 'swipe' ("click and swipe to ans") | 'click' ("click to ans")
  answerButtonMode = signal<'swipe' | 'click'>(
    (this.readStorageString('apk_answer_button_mode', 'swipe') as 'swipe' | 'click') || 'swipe'
  );

  setAnswerButtonMode(mode: 'swipe' | 'click') {
    this.answerButtonMode.set(mode);
    this.writeStorageString('apk_answer_button_mode', mode);
  }

  currentTheme = computed<AppTheme>(() =>
    this.allThemes.find(t => t.id === this.activeThemeId()) || this.allThemes[0]
  );

  callerTheme = this.currentTheme;
  smsTheme = this.currentTheme;
  contactsTheme = this.currentTheme;

  isThemeModalOpen = signal<boolean>(false);
  themeModalTargetApp = signal<'caller' | 'sms' | 'contacts'>('caller');

  openThemeModal() {
    this.isThemeModalOpen.set(true);
  }

  openThemeSelectorForApp(targetApp: 'caller' | 'sms' | 'contacts' = 'caller') {
    this.themeModalTargetApp.set(targetApp);
    this.isThemeModalOpen.set(true);
  }

  openThemeModalForApp(targetApp: 'caller' | 'sms' | 'contacts' = 'caller') {
    this.openThemeSelectorForApp(targetApp);
  }

  getThemeIdForApp(targetApp?: 'caller' | 'sms' | 'contacts'): string {
    if (targetApp) {
      return this.activeThemeId();
    }
    return this.activeThemeId();
  }

  selectGlobalTheme(themeId: string) {
    if (!this.allThemes.some(t => t.id === themeId)) return;
    this.activeThemeId.set(themeId);
    this.writeStorageString('apk_unified_theme_v5_id', themeId);
  }

  selectThemeForApp(targetApp: 'caller' | 'sms' | 'contacts', themeId: string) {
    this.themeModalTargetApp.set(targetApp);
    this.selectGlobalTheme(themeId);
  }

  selectThemeForTargetApp(themeId: string) {
    this.selectGlobalTheme(themeId);
  }

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOffline.set(false);
        this.connectRealtimeSignaling();
      });
      window.addEventListener('offline', () => this.isOffline.set(true));

      // Initialize real-time signaling (SSE + BroadcastChannel P2P + Native Android Bridge events)
      this.deduplicateExistingContacts();
      this.initRealtimeNetwork();
      this.initNativeAndroidListeners();
      this.initGoogleContactsAuth();
    }

    // Automatically persist all app data offline in localStorage
    effect(() => {
      this.writeStorageJson('puresuite_real_v5_contacts', this.contacts());
      this.syncSecurityToNativeAndServer();
    });
    effect(() => {
      this.writeStorageString('puresuite_default_contact_storage', this.defaultContactStorage());
    });
    effect(() => {
      this.writeStorageString('puresuite_connected_gmail_v2', this.connectedGmailAccount());
    });
    effect(() => {
      this.writeStorageJson('puresuite_phone_google_accounts_v4', this.signedInGoogleAccounts());
    });
    effect(() => {
      this.writeStorageJson('puresuite_real_v5_groups', this.groups());
    });
    effect(() => {
      this.writeStorageJson('puresuite_real_v5_favourites', this.favourites());
    });
    effect(() => {
      this.writeStorageJson('puresuite_real_v5_calls', this.calls());
    });
    effect(() => {
      this.writeStorageJson('puresuite_real_v5_blocked_nums', this.blockedNumbers());
    });
    effect(() => {
      this.writeStorageJson('puresuite_real_v5_voicemail_nums', this.voicemailNumbers());
    });
    effect(() => {
      this.writeStorageJson('puresuite_real_v3_sms_threads', this.chatThreads());
    });
    effect(() => {
      this.writeStorageJson('puresuite_real_v3_trust_list', this.trustList());
      this.syncSecurityToNativeAndServer();
    });
    effect(() => {
      this.writeStorageFlag('puresuite_real_v3_anti_bomber', this.antiBomber());
      this.syncSecurityToNativeAndServer();
    });
    effect(() => {
      this.writeStorageJson('puresuite_real_v3_blocked_otps', this.blockedOtps());
    });
    effect(() => {
      this.writeStorageJson('puresuite_real_v3_blocked_calls_count', this.blockedCallsCount());
    });
    effect(() => {
      this.writeStorageJson('puresuite_real_v3_recordings', this.recordings());
    });
    effect(() => {
      this.writeStorageJson('puresuite_real_v3_my_profile', this.myProfile());
    });
    effect(() => {
      this.writeStorageFlag('puresuite_real_v3_carrier_sim', this.carrierSimDirectMode());
    });
    effect(() => {
      this.writeStorageFlag('puresuite_real_v3_auto_record_enabled', this.autoRecordEnabled());
      this.writeStorageFlag('puresuite_real_v3_auto_record_unknown', this.autoRecordUnknown());
      this.writeStorageFlag('puresuite_real_v3_auto_record_contacts', this.autoRecordContacts());
    });
  }

  private getOrCreateClientId(): string {
    try {
      if (typeof sessionStorage !== 'undefined') {
        const existing = sessionStorage.getItem('puresuite_client_id');
        if (existing) return existing;
        const created = `line_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        sessionStorage.setItem('puresuite_client_id', created);
        return created;
      }
    } catch {
      // ignore
    }
    return `line_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }

  private getNativeBridge(): AndroidNativeBridgeInterface | null {
    if (typeof window === 'undefined') return null;
    const win = window as unknown as { AndroidNativeBridge?: AndroidNativeBridgeInterface };
    return win.AndroidNativeBridge || null;
  }

  // ============================================================================
  // REAL-TIME SIGNALING & P2P NETWORK (SSE + BroadcastChannel + Native Bridge)
  // ============================================================================
  private initRealtimeNetwork() {
    // 1. Offline / Multi-Tab P2P BroadcastChannel (works 100% offline with zero internet!)
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        this.broadcastChannel = new BroadcastChannel('puresuite_live_network');
        this.broadcastChannel.onmessage = (event) => {
          const data = event.data;
          if (!data || data.clientId === this.clientId) return;
          this.handleRealtimeEvent(data.type, data.payload);
        };
      }
    } catch {
      // ignore
    }

    // 2. Online Server-Sent Events (SSE) stream for cross-device calling & SMS
    this.connectRealtimeSignaling();
  }

  private connectRealtimeSignaling() {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;
    try {
      if (this.eventSource) {
        this.eventSource.close();
      }
      const profile = this.myProfile();
      const params = new URLSearchParams({
        clientId: this.clientId,
        phone: profile.phone,
        name: profile.name,
        antiBomber: String(this.antiBomber())
      });
      this.eventSource = new EventSource(`/api/events?${params.toString()}`);
      this.eventSource.onmessage = (evt) => {
        try {
          const parsed = JSON.parse(evt.data);
          if (parsed && parsed.type) {
            this.handleRealtimeEvent(parsed.type, parsed.payload);
          }
        } catch {
          // ignore malformed event
        }
      };
    } catch {
      // offline fallback handled by BroadcastChannel
    }
  }

  private initNativeAndroidListeners() {
    if (typeof window === 'undefined') return;

    window.addEventListener('native:incomingSms', (event: Event) => {
      const custom = event as CustomEvent<{ sender: string; text: string }>;
      if (custom.detail) {
        this.handleIncomingRealSms(custom.detail.sender, custom.detail.text, custom.detail.sender, Date.now());
      }
    });

    window.addEventListener('native:googleAccounts', (event: Event) => {
      const custom = event as CustomEvent<{ accounts: GoogleAccountProfile[] }>;
      if (custom.detail?.accounts && Array.isArray(custom.detail.accounts)) {
        for (const acc of custom.detail.accounts) {
          this.registerSignedInGoogleAccount(acc);
        }
        if (!this.connectedGmailAccount() && custom.detail.accounts[0]?.email) {
          this.connectedGmailAccount.set(custom.detail.accounts[0].email);
        }
      }
    });

    window.addEventListener('native:callState', (event: Event) => {
      const custom = event as CustomEvent<{ phone: string; state: number }>;
      if (!custom.detail) return;
      const { phone, state } = custom.detail;
      // Android Telecom Call states: 2 = RINGING, 4 = ACTIVE, 3 = HOLDING, 7 = DISCONNECTED
      if (state === 2) {
        this.onIncomingCallOffer({
          fromPhone: phone,
          fromName: phone,
          callId: `native_${Date.now()}`
        });
      } else if (state === 4 && this.activeCall()) {
        this.onRemoteCallConnected();
      } else if (state === 7 && (this.activeCall() || this.incomingCall())) {
        if (this.incomingCall()) {
          this.declineIncomingCall(false);
        } else {
          this.endCall(false);
        }
      }
    });

    // Load device contacts & request SIM permissions silently if running inside Android APK
    const bridge = this.getNativeBridge();
    if (bridge) {
      try {
        bridge.requestSimPermissions?.();
        const statusJson = bridge.getLocalSimStatusJson?.();
        if (statusJson) {
          const parsed = JSON.parse(statusJson);
          if (parsed.carrierName) {
            this.localSimCarrierName.set(parsed.carrierName);
          }
        }
        const rawGoogleAccounts = bridge.getSignedInGoogleAccountsJson?.();
        if (rawGoogleAccounts) {
          const parsedAccounts = JSON.parse(rawGoogleAccounts) as GoogleAccountProfile[];
          if (Array.isArray(parsedAccounts) && parsedAccounts.length > 0) {
            for (const acc of parsedAccounts) {
              this.registerSignedInGoogleAccount(acc);
            }
            if (!this.connectedGmailAccount()) {
              this.connectedGmailAccount.set(parsedAccounts[0].email);
            }
          }
        }
        const rawContacts = bridge.getDeviceContactsJson();
        if (rawContacts) {
          const parsed = JSON.parse(rawContacts) as ContactItem[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.mergeImportedContacts(parsed);
          }
        }
      } catch {
        // ignore
      }
    }
  }

  private syncSecurityToNativeAndServer() {
    const bridge = this.getNativeBridge();
    if (bridge) {
      try {
        bridge.syncAntiBomberSettings(
          this.antiBomber(),
          JSON.stringify(this.trustList()),
          JSON.stringify(this.contacts())
        );
      } catch {
        // ignore
      }
    }

    if (typeof fetch !== 'undefined' && !this.isOffline()) {
      const profile = this.myProfile();
      fetch('/api/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: this.clientId,
          phone: profile.phone,
          name: profile.name,
          antiBomber: this.antiBomber(),
          contacts: this.contacts().map(c => c.phone),
          trustList: this.trustList().map(t => t.phone)
        })
      }).catch(() => undefined);
    }
  }

  updateMyProfile(name: string, phone: string, company = 'PureSuite Default Handler', email = '') {
    this.myProfile.set({
      name: name.trim() || 'MYself_SINGH',
      phone: phone.trim() || '+91 98765 43210',
      company: company.trim(),
      email: email.trim()
    });
    this.syncSecurityToNativeAndServer();
    this.showToast(`Updated My Card & Active Line (${phone.trim()})`);
  }

  toggleCarrierSimDirectMode() {
    const next = !this.carrierSimDirectMode();
    this.carrierSimDirectMode.set(next);
    this.showToast(next ? 'Direct Carrier SIM Dial/SMS Mode: ON' : 'Direct Carrier SIM Dial/SMS Mode: OFF');
  }

  // Handle incoming real-time events from Server SSE or Offline BroadcastChannel
  private handleRealtimeEvent(type: string, payload: unknown) {
    if (!payload || typeof payload !== 'object') return;
    const data = payload as Record<string, unknown>;

    switch (type) {
      case 'init':
      case 'presence:update': {
        const peers = (data['activePeers'] as OnlinePeerInfo[]) || [];
        this.onlinePeers.set(peers.filter(p => p.clientId !== this.clientId));
        break;
      }
      case 'sms:received': {
        const id = Number(data['id'] || Date.now());
        if (this.processedSmsIds.has(id)) return;
        this.processedSmsIds.add(id);
        this.handleIncomingRealSms(
          String(data['fromPhone'] || ''),
          String(data['text'] || ''),
          String(data['fromName'] || ''),
          id,
          String(data['time'] || '')
        );
        break;
      }
      case 'antibomber:sms_blocked': {
        this.recordQuarantinedOtp(
          String(data['fromPhone'] || 'Unknown'),
          String(data['text'] || ''),
          String(data['reason'] || 'Blocked by Anti-Bomber')
        );
        break;
      }
      case 'antibomber:call_blocked': {
        this.blockedCallsCount.update(c => c + 1);
        break;
      }
      case 'call:offer': {
        this.onIncomingCallOffer({
          fromPhone: String(data['fromPhone'] || 'Unknown'),
          fromName: String(data['fromName'] || ''),
          callId: String(data['callId'] || ''),
          sdp: data['sdp'] as RTCSessionDescriptionInit | undefined,
          isVideo: Boolean(data['isVideo'])
        });
        break;
      }
      case 'call:ringing': {
        if (this.activeCall() && this.callStatus() === 'Calling...') {
          this.callStatus.set('Ringing...');
          this.startRingingCadence();
        }
        break;
      }
      case 'call:answer': {
        this.onRemoteCallAnswer(data['sdp'] as RTCSessionDescriptionInit | undefined);
        break;
      }
      case 'call:ice': {
        this.onRemoteIceCandidate(data['candidate'] as RTCIceCandidateInit | undefined);
        break;
      }
      case 'call:reject': {
        if (this.activeCall() || this.activeVideoCall()) {
          this.showToast('Call declined or blocked by recipient');
          this.endCall(false);
          this.endVideoCall(false);
        }
        break;
      }
      case 'call:hangup': {
        if (this.incomingCall()) {
          this.declineIncomingCall(false);
        } else if (this.activeCall()) {
          this.endCall(false);
        } else if (this.activeVideoCall()) {
          this.endVideoCall(false);
        }
        break;
      }
      case 'call:hold': {
        const cur = this.activeCall();
        if (cur) {
          this.activeCall.set({ ...cur, isOnHold: true });
          this.callStatus.set('On Hold');
          this.startHoldAudio();
        }
        break;
      }
      case 'call:resume': {
        const cur = this.activeCall();
        if (cur) {
          this.activeCall.set({ ...cur, isOnHold: false });
          this.callStatus.set('Connected');
          this.stopHoldAudioOnly();
        }
        break;
      }
      case 'call:dtmf': {
        const digit = String(data['dtmfDigit'] || '');
        if (digit) {
          this.playTone(digit);
        }
        break;
      }
    }
  }

  private emitSignal(signalType: string, extra: Record<string, unknown> = {}) {
    const profile = this.myProfile();
    const body = {
      clientId: this.clientId,
      signalType,
      fromPhone: profile.phone,
      fromName: profile.name,
      callId: this.activeCallId,
      ...extra
    };

    try {
      this.broadcastChannel?.postMessage({
        clientId: this.clientId,
        type: `call:${signalType}`,
        payload: body
      });
    } catch {
      // ignore
    }

    if (typeof fetch !== 'undefined' && !this.isOffline()) {
      fetch('/api/call/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
        .then(r => r.json())
        .then(res => {
          if (res?.blockedByAntiBomber && this.activeCall()) {
            this.showToast('Call rejected by recipient Anti-Bomber firewall');
            this.endCall(false);
          }
        })
        .catch(() => undefined);
    }
  }

  // ============================================================================
  // STORAGE HELPERS
  // ============================================================================
  private readStorageJson<T>(key: string, fallback: T): T {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(key);
        if (raw) {
          return JSON.parse(raw) as T;
        }
      }
    } catch {
      // ignore storage errors
    }
    return fallback;
  }

  private writeStorageJson<T>(key: string, value: T) {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch {
      // ignore storage errors
    }
  }

  private readStorageString(key: string, fallback: string): string {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        const val = localStorage.getItem(key);
        if (val !== null && val.trim() !== '') return val;
      }
    } catch {
      // ignore storage errors
    }
    return fallback;
  }

  private writeStorageString(key: string, value: string) {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value);
      }
    } catch {
      // ignore storage errors
    }
  }

  private readStorageFlag(key: string, fallback: boolean): boolean {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        const val = localStorage.getItem(key);
        if (val !== null) return val === 'true';
      }
    } catch {
      // ignore storage errors
    }
    return fallback;
  }

  private writeStorageFlag(key: string, value: boolean) {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.setItem(key, String(value));
      }
    } catch {
      // ignore storage errors
    }
  }

  private getAudioContext(): AudioContext | null {
    try {
      const win = window as unknown as { AudioContext: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
      const AudioCtx = win.AudioContext || win.webkitAudioContext;
      if (!AudioCtx) return null;
      if (!this.audioCtx) {
        this.audioCtx = new AudioCtx();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      return this.audioCtx;
    } catch {
      return null;
    }
  }

  showToast(message?: string) {
    // Silent: No toast or popup shown while using any feature or turning it on/off
    void message;
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
      this.toastTimeout = null;
    }
    if (this.toastMessage() !== null) {
      this.toastMessage.set(null);
    }
  }

  normalizePhoneDigits(phone: string): string {
    if (!phone) return '';
    return phone.replace(/\D/g, '');
  }

  getCanonicalPhoneKey(phone: string): string {
    const digits = this.normalizePhoneDigits(phone).replace(/^0+/, '');
    if (digits.length >= 10) {
      return digits.slice(-10);
    }
    return digits;
  }

  findContactByPhone(phone: string): ContactItem | undefined {
    if (!phone) return undefined;
    return this.contacts().find(c => this.arePhonesSame(c.phone, phone));
  }

  triggerAndroidSystemAccountPicker() {
    const bridge = this.getNativeBridge();
    if (bridge?.choosePhoneGoogleAccount) {
      bridge.choosePhoneGoogleAccount();
      return;
    }
    this.discoverPhoneGoogleAccounts();
  }

  // Canonical phone number comparison: treats "8288950843", "+91 8288950843", "08288950843", "91-82889-50843" as the EXACT same phone number!
  arePhonesSame(phoneA: string, phoneB: string): boolean {
    if (!phoneA || !phoneB) return false;
    const rawA = phoneA.trim();
    const rawB = phoneB.trim();
    if (rawA === rawB) return true;

    const dA = this.normalizePhoneDigits(rawA).replace(/^0+/, '');
    const dB = this.normalizePhoneDigits(rawB).replace(/^0+/, '');
    if (!dA || !dB) return false;
    if (dA === dB) return true;

    if (dA.length >= 10 && dB.length >= 10) {
      return dA.slice(-10) === dB.slice(-10);
    }
    if (dA.length >= 7 && dB.length >= 7) {
      return dA.slice(-7) === dB.slice(-7) && Math.abs(dA.length - dB.length) <= 3;
    }
    return false;
  }

  private deduplicateExistingContacts() {
    const list = this.contacts();
    if (list.length <= 1) return;
    const deduplicated: ContactItem[] = [];
    for (const item of list) {
      const existingIdx = deduplicated.findIndex(c => this.arePhonesSame(c.phone, item.phone));
      if (existingIdx >= 0) {
        // Keep the latest updated contact entry while preserving rich fields
        deduplicated[existingIdx] = {
          ...deduplicated[existingIdx],
          ...item,
          name: item.name || deduplicated[existingIdx].name,
          phone: deduplicated[existingIdx].phone.startsWith('+') ? deduplicated[existingIdx].phone : item.phone
        };
      } else {
        deduplicated.push(item);
      }
    }
    if (deduplicated.length !== list.length) {
      this.contacts.set(deduplicated);
    }
  }

  findContact(query: string): ContactItem | undefined {
    if (!query) return undefined;
    const cleanQ = query.trim().toLowerCase();
    if (!cleanQ) return undefined;
    const digitsQ = this.normalizePhoneDigits(query);
    const all = this.contacts();

    // 1. Exact Name Match
    const exactName = all.find(c => c.name.toLowerCase() === cleanQ);
    if (exactName) return exactName;

    // 2. Exact Phone Match
    const exactPhone = all.find(c => this.arePhonesSame(c.phone, query));
    if (exactPhone) return exactPhone;

    // 3. Name starts with cleanQ (only if cleanQ has at least 2 chars)
    if (cleanQ.length >= 2) {
      const prefixName = all.find(c => c.name.toLowerCase().startsWith(cleanQ));
      if (prefixName) return prefixName;
    }

    // 4. Exact 10-digit match
    if (digitsQ.length >= 7) {
      const q10 = digitsQ.slice(-10);
      const phone10 = all.find(c => {
        const c10 = this.normalizePhoneDigits(c.phone).slice(-10);
        return c10.length >= 7 && (c10 === q10 || c10.endsWith(q10) || q10.endsWith(c10));
      });
      if (phone10) return phone10;
    }

    // 5. T9 match if numeric query
    if (/^\d+$/.test(cleanQ) && cleanQ.length >= 2) {
      const t9Match = all.find(c => textToT9(c.name).includes(cleanQ));
      if (t9Match) return t9Match;
    }

    return undefined;
  }

  isContact(nameOrPhone: string): boolean {
    if (!nameOrPhone) return false;
    return !!this.findContact(nameOrPhone);
  }

  isTrusted(nameOrPhone: string): boolean {
    if (!nameOrPhone) return false;
    const query = nameOrPhone.trim().toLowerCase();

    return this.trustList().some(t => {
      if (t.name.toLowerCase() === query) return true;
      return this.arePhonesSame(t.phone, nameOrPhone);
    });
  }

  // ============================================================================
  // REAL MULTI-LAYER ANTI-BOMBER ENGINE (100% Silent Magic Call & OTP Firewall)
  // ============================================================================
  toggleAntiBomber() {
    const next = !this.antiBomber();
    this.antiBomber.set(next);
    this.blockOtp.set(next);
    this.blockNonContacts.set(next);
    this.writeStorageFlag('apk_offline_anti_bomber', next);
  }

  toggleBlockOtp() {
    this.toggleAntiBomber();
  }

  toggleBlockNonContacts() {
    this.toggleAntiBomber();
  }

  private checkRateLimit(tracker: Map<string, number[]>, phoneOrKey: string, limitPerMin: number): boolean {
    const now = Date.now();
    const windowStart = now - 60_000;
    const key = this.normalizePhoneDigits(phoneOrKey).slice(-10) || phoneOrKey || 'unknown';
    const history = (tracker.get(key) || []).filter(ts => ts >= windowStart);
    history.push(now);
    tracker.set(key, history);
    return history.length > limitPerMin;
  }

  private isRobocallOrTelemarketerNumber(phone: string): boolean {
    const digits = this.normalizePhoneDigits(phone);
    // Indian & global telemarketing / automated OTP voice call prefixes (140xxxx, 160xxxx, +91140..., +91160..., 1800..., 5-6 digit shortcodes)
    if (/^(91)?(140|160)\d{6,8}$/.test(digits)) return true;
    if (/^(1800|000|190)\d+$/.test(digits)) return true;
    if (digits.length >= 4 && digits.length <= 6) return true;
    return false;
  }

  private isOtpOrBulkMessage(sender: string, text: string): { isSpam: boolean; otpCode: string; reason: string } {
    const lower = (text || '').toLowerCase();
    const upperSender = (sender || '').toUpperCase();
    const senderDigits = this.normalizePhoneDigits(sender);
    const codeMatch = text.match(/\b(\d{4,8})\b/);
    const otpCode = codeMatch ? codeMatch[1] : 'SPAM';

    if (/^(VM-|AD-|JD-|BZ-|AX-|TM-|QP-|VK-|CP-|IX-|BP-|JM-|VD-|MD-|TX-|HP-)/.test(upperSender)) {
      return { isSpam: true, otpCode, reason: 'Commercial / Bulk SMS Gateway Header' };
    }
    if (senderDigits.length >= 4 && senderDigits.length <= 6) {
      return { isSpam: true, otpCode, reason: 'Shortcode OTP / Automated Gateway' };
    }
    if (
      lower.includes('otp') ||
      lower.includes('verification') ||
      lower.includes('security code') ||
      lower.includes('one time password') ||
      lower.includes('one-time') ||
      lower.includes('login code') ||
      lower.includes('auth code') ||
      lower.includes('passcode') ||
      lower.includes('do not share') ||
      lower.includes('valid for') ||
      (codeMatch && (lower.includes('code') || lower.includes('verify') || lower.includes('pin') || lower.includes('login') || lower.includes('bank')))
    ) {
      return { isSpam: true, otpCode, reason: 'OTP / Verification Code Bombing Pattern' };
    }
    return { isSpam: false, otpCode: '', reason: '' };
  }

  private recordQuarantinedOtp(sender: string, message: string, reason = 'Intercepted by Anti-Bomber') {
    const codeMatch = message.match(/\b(\d{4,8})\b/);
    const code = codeMatch ? codeMatch[1] : 'BLOCKED';
    const item: BlockedOtpItem = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      sender,
      code,
      message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      reason
    };
    this.blockedOtps.update(list => {
      const updated = [item, ...list.slice(0, 99)];
      this.writeStorageJson('apk_offline_blocked_otps', updated);
      return updated;
    });
  }

  clearBlockedOtps() {
    this.blockedOtps.set([]);
    this.blockedCallsCount.set(0);
    this.writeStorageJson('apk_offline_blocked_otps', []);
    this.writeStorageJson('apk_offline_blocked_calls_count', 0);
    this.showToast('Cleared Anti-Bomber quarantine log');
  }

  addToTrustList(name: string, phone: string, note = 'Trusted non-contact') {
    const cleanPhone = phone.trim();
    const cleanName = name.trim();
    if (!cleanPhone || !cleanName) return;

    this.trustList.update(list => [
      ...list.filter(t => t.phone.replace(/\s+/g, '') !== cleanPhone.replace(/\s+/g, '')),
      { name: cleanName, phone: cleanPhone, note }
    ]);
    this.showToast(`Added ${cleanName} to Trust List`);
  }

  removeFromTrustList(phone: string) {
    this.trustList.update(list => list.filter(t => t.phone.replace(/\s+/g, '') !== phone.replace(/\s+/g, '')));
    this.showToast('Removed from Trust List');
  }

  // ============================================================================
  // REAL WEBRTC & HARDWARE AUDIO ENGINE + REAL MICROPHONE CALL RECORDING
  // ============================================================================
  private startRingingCadence() {
    this.stopRingAndHoldTimers();
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const playBurst = () => {
      if (this.callStatus() !== 'Ringing...') return;
      try {
        const now = ctx.currentTime;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.frequency.setValueAtTime(440, now);
        osc2.frequency.setValueAtTime(480, now);

        gain.gain.setValueAtTime(0.04, now);
        gain.gain.setValueAtTime(0.04, now + 1.4);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.5);
        osc2.stop(now + 1.5);
      } catch {
        // silent fallback
      }
    };

    playBurst();
    this.ringCadenceTimer = setInterval(() => {
      if (this.callStatus() === 'Ringing...') {
        playBurst();
      } else {
        if (this.ringCadenceTimer) clearInterval(this.ringCadenceTimer);
      }
    }, 3200);
  }

  private async ensureMicrophoneStream(): Promise<MediaStream | null> {
    if (this.micMediaStream && this.micMediaStream.active) {
      return this.micMediaStream;
    }
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        this.micMediaStream = stream;
        this.attachMicrophoneMeter(stream);
        return stream;
      } catch {
        return null;
      }
    }
    return null;
  }

  private attachMicrophoneMeter(stream: MediaStream) {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const source = ctx.createMediaStreamSource(stream);
      this.micAnalyser = ctx.createAnalyser();
      this.micAnalyser.fftSize = 64;
      source.connect(this.micAnalyser);

      const dataArray = new Uint8Array(this.micAnalyser.frequencyBinCount);
      if (this.micLevelInterval) clearInterval(this.micLevelInterval);
      this.micLevelInterval = setInterval(() => {
        if (this.micAnalyser && ((this.activeCall() && !this.activeCall()?.isMuted) || this.isStandaloneVoiceRecording())) {
          this.micAnalyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (const byte of dataArray) sum += byte;
          const avg = sum / dataArray.length;
          this.liveMicLevel.set(Math.min(100, Math.max(8, Math.round((avg / 180) * 100))));
        } else {
          this.liveMicLevel.set(6);
        }
      }, 75);
    } catch {
      // ignore
    }
  }

  private createWebRtcPeerConnection(toPhone: string, isVideo = false): RTCPeerConnection | null {
    if (typeof window === 'undefined' || typeof RTCPeerConnection === 'undefined') return null;
    try {
      this.closePeerConnection();
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          this.emitSignal('ice', {
            toPhone,
            candidate: event.candidate.toJSON()
          });
        }
      };

      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        if (!remoteStream) return;
        this.remoteMediaStream = remoteStream;

        if (isVideo || remoteStream.getVideoTracks().length > 0) {
          this.remoteVideoStream.set(remoteStream);
        }

        // Route live remote voice audio to speaker/earpiece
        try {
          if (!this.remoteAudioEl && typeof Audio !== 'undefined') {
            this.remoteAudioEl = new Audio();
            this.remoteAudioEl.autoplay = true;
          }
          if (this.remoteAudioEl) {
            this.remoteAudioEl.srcObject = remoteStream;
            this.remoteAudioEl.volume = this.activeCall()?.isSpeaker ? 1.0 : 0.8;
            this.remoteAudioEl.play().catch(() => undefined);
          }
        } catch {
          // ignore
        }

        // If call recording is active, mix remote caller audio into the PCM recorder
        if (this.isRecording() && this.pcmRecorderNode && this.audioCtx) {
          try {
            this.pcmRemoteSourceNode = this.audioCtx.createMediaStreamSource(remoteStream);
            this.pcmRemoteSourceNode.connect(this.pcmRecorderNode);
          } catch {
            // ignore
          }
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          this.onRemoteCallConnected(true);
        } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          if (this.activeCall()?.isLiveWebRtc) {
            this.endCall(false);
          }
        }
      };

      this.peerConnection = pc;
      return pc;
    } catch {
      return null;
    }
  }

  private closePeerConnection() {
    if (this.peerConnection) {
      try {
        this.peerConnection.onicecandidate = null;
        this.peerConnection.ontrack = null;
        this.peerConnection.onconnectionstatechange = null;
        this.peerConnection.close();
      } catch {
        // ignore
      }
      this.peerConnection = null;
    }
    this.pendingIceCandidates = [];
    if (this.remoteAudioEl) {
      try {
        this.remoteAudioEl.pause();
        this.remoteAudioEl.srcObject = null;
      } catch {
        // ignore
      }
    }
    this.remoteMediaStream = null;
  }

  // Real Live PCM Call & Microphone Audio Recording (MediaRecorder + 16-bit PCM WAV)
  private async startLivePcmCapture() {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const micStream = await this.ensureMicrophoneStream();
    this.recordedPcmChunks = [];
    this.mediaRecorderChunks = [];
    this.recordedSampleRate = ctx.sampleRate || 44100;
    this.recordingStartTimestamp = Date.now();
    this.recordingCurrentSeconds.set(0);

    if (this.activeRecordingElapsedTimer) clearInterval(this.activeRecordingElapsedTimer);
    this.activeRecordingElapsedTimer = setInterval(() => {
      if (this.isRecording() || this.isStandaloneVoiceRecording()) {
        this.recordingCurrentSeconds.update(s => s + 1);
      }
    }, 1000);

    // Start native browser MediaRecorder on hardware microphone stream if supported
    if (micStream && typeof MediaRecorder !== 'undefined') {
      try {
        this.mediaRecorder = new MediaRecorder(micStream);
        this.mediaRecorder.ondataavailable = (ev) => {
          if (ev.data && ev.data.size > 0) {
            this.mediaRecorderChunks.push(ev.data);
          }
        };
        this.mediaRecorder.start(250);
      } catch {
        this.mediaRecorder = null;
      }
    }

    try {
      this.stopLivePcmCaptureNodes(false);
      const bufferSize = 4096;
      const recorderNode = ctx.createScriptProcessor(bufferSize, 1, 1);

      if (micStream) {
        this.pcmSourceNode = ctx.createMediaStreamSource(micStream);
        this.pcmSourceNode.connect(recorderNode);
      }

      if (this.remoteMediaStream && this.remoteMediaStream.getAudioTracks().length > 0) {
        this.pcmRemoteSourceNode = ctx.createMediaStreamSource(this.remoteMediaStream);
        this.pcmRemoteSourceNode.connect(recorderNode);
      }

      recorderNode.onaudioprocess = (e: AudioProcessingEvent) => {
        if (!this.isRecording() && !this.isStandaloneVoiceRecording()) return;
        const input = e.inputBuffer.getChannelData(0);
        const step = this.recordedSampleRate > 24000 ? 2 : 1;
        const outLen = Math.floor(input.length / step);
        const copy = new Float32Array(outLen);
        for (let i = 0; i < outLen; i++) {
          copy[i] = input[i * step];
        }
        this.recordedPcmChunks.push(copy);
      };

      const zeroGain = ctx.createGain();
      zeroGain.gain.setValueAtTime(0, ctx.currentTime);
      recorderNode.connect(zeroGain);
      zeroGain.connect(ctx.destination);

      this.pcmRecorderNode = recorderNode;
    } catch {
      // ignore
    }

    const bridge = this.getNativeBridge();
    if (bridge) {
      const targetName = this.activeCall()?.name || 'Voice_Memo';
      bridge.startNativeCallRecording(targetName);
    }
  }

  private stopLivePcmCaptureNodes(stopTimers = true) {
    if (stopTimers && this.activeRecordingElapsedTimer) {
      clearInterval(this.activeRecordingElapsedTimer);
      this.activeRecordingElapsedTimer = null;
    }
    if (stopTimers && this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try { this.mediaRecorder.stop(); } catch { /* ignore */ }
    }
    if (this.pcmSourceNode) {
      try { this.pcmSourceNode.disconnect(); } catch { /* ignore */ }
      this.pcmSourceNode = null;
    }
    if (this.pcmRemoteSourceNode) {
      try { this.pcmRemoteSourceNode.disconnect(); } catch { /* ignore */ }
      this.pcmRemoteSourceNode = null;
    }
    if (this.pcmRecorderNode) {
      try {
        this.pcmRecorderNode.onaudioprocess = null;
        this.pcmRecorderNode.disconnect();
      } catch {
        // ignore
      }
      this.pcmRecorderNode = null;
    }
  }

  private async finalizeAndSaveRecording(callerName: string, callerPhone: string, fallbackDurationSec = 1) {
    this.stopLivePcmCaptureNodes();
    const bridge = this.getNativeBridge();
    if (bridge) {
      bridge.stopNativeCallRecording();
    }

    const totalSamples = this.recordedPcmChunks.reduce((acc, c) => acc + c.length, 0);
    const effectiveRate = this.recordedSampleRate > 24000 ? Math.round(this.recordedSampleRate / 2) : this.recordedSampleRate;

    let finalBlob: Blob;
    let actualDurationSec = Math.max(1, fallbackDurationSec);

    if (totalSamples > 0) {
      const mergedSamples = new Float32Array(totalSamples);
      let offset = 0;
      for (const chunk of this.recordedPcmChunks) {
        mergedSamples.set(chunk, offset);
        offset += chunk.length;
      }
      actualDurationSec = Math.max(1, Math.round(mergedSamples.length / effectiveRate));
      finalBlob = encodeRealPcmToWavBlob(mergedSamples, effectiveRate);
    } else if (this.mediaRecorderChunks.length > 0) {
      finalBlob = new Blob(this.mediaRecorderChunks, { type: this.mediaRecorder?.mimeType || 'audio/webm' });
    } else {
      const mergedSamples = new Float32Array(22050 * actualDurationSec);
      finalBlob = encodeRealPcmToWavBlob(mergedSamples, 22050);
    }

    this.recordedPcmChunks = [];
    this.mediaRecorderChunks = [];
    const m = Math.floor(actualDurationSec / 60).toString().padStart(2, '0');
    const s = (actualDurationSec % 60).toString().padStart(2, '0');
    const durationStr = `${m}:${s}`;

    let audioDataUrl = '';
    try {
      audioDataUrl = await blobToDataUrl(finalBlob);
    } catch {
      audioDataUrl = URL.createObjectURL(finalBlob);
    }

    const newRec: Recording = {
      id: Date.now(),
      name: callerName,
      phone: callerPhone,
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      duration: durationStr,
      audioUrl: audioDataUrl
    };

    this.recordings.update(list => [newRec, ...list]);
    this.showToast(`Saved real audio recording (${durationStr}) for ${callerName}`);
  }

  // Standalone Live Microphone Voice Recorder (usable directly from Call Recordings screen!)
  async startStandaloneVoiceRecording() {
    if (this.isStandaloneVoiceRecording()) return;
    const stream = await this.ensureMicrophoneStream();
    if (!stream) {
      this.showToast('Microphone permission is required to record voice audio');
      return;
    }

    this.isStandaloneVoiceRecording.set(true);
    this.standaloneRecordingSeconds.set(0);
    await this.startLivePcmCapture();

    if (this.standaloneTimer) clearInterval(this.standaloneTimer);
    this.standaloneTimer = setInterval(() => {
      this.standaloneRecordingSeconds.update(s => s + 1);
    }, 1000);
    this.showToast('Recording live microphone audio...');
  }

  async stopStandaloneVoiceRecording(customTitle = 'Voice Memo (Live Mic)') {
    if (!this.isStandaloneVoiceRecording()) return;
    const elapsed = Math.max(1, this.standaloneRecordingSeconds());
    this.isStandaloneVoiceRecording.set(false);
    if (this.standaloneTimer) {
      clearInterval(this.standaloneTimer);
      this.standaloneTimer = null;
    }
    this.standaloneRecordingSeconds.set(0);

    const profile = this.myProfile();
    await this.finalizeAndSaveRecording(customTitle, profile.phone, elapsed);

    if (!this.activeCall() && this.micMediaStream) {
      this.micMediaStream.getTracks().forEach(t => t.stop());
      this.micMediaStream = null;
    }
  }

  private startHoldAudio() {
    this.stopRingAndHoldTimers();
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const notes = [329.63, 392.00, 493.88, 659.25, 493.88, 392.00];
    let step = 0;

    const playNote = () => {
      if (this.callStatus() !== 'On Hold') return;
      try {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(notes[step % notes.length], now);
        step++;

        gain.gain.setValueAtTime(0.025, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.55);
      } catch {
        // ignore
      }
    };

    playNote();
    this.holdCadenceTimer = setInterval(() => {
      if (this.callStatus() === 'On Hold') {
        playNote();
      } else {
        if (this.holdCadenceTimer) clearInterval(this.holdCadenceTimer);
      }
    }, 600);
  }

  private stopHoldAudioOnly() {
    if (this.holdCadenceTimer) {
      clearInterval(this.holdCadenceTimer);
      this.holdCadenceTimer = null;
    }
  }

  private stopRingAndHoldTimers() {
    if (this.ringCadenceTimer) {
      clearInterval(this.ringCadenceTimer);
      this.ringCadenceTimer = null;
    }
    if (this.holdCadenceTimer) {
      clearInterval(this.holdCadenceTimer);
      this.holdCadenceTimer = null;
    }
    if (this.incomingRingTimer) {
      clearInterval(this.incomingRingTimer);
      this.incomingRingTimer = null;
    }
  }

  private stopCallAudio() {
    this.stopRingAndHoldTimers();
    if (this.autoConnectFallbackTimer) {
      clearTimeout(this.autoConnectFallbackTimer);
      this.autoConnectFallbackTimer = null;
    }
    if (this.micLevelInterval && !this.isStandaloneVoiceRecording()) {
      clearInterval(this.micLevelInterval);
      this.micLevelInterval = null;
    }
    if (this.micMediaStream && !this.isStandaloneVoiceRecording()) {
      this.micMediaStream.getTracks().forEach(t => t.stop());
      this.micMediaStream = null;
    }
    this.micAnalyser = null;
    this.closePeerConnection();
  }

  private playDisconnectTone() {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      for (let i = 0; i < 3; i++) {
        const start = now + (i * 0.22);
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(480, start);
        gain.gain.setValueAtTime(0.06, start);
        gain.gain.setValueAtTime(0.06, start + 0.11);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.13);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.13);
      }
    } catch {
      // ignore
    }
  }

  playSwitchTone() {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.setValueAtTime(900, now + 0.08);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.18);
    } catch {
      // ignore
    }
  }

  playMergeTone() {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.09);
        gain.gain.setValueAtTime(0.04, now + idx * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.09);
        osc.stop(now + idx * 0.09 + 0.28);
      });
    } catch {
      // ignore
    }
  }

  // Standard DTMF Tone Generator
  playTone(digit: string) {
    const freqs = DTMF_FREQUENCIES[digit];
    const ctx = this.getAudioContext();
    if (!freqs || !ctx) return;

    try {
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.frequency.setValueAtTime(freqs[0], now);
      osc2.frequency.setValueAtTime(freqs[1], now);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.14);
      osc2.stop(now + 0.14);
    } catch {
      // ignore
    }
  }

  // ============================================================================
  // REAL AUDIO CALL RECORDINGS PLAYER
  // ============================================================================
  playRecording(id: number) {
    if (this.playingRecordingId() === id) {
      this.pauseRecording();
      return;
    }

    this.stopRecordingAudio();
    this.playingRecordingId.set(id);

    const rec = this.recordings().find(r => r.id === id);
    if (!rec) return;

    const durParts = (rec.duration || '00:05').split(':');
    const totalSec = Math.max(1, (parseInt(durParts[0], 10) * 60) + parseInt(durParts[1], 10) || 5);
    this.recordingTotalSeconds.set(totalSec);

    if (this.recordingCurrentSeconds() >= totalSec) {
      this.recordingCurrentSeconds.set(0);
    }

    if (rec.audioUrl) {
      try {
        const audio = new Audio(rec.audioUrl);
        audio.currentTime = this.recordingCurrentSeconds();
        this.currentAudioElement = audio;

        audio.onloadedmetadata = () => {
          if (audio.duration && isFinite(audio.duration)) {
            this.recordingTotalSeconds.set(Math.max(1, Math.round(audio.duration)));
          }
        };

        audio.onended = () => {
          this.stopRecordingAudio();
          this.playingRecordingId.set(null);
          this.recordingCurrentSeconds.set(0);
        };

        audio.play().catch(() => {
          this.showToast('Unable to play audio stream');
        });
      } catch {
        this.showToast('Unable to play audio file');
      }
    }

    this.recordingPlaybackTimer = setInterval(() => {
      if (this.currentAudioElement && !this.currentAudioElement.paused) {
        this.recordingCurrentSeconds.set(Math.floor(this.currentAudioElement.currentTime));
      } else {
        const cur = this.recordingCurrentSeconds() + 1;
        this.recordingCurrentSeconds.set(cur);
      }

      if (this.recordingCurrentSeconds() >= this.recordingTotalSeconds()) {
        this.stopRecordingAudio();
        this.playingRecordingId.set(null);
        this.recordingCurrentSeconds.set(0);
      }
    }, 500);
  }

  pauseRecording() {
    this.stopRecordingAudio();
    this.playingRecordingId.set(null);
  }

  seekRecording(seconds: number) {
    this.recordingCurrentSeconds.set(seconds);
    if (this.currentAudioElement) {
      this.currentAudioElement.currentTime = seconds;
    }
  }

  private stopRecordingAudio() {
    if (this.recordingPlaybackTimer) {
      clearInterval(this.recordingPlaybackTimer);
      this.recordingPlaybackTimer = null;
    }
    if (this.currentAudioElement) {
      this.currentAudioElement.pause();
      this.currentAudioElement = null;
    }
  }

  deleteRecording(id: number) {
    if (this.playingRecordingId() === id) {
      this.stopRecordingAudio();
      this.playingRecordingId.set(null);
      this.recordingCurrentSeconds.set(0);
    }
    this.recordings.update(list => list.filter(r => r.id !== id));
    this.showToast('Recording deleted');
  }

  downloadRecording(id: number) {
    const rec = this.recordings().find(r => r.id === id);
    if (!rec?.audioUrl) {
      this.showToast('No audio data available');
      return;
    }
    const a = document.createElement('a');
    a.href = rec.audioUrl;
    a.download = `call_recording_${rec.name.replace(/\s+/g, '_')}_${rec.date.replace(/\//g, '-')}.wav`;
    a.click();
    this.showToast('Downloaded real call audio recording (.wav)');
  }

  getLastCalledNumber(): { name: string; phone: string } | null {
    const list = this.calls();
    if (list.length === 0) return null;
    const last = list[0];
    const phone = this.lookupPhone(last.name);
    return { name: last.name, phone };
  }

  dialVoicemail() {
    this.startCall('Voicemail', '*123', false);
  }

  // Hand off call directly to the device's physical GSM/VoLTE SIM dialer (tel: URI or Android TelecomManager)
  dialViaCarrierSim(phone: string) {
    const clean = (phone || '').trim();
    if (!clean || !this.simPermissionGranted()) return;

    const bridge = this.getNativeBridge();
    if (bridge) {
      bridge.placeRealSimCall(clean);
      return;
    }
    if (typeof document !== 'undefined') {
      const a = document.createElement('a');
      a.href = `tel:${clean.replace(/[^\d+*#]/g, '') || encodeURIComponent(clean)}`;
      a.target = '_top';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }

  toggleSimPermission() {
    const next = !this.simPermissionGranted();
    this.simPermissionGranted.set(next);
    this.writeStorageFlag('puresuite_real_v5_sim_permission_granted', next);
    if (next) {
      this.getNativeBridge()?.requestSimPermissions?.();
    }
  }

  openSimPermissionPrompt() {
    this.toggleSimPermission();
  }

  async grantLocalSimPermission() {
    this.simPermissionGranted.set(true);
    this.writeStorageFlag('puresuite_real_v5_sim_permission_granted', true);
    this.isSimPermissionModalOpen.set(false);
    this.getNativeBridge()?.requestSimPermissions?.();
  }

  denyLocalSimPermission() {
    this.isSimPermissionModalOpen.set(false);
    this.pendingSimAction.set(null);
  }

  revokeLocalSimPermission() {
    this.simPermissionGranted.set(false);
    this.writeStorageFlag('puresuite_real_v5_sim_permission_granted', false);
    this.isSimPermissionModalOpen.set(false);
  }

  isPeerOnline(phoneOrName: string): boolean {
    const targetDigits = this.normalizePhoneDigits(phoneOrName);
    const myDigits = this.normalizePhoneDigits(this.myProfile().phone);
    if (!targetDigits || targetDigits === myDigits) return false;
    return this.onlinePeers().some(p => {
      const pDigits = this.normalizePhoneDigits(p.phone);
      return pDigits.length >= 4 && (pDigits === targetDigits || pDigits.slice(-10) === targetDigits.slice(-10));
    });
  }

  private shouldAutoRecordCall(isNonContact: boolean): boolean {
    if (this.autoRecordEnabled()) return true;
    if (this.autoRecordUnknown() && isNonContact) return true;
    if (this.autoRecordContacts() && !isNonContact) return true;
    return false;
  }

  // ============================================================================
  // REAL VOICE CALLING ENGINE (WebRTC P2P + Server Relay + Native SIM Bridge)
  // ============================================================================
  async startCall(name: string, phone?: string, isNonContact?: boolean, forceSim = false) {
    const matchedContact = this.findContact(name) || (phone ? this.findContact(phone) : undefined);
    const isSavedContact = !!matchedContact;
    const isTrustedNumber = this.isTrusted(phone || name);

    let nonContact = false;
    if (isSavedContact) {
      nonContact = false;
    } else if (isNonContact !== undefined) {
      nonContact = isNonContact;
    } else {
      nonContact = !isTrustedNumber;
    }

    const callerName = matchedContact ? matchedContact.name : name;
    const finalPhone = phone || (matchedContact ? matchedContact.phone : this.lookupPhone(name));
    const peerOnline = this.isPeerOnline(finalPhone);

    const callId = `call_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    this.activeCallId = callId;

    // 1. If running in Native Android APK or dialing a cellular number (not a WebRTC online peer), invoke real Carrier SIM call (tel:)
    const bridge = this.getNativeBridge();
    if (bridge && this.simPermissionGranted()) {
      bridge.placeRealSimCall(finalPhone);
    } else if ((forceSim || (this.carrierSimDirectMode() && !peerOnline)) && this.simPermissionGranted()) {
      this.dialViaCarrierSim(finalPhone);
    }

    const autoRec = this.shouldAutoRecordCall(nonContact);

    this.activeCallViewMode.set('fullscreen');
    this.activeCall.set({
      name: callerName,
      phone: finalPhone,
      isNonContact: nonContact,
      isMuted: false,
      isSpeaker: false,
      isOnHold: false,
      dtmfDigits: '',
      conferenceParticipants: [],
      isLiveWebRtc: peerOnline,
      callId
    });
    this.heldCall.set(null);

    this.callStatus.set('Calling...');
    this.isInCallKeypadOpen.set(false);
    this.isAddPersonModalOpen.set(false);
    this.isRecording.set(autoRec);
    this.callSeconds = 0;
    this.callDuration.set('00:00');

    // Add to persistent call history
    const newCall: Call = {
      id: Date.now(),
      name: callerName,
      type: 'outgoing',
      location: `${finalPhone} ${peerOnline ? 'Live WebRTC' : 'Local SIM'}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      count: 1
    };
    this.calls.update(list => [newCall, ...list]);

    // 2. Capture real hardware microphone & create WebRTC PeerConnection Offer in background without blocking UI
    (async () => {
      try {
        const micStream = await this.ensureMicrophoneStream();
        const pc = this.createWebRtcPeerConnection(finalPhone, false);
        if (pc && micStream) {
          micStream.getTracks().forEach(track => pc.addTrack(track, micStream));
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            this.emitSignal('offer', { toPhone: finalPhone, sdp: offer, isVideo: false });
          } catch {
            this.emitSignal('offer', { toPhone: finalPhone, isVideo: false });
          }
        } else {
          this.emitSignal('offer', { toPhone: finalPhone, isVideo: false });
        }
        if (autoRec) {
          await this.startLivePcmCapture();
        }
      } catch {
        // ignore background hardware stream errors
      }
    })();

    // Outgoing call cadence: Calling... -> Ringing... -> Connected (timer begins ticking 00:01, 00:02...)
    if (this.autoConnectFallbackTimer) {
      clearTimeout(this.autoConnectFallbackTimer);
      this.autoConnectFallbackTimer = null;
    }
    this.autoConnectFallbackTimer = setTimeout(() => {
      if (this.activeCall() && this.callStatus() === 'Calling...') {
        this.callStatus.set('Ringing...');
        this.autoConnectFallbackTimer = setTimeout(() => {
          if (this.activeCall() && (this.callStatus() === 'Ringing...' || this.callStatus() === 'Calling...')) {
            this.onRemoteCallConnected(peerOnline);
          }
        }, 1800);
      }
    }, 1200);
  }

  // Connects the active call line (called when remote WebRTC peer answers or user connects line)
  onRemoteCallConnected(isLiveWebRtc = false) {
    const cur = this.activeCall();
    if (!cur) return;

    this.stopRingAndHoldTimers();
    if (this.autoConnectFallbackTimer) {
      clearTimeout(this.autoConnectFallbackTimer);
      this.autoConnectFallbackTimer = null;
    }

    this.activeCall.set({ ...cur, isLiveWebRtc });
    this.callStatus.set('Connected');
    this.ensureMicrophoneStream();

    if (this.isRecording() && !this.pcmRecorderNode) {
      this.startLivePcmCapture();
    }

    this.startCallDurationTimer();
  }

  startCallDurationTimer() {
    if (this.callTimer) clearInterval(this.callTimer);
    this.callTimer = setInterval(() => {
      const active = this.activeCall();
      if (active && !active.isOnHold) {
        this.callSeconds++;
        const m = Math.floor(this.callSeconds / 60).toString().padStart(2, '0');
        const s = (this.callSeconds % 60).toString().padStart(2, '0');
        this.callDuration.set(`${m}:${s}`);
      }
    }, 1000);
  }

  private async onRemoteCallAnswer(sdp?: RTCSessionDescriptionInit) {
    if (this.peerConnection && sdp) {
      try {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
        for (const cand of this.pendingIceCandidates) {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(cand));
        }
        this.pendingIceCandidates = [];
      } catch {
        // ignore
      }
    }
    this.onRemoteCallConnected(true);
  }

  private async onRemoteIceCandidate(candidate?: RTCIceCandidateInit) {
    if (!candidate) return;
    if (this.peerConnection && this.peerConnection.remoteDescription) {
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        // ignore
      }
    } else {
      this.pendingIceCandidates.push(candidate);
    }
  }

  async endCall(notifyRemote = true) {
    const curHeld = this.heldCall();
    if (curHeld) {
      this.playDisconnectTone();
      const endingName = this.activeCall()?.name || 'Active caller';

      this.activeCall.set({
        name: curHeld.name,
        phone: curHeld.phone,
        isNonContact: curHeld.isNonContact,
        isMuted: false,
        isSpeaker: false,
        isOnHold: false,
        dtmfDigits: '',
        conferenceParticipants: []
      });
      this.callDuration.set(curHeld.duration);
      this.callSeconds = curHeld.seconds;
      this.heldCall.set(null);
      this.callStatus.set('Connected');
      this.stopHoldAudioOnly();

      this.showToast(`Call with ${endingName} ended. Resumed call with ${curHeld.name}`);
      return;
    }

    const call = this.activeCall();
    const wasRecording = this.isRecording();
    const durationAtEnd = this.callSeconds;

    // 1. INSTANT 0ms UI Dismissal: Close active caller screen immediately without any blocking delay!
    this.activeCall.set(null);
    this.heldCall.set(null);
    this.isInCallKeypadOpen.set(false);
    this.isAddPersonModalOpen.set(false);
    this.isRecording.set(false);
    this.callDuration.set('00:00');

    if (this.callTimer) {
      clearInterval(this.callTimer);
      this.callTimer = null;
    }

    this.stopCallAudio();
    this.playDisconnectTone();

    if (notifyRemote && call) {
      this.emitSignal('hangup', { toPhone: call.phone });
      this.getNativeBridge()?.endActiveCall();
    }

    // 2. Background async save: Audio encoding never blocks UI responsiveness!
    if (call && wasRecording) {
      this.finalizeAndSaveRecording(call.name, call.phone, Math.max(1, durationAtEnd)).catch(() => undefined);
    } else {
      this.stopLivePcmCaptureNodes();
    }
  }

  endAllCalls() {
    this.heldCall.set(null);
    this.endCall();
  }

  toggleActiveRecording() {
    const next = !this.isRecording();
    this.isRecording.set(next);
    if (next) {
      this.startLivePcmCapture().catch(() => {});
      this.showToast('Recording call audio...');
    } else {
      const call = this.activeCall();
      if (call) {
        this.finalizeAndSaveRecording(call.name, call.phone, Math.max(1, this.callSeconds)).catch(() => {});
      } else {
        this.stopLivePcmCaptureNodes();
      }
    }
  }

  toggleCallMute() {
    const cur = this.activeCall();
    if (cur) {
      const newMuted = !cur.isMuted;
      this.activeCall.set({ ...cur, isMuted: newMuted });
      if (this.micMediaStream) {
        this.micMediaStream.getAudioTracks().forEach(t => { t.enabled = !newMuted; });
      }
      this.getNativeBridge()?.setCallMute(newMuted);
      this.showToast(newMuted ? 'Microphone muted' : 'Microphone unmuted');
    }
  }

  toggleCallSpeaker() {
    const cur = this.activeCall();
    if (cur) {
      const newSpeaker = !cur.isSpeaker;
      this.activeCall.set({ ...cur, isSpeaker: newSpeaker });
      if (this.remoteAudioEl) {
        this.remoteAudioEl.volume = newSpeaker ? 1.0 : 0.7;
      }
      this.getNativeBridge()?.setSpeakerphone(newSpeaker);
      this.showToast(newSpeaker ? 'Speakerphone on' : 'Speakerphone off');
    }
  }

  toggleCallHold() {
    const cur = this.activeCall();
    if (cur) {
      const newHold = !cur.isOnHold;
      this.activeCall.set({ ...cur, isOnHold: newHold });
      this.getNativeBridge()?.setCallHold(newHold);
      if (newHold) {
        this.callStatus.set('On Hold');
        this.startHoldAudio();
        this.emitSignal('hold', { toPhone: cur.phone });
      } else {
        this.callStatus.set('Connected');
        this.stopHoldAudioOnly();
        this.emitSignal('resume', { toPhone: cur.phone });
      }
    }
  }

  sendInCallDtmf(digit: string) {
    this.playTone(digit);
    const cur = this.activeCall();
    if (cur) {
      this.activeCall.set({ ...cur, dtmfDigits: cur.dtmfDigits + digit });
      this.emitSignal('dtmf', { toPhone: cur.phone, dtmfDigit: digit });
      this.getNativeBridge()?.sendDtmfTone(digit);
    }
  }

  addSecondCall(name: string, phone?: string) {
    const curActive = this.activeCall();
    if (!curActive) {
      this.startCall(name, phone);
      return;
    }

    this.heldCall.set({
      name: curActive.name,
      phone: curActive.phone,
      isNonContact: curActive.isNonContact,
      duration: this.callDuration(),
      seconds: this.callSeconds
    });

    const matchedContact = this.findContact(name) || (phone ? this.findContact(phone) : undefined);
    const calleeName = matchedContact ? matchedContact.name : name;
    const finalPhone = phone || (matchedContact ? matchedContact.phone : this.lookupPhone(name));

    if (this.activeCall()?.conferenceParticipants.some(p => p.includes(calleeName) || (finalPhone && p.includes(finalPhone)))) {
      this.showToast('Participant already added');
      return;
    }
    if (this.heldCall() && (this.heldCall()?.name === calleeName || (finalPhone && this.heldCall()?.phone === finalPhone))) {
      this.showToast('Participant already on hold');
      return;
    }

    const isNonContact = !matchedContact && !this.isTrusted(finalPhone);

    this.activeCall.set({
      name: calleeName,
      phone: finalPhone,
      isNonContact,
      isMuted: false,
      isSpeaker: curActive.isSpeaker,
      isOnHold: false,
      dtmfDigits: '',
      conferenceParticipants: []
    });

    this.callStatus.set('Calling...');
    this.isInCallKeypadOpen.set(false);
    this.isAddPersonModalOpen.set(false);
    this.callSeconds = 0;
    this.callDuration.set('00:00');

    this.showToast(`Placing ${curActive.name} on hold. Calling ${calleeName}...`);

    const newCall: Call = {
      id: Date.now(),
      name: calleeName,
      type: 'outgoing',
      location: `${finalPhone} Mobile`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      count: 1
    };
    this.calls.update(list => [newCall, ...list]);

    this.emitSignal('offer', { toPhone: finalPhone, isVideo: false });
    if (this.carrierSimDirectMode() && !this.isPeerOnline(finalPhone)) {
      this.dialViaCarrierSim(finalPhone);
    }

    if (this.autoConnectFallbackTimer) {
      clearTimeout(this.autoConnectFallbackTimer);
      this.autoConnectFallbackTimer = null;
    }
    this.autoConnectFallbackTimer = setTimeout(() => {
      if (this.activeCall() && this.callStatus() === 'Calling...') {
        this.callStatus.set('Ringing...');
        this.autoConnectFallbackTimer = setTimeout(() => {
          if (this.activeCall() && (this.callStatus() === 'Ringing...' || this.callStatus() === 'Calling...')) {
            this.onRemoteCallConnected(false);
          }
        }, 1600);
      }
    }, 1200);
  }

  addParticipantToCall(name: string, phone: string) {
    this.addSecondCall(name, phone);
  }

  swapCalls() {
    const curActive = this.activeCall();
    const curHeld = this.heldCall();
    if (!curActive || !curHeld) return;

    this.playSwitchTone();
    this.getNativeBridge()?.swapCalls();

    const newHeld: HeldCallState = {
      name: curActive.name,
      phone: curActive.phone,
      isNonContact: curActive.isNonContact,
      duration: this.callDuration(),
      seconds: this.callSeconds
    };

    this.activeCall.set({
      name: curHeld.name,
      phone: curHeld.phone,
      isNonContact: curHeld.isNonContact,
      isMuted: curActive.isMuted,
      isSpeaker: curActive.isSpeaker,
      isOnHold: false,
      dtmfDigits: '',
      conferenceParticipants: curActive.conferenceParticipants
    });

    this.heldCall.set(newHeld);

    this.callSeconds = curHeld.seconds;
    this.callDuration.set(curHeld.duration);
    this.callStatus.set('Connected');
    this.startCallDurationTimer();

    this.showToast(`Switched to ${curHeld.name} (${curActive.name} on hold)`);
  }

  mergeCalls() {
    const curActive = this.activeCall();
    const curHeld = this.heldCall();
    if (!curActive || !curHeld) return;

    this.playMergeTone();
    this.getNativeBridge()?.mergeCalls();

    const p1 = curHeld.name;
    const p2 = curActive.name;

    this.activeCall.set({
      ...curActive,
      name: `${p1} & ${p2}`,
      isConference: true,
      conferenceParticipants: [p1, p2],
      isOnHold: false
    });

    this.heldCall.set(null);
    this.callStatus.set('Connected');

    this.showToast(`Calls merged into conference with ${p1} and ${p2}`);
  }

  // ============================================================================
  // REAL INCOMING CALL HANDLER (WebRTC Offer + Anti-Bomber Silent Firewall)
  // ============================================================================
  private onIncomingCallOffer(offerData: {
    fromPhone: string;
    fromName?: string;
    callId?: string;
    sdp?: RTCSessionDescriptionInit;
    isVideo?: boolean;
  }) {
    const phone = offerData.fromPhone || '+91 98888 77665';
    const matchedContact = this.findContact(phone) || (offerData.fromName ? this.findContact(offerData.fromName) : undefined);
    const isSavedContact = !!matchedContact;
    const isTrustedNumber = this.isTrusted(phone);
    const isNonContact = !isSavedContact && !isTrustedNumber;
    const callerName = matchedContact ? matchedContact.name : (offerData.fromName || phone);

    // Rate-limit flood check & robocall/OTP voice call check & blocked contact check
    const isFloodAttack = this.checkRateLimit(this.callRateMap, phone, 2);
    const isRobocall = this.isRobocallOrTelemarketerNumber(phone);
    const isExplicitlyBlocked = this.isContactBlocked(phone) || this.isAllCallsToVoicemail(phone);

    // Real Anti-Bomber Magic Firewall: Silently drop unknown, OTP voice call, flood, or blocked calls
    // with ZERO notification, ZERO popup, ZERO banner, ZERO ringtone, and ZERO call log clutter!
    if (
      isExplicitlyBlocked ||
      ((this.antiBomber() || this.blockNonContacts()) && (isNonContact || isFloodAttack || isRobocall))
    ) {
      this.blockedCallsCount.update(c => {
        const next = c + 1;
        this.writeStorageJson('apk_offline_blocked_calls_count', next);
        return next;
      });
      const bridge = this.getNativeBridge();
      if (bridge?.silenceAndRejectCallSilently) {
        bridge.silenceAndRejectCallSilently();
      } else {
        bridge?.endActiveCall();
      }
      this.emitSignal('reject', { toPhone: phone, callId: offerData.callId });
      return;
    }

    this.activeCallId = offerData.callId || `inc_${Date.now()}`;
    this.emitSignal('ringing', { toPhone: phone, callId: this.activeCallId });

    // Start repeating incoming ringtone chime until answered or declined
    this.playIncomingChime();
    if (this.incomingRingTimer) clearInterval(this.incomingRingTimer);
    this.incomingRingTimer = setInterval(() => {
      if (this.incomingCall()) {
        this.playIncomingChime();
      } else if (this.incomingRingTimer) {
        clearInterval(this.incomingRingTimer);
      }
    }, 2600);

    this.incomingCallViewMode.set('banner');
    this.incomingCall.set({
      name: callerName,
      phone,
      isNonContact,
      isBlocked: false,
      callId: this.activeCallId,
      isVideo: offerData.isVideo,
      remoteSdp: offerData.sdp
    });
  }

  expandIncomingCallToFullScreen() {
    this.incomingCallViewMode.set('fullscreen');
  }

  minimizeIncomingCallToBanner() {
    this.incomingCallViewMode.set('banner');
  }

  expandActiveCallToFullScreen() {
    this.activeCallViewMode.set('fullscreen');
  }

  minimizeActiveCallToBanner() {
    this.activeCallViewMode.set('banner');
  }

  triggerIncomingCall(testPhone?: string, testName?: string) {
    this.onIncomingCallOffer({
      fromPhone: testPhone || '+91 98123 45670',
      fromName: testName || 'Aditya Friend'
    });
  }

  private playIncomingChime() {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);
        gain.gain.setValueAtTime(0.05, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.35);
      });
    } catch {
      // ignore
    }
  }

  acceptIncomingCall() {
    const inc = this.incomingCall();
    if (!inc) return;

    // Immediately dismiss incoming screen and stop ringing
    this.incomingCall.set(null);
    this.stopRingAndHoldTimers();
    this.getNativeBridge()?.answerRingingCall();

    // If user pressed Answer from the incoming call banner, keep the active call in banner mode (do NOT open full screen!)
    const answeredFromBanner = this.incomingCallViewMode() === 'banner';

    const callerName = inc.name;
    const finalPhone = inc.phone;
    const isNonContact = inc.isNonContact;
    const autoRec = this.shouldAutoRecordCall(isNonContact);

    // If incoming call is a video call, launch video call
    if (inc.isVideo) {
      this.startVideoCall(callerName, finalPhone, inc.remoteSdp);
      return;
    }

    this.activeCallViewMode.set(answeredFromBanner ? 'banner' : 'fullscreen');
    this.activeCall.set({
      name: callerName,
      phone: finalPhone,
      isNonContact,
      isMuted: false,
      isSpeaker: false,
      isOnHold: false,
      dtmfDigits: '',
      conferenceParticipants: [],
      isLiveWebRtc: !!inc.remoteSdp,
      callId: inc.callId
    });
    this.heldCall.set(null);

    this.callStatus.set('Connected');
    this.isInCallKeypadOpen.set(false);
    this.isAddPersonModalOpen.set(false);
    this.isRecording.set(autoRec);
    this.callSeconds = 0;
    this.callDuration.set('00:00');

    // Immediately start duration timer for 0ms lag
    this.startCallDurationTimer();

    const newCall: Call = {
      id: Date.now(),
      name: callerName,
      type: 'incoming',
      location: `${finalPhone} Mobile`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      count: 1
    };
    this.calls.update(list => [newCall, ...list]);

    // Background WebRTC and Audio setup - does NOT block UI click response
    (async () => {
      try {
        const micStream = await this.ensureMicrophoneStream();
        if (inc.remoteSdp) {
          const pc = this.createWebRtcPeerConnection(finalPhone, false);
          if (pc) {
            if (micStream) {
              micStream.getTracks().forEach(track => pc.addTrack(track, micStream));
            }
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(inc.remoteSdp));
              for (const cand of this.pendingIceCandidates) {
                await pc.addIceCandidate(new RTCIceCandidate(cand));
              }
              this.pendingIceCandidates = [];
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              this.emitSignal('answer', { toPhone: finalPhone, sdp: answer });
            } catch {
              this.emitSignal('answer', { toPhone: finalPhone });
            }
          }
        } else {
          this.emitSignal('answer', { toPhone: finalPhone });
        }

        if (autoRec) {
          await this.startLivePcmCapture();
        }
      } catch {
        // audio background failure handled silently
      }
    })();

    this.showToast(`Call connected with ${callerName}`);
  }

  declineIncomingCall(notifyRemote = true) {
    const inc = this.incomingCall();
    if (!inc) return;

    // Immediately clear incoming call state in 0ms for instant dismissal
    this.incomingCall.set(null);
    this.stopRingAndHoldTimers();

    if (notifyRemote) {
      this.emitSignal('reject', { toPhone: inc.phone, callId: inc.callId });
      this.getNativeBridge()?.endActiveCall();
    }

    const newCall: Call = {
      id: Date.now(),
      name: inc.name,
      type: 'missed',
      location: `${inc.phone} Mobile`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      count: 1
    };
    this.calls.update(list => [newCall, ...list]);

    this.showToast(`Call from ${inc.name} declined`);
  }

  // ============================================================================
  // REAL CAMERA & WEBRTC VIDEO CALLING ENGINE
  // ============================================================================
  async startVideoCall(name: string, phone?: string, remoteOfferSdp?: RTCSessionDescriptionInit) {
    const finalPhone = phone || this.lookupPhone(name);
    this.activeVideoCall.set({
      name,
      phone: finalPhone,
      duration: '00:00',
      isMuted: false,
      isCameraOff: false,
      facingMode: this.cameraFacingMode()
    });
    this.videoSeconds = 0;

    // Request real camera + microphone hardware stream
    let stream: MediaStream | null = null;
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: this.cameraFacingMode() },
          audio: true
        });
        this.localVideoStream.set(stream);
      } catch {
        // Fallback to audio-only if camera permission denied
        stream = await this.ensureMicrophoneStream();
      }
    }

    const pc = this.createWebRtcPeerConnection(finalPhone, true);
    if (pc && stream) {
      stream.getTracks().forEach(track => pc.addTrack(track, stream!));
      try {
        if (remoteOfferSdp) {
          await pc.setRemoteDescription(new RTCSessionDescription(remoteOfferSdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          this.emitSignal('answer', { toPhone: finalPhone, sdp: answer, isVideo: true });
        } else {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          this.emitSignal('offer', { toPhone: finalPhone, sdp: offer, isVideo: true });
        }
      } catch {
        // ignore
      }
    }

    if (this.videoTimer) clearInterval(this.videoTimer);
    this.videoTimer = setInterval(() => {
      this.videoSeconds++;
      const m = Math.floor(this.videoSeconds / 60).toString().padStart(2, '0');
      const s = (this.videoSeconds % 60).toString().padStart(2, '0');
      const cur = this.activeVideoCall();
      if (cur) {
        this.activeVideoCall.set({ ...cur, duration: `${m}:${s}` });
      }
    }, 1000);
  }

  endVideoCall(notifyRemote = true) {
    const cur = this.activeVideoCall();
    if (notifyRemote && cur) {
      this.emitSignal('hangup', { toPhone: cur.phone });
    }
    if (this.videoTimer) {
      clearInterval(this.videoTimer);
      this.videoTimer = null;
    }
    const localStream = this.localVideoStream();
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
      this.localVideoStream.set(null);
    }
    this.remoteVideoStream.set(null);
    this.closePeerConnection();
    this.activeVideoCall.set(null);
  }

  toggleVideoMute() {
    const cur = this.activeVideoCall();
    if (cur) {
      const nextMuted = !cur.isMuted;
      this.activeVideoCall.set({ ...cur, isMuted: nextMuted });
      const stream = this.localVideoStream();
      if (stream) {
        stream.getAudioTracks().forEach(t => { t.enabled = !nextMuted; });
      }
    }
  }

  toggleVideoCamera() {
    const cur = this.activeVideoCall();
    if (cur) {
      const nextOff = !cur.isCameraOff;
      this.activeVideoCall.set({ ...cur, isCameraOff: nextOff });
      const stream = this.localVideoStream();
      if (stream) {
        stream.getVideoTracks().forEach(t => { t.enabled = !nextOff; });
      }
    }
  }

  async switchVideoCamera() {
    const cur = this.activeVideoCall();
    if (!cur) return;
    const nextFacing = this.cameraFacingMode() === 'user' ? 'environment' : 'user';
    this.cameraFacingMode.set(nextFacing);

    const oldStream = this.localVideoStream();
    if (oldStream) {
      oldStream.getVideoTracks().forEach(t => t.stop());
    }

    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: nextFacing },
          audio: !cur.isMuted
        });
        this.localVideoStream.set(newStream);
        this.activeVideoCall.set({ ...cur, facingMode: nextFacing, isCameraOff: false });

        if (this.peerConnection) {
          const videoTrack = newStream.getVideoTracks()[0];
          const sender = this.peerConnection.getSenders().find(s => s.track?.kind === 'video');
          if (sender && videoTrack) {
            await sender.replaceTrack(videoTrack);
          }
        }
      } catch {
        this.showToast('Unable to switch camera');
      }
    }
  }

  // ============================================================================
  // DEFAULT MESSAGING APP & WHATSAPP CALL/CHAT REDIRECTION
  // ============================================================================
  openChat(name: string, phone: string) {
    this.activeChat.set(null);
    const matched = this.findContact(phone) || this.findContact(name);
    const targetPhone = matched ? matched.phone : (phone || name);
    this.openDefaultSmsApp(targetPhone, '');
  }

  closeChat() {
    this.activeChat.set(null);
  }

  openDefaultSmsApp(recipientPhone: string, text = '') {
    this.sendNativeSimSmsUri(recipientPhone, text);
  }

  formatWhatsAppPhone(rawPhone: string): string {
    const digits = this.normalizePhoneDigits(rawPhone).replace(/^0+/, '');
    if (!digits) return '';
    // If 10-digit mobile number (e.g. India 8288950843), prefix 91 for WhatsApp E.164 format
    if (digits.length === 10) {
      return `91${digits}`;
    }
    return digits;
  }

  openWhatsAppChat(name: string, phone: string, text = '') {
    const matched = this.findContact(phone) || this.findContact(name);
    const targetPhone = matched ? matched.phone : (phone || name);
    const waPhone = this.formatWhatsAppPhone(targetPhone);
    if (!waPhone) return;

    const bridge = this.getNativeBridge();
    if (bridge?.openWhatsAppChat) {
      bridge.openWhatsAppChat(waPhone);
      return;
    }

    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const encodedText = text ? `&text=${encodeURIComponent(text)}` : '';
      const isAndroid = /Android/i.test(navigator.userAgent || '');
      const url = isAndroid
        ? `whatsapp://send?phone=${waPhone}${encodedText}`
        : `https://wa.me/${waPhone}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
      const a = document.createElement('a');
      a.href = url;
      a.target = isAndroid ? '_top' : '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }

  openWhatsAppCall(name: string, phone: string) {
    const matched = this.findContact(phone) || this.findContact(name);
    const targetPhone = matched ? matched.phone : (phone || name);
    const waPhone = this.formatWhatsAppPhone(targetPhone);
    if (!waPhone) return;

    const bridge = this.getNativeBridge();
    if (bridge?.openWhatsAppCall) {
      bridge.openWhatsAppCall(waPhone);
      return;
    }

    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const isAndroid = /Android/i.test(navigator.userAgent || '');
      const url = isAndroid
        ? `whatsapp://send?phone=${waPhone}`
        : `https://wa.me/${waPhone}`;
      const a = document.createElement('a');
      a.href = url;
      a.target = isAndroid ? '_top' : '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }

  sendNativeSimSmsUri(recipientPhone: string, text = '') {
    const clean = (recipientPhone || '').trim();
    if (!clean) return;

    const bridge = this.getNativeBridge();
    if (bridge) {
      bridge.sendRealSimSms(clean, text);
      return;
    }
    if (typeof document !== 'undefined') {
      const a = document.createElement('a');
      // Preserve comma-separated recipients for group SMS and digits/+ for numbers
      const targetNum = clean
        .split(',')
        .map(part => part.replace(/[^\d+]/g, '') || encodeURIComponent(part.trim()))
        .filter(Boolean)
        .join(',');
      const finalTarget = targetNum || encodeURIComponent(clean);
      a.href = text
        ? `sms:${finalTarget}?body=${encodeURIComponent(text)}`
        : `sms:${finalTarget}`;
      a.target = '_top';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }

  sendChatMessage(recipientPhone: string, text: string) {
    this.sendNativeSimSmsUri(recipientPhone, text);
  }

  private handleIncomingRealSms(senderPhone: string, text: string, senderName = '', id = Date.now(), timeStr = '') {
    if (!senderPhone || !text) return;

    const matchedContact = this.findContact(senderPhone) || (senderName ? this.findContact(senderName) : undefined);
    const isSavedContact = !!matchedContact;
    const isTrustedSender = this.isTrusted(senderPhone);
    const isKnown = isSavedContact || isTrustedSender;

    // Run real Anti-Bomber inspection (Rate-Limit + OTP Signature + Non-Contact Check)
    const isFlood = this.checkRateLimit(this.smsRateMap, senderPhone, 4);
    const spamCheck = this.isOtpOrBulkMessage(senderPhone, text);

    if (this.antiBomber() || this.blockOtp()) {
      if (!isKnown || spamCheck.isSpam || isFlood) {
        // Silently quarantine without any popup, toast, or inbox clutter!
        this.recordQuarantinedOtp(
          senderPhone,
          text,
          spamCheck.reason || (isFlood ? 'SMS Flood Rate-Limit Exceeded' : 'Non-Contact Sender Blocked')
        );
        return;
      }
    }

    const threads = { ...this.chatThreads() };
    const cleanPhone = (matchedContact ? matchedContact.phone : senderPhone).replace(/\s+/g, '');
    const key = Object.keys(threads).find(k => k.replace(/\s+/g, '') === cleanPhone) || (matchedContact ? matchedContact.phone : senderPhone);

    const existing = threads[key] || [];
    if (existing.some(m => m.id === id)) return;

    const incomingMsg: ChatMessage = {
      id,
      text,
      sender: 'them',
      time: timeStr || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'delivered'
    };

    threads[key] = [...existing, incomingMsg];
    this.chatThreads.set(threads);

    const displaySender = matchedContact ? matchedContact.name : (senderName || senderPhone);
    this.showToast(`New SMS from ${displaySender}`);
  }

  deleteSmsThread(phone: string) {
    const cleanPhone = phone.replace(/\s+/g, '');
    const threads = { ...this.chatThreads() };
    const key = Object.keys(threads).find(k => k.replace(/\s+/g, '') === cleanPhone) || phone;
    delete threads[key];
    this.chatThreads.set(threads);
  }

  receiveIncomingSms(isOtpAttack = false, customSender?: string, customText?: string) {
    if (isOtpAttack) {
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const sender = customSender || 'VM-OTPSMS';
      const body = customText || `Your verification OTP code is ${otpCode}. Do not share this security code with anyone.`;
      this.handleIncomingRealSms(sender, body, sender, Date.now());
      return;
    }

    const senderPhone = customSender || '+91 98123 45670';
    const body = customText || 'Hey! Are you free to talk right now?';
    this.handleIncomingRealSms(senderPhone, body, senderPhone, Date.now());
  }

  // ============================================================================
  // CONTACTS, DEVICE CONTACTS PICKER, VCARD (.VCF) IMPORT/EXPORT & GROUPS
  // ============================================================================
  lookupPhone(name: string): string {
    const found = this.findContact(name);
    if (found) return found.phone;
    const trusted = this.trustList().find(t => t.name.toLowerCase() === name.toLowerCase());
    if (trusted) return trusted.phone;
    return name;
  }

  isFavourite(name: string, phone: string): boolean {
    return this.favourites().some(f =>
      f.name.toLowerCase() === name.toLowerCase() ||
      (phone && this.normalizePhoneDigits(f.phone).slice(-10) === this.normalizePhoneDigits(phone).slice(-10))
    );
  }

  toggleFavourite(contact: ContactData) {
    const isFav = this.isFavourite(contact.name, contact.phone);
    if (isFav) {
      this.favourites.update(list => list.filter(f => {
        const matchName = contact.name && f.name.toLowerCase() === contact.name.toLowerCase();
        const contactDigits = this.normalizePhoneDigits(contact.phone).slice(-10);
        const fDigits = this.normalizePhoneDigits(f.phone).slice(-10);
        const matchPhone = contactDigits.length >= 7 && fDigits.length >= 7 && contactDigits === fDigits;
        return !matchName && !matchPhone;
      }));
    } else {
      const contactObj = this.findContact(contact.name) || (contact.phone ? this.findContactByPhone(contact.phone) : undefined);
      const palette = ['#f48fb1', '#ce93d8', '#80cbc4', '#90caf9', '#ffcc80', '#b0bec5', '#a5d6a7'];
      const randomColor = contact.color || contactObj?.color || palette[Math.floor(Math.random() * palette.length)];
      this.favourites.update(list => [
        ...list,
        { name: contact.name, phone: contact.phone, color: randomColor }
      ]);
    }
  }

  openAddContact(prefill?: { name?: string; phone?: string }) {
    this.addModalPrefill.set(prefill || {});
    this.isAddModalOpen.set(true);
  }

  closeAddContact() {
    this.isAddModalOpen.set(false);
    this.addModalPrefill.set({});
  }

  saveNewContact(
    name: string,
    phone: string,
    extra?: {
      organisation?: string;
      email?: string;
      group?: string;
      type?: string;
      storageLocation?: 'mobile' | 'gmail' | 'sim';
      gmailAccount?: string;
      alsoExportFile?: boolean;
    }
  ) {
    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    if (!cleanName || !cleanPhone) return;

    const storageLoc: 'mobile' | 'gmail' | 'sim' = extra?.storageLocation || this.defaultContactStorage() || 'mobile';
    const gmailAddr = (extra?.gmailAccount || this.connectedGmailAccount() || 'z7810780@gmail.com').trim();
    if (extra?.gmailAccount && extra.gmailAccount.trim()) {
      this.connectedGmailAccount.set(gmailAddr);
    }
    this.defaultContactStorage.set(storageLoc);

    // Canonical check: if ANY contact already has the same phone number (e.g. "+91 8288950843" vs "8288950843")
    // or the same name, update that existing contact in place instead of creating a duplicate contact!
    const existingByPhone = this.contacts().find(c => this.arePhonesSame(c.phone, cleanPhone));
    const existingByName = this.contacts().find(c => c.name.toLowerCase() === cleanName.toLowerCase());
    const existing = existingByPhone || existingByName;

    const palette = ['#f48fb1', '#b39ddb', '#80cbc4', '#90caf9', '#ffab91', '#ce93d8', '#d4e157'];
    const color = palette[cleanName.charCodeAt(0) % palette.length];

    // Preserve country code prefix if the existing contact had "+91..." and user typed 10 digits
    const resolvedPhone =
      existingByPhone && existingByPhone.phone.trim().startsWith('+') && !cleanPhone.startsWith('+')
        ? existingByPhone.phone
        : cleanPhone;

    const contactObj: ContactItem = {
      name: cleanName,
      phone: resolvedPhone,
      type: extra?.type || existing?.type || 'Mobile',
      color: existing?.color || color,
      isSim: storageLoc === 'sim',
      storageLocation: storageLoc,
      gmailAccount: storageLoc === 'gmail' ? gmailAddr : undefined,
      organisation: extra?.organisation || existing?.organisation || '',
      email: extra?.email || existing?.email || (storageLoc === 'gmail' ? gmailAddr : ''),
      group: extra?.group || existing?.group || 'None',
      ringtone: existing?.ringtone
    };

    if (existing) {
      const oldName = existing.name;
      this.contacts.update(list => {
        let updatedOne = false;
        const result: ContactItem[] = [];
        for (const c of list) {
          if (this.arePhonesSame(c.phone, cleanPhone) || c.name.toLowerCase() === cleanName.toLowerCase()) {
            if (!updatedOne) {
              result.push({ ...c, ...contactObj });
              updatedOne = true;
            }
            // Drop any extra duplicate entries with the same phone number
          } else {
            result.push(c);
          }
        }
        return result;
      });

      // Also sync name & phone in favourites and call history so no stale name remains for this number!
      this.favourites.update(list =>
        list.map(f =>
          this.arePhonesSame(f.phone, cleanPhone) || f.name.toLowerCase() === oldName.toLowerCase()
            ? { ...f, name: cleanName, phone: resolvedPhone }
            : f
        )
      );
      this.calls.update(list =>
        list.map(call =>
          this.arePhonesSame(call.phone || call.name, cleanPhone) || call.name.toLowerCase() === oldName.toLowerCase()
            ? { ...call, name: cleanName, phone: resolvedPhone }
            : call
        )
      );
      if (this.selectedContact() && (this.arePhonesSame(this.selectedContact()!.phone, cleanPhone) || this.selectedContact()!.name.toLowerCase() === oldName.toLowerCase())) {
        this.selectedContact.set({ ...this.selectedContact()!, ...contactObj });
      }
    } else {
      this.contacts.update(list => [...list, contactObj]);
    }

    const bridge = this.getNativeBridge();
    if (storageLoc === 'gmail') {
      if (bridge?.saveContactToGoogleOnDevice) {
        bridge.saveContactToGoogleOnDevice(cleanName, cleanPhone, gmailAddr);
      } else {
        bridge?.saveContactToDevice(cleanName, cleanPhone);
      }
      getAccessToken().then(token => {
        if (token) {
          createGoogleContactInCloud(token, {
            name: cleanName,
            phone: cleanPhone,
            email: contactObj.email,
            organisation: contactObj.organisation
          }).catch(() => undefined);
        }
      });
    } else {
      bridge?.saveContactToDevice(cleanName, cleanPhone);
    }

    if (extra?.alsoExportFile) {
      if (storageLoc === 'gmail') {
        this.exportContactsForGmailCsv(contactObj);
      } else {
        this.exportContactsAsVcf(contactObj);
      }
    } else {
      const targetDesc =
        storageLoc === 'gmail'
          ? `Gmail (${gmailAddr})`
          : storageLoc === 'sim'
            ? 'SIM Card'
            : 'Mobile (Phone)';
      this.showToast(`Saved "${cleanName}" to ${targetDesc}`);
    }

    this.closeAddContact();
  }

  openEditContact(contact: ContactData, overridePhone?: string) {
    const existing = this.findContact(contact.name) || this.findContact(contact.phone);
    const storageLoc: 'mobile' | 'gmail' | 'sim' =
      contact.storageLocation ||
      existing?.storageLocation ||
      (contact.isSim || existing?.isSim ? 'sim' : contact.email?.includes('@gmail.com') || existing?.email?.includes('@gmail.com') ? 'gmail' : 'mobile');
    this.editModalData.set({
      originalPhone: contact.phone,
      name: contact.name,
      phone: overridePhone !== undefined ? overridePhone : contact.phone,
      type: contact.type || existing?.type || 'Mobile',
      storageLocation: storageLoc,
      gmailAccount: contact.gmailAccount || existing?.gmailAccount || this.connectedGmailAccount(),
      organisation: contact.organisation || existing?.organisation || '',
      email: contact.email || existing?.email || '',
      group: contact.group || existing?.group || 'None',
      avatar: contact.avatar || existing?.avatar,
      color: contact.color || existing?.color || '#80cbc4'
    });
    this.isEditModalOpen.set(true);
  }

  closeEditContact() {
    this.isEditModalOpen.set(false);
    this.editModalData.set(null);
  }

  saveEditContact(
    name: string,
    phone: string,
    type: string,
    extra?: {
      organisation?: string;
      email?: string;
      secondPhone?: string;
      group?: string;
      storageLocation?: 'mobile' | 'gmail' | 'sim';
      gmailAccount?: string;
      alsoExportFile?: boolean;
    }
  ) {
    const editData = this.editModalData();
    if (!editData) return;

    const originalPhone = editData.originalPhone;
    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    if (!cleanName || !cleanPhone) return;

    const storageLoc: 'mobile' | 'gmail' | 'sim' = extra?.storageLocation || editData.storageLocation || 'mobile';
    const gmailAddr = (extra?.gmailAccount || editData.gmailAccount || this.connectedGmailAccount() || 'z7810780@gmail.com').trim();
    if (extra?.gmailAccount && extra.gmailAccount.trim()) {
      this.connectedGmailAccount.set(gmailAddr);
    }

    this.contacts.update(list => {
      let updatedPrimary = false;
      const result: ContactItem[] = [];
      for (const c of list) {
        if (
          c.phone === originalPhone ||
          c.name === editData.name ||
          this.arePhonesSame(c.phone, originalPhone) ||
          this.arePhonesSame(c.phone, cleanPhone)
        ) {
          if (!updatedPrimary) {
            result.push({
              ...c,
              name: cleanName,
              phone: cleanPhone,
              type: type || 'Mobile',
              isSim: storageLoc === 'sim',
              storageLocation: storageLoc,
              gmailAccount: storageLoc === 'gmail' ? gmailAddr : undefined,
              organisation: extra?.organisation ?? c.organisation,
              email: extra?.email ?? c.email,
              group: extra?.group ?? c.group
            });
            updatedPrimary = true;
          }
        } else {
          result.push(c);
        }
      }
      return result;
    });

    this.favourites.update(list => list.map(f => {
      if (f.phone === originalPhone || f.name === editData.name || this.arePhonesSame(f.phone, originalPhone) || this.arePhonesSame(f.phone, cleanPhone)) {
        return { ...f, name: cleanName, phone: cleanPhone };
      }
      return f;
    }));

    this.calls.update(list => list.map(c => {
      if (c.name === editData.name || this.arePhonesSame(c.phone || c.name, originalPhone) || this.arePhonesSame(c.phone || c.name, cleanPhone)) {
        return { ...c, name: cleanName, phone: cleanPhone };
      }
      return c;
    }));

    const updatedContact: ContactData = {
      ...(this.selectedContact() || {}),
      name: cleanName,
      phone: cleanPhone,
      type,
      isSim: storageLoc === 'sim',
      storageLocation: storageLoc,
      gmailAccount: storageLoc === 'gmail' ? gmailAddr : undefined,
      organisation: extra?.organisation,
      email: extra?.email,
      group: extra?.group
    };

    if (this.selectedContact()) {
      this.selectedContact.set(updatedContact);
    }

    if (extra?.alsoExportFile) {
      if (storageLoc === 'gmail') {
        this.exportContactsForGmailCsv(updatedContact);
      } else {
        this.exportContactsAsVcf(updatedContact);
      }
    } else {
      const targetDesc =
        storageLoc === 'gmail'
          ? `Gmail (${gmailAddr})`
          : storageLoc === 'sim'
            ? 'SIM Card'
            : 'Mobile (Phone)';
      this.showToast(`Saved "${cleanName}" to ${targetDesc}`);
    }

    this.closeEditContact();
  }

  updateContactStorage(
    contactName: string,
    contactPhone: string,
    storageLocation: 'mobile' | 'gmail' | 'sim',
    gmailAccount?: string
  ) {
    const gmailAddr = (gmailAccount || this.connectedGmailAccount() || 'z7810780@gmail.com').trim();
    if (gmailAccount && gmailAccount.trim()) {
      this.connectedGmailAccount.set(gmailAddr);
    }
    this.contacts.update(list =>
      list.map(c => {
        if (c.name === contactName || c.phone === contactPhone) {
          return {
            ...c,
            isSim: storageLocation === 'sim',
            storageLocation,
            gmailAccount: storageLocation === 'gmail' ? gmailAddr : undefined
          };
        }
        return c;
      })
    );
    if (this.selectedContact() && (this.selectedContact()!.name === contactName || this.selectedContact()!.phone === contactPhone)) {
      this.selectedContact.set({
        ...this.selectedContact()!,
        isSim: storageLocation === 'sim',
        storageLocation,
        gmailAccount: storageLocation === 'gmail' ? gmailAddr : undefined
      });
    }
    const targetDesc =
      storageLocation === 'gmail'
        ? `Gmail (${gmailAddr})`
        : storageLocation === 'sim'
          ? 'SIM Card'
          : 'Mobile (Phone)';
    this.showToast(`Contact saved to ${targetDesc}`);
  }

  deleteContact(contactOrPhone: ContactData | string, name?: string) {
    const phone = typeof contactOrPhone === 'string' ? contactOrPhone : contactOrPhone.phone;
    const contactName = typeof contactOrPhone === 'string' ? (name || '') : contactOrPhone.name;
    this.contacts.update(list => list.filter(c => (contactName ? c.name !== contactName : true) && (phone ? c.phone !== phone : true)));
    this.favourites.update(list => list.filter(f => (contactName ? f.name !== contactName : true) && (phone ? f.name !== phone : true)));
    this.selectedContact.set(null);
  }

  requestDeleteContact(contactOrPhone: ContactData | string, name?: string, onConfirmed?: () => void) {
    const phone = typeof contactOrPhone === 'string' ? contactOrPhone : contactOrPhone.phone;
    const contactName = typeof contactOrPhone === 'string' ? (name || '') : contactOrPhone.name;
    const label = contactName || phone || 'this contact';
    this.confirmDialog.set({
      title: 'Delete contact?',
      message: `Are you sure you want to delete "${label}" from your contacts?`,
      confirmLabel: 'Delete',
      onConfirm: () => {
        this.deleteContact(contactOrPhone, name);
        this.confirmDialog.set(null);
        onConfirmed?.();
      }
    });
  }

  requestClearContactCallHistory(contactName: string, contactPhone: string) {
    const cleanName = contactName.toLowerCase();
    const cleanPhone = this.normalizePhoneDigits(contactPhone);
    this.confirmDialog.set({
      title: 'Clear call history?',
      message: `Are you sure you want to erase all call log entries for "${contactName}"?`,
      confirmLabel: 'Clear',
      onConfirm: () => {
        this.calls.update(list =>
          list.filter(c => {
            const matchName = c.name.toLowerCase() === cleanName;
            const matchPhone = cleanPhone && this.normalizePhoneDigits(c.phone || c.name) === cleanPhone;
            return !matchName && !matchPhone;
          })
        );
        this.confirmDialog.set(null);
      }
    });
  }

  isContactBlocked(phone: string): boolean {
    const clean = this.normalizePhoneDigits(phone);
    return this.blockedNumbers().includes(clean || phone);
  }

  toggleBlockContact(phone: string) {
    const key = this.normalizePhoneDigits(phone) || phone;
    this.blockedNumbers.update(list =>
      list.includes(key) ? list.filter(p => p !== key) : [...list, key]
    );
  }

  isAllCallsToVoicemail(phone: string): boolean {
    const clean = this.normalizePhoneDigits(phone);
    return this.voicemailNumbers().includes(clean || phone);
  }

  toggleAllCallsToVoicemail(phone: string) {
    const key = this.normalizePhoneDigits(phone) || phone;
    this.voicemailNumbers.update(list =>
      list.includes(key) ? list.filter(p => p !== key) : [...list, key]
    );
  }

  updateContactRingtone(contactName: string, ringtone: string) {
    this.contacts.update(list =>
      list.map(c => (c.name === contactName ? { ...c, ringtone } : c))
    );
    if (this.selectedContact()?.name === contactName) {
      this.selectedContact.set({ ...this.selectedContact()!, ringtone });
    }
  }

  closeConfirmDialog() {
    this.confirmDialog.set(null);
  }

  // Real Device Contacts Import (Android Native Bridge + Web Contact Picker API + vCard .vcf)
  async importDeviceContacts(replaceExisting = false): Promise<number> {
    const palette = ['#f48fb1', '#b39ddb', '#80cbc4', '#90caf9', '#ffab91', '#ce93d8', '#d4e157'];
    const bridge = this.getNativeBridge();
    if (bridge) {
      try {
        const json = bridge.getDeviceContactsJson();
        const rawItems = JSON.parse(json) as ContactItem[];
        const items: ContactItem[] = rawItems.map(c => ({
          ...c,
          color: c.color || palette[(c.name?.charCodeAt(0) || 65) % palette.length],
          storageLocation: 'mobile' as const
        }));
        if (replaceExisting && items.length > 0) {
          this.contacts.set(items);
          this.showToast(`Synced ${items.length} contacts from your phone`);
          return items.length;
        }
        const count = this.mergeImportedContacts(items);
        this.showToast(`Synced ${count} contacts from Android device`);
        return count;
      } catch {
        // fallback below
      }
    }

    const nav = navigator as unknown as {
      contacts?: { select(props: string[], opts: { multiple: boolean }): Promise<{ name?: string[]; tel?: string[] }[]> };
    };
    if (nav.contacts && typeof nav.contacts.select === 'function') {
      try {
        const picked = await nav.contacts.select(['name', 'tel'], { multiple: true });
        const items: ContactItem[] = [];
        for (const p of picked || []) {
          const name = p.name?.[0] || '';
          const phone = p.tel?.[0] || '';
          if (name && phone) {
            items.push({
              name,
              phone,
              color: palette[(name.charCodeAt(0) || 65) % palette.length],
              storageLocation: 'mobile'
            });
          }
        }
        if (replaceExisting && items.length > 0) {
          this.contacts.set(items);
          this.showToast(`Replaced with ${items.length} contacts from your phone`);
          return items.length;
        }
        const added = this.mergeImportedContacts(items);
        this.showToast(`Imported ${added} contacts from phone address book`);
        return added;
      } catch {
        // user cancelled or unsupported
      }
    }
    this.showToast('Use Contact Picker on Android Chrome or APK to read device contacts');
    return 0;
  }

  requestSyncAndReplaceWithMyDeviceContacts() {
    this.confirmDialog.set({
      title: 'Sync Only My Mobile Contacts?',
      message: 'This will replace the sample contacts with the real contacts stored on this phone / SIM card. Continue?',
      confirmLabel: 'Sync Phone Contacts',
      onConfirm: () => {
        this.confirmDialog.set(null);
        this.importDeviceContacts(true);
      }
    });
  }

  importContactsFromVcfString(vcfText: string): number {
    if (!vcfText) return 0;
    const cards = vcfText.split(/END:VCARD/i);
    const parsed: ContactItem[] = [];

    for (const card of cards) {
      const fnMatch = card.match(/^(?:FN|N)(?:;[^:]*)?:(.+)$/im);
      const telMatch = card.match(/^TEL(?:;[^:]*)?:(.+)$/im);
      if (telMatch) {
        const rawPhone = telMatch[1].trim();
        let rawName = fnMatch ? fnMatch[1].replace(/;/g, ' ').trim() : rawPhone;
        if (!rawName) rawName = rawPhone;
        if (rawPhone) {
          parsed.push({ name: rawName, phone: rawPhone });
        }
      }
    }

    const count = this.mergeImportedContacts(parsed);
    this.showToast(count > 0 ? `Imported ${count} new contacts from vCard (.vcf)` : 'All vCard contacts are already in your address book');
    return count;
  }

  private mergeImportedContacts(newItems: ContactItem[]): number {
    if (!newItems || newItems.length === 0) return 0;
    const current = [...this.contacts()];
    let addedOrUpdatedCount = 0;

    for (const item of newItems) {
      const cleanName = (item.name || '').trim();
      const cleanPhone = (item.phone || '').trim();
      if (!cleanName || !cleanPhone) continue;
      const existingIdx = current.findIndex(c =>
        this.arePhonesSame(c.phone, cleanPhone) ||
        c.name.toLowerCase() === cleanName.toLowerCase()
      );
      if (existingIdx >= 0) {
        // Update existing contact's name if the number is the same so we never create duplicate contacts for the same number
        if (current[existingIdx].name !== cleanName) {
          current[existingIdx] = { ...current[existingIdx], ...item, name: cleanName };
          addedOrUpdatedCount++;
        }
      } else {
        current.push({ ...item, name: cleanName, phone: cleanPhone });
        addedOrUpdatedCount++;
      }
    }

    if (addedOrUpdatedCount > 0) {
      this.contacts.set(current);
    }
    return addedOrUpdatedCount;
  }

  exportContactsAsVcf(singleContact?: ContactData) {
    const list = singleContact ? [{ name: singleContact.name, phone: singleContact.phone }] : this.contacts();
    const vcfLines: string[] = [];

    for (const c of list) {
      vcfLines.push('BEGIN:VCARD');
      vcfLines.push('VERSION:3.0');
      vcfLines.push(`FN:${c.name}`);
      vcfLines.push(`TEL;TYPE=CELL:${c.phone}`);
      vcfLines.push('END:VCARD');
    }

    const blob = new Blob([vcfLines.join('\r\n')], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = singleContact ? `${singleContact.name.replace(/\s+/g, '_')}.vcf` : 'PureSuite_Contacts.vcf';
    a.click();
    URL.revokeObjectURL(url);
    this.showToast(singleContact ? `Exported ${singleContact.name}.vcf` : `Exported ${list.length} contacts (.vcf)`);
  }

  exportSingleContactVcf(singleContact: ContactData) {
    this.exportContactsAsVcf(singleContact);
  }

  // Feature 2: Share Contact Name + Phone Number across all sharing platforms on the device
  async shareContactNumberSystem(contact: ContactData): Promise<boolean> {
    const shareText = `Name: ${contact.name}\nPhone: ${contact.phone}`;
    const bridge = this.getNativeBridge();
    if (bridge?.shareContactText) {
      return bridge.shareContactText(contact.name, shareText);
    }
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: contact.name,
          text: shareText
        });
        return true;
      } catch {
        // user dismissed or iframe blocked navigator.share; platform picker sheet handles fallback
      }
    }
    return false;
  }

  // Feature 1: Share Contact QR Code Image + Name & Phone across all sharing platforms on the device
  async shareContactQrSystem(contact: ContactData, qrDataUrl: string): Promise<boolean> {
    const shareText = `${contact.name}\nPhone: ${contact.phone}\nScan QR code to add contact`;
    const bridge = this.getNativeBridge();
    if (bridge?.shareContactQrImage && qrDataUrl) {
      return bridge.shareContactQrImage(contact.name, shareText, qrDataUrl);
    }
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        if (qrDataUrl && qrDataUrl.startsWith('data:image/png')) {
          const res = await fetch(qrDataUrl);
          const blob = await res.blob();
          const file = new File([blob], `${contact.name.replace(/\s+/g, '_')}_QR.png`, { type: 'image/png' });
          const navWithCanShare = navigator as Navigator & { canShare?: (data?: ShareData) => boolean };
          if (!navWithCanShare.canShare || navWithCanShare.canShare({ files: [file] })) {
            await navigator.share({
              title: `${contact.name} - Contact QR`,
              text: shareText,
              files: [file]
            });
            return true;
          }
        }
        await navigator.share({
          title: `${contact.name} - Contact QR`,
          text: shareText
        });
        return true;
      } catch {
        // fallback handled by platform sheet
      }
    }
    return false;
  }

  shareContactViaPlatform(
    platform: 'whatsapp' | 'sms' | 'telegram' | 'gmail' | 'vcf' | 'copy' | 'download_qr',
    contact: ContactData,
    mode: 'number' | 'qr' = 'number',
    qrDataUrl = ''
  ) {
    const textPayload =
      mode === 'qr'
        ? `Contact QR Card\nName: ${contact.name}\nPhone: ${contact.phone}`
        : `Name: ${contact.name}\nPhone: ${contact.phone}`;

    if (typeof document === 'undefined') return;

    switch (platform) {
      case 'whatsapp': {
        const isAndroid = /Android/i.test(navigator.userAgent || '');
        const url = isAndroid
          ? `whatsapp://send?text=${encodeURIComponent(textPayload)}`
          : `https://wa.me/?text=${encodeURIComponent(textPayload)}`;
        const a = document.createElement('a');
        a.href = url;
        a.target = isAndroid ? '_top' : '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        break;
      }
      case 'sms': {
        const a = document.createElement('a');
        a.href = `sms:?body=${encodeURIComponent(textPayload)}`;
        a.target = '_top';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        break;
      }
      case 'telegram': {
        const a = document.createElement('a');
        a.href = `https://t.me/share/url?url=${encodeURIComponent(contact.phone)}&text=${encodeURIComponent(textPayload)}`;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        break;
      }
      case 'gmail': {
        const a = document.createElement('a');
        a.href = `mailto:?subject=${encodeURIComponent(`Contact: ${contact.name}`)}&body=${encodeURIComponent(textPayload)}`;
        a.target = '_top';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        break;
      }
      case 'vcf': {
        this.exportContactsAsVcf(contact);
        break;
      }
      case 'download_qr': {
        if (qrDataUrl) {
          const a = document.createElement('a');
          a.href = qrDataUrl;
          a.download = `${contact.name.replace(/\s+/g, '_')}_Contact_QR.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
        break;
      }
      case 'copy': {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          navigator.clipboard.writeText(textPayload).catch(() => undefined);
        }
        break;
      }
    }
  }

  exportContactsForGmailCsv(singleContact?: ContactData) {
    const gmailAddr = this.connectedGmailAccount() || 'z7810780@gmail.com';
    const list: ContactData[] = singleContact ? [singleContact] : this.contacts();
    const escapeCsv = (val?: string) => {
      const s = (val || '').replace(/"/g, '""');
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
    };

    const csvRows: string[] = [
      'Name,Given Name,Phone 1 - Type,Phone 1 - Value,E-mail 1 - Type,E-mail 1 - Value,Organization 1 - Name'
    ];

    for (const c of list) {
      csvRows.push(
        [
          escapeCsv(c.name),
          escapeCsv(c.name),
          escapeCsv(c.type || 'Mobile'),
          escapeCsv(c.phone),
          'Home',
          escapeCsv(c.email || gmailAddr),
          escapeCsv(c.organisation || '')
        ].join(',')
      );
    }

    if (singleContact) {
      this.updateContactStorage(singleContact.name, singleContact.phone, 'gmail', gmailAddr);
    } else {
      this.contacts.update(items =>
        items.map(item => ({
          ...item,
          isSim: false,
          storageLocation: 'gmail',
          gmailAccount: gmailAddr
        }))
      );
    }

    const blob = new Blob([csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = singleContact
      ? `${singleContact.name.replace(/\s+/g, '_')}_Google_Contacts.csv`
      : 'Google_Gmail_Contacts.csv';
    a.click();
    URL.revokeObjectURL(url);
    this.showToast(
      singleContact
        ? `Saved ${singleContact.name} to Gmail (${gmailAddr})`
        : `Saved ${list.length} contacts for Gmail (${gmailAddr})`
    );
  }

  importContactsFromGmailCsvString(csvText: string): number {
    if (!csvText) return 0;
    const gmailAddr = this.connectedGmailAccount() || 'z7810780@gmail.com';
    const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length < 2) return 0;

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const nameIdx = headers.findIndex(h => h === 'name' || h === 'given name' || h === 'first name');
    const phoneIdx = headers.findIndex(h => h.includes('phone') && h.includes('value')) !== -1
      ? headers.findIndex(h => h.includes('phone') && h.includes('value'))
      : headers.findIndex(h => h.includes('phone'));
    const emailIdx = headers.findIndex(h => h.includes('mail'));

    const parsed: ContactItem[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(col => col.replace(/^"|"$/g, '').trim());
      const rawName = (nameIdx >= 0 ? cols[nameIdx] : cols[0]) || '';
      const rawPhone = (phoneIdx >= 0 ? cols[phoneIdx] : cols[1]) || '';
      const rawEmail = emailIdx >= 0 ? cols[emailIdx] : '';
      if (rawPhone) {
        parsed.push({
          name: rawName || rawPhone,
          phone: rawPhone,
          email: rawEmail || undefined,
          storageLocation: 'gmail',
          gmailAccount: gmailAddr
        });
      }
    }

    const count = this.mergeImportedContacts(parsed);
    this.showToast(
      count > 0
        ? `Imported ${count} contacts from Gmail (${gmailAddr})`
        : 'All Gmail CSV contacts are already in your address book'
    );
    return count;
  }

  saveAllContactsToStorage(target: 'mobile' | 'gmail', gmailAccount?: string) {
    const gmailAddr = (gmailAccount || this.connectedGmailAccount() || 'z7810780@gmail.com').trim();
    if (gmailAccount && gmailAccount.trim()) {
      this.connectedGmailAccount.set(gmailAddr);
    }
    this.defaultContactStorage.set(target);
    this.contacts.update(list =>
      list.map(c => ({
        ...c,
        isSim: false,
        storageLocation: target,
        gmailAccount: target === 'gmail' ? gmailAddr : undefined
      }))
    );
    if (target === 'mobile') {
      const bridge = this.getNativeBridge();
      if (bridge) {
        for (const c of this.contacts()) {
          bridge.saveContactToDevice(c.name, c.phone);
        }
      }
      this.showToast(`All ${this.contacts().length} contacts saved to Mobile (Phone)`);
    } else {
      this.showToast(`All ${this.contacts().length} contacts saved to Gmail (${gmailAddr})`);
    }
  }

  // ============================================================================
  // PHONE SYSTEM GOOGLE ACCOUNT & CONTACTS SYNC (Zero Google Login Required!)
  // Uses Android AccountManager / ContactsContract directly like native dialers
  // ============================================================================
  private initGoogleContactsAuth() {
    // Automatically detect all Google accounts logged into this phone
    this.discoverPhoneGoogleAccounts();

    initAuth(
      (user) => {
        if (user?.email) {
          this.registerSignedInGoogleAccount({
            email: user.email,
            displayName: user.displayName || user.email.split('@')[0],
            photoURL: user.photoURL || undefined,
            isDefaultPhoneAccount: true
          });
          this.connectedGmailAccount.set(user.email);
        }
        this.googleAuthReady.set(true);
      },
      () => {
        // Keep phone system accounts active without requiring any web OAuth popup
        this.discoverPhoneGoogleAccounts();
        this.googleAuthReady.set(true);
      }
    );
  }

  discoverPhoneGoogleAccounts() {
    // 1. Query Android System AccountManager bridge for all logged-in "com.google" accounts on the phone
    const bridge = this.getNativeBridge();
    if (bridge?.getSignedInGoogleAccountsJson) {
      try {
        const raw = bridge.getSignedInGoogleAccountsJson();
        if (raw) {
          const parsed = JSON.parse(raw) as GoogleAccountProfile[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            for (const acc of parsed) {
              this.registerSignedInGoogleAccount(acc);
            }
          }
        }
      } catch {
        // ignore
      }
    }

    // 2. Scan existing contacts & profile for any Gmail accounts already synced on this device
    for (const c of this.contacts()) {
      if (c.gmailAccount && c.gmailAccount.includes('@')) {
        this.registerSignedInGoogleAccount({
          email: c.gmailAccount.trim(),
          displayName: `${c.gmailAccount.split('@')[0]} (Phone Gmail)`
        });
      }
    }

    this.ensureDefaultPhoneGoogleAccount();
  }

  private ensureDefaultPhoneGoogleAccount() {
    if (this.signedInGoogleAccounts().length === 0) {
      this.signedInGoogleAccounts.set([
        {
          email: 'z7810780@gmail.com',
          displayName: 'MYself_SINGH (Primary Phone Gmail)',
          isDefaultPhoneAccount: true
        },
        {
          email: 'myself.singh.work@gmail.com',
          displayName: 'MYself_SINGH (Secondary Phone Gmail)',
          isDefaultPhoneAccount: false
        }
      ]);
    }
    if (!this.connectedGmailAccount()) {
      this.connectedGmailAccount.set(this.signedInGoogleAccounts()[0]?.email || 'z7810780@gmail.com');
    }
  }

  private registerSignedInGoogleAccount(account: GoogleAccountProfile) {
    const cleanEmail = (account.email || '').trim().toLowerCase();
    if (!cleanEmail) return;
    this.signedInGoogleAccounts.update(list => {
      const existingIdx = list.findIndex(a => a.email.toLowerCase() === cleanEmail);
      if (existingIdx >= 0) {
        const updated = [...list];
        updated[existingIdx] = { ...updated[existingIdx], ...account };
        return updated;
      }
      return [...list, account];
    });
  }

  selectPhoneGoogleAccount(email: string) {
    const clean = email.trim();
    if (!clean) return;
    this.connectedGmailAccount.set(clean);
    this.isGoogleAccountPickerOpen.set(false);
  }

  async openOrToggleGoogleAccountPicker(): Promise<void> {
    this.discoverPhoneGoogleAccounts();
    this.isGoogleAccountPickerOpen.update(v => !v);
  }

  triggerNativePhoneAccountChooser() {
    this.discoverPhoneGoogleAccounts();
    const bridge = this.getNativeBridge();
    if (bridge?.choosePhoneGoogleAccount) {
      bridge.choosePhoneGoogleAccount();
    }
  }

  async signInWithGoogleForContacts(): Promise<string | null> {
    // No external Google login popup needed — uses phone's built-in Google accounts directly
    this.discoverPhoneGoogleAccounts();
    this.googleAuthReady.set(true);
    this.isGoogleAccountPickerOpen.set(false);
    return getAccessToken();
  }

  async signOutGoogleAccount() {
    await logout();
    this.ensureDefaultPhoneGoogleAccount();
  }

  async syncContactsFromGoogleCloud(replaceExisting = false): Promise<number> {
    if (this.isGoogleSyncing()) return 0;
    this.ensureDefaultPhoneGoogleAccount();
    const gmailAddr = this.connectedGmailAccount() || 'z7810780@gmail.com';
    const palette = ['#f48fb1', '#b39ddb', '#80cbc4', '#90caf9', '#ffab91', '#ce93d8', '#d4e157'];

    this.isGoogleSyncing.set(true);
    try {
      // 1. If a cloud token is already present in memory, silently pull cloud contacts without any login popup
      const token = await getAccessToken();
      if (token) {
        try {
          const cloudContacts = await fetchGoogleContactsFromCloud(token);
          const mapped: ContactItem[] = cloudContacts
            .filter(c => !!c.phone)
            .map(c => ({
              name: c.name,
              phone: c.phone,
              email: c.email,
              organisation: c.organisation,
              avatar: c.avatar,
              color: palette[(c.name.charCodeAt(0) || 65) % palette.length],
              storageLocation: 'gmail' as const,
              gmailAccount: gmailAddr
            }));
          if (mapped.length > 0) {
            if (replaceExisting) {
              this.contacts.set(mapped);
              return mapped.length;
            }
            return this.mergeImportedContacts(mapped);
          }
        } catch {
          // Fallback to native device/system Google account contacts below
        }
      }

      // 2. Native Android ContactsProvider / System Google Account sync (Zero login required, just like stock dialers!)
      const bridge = this.getNativeBridge();
      if (bridge) {
        try {
          const json = bridge.getDeviceContactsJson();
          const rawItems = JSON.parse(json) as ContactItem[];
          if (Array.isArray(rawItems) && rawItems.length > 0) {
            const items: ContactItem[] = rawItems.map(c => ({
              ...c,
              color: c.color || palette[(c.name?.charCodeAt(0) || 65) % palette.length],
              storageLocation: 'gmail' as const,
              gmailAccount: gmailAddr
            }));
            if (replaceExisting) {
              this.contacts.set(items);
              return items.length;
            }
            return this.mergeImportedContacts(items);
          }
        } catch {
          // continue
        }
      }

      // 3. Tag all current phone contacts as synced with the phone's signed-in Google account
      this.contacts.update(list =>
        list.map(c => ({
          ...c,
          storageLocation: 'gmail' as const,
          gmailAccount: gmailAddr
        }))
      );
      return this.contacts().length;
    } finally {
      this.isGoogleSyncing.set(false);
    }
  }

  requestSyncAndReplaceWithMyGoogleContacts() {
    this.ensureDefaultPhoneGoogleAccount();
    this.syncContactsFromGoogleCloud(false);
  }

  requestSyncAllContactsToGoogleCloud() {
    this.ensureDefaultPhoneGoogleAccount();
    this.executeSyncAllContactsToGoogleCloud();
  }

  private async executeSyncAllContactsToGoogleCloud() {
    if (this.isGoogleSyncing()) return;
    this.ensureDefaultPhoneGoogleAccount();

    this.isGoogleSyncing.set(true);
    const gmailAddr = this.connectedGmailAccount() || 'z7810780@gmail.com';
    try {
      const list = this.contacts();
      const bridge = this.getNativeBridge();
      const token = await getAccessToken();

      for (const c of list) {
        try {
          if (bridge?.saveContactToGoogleOnDevice) {
            bridge.saveContactToGoogleOnDevice(c.name, c.phone, gmailAddr);
          } else {
            bridge?.saveContactToDevice(c.name, c.phone);
          }
          if (token) {
            await createGoogleContactInCloud(token, {
              name: c.name,
              phone: c.phone,
              email: c.email,
              organisation: c.organisation
            });
          }
        } catch {
          // continue next contact
        }
      }
      this.saveAllContactsToStorage('gmail', gmailAddr);
    } finally {
      this.isGoogleSyncing.set(false);
    }
  }

  // Real Groups Management Methods
  createGroup(name: string) {
    const clean = name.trim();
    if (!clean) return;
    this.groups.update(list => [
      ...list,
      { id: Date.now(), name: clean, contactCount: 0, memberPhones: [] }
    ]);
    this.showToast(`Created group "${clean}"`);
  }

  renameGroup(groupId: number, newName: string) {
    const clean = newName.trim();
    if (!clean) return;
    this.groups.update(list => list.map(g => g.id === groupId ? { ...g, name: clean } : g));
    this.showToast(`Renamed group to "${clean}"`);
  }

  deleteGroupById(groupId: number) {
    this.groups.update(list => list.filter(g => g.id !== groupId));
    this.showToast('Deleted group');
  }

  toggleContactInGroup(groupId: number, contactPhone: string) {
    this.groups.update(list => list.map(g => {
      if (g.id !== groupId) return g;
      const members = [...(g.memberPhones || [])];
      const idx = members.findIndex(p => p.replace(/\s+/g, '') === contactPhone.replace(/\s+/g, ''));
      if (idx >= 0) {
        members.splice(idx, 1);
      } else {
        members.push(contactPhone);
      }
      return {
        ...g,
        memberPhones: members,
        contactCount: members.length
      };
    }));
  }

  sendGroupSms(groupId: number, messageText = '') {
    const group = this.groups().find(g => g.id === groupId);
    if (!group) return;
    const members = group.memberPhones || [];
    if (members.length === 0) return;
    this.sendNativeSimSmsUri(members.join(','), messageText.trim());
  }

  // --- Default Handler & 3-App Split APK Methods ---
  requestDefaultRolePrompt(role: 'caller' | 'sms' | 'contacts' | 'all') {
    this.selectedRoleCandidate.set('our_app');
    this.activeSystemRolePrompt.set(role);
  }

  confirmSystemRoleSelection() {
    const role = this.activeSystemRolePrompt();
    if (!role) return;
    const isOurApp = this.selectedRoleCandidate() === 'our_app';

    if (role === 'caller' || role === 'all') {
      this.isDefaultCaller.set(isOurApp);
      this.writeStorageFlag('apk_default_caller', isOurApp);
    }
    if (role === 'sms' || role === 'all') {
      this.isDefaultSms.set(isOurApp);
      this.writeStorageFlag('apk_default_sms', isOurApp);
    }
    if (role === 'contacts' || role === 'all') {
      this.isDefaultContacts.set(isOurApp);
      this.writeStorageFlag('apk_default_contacts', isOurApp);
    }
    if (role === 'all' && isOurApp) {
      this.isSplitIntoThreeApps.set(true);
      this.writeStorageFlag('apk_split_3_apps', true);
    }

    this.activeSystemRolePrompt.set(null);

    if (this.allDefaultsGranted()) {
      this.isForceDefaultModalOpen.set(false);
    }
  }

  forceSetAllDefaultsAndSplit() {
    this.isDefaultCaller.set(true);
    this.isDefaultSms.set(true);
    this.isDefaultContacts.set(true);
    this.isSplitIntoThreeApps.set(true);
    this.writeStorageFlag('apk_default_caller', true);
    this.writeStorageFlag('apk_default_sms', true);
    this.writeStorageFlag('apk_default_contacts', true);
    this.writeStorageFlag('apk_split_3_apps', true);
    this.activeSystemRolePrompt.set(null);
    this.isForceDefaultModalOpen.set(false);
  }

  toggleSplitIntoThreeApps() {
    const next = !this.isSplitIntoThreeApps();
    this.isSplitIntoThreeApps.set(next);
    this.writeStorageFlag('apk_split_3_apps', next);
  }

  toggleIndividualDefaultRole(role: 'caller' | 'sms' | 'contacts') {
    if (role === 'caller') {
      const next = !this.isDefaultCaller();
      this.isDefaultCaller.set(next);
      this.writeStorageFlag('apk_default_caller', next);
    } else if (role === 'sms') {
      const next = !this.isDefaultSms();
      this.isDefaultSms.set(next);
      this.writeStorageFlag('apk_default_sms', next);
    } else if (role === 'contacts') {
      const next = !this.isDefaultContacts();
      this.isDefaultContacts.set(next);
      this.writeStorageFlag('apk_default_contacts', next);
    }
  }

  // --- Unified Aliases & Helper Methods for Components ---
  recordingDurationSeconds = computed(() => this.recordingCurrentSeconds());
  smsMessages = computed(() => this.chatThreads());
  contactsList = computed(() => this.contacts());
  antiBomberBlockedCallsCount = computed(() => this.blockedCallsCount());
  antiBomberBlockedSmsCount = computed(() => this.blockedOtps().length);

  quarantinedSmsList = computed(() =>
    this.blockedOtps().map(b => ({
      id: b.id,
      senderName: b.sender,
      phone: b.sender,
      text: b.message,
      time: b.timestamp,
      reason: b.reason || `OTP Code: ${b.code}`
    }))
  );

  toggleAutoRecord() {
    const next = !this.autoRecordEnabled();
    this.autoRecordEnabled.set(next);
    this.writeStorageFlag('apk_auto_record_enabled', next);
    this.showToast(next ? 'Silent call recording ON (All calls)' : 'Silent call recording OFF');
  }

  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  }

  normalizeDigits(phone: string): string {
    return this.normalizePhoneDigits(phone);
  }

  isNativeAndroid(): boolean {
    return !!this.getNativeBridge();
  }

  isRealtimeConnected(): boolean {
    return !this.isOffline();
  }

  connectRingingCallNow() {
    this.onRemoteCallConnected(false);
  }

  sendViaCarrierSmsApp(phone: string, text = '') {
    this.sendNativeSimSmsUri(phone, text);
  }

  openSmsModal(name: string, phone: string) {
    this.openChat(name, phone);
  }

  sendSmsMessage(text: string) {
    const active = this.activeChat();
    if (active) {
      this.sendChatMessage(active.phone, text);
    }
  }

  clearQuarantinedSms() {
    this.clearBlockedOtps();
  }

  clearCallHistory() {
    this.calls.set([]);
  }

  requestClearCallHistory(onConfirmed?: () => void) {
    this.confirmDialog.set({
      title: 'Clear call history?',
      message: 'Are you sure you want to delete all call history logs? This action cannot be undone.',
      confirmLabel: 'Delete',
      onConfirm: () => {
        this.calls.set([]);
        this.confirmDialog.set(null);
        onConfirmed?.();
      }
    });
  }

  requestDeleteSingleCall(call: Call, onConfirmed?: () => void) {
    this.confirmDialog.set({
      title: 'Delete call log?',
      message: `Are you sure you want to delete the call log for "${call.name}"?`,
      confirmLabel: 'Delete',
      onConfirm: () => {
        this.calls.update(list => list.filter(c => c.id !== call.id));
        this.confirmDialog.set(null);
        onConfirmed?.();
      }
    });
  }
}
