import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, output, signal, ViewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { PhoneState, ContactData } from './phone-state';
import { Call, ContactItem } from './data';

@Component({
  selector: 'app-keypad',
  standalone: true,
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let theme = phoneState.currentTheme();
    <div class="flex flex-col h-full relative select-none overflow-hidden pb-[60px]"
         [style.background]="homeWallpaperBackground()"
         [style.color]="theme.primaryTextColor"
         tabindex="0">
      
      <!-- TOP AREA: When dialing numbers (typedNumber is non-empty), the dialed number sits AT THE VERY TOP of the screen (matching Video 1 00:04-00:07) -->
      @if (typedNumber().length > 0) {
        <div class="w-full pt-3 pb-2 px-4 flex flex-col relative z-20 shrink-0"
             [style.background]="theme.topHeaderBarBg">
          <!-- Top Utility Strip while dialing: Anti-Bomber + Wallpaper + Menu -->
          <div class="flex justify-between items-center h-8 mb-1.5">
            <!-- Anti-Bomber Quick Toggle Button -->
            <button type="button"
                    class="flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95"
                    [class.bg-emerald-600/15]="phoneState.antiBomber()"
                    [class.text-emerald-500]="phoneState.antiBomber() && theme.isDark"
                    [class.text-emerald-700]="phoneState.antiBomber() && !theme.isDark"
                    [class.border]="true"
                    [class.border-emerald-500/30]="phoneState.antiBomber()"
                    [class.bg-red-500/15]="!phoneState.antiBomber()"
                    [class.text-red-400]="!phoneState.antiBomber() && theme.isDark"
                    [class.text-red-600]="!phoneState.antiBomber() && !theme.isDark"
                    [class.border-red-500/30]="!phoneState.antiBomber()"
                    (click)="phoneState.toggleAntiBomber()"
                    title="Anti-Bomber Protection: Click to toggle">
              <mat-icon class="text-[16px] w-4 h-4">security</mat-icon>
              <span>{{ phoneState.antiBomber() ? 'Anti-Bomber ON' : 'Anti-Bomber OFF' }}</span>
              @if (phoneState.blockedCallsCount() > 0) {
                <span class="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/20 font-bold">
                  {{ phoneState.blockedCallsCount() }}
                </span>
              }
            </button>

            <div class="flex items-center space-x-1">
              <!-- Wallpapers & Themes Quick Picker Button -->
              <button type="button"
                      class="w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer hover:bg-black/5 active:bg-black/10"
                      [style.color]="theme.primaryTextColor"
                      (click)="phoneState.openThemeModal()"
                      title="Wallpapers & Themes">
                <mat-icon class="text-[20px] w-5 h-5 text-pink-500">palette</mat-icon>
              </button>
              <!-- Honor More Menu Button (4 vertical dots) -->
              <button type="button"
                      class="w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer hover:bg-black/5 active:bg-black/10"
                      [style.color]="theme.primaryTextColor"
                      (click)="isMenuOpen.set(!isMenuOpen())"
                      aria-label="Keypad settings">
                <svg viewBox="0 0 24 24" class="w-5 h-5 fill-current">
                  <circle cx="12" cy="4.5" r="1.6" />
                  <circle cx="12" cy="9.5" r="1.6" />
                  <circle cx="12" cy="14.5" r="1.6" />
                  <circle cx="12" cy="19.5" r="1.6" />
                </svg>
              </button>
            </div>
          </div>

          <div #numberBoxContainer
               class="w-full min-h-[50px] flex items-center justify-center rounded-2xl px-2 py-0.5 transition-colors relative cursor-text touch-none"
               [style.background]="theme.numberBoxBg"
               (pointerdown)="onNumberContainerPointerDown($event)"
               (pointermove)="onNumberContainerPointerMove($event)"
               (pointerup)="onNumberContainerPointerUp()"
               (pointercancel)="onNumberContainerPointerUp()">
            <div class="inline-flex items-center justify-center flex-wrap font-normal tracking-wide relative py-0.5"
                 [style.color]="theme.numberTextColor"
                 [class.text-[34px]]="typedNumber().length <= 13"
                 [class.text-[26px]]="typedNumber().length > 13 && typedNumber().length <= 17"
                 [class.text-[21px]]="typedNumber().length > 17">
              @for (ch of typedNumberChars(); track $index; let idx = $index) {
                @if (cursorPos() === idx) {
                  <!-- Visible Blinking Cursor + Android/Honor Blue Teardrop Text Handler -->
                  <span class="relative inline-flex flex-col items-center justify-center w-0 overflow-visible z-30">
                    <span class="w-[2.5px] h-[34px] bg-[#007dff] rounded-full animate-pulse pointer-events-none"></span>
                    <span class="absolute -bottom-[14px] w-3.5 h-3.5 bg-[#007dff] rotate-45 rounded-full rounded-tl-none shadow-[0_2px_8px_rgba(0,125,255,0.65)] cursor-ew-resize"
                          (pointerdown)="onTextHandlePointerDown($event)"></span>
                  </span>
                }
                <span class="px-[0.5px] leading-none cursor-text"
                      [attr.data-char-index]="idx"
                      (pointerdown)="setCursorFromCharTap(idx, $event)">{{ ch }}</span>
                @if (typedNumber().length === 10 && idx === 4) {
                  <span class="w-2 inline-block pointer-events-none"></span>
                }
              }
              @if (cursorPos() >= typedNumber().length) {
                <!-- Visible Blinking Cursor + Android/Honor Blue Teardrop Text Handler at End -->
                <span class="relative inline-flex flex-col items-center justify-center w-0 overflow-visible z-30">
                  <span class="w-[2.5px] h-[34px] bg-[#007dff] rounded-full animate-pulse pointer-events-none"></span>
                  <span class="absolute -bottom-[14px] w-3.5 h-3.5 bg-[#007dff] rotate-45 rounded-full rounded-tl-none shadow-[0_2px_8px_rgba(0,125,255,0.65)] cursor-ew-resize"
                        (pointerdown)="onTextHandlePointerDown($event)"></span>
                </span>
              }
            </div>
          </div>
        </div>
      } @else {
        <!-- Top Header Strip when no number is typed (Matching Video 1 00:00-00:03 & Video 2 00:08-00:11) -->
        <div class="px-5 pt-3 pb-1 flex flex-col relative z-20 shrink-0"
             [style.background]="theme.topHeaderBarBg">
          <div class="flex justify-between items-center h-8">
            <!-- Anti-Bomber Quick Toggle Button -->
            <button type="button"
                    class="flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95"
                    [class.bg-emerald-600/15]="phoneState.antiBomber()"
                    [class.text-emerald-500]="phoneState.antiBomber() && theme.isDark"
                    [class.text-emerald-700]="phoneState.antiBomber() && !theme.isDark"
                    [class.border]="true"
                    [class.border-emerald-500/30]="phoneState.antiBomber()"
                    [class.bg-red-500/15]="!phoneState.antiBomber()"
                    [class.text-red-400]="!phoneState.antiBomber() && theme.isDark"
                    [class.text-red-600]="!phoneState.antiBomber() && !theme.isDark"
                    [class.border-red-500/30]="!phoneState.antiBomber()"
                    (click)="phoneState.toggleAntiBomber()"
                    title="Anti-Bomber Protection: Click to toggle">
              <mat-icon class="text-[16px] w-4 h-4">security</mat-icon>
              <span>{{ phoneState.antiBomber() ? 'Anti-Bomber ON' : 'Anti-Bomber OFF' }}</span>
              @if (phoneState.blockedCallsCount() > 0) {
                <span class="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/20 font-bold">
                  {{ phoneState.blockedCallsCount() }}
                </span>
              }
            </button>

            <div class="flex items-center space-x-1">
              <!-- Wallpapers & Themes Quick Picker Button -->
              <button type="button"
                      class="w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer hover:bg-black/5 active:bg-black/10"
                      [style.color]="theme.primaryTextColor"
                      (click)="phoneState.openThemeModal()"
                      title="Wallpapers & Themes">
                <mat-icon class="text-[20px] w-5 h-5 text-pink-500">palette</mat-icon>
              </button>

              <!-- Honor More Menu Button (4 vertical dots) -->
              <button type="button"
                      class="w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer hover:bg-black/5 active:bg-black/10"
                      [style.color]="theme.primaryTextColor"
                      (click)="isMenuOpen.set(!isMenuOpen())"
                      aria-label="Keypad settings">
                <svg viewBox="0 0 24 24" class="w-5 h-5 fill-current">
                  <circle cx="12" cy="4.5" r="1.6" />
                  <circle cx="12" cy="9.5" r="1.6" />
                  <circle cx="12" cy="14.5" r="1.6" />
                  <circle cx="12" cy="19.5" r="1.6" />
                </svg>
              </button>
            </div>
          </div>
          <h1 class="text-[30px] font-normal tracking-tight leading-tight mb-2"
              [style.color]="theme.primaryTextColor">Phone</h1>

          <!-- Honor All / Missed Segmented Filter Bar (Smoothly expands/collapses without layout jump!) -->
          <div class="w-full overflow-hidden transition-[max-height,opacity,margin] duration-[360ms] ease-[cubic-bezier(0.32,0.72,0,1)]"
               [style.maxHeight]="!phoneState.isKeypadOpen() ? '46px' : '0px'"
               [style.opacity]="!phoneState.isKeypadOpen() ? '1' : '0'"
               [style.marginBottom]="!phoneState.isKeypadOpen() ? '4px' : '0px'"
               [class.pointer-events-none]="phoneState.isKeypadOpen()">
            <div class="w-full rounded-full p-1 flex items-center"
                 [style.background]="theme.isDark ? 'rgba(255,255,255,0.1)' : '#e6e8ec'">
              <button type="button"
                      class="flex-1 py-1.5 rounded-full text-[13px] font-medium transition-all cursor-pointer"
                      [style.background]="callLogFilter() === 'all' ? (theme.isDark ? 'rgba(255,255,255,0.22)' : '#ffffff') : 'transparent'"
                      [style.color]="callLogFilter() === 'all' ? theme.primaryTextColor : theme.secondaryTextColor"
                      [class.shadow-2xs]="callLogFilter() === 'all'"
                      (click)="callLogFilter.set('all')">
                All
              </button>
              <button type="button"
                      class="flex-1 py-1.5 rounded-full text-[13px] font-medium transition-all cursor-pointer"
                      [style.background]="callLogFilter() === 'missed' ? (theme.isDark ? 'rgba(255,255,255,0.22)' : '#ffffff') : 'transparent'"
                      [style.color]="callLogFilter() === 'missed' ? theme.primaryTextColor : theme.secondaryTextColor"
                      [class.shadow-2xs]="callLogFilter() === 'missed'"
                      (click)="callLogFilter.set('missed')">
                Missed
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Settings Menu Popup (Accessible in both Idle & Dialing states) -->
      @if(isMenuOpen()) {
        <div class="fixed inset-0 z-40" (click)="isMenuOpen.set(false)" (keyup.enter)="isMenuOpen.set(false)" tabindex="0" role="button" aria-label="Close menu"></div>
        <div class="absolute right-4 top-12 bg-white rounded-2xl shadow-[0_6px_30px_rgba(0,0,0,0.22)] z-50 w-72 py-2 overflow-hidden border border-gray-100 text-[14px] animate-fade-in text-gray-800">
          <!-- 1. ANTI-BOMBER FIREWALL -->
          <button type="button"
                  class="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center justify-between transition-colors cursor-pointer border-b border-gray-100"
                  (click)="phoneState.toggleAntiBomber()">
            <div class="flex items-center pr-2">
              <mat-icon class="text-red-600 mr-2.5 text-[20px] w-5 h-5 shrink-0">security</mat-icon>
              <div class="flex flex-col">
                <span class="text-gray-900 font-bold tracking-tight">ANTI BOMBER</span>
                <span class="text-[11px] text-gray-500 leading-snug">
                  Silent spam &amp; OTP block ({{ phoneState.blockedCallsCount() }} blocked)
                </span>
              </div>
            </div>
            <span class="text-xs font-semibold px-2 py-0.5 rounded-md shrink-0"
                  [class.bg-red-600]="phoneState.antiBomber()"
                  [class.text-white]="phoneState.antiBomber()"
                  [class.bg-gray-100]="!phoneState.antiBomber()"
                  [class.text-gray-600]="!phoneState.antiBomber()">
              {{ phoneState.antiBomber() ? 'ON' : 'OFF' }}
            </span>
          </button>

          <!-- 2. SILENT CALL AUTO-RECORDING -->
          <button type="button"
                  class="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center justify-between transition-colors cursor-pointer border-b border-gray-100"
                  (click)="phoneState.toggleAutoRecord()">
            <div class="flex items-center pr-2">
              <mat-icon class="text-red-500 mr-2.5 text-[20px] w-5 h-5 shrink-0">fiber_manual_record</mat-icon>
              <div class="flex flex-col">
                <span class="text-gray-900 font-bold tracking-tight">SILENT RECORDING</span>
                <span class="text-[11px] text-gray-500 leading-snug">
                  Auto-record calls silently in background
                </span>
              </div>
            </div>
            <span class="text-xs font-semibold px-2 py-0.5 rounded-md shrink-0"
                  [class.bg-red-600]="phoneState.autoRecordEnabled()"
                  [class.text-white]="phoneState.autoRecordEnabled()"
                  [class.bg-gray-100]="!phoneState.autoRecordEnabled()"
                  [class.text-gray-600]="!phoneState.autoRecordEnabled()">
              {{ phoneState.autoRecordEnabled() ? 'ON' : 'OFF' }}
            </span>
          </button>

          <!-- 3. WALLPAPERS & THEMES -->
          <button type="button"
                  class="w-full text-left px-4 py-2.5 text-gray-800 font-normal hover:bg-gray-50 active:bg-gray-100 flex items-center justify-between transition-colors cursor-pointer"
                  (click)="phoneState.openThemeModal(); isMenuOpen.set(false)">
            <div class="flex items-center">
              <mat-icon class="text-pink-600 mr-2.5 text-[19px] w-5 h-5">palette</mat-icon>
              <div class="flex flex-col">
                <span class="font-medium text-gray-900">Wallpapers &amp; Themes</span>
                <span class="text-[11px] text-gray-500">12+ Honor themes &amp; wallpapers</span>
              </div>
            </div>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-50 text-pink-700 truncate max-w-[85px]">{{ theme.name }}</span>
          </button>

          <!-- 3. MANAGE TRUST LIST -->
          <button type="button"
                  class="w-full text-left px-4 py-2 text-gray-800 font-normal hover:bg-gray-50 active:bg-gray-100 flex items-center justify-between transition-colors cursor-pointer"
                  (click)="phoneState.isTrustListModalOpen.set(true); isMenuOpen.set(false)">
            <div class="flex items-center">
              <mat-icon class="text-emerald-600 mr-2.5 text-[18px] w-4.5 h-4.5">verified_user</mat-icon>
              <span>Manage Trust List</span>
            </div>
            <span class="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-medium">{{ phoneState.trustList().length }}</span>
          </button>

          <!-- 4. CALL RECORDINGS -->
          <button type="button"
                  class="w-full text-left px-4 py-2 text-gray-800 font-normal hover:bg-gray-50 active:bg-gray-100 flex items-center transition-colors cursor-pointer"
                  (click)="openRecordings()">
            <mat-icon class="text-gray-600 mr-2.5 text-[18px] w-4.5 h-4.5">mic</mat-icon>
            <span>Call recordings</span>
          </button>

          <!-- 5. CLEAR CALL HISTORY -->
          <button type="button"
                  class="w-full text-left px-4 py-2 text-red-600 font-normal hover:bg-red-50 active:bg-red-100 flex items-center transition-colors cursor-pointer"
                  (click)="confirmClearCallHistory()">
            <mat-icon class="text-red-500 mr-2.5 text-[18px] w-4.5 h-4.5">delete_sweep</mat-icon>
            <span>Clear call history</span>
          </button>

          <div class="border-t border-gray-100 my-1"></div>

          <!-- 7. OTHER MORE SETTINGS -->
          <button type="button"
                  class="w-full text-left px-4 py-2 text-gray-900 font-medium hover:bg-gray-50 active:bg-gray-100 flex items-center justify-between transition-colors cursor-pointer"
                  (click)="openMoreSettings()">
            <div class="flex items-center">
              <mat-icon class="text-gray-700 mr-2.5 text-[18px] w-4.5 h-4.5">settings</mat-icon>
              <span>Other More Settings</span>
            </div>
            <mat-icon class="text-gray-400 text-[18px] w-4.5 h-4.5">chevron_right</mat-icon>
          </button>

          <!-- 8. CREDITS -->
          <button type="button"
                  class="w-full text-left px-4 py-2 text-gray-800 font-normal hover:bg-gray-50 active:bg-gray-100 flex items-center transition-colors cursor-pointer"
                  (click)="openCredits()">
            <mat-icon class="text-emerald-600 mr-2.5 text-[18px] w-4.5 h-4.5">workspace_premium</mat-icon>
            <span>Credits</span>
          </button>
        </div>
      }

      <!-- UPPER CONTENT AREA: Matched Contacts & Quick Actions (when dialing) OR Recent Call Log (when idle) -->
      <div class="flex-1 flex flex-col overflow-hidden z-10">
        @if (typedNumber().length > 0) {
          <!-- When a number is typed: Show matched contacts with blue digit highlight first (matching Video 1 00:04-00:07), plus Honor Quick Action Rows -->
          <div class="flex-1 overflow-y-auto px-5 pt-1 pb-[330px]">
            <!-- Live T9 / Digit Matched Contacts List (Shown right below the dialed number, matching Video 1 00:04-00:07) -->
            @if (matchedContacts().length > 0) {
              <div class="divide-y mb-1" [style.borderColor]="theme.dividerColor">
                @for (match of matchedContacts(); track match.phone) {
                  @let parts = splitPhoneByQuery(match.phone, typedNumber());
                  <div class="flex items-center justify-between py-3 cursor-pointer transition-colors hover:bg-black/5"
                       [style.borderColor]="theme.dividerColor"
                       (click)="callMatchedContact(match)"
                       (keyup.enter)="callMatchedContact(match)"
                       tabindex="0"
                       role="button">
                    <div class="flex flex-col min-w-0 pr-3">
                      <span class="text-[16px] font-normal leading-snug truncate"
                            [style.color]="theme.primaryTextColor">{{ match.name }}</span>
                      <div class="text-[13px] leading-snug truncate mt-0.5">
                        <span [style.color]="theme.secondaryTextColor">{{ parts.before }}</span><span class="font-medium" [style.color]="theme.matchHighlightColor">{{ parts.match }}</span><span [style.color]="theme.secondaryTextColor">{{ parts.after }}</span>
                      </div>
                    </div>
                    <button type="button"
                            class="w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer hover:bg-black/10 shrink-0"
                            [style.color]="theme.primaryTextColor"
                            (click)="openContactDetailsRequest.emit(match); $event.stopPropagation()"
                            aria-label="Contact info">
                      <span class="w-[22px] h-[22px] rounded-full border-[1.5px] flex items-center justify-center text-[12px] font-sans font-semibold leading-none"
                            [style.borderColor]="theme.primaryTextColor">i</span>
                    </button>
                  </div>
                }
              </div>
            }

            <!-- Honor Quick Action Rows -->
            <button type="button"
                    class="w-full flex items-center py-3 text-left cursor-pointer active:opacity-70 transition-opacity"
                    (click)="createNewContactFromDialer()">
              <mat-icon class="text-[22px] w-5.5 h-5.5 mr-4 shrink-0" [style.color]="theme.accentColor">add</mat-icon>
              <span class="text-[16px] font-normal flex-1 pb-3 border-b"
                    [style.color]="theme.primaryTextColor"
                    [style.borderColor]="theme.dividerColor">Create new contact</span>
            </button>

            <button type="button"
                    class="w-full flex items-center py-0.5 text-left cursor-pointer active:opacity-70 transition-opacity"
                    (click)="saveToExistingContactFromDialer()">
              <mat-icon class="text-[22px] w-5.5 h-5.5 mr-4 shrink-0" [style.color]="theme.accentColor">add</mat-icon>
              <span class="text-[16px] font-normal flex-1 py-2.5 border-b"
                    [style.color]="theme.primaryTextColor"
                    [style.borderColor]="theme.dividerColor">Save to existing contact</span>
            </button>

            <button type="button"
                    class="w-full flex items-center py-3 text-left cursor-pointer active:opacity-70 transition-opacity"
                    (click)="sendMessageFromDialer()">
              <svg viewBox="0 0 24 24" class="w-5.5 h-5.5 mr-4 shrink-0 fill-none stroke-current"
                   [style.color]="theme.accentColor"
                   stroke-width="1.9"
                   stroke-linecap="round"
                   stroke-linejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
              <span class="text-[16px] font-normal flex-1"
                    [style.color]="theme.primaryTextColor">Send message</span>
            </button>
          </div>
        } @else {
          <!-- When no number is typed: Show Honor Recent Call Rows (Matching Video 1 00:01 & Video 2 00:10-00:11) -->
          <div class="flex-1 overflow-y-auto px-4 pt-0.5 pb-[330px] divide-y"
               [style.borderColor]="theme.dividerColor">
            @for (call of filteredCalls(); track call.id) {
              <div class="flex items-center justify-between py-3 px-1 cursor-pointer transition-colors hover:bg-black/5 active:bg-black/10"
                   [style.borderColor]="theme.dividerColor"
                   (click)="callFromLog(call)"
                   (keyup.enter)="callFromLog(call)"
                   tabindex="0"
                   role="button">
                <div class="flex items-start min-w-0 pr-2">
                  <div class="w-5 pt-1 shrink-0 flex items-center">
                    @if (call.type === 'missed') {
                      <mat-icon class="text-[14px] w-3.5 h-3.5 text-[#e53935]">call_missed</mat-icon>
                    } @else if (call.type === 'incoming') {
                      <mat-icon class="text-[14px] w-3.5 h-3.5" [style.color]="theme.secondaryTextColor">call_received</mat-icon>
                    } @else if (call.type === 'outgoing') {
                      <mat-icon class="text-[14px] w-3.5 h-3.5" [style.color]="theme.secondaryTextColor">north_east</mat-icon>
                    }
                  </div>
                  <div class="flex flex-col truncate">
                    <span class="text-[16px] font-normal leading-snug truncate"
                          [style.color]="call.type === 'missed' ? '#e53935' : theme.primaryTextColor">
                      {{ call.name }} @if(call.count > 1) { ({{ call.count }}) }
                    </span>
                    <div class="flex items-center space-x-1.5 mt-0.5">
                      <!-- Honor Small SIM Card Icon next to location -->
                      <svg viewBox="0 0 16 12" class="w-3.5 h-2.5 shrink-0 fill-none stroke-current opacity-65"
                           [style.color]="theme.secondaryTextColor" stroke-width="1.3">
                        <rect x="1" y="1" width="14" height="10" rx="1.8" />
                        <line x1="5" y1="4" x2="11" y2="4" />
                        <line x1="5" y1="8" x2="9" y2="8" />
                      </svg>
                      <span class="text-[12px] leading-none truncate" [style.color]="theme.secondaryTextColor">
                        {{ call.location }}
                      </span>
                    </div>
                  </div>
                </div>
                <div class="flex items-center space-x-2.5 shrink-0">
                  <span class="text-[13px]" [style.color]="theme.secondaryTextColor">{{ call.time }}</span>
                  <button type="button"
                          class="w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer hover:bg-black/10"
                          [style.color]="theme.primaryTextColor"
                          (click)="openCallDetails(call); $event.stopPropagation()"
                          aria-label="Call info">
                    <span class="w-[22px] h-[22px] rounded-full border-[1.5px] flex items-center justify-center text-[12px] font-sans font-semibold leading-none"
                          [style.borderColor]="theme.primaryTextColor">i</span>
                  </button>
                </div>
              </div>
            }
            @if (filteredCalls().length === 0) {
              <div class="flex flex-col items-center justify-center py-14 select-none"
                   [style.color]="theme.secondaryTextColor">
                <svg viewBox="0 0 64 64" class="w-16 h-16 mb-2 opacity-35 fill-current">
                  <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" stroke-width="2.5" />
                  <path d="M23 21c1.2 0 2.3.7 2.8 1.8l1.8 4.2c.4 1 .2 2.2-.6 3l-2.1 2.1c1.8 3.5 4.6 6.3 8.1 8.1l2.1-2.1c.8-.8 2-1 3-.6l4.2 1.8c1.1.5 1.8 1.6 1.8 2.8v2.5c0 1.9-1.6 3.5-3.5 3.5C27.5 48.1 15.9 36.5 15.9 22.5c0-1.9 1.6-3.5 3.5-3.5H23z" />
                </svg>
                <span class="text-[14px] font-normal">No call log</span>
              </div>
            }
          </div>
        }
      </div>

      <!-- FLOATING KEYPAD BUTTON AT BOTTOM-RIGHT (Matching Video 1 00:01 & Video 2 00:10-00:11!) -->
      <button type="button"
              class="absolute bottom-[74px] right-6 w-[56px] h-[56px] rounded-full bg-[#007dff] text-white shadow-[0_6px_20px_rgba(0,125,255,0.42)] flex items-center justify-center z-30 active:scale-90 transition-[transform,opacity] duration-[340ms] ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer will-change-transform"
              [class.scale-100]="!phoneState.isKeypadOpen()"
              [class.opacity-100]="!phoneState.isKeypadOpen()"
              [class.translate-y-0]="!phoneState.isKeypadOpen()"
              [class.pointer-events-auto]="!phoneState.isKeypadOpen()"
              [class.scale-75]="phoneState.isKeypadOpen()"
              [class.opacity-0]="phoneState.isKeypadOpen()"
              [class.translate-y-4]="phoneState.isKeypadOpen()"
              [class.pointer-events-none]="phoneState.isKeypadOpen()"
              (click)="openKeypadSheet()"
              aria-label="Open keypad">
        <svg viewBox="0 0 24 24" class="w-6 h-6 fill-current pointer-events-none">
          <circle cx="6" cy="5.5" r="1.75" />
          <circle cx="12" cy="5.5" r="1.75" />
          <circle cx="18" cy="5.5" r="1.75" />
          <circle cx="6" cy="11" r="1.75" />
          <circle cx="12" cy="11" r="1.75" />
          <circle cx="18" cy="11" r="1.75" />
          <circle cx="6" cy="16.5" r="1.75" />
          <circle cx="12" cy="16.5" r="1.75" />
          <circle cx="18" cy="16.5" r="1.75" />
          <circle cx="12" cy="21.2" r="1.75" />
        </svg>
      </button>

      <!-- SLIDING KEYPAD BOTTOM SHEET: Smooth 60fps GPU-accelerated slide-up AND slide-down animation -->
      <div class="absolute left-0 right-0 bottom-[60px] z-30 flex flex-col justify-end rounded-t-[28px] shadow-[0_-8px_30px_rgba(0,0,0,0.09)] pt-2 pb-1.5 transition-transform duration-[360ms] ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform"
           [style.background]="theme.keypadPanelBg === 'transparent' ? (theme.isDark ? 'rgba(26,28,32,0.96)' : '#ffffff') : theme.keypadPanelBg"
           [style.transform]="phoneState.isKeypadOpen() ? 'translate3d(0, 0%, 0)' : 'translate3d(0, 105%, 0)'"
           [class.pointer-events-auto]="phoneState.isKeypadOpen()"
           [class.pointer-events-none]="!phoneState.isKeypadOpen()">

        <!-- KEYPAD 3x4 CONTIGUOUS ZERO-GAP GRID (1 2 3): Every cell occupies 100% of its 1/3 partition with NO visible divider lines! -->
        <div class="grid grid-cols-3 gap-0 p-0 m-0 w-full">
          @for(key of keys; track key.num; let idx = $index) {
            <button type="button"
                    class="relative w-full h-[60px] p-0 m-0 rounded-none border-none flex flex-col items-center justify-center select-none touch-manipulation cursor-pointer transition-colors duration-75"
                    [class.bg-black/10]="pressedKey() === key.num && !theme.isDark"
                    [class.bg-white/15]="pressedKey() === key.num && theme.isDark"
                    [class.active:bg-black/10]="!theme.isDark"
                    [class.active:bg-white/15]="theme.isDark"
                    style="touch-action: manipulation; user-select: none; -webkit-tap-highlight-color: transparent;"
                    (pointerdown)="onKeyPointerDown(key.num, $event)"
                    (pointerup)="onKeyPointerUp()"
                    (pointerleave)="onKeyPointerUp()"
                    (pointercancel)="onKeyPointerUp()"
                    (click)="onKeyClick(key.num, $event)"
                    (contextmenu)="handleLongPress($event, key.num)">
              
              <!-- Optional Theme 1 3D Squircle Backdrop -->
              @if (theme.keyStyle === 'squircle-3d') {
                <div class="absolute w-[92px] h-[52px] rounded-[16px] bg-gradient-to-b from-[#f5f7fa] to-[#dfe3ea] shadow-[4px_5px_10px_rgba(160,170,185,0.55),-3px_-3px_8px_rgba(255,255,255,0.95)] border border-white/80 pointer-events-none"></div>
              }

              <!-- Optional Theme 4 (Cyber Supercar) Hand-Drawn Sketchy Cyan Neon Double Circle SVG -->
              @if (theme.keyStyle === 'hand-drawn') {
                <svg viewBox="0 0 64 56" class="absolute w-[78px] h-[52px] pointer-events-none">
                  <ellipse cx="32" cy="28" rx="26" ry="23"
                           fill="none"
                           stroke="#26e6ff"
                           stroke-width="1.35"
                           stroke-dasharray="95 6"
                           opacity="0.9"
                           transform="rotate(-4 32 28)" />
                  <ellipse cx="32" cy="28" rx="24.5" ry="21.5"
                           fill="none"
                           stroke="#26e6ff"
                           stroke-width="0.95"
                           stroke-dasharray="70 12"
                           opacity="0.75"
                           transform="rotate(5 32 28)" />
                </svg>
              }

              <!-- Digit / Symbol Display (Matching Video 1 00:02-00:07) -->
              @if (key.num === '*') {
                <div class="h-[28px] flex items-center justify-center pointer-events-none z-10"
                     [style.color]="theme.keyDigitColor">
                  <svg viewBox="0 0 24 24" class="w-[18px] h-[18px] stroke-current fill-none" stroke-width="2" stroke-linecap="round">
                    <line x1="12" y1="4.5" x2="12" y2="19.5" />
                    <line x1="5.5" y1="8.25" x2="18.5" y2="15.75" />
                    <line x1="18.5" y1="8.25" x2="5.5" y2="15.75" />
                  </svg>
                </div>
              } @else {
                <span class="leading-none pointer-events-none z-10"
                      [style.color]="theme.keyDigitColor"
                      [class.text-[26px]]="theme.keyStyle === 'squircle-3d' || theme.keyStyle === 'hand-drawn'"
                      [class.font-semibold]="theme.keyStyle === 'squircle-3d' || theme.keyStyle === 'stencil'"
                      [class.text-[29px]]="theme.keyStyle === 'ultra-thin' || theme.keyStyle === 'thin-sans'"
                      [class.font-thin]="theme.keyStyle === 'ultra-thin'"
                      [class.font-light]="theme.keyStyle === 'thin-sans'"
                      [class.text-[28px]]="theme.keyStyle === 'bold-sans' || theme.keyStyle === 'medium-sans'"
                      [class.font-bold]="theme.keyStyle === 'bold-sans' || theme.keyStyle === 'retro-wide'"
                      [class.font-normal]="theme.keyStyle === 'medium-sans' || theme.keyStyle === 'hand-drawn'"
                      [class.text-[27px]]="theme.keyStyle === 'retro-wide' || theme.keyStyle === 'stencil'"
                      [class.font-serif]="theme.keyStyle === 'retro-wide'"
                      [class.tracking-wider]="theme.keyStyle === 'retro-wide' || theme.keyStyle === 'stencil'">
                  {{ key.num }}
                </span>
              }

              <!-- Sublabel Letters / Voicemail Icon / (P) / + / (W) (Exact match to Video 1 00:02!) -->
              <div class="h-[13px] mt-1 flex items-center justify-center pointer-events-none z-10">
                @if(key.icon) {
                  <mat-icon class="text-[13px] w-3.5 h-3.5 leading-none"
                            [style.color]="theme.keySublabelColor">{{ key.icon }}</mat-icon>
                } @else if (key.letters) {
                  <span class="text-[10px] font-medium tracking-[0.08em] leading-none"
                        [style.color]="theme.keySublabelColor">{{ key.letters }}</span>
                }
              </div>
            </button>
          }
        </div>

        <!-- BOTTOM CALL ACTION BAR: Contiguous 3-column zero-gap grid -->
        <div class="grid grid-cols-3 gap-0 p-0 m-0 items-center w-full pt-1">
          <!-- Column 1 (under *): Hide Keypad Icon (Full 1/3 width cell touch area) -->
          <button type="button"
                  class="w-full h-[60px] p-0 m-0 flex items-center justify-center cursor-pointer transition-colors duration-75 select-none active:bg-black/10 active:scale-95"
                  style="touch-action: manipulation; user-select: none; -webkit-tap-highlight-color: transparent;"
                  [style.color]="theme.primaryTextColor"
                  (click)="closeKeypadSheet()"
                  aria-label="Hide keypad">
            <svg viewBox="0 0 24 26" class="w-[22px] h-[22px] fill-current pointer-events-none">
              <circle cx="6" cy="4.2" r="1.65" />
              <circle cx="12" cy="4.2" r="1.65" />
              <circle cx="18" cy="4.2" r="1.65" />
              <circle cx="6" cy="9.2" r="1.65" />
              <circle cx="12" cy="9.2" r="1.65" />
              <circle cx="18" cy="9.2" r="1.65" />
              <circle cx="6" cy="14.2" r="1.65" />
              <circle cx="12" cy="14.2" r="1.65" />
              <circle cx="18" cy="14.2" r="1.65" />
              <circle cx="12" cy="19.2" r="1.65" />
              <path d="M9.6 22.2 L12 24.8 L14.4 22.2 Z" />
            </svg>
          </button>
          
          <!-- Column 2 (under 0): Center Honor VoLTE Call Button (Dark charcoal circle with VoLTE + handset icon matching Video 1 00:02) -->
          <div class="w-full h-[60px] flex items-center justify-center">
            <button type="button"
                    class="relative h-[56px] w-[56px] rounded-full shadow-md flex flex-col items-center justify-center active:scale-90 select-none transition-transform duration-75 cursor-pointer"
                    style="touch-action: manipulation; user-select: none; -webkit-tap-highlight-color: transparent;"
                    [style.background]="theme.callButtonBg"
                    [style.color]="theme.callButtonIconColor"
                    (click)="callTypedNumber()"
                    aria-label="Call number">
              <span class="text-[7px] font-bold tracking-tighter leading-none mb-0.5 opacity-95 pointer-events-none">VoLTE</span>
              <mat-icon class="text-[22px] w-5.5 h-5.5 leading-none pointer-events-none">call</mat-icon>
            </button>
          </div>
          
          <!-- Column 3 (under #): Honor Outline Backspace Button (Full 1/3 width cell touch area) -->
          <button type="button"
                  class="w-full h-[60px] p-0 m-0 flex items-center justify-center cursor-pointer transition-colors duration-75 select-none active:bg-black/10 active:scale-95"
                  style="touch-action: manipulation; user-select: none; -webkit-tap-highlight-color: transparent;"
                  [style.color]="theme.primaryTextColor"
                  [class.opacity-40]="!typedNumber()"
                  (pointerdown)="onBackspacePointerDown($event)"
                  (pointerup)="onBackspacePointerUp()"
                  (pointerleave)="onBackspacePointerUp()"
                  (pointercancel)="onBackspacePointerUp()"
                  (click)="onBackspaceClick($event)"
                  (contextmenu)="clearNumber($event)"
                  aria-label="Delete digit">
            <svg viewBox="0 0 24 24" class="w-[22px] h-[22px] fill-none stroke-current pointer-events-none" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 5H9l-6 7 6 7h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Z" />
              <line x1="17" y1="9" x2="11" y2="15" />
              <line x1="11" y1="9" x2="17" y2="15" />
            </svg>
          </button>
        </div>
      </div>

      <!-- SAVE TO EXISTING CONTACT MODAL -->
      @if (isSaveExistingOpen()) {
        <div class="fixed inset-0 bg-black/60 z-[190] flex items-center justify-center p-4 cursor-pointer"
             tabindex="0"
             role="button"
             aria-label="Close save to existing contact"
             (click)="isSaveExistingOpen.set(false)"
             (keydown.enter)="isSaveExistingOpen.set(false)">
          <div class="bg-white rounded-3xl w-full max-w-[360px] p-5 shadow-2xl text-gray-900 cursor-default border border-gray-100 animate-fade-in"
               tabindex="0"
               role="dialog"
               aria-modal="true"
               (click)="$event.stopPropagation()"
               (keydown)="$event.stopPropagation()">
            <div class="flex justify-between items-center mb-3 pb-2 border-b border-gray-100">
              <h3 class="text-base font-bold text-gray-900">Select contact to update</h3>
              <button type="button"
                      class="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 cursor-pointer"
                      (click)="isSaveExistingOpen.set(false)">
                <mat-icon class="text-[20px] w-5 h-5">close</mat-icon>
              </button>
            </div>
            <div class="max-h-[55vh] overflow-y-auto divide-y divide-gray-100">
              @for (c of phoneState.contacts(); track c.phone) {
                <button type="button"
                        class="w-full py-2.5 px-2 flex items-center justify-between text-left hover:bg-gray-50 rounded-xl cursor-pointer"
                        (click)="selectExistingContactForSave(c)">
                  <div class="flex flex-col min-w-0 pr-2">
                    <span class="text-[15px] font-medium text-gray-900 truncate">{{ c.name }}</span>
                    <span class="text-[12px] text-gray-500 truncate">{{ c.phone }}</span>
                  </div>
                  <mat-icon class="text-blue-600 text-[18px] w-4.5 h-4.5">chevron_right</mat-icon>
                </button>
              }
            </div>
          </div>
        </div>
      }

      <!-- CREDITS MODAL -->
      @if(isCreditsOpen()) {
        <div class="fixed inset-0 bg-black/80 z-[190] flex items-center justify-center p-4 cursor-pointer"
             tabindex="0"
             role="button"
             aria-label="Close credits modal"
             (click)="isCreditsOpen.set(false)"
             (keydown.enter)="isCreditsOpen.set(false)"
             (keydown.space)="isCreditsOpen.set(false)">
          <div class="bg-[#121212] border border-white/10 rounded-[24px] w-full max-w-[380px] p-6 shadow-2xl text-white cursor-default animate-fade-in"
               tabindex="0"
               role="dialog"
               aria-modal="true"
               (click)="$event.stopPropagation()"
               (keydown)="$event.stopPropagation()">
            <h3 class="text-[22px] font-bold text-white leading-tight">Credits</h3>
            <p class="text-[14px] text-[#9ca3af] mt-1 mb-5">
              The creator: <span class="text-[#22c55e] font-semibold">MYself_SINGH</span>
            </p>

            <div class="flex flex-col space-y-3">
              <a href="https://t.me/Figdyxutsmgsutsfksfk_bot"
                 target="_blank"
                 rel="noopener noreferrer"
                 class="block w-full text-left bg-[#1a1a1a] hover:bg-[#242424] active:scale-[0.99] border border-white/10 rounded-2xl px-4 py-3.5 transition-all cursor-pointer no-underline">
                <div class="text-[15px] font-bold text-white leading-snug">Talk to the creator</div>
                <div class="text-[13px] text-[#8e8e93] mt-0.5 leading-snug">Report a bug, or share what you'd like to see next</div>
              </a>

              <a href="https://t.me/comeonjoinfriends"
                 target="_blank"
                 rel="noopener noreferrer"
                 class="block w-full text-left bg-[#1a1a1a] hover:bg-[#242424] active:scale-[0.99] border border-white/10 rounded-2xl px-4 py-3.5 transition-all cursor-pointer no-underline">
                <div class="text-[15px] font-bold text-white leading-snug">See the channel</div>
              </a>

              <a href="https://t.me/Friendshhipgroup"
                 target="_blank"
                 rel="noopener noreferrer"
                 class="block w-full text-left bg-[#1a1a1a] hover:bg-[#242424] active:scale-[0.99] border border-white/10 rounded-2xl px-4 py-3.5 transition-all cursor-pointer no-underline">
                <div class="text-[15px] font-bold text-white leading-snug">Group chat</div>
              </a>
            </div>

            <button type="button"
                    class="w-full mt-5 py-3 bg-[#161616] hover:bg-[#222222] active:scale-[0.99] border border-white/10 rounded-2xl text-white font-medium text-[15px] text-center transition-all cursor-pointer"
                    (click)="isCreditsOpen.set(false)">
              Close
            </button>
          </div>
        </div>
      }

      <!-- OTHER MORE SETTINGS MODAL -->
      @if(isMoreSettingsOpen()) {
        <div class="fixed inset-0 bg-black/60 z-[190] flex items-center justify-center p-4 cursor-pointer"
             tabindex="0"
             role="button"
             aria-label="Close other more settings"
             (click)="isMoreSettingsOpen.set(false)"
             (keydown.enter)="isMoreSettingsOpen.set(false)"
             (keydown.space)="isMoreSettingsOpen.set(false)">
          <div class="bg-white rounded-3xl w-full max-w-[360px] p-5 shadow-2xl text-gray-900 cursor-default border border-gray-100 animate-fade-in"
               tabindex="0"
               role="dialog"
               aria-modal="true"
               (click)="$event.stopPropagation()"
               (keydown)="$event.stopPropagation()">
            <div class="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
              <div class="flex items-center space-x-2">
                <mat-icon class="text-gray-700">settings</mat-icon>
                <h3 class="text-lg font-bold text-gray-900">Other More Settings</h3>
              </div>
              <button type="button"
                      class="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 cursor-pointer"
                      (click)="isMoreSettingsOpen.set(false)"
                      aria-label="Close">
                <mat-icon class="text-[20px] w-5 h-5">close</mat-icon>
              </button>
            </div>

            <div class="flex flex-col space-y-2.5 max-h-[65vh] overflow-y-auto pr-0.5">
              <!-- ANSWER BUTTON MODE (click and swipe to ans | click to ans) -->
              <div class="px-3.5 py-3 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col space-y-2">
                <div class="flex items-center space-x-3">
                  <mat-icon class="text-emerald-600 text-[22px] w-5.5 h-5.5 shrink-0">touch_app</mat-icon>
                  <div class="flex flex-col">
                    <span class="font-semibold text-gray-900 text-[14px]">Answer button</span>
                    <span class="text-[11px] text-gray-500">Choose incoming call answer UI style</span>
                  </div>
                </div>
                <div class="grid grid-cols-2 gap-2 pt-1">
                  <button type="button"
                          class="py-2 px-2 rounded-xl text-[11px] font-semibold flex items-center justify-center space-x-1 transition-all cursor-pointer border"
                          [class.bg-emerald-600]="phoneState.answerButtonMode() === 'swipe'"
                          [class.text-white]="phoneState.answerButtonMode() === 'swipe'"
                          [class.border-emerald-600]="phoneState.answerButtonMode() === 'swipe'"
                          [class.bg-white]="phoneState.answerButtonMode() !== 'swipe'"
                          [class.text-gray-700]="phoneState.answerButtonMode() !== 'swipe'"
                          [class.border-gray-200]="phoneState.answerButtonMode() !== 'swipe'"
                          (click)="phoneState.setAnswerButtonMode('swipe')">
                    <mat-icon class="text-[15px] w-3.5 h-3.5">swipe</mat-icon>
                    <span class="truncate">click and swipe to ans</span>
                  </button>
                  <button type="button"
                          class="py-2 px-2 rounded-xl text-[11px] font-semibold flex items-center justify-center space-x-1 transition-all cursor-pointer border"
                          [class.bg-emerald-600]="phoneState.answerButtonMode() === 'click'"
                          [class.text-white]="phoneState.answerButtonMode() === 'click'"
                          [class.border-emerald-600]="phoneState.answerButtonMode() === 'click'"
                          [class.bg-white]="phoneState.answerButtonMode() !== 'click'"
                          [class.text-gray-700]="phoneState.answerButtonMode() !== 'click'"
                          [class.border-gray-200]="phoneState.answerButtonMode() !== 'click'"
                          (click)="phoneState.setAnswerButtonMode('click')">
                    <mat-icon class="text-[15px] w-3.5 h-3.5">ads_click</mat-icon>
                    <span class="truncate">click to ans</span>
                  </button>
                </div>
              </div>

              <!-- 1. ANTI BOMBER -->
              <button class="w-full text-left px-3.5 py-3 bg-gray-50 hover:bg-gray-100 rounded-2xl flex items-center justify-between transition-colors cursor-pointer border border-gray-100"
                      (click)="phoneState.toggleAntiBomber()">
                <div class="flex items-center pr-2">
                  <mat-icon class="text-red-600 mr-3 text-[22px] w-5.5 h-5.5 shrink-0">security</mat-icon>
                  <div class="flex flex-col">
                    <span class="text-gray-900 font-bold tracking-tight text-[14px]">ANTI BOMBER</span>
                    <span class="text-[11px] text-gray-500 leading-snug">
                      Turn on to get rid of Call Bombing ({{ phoneState.blockedCallsCount() }} calls blocked)
                    </span>
                  </div>
                </div>
                <span class="text-xs font-semibold px-2.5 py-1 rounded-lg shrink-0"
                      [class.bg-red-600]="phoneState.antiBomber()"
                      [class.text-white]="phoneState.antiBomber()"
                      [class.bg-gray-200]="!phoneState.antiBomber()"
                      [class.text-gray-700]="!phoneState.antiBomber()">
                  {{ phoneState.antiBomber() ? 'ON' : 'OFF' }}
                </span>
              </button>

              <!-- 2. Manage Trust List -->
              <button class="w-full text-left px-3.5 py-3 bg-gray-50 hover:bg-gray-100 rounded-2xl flex items-center justify-between text-gray-800 transition-colors cursor-pointer border border-gray-100"
                      (click)="isMoreSettingsOpen.set(false); phoneState.isTrustListModalOpen.set(true)">
                <div class="flex items-center">
                  <mat-icon class="text-green-600 mr-3 text-[22px] w-5.5 h-5.5">verified_user</mat-icon>
                  <div class="flex flex-col">
                    <span class="font-semibold text-gray-900 text-[14px]">Manage Trust List</span>
                    <span class="text-[11px] text-gray-500">Trusted numbers never get blocked</span>
                  </div>
                </div>
                <span class="text-xs bg-green-100 text-green-800 px-2.5 py-0.5 rounded-full font-bold">{{ phoneState.trustList().length }}</span>
              </button>

              <!-- 3. Auto-Record Calls (Real Mic & Call Line WAV) -->
              <button class="w-full text-left px-3.5 py-3 bg-gray-50 hover:bg-gray-100 rounded-2xl flex items-center justify-between text-gray-800 transition-colors cursor-pointer border border-gray-100"
                      (click)="phoneState.toggleAutoRecord()">
                <div class="flex items-center pr-2">
                  <mat-icon class="text-red-500 mr-3 text-[22px] w-5.5 h-5.5 shrink-0">fiber_manual_record</mat-icon>
                  <div class="flex flex-col">
                    <span class="font-semibold text-gray-900 text-[14px]">Silent Auto Call Recording</span>
                    <span class="text-[11px] text-gray-500">Automatically records live mic &amp; call audio (.wav)</span>
                  </div>
                </div>
                <span class="text-xs font-semibold px-2.5 py-1 rounded-lg shrink-0"
                      [class.bg-red-600]="phoneState.autoRecordEnabled()"
                      [class.text-white]="phoneState.autoRecordEnabled()"
                      [class.bg-gray-200]="!phoneState.autoRecordEnabled()"
                      [class.text-gray-700]="!phoneState.autoRecordEnabled()">
                  {{ phoneState.autoRecordEnabled() ? 'ON' : 'OFF' }}
                </span>
              </button>

              <!-- 6. Themes (Apply to All) -->
              <button class="w-full text-left px-3.5 py-3 bg-gray-50 hover:bg-gray-100 rounded-2xl flex items-center justify-between text-gray-800 transition-colors cursor-pointer border border-gray-100"
                      (click)="isMoreSettingsOpen.set(false); phoneState.openThemeModal()">
                <div class="flex items-center">
                  <mat-icon class="text-pink-600 mr-3 text-[22px] w-5.5 h-5.5">palette</mat-icon>
                  <div class="flex flex-col">
                    <span class="font-semibold text-gray-900 text-[14px]">Themes (Apply to All)</span>
                    <span class="text-[11px] text-gray-500">Choose once for Phone &amp; Contacts</span>
                  </div>
                </div>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-50 text-pink-700 truncate max-w-[95px]">{{ theme.name }}</span>
              </button>

              <!-- 7. Default App & 2-App Split APK -->
              <button class="w-full text-left px-3.5 py-3 bg-gray-50 hover:bg-gray-100 rounded-2xl flex items-center justify-between text-gray-800 transition-colors cursor-pointer border border-gray-100"
                      (click)="isMoreSettingsOpen.set(false); phoneState.isForceDefaultModalOpen.set(true)">
                <div class="flex items-center">
                  <mat-icon class="text-indigo-600 mr-3 text-[22px] w-5.5 h-5.5">admin_panel_settings</mat-icon>
                  <div class="flex flex-col">
                    <span class="font-semibold text-gray-900 text-[14px]">Default App &amp; 2-App Split</span>
                    <span class="text-[11px] text-gray-500">Phone &amp; Contacts APK configuration</span>
                  </div>
                </div>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">APK</span>
              </button>

              <!-- 8. Simulate Incoming Call Top Banner -->
              <button class="w-full text-left px-3.5 py-3 bg-blue-50/70 hover:bg-blue-100/80 rounded-2xl flex items-center justify-between text-blue-700 transition-colors cursor-pointer border border-blue-100"
                      (click)="isMoreSettingsOpen.set(false); phoneState.triggerIncomingCall()">
                <div class="flex items-center">
                  <mat-icon class="text-blue-600 mr-3 text-[22px] w-5.5 h-5.5">ring_volume</mat-icon>
                  <div class="flex flex-col">
                    <span class="font-semibold text-blue-700 text-[14px]">Test Incoming Call Banner</span>
                    <span class="text-[11px] text-blue-600/80">Preview top notch incoming call banner animation</span>
                  </div>
                </div>
              </button>

              <!-- 9. Clear Call History (Requires Confirmation!) -->
              <button class="w-full text-left px-3.5 py-3 bg-red-50/60 hover:bg-red-100/70 rounded-2xl flex items-center justify-between text-red-600 transition-colors cursor-pointer border border-red-100"
                      (click)="isMoreSettingsOpen.set(false); phoneState.requestClearCallHistory()">
                <div class="flex items-center">
                  <mat-icon class="text-red-500 mr-3 text-[22px] w-5.5 h-5.5">delete_sweep</mat-icon>
                  <div class="flex flex-col">
                    <span class="font-semibold text-red-600 text-[14px]">Clear Call History</span>
                    <span class="text-[11px] text-red-500/80">Ask confirmation before removing call logs</span>
                  </div>
                </div>
              </button>
            </div>

            <button type="button"
                    class="w-full mt-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-2xl font-medium text-sm transition-colors cursor-pointer"
                    (click)="isMoreSettingsOpen.set(false)">
              Done
            </button>
          </div>
        </div>
      }

    </div>
  `
})
export class KeypadComponent {
  phoneState = inject(PhoneState);
  
  @ViewChild('numberBoxContainer') numberBoxRef?: ElementRef<HTMLDivElement>;

  typedNumber = signal('');
  typedNumberChars = computed(() => this.typedNumber().split(''));
  cursorPos = signal(0);
  isDraggingTextHandle = signal(false);
  pressedKey = signal<string | null>(null);
  callLogFilter = signal<'all' | 'missed'>('all');
  isMenuOpen = signal(false);
  isCreditsOpen = signal(false);
  isMoreSettingsOpen = signal(false);
  isSaveExistingOpen = signal(false);

  // Home screen background (synced 100% with theme or custom wallpaper)
  homeWallpaperBackground = computed(() => {
    const custom = this.phoneState.customWallpaper();
    if (custom) {
      return `url("${custom}") center top / cover no-repeat`;
    }
    return this.phoneState.currentTheme().upperBg;
  });

  private lastPointerDownAt = 0;
  private lastBackspaceDownAt = 0;
  private longPressTimer: ReturnType<typeof setTimeout> | null = null;
  private backspaceHoldTimer: ReturnType<typeof setTimeout> | null = null;
  private backspaceRepeatInterval: ReturnType<typeof setInterval> | null = null;

  goToRecents = output<void>();
  openRecordingsRequest = output<void>();
  openContactDetailsRequest = output<ContactData>();

  filteredCalls = computed(() => {
    const all = this.phoneState.calls();
    if (this.callLogFilter() === 'missed') {
      return all.filter(c => c.type === 'missed');
    }
    return all;
  });

  formattedTypedNumber = computed(() => {
    const raw = this.typedNumber();
    if (raw.length === 10 && /^\d+$/.test(raw)) {
      return `${raw.slice(0, 5)} ${raw.slice(5)}`;
    }
    return raw;
  });

  // Accurate contact matching in dialpad (By partial digits, full digits, and T9 keypad sequence!)
  matchedContacts = computed(() => {
    const q = this.typedNumber().trim();
    if (!q) return [];
    
    const cleanQ = q.toLowerCase().replace(/[\s+-]/g, '');
    const digits = q.replace(/\D/g, '');

    return this.phoneState.contacts().filter(c => {
      if (c.name.toLowerCase().includes(cleanQ)) return true;
      const cDigits = this.phoneState.normalizePhoneDigits(c.phone);
      if (digits.length >= 1 && (cDigits.includes(digits) || digits.includes(cDigits))) return true;
      if (/^\d+$/.test(digits) && digits.length >= 2) {
        const cT9 = c.name.toLowerCase().split('').map(ch => {
          const map: Record<string, string> = {
            a: '2', b: '2', c: '2', d: '3', e: '3', f: '3',
            g: '4', h: '4', i: '4', j: '5', k: '5', l: '5',
            m: '6', n: '6', o: '6', p: '7', q: '7', r: '7', s: '7',
            t: '8', u: '8', v: '8', w: '9', x: '9', y: '9', z: '9'
          };
          return map[ch] || '';
        }).join('');
        if (cT9.includes(digits)) return true;
      }
      return false;
    });
  });

  keys = [
    { num: '1', letters: '', icon: 'voicemail' },
    { num: '2', letters: 'ABC' },
    { num: '3', letters: 'DEF' },
    { num: '4', letters: 'GHI' },
    { num: '5', letters: 'JKL' },
    { num: '6', letters: 'MNO' },
    { num: '7', letters: 'PQRS' },
    { num: '8', letters: 'TUV' },
    { num: '9', letters: 'WXYZ' },
    { num: '*', letters: '(P)' },
    { num: '0', letters: '+' },
    { num: '#', letters: '(W)' },
  ];

  openKeypadSheet() {
    this.phoneState.isKeypadOpen.set(true);
  }

  closeKeypadSheet() {
    this.phoneState.isKeypadOpen.set(false);
  }

  splitPhoneByQuery(phone: string, query: string): { before: string; match: string; after: string } {
    const digits = query.replace(/\D/g, '');
    if (!digits) return { before: phone, match: '', after: '' };
    // Try direct substring match first
    const idx = phone.replace(/\s+/g, '').indexOf(digits);
    if (idx === -1) {
      return { before: '', match: phone, after: '' };
    }
    // Map compact index back to formatted phone string
    let compactPos = 0;
    let startChar = -1;
    let endChar = phone.length;
    for (let i = 0; i < phone.length; i++) {
      if (phone[i] !== ' ') {
        if (compactPos === idx && startChar === -1) startChar = i;
        compactPos++;
        if (compactPos === idx + digits.length) {
          endChar = i + 1;
          break;
        }
      }
    }
    if (startChar === -1) return { before: phone, match: '', after: '' };
    return {
      before: phone.slice(0, startChar),
      match: phone.slice(startChar, endChar),
      after: phone.slice(endChar)
    };
  }

  setCursorFromCharTap(charIndex: number, event: PointerEvent) {
    event.stopPropagation();
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const tapX = event.clientX - rect.left;
    const nextPos = tapX > rect.width / 2 ? charIndex + 1 : charIndex;
    this.cursorPos.set(Math.min(Math.max(0, nextPos), this.typedNumber().length));
    this.isDraggingTextHandle.set(true);
  }

  onTextHandlePointerDown(event: PointerEvent) {
    event.stopPropagation();
    this.isDraggingTextHandle.set(true);
    (event.target as HTMLElement)?.setPointerCapture?.(event.pointerId);
  }

  onNumberContainerPointerDown(event: PointerEvent) {
    this.isDraggingTextHandle.set(true);
    this.updateCursorFromClientX(event.clientX);
  }

  onNumberContainerPointerMove(event: PointerEvent) {
    if (!this.isDraggingTextHandle()) return;
    this.updateCursorFromClientX(event.clientX);
  }

  onNumberContainerPointerUp() {
    this.isDraggingTextHandle.set(false);
  }

  private updateCursorFromClientX(clientX: number) {
    const container = this.numberBoxRef?.nativeElement;
    if (!container) return;
    const charEls = Array.from(container.querySelectorAll<HTMLElement>('[data-char-index]'));
    if (charEls.length === 0) {
      this.cursorPos.set(0);
      return;
    }
    for (let i = 0; i < charEls.length; i++) {
      const rect = charEls[i].getBoundingClientRect();
      const mid = rect.left + rect.width / 2;
      if (clientX < mid) {
        this.cursorPos.set(i);
        return;
      }
    }
    this.cursorPos.set(charEls.length);
  }

  onKeyPointerDown(num: string, event: Event) {
    event.preventDefault();
    this.lastPointerDownAt = Date.now();
    this.pressedKey.set(num);
    this.appendNumber(num);

    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    if (num === '0') {
      this.longPressTimer = setTimeout(() => {
        this.deleteNumber();
        this.appendNumber('+');
        this.longPressTimer = null;
      }, 450);
    } else if (num === '*') {
      this.longPressTimer = setTimeout(() => {
        this.deleteNumber();
        this.appendNumber(',');
        this.longPressTimer = null;
      }, 450);
    } else if (num === '#') {
      this.longPressTimer = setTimeout(() => {
        this.deleteNumber();
        this.appendNumber(';');
        this.longPressTimer = null;
      }, 450);
    } else if (num === '1') {
      this.longPressTimer = setTimeout(() => {
        this.deleteNumber();
        this.phoneState.dialVoicemail();
        this.longPressTimer = null;
      }, 550);
    }
  }

  onKeyClick(num: string, event: Event) {
    // Fallback if click fired without a recent pointerdown (e.g. keyboard/assistive tap)
    if (Date.now() - this.lastPointerDownAt < 380) {
      return;
    }
    event.preventDefault();
    this.appendNumber(num);
  }

  onKeyPointerUp() {
    this.pressedKey.set(null);
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  onBackspacePointerDown(event: Event) {
    event.preventDefault();
    this.lastBackspaceDownAt = Date.now();
    this.deleteNumber();
    this.onBackspacePointerUp();
    this.backspaceHoldTimer = setTimeout(() => {
      this.backspaceRepeatInterval = setInterval(() => {
        if (!this.typedNumber()) {
          this.onBackspacePointerUp();
          return;
        }
        this.deleteNumber();
      }, 70);
    }, 360);
  }

  onBackspaceClick(event: Event) {
    if (Date.now() - this.lastBackspaceDownAt < 380) {
      return;
    }
    event.preventDefault();
    this.deleteNumber();
  }

  onBackspacePointerUp() {
    if (this.backspaceHoldTimer) {
      clearTimeout(this.backspaceHoldTimer);
      this.backspaceHoldTimer = null;
    }
    if (this.backspaceRepeatInterval) {
      clearInterval(this.backspaceRepeatInterval);
      this.backspaceRepeatInterval = null;
    }
  }

  appendNumber(num: string) {
    this.phoneState.playTone(num);
    const current = this.typedNumber();
    const pos = Math.min(Math.max(0, this.cursorPos()), current.length);

    const before = current.slice(0, pos);
    const after = current.slice(pos);
    const updated = before + num + after;
    this.typedNumber.set(updated);
    this.cursorPos.set(pos + num.length);
  }

  deleteNumber() {
    const current = this.typedNumber();
    if (!current) return;

    const pos = Math.min(Math.max(0, this.cursorPos()), current.length);
    if (pos > 0) {
      const updated = current.slice(0, pos - 1) + current.slice(pos);
      this.typedNumber.set(updated);
      this.cursorPos.set(pos - 1);
    } else {
      const updated = current.slice(0, -1);
      this.typedNumber.set(updated);
      this.cursorPos.set(updated.length);
    }
  }

  openRecordings() {
    this.isMenuOpen.set(false);
    this.openRecordingsRequest.emit();
  }

  testIncomingBanner() {
    this.isMenuOpen.set(false);
    this.phoneState.triggerIncomingCall();
  }

  confirmClearCallHistory() {
    this.isMenuOpen.set(false);
    this.phoneState.requestClearCallHistory();
  }

  openCredits() {
    this.isMenuOpen.set(false);
    this.isCreditsOpen.set(true);
  }

  openMoreSettings() {
    this.isMenuOpen.set(false);
    this.isMoreSettingsOpen.set(true);
  }

  handleLongPress(e: Event, num: string) {
    e.preventDefault();
    if (num === '0' && !this.typedNumber().endsWith('+')) {
      this.appendNumber('+');
    } else if (num === '1') {
      this.phoneState.dialVoicemail();
    }
  }

  clearNumber(e?: Event) {
    e?.preventDefault();
    this.typedNumber.set('');
    this.cursorPos.set(0);
  }

  callMatchedContact(match: ContactItem) {
    this.phoneState.startCall(match.name, match.phone, false);
  }

  callFromLog(call: Call) {
    const contact = this.phoneState.findContact(call.name);
    const phone = contact ? contact.phone : (call.phone || this.phoneState.lookupPhone(call.name));
    const isNonContact = !contact && !this.phoneState.isTrusted(phone);
    this.phoneState.startCall(contact ? contact.name : call.name, phone, isNonContact);
  }

  openCallDetails(call: Call) {
    const contact = (call.phone ? this.phoneState.findContactByPhone(call.phone) : undefined) ||
                    this.phoneState.findContact(call.name) ||
                    (call.phone ? this.phoneState.findContact(call.phone) : undefined);
    const phone = contact ? contact.phone : (call.phone || this.phoneState.lookupPhone(call.name));
    this.openContactDetailsRequest.emit({
      name: contact ? contact.name : call.name,
      phone,
      type: contact?.type || 'Mobile',
      avatar: contact?.avatar,
      color: contact?.color,
      email: contact?.email,
      organisation: contact?.organisation,
      group: contact?.group,
      ringtone: contact?.ringtone
    });
  }

  callTypedNumber() {
    const num = this.typedNumber().trim();

    if (!num) {
      const last = this.phoneState.getLastCalledNumber();
      if (last) {
        this.typedNumber.set(last.phone || last.name);
        this.cursorPos.set((last.phone || last.name).length);
      }
      return;
    }

    const contact = this.phoneState.findContact(num);
    if (contact) {
      this.phoneState.startCall(contact.name, contact.phone, false);
      return;
    }

    const isTrusted = this.phoneState.isTrusted(num);
    const isNonContact = !isTrusted;

    this.phoneState.startCall(num, num, isNonContact);
  }

  createNewContactFromDialer() {
    const phone = this.typedNumber().trim();
    this.phoneState.openAddContact({ phone });
  }

  saveToExistingContactFromDialer() {
    if (this.phoneState.contacts().length === 0) {
      this.createNewContactFromDialer();
      return;
    }
    this.isSaveExistingOpen.set(true);
  }

  selectExistingContactForSave(contact: ContactItem) {
    const newPhone = this.typedNumber().trim();
    this.isSaveExistingOpen.set(false);
    this.phoneState.openEditContact(
      {
        name: contact.name,
        phone: contact.phone,
        type: contact.type || 'Mobile',
        color: contact.color,
        email: contact.email,
        organisation: contact.organisation
      },
      newPhone || contact.phone
    );
  }

  sendMessageFromDialer() {
    const phone = this.typedNumber().trim();
    const contact = this.phoneState.findContact(phone);
    const name = contact ? contact.name : phone;
    this.phoneState.openChat(name, phone);
  }
}
