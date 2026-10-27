import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { PhoneState, ContactData } from './phone-state';
import { Call } from './data';

@Component({
  selector: 'app-phone',
  standalone: true,
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let theme = phoneState.currentTheme();
    <div class="flex flex-col h-full relative pb-[68px] select-none transition-colors duration-200"
         [style.background]="theme.contactsBg"
         [style.color]="theme.primaryTextColor"
         tabindex="0">
      <!-- Header -->
      <div class="px-5 pt-4 pb-2 flex justify-between items-center relative"
           [style.background]="theme.topHeaderBarBg">
        <div class="flex items-center space-x-2">
          <h1 class="text-[28px] font-normal tracking-tight" [style.color]="theme.primaryTextColor">Recents</h1>
        </div>

        <div class="flex items-center space-x-1">
          <button class="p-2 rounded-full transition-colors cursor-pointer hover:opacity-80"
                  [style.color]="theme.primaryTextColor"
                  (click)="phoneState.openThemeModal()"
                  title="Choose Theme (Applies to All Apps)"
                  aria-label="Choose Theme">
            <mat-icon>palette</mat-icon>
          </button>
          <button class="p-2 rounded-full transition-colors cursor-pointer hover:opacity-80"
                  [style.color]="theme.primaryTextColor"
                  (click)="isMenuOpen.set(!isMenuOpen())"
                  aria-label="Phone settings">
            <mat-icon>more_vert</mat-icon>
          </button>
        </div>
        
        <!-- Settings Menu Popup -->
        @if(isMenuOpen()) {
          <div class="fixed inset-0 z-40" (click)="isMenuOpen.set(false)" (keyup.enter)="isMenuOpen.set(false)" tabindex="0" role="button" aria-label="Close menu"></div>
          <div class="absolute right-4 top-14 bg-white rounded-2xl shadow-[0_6px_30px_rgba(0,0,0,0.18)] z-50 w-72 py-2 overflow-hidden border border-gray-100 text-[14px]">
            
            <!-- ANTI BOMBER -->
            <button class="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center justify-between transition-colors cursor-pointer" (click)="phoneState.toggleAntiBomber()">
              <div class="flex items-center pr-2">
                <mat-icon class="text-red-600 mr-2.5 text-[20px] w-5 h-5 shrink-0">security</mat-icon>
                <div class="flex flex-col">
                  <span class="text-gray-900 font-bold tracking-tight">ANTI BOMBER</span>
                  <span class="text-[11px] text-gray-500 leading-snug">Turn on to get rid of Sms and Call Bombing</span>
                </div>
              </div>
              <span class="text-xs font-semibold px-2 py-0.5 rounded-md shrink-0" [class.bg-red-600]="phoneState.antiBomber()" [class.text-white]="phoneState.antiBomber()" [class.bg-gray-100]="!phoneState.antiBomber()" [class.text-gray-600]="!phoneState.antiBomber()">
                {{ phoneState.antiBomber() ? 'ON' : 'OFF' }}
              </span>
            </button>

            <!-- Trust List Management -->
            <button class="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center justify-between text-gray-800 transition-colors cursor-pointer" (click)="phoneState.isTrustListModalOpen.set(true); isMenuOpen.set(false)">
              <div class="flex items-center">
                <mat-icon class="text-green-600 mr-2.5 text-[20px] w-5 h-5">verified_user</mat-icon>
                <span>Manage Trust List</span>
              </div>
              <span class="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-medium">{{ phoneState.trustList().length }}</span>
            </button>

            <div class="border-t border-gray-100 my-1"></div>

            <button class="w-full text-left px-4 py-2 text-gray-800 font-normal hover:bg-gray-50 flex items-center transition-colors cursor-pointer" (click)="openRecordings()">
              <mat-icon class="text-red-500 mr-2.5 text-[18px] w-4.5 h-4.5">mic</mat-icon>
              <span>Call recordings</span>
            </button>

            <button class="w-full text-left px-4 py-2 text-red-600 font-normal hover:bg-red-50 flex items-center transition-colors cursor-pointer" (click)="clearCallLog()">
              <mat-icon class="text-red-500 mr-2.5 text-[18px] w-4.5 h-4.5">delete_sweep</mat-icon>
              <span>Clear call history</span>
            </button>

            <div class="border-t border-gray-100 my-1"></div>

            <button class="w-full text-left px-4 py-2 text-gray-800 font-normal hover:bg-gray-50 active:bg-gray-100 flex items-center justify-between transition-colors cursor-pointer" (click)="phoneState.openThemeSelectorForApp('caller'); isMenuOpen.set(false)">
              <div class="flex items-center">
                <mat-icon class="text-pink-600 mr-2.5 text-[18px] w-4.5 h-4.5">palette</mat-icon>
                <span>Themes (Phone App)</span>
              </div>
              <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-pink-50 text-pink-700 truncate max-w-[85px]">{{ theme.name }}</span>
            </button>

            <button class="w-full text-left px-4 py-2 text-gray-800 font-normal hover:bg-gray-50 active:bg-gray-100 flex items-center justify-between transition-colors cursor-pointer" (click)="phoneState.isForceDefaultModalOpen.set(true); isMenuOpen.set(false)">
              <div class="flex items-center">
                <mat-icon class="text-indigo-600 mr-2.5 text-[18px] w-4.5 h-4.5">admin_panel_settings</mat-icon>
                <span>Default App &amp; 3-App Split</span>
              </div>
              <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700">APK</span>
            </button>
          </div>
        }
      </div>
      
      <!-- Search Recent Calls Input -->
      <div class="px-4 mb-2">
        <div class="rounded-xl flex items-center px-3 py-2" [style.background]="theme.searchBarBg">
          <mat-icon class="mr-2 text-[20px] w-5 h-5" [style.color]="theme.secondaryTextColor">search</mat-icon>
          <input type="text" [value]="searchQuery()" (input)="searchQuery.set($any($event.target).value)"
                 placeholder="Search recent calls"
                 [style.color]="theme.primaryTextColor"
                 class="bg-transparent outline-none flex-1 text-[15px] placeholder-gray-400" />
          @if(searchQuery()) {
            <button class="p-1 cursor-pointer" [style.color]="theme.secondaryTextColor" (click)="searchQuery.set('')" aria-label="Clear search">
              <mat-icon class="text-[18px] w-4.5 h-4.5">close</mat-icon>
            </button>
          }
        </div>
      </div>

      <!-- ALL / MISSED Filter Toggle -->
      <div class="px-4 mb-2">
        <div class="rounded-xl p-1 flex" [style.background]="theme.searchBarBg">
          <button class="flex-1 py-1.5 text-sm font-medium rounded-lg transition-all cursor-pointer"
                  [style.background]="tab() === 'ALL' ? theme.cardBg : 'transparent'"
                  [style.color]="tab() === 'ALL' ? theme.primaryTextColor : theme.secondaryTextColor"
                  (click)="tab.set('ALL')">ALL</button>
          <button class="flex-1 py-1.5 text-sm font-medium rounded-lg transition-all cursor-pointer"
                  [style.background]="tab() === 'MISSED' ? theme.cardBg : 'transparent'"
                  [style.color]="tab() === 'MISSED' ? theme.primaryTextColor : theme.secondaryTextColor"
                  (click)="tab.set('MISSED')">MISSED</button>
        </div>
      </div>

      <!-- Call Logs List -->
      <div class="flex-1 overflow-y-auto" [style.background]="theme.keypadPanelBg">
        @for (call of displayedCalls(); track call.id) {
          @let isNonContact = !phoneState.isContact(call.name) && !phoneState.isContact(phoneState.lookupPhone(call.name));
          <div class="flex items-center pl-4 pr-4 py-3 cursor-pointer transition-colors" (click)="startCallFromLog(call)" (keyup.enter)="startCallFromLog(call)" tabindex="0" role="button">
            <div class="w-8 flex-shrink-0 flex justify-center">
               @if(call.type === 'missed') { <mat-icon class="text-red-500 text-sm w-4 h-4">call_missed</mat-icon> }
               @else if(call.type === 'incoming') { <mat-icon class="text-sm w-4 h-4 text-green-500">call_received</mat-icon> }
               @else { <mat-icon class="text-sm w-4 h-4" [style.color]="theme.accentColor">call_made</mat-icon> }
            </div>
            
            <div class="flex-1 min-w-0 pr-2 flex flex-col justify-center">
               <!-- NON-CONTACT PERSON NAMES ARE RED. SAVED CONTACT NAMES USE THEME PRIMARY COLOR! -->
               <div class="text-[17px] tracking-tight leading-tight mb-0.5 truncate"
                    [class.text-red-500]="isNonContact"
                    [class.font-semibold]="isNonContact"
                    [style.color]="isNonContact ? '' : theme.primaryTextColor">
                 {{call.name}} @if(call.count > 1) { ({{call.count}}) }
               </div>
               <div class="text-[13px] flex items-center gap-1.5 flex-wrap" [style.color]="theme.secondaryTextColor">
                 @if(call.location.includes('Blocked')) {
                   <span class="bg-red-500/15 text-red-500 text-[10px] px-1.5 py-0.5 rounded font-medium tracking-wide border border-red-500/30">Blocked Non-Contact</span>
                 } @else {
                   <span class="text-[10px] px-1.5 py-0.5 rounded font-medium tracking-wide"
                         [style.background]="theme.searchBarBg"
                         [style.color]="theme.secondaryTextColor">VoLTE</span>
                 }
                 <span class="truncate">{{call.location}}</span>
               </div>
            </div>
            
            <div class="text-[14px] whitespace-nowrap" [style.color]="theme.secondaryTextColor">{{call.time}}</div>
            
            <!-- Info 'i' Button -->
            <div class="ml-3 flex-shrink-0">
              <button class="w-7 h-7 rounded-full border flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
                      [style.border-color]="theme.secondaryTextColor"
                      [style.color]="theme.primaryTextColor"
                      (click)="openContactInfo(call); $event.stopPropagation()" aria-label="Contact details">
                <span class="text-[14px] font-serif italic pb-[1px]">i</span>
              </button>
            </div>
          </div>
          <div class="ml-12 border-b" [style.border-color]="theme.dividerColor"></div>
        }
        @if(displayedCalls().length === 0) {
          <div class="flex flex-col items-center justify-center py-20" [style.color]="theme.secondaryTextColor">
            <mat-icon class="text-[48px] w-12 h-12 mb-2 opacity-50">phone_missed</mat-icon>
            <p class="text-[15px]">No call history</p>
          </div>
        }
        <div class="h-24"></div>
      </div>
      
      <!-- Floating Action Button: Quick jump to Dialpad -->
      <button class="absolute bottom-[88px] right-5 w-14 h-14 rounded-full shadow-lg flex items-center justify-center z-10 active:scale-95 transition-transform cursor-pointer"
              [style.background]="theme.callButtonBg"
              [style.color]="theme.callButtonIconColor"
              (click)="openDialpad()" aria-label="Open keypad">
        <mat-icon class="text-2xl">dialpad</mat-icon>
      </button>

    </div>
  `
})
export class PhoneComponent {
  phoneState = inject(PhoneState);

  tab = signal<'ALL' | 'MISSED'>('ALL');
  searchQuery = signal('');
  isMenuOpen = signal(false);

  openKeypadRequest = output<void>();
  openRecordingsRequest = output<void>();
  openContactDetailsRequest = output<ContactData>();

  displayedCalls = computed(() => {
    let list = this.tab() === 'ALL' ? this.phoneState.calls() : this.phoneState.calls().filter(c => c.type === 'missed');
    const q = this.searchQuery().trim().toLowerCase();
    if (q) {
      list = list.filter(c => c.name.toLowerCase().includes(q) || c.location.toLowerCase().includes(q));
    }
    return list;
  });

  openDialpad() {
    this.openKeypadRequest.emit();
  }

  openRecordings() {
    this.isMenuOpen.set(false);
    this.openRecordingsRequest.emit();
  }

  clearCallLog() {
    this.isMenuOpen.set(false);
    this.phoneState.requestClearCallHistory();
  }

  startCallFromLog(call: Call) {
    const contact = this.phoneState.findContact(call.name);
    const phone = contact ? contact.phone : this.phoneState.lookupPhone(call.name);
    const isNonContact = !contact && !this.phoneState.isTrusted(phone);
    const name = contact ? contact.name : call.name;
    this.phoneState.startCall(name, phone, isNonContact);
  }

  openContactInfo(call: Call) {
    const contact = this.phoneState.findContact(call.name);
    const phone = contact ? contact.phone : this.phoneState.lookupPhone(call.name);
    const name = contact ? contact.name : call.name;
    this.openContactDetailsRequest.emit({ name, phone, type: 'Mobile', avatar: contact?.avatar });
  }
}
