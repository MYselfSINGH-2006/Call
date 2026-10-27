import { ChangeDetectionStrategy, Component, computed, effect, inject, output, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import QRCode from 'qrcode';
import { ALPHABET, ContactItem } from './data';
import { PhoneState, ContactData } from './phone-state';

@Component({
  selector: 'app-contacts',
  standalone: true,
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let theme = phoneState.currentTheme();
    <div class="flex flex-col h-full relative pb-[64px] transition-colors duration-200 select-none"
         [style.background]="theme.contactsBg"
         [style.color]="theme.primaryTextColor">
      
      <!-- Top Header Bar (Zero gap above Search contacts, matching Video 2 00:00-00:01) -->
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

            <!-- Honor 4-Dot Menu Button -->
            <button class="w-9 h-9 rounded-full transition-colors cursor-pointer flex items-center justify-center hover:bg-black/5 active:bg-black/10"
                    [style.color]="theme.primaryTextColor"
                    (click)="isMenuOpen.set(!isMenuOpen())"
                    aria-label="Menu">
              <svg viewBox="0 0 24 24" class="w-5 h-5 fill-current">
                <circle cx="12" cy="4.5" r="1.6" />
                <circle cx="12" cy="9.5" r="1.6" />
                <circle cx="12" cy="14.5" r="1.6" />
                <circle cx="12" cy="19.5" r="1.6" />
              </svg>
            </button>
          </div>
        </div>
        <div class="flex flex-col mb-1">
          <h1 class="text-[30px] font-normal leading-tight tracking-tight" [style.color]="theme.primaryTextColor">Contacts</h1>
          <span class="text-[13px] leading-tight mt-0.5" [style.color]="theme.secondaryTextColor">{{ phoneState.contacts().length }} contacts</span>
        </div>

        <!-- Menu Popup -->
        @if(isMenuOpen()) {
          <div class="fixed inset-0 z-40" (click)="isMenuOpen.set(false)" (keyup.enter)="isMenuOpen.set(false)" tabindex="0" role="button" aria-label="Close menu"></div>
          <div class="absolute right-4 top-12 bg-white rounded-2xl shadow-[0_6px_28px_rgba(0,0,0,0.18)] z-50 w-72 py-2 overflow-hidden border border-gray-100 text-gray-800 animate-fade-in">
            <!-- Anti-Bomber Shield (Block unknown callers & OTP spam silently) -->
            <button class="w-full text-left px-4 py-2.5 text-[14px] text-gray-800 font-normal hover:bg-gray-50 active:bg-gray-100 flex items-center justify-between cursor-pointer"
                    (click)="phoneState.toggleAntiBomber(); isMenuOpen.set(false)">
              <div class="flex items-center">
                <mat-icon class="mr-2.5 text-[18px] w-4.5 h-4.5" [class.text-emerald-600]="phoneState.antiBomber()" [class.text-red-500]="!phoneState.antiBomber()">security</mat-icon>
                <div class="flex flex-col">
                  <span class="font-semibold text-gray-900">Anti-Bomber Shield</span>
                  <span class="text-[11px] text-gray-500">Block unknown calls &amp; OTP spam silently</span>
                </div>
              </div>
              <span class="text-[11px] font-bold px-2 py-0.5 rounded-full"
                    [class.bg-emerald-100]="phoneState.antiBomber()"
                    [class.text-emerald-800]="phoneState.antiBomber()"
                    [class.bg-red-100]="!phoneState.antiBomber()"
                    [class.text-red-800]="!phoneState.antiBomber()">
                {{ phoneState.antiBomber() ? 'ON' : 'OFF' }}
              </span>
            </button>

            <!-- Unified Themes & Wallpapers (Applies to All Apps) -->
            <button class="w-full text-left px-4 py-2.5 text-[14px] text-gray-800 font-normal hover:bg-gray-50 active:bg-gray-100 flex items-center justify-between cursor-pointer"
                    (click)="phoneState.openThemeModal(); isMenuOpen.set(false)">
              <div class="flex items-center">
                <mat-icon class="text-pink-600 mr-2.5 text-[18px] w-4.5 h-4.5">palette</mat-icon>
                <div class="flex flex-col">
                  <span class="font-semibold text-gray-900">Wallpapers &amp; Themes</span>
                  <span class="text-[11px] text-gray-500">12+ Themes across Phone &amp; Contacts</span>
                </div>
              </div>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-50 text-pink-700 truncate max-w-[85px]">{{ theme.name }}</span>
            </button>

            <div class="border-t border-gray-100 my-1"></div>

            <!-- Save / Sync Contacts in Mobile or Gmail -->
            <button class="w-full text-left px-4 py-2.5 text-[14px] text-gray-800 font-normal hover:bg-gray-50 active:bg-gray-100 flex items-center justify-between cursor-pointer"
                    (click)="showBusinessCardsModal.set(true); isMenuOpen.set(false)">
              <div class="flex items-center">
                <mat-icon class="text-emerald-600 mr-2.5 text-[18px] w-4.5 h-4.5">import_contacts</mat-icon>
                <div class="flex flex-col">
                  <span class="font-medium text-gray-900">Save Contacts (Mobile / Gmail)</span>
                  <span class="text-[11px] text-gray-500">Phone (.vcf) &amp; Gmail (.csv) sync</span>
                </div>
              </div>
            </button>

            <button class="w-full text-left px-4 py-2.5 text-[14px] text-gray-800 font-normal hover:bg-gray-50 active:bg-gray-100 flex items-center justify-between cursor-pointer" (click)="phoneState.isForceDefaultModalOpen.set(true); isMenuOpen.set(false)">
              <div class="flex items-center">
                <mat-icon class="text-indigo-600 mr-2.5 text-[18px] w-4.5 h-4.5">admin_panel_settings</mat-icon>
                <span>Default App &amp; 2-App Split</span>
              </div>
              <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700">APK</span>
            </button>
          </div>
        }
      </div>
      
      <!-- Honor EMUI Rounded Pill Search Input (Placed directly below header with zero extra gap) -->
      <div class="px-4 mb-2 mt-1 shrink-0">
        <div class="rounded-full flex items-center px-4 py-2 transition-colors"
             [style.background]="theme.searchBarBg">
          <mat-icon class="mr-2 text-[20px] w-5 h-5" [style.color]="theme.secondaryTextColor">search</mat-icon>
          <input type="text"
                 [value]="searchQuery()"
                 (input)="searchQuery.set($any($event.target).value)"
                 placeholder="Search"
                 class="bg-transparent outline-none flex-1 text-[15px]"
                 [style.color]="theme.primaryTextColor" />
          @if(searchQuery()) {
            <button class="p-1 cursor-pointer" [style.color]="theme.secondaryTextColor" (click)="searchQuery.set('')" aria-label="Clear search">
              <mat-icon class="text-[18px] w-4.5 h-4.5">close</mat-icon>
            </button>
          }
        </div>
      </div>

      <!-- Contacts Main List + Right Alphabet Index -->
      <div class="relative flex-1 flex overflow-hidden">
        <div class="flex-1 overflow-y-auto pr-5" id="contacts-scroll-container">
           @if (!searchQuery()) {
             <!-- Honor Row: My card (MYself_SINGH / My card) -->
             <div class="flex items-center px-5 py-3 cursor-pointer hover:bg-black/5 transition-colors"
                  (click)="openMyCardModal()"
                  (keyup.enter)="openMyCardModal()"
                  tabindex="0"
                  role="button">
               <div class="w-10 h-10 rounded-full bg-[#6ec3c1] text-white flex items-center justify-center font-medium text-[16px] mr-4 shrink-0">
                 {{ phoneState.myProfile().name[0]?.toUpperCase() || 'M' }}
               </div>
               <div class="flex-1 flex flex-col justify-center">
                 <div class="text-[16px] font-normal leading-snug" [style.color]="theme.primaryTextColor">{{ phoneState.myProfile().name }}</div>
                 <span class="text-[13px] leading-snug" [style.color]="theme.secondaryTextColor">My card</span>
               </div>
             </div>
             <div class="ml-[76px] border-b" [style.borderColor]="theme.dividerColor"></div>
           }

           <!-- Alphabetical Groups & Contact Rows (Colored Circle Initial Avatars matching Video 2 00:01 & 00:07!) -->
           @for(group of groupedContacts(); track group.letter) {
             <div [id]="'contact-letter-' + group.letter"
                  class="px-5 pt-3 pb-1 text-[13px] font-medium"
                  [style.color]="theme.secondaryTextColor">{{ group.letter }}</div>
             @for(contact of group.contacts; track contact.phone) {
               <div class="flex items-center pl-5 pr-5 py-2.5 cursor-pointer hover:bg-black/5 transition-colors"
                    (click)="openDetails(contact)"
                    (keyup.enter)="openDetails(contact)"
                    tabindex="0"
                    role="button">
                 <!-- Colored Circle Avatar with White Initial Letter (or silhouette for '#') -->
                 @if (contact.avatar) {
                   <img [src]="contact.avatar" alt="{{ contact.name }}" class="w-10 h-10 rounded-full object-cover mr-4 shrink-0" referrerpolicy="no-referrer" />
                 } @else if (group.letter === '#') {
                   <div class="w-10 h-10 rounded-full flex items-center justify-center mr-4 shrink-0 text-white"
                        [style.background]="contact.color || '#facc15'">
                     <mat-icon class="text-[22px] w-5.5 h-5.5">person</mat-icon>
                   </div>
                 } @else {
                   <div class="w-10 h-10 rounded-full flex items-center justify-center mr-4 shrink-0 text-white text-[17px] font-normal"
                        [style.background]="contact.color || '#80cbc4'">
                     {{ contact.name[0]?.toUpperCase() || 'C' }}
                   </div>
                 }

                 <div class="flex-1 flex flex-col justify-center pr-2 min-w-0">
                   <div class="text-[16px] truncate font-normal" [style.color]="theme.primaryTextColor">{{ contact.name }}</div>
                   @if (searchQuery()) {
                     <div class="text-[12px] truncate" [style.color]="theme.secondaryTextColor">{{ contact.phone }}</div>
                   }
                 </div>

                 <!-- SIM Contact Indicator Icon (Matching Video 2 00:01 for Advance Talktime / airtel live) -->
                 @if (contact.isSim) {
                   <svg viewBox="0 0 14 16" class="w-3.5 h-4 shrink-0 fill-none stroke-current opacity-50"
                        [style.color]="theme.secondaryTextColor" stroke-width="1.3">
                     <path d="M3 1h6l3 3v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z" />
                     <rect x="4.5" y="7" width="5" height="5" rx="0.6" />
                   </svg>
                 }
               </div>
               <div class="ml-[76px] border-b" [style.borderColor]="theme.dividerColor"></div>
             }
           }
           @if (groupedContacts().length === 0) {
             <div class="text-center py-12 flex flex-col items-center" [style.color]="theme.secondaryTextColor">
               <mat-icon class="text-[48px] w-12 h-12 mb-2 opacity-50">person_search</mat-icon>
               <span class="text-base font-medium" [style.color]="theme.primaryTextColor">No contacts found</span>
               <button class="mt-3 px-4 py-2 rounded-xl text-sm font-medium cursor-pointer"
                       [style.background]="theme.callButtonBg"
                       [style.color]="theme.callButtonIconColor"
                       (click)="addFromSearch()">
                 + Create new contact
               </button>
             </div>
           }
           <div class="h-24"></div>
        </div>
        
        <!-- Working Right Alphabet Index Bar (# A - Z) -->
        @if (!searchQuery()) {
          <div class="absolute right-0.5 top-1 bottom-3 w-5 flex flex-col items-center justify-between z-10 text-[10px] font-medium py-1"
               [style.color]="theme.secondaryTextColor">
             @for(letter of alphabet; track letter) {
               <button type="button"
                       class="w-full text-center flex items-center justify-center cursor-pointer active:scale-125 transition-transform leading-none"
                       [style.color]="activeLetter() === letter ? '#007dff' : theme.secondaryTextColor"
                       [class.font-bold]="activeLetter() === letter"
                       (click)="scrollToLetter(letter)">
                 {{ letter }}
               </button>
             }
          </div>
        }
      </div>
      
      <!-- Honor Theme Floating Action Button (+) for Add Contact -->
      <button class="absolute bottom-[82px] right-6 w-[54px] h-[54px] rounded-full shadow-lg flex items-center justify-center z-20 active:scale-95 transition-transform cursor-pointer"
              [style.background]="theme.contactsFabBg"
              [style.color]="theme.contactsFabIconColor"
              [style.border]="theme.isDark ? '1.5px solid rgba(255,255,255,0.28)' : 'none'"
              (click)="phoneState.openAddContact()"
              aria-label="Create contact">
        <mat-icon class="text-[28px] w-7 h-7">add</mat-icon>
      </button>

      <!-- MY CARD & ACTIVE PHONE LINE MODAL -->
      @if(showQrCode()) {
        <div class="fixed inset-0 bg-black/50 z-[120] flex items-center justify-center p-4 transition-opacity">
          <div class="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl relative flex flex-col items-center text-gray-900">
            <button class="absolute top-4 right-4 w-9 h-9 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-full transition-colors cursor-pointer" (click)="showQrCode.set(false)" aria-label="Close">
              <mat-icon>close</mat-icon>
            </button>
            <div class="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-2xl mb-2">
              {{ myCardName()[0]?.toUpperCase() || 'M' }}
            </div>
            <h2 class="text-xl font-bold text-gray-900">My Card &amp; Line ID</h2>
            <p class="text-xs text-gray-500 mb-4 text-center">
              Your phone number below is your active caller &amp; SMS line ID for real-time calling and messaging.
            </p>

            <div class="w-full space-y-2.5 mb-4">
              <div>
                <label class="block text-[11px] font-bold text-gray-500 uppercase">
                  Your Name
                  <input type="text"
                         [value]="myCardName()"
                         (input)="myCardName.set($any($event.target).value)"
                         class="w-full mt-1 px-3 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-900 outline-none focus:border-blue-500 normal-case" />
                </label>
              </div>
              <div>
                <label class="block text-[11px] font-bold text-gray-500 uppercase">
                  Your Phone Number (Active Line ID)
                  <input type="tel"
                         [value]="myCardPhone()"
                         (input)="myCardPhone.set($any($event.target).value)"
                         class="w-full mt-1 px-3 py-2 border border-gray-300 rounded-xl text-sm font-mono font-semibold text-gray-900 outline-none focus:border-blue-500 normal-case" />
                </label>
              </div>
            </div>

            <div class="w-40 h-40 bg-white border-2 border-gray-100 rounded-2xl p-2 shadow-xs flex items-center justify-center overflow-hidden mb-4">
              @if (myCardQrDataUrl()) {
                <img [src]="myCardQrDataUrl()" alt="My Card QR Code" class="w-full h-full object-contain rounded-lg" />
              } @else {
                <span class="text-xs text-gray-400">Generating QR...</span>
              }
            </div>

            <div class="w-full flex gap-2 mb-2">
              <button class="flex-1 py-2.5 bg-blue-50 hover:bg-blue-100 text-[#007dff] rounded-xl text-xs font-bold cursor-pointer flex items-center justify-center space-x-1"
                      (click)="shareMyCardQr()">
                <mat-icon class="text-[16px] w-4 h-4">qr_code_2</mat-icon>
                <span>Share QR</span>
              </button>
              <button class="flex-1 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold cursor-pointer flex items-center justify-center space-x-1"
                      (click)="shareMyCardNumber()">
                <mat-icon class="text-[16px] w-4 h-4">share</mat-icon>
                <span>Share Number</span>
              </button>
            </div>

            <div class="w-full flex gap-2">
              <button class="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold cursor-pointer flex items-center justify-center space-x-1"
                      (click)="exportMyVcf()">
                <mat-icon class="text-[16px] w-4 h-4">contact_page</mat-icon>
                <span>Export vCard</span>
              </button>
              <button class="flex-1 py-2.5 bg-[#1a73e8] hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                      (click)="saveMyCard()">
                Save Line ID
              </button>
            </div>
          </div>
        </div>
      }

      <!-- SAVE CONTACTS IN MOBILE OR GMAIL & IMPORT/EXPORT MODAL -->
      @if(showBusinessCardsModal()) {
        <div class="fixed inset-0 bg-black/50 z-[120] flex items-center justify-center p-4">
          <div class="bg-white rounded-3xl w-full max-w-sm p-5 shadow-2xl text-gray-900 flex flex-col max-h-[90vh] overflow-y-auto">
            <div class="flex justify-between items-center mb-2.5">
              <div class="flex items-center space-x-2">
                <mat-icon class="text-[#007dff]">contact_mail</mat-icon>
                <h3 class="text-lg font-bold">Save Contacts: Mobile &amp; Gmail</h3>
              </div>
              <button class="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 cursor-pointer"
                      (click)="showBusinessCardsModal.set(false)">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <p class="text-xs text-gray-500 mb-3 leading-relaxed">
              Choose default storage location for new contacts or save/export all {{ phoneState.contacts().length }} contacts to your Mobile device or Gmail account:
            </p>

            <!-- Default Save Location Selector: Mobile | Gmail | SIM -->
            <div class="mb-3.5 bg-gray-50 p-3 rounded-2xl border border-gray-200/80">
              <span class="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Default Save Location</span>
              <div class="grid grid-cols-3 gap-2">
                <button type="button"
                        class="py-2 px-2 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center cursor-pointer transition-all"
                        [class.border-[#007dff]]="phoneState.defaultContactStorage() === 'mobile'"
                        [class.bg-blue-50]="phoneState.defaultContactStorage() === 'mobile'"
                        [class.text-[#007dff]]="phoneState.defaultContactStorage() === 'mobile'"
                        [class.border-gray-200]="phoneState.defaultContactStorage() !== 'mobile'"
                        [class.bg-white]="phoneState.defaultContactStorage() !== 'mobile'"
                        (click)="phoneState.defaultContactStorage.set('mobile')">
                  <mat-icon class="text-[18px] w-4.5 h-4.5 mb-0.5">phone_android</mat-icon>
                  <span>Mobile</span>
                </button>
                <button type="button"
                        class="py-2 px-2 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center cursor-pointer transition-all"
                        [class.border-[#007dff]]="phoneState.defaultContactStorage() === 'gmail'"
                        [class.bg-blue-50]="phoneState.defaultContactStorage() === 'gmail'"
                        [class.text-[#007dff]]="phoneState.defaultContactStorage() === 'gmail'"
                        [class.border-gray-200]="phoneState.defaultContactStorage() !== 'gmail'"
                        [class.bg-white]="phoneState.defaultContactStorage() !== 'gmail'"
                        (click)="phoneState.defaultContactStorage.set('gmail')">
                  <mat-icon class="text-[18px] w-4.5 h-4.5 mb-0.5">mail</mat-icon>
                  <span>Gmail</span>
                </button>
                <button type="button"
                        class="py-2 px-2 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center cursor-pointer transition-all"
                        [class.border-[#007dff]]="phoneState.defaultContactStorage() === 'sim'"
                        [class.bg-blue-50]="phoneState.defaultContactStorage() === 'sim'"
                        [class.text-[#007dff]]="phoneState.defaultContactStorage() === 'sim'"
                        [class.border-gray-200]="phoneState.defaultContactStorage() !== 'sim'"
                        [class.bg-white]="phoneState.defaultContactStorage() !== 'sim'"
                        (click)="phoneState.defaultContactStorage.set('sim')">
                  <mat-icon class="text-[18px] w-4.5 h-4.5 mb-0.5">sim_card</mat-icon>
                  <span>SIM Card</span>
                </button>
              </div>

              <div class="mt-3 pt-2.5 border-t border-gray-200/80">
                <div class="flex items-center justify-between mb-1.5">
                  <span class="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Gmail Accounts Logged In on Phone</span>
                  <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full text-emerald-700 bg-emerald-100">
                    {{ phoneState.signedInGoogleAccounts().length }} Detected
                  </span>
                </div>

                <!-- Tap to Select from Phone's Logged-in Google Accounts (No login required!) -->
                <button type="button"
                        class="w-full bg-white border border-gray-300 hover:border-[#007dff] rounded-xl px-3 py-2 flex items-center justify-between transition-all cursor-pointer shadow-2xs"
                        (click)="phoneState.openOrToggleGoogleAccountPicker()">
                  <div class="flex items-center space-x-2.5 min-w-0">
                    <div class="w-7 h-7 rounded-full bg-[#1a73e8] text-white flex items-center justify-center font-bold text-xs shrink-0">
                      {{ ((phoneState.connectedGmailAccount() || 'G')[0] || 'G').toUpperCase() }}
                    </div>
                    <div class="flex flex-col text-left min-w-0">
                      <span class="text-xs font-bold text-gray-900 truncate">{{ phoneState.connectedGmailAccount() }}</span>
                      <span class="text-[10px] text-gray-500 leading-tight">
                        Tap to select from {{ phoneState.signedInGoogleAccounts().length }} Gmail accounts on phone
                      </span>
                    </div>
                  </div>
                  <mat-icon class="text-gray-500 text-[18px] w-4.5 h-4.5 shrink-0">
                    {{ phoneState.isGoogleAccountPickerOpen() ? 'expand_less' : 'expand_more' }}
                  </mat-icon>
                </button>

                @if(phoneState.isGoogleAccountPickerOpen()) {
                  <div class="mt-2 bg-white rounded-xl border border-gray-200 p-2 space-y-1.5 shadow-sm animate-fade-in">
                    <div class="flex items-center justify-between px-1.5 pt-0.5">
                      <span class="text-[10px] font-bold text-gray-400 uppercase">Select Gmail Account on Phone</span>
                      <button type="button"
                              class="text-[10px] font-bold text-[#007dff] hover:underline cursor-pointer"
                              (click)="phoneState.triggerAndroidSystemAccountPicker()">
                        System Picker
                      </button>
                    </div>
                    @for(acc of phoneState.signedInGoogleAccounts(); track acc.email) {
                      <button type="button"
                              class="w-full px-2.5 py-2 rounded-lg flex items-center justify-between text-left transition-colors cursor-pointer"
                              [class.bg-blue-50]="phoneState.connectedGmailAccount() === acc.email"
                              [class.hover:bg-gray-50]="phoneState.connectedGmailAccount() !== acc.email"
                              (click)="phoneState.selectPhoneGoogleAccount(acc.email)">
                        <div class="flex items-center space-x-2 min-w-0">
                          @if(acc.photoURL) {
                            <img [src]="acc.photoURL" alt="{{ acc.displayName }}" class="w-6 h-6 rounded-full object-cover shrink-0" referrerpolicy="no-referrer" />
                          } @else {
                            <div class="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                              {{ (acc.email[0] || 'G').toUpperCase() }}
                            </div>
                          }
                          <div class="flex flex-col min-w-0">
                            <span class="text-xs font-semibold text-gray-900 truncate">{{ acc.displayName }}</span>
                            <span class="text-[11px] text-gray-600 truncate">{{ acc.email }}</span>
                          </div>
                        </div>
                        @if(phoneState.connectedGmailAccount() === acc.email) {
                          <mat-icon class="text-[#007dff] text-[18px] w-4.5 h-4.5 shrink-0">check_circle</mat-icon>
                        }
                      </button>
                    }
                  </div>
                }
              </div>
            </div>

            <div class="space-y-2 mb-4 max-h-64 overflow-y-auto pr-0.5">
              <!-- 1. Sync & Replace with My Google Contacts (For any user installing the APK) -->
              <button class="w-full py-2.5 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold flex items-center justify-between cursor-pointer transition-colors shadow-xs"
                      (click)="phoneState.requestSyncAndReplaceWithMyGoogleContacts()">
                <div class="flex items-center space-x-2.5">
                  <mat-icon class="text-white">cloud_sync</mat-icon>
                  <div class="text-left">
                    <div class="text-sm font-bold">Sync Only My Google Contacts</div>
                    <div class="text-[11px] text-indigo-100">Replaces demo list with {{ phoneState.connectedGmailAccount() || 'your Google Account' }}</div>
                  </div>
                </div>
                <mat-icon class="text-white">person_check</mat-icon>
              </button>

              <!-- 2. Sync & Merge Contacts from Google Account (Cloud People API) -->
              <button class="w-full py-2.5 px-3.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 rounded-2xl text-xs font-bold flex items-center justify-between cursor-pointer transition-colors"
                      (click)="phoneState.syncContactsFromGoogleCloud(false)">
                <div class="flex items-center space-x-2.5">
                  <mat-icon class="text-indigo-600">sync</mat-icon>
                  <div class="text-left">
                    <div class="text-sm font-bold">Merge from Google Contacts</div>
                    <div class="text-[11px] text-indigo-700/80">Add cloud contacts from {{ phoneState.connectedGmailAccount() || 'your Google Account' }}</div>
                  </div>
                </div>
                <mat-icon class="text-indigo-600">cloud_download</mat-icon>
              </button>

              <!-- 3. Upload All Contacts to Google Account (Cloud People API with confirmation) -->
              <button class="w-full py-2.5 px-3.5 bg-blue-50 hover:bg-blue-100 text-blue-900 rounded-2xl text-xs font-bold flex items-center justify-between cursor-pointer transition-colors"
                      (click)="phoneState.requestSyncAllContactsToGoogleCloud()">
                <div class="flex items-center space-x-2.5">
                  <mat-icon class="text-[#007dff]">cloud_upload</mat-icon>
                  <div class="text-left">
                    <div class="text-sm font-bold">Save All to Google Contacts</div>
                    <div class="text-[11px] text-blue-700/80">Syncs directly to {{ phoneState.connectedGmailAccount() || 'your Google Account' }}</div>
                  </div>
                </div>
                <mat-icon class="text-[#007dff]">backup</mat-icon>
              </button>

              <!-- 4. Sync Only My Mobile Device Contacts (Replace Demo List) -->
              <button class="w-full py-2.5 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold flex items-center justify-between cursor-pointer transition-colors shadow-xs"
                      (click)="phoneState.requestSyncAndReplaceWithMyDeviceContacts()">
                <div class="flex items-center space-x-2.5">
                  <mat-icon class="text-white">phonelink_setup</mat-icon>
                  <div class="text-left">
                    <div class="text-sm font-bold">Sync Only My Mobile Contacts</div>
                    <div class="text-[11px] text-emerald-100">Replaces demo list with this phone's SIM &amp; Device contacts</div>
                  </div>
                </div>
                <mat-icon class="text-white">smartphone</mat-icon>
              </button>

              <!-- 5. Save All Contacts to Mobile (.vcf) -->
              <button class="w-full py-2.5 px-3.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded-2xl text-xs font-bold flex items-center justify-between cursor-pointer transition-colors"
                      (click)="phoneState.saveAllContactsToStorage('mobile'); phoneState.exportContactsAsVcf()">
                <div class="flex items-center space-x-2.5">
                  <mat-icon class="text-emerald-600">phone_android</mat-icon>
                  <div class="text-left">
                    <div class="text-sm font-bold">Save All Contacts to Mobile</div>
                    <div class="text-[11px] text-emerald-700/80">Saves to Phone &amp; downloads Mobile vCard (.vcf)</div>
                  </div>
                </div>
                <mat-icon class="text-emerald-600">save_alt</mat-icon>
              </button>

              <!-- 6. Export Google Contacts (.csv) -->
              <button class="w-full py-2.5 px-3.5 bg-sky-50 hover:bg-sky-100 text-sky-900 rounded-2xl text-xs font-bold flex items-center justify-between cursor-pointer transition-colors"
                      (click)="phoneState.exportContactsForGmailCsv()">
                <div class="flex items-center space-x-2.5">
                  <mat-icon class="text-sky-600">table_view</mat-icon>
                  <div class="text-left">
                    <div class="text-sm font-bold">Export Gmail Contacts (.csv)</div>
                    <div class="text-[11px] text-sky-700/80">Downloads Google Contacts CSV for {{ phoneState.connectedGmailAccount() || 'Google Contacts' }}</div>
                  </div>
                </div>
                <mat-icon class="text-sky-600">download</mat-icon>
              </button>

              <!-- 7. Import & Merge from Mobile Address Book -->
              <button class="w-full py-2.5 px-3.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-2xl text-xs font-bold flex items-center justify-between cursor-pointer transition-colors"
                      (click)="syncFromPhoneContacts()">
                <div class="flex items-center space-x-2.5">
                  <mat-icon class="text-gray-700">contact_phone</mat-icon>
                  <div class="text-left">
                    <div class="text-sm font-bold">Merge from Mobile Contacts</div>
                    <div class="text-[11px] text-gray-500">Uses Android ContactsProvider / Contact Picker</div>
                  </div>
                </div>
                <mat-icon>chevron_right</mat-icon>
              </button>

              <!-- 6. Import vCard (.vcf) or Google Contacts (.csv) File -->
              <label class="w-full py-2.5 px-3.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-2xl text-xs font-bold flex items-center justify-between cursor-pointer transition-colors">
                <div class="flex items-center space-x-2.5">
                  <mat-icon class="text-gray-700">upload_file</mat-icon>
                  <div class="text-left">
                    <div class="text-sm font-bold">Import Mobile (.vcf) or Gmail (.csv)</div>
                    <div class="text-[11px] text-gray-500">Load contacts from vCard or Google CSV file</div>
                  </div>
                </div>
                <mat-icon>file_open</mat-icon>
                <input type="file" accept=".vcf,.csv,text/vcard,text/csv" class="hidden" (change)="onVcfFileSelected($event)" />
              </label>
            </div>

            <button class="w-full py-2.5 bg-gray-900 text-white rounded-xl text-xs font-bold cursor-pointer"
                    (click)="showBusinessCardsModal.set(false)">
              Done
            </button>
          </div>
        </div>
      }
    </div>
  `
})
export class ContactsComponent {
  phoneState = inject(PhoneState);
  openContactDetailsRequest = output<ContactData>();
  
  isMenuOpen = signal(false);
  showQrCode = signal(false);
  showBusinessCardsModal = signal(false);
  searchQuery = signal('');
  activeLetter = signal<string>('#');
  alphabet = ALPHABET;

  myCardName = signal(this.phoneState.myProfile().name);
  myCardPhone = signal(this.phoneState.myProfile().phone);
  myCardQrDataUrl = signal<string>('');

  constructor() {
    effect(() => {
      const name = this.myCardName() || 'MYself_SINGH';
      const phone = this.myCardPhone() || '+91 98765 43210';
      this.generateMyCardQr(name, phone);
    });
  }

  private async generateMyCardQr(name: string, phone: string) {
    try {
      const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${name}\nTEL;TYPE=CELL:${phone}\nEND:VCARD`;
      const url = await QRCode.toDataURL(vcard, {
        width: 360,
        margin: 1,
        errorCorrectionLevel: 'M'
      });
      this.myCardQrDataUrl.set(url);
    } catch {
      this.myCardQrDataUrl.set('');
    }
  }

  groupedContacts = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const cleanQuery = query.replace(/\s+/g, '');
    const filtered = this.phoneState.contacts().filter(c => 
      c.name.toLowerCase().includes(query) || 
      c.phone.replace(/\s+/g, '').includes(cleanQuery)
    );
    
    const groups: { letter: string, contacts: ContactItem[] }[] = [];
    const sorted = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    
    sorted.forEach(c => {
      const letter = c.name && c.name[0] ? c.name[0].toUpperCase() : '#';
      let group = groups.find(g => g.letter === letter);
      if (!group) {
        group = { letter, contacts: [] };
        groups.push(group);
      }
      group.contacts.push(c);
    });
    return groups;
  });

  openMyCardModal() {
    const prof = this.phoneState.myProfile();
    this.myCardName.set(prof.name);
    this.myCardPhone.set(prof.phone);
    this.generateMyCardQr(prof.name, prof.phone);
    this.showQrCode.set(true);
  }

  saveMyCard() {
    this.phoneState.updateMyProfile(this.myCardName(), this.myCardPhone());
    this.showQrCode.set(false);
  }

  async shareMyCardQr() {
    const c: ContactData = {
      name: this.myCardName() || 'MYself_SINGH',
      phone: this.myCardPhone() || '+91 98765 43210',
      type: 'Mobile'
    };
    await this.phoneState.shareContactQrSystem(c, this.myCardQrDataUrl());
  }

  async shareMyCardNumber() {
    const c: ContactData = {
      name: this.myCardName() || 'MYself_SINGH',
      phone: this.myCardPhone() || '+91 98765 43210',
      type: 'Mobile'
    };
    await this.phoneState.shareContactNumberSystem(c);
  }

  exportMyVcf() {
    this.phoneState.exportContactsAsVcf({
      name: this.myCardName() || 'MYself_SINGH',
      phone: this.myCardPhone() || '+91 98765 43210'
    });
  }

  async syncFromPhoneContacts() {
    const count = await this.phoneState.importDeviceContacts();
    if (count > 0) {
      this.showBusinessCardsModal.set(false);
    }
  }

  onVcfFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      if (file.name.toLowerCase().endsWith('.csv') || !text.includes('BEGIN:VCARD')) {
        this.phoneState.importContactsFromGmailCsvString(text);
      } else {
        this.phoneState.importContactsFromVcfString(text);
      }
      this.showBusinessCardsModal.set(false);
    };
    reader.readAsText(file);
  }

  scrollToLetter(letter: string) {
    this.activeLetter.set(letter);
    if (typeof document === 'undefined') return;
    if (letter === '#') {
      this.scrollToTop();
      return;
    }
    const el = document.getElementById(`contact-letter-${letter}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  scrollToTop() {
    this.activeLetter.set('#');
    if (typeof document === 'undefined') return;
    const container = document.getElementById('contacts-scroll-container');
    if (container) {
      container.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  openDetails(contact: ContactItem) {
    this.openContactDetailsRequest.emit({
      name: contact.name,
      phone: contact.phone,
      type: contact.type || 'Mobile',
      avatar: contact.avatar,
      color: contact.color,
      isSim: contact.isSim,
      storageLocation: contact.storageLocation,
      gmailAccount: contact.gmailAccount,
      organisation: contact.organisation,
      email: contact.email,
      ringtone: contact.ringtone
    });
  }

  addFromSearch() {
    const q = this.searchQuery().trim();
    const isNum = /^[+\d\s-]+$/.test(q);
    this.phoneState.openAddContact(isNum ? { phone: q } : { name: q });
  }
}
