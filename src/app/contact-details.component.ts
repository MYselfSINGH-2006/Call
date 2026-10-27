import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import QRCode from 'qrcode';
import { PhoneState, ContactData } from './phone-state';

@Component({
  selector: 'app-contact-details',
  standalone: true,
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let theme = phoneState.currentTheme();
    @let c = resolvedContact();
    <div class="flex flex-col h-full relative z-[100] w-full select-none transition-colors duration-200 overflow-hidden"
         [style.background]="theme.isDark ? theme.rootBg : '#f2f3f5'"
         [style.color]="theme.primaryTextColor">

      <!-- Top App Bar: Back < on left, Contact Name when scrolled, Share QR & Share Number actions on right -->
      <div class="h-14 flex items-center justify-between px-3 shrink-0 pt-1 z-20"
           [style.background]="theme.topHeaderBarBg">
        <div class="flex items-center space-x-2 min-w-0">
          <button type="button"
                  class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 active:bg-black/10 transition-colors cursor-pointer shrink-0"
                  [style.color]="theme.primaryTextColor"
                  (click)="closeView.emit()"
                  aria-label="Go back">
            <mat-icon class="text-[22px] w-5.5 h-5.5">arrow_back_ios_new</mat-icon>
          </button>
          @if (isScrolled()) {
            <span class="text-[20px] font-medium truncate transition-opacity duration-150"
                  [style.color]="theme.primaryTextColor">{{ c.name }}</span>
          }
        </div>

        <!-- Top-Right Quick Share Actions: Share Contact Number & Share QR Code -->
        <div class="flex items-center space-x-1">
          <button type="button"
                  class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 active:bg-black/10 transition-colors cursor-pointer"
                  [style.color]="theme.primaryTextColor"
                  (click)="openShareNumberSheet()"
                  title="Share contact number"
                  aria-label="Share contact number">
            <mat-icon class="text-[21px] w-5 h-5">share</mat-icon>
          </button>
          <button type="button"
                  class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 active:bg-black/10 transition-colors cursor-pointer"
                  [style.color]="theme.primaryTextColor"
                  (click)="openQrShareSheet()"
                  title="Share contact via QR code"
                  aria-label="Show contact QR code">
            <mat-icon class="text-[22px] w-5.5 h-5.5">qr_code_2</mat-icon>
          </button>
        </div>
      </div>

      <!-- Main Scrollable Contact Details Content -->
      <div class="flex-1 overflow-y-auto pb-24 transition-colors duration-200"
           (scroll)="onContentScroll($event)"
           [style.color]="theme.primaryTextColor">

        <!-- Header Profile Avatar & Name -->
        <div class="flex flex-col items-center mt-2 mb-5 px-4">
          @if (c.avatar) {
            <img [src]="c.avatar"
                 alt="{{ c.name }}"
                 class="w-24 h-24 rounded-full object-cover shadow-sm mb-3"
                 referrerpolicy="no-referrer" />
          } @else {
            <div class="w-24 h-24 rounded-full flex items-center justify-center font-normal text-[38px] text-white shadow-xs mb-3"
                 [style.background]="c.color || '#6ec3c1'">
              {{ c.name ? c.name[0].toUpperCase() : 'C' }}
            </div>
          }
          <h2 class="text-[26px] font-normal text-center leading-tight"
              [style.color]="theme.primaryTextColor">{{ c.name }}</h2>
          @if (c.organisation) {
            <p class="text-[13px] mt-0.5" [style.color]="theme.secondaryTextColor">{{ c.organisation }}</p>
          }
        </div>

        <!-- Card 1: Phone Number + Connected Apps (Default SMS & WhatsApp Call/Chat) -->
        <div class="mx-3 rounded-[20px] px-4 py-3 mb-3 shadow-2xs"
             [style.background]="theme.isDark ? theme.cardBg : '#ffffff'">
          <!-- Primary Phone Row -->
          <div class="flex justify-between items-center py-1.5">
            <button type="button"
                    class="flex flex-col flex-1 mr-3 text-left cursor-pointer active:opacity-70"
                    (click)="startCall()">
              <span class="text-[16px] font-normal leading-snug"
                    [style.color]="theme.primaryTextColor">{{ c.phone }}</span>
              <span class="text-[13px] leading-snug mt-0.5"
                    [style.color]="theme.secondaryTextColor">Mobile</span>
            </button>
            <!-- Right 3 Action Icons: Call, Video, Default SMS Message -->
            <div class="flex items-center space-x-3 shrink-0">
              <button type="button"
                      class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-black/5 active:scale-90 transition-all cursor-pointer"
                      [style.color]="theme.primaryTextColor"
                      (click)="startCall()"
                      aria-label="Call contact">
                <mat-icon class="text-[21px] w-5 h-5">call</mat-icon>
              </button>
              <button type="button"
                      class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-black/5 active:scale-90 transition-all cursor-pointer"
                      [style.color]="theme.primaryTextColor"
                      (click)="startVideo()"
                      aria-label="Video call">
                <mat-icon class="text-[21px] w-5 h-5">videocam</mat-icon>
              </button>
              <button type="button"
                      class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-black/5 active:scale-90 transition-all cursor-pointer"
                      [style.color]="theme.primaryTextColor"
                      (click)="startDefaultSms()"
                      title="Open in default messaging app"
                      aria-label="Send SMS in default messaging app">
                <mat-icon class="text-[20px] w-5 h-5">chat_bubble_outline</mat-icon>
              </button>
            </div>
          </div>

          <!-- Connected Accounts Section: WhatsApp Call & WhatsApp Message for this Contact -->
          <div class="border-t mt-2 pt-2.5" [style.borderColor]="theme.dividerColor">
            <div class="flex justify-between items-center py-1.5">
              <button type="button"
                      class="flex flex-col flex-1 text-left cursor-pointer active:opacity-75"
                      (click)="startWhatsAppChat()">
                <div class="flex items-center space-x-2">
                  <span class="w-2 h-2 rounded-full bg-[#25D366] shrink-0"></span>
                  <span class="text-[15px] font-normal" [style.color]="theme.primaryTextColor">WhatsApp</span>
                </div>
                <span class="text-[12px] mt-0.5" [style.color]="theme.secondaryTextColor">{{ c.phone }}</span>
              </button>
              <div class="flex items-center space-x-3 shrink-0">
                <!-- WhatsApp Voice Call Button: Redirects to WhatsApp Call for this contact -->
                <button type="button"
                        class="w-9 h-9 flex items-center justify-center rounded-full bg-[#25D366]/10 text-[#1da851] hover:bg-[#25D366]/20 active:scale-90 transition-all cursor-pointer"
                        (click)="startWhatsAppCall()"
                        title="WhatsApp Call {{ c.name }}"
                        aria-label="WhatsApp voice call">
                  <mat-icon class="text-[20px] w-5 h-5">call</mat-icon>
                </button>
                <!-- WhatsApp Message Button: Redirects to WhatsApp Chat for this contact -->
                <button type="button"
                        class="w-9 h-9 flex items-center justify-center rounded-full bg-[#25D366]/10 text-[#1da851] hover:bg-[#25D366]/20 active:scale-90 transition-all cursor-pointer"
                        (click)="startWhatsAppChat()"
                        title="WhatsApp Message {{ c.name }}"
                        aria-label="WhatsApp message">
                  <mat-icon class="text-[20px] w-5 h-5">chat_bubble_outline</mat-icon>
                </button>
              </div>
            </div>

            @if (c.email) {
              <div class="border-t my-1.5 pt-2 flex justify-between items-center" [style.borderColor]="theme.dividerColor">
                <div class="flex flex-col">
                  <span class="text-[14px]" [style.color]="theme.primaryTextColor">{{ c.email }}</span>
                  <span class="text-[12px]" [style.color]="theme.secondaryTextColor">Email</span>
                </div>
              </div>
            }
          </div>
        </div>


        <!-- Card 3: Ringtone Card -->
        <div class="mx-3 rounded-[20px] px-4 py-3.5 mb-3 shadow-2xs flex items-center justify-between cursor-pointer active:opacity-80"
             [style.background]="theme.isDark ? theme.cardBg : '#ffffff'"
             (click)="isRingtoneModalOpen.set(true)"
             (keyup.enter)="isRingtoneModalOpen.set(true)"
             tabindex="0"
             role="button">
          <div class="flex flex-col">
            <span class="text-[16px] font-normal leading-snug" [style.color]="theme.primaryTextColor">{{ c.ringtone || 'Default' }}</span>
            <span class="text-[13px] leading-snug" [style.color]="theme.secondaryTextColor">Ringtone</span>
          </div>
          <mat-icon class="text-[20px] w-5 h-5" [style.color]="theme.secondaryTextColor">chevron_right</mat-icon>
        </div>

        <!-- Card 4: CALL LOG Section with Blue 'Clear' Button -->
        <div class="mx-3 mb-6">
          <div class="flex items-center justify-between px-3 mb-1.5">
            <span class="text-[12px] font-medium uppercase tracking-wider"
                  [style.color]="theme.secondaryTextColor">CALL LOG</span>
            @if (contactCallHistory().length > 0) {
              <button type="button"
                      class="text-[13px] font-medium cursor-pointer hover:opacity-80 px-1 py-0.5"
                      [style.color]="theme.accentColor"
                      (click)="clearContactHistory()">
                Clear
              </button>
            }
          </div>

          <div class="rounded-[20px] px-4 py-2 shadow-2xs"
               [style.background]="theme.isDark ? theme.cardBg : '#ffffff'">
            @if (contactCallHistory().length > 0) {
              <div class="flex flex-col divide-y" [style.borderColor]="theme.dividerColor">
                @for (call of contactCallHistory(); track call.id) {
                  <button type="button"
                          class="w-full text-left py-3 flex flex-col cursor-pointer hover:bg-black/5 rounded-xl px-1 transition-colors"
                          [style.borderColor]="theme.dividerColor"
                          (click)="startCall()">
                    <span class="text-[15px] font-normal leading-snug"
                          [style.color]="call.type === 'missed' ? '#e53935' : theme.primaryTextColor">
                      {{ call.detailTimestamp || call.time }}
                    </span>
                    <div class="flex items-center space-x-1.5 mt-0.5">
                      @if (call.type === 'missed') {
                        <mat-icon class="text-[13px] w-3.5 h-3.5 text-[#e53935]">call_missed</mat-icon>
                      } @else if (call.type === 'incoming') {
                        <mat-icon class="text-[13px] w-3.5 h-3.5" [style.color]="theme.secondaryTextColor">call_received</mat-icon>
                      } @else {
                        <mat-icon class="text-[13px] w-3.5 h-3.5" [style.color]="theme.secondaryTextColor">north_east</mat-icon>
                      }
                      <svg viewBox="0 0 16 12" class="w-3.5 h-2.5 shrink-0 fill-none stroke-current opacity-65"
                           [style.color]="theme.secondaryTextColor" stroke-width="1.3">
                        <rect x="1" y="1" width="14" height="10" rx="1.8" />
                        <line x1="5" y1="4" x2="11" y2="4" />
                        <line x1="5" y1="8" x2="9" y2="8" />
                      </svg>
                      <span class="text-[12px] leading-snug" [style.color]="theme.secondaryTextColor">
                        {{ call.phone || c.phone }}
                      </span>
                    </div>
                    <span class="text-[13px] leading-snug mt-0.5" [style.color]="theme.secondaryTextColor">
                      {{ call.detailStatus || (call.type === 'missed' ? 'Rejected' : 'Cancelled') }}
                    </span>
                  </button>
                }
              </div>
            } @else {
              <div class="flex flex-col text-center py-6" [style.color]="theme.secondaryTextColor">
                <span class="text-[14px]">No call log with this contact</span>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- HONOR BOTTOM 3-ACTION BAR: Favourite / Unfavourite | Edit | More -->
      <div class="absolute bottom-0 left-0 right-0 h-[60px] flex items-center justify-around border-t z-30 px-2"
           [style.background]="theme.isDark ? theme.bottomNavBg : '#ffffff'"
           [style.borderColor]="theme.dividerColor">
        <!-- 1. Favourite / Unfavourite Button -->
        <button type="button"
                class="flex-1 h-full flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-transform"
                [style.color]="theme.primaryTextColor"
                (click)="toggleFav()">
          <mat-icon class="text-[22px] w-5.5 h-5.5 mb-0.5">{{ isFav() ? 'star' : 'star_border' }}</mat-icon>
          <span class="text-[11px] font-normal leading-none">{{ isFav() ? 'Unfavourite' : 'Favourite' }}</span>
        </button>

        <!-- 2. Edit Button -->
        <button type="button"
                class="flex-1 h-full flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-transform"
                [style.color]="theme.primaryTextColor"
                (click)="editContact()">
          <svg viewBox="0 0 24 24" class="w-5 h-5 mb-0.5 fill-none stroke-current" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          <span class="text-[11px] font-normal leading-none">Edit</span>
        </button>

        <!-- 3. More Button (4 vertical dots matching Honor) -->
        <button type="button"
                class="flex-1 h-full flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-transform"
                [style.color]="theme.primaryTextColor"
                (click)="isMoreMenuOpen.set(!isMoreMenuOpen())">
          <svg viewBox="0 0 24 24" class="w-5 h-5 mb-0.5 fill-current">
            <circle cx="12" cy="4.5" r="1.6" />
            <circle cx="12" cy="9.5" r="1.6" />
            <circle cx="12" cy="14.5" r="1.6" />
            <circle cx="12" cy="19.5" r="1.6" />
          </svg>
          <span class="text-[11px] font-normal leading-none">More</span>
        </button>
      </div>

      <!-- HONOR 'MORE' POPUP MENU (Includes both Share QR & Share Contact Number!) -->
      @if (isMoreMenuOpen()) {
        <div class="fixed inset-0 z-40"
             (click)="isMoreMenuOpen.set(false)"
             (keyup.enter)="isMoreMenuOpen.set(false)"
             tabindex="0"
             role="button"
             aria-label="Close more menu"></div>
        <div class="absolute bottom-[66px] right-3 w-[245px] bg-white rounded-[22px] shadow-[0_8px_32px_rgba(0,0,0,0.18)] py-2 z-50 text-[#191919] border border-black/5 animate-fade-in">
          <button type="button"
                  class="w-full text-left px-5 py-2.5 text-[15px] hover:bg-black/5 active:bg-black/10 transition-colors flex items-center justify-between cursor-pointer"
                  (click)="isMoreMenuOpen.set(false); openQrShareSheet()">
            <span>Share QR code</span>
            <mat-icon class="text-[18px] w-4.5 h-4.5 text-[#007dff]">qr_code_2</mat-icon>
          </button>
          <button type="button"
                  class="w-full text-left px-5 py-2.5 text-[15px] hover:bg-black/5 active:bg-black/10 transition-colors flex items-center justify-between cursor-pointer"
                  (click)="isMoreMenuOpen.set(false); openShareNumberSheet()">
            <span>Share contact number</span>
            <mat-icon class="text-[18px] w-4.5 h-4.5 text-emerald-600">share</mat-icon>
          </button>
          <button type="button"
                  class="w-full text-left px-5 py-2.5 text-[15px] hover:bg-black/5 active:bg-black/10 transition-colors cursor-pointer"
                  (click)="toggleBlock()">
            {{ isBlocked() ? 'Unblock contact' : 'Block contact' }}
          </button>
          <button type="button"
                  class="w-full text-left px-5 py-2.5 text-[15px] hover:bg-black/5 active:bg-black/10 transition-colors cursor-pointer"
                  (click)="copyContactInfo()">
            Copy
          </button>
          <button type="button"
                  class="w-full text-left px-5 py-2.5 text-[15px] hover:bg-black/5 active:bg-black/10 transition-colors cursor-pointer"
                  (click)="isMoreMenuOpen.set(false); clearContactHistory()">
            Erase history
          </button>
          <button type="button"
                  class="w-full text-left px-5 py-2.5 text-[15px] hover:bg-black/5 active:bg-black/10 transition-colors flex items-center justify-between cursor-pointer"
                  (click)="toggleVoicemail()">
            <span>All calls to voicemail</span>
            <span class="w-[18px] h-[18px] rounded-[4px] border flex items-center justify-center transition-colors"
                  [class.bg-[#007dff]]="isVoicemail()"
                  [class.border-[#007dff]]="isVoicemail()"
                  [class.border-gray-400]="!isVoicemail()">
              @if (isVoicemail()) {
                <mat-icon class="text-white text-[14px] w-3.5 h-3.5 leading-none">check</mat-icon>
              }
            </span>
          </button>
          <button type="button"
                  class="w-full text-left px-5 py-2.5 text-[15px] text-[#b83333] hover:bg-black/5 active:bg-black/10 transition-colors cursor-pointer"
                  (click)="isMoreMenuOpen.set(false); deleteThisContact()">
            Delete contact
          </button>
        </div>
      }

      <!-- ========================================================================= -->
      <!-- FEATURE 1: SHARE QR CODE BOTTOM SHEET MODAL (Real Scannable QR + Apps)    -->
      <!-- ========================================================================= -->
      @if (isQrSheetOpen()) {
        <div class="fixed inset-0 bg-black/45 z-50 flex flex-col justify-end"
             (click)="isQrSheetOpen.set(false)"
             (keyup.enter)="isQrSheetOpen.set(false)"
             tabindex="0"
             role="button"
             aria-label="Close QR sheet">
          <div class="bg-[#f2f3f5] rounded-t-[28px] pt-6 pb-6 px-5 flex flex-col items-center shadow-2xl animate-fade-in text-gray-900"
               (click)="$event.stopPropagation()"
               (keydown)="$event.stopPropagation()"
               tabindex="0"
               role="dialog">

            <div class="flex items-center justify-between w-full mb-3 px-1">
              <div class="flex flex-col">
                <h3 class="text-[17px] font-bold text-gray-900">{{ c.name }}</h3>
                <span class="text-[13px] font-mono text-gray-600">{{ c.phone }}</span>
              </div>
              <button type="button"
                      class="px-3 py-1 rounded-full bg-white text-[#007dff] text-xs font-semibold shadow-2xs cursor-pointer"
                      (click)="isQrSheetOpen.set(false); openShareNumberSheet()">
                Switch to Share Number
              </button>
            </div>

            <!-- Real Scannable QR Code Card with Contact Avatar in the Center -->
            <div class="w-56 h-56 bg-white rounded-2xl p-3 shadow-xs flex items-center justify-center relative mb-2.5">
              @if (qrCodeDataUrl()) {
                <img [src]="qrCodeDataUrl()"
                     alt="Contact QR Code for {{ c.name }}"
                     class="w-full h-full object-contain rounded-lg" />
              } @else {
                <div class="text-xs text-gray-400">Generating QR...</div>
              }
              <!-- Center Contact Avatar Overlay -->
              <div class="absolute w-11 h-11 rounded-full border-2 border-white shadow-md overflow-hidden flex items-center justify-center text-white font-semibold text-base"
                   [style.background]="c.color || '#6ec3c1'">
                @if (c.avatar) {
                  <img [src]="c.avatar" alt="{{ c.name }}" class="w-full h-full object-cover" referrerpolicy="no-referrer" />
                } @else {
                  {{ c.name ? c.name[0].toUpperCase() : 'C' }}
                }
              </div>
            </div>

            <p class="text-[12px] text-[#666666] mb-3.5">Scan QR code with any camera to add {{ c.name }} ({{ c.phone }})</p>

            <!-- Sharing Platforms Grid for QR + Contact Info -->
            <div class="w-full bg-white rounded-2xl p-3 mb-4 shadow-2xs">
              <div class="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2.5 px-1">
                Share QR &amp; Contact via Platform
              </div>
              <div class="grid grid-cols-5 gap-2 text-center">
                <!-- 1. All Apps (System Share Sheet) -->
                <button type="button"
                        class="flex flex-col items-center justify-center p-1.5 rounded-xl hover:bg-gray-50 active:scale-95 transition-all cursor-pointer"
                        (click)="shareQrViaSystem()">
                  <div class="w-10 h-10 rounded-full bg-[#007dff]/10 text-[#007dff] flex items-center justify-center mb-1">
                    <mat-icon class="text-[20px] w-5 h-5">ios_share</mat-icon>
                  </div>
                  <span class="text-[11px] text-gray-700 font-medium leading-tight">All Apps</span>
                </button>

                <!-- 2. WhatsApp -->
                <button type="button"
                        class="flex flex-col items-center justify-center p-1.5 rounded-xl hover:bg-gray-50 active:scale-95 transition-all cursor-pointer"
                        (click)="shareViaPlatform('whatsapp')">
                  <div class="w-10 h-10 rounded-full bg-[#25D366]/15 text-[#1da851] flex items-center justify-center mb-1">
                    <mat-icon class="text-[20px] w-5 h-5">chat</mat-icon>
                  </div>
                  <span class="text-[11px] text-gray-700 font-medium leading-tight">WhatsApp</span>
                </button>

                <!-- 3. Default SMS App -->
                <button type="button"
                        class="flex flex-col items-center justify-center p-1.5 rounded-xl hover:bg-gray-50 active:scale-95 transition-all cursor-pointer"
                        (click)="shareViaPlatform('sms')">
                  <div class="w-10 h-10 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center mb-1">
                    <mat-icon class="text-[20px] w-5 h-5">sms</mat-icon>
                  </div>
                  <span class="text-[11px] text-gray-700 font-medium leading-tight">Messages</span>
                </button>

                <!-- 4. Gmail -->
                <button type="button"
                        class="flex flex-col items-center justify-center p-1.5 rounded-xl hover:bg-gray-50 active:scale-95 transition-all cursor-pointer"
                        (click)="shareViaPlatform('gmail')">
                  <div class="w-10 h-10 rounded-full bg-red-500/10 text-red-600 flex items-center justify-center mb-1">
                    <mat-icon class="text-[20px] w-5 h-5">mail</mat-icon>
                  </div>
                  <span class="text-[11px] text-gray-700 font-medium leading-tight">Gmail</span>
                </button>

                <!-- 5. Save / Download QR Image -->
                <button type="button"
                        class="flex flex-col items-center justify-center p-1.5 rounded-xl hover:bg-gray-50 active:scale-95 transition-all cursor-pointer"
                        (click)="downloadQrImage()">
                  <div class="w-10 h-10 rounded-full bg-purple-500/10 text-purple-600 flex items-center justify-center mb-1">
                    <mat-icon class="text-[20px] w-5 h-5">download</mat-icon>
                  </div>
                  <span class="text-[11px] text-gray-700 font-medium leading-tight">Save QR</span>
                </button>
              </div>
            </div>

            <!-- Cancel | Share QR Pill Buttons -->
            <div class="w-full flex items-center space-x-3">
              <button type="button"
                      class="flex-1 py-2.5 rounded-full bg-[#e3e5e8] hover:bg-[#d8dade] text-[#007dff] font-medium text-[15px] transition-colors cursor-pointer"
                      (click)="isQrSheetOpen.set(false)">
                Cancel
              </button>
              <button type="button"
                      class="flex-1 py-2.5 rounded-full bg-[#007dff] hover:bg-blue-600 text-white font-medium text-[15px] transition-colors cursor-pointer flex items-center justify-center space-x-1.5 shadow-sm"
                      (click)="shareQrViaSystem()">
                <mat-icon class="text-[18px] w-4.5 h-4.5">share</mat-icon>
                <span>Share QR</span>
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ========================================================================= -->
      <!-- FEATURE 2: SHARE CONTACT NUMBER SHEET (Shares Name + Number to All Apps)  -->
      <!-- ========================================================================= -->
      @if (isShareNumberSheetOpen()) {
        <div class="fixed inset-0 bg-black/45 z-50 flex flex-col justify-end"
             (click)="isShareNumberSheetOpen.set(false)"
             (keyup.enter)="isShareNumberSheetOpen.set(false)"
             tabindex="0"
             role="button"
             aria-label="Close share contact number sheet">
          <div class="bg-[#f2f3f5] rounded-t-[28px] pt-6 pb-6 px-5 flex flex-col items-center shadow-2xl animate-fade-in text-gray-900"
               (click)="$event.stopPropagation()"
               (keydown)="$event.stopPropagation()"
               tabindex="0"
               role="dialog">

            <div class="flex items-center justify-between w-full mb-3 px-1">
              <div class="flex items-center space-x-2">
                <div class="w-9 h-9 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
                  <mat-icon class="text-[20px] w-5 h-5">contact_phone</mat-icon>
                </div>
                <div>
                  <h3 class="text-[17px] font-bold text-gray-900 leading-tight">Share Contact Number</h3>
                  <span class="text-[12px] text-gray-500">Shares contact name &amp; phone number</span>
                </div>
              </div>
              <button type="button"
                      class="px-3 py-1 rounded-full bg-white text-[#007dff] text-xs font-semibold shadow-2xs cursor-pointer"
                      (click)="isShareNumberSheetOpen.set(false); openQrShareSheet()">
                Share via QR
              </button>
            </div>

            <!-- Contact Name + Number Preview Box -->
            <div class="w-full bg-white rounded-2xl p-4 mb-3.5 shadow-2xs border border-black/5 flex items-center justify-between">
              <div class="flex items-center space-x-3 min-w-0">
                <div class="w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold text-lg shrink-0"
                     [style.background]="c.color || '#6ec3c1'">
                  {{ c.name ? c.name[0].toUpperCase() : 'C' }}
                </div>
                <div class="flex flex-col min-w-0">
                  <span class="text-[16px] font-bold text-gray-900 truncate">{{ c.name }}</span>
                  <span class="text-[14px] font-mono text-[#007dff] truncate">{{ c.phone }}</span>
                </div>
              </div>
              <button type="button"
                      class="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold cursor-pointer shrink-0 flex items-center space-x-1"
                      (click)="shareViaPlatform('copy')">
                <mat-icon class="text-[15px] w-4 h-4">content_copy</mat-icon>
                <span>{{ copiedToast() ? 'Copied!' : 'Copy' }}</span>
              </button>
            </div>

            <!-- All Sharing Platforms Grid -->
            <div class="w-full bg-white rounded-2xl p-3.5 mb-4 shadow-2xs">
              <div class="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-3 px-1">
                Choose Sharing Platform
              </div>
              <div class="grid grid-cols-3 gap-2.5">
                <!-- 1. All Apps (System Share Chooser) -->
                <button type="button"
                        class="flex items-center space-x-2.5 p-2.5 rounded-xl bg-blue-50/70 hover:bg-blue-100/70 active:scale-97 transition-all cursor-pointer text-left"
                        (click)="shareNumberViaSystem()">
                  <div class="w-9 h-9 rounded-full bg-[#007dff] text-white flex items-center justify-center shrink-0">
                    <mat-icon class="text-[19px] w-5 h-5">share</mat-icon>
                  </div>
                  <div class="flex flex-col min-w-0">
                    <span class="text-xs font-bold text-gray-900 truncate">All Apps</span>
                    <span class="text-[10px] text-gray-500 truncate">System Share</span>
                  </div>
                </button>

                <!-- 2. WhatsApp -->
                <button type="button"
                        class="flex items-center space-x-2.5 p-2.5 rounded-xl bg-emerald-50/70 hover:bg-emerald-100/70 active:scale-97 transition-all cursor-pointer text-left"
                        (click)="shareViaPlatform('whatsapp')">
                  <div class="w-9 h-9 rounded-full bg-[#25D366] text-white flex items-center justify-center shrink-0">
                    <mat-icon class="text-[19px] w-5 h-5">chat</mat-icon>
                  </div>
                  <div class="flex flex-col min-w-0">
                    <span class="text-xs font-bold text-gray-900 truncate">WhatsApp</span>
                    <span class="text-[10px] text-gray-500 truncate">Send chat</span>
                  </div>
                </button>

                <!-- 3. Default SMS Messages -->
                <button type="button"
                        class="flex items-center space-x-2.5 p-2.5 rounded-xl bg-sky-50/70 hover:bg-sky-100/70 active:scale-97 transition-all cursor-pointer text-left"
                        (click)="shareViaPlatform('sms')">
                  <div class="w-9 h-9 rounded-full bg-sky-500 text-white flex items-center justify-center shrink-0">
                    <mat-icon class="text-[19px] w-5 h-5">sms</mat-icon>
                  </div>
                  <div class="flex flex-col min-w-0">
                    <span class="text-xs font-bold text-gray-900 truncate">Messages</span>
                    <span class="text-[10px] text-gray-500 truncate">Default SMS</span>
                  </div>
                </button>

                <!-- 4. Gmail -->
                <button type="button"
                        class="flex items-center space-x-2.5 p-2.5 rounded-xl bg-red-50/70 hover:bg-red-100/70 active:scale-97 transition-all cursor-pointer text-left"
                        (click)="shareViaPlatform('gmail')">
                  <div class="w-9 h-9 rounded-full bg-red-500 text-white flex items-center justify-center shrink-0">
                    <mat-icon class="text-[19px] w-5 h-5">mail</mat-icon>
                  </div>
                  <div class="flex flex-col min-w-0">
                    <span class="text-xs font-bold text-gray-900 truncate">Gmail</span>
                    <span class="text-[10px] text-gray-500 truncate">Send email</span>
                  </div>
                </button>

                <!-- 5. Telegram -->
                <button type="button"
                        class="flex items-center space-x-2.5 p-2.5 rounded-xl bg-indigo-50/70 hover:bg-indigo-100/70 active:scale-97 transition-all cursor-pointer text-left"
                        (click)="shareViaPlatform('telegram')">
                  <div class="w-9 h-9 rounded-full bg-[#24A1DE] text-white flex items-center justify-center shrink-0">
                    <mat-icon class="text-[19px] w-5 h-5">send</mat-icon>
                  </div>
                  <div class="flex flex-col min-w-0">
                    <span class="text-xs font-bold text-gray-900 truncate">Telegram</span>
                    <span class="text-[10px] text-gray-500 truncate">Share text</span>
                  </div>
                </button>

                <!-- 6. vCard (.vcf) File -->
                <button type="button"
                        class="flex items-center space-x-2.5 p-2.5 rounded-xl bg-purple-50/70 hover:bg-purple-100/70 active:scale-97 transition-all cursor-pointer text-left"
                        (click)="shareContactVcf()">
                  <div class="w-9 h-9 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0">
                    <mat-icon class="text-[19px] w-5 h-5">contact_page</mat-icon>
                  </div>
                  <div class="flex flex-col min-w-0">
                    <span class="text-xs font-bold text-gray-900 truncate">vCard File</span>
                    <span class="text-[10px] text-gray-500 truncate">Export .vcf</span>
                  </div>
                </button>
              </div>
            </div>

            <!-- Cancel | Share Contact Number Pill Buttons -->
            <div class="w-full flex items-center space-x-3">
              <button type="button"
                      class="flex-1 py-2.5 rounded-full bg-[#e3e5e8] hover:bg-[#d8dade] text-[#007dff] font-medium text-[15px] transition-colors cursor-pointer"
                      (click)="isShareNumberSheetOpen.set(false)">
                Cancel
              </button>
              <button type="button"
                      class="flex-1 py-2.5 rounded-full bg-[#007dff] hover:bg-blue-600 text-white font-medium text-[15px] transition-colors cursor-pointer flex items-center justify-center space-x-1.5 shadow-sm"
                      (click)="shareNumberViaSystem()">
                <mat-icon class="text-[18px] w-4.5 h-4.5">share</mat-icon>
                <span>Share Number</span>
              </button>
            </div>
          </div>
        </div>
      }

      <!-- RINGTONE SELECTOR MODAL -->
      @if (isRingtoneModalOpen()) {
        <div class="fixed inset-0 bg-black/40 z-50 flex flex-col justify-end"
             (click)="isRingtoneModalOpen.set(false)"
             (keyup.enter)="isRingtoneModalOpen.set(false)"
             tabindex="0"
             role="button"
             aria-label="Close ringtone modal">
          <div class="bg-white rounded-t-[28px] p-5 shadow-2xl text-gray-900 animate-fade-in"
               (click)="$event.stopPropagation()"
               (keydown)="$event.stopPropagation()"
               tabindex="0"
               role="dialog">
            <h3 class="text-[18px] font-medium mb-3 px-1">Select Ringtone</h3>
            <div class="divide-y divide-gray-100">
              @for (tone of ringtoneOptions; track tone) {
                <button type="button"
                        class="w-full py-3 px-2 flex items-center justify-between text-left hover:bg-gray-50 rounded-xl cursor-pointer"
                        (click)="selectRingtone(tone)">
                  <span class="text-[15px]" [class.text-[#007dff]]="(c.ringtone || 'Default') === tone" [class.font-medium]="(c.ringtone || 'Default') === tone">{{ tone }}</span>
                  @if ((c.ringtone || 'Default') === tone) {
                    <mat-icon class="text-[#007dff] text-[20px] w-5 h-5">check</mat-icon>
                  }
                </button>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class ContactDetailsComponent {
  phoneState = inject(PhoneState);
  contact = input<ContactData>({ name: 'Contact', phone: '+91 98773 63313', type: 'Mobile' });
  closeView = output<void>();

  isScrolled = signal(false);
  isMoreMenuOpen = signal(false);
  isQrSheetOpen = signal(false);
  isShareNumberSheetOpen = signal(false);
  isRingtoneModalOpen = signal(false);
  copiedToast = signal(false);
  qrCodeDataUrl = signal<string>('');

  ringtoneOptions = ['Default', 'Honor Tune', 'Classic Bell', 'Horizon Pulse', 'Silent'];

  resolvedContact = computed<ContactData>(() => {
    const inp = this.contact();
    const match = (inp.phone ? this.phoneState.findContactByPhone(inp.phone) : undefined) ||
                  this.phoneState.findContact(inp.name) ||
                  (inp.phone ? this.phoneState.findContact(inp.phone) : undefined);
    if (match) {
      return {
        ...inp,
        ...match,
        type: match.type || inp.type || 'Mobile'
      };
    }
    return inp;
  });

  constructor() {
    effect(() => {
      const c = this.resolvedContact();
      this.generateRealQrCode(c);
    });
  }

  private async generateRealQrCode(c: ContactData) {
    try {
      const vcardPayload = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `FN:${c.name || 'Contact'}`,
        `TEL;TYPE=CELL:${c.phone || ''}`,
        c.email ? `EMAIL:${c.email}` : '',
        'END:VCARD'
      ].filter(Boolean).join('\n');

      const dataUrl = await QRCode.toDataURL(vcardPayload, {
        width: 480,
        margin: 1,
        errorCorrectionLevel: 'H',
        color: {
          dark: '#111111',
          light: '#ffffff'
        }
      });
      this.qrCodeDataUrl.set(dataUrl);
    } catch {
      this.qrCodeDataUrl.set('');
    }
  }

  isFav = computed(() => {
    const c = this.resolvedContact();
    return this.phoneState.isFavourite(c.name, c.phone);
  });

  isBlocked = computed(() => {
    return this.phoneState.isContactBlocked(this.resolvedContact().phone);
  });

  isVoicemail = computed(() => {
    return this.phoneState.isAllCallsToVoicemail(this.resolvedContact().phone);
  });

  contactCallHistory = computed(() => {
    const c = this.resolvedContact();
    const name = c.name.toLowerCase();
    const phoneKey = this.phoneState.getCanonicalPhoneKey(c.phone);
    return this.phoneState.calls().filter(call => {
      const matchName = call.name.toLowerCase() === name;
      const callKey = this.phoneState.getCanonicalPhoneKey(call.phone || call.name);
      return matchName || (phoneKey.length >= 4 && callKey === phoneKey);
    });
  });

  onContentScroll(event: Event) {
    const el = event.target as HTMLElement;
    this.isScrolled.set((el?.scrollTop || 0) > 85);
  }

  toggleFav() {
    this.phoneState.toggleFavourite(this.resolvedContact());
  }

  editContact() {
    this.phoneState.openEditContact(this.resolvedContact());
  }

  startCall() {
    const c = this.resolvedContact();
    this.phoneState.startCall(c.name, c.phone);
  }

  startDefaultSms() {
    const c = this.resolvedContact();
    this.phoneState.openDefaultSmsApp(c.phone);
  }

  startWhatsAppCall() {
    const c = this.resolvedContact();
    this.phoneState.openWhatsAppCall(c.phone, c.name);
  }

  startWhatsAppChat() {
    const c = this.resolvedContact();
    this.phoneState.openWhatsAppChat(c.phone, c.name);
  }

  startVideo() {
    const c = this.resolvedContact();
    this.phoneState.startVideoCall(c.name, c.phone);
  }

  openQrShareSheet() {
    const c = this.resolvedContact();
    this.generateRealQrCode(c);
    this.isQrSheetOpen.set(true);
  }

  openShareNumberSheet() {
    this.isShareNumberSheetOpen.set(true);
  }

  async shareQrViaSystem() {
    const c = this.resolvedContact();
    if (!this.qrCodeDataUrl()) {
      await this.generateRealQrCode(c);
    }
    await this.phoneState.shareContactQrSystem(c, this.qrCodeDataUrl());
  }

  async shareNumberViaSystem() {
    const c = this.resolvedContact();
    await this.phoneState.shareContactNumberSystem(c);
  }

  shareViaPlatform(platform: 'whatsapp' | 'sms' | 'gmail' | 'telegram' | 'copy') {
    const c = this.resolvedContact();
    const mode = this.isQrSheetOpen() ? 'qr' : 'number';
    this.phoneState.shareContactViaPlatform(platform, c, mode, this.qrCodeDataUrl());
    if (platform === 'copy') {
      this.copiedToast.set(true);
      setTimeout(() => this.copiedToast.set(false), 1800);
    }
  }

  downloadQrImage() {
    const c = this.resolvedContact();
    const url = this.qrCodeDataUrl();
    if (!url || typeof document === 'undefined') return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(c.name || 'contact').replace(/\s+/g, '_')}_qr.png`;
    a.click();
  }

  clearContactHistory() {
    const c = this.resolvedContact();
    this.phoneState.requestClearContactCallHistory(c.name, c.phone);
  }

  toggleBlock() {
    this.phoneState.toggleBlockContact(this.resolvedContact().phone);
    this.isMoreMenuOpen.set(false);
  }

  toggleVoicemail() {
    this.phoneState.toggleAllCallsToVoicemail(this.resolvedContact().phone);
  }

  copyContactInfo() {
    const c = this.resolvedContact();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(`${c.name}: ${c.phone}`).catch(() => undefined);
    }
    this.isMoreMenuOpen.set(false);
  }

  shareContactVcf() {
    const c = this.resolvedContact();
    this.phoneState.exportContactsAsVcf({ name: c.name, phone: c.phone });
  }

  selectRingtone(tone: string) {
    this.phoneState.updateContactRingtone(this.resolvedContact().name, tone);
    this.isRingtoneModalOpen.set(false);
  }

  deleteThisContact() {
    this.phoneState.requestDeleteContact(this.resolvedContact(), undefined, () => {
      this.closeView.emit();
    });
  }
}
