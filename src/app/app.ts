import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { KeypadComponent } from './keypad.component';
import { ContactsComponent } from './contacts.component';
import { FavouritesComponent } from './favourites.component';
import { RecordingsComponent } from './recordings.component';
import { ContactDetailsComponent } from './contact-details.component';
import { PhoneState, ContactData } from './phone-state';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  standalone: true,
  imports: [
    MatIconModule,
    KeypadComponent,
    ContactsComponent,
    FavouritesComponent,
    RecordingsComponent,
    ContactDetailsComponent
  ],
  template: `
    <div class="h-screen w-full flex flex-col bg-white overflow-hidden max-w-[480px] mx-auto relative shadow-2xl border-x border-gray-200 select-none"
         tabindex="0"
         (keydown.escape)="handleGlobalEscape()">

      <!-- Main Content Area -->
      <div class="flex-1 relative overflow-hidden">
        <!-- Recordings View Overlay -->
        @if(currentView() === 'recordings') {
           <app-recordings class="absolute inset-0 z-40" (closeView)="currentView.set('main')"></app-recordings>
        } 
        <!-- Contact Details View Overlay -->
        @else if (currentView() === 'contact-details' && selectedContact()) {
           <app-contact-details class="absolute inset-0 z-40" [contact]="selectedContact()!" (closeView)="currentView.set('main')"></app-contact-details>
        }
        
        <!-- Tab Views: Honor 3-Tab Layout (Phone, Contacts, Favourites) -->
        @if(currentTab() === 'phone') {
          <app-keypad class="absolute inset-0"
                      (openRecordingsRequest)="currentView.set('recordings')"
                      (openContactDetailsRequest)="openContactDetails($event)"></app-keypad>
        } @else if(currentTab() === 'contacts') {
          <app-contacts class="absolute inset-0"
                        (openContactDetailsRequest)="openContactDetails($event)"></app-contacts>
        } @else if(currentTab() === 'favourites') {
          <app-favourites class="absolute inset-0"
                          (openContactDetailsRequest)="openContactDetails($event)"></app-favourites>
        }
      </div>

      <!-- Bottom Navigation Footer: Honor 3-Tab Layout (Remains anchored at the bottom while keypad slides above it, hides on subviews like Contact Details) -->
      @let navTheme = activeAppTheme();
      @let hideBottomNav = currentView() !== 'main';
      <div class="absolute bottom-0 left-0 right-0 h-[60px] border-t flex justify-around items-center px-1 z-35 pb-0.5 shadow-xs transition-all duration-200"
           [class.translate-y-full]="hideBottomNav"
           [class.opacity-0]="hideBottomNav"
           [class.pointer-events-none]="hideBottomNav"
           [class.translate-y-0]="!hideBottomNav"
           [class.opacity-100]="!hideBottomNav"
           [class.pointer-events-auto]="!hideBottomNav"
           [style.background]="navTheme.bottomNavBg"
           [style.borderColor]="navTheme.dividerColor">
        <!-- Phone Tab Button -->
        <button class="flex flex-col items-center justify-center flex-1 h-full pt-1 pb-1 cursor-pointer transition-all duration-75 select-none active:scale-95"
                style="touch-action: manipulation; -webkit-tap-highlight-color: transparent;"
                [style.color]="(currentTab() === 'phone' && currentView() === 'main') ? navTheme.navActiveColor : navTheme.navInactiveColor"
                (click)="switchTab('phone')">
          <mat-icon class="text-[22px] w-5.5 h-5.5" [class.fill-current]="currentTab() === 'phone' && currentView() === 'main'">call</mat-icon>
          <span class="text-[11px] font-medium mt-0.5">Phone</span>
        </button>
        
        <!-- Contacts Tab Button -->
        <button class="flex flex-col items-center justify-center flex-1 h-full pt-1 pb-1 cursor-pointer transition-all duration-75 select-none active:scale-95"
                style="touch-action: manipulation; -webkit-tap-highlight-color: transparent;"
                [style.color]="(currentTab() === 'contacts' && currentView() === 'main') ? navTheme.navActiveColor : navTheme.navInactiveColor"
                (click)="switchTab('contacts')">
          <mat-icon class="text-[22px] w-5.5 h-5.5" [class.fill-current]="currentTab() === 'contacts' && currentView() === 'main'">person</mat-icon>
          <span class="text-[11px] font-medium mt-0.5">Contacts</span>
        </button>
        
        <!-- Favourites Tab Button -->
        <button class="flex flex-col items-center justify-center flex-1 h-full pt-1 pb-1 cursor-pointer transition-all duration-75 select-none active:scale-95"
                style="touch-action: manipulation; -webkit-tap-highlight-color: transparent;"
                [style.color]="(currentTab() === 'favourites' && currentView() === 'main') ? navTheme.navActiveColor : navTheme.navInactiveColor"
                (click)="switchTab('favourites')">
          <mat-icon class="text-[22px] w-5.5 h-5.5" [class.fill-current]="currentTab() === 'favourites' && currentView() === 'main'">star</mat-icon>
          <span class="text-[11px] font-medium mt-0.5">Favourites</span>
        </button>
      </div>

      <!-- ========================================================================= -->
      <!-- INCOMING CALL TOP NOTCH BANNER (UPPERMOST PART OF PHONE SCREEN NEAR NOTCH) -->
      <!-- Animates expanding downward from the top-center notch area                -->
      <!-- ========================================================================= -->
      @if(phoneState.incomingCall(); as incoming) {
        @if(phoneState.incomingCallViewMode() === 'banner') {
          <div class="fixed top-2 left-2.5 right-2.5 max-w-[460px] mx-auto z-[255] animate-notch-banner select-none">
            <div class="bg-[#18191c]/95 backdrop-blur-2xl border border-white/15 rounded-[26px] px-4 py-3.5 shadow-[0_18px_45px_rgba(0,0,0,0.55)] text-white flex flex-col cursor-pointer"
                 (click)="phoneState.expandIncomingCallToFullScreen()"
                 (keyup.enter)="phoneState.expandIncomingCallToFullScreen()"
                 tabindex="0"
                 role="button"
                 aria-label="Expand incoming call to full screen">

              <!-- Main Banner Content: Caller Info + Decline & Answer Buttons -->
              <div class="flex items-center justify-between">
                <!-- Left: Caller Avatar & Name -->
                <div class="flex items-center min-w-0 pr-2 flex-1">
                  <div class="relative mr-3 shrink-0">
                    <div class="absolute inset-0 rounded-full bg-green-400/25 animate-ping"></div>
                    <div class="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold relative z-10 border"
                         [class.bg-red-500/25]="incoming.isNonContact"
                         [class.border-red-400]="incoming.isNonContact"
                         [class.text-red-300]="incoming.isNonContact"
                         [class.bg-blue-500/25]="!incoming.isNonContact"
                         [class.border-blue-400]="!incoming.isNonContact"
                         [class.text-white]="!incoming.isNonContact">
                      {{ incoming.name ? incoming.name[0].toUpperCase() : 'C' }}
                    </div>
                  </div>
                  <div class="flex flex-col min-w-0">
                    <span class="text-[17px] font-bold leading-snug truncate"
                          [class.text-red-400]="incoming.isNonContact"
                          [class.text-white]="!incoming.isNonContact">
                      {{ incoming.name }}
                    </span>
                    <span class="text-[12px] text-gray-300 font-mono truncate">
                      {{ incoming.phone }} &bull; Mobile
                    </span>
                  </div>
                </div>

                <!-- Right: Decline & Answer Buttons -->
                <div class="flex items-center space-x-3 shrink-0">
                  <!-- Red Decline Button -->
                  <button type="button"
                          class="w-11 h-11 rounded-full bg-[#e53935] hover:bg-red-600 active:scale-90 flex items-center justify-center text-white shadow-lg transition-transform duration-75 select-none cursor-pointer"
                          style="touch-action: manipulation; -webkit-tap-highlight-color: transparent;"
                          (click)="$event.stopPropagation(); phoneState.declineIncomingCall()"
                          aria-label="Decline call">
                    <mat-icon class="text-[22px] w-5.5 h-5.5">call_end</mat-icon>
                  </button>

                  <!-- Green Answer Button with Ringing Shake Animation -->
                  <div class="relative flex items-center justify-center">
                    <div class="absolute w-13 h-13 rounded-full border border-green-400/40 animate-ping pointer-events-none"></div>
                    <button type="button"
                            class="w-11 h-11 rounded-full bg-[#18c34b] hover:bg-green-500 active:scale-90 flex items-center justify-center text-white shadow-[0_0_20px_rgba(24,195,75,0.65)] transition-transform duration-75 select-none cursor-pointer relative z-10"
                            style="touch-action: manipulation; -webkit-tap-highlight-color: transparent;"
                            (click)="$event.stopPropagation(); phoneState.acceptIncomingCall()"
                            aria-label="Answer call">
                      <mat-icon class="text-[22px] w-5.5 h-5.5 animate-ring-shake">call</mat-icon>
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        } @else {
          <!-- FULL-SCREEN INCOMING CALL VIEW: TRANSLUCENT HOME SCREEN WALLPAPER WITH 360-DEGREE SWIPE-TO-ANSWER -->
          <div class="fixed inset-0 z-[170] flex flex-col justify-between text-white p-6 max-w-[480px] mx-auto select-none animate-fade-in touch-none overflow-hidden"
               (pointermove)="onSwipeMove($event)"
               (pointerup)="onSwipeEnd()"
               (pointercancel)="onSwipeEnd()">

            <!-- Translucent Home Screen Wallpaper Layer -->
            <div class="absolute inset-0 z-0 bg-cover bg-center pointer-events-none scale-105 transition-all duration-300"
                 [style.backgroundImage]="callerWallpaperBg()">
            </div>
            <!-- Translucent Frosted Glass / Dark Layer (translucent wallpaper visible underneath, NOT solid blue or gray!) -->
            <div class="absolute inset-0 z-0 bg-slate-950/45 backdrop-blur-xl pointer-events-none"></div>

            <div class="relative z-10 flex flex-col justify-between h-full w-full">
              <!-- Top Section: Clean Incoming Call Info (No unwanted dev pills) -->
              <div class="flex flex-col items-center mt-6">
                <!-- Caller Avatar (Translucent Frosted Glass) -->
                <div class="w-28 h-28 rounded-full flex items-center justify-center text-4xl font-bold my-4 shadow-2xl backdrop-blur-md"
                     [class.bg-red-500/25]="incoming.isNonContact"
                     [class.border-2]="true"
                     [class.border-red-500]="incoming.isNonContact"
                     [class.text-red-400]="incoming.isNonContact"
                     [class.bg-white/15]="!incoming.isNonContact"
                     [class.border-2]="!incoming.isNonContact"
                     [class.border-white/40]="!incoming.isNonContact"
                     [class.text-white]="!incoming.isNonContact">
                  {{ incoming.name ? incoming.name[0].toUpperCase() : 'C' }}
                </div>

                <!-- Non-contact names are colored red; saved contacts are clean white -->
                <h2 class="text-[26px] font-semibold text-center leading-tight mb-1 drop-shadow-md"
                    [class.text-red-400]="incoming.isNonContact"
                    [class.text-white]="!incoming.isNonContact">
                  {{ incoming.name }}
                </h2>

                <p class="text-[15px] text-gray-200 font-mono drop-shadow text-center">{{ incoming.phone }}</p>
                <p class="text-[13px] text-emerald-300 font-medium drop-shadow text-center mt-1">Incoming call...</p>

                @if(!phoneState.isContact(incoming.phone) && !phoneState.isTrusted(incoming.phone)) {
                  <button class="mt-3 px-3 py-1 bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/20 text-xs rounded-full flex items-center text-green-300 transition-colors cursor-pointer shadow-sm"
                          (click)="phoneState.addToTrustList(incoming.name, incoming.phone)">
                    <mat-icon class="text-[14px] w-3.5 h-3.5 mr-1 text-green-400">add_moderator</mat-icon> Add to Trust List
                  </button>
                }
              </div>

              <!-- Bottom Section: Answer / Decline (Respects answerButtonMode: click vs swipe) -->
              <div class="flex flex-col items-center mb-10">
                @if(phoneState.answerButtonMode() === 'click') {
                  <!-- 1. "CLICK TO ANS" UI: Direct One-Click Tap -->
                  <div class="w-full flex justify-around items-center px-10">
                    <!-- Decline Button -->
                    <button class="flex flex-col items-center cursor-pointer active:scale-90 transition-transform duration-75 select-none"
                            style="touch-action: manipulation; -webkit-tap-highlight-color: transparent;"
                            (click)="phoneState.declineIncomingCall()">
                      <div class="w-16 h-16 bg-[#f03b3b] hover:bg-red-600 rounded-full flex items-center justify-center shadow-2xl">
                        <mat-icon class="text-3xl text-white">call_end</mat-icon>
                      </div>
                      <span class="text-xs text-gray-200 mt-2 font-medium drop-shadow">Decline</span>
                    </button>

                    <!-- Answer Button (Single Click) -->
                    <button class="flex flex-col items-center cursor-pointer active:scale-90 transition-transform duration-75 select-none"
                            style="touch-action: manipulation; -webkit-tap-highlight-color: transparent;"
                            (click)="phoneState.acceptIncomingCall()">
                      <div class="w-16 h-16 bg-[#18c34b] hover:bg-green-500 rounded-full flex items-center justify-center shadow-[0_0_25px_rgba(24,195,75,0.6)]">
                        <mat-icon class="text-3xl text-white animate-ring-shake">call</mat-icon>
                      </div>
                      <span class="text-xs text-gray-200 mt-2 font-medium drop-shadow">Answer</span>
                    </button>
                  </div>
                } @else {
                  <!-- 2. "CLICK AND SWIPE TO ANS" UI: 360-degree Gesture Swipe -->
                  <div class="w-full flex justify-around items-center px-6 relative">
                    <!-- Decline Button -->
                    <button class="flex flex-col items-center cursor-pointer active:scale-90 transition-transform duration-75 select-none"
                            style="touch-action: manipulation; -webkit-tap-highlight-color: transparent;"
                            (click)="phoneState.declineIncomingCall()">
                      <div class="w-16 h-16 bg-[#f03b3b] hover:bg-red-600 rounded-full flex items-center justify-center shadow-2xl">
                        <mat-icon class="text-3xl text-white">call_end</mat-icon>
                      </div>
                      <span class="text-xs text-gray-200 mt-2 font-medium drop-shadow">Decline</span>
                    </button>

                    <!-- Green Swipe-To-Answer Area: Free 360-degree drag in any direction (NO ARROWS!) -->
                    <div class="relative flex items-center justify-center">
                      <!-- Pulsing multi-ring glowing aura (No arrows!) -->
                      <div class="absolute w-28 h-28 rounded-full border border-green-500/20 animate-ping pointer-events-none"></div>
                      <div class="absolute w-32 h-32 rounded-full border border-green-400/30 pointer-events-none scale-110 duration-700 animate-pulse"></div>
                      
                      <!-- Target threshold trigger ring -->
                      <div class="absolute w-28 h-28 rounded-full border-2 border-dashed pointer-events-none transition-colors duration-200"
                           [class.border-green-400]="currentDragDistance() >= 55"
                           [class.border-green-500/30]="currentDragDistance() < 55"></div>

                      <!-- Green Call Button: Draggable anywhere. Call is ONLY accepted when released outside threshold -->
                      <div class="touch-none select-none z-10"
                           [style.transform]="swipeTransform()"
                           [style.transition]="isDragging() ? 'none' : 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'"
                           (pointerdown)="onSwipeStart($event)"
                           aria-label="Swipe to answer">
                        <div class="w-18 h-18 bg-green-500 rounded-full flex items-center justify-center shadow-[0_0_25px_rgba(34,197,94,0.6)] cursor-grab active:cursor-grabbing transition-shadow"
                             [class.scale-110]="isDragging()"
                             [class.animate-answer-btn]="!isDragging()">
                          <mat-icon class="text-3xl text-white pointer-events-none animate-ring-shake">call</mat-icon>
                        </div>
                      </div>
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>
        }
      }

      <!-- ACTIVE CALLER SECTION WITH FULL IN-CALL CONTROLS & REAL TWO-WAY AUDIO ENGINE -->
      @if(phoneState.activeCall(); as call) {
        @if(phoneState.activeCallViewMode() === 'banner') {
          <div class="fixed top-2 left-2.5 right-2.5 max-w-[460px] mx-auto z-[255] animate-notch-banner select-none">
            <div class="bg-[#18191c]/95 backdrop-blur-2xl border border-white/15 rounded-[26px] px-4 py-3.5 shadow-[0_18px_45px_rgba(0,0,0,0.55)] text-white flex flex-col cursor-pointer"
                 (click)="phoneState.expandActiveCallToFullScreen()"
                 (keyup.enter)="phoneState.expandActiveCallToFullScreen()"
                 tabindex="0"
                 role="button"
                 aria-label="Expand active call to full screen">
              <div class="flex items-center justify-between">
                <div class="flex items-center min-w-0 pr-2 flex-1">
                  <div class="relative mr-3 shrink-0">
                    <div class="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold relative z-10 border bg-green-500/25 border-green-400 text-green-300">
                      {{ call.name ? call.name[0].toUpperCase() : 'C' }}
                    </div>
                  </div>
                  <div class="flex flex-col min-w-0">
                    <div class="flex items-center space-x-1.5">
                      <span class="text-[17px] font-bold leading-snug truncate text-white">{{ call.name }}</span>
                      <span class="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-semibold">{{ phoneState.callDuration() }}</span>
                    </div>
                    <span class="text-[12px] text-gray-300 font-mono truncate">
                      {{ call.phone }} &bull; Connected
                    </span>
                  </div>
                </div>
                <div class="flex items-center space-x-3 shrink-0">
                  <!-- Speaker Button (Replaces Mute so user can talk hands-free while working!) -->
                  <button type="button"
                          class="w-11 h-11 rounded-full active:scale-90 flex items-center justify-center transition-all cursor-pointer shadow-md"
                          [class.bg-[#007dff]]="call.isSpeaker"
                          [class.text-white]="call.isSpeaker"
                          [class.bg-white/15]="!call.isSpeaker"
                          [class.hover:bg-white/25]="!call.isSpeaker"
                          [class.text-white]="!call.isSpeaker"
                          (click)="$event.stopPropagation(); phoneState.toggleCallSpeaker()"
                          title="Toggle speaker"
                          aria-label="Toggle speaker">
                    <mat-icon class="text-[22px] w-5.5 h-5.5">{{ call.isSpeaker ? 'volume_up' : 'volume_down' }}</mat-icon>
                  </button>
                  <button type="button"
                          class="w-11 h-11 rounded-full bg-[#e53935] hover:bg-red-600 active:scale-90 flex items-center justify-center text-white shadow-lg transition-transform cursor-pointer"
                          (click)="$event.stopPropagation(); phoneState.endCall()"
                          aria-label="End call">
                    <mat-icon class="text-[22px] w-5.5 h-5.5">call_end</mat-icon>
                  </button>
                </div>
              </div>
            </div>
          </div>
        } @else {
          <!-- FULL-SCREEN ACTIVE CALLER VIEW (Translucent Home Screen Wallpaper Background!) -->
          <div class="fixed inset-0 z-[160] flex flex-col justify-between text-white p-6 max-w-[480px] mx-auto animate-fade-in select-none overflow-hidden">
            <!-- Translucent Home Screen Wallpaper Layer -->
            <div class="absolute inset-0 z-0 bg-cover bg-center pointer-events-none scale-105 transition-all duration-300"
                 [style.backgroundImage]="callerWallpaperBg()">
            </div>
            <!-- Translucent Frosted Glass Overlay (Translucent with wallpaper visible underneath, NOT solid blue or gray!) -->
            <div class="absolute inset-0 z-0 bg-slate-950/45 backdrop-blur-xl pointer-events-none"></div>

            <div class="relative z-10 flex flex-col justify-between h-full w-full">
            
            <!-- Held Call Banner (When another person is on hold on this local SIM call) -->
            @if(phoneState.heldCall(); as held) {
              <div class="w-full max-w-[340px] mx-auto bg-amber-500/25 border border-amber-400/50 rounded-2xl px-3.5 py-2.5 mt-2 mb-2 flex items-center justify-between backdrop-blur-md shadow-lg animate-fade-in">
                <div class="flex items-center min-w-0 pr-2">
                  <div class="w-9 h-9 rounded-full bg-amber-500/30 text-amber-300 flex items-center justify-center mr-2.5 shrink-0 border border-amber-400/40">
                    <mat-icon class="text-[20px] w-5 h-5">pause</mat-icon>
                  </div>
                  <div class="flex flex-col truncate">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-amber-300 flex items-center">
                      <span class="w-1.5 h-1.5 bg-amber-400 rounded-full mr-1 animate-pulse"></span> On Hold
                    </span>
                    <span class="text-sm font-bold text-white truncate">{{ held.name }}</span>
                    <span class="text-[10px] text-gray-200 font-mono">{{ held.duration }}</span>
                  </div>
                </div>
                <div class="flex items-center space-x-1.5 shrink-0">
                  <!-- Feature to switch the person when calls are not merged -->
                  <button class="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 active:scale-95 text-gray-950 font-bold text-xs rounded-xl flex items-center transition-all cursor-pointer shadow-sm"
                          (click)="phoneState.swapCalls()" title="Switch to {{ held.name }}">
                    <mat-icon class="text-[16px] w-4 h-4 mr-1">swap_calls</mat-icon>
                    <span>Switch</span>
                  </button>
                  <!-- Merge calls into conference -->
                  <button class="px-3 py-1.5 bg-green-500 hover:bg-green-600 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center transition-all cursor-pointer shadow-sm"
                          (click)="phoneState.mergeCalls()" title="Merge calls into conference">
                    <mat-icon class="text-[16px] w-4 h-4 mr-1">call_merge</mat-icon>
                    <span>Merge</span>
                  </button>
                </div>
              </div>
            }

            <!-- Top Callee Profile (Clean typography matching native InCallActivity without dev badges) -->
            <div class="flex flex-col items-center mt-6">
              <!-- Avatar: Clean circular avatar with subtle border & shadow -->
              <div class="w-28 h-28 rounded-full flex items-center justify-center text-4xl font-semibold my-3 shadow-2xl backdrop-blur-md overflow-hidden"
                   [class.bg-red-500/25]="call.isNonContact"
                   [class.border-2]="true"
                   [class.border-red-500/60]="call.isNonContact"
                   [class.text-red-300]="call.isNonContact"
                   [class.bg-white/15]="!call.isNonContact"
                   [class.border]="!call.isNonContact"
                   [class.border-white/30]="!call.isNonContact"
                   [class.text-white]="!call.isNonContact">
                {{ call.name ? call.name[0].toUpperCase() : 'C' }}
              </div>

              <!-- Callee Name: text-[26px] font-medium leading-tight text-white drop-shadow-md text-center -->
              <h2 class="text-[26px] font-medium text-center leading-tight mb-1 drop-shadow-md"
                  [class.text-red-400]="call.isNonContact"
                  [class.text-white]="!call.isNonContact">
                {{ call.name }}
              </h2>

              <!-- Callee Phone Number with Country/Label: text-sm font-normal text-white/80 -->
              <p class="text-[14px] text-white/80 font-normal drop-shadow text-center">
                {{ call.phone }} <span class="text-white/60 text-xs ml-1">India</span>
              </p>

              <!-- Clean Call Timing / Status Line (Ringing..., Calling..., or Call Duration 00:15) - NO bulky pills or dev badges -->
              <div class="mt-1.5 flex items-center justify-center min-h-[24px]">
                @if(call.isOnHold) {
                  <span class="text-sm font-medium text-amber-300 tracking-wide drop-shadow">On Hold</span>
                } @else if(phoneState.isRecording()) {
                  <span class="text-sm font-medium text-red-300 tracking-wide drop-shadow flex items-center">
                    <span class="w-2 h-2 bg-red-400 rounded-full animate-ping mr-1.5"></span>
                    REC {{ phoneState.callDuration() }}
                  </span>
                } @else if(phoneState.callStatus() === 'Calling...') {
                  <span class="text-sm font-medium text-white/75 tracking-wide drop-shadow">Calling...</span>
                } @else if(phoneState.callStatus() === 'Ringing...') {
                  <span class="text-sm font-medium text-white/75 tracking-wide drop-shadow">Ringing...</span>
                } @else {
                  <span class="text-sm font-medium text-white/80 tracking-wide drop-shadow">
                    {{ phoneState.callDuration() }}
                  </span>
                }
              </div>

              <!-- Conference participants indicator if added -->
              @if(call.conferenceParticipants.length > 0) {
                <div class="mt-2 bg-white/15 backdrop-blur-md px-3 py-0.5 rounded-full text-xs text-white flex items-center border border-white/20">
                  <mat-icon class="text-[14px] w-3.5 h-3.5 mr-1 text-emerald-300">groups</mat-icon>
                  <span>With: {{ call.conferenceParticipants.join(', ') }}</span>
                </div>
              }

              <!-- In-Call DTMF digits display -->
              @if(call.dtmfDigits) {
                <div class="mt-1 text-xs font-mono text-emerald-300 tracking-widest bg-black/40 backdrop-blur-md px-2.5 py-0.5 rounded-md border border-white/10">
                  DTMF: {{ call.dtmfDigits }}
                </div>
              }
            </div>

            <!-- In-Call Keypad Overlay (When dialpad is opened during call) -->
            @if(phoneState.isInCallKeypadOpen()) {
              <div class="bg-slate-900/85 backdrop-blur-2xl rounded-3xl p-4 my-2 border border-white/20 max-w-[320px] mx-auto w-full shadow-2xl">
                <div class="flex justify-between items-center mb-2 px-2">
                  <span class="text-xs font-semibold text-gray-200">In-Call Keypad (DTMF)</span>
                  <button class="text-xs text-white hover:text-white px-2 py-0.5 rounded-lg bg-white/20 hover:bg-white/30 cursor-pointer"
                          (click)="toggleInCallKeypad()">
                    Hide
                  </button>
                </div>
                <div class="grid grid-cols-3 gap-2">
                  @for(k of ['1','2','3','4','5','6','7','8','9','*','0','#']; track k) {
                    <button class="h-12 bg-white/15 hover:bg-white/25 active:bg-white/35 rounded-2xl flex items-center justify-center text-xl font-bold cursor-pointer active:scale-95 transition-transform text-white border border-white/10"
                            (pointerdown)="phoneState.sendInCallDtmf(k)">
                      {{ k }}
                    </button>
                  }
                </div>
              </div>
            }

            <!-- 3x3 IN-CALL ACTION GRID (Exact match to native InCallActivity screenshot!) -->
            <div class="w-full max-w-[340px] mx-auto mb-8 px-2">
              <div class="grid grid-cols-3 gap-y-7 items-center justify-items-center">
                
                <!-- ROW 1, COL 1: RECORD -->
                <button type="button"
                        class="flex flex-col items-center justify-center cursor-pointer active:scale-90 transition-transform duration-75 select-none group"
                        style="touch-action: manipulation; -webkit-tap-highlight-color: transparent;"
                        (click)="phoneState.toggleActiveRecording()"
                        title="Toggle call recording"
                        aria-label="Record call">
                  <div class="w-14 h-14 rounded-full flex items-center justify-center transition-all border border-white/10"
                       [class.bg-red-600]="phoneState.isRecording()"
                       [class.text-white]="phoneState.isRecording()"
                       [class.shadow-lg]="phoneState.isRecording()"
                       [class.shadow-red-600/40]="phoneState.isRecording()"
                       [class.bg-white/10]="!phoneState.isRecording()"
                       [class.hover:bg-white/20]="!phoneState.isRecording()"
                       [class.text-white]="!phoneState.isRecording()">
                    <mat-icon class="text-[26px] w-6.5 h-6.5">graphic_eq</mat-icon>
                  </div>
                  <span class="text-[12px] mt-1.5 font-normal tracking-tight"
                        [class.text-red-300]="phoneState.isRecording()"
                        [class.text-white/90]="!phoneState.isRecording()">
                    {{ phoneState.isRecording() ? 'Recording' : 'Record' }}
                  </span>
                </button>

                <!-- ROW 1, COL 2: HOLD -->
                <button type="button"
                        class="flex flex-col items-center justify-center cursor-pointer active:scale-90 transition-transform duration-75 select-none group"
                        style="touch-action: manipulation; -webkit-tap-highlight-color: transparent;"
                        (click)="phoneState.heldCall() ? phoneState.swapCalls() : phoneState.toggleCallHold()"
                        title="Hold or resume call"
                        aria-label="Hold call">
                  <div class="w-14 h-14 rounded-full flex items-center justify-center transition-all border border-white/10"
                       [class.bg-amber-500]="call.isOnHold"
                       [class.text-black]="call.isOnHold"
                       [class.bg-white/10]="!call.isOnHold"
                       [class.hover:bg-white/20]="!call.isOnHold"
                       [class.text-white]="!call.isOnHold">
                    <mat-icon class="text-[26px] w-6.5 h-6.5">{{ call.isOnHold ? 'play_arrow' : 'pause' }}</mat-icon>
                  </div>
                  <span class="text-[12px] mt-1.5 font-normal tracking-tight text-white/90">
                    {{ call.isOnHold ? 'Resume' : 'Hold' }}
                  </span>
                </button>

                <!-- ROW 1, COL 3: ADD CALL -->
                <button type="button"
                        class="flex flex-col items-center justify-center cursor-pointer active:scale-90 transition-transform duration-75 select-none group"
                        style="touch-action: manipulation; -webkit-tap-highlight-color: transparent;"
                        (click)="phoneState.heldCall() ? phoneState.mergeCalls() : phoneState.isAddPersonModalOpen.set(true)"
                        title="Add another person or merge"
                        aria-label="Add call">
                  <div class="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all border border-white/10">
                    <mat-icon class="text-[26px] w-6.5 h-6.5">{{ phoneState.heldCall() ? 'call_merge' : 'add' }}</mat-icon>
                  </div>
                  <span class="text-[12px] mt-1.5 font-normal tracking-tight text-white/90">
                    {{ phoneState.heldCall() ? 'Merge' : 'Add call' }}
                  </span>
                </button>

                <!-- ROW 2, COL 1: VIDEO CALL -->
                <button type="button"
                        class="flex flex-col items-center justify-center cursor-pointer active:scale-90 transition-transform duration-75 select-none group"
                        style="touch-action: manipulation; -webkit-tap-highlight-color: transparent;"
                        (click)="phoneState.startVideoCall(call.name, call.phone)"
                        title="Switch to video call"
                        aria-label="Video call">
                  <div class="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all border border-white/10">
                    <mat-icon class="text-[26px] w-6.5 h-6.5">videocam</mat-icon>
                  </div>
                  <span class="text-[12px] mt-1.5 font-normal tracking-tight text-white/90">Video call</span>
                </button>

                <!-- ROW 2, COL 2: MUTE -->
                <button type="button"
                        class="flex flex-col items-center justify-center cursor-pointer active:scale-90 transition-transform duration-75 select-none group"
                        style="touch-action: manipulation; -webkit-tap-highlight-color: transparent;"
                        (click)="phoneState.toggleCallMute()"
                        title="Toggle microphone mute"
                        aria-label="Mute microphone">
                  <div class="w-14 h-14 rounded-full flex items-center justify-center transition-all border border-white/10"
                       [class.bg-white/30]="call.isMuted"
                       [class.text-amber-300]="call.isMuted"
                       [class.bg-white/10]="!call.isMuted"
                       [class.hover:bg-white/20]="!call.isMuted"
                       [class.text-white]="!call.isMuted">
                    <mat-icon class="text-[26px] w-6.5 h-6.5">{{ call.isMuted ? 'mic_off' : 'mic' }}</mat-icon>
                  </div>
                  <span class="text-[12px] mt-1.5 font-normal tracking-tight text-white/90">
                    {{ call.isMuted ? 'Muted' : 'Mute' }}
                  </span>
                </button>

                <!-- ROW 2, COL 3: CONTACTS -->
                <button type="button"
                        class="flex flex-col items-center justify-center cursor-pointer active:scale-90 transition-transform duration-75 select-none group"
                        style="touch-action: manipulation; -webkit-tap-highlight-color: transparent;"
                        (click)="phoneState.activeCallViewMode.set('banner'); switchTab('contacts')"
                        title="Open contacts list"
                        aria-label="Open contacts">
                  <div class="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all border border-white/10">
                    <mat-icon class="text-[26px] w-6.5 h-6.5">person</mat-icon>
                  </div>
                  <span class="text-[12px] mt-1.5 font-normal tracking-tight text-white/90">Contacts</span>
                </button>

                <!-- ROW 3, COL 1: KEYPAD -->
                <button type="button"
                        class="flex flex-col items-center justify-center cursor-pointer active:scale-90 transition-transform duration-75 select-none group"
                        style="touch-action: manipulation; -webkit-tap-highlight-color: transparent;"
                        (click)="toggleInCallKeypad()"
                        title="In-call DTMF dialpad"
                        aria-label="Keypad">
                  <div class="w-14 h-14 rounded-full flex items-center justify-center transition-all border border-white/10"
                       [class.bg-white/30]="phoneState.isInCallKeypadOpen()"
                       [class.text-blue-300]="phoneState.isInCallKeypadOpen()"
                       [class.bg-white/10]="!phoneState.isInCallKeypadOpen()"
                       [class.hover:bg-white/20]="!phoneState.isInCallKeypadOpen()"
                       [class.text-white]="!phoneState.isInCallKeypadOpen()">
                    <mat-icon class="text-[26px] w-6.5 h-6.5">dialpad</mat-icon>
                  </div>
                  <span class="text-[12px] mt-1.5 font-normal tracking-tight text-white/90">
                    {{ phoneState.isInCallKeypadOpen() ? 'Hide Pad' : 'Keypad' }}
                  </span>
                </button>

                <!-- ROW 3, COL 2: END CALL (RED CIRCULAR BUTTON) -->
                <button type="button"
                        class="w-[70px] h-[70px] rounded-full bg-[#f03b3b] hover:bg-red-600 active:scale-90 flex items-center justify-center shadow-2xl shadow-red-600/50 text-white cursor-pointer transition-all duration-75 select-none border-2 border-red-400/30"
                        style="touch-action: manipulation; -webkit-tap-highlight-color: transparent;"
                        (click)="phoneState.endCall()"
                        title="End call"
                        aria-label="End call">
                  <mat-icon class="text-3xl">call_end</mat-icon>
                </button>

                <!-- ROW 3, COL 3: SPEAKER -->
                <button type="button"
                        class="flex flex-col items-center justify-center cursor-pointer active:scale-90 transition-transform duration-75 select-none group"
                        style="touch-action: manipulation; -webkit-tap-highlight-color: transparent;"
                        (click)="phoneState.toggleCallSpeaker()"
                        title="Toggle speaker"
                        aria-label="Toggle speaker">
                  <div class="w-14 h-14 rounded-full flex items-center justify-center transition-all border border-white/10"
                       [class.bg-blue-600]="call.isSpeaker"
                       [class.text-white]="call.isSpeaker"
                       [class.shadow-md]="call.isSpeaker"
                       [class.bg-white/10]="!call.isSpeaker"
                       [class.hover:bg-white/20]="!call.isSpeaker"
                       [class.text-white]="!call.isSpeaker">
                    <mat-icon class="text-[26px] w-6.5 h-6.5">volume_up</mat-icon>
                  </div>
                  <span class="text-[12px] mt-1.5 font-normal tracking-tight text-white/90">
                    {{ call.isSpeaker ? 'Speaker On' : 'Speaker' }}
                  </span>
                </button>

              </div>
            </div>
          </div>
        </div>
      }
      }

      <!-- ADD PERSON TO CALL MODAL (Local SIM Call: Puts first person on hold until merged) -->
      @if(phoneState.isAddPersonModalOpen()) {
        <div class="fixed inset-0 bg-black/70 z-[180] flex items-center justify-center p-4"
             tabindex="0"
             role="button"
             aria-label="Close modal"
             (click)="phoneState.isAddPersonModalOpen.set(false)"
             (keydown.enter)="phoneState.isAddPersonModalOpen.set(false)"
             (keydown.space)="phoneState.isAddPersonModalOpen.set(false)">
          <div class="bg-gray-900 border border-white/15 text-white rounded-3xl w-full max-w-sm max-h-[80vh] flex flex-col p-5 shadow-2xl"
               tabindex="0"
               role="dialog"
               aria-modal="true"
               (click)="$event.stopPropagation()"
               (keydown)="$event.stopPropagation()">
            <div class="flex justify-between items-center mb-2">
              <div class="flex items-center">
                <mat-icon class="text-blue-400 mr-2">person_add</mat-icon>
                <h3 class="text-lg font-bold">Add Call</h3>
              </div>
              <button class="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white cursor-pointer"
                      (click)="phoneState.isAddPersonModalOpen.set(false)">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            
            <p class="text-xs text-amber-300/90 mb-3 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl">
              <strong>Notice:</strong> Your current call will be placed on hold until you merge the calls.
            </p>

            <!-- Search or Direct Number Input -->
            <div class="mb-3">
              <div class="bg-white/10 rounded-xl px-3 py-2 flex items-center border border-white/10">
                <mat-icon class="text-gray-400 mr-2 text-[20px] w-5 h-5">search</mat-icon>
                <input type="text"
                       [value]="addCallSearchQuery()"
                       (input)="addCallSearchQuery.set($any($event.target).value)"
                       placeholder="Enter phone number or search contact..."
                       class="bg-transparent text-white text-sm outline-none w-full placeholder-gray-400" />
                @if(addCallSearchQuery()) {
                  <button (click)="addCallSearchQuery.set('')" class="text-gray-400 hover:text-white text-xs">
                    <mat-icon class="text-[18px] w-4.5 h-4.5">close</mat-icon>
                  </button>
                }
              </div>
              @if(addCallSearchQuery().trim()) {
                <button type="button"
                        class="w-full mt-2 py-2 px-3 bg-green-600 hover:bg-green-700 active:scale-98 rounded-xl text-white font-medium text-xs flex items-center justify-center cursor-pointer transition-colors shadow-md"
                        (click)="dialSecondPerson(addCallSearchQuery().trim(), addCallSearchQuery().trim())">
                  <mat-icon class="text-[16px] w-4 h-4 mr-1.5">call</mat-icon>
                  <span>Call "{{ addCallSearchQuery().trim() }}"</span>
                </button>
              }
            </div>

            <span class="text-[11px] text-gray-400 font-semibold uppercase tracking-wider mb-2">Contacts</span>

            <div class="flex-1 overflow-y-auto divide-y divide-white/10">
              @for(c of addCallFilteredContacts(); track c.phone) {
                <button type="button" class="w-full py-2.5 px-2 flex items-center justify-between hover:bg-white/5 rounded-xl cursor-pointer text-left transition-colors"
                        (click)="dialSecondPerson(c.name, c.phone)">
                  <div class="flex flex-col">
                    <span class="text-sm font-semibold text-white">{{ c.name }}</span>
                    <span class="text-xs text-gray-400">{{ c.phone }}</span>
                  </div>
                  <mat-icon class="text-green-400 text-[20px]">add_call</mat-icon>
                </button>
              }
            </div>
          </div>
        </div>
      }

      <!-- ACTIVE VIDEO CALL SCREEN (REAL CAMERA & WEBRTC VIDEO STREAMS) -->
      @if(phoneState.activeVideoCall(); as video) {
        <div class="fixed inset-0 bg-slate-950 z-[160] flex flex-col justify-between text-white max-w-[480px] mx-auto select-none">
          <div class="relative flex-1 bg-gradient-to-b from-slate-800 to-slate-900 flex flex-col items-center justify-center overflow-hidden">
            @if(phoneState.remoteVideoStream()) {
              <video class="w-full h-full object-cover"
                     [srcObject]="phoneState.remoteVideoStream()"
                     autoplay
                     playsinline></video>
            } @else if(!video.isCameraOff && phoneState.localVideoStream()) {
              <!-- Show live local camera feed full-screen while waiting for remote video peer -->
              <video class="w-full h-full object-cover transform scale-x-[-1]"
                     [srcObject]="phoneState.localVideoStream()"
                     autoplay
                     muted
                     playsinline></video>
            } @else if(!video.isCameraOff) {
              <div class="w-40 h-40 rounded-full bg-blue-500/20 border-2 border-blue-400/50 flex items-center justify-center shadow-2xl relative">
                <span class="text-6xl font-semibold text-blue-300">{{ video.name[0]?.toUpperCase() }}</span>
                <span class="absolute bottom-2 text-xs bg-black/60 px-2 py-0.5 rounded text-white font-mono">Opening Camera...</span>
              </div>
            } @else {
              <div class="flex flex-col items-center text-gray-400">
                <mat-icon class="text-5xl mb-2">videocam_off</mat-icon>
                <span class="text-sm">Camera is off</span>
              </div>
            }

            <div class="absolute top-6 left-0 right-0 px-6 flex justify-between items-center z-10">
              <div class="bg-black/40 backdrop-blur-md px-3.5 py-1.5 rounded-2xl">
                <h3 class="text-xl font-semibold drop-shadow">{{ video.name }}</h3>
                <p class="text-xs text-gray-200 font-mono">{{ video.duration }} &bull; {{ phoneState.remoteVideoStream() ? 'WebRTC Connected' : 'Live Camera Active' }}</p>
              </div>
              <div class="bg-black/50 backdrop-blur-md px-3 py-1 rounded-full text-xs text-green-400 flex items-center">
                <span class="w-2 h-2 rounded-full bg-green-400 mr-1.5 animate-pulse"></span> Live HD
              </div>
            </div>

            <!-- Picture-in-Picture Local Camera Preview -->
            <div class="absolute bottom-4 right-4 w-28 h-40 bg-gray-900 rounded-2xl border-2 border-white/30 shadow-2xl flex flex-col items-center justify-center overflow-hidden z-10">
              @if(!video.isCameraOff && phoneState.localVideoStream()) {
                <video class="w-full h-full object-cover transform scale-x-[-1]"
                       [srcObject]="phoneState.localVideoStream()"
                       autoplay
                       muted
                       playsinline></video>
              } @else {
                <mat-icon class="text-gray-400 text-3xl">videocam_off</mat-icon>
                <span class="text-[10px] text-gray-300 mt-1 font-medium">Camera Off</span>
              }
            </div>
          </div>

          <div class="bg-slate-900/95 backdrop-blur-md px-6 py-5 flex justify-around items-center border-t border-white/10">
            <button class="w-13 h-13 rounded-full flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                    [class.bg-white/20]="!video.isMuted" [class.bg-red-500]="video.isMuted"
                    (click)="phoneState.toggleVideoMute()"
                    title="Mute Microphone">
              <mat-icon>{{ video.isMuted ? 'mic_off' : 'mic' }}</mat-icon>
            </button>

            <button class="w-13 h-13 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                    (click)="phoneState.switchVideoCamera()"
                    title="Switch Front/Back Camera">
              <mat-icon>cameraswitch</mat-icon>
            </button>

            <button class="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center active:scale-95 transition-all shadow-lg hover:bg-red-700 cursor-pointer"
                    (click)="phoneState.endVideoCall()" aria-label="End video call">
              <mat-icon class="text-3xl">call_end</mat-icon>
            </button>

            <button class="w-13 h-13 rounded-full flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                    [class.bg-white/20]="!video.isCameraOff" [class.bg-gray-700]="video.isCameraOff"
                    (click)="phoneState.toggleVideoCamera()"
                    title="Toggle Camera">
              <mat-icon>{{ video.isCameraOff ? 'videocam_off' : 'videocam' }}</mat-icon>
            </button>
          </div>
        </div>
      }


      <!-- TRUST LIST MANAGEMENT MODAL -->
      @if(phoneState.isTrustListModalOpen()) {
        <div class="fixed inset-0 bg-black/50 z-[180] flex items-center justify-center p-4 cursor-pointer"
             tabindex="0"
             role="button"
             aria-label="Close trust list modal"
             (click)="phoneState.isTrustListModalOpen.set(false)"
             (keydown.enter)="phoneState.isTrustListModalOpen.set(false)"
             (keydown.space)="phoneState.isTrustListModalOpen.set(false)">
          <div class="bg-white rounded-3xl w-full max-w-sm max-h-[80vh] flex flex-col p-6 shadow-2xl cursor-default"
               tabindex="0"
               role="dialog"
               aria-modal="true"
               (click)="$event.stopPropagation()"
               (keydown)="$event.stopPropagation()">
            <div class="flex justify-between items-center mb-3">
              <div class="flex items-center">
                <mat-icon class="text-green-600 mr-2">verified_user</mat-icon>
                <h3 class="text-lg font-bold text-gray-900">Trust List</h3>
              </div>
              <button class="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 cursor-pointer"
                      (click)="phoneState.isTrustListModalOpen.set(false)">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            
            <p class="text-xs text-gray-500 mb-3">
              Numbers here will never be blocked by the Non-Contact filter, even if not in your main contacts:
            </p>

            <div class="flex-1 overflow-y-auto divide-y divide-gray-100 mb-4">
              @for(t of phoneState.trustList(); track t.phone) {
                <div class="py-2 flex items-center justify-between">
                  <div class="flex flex-col">
                    <span class="text-sm font-semibold text-gray-900">{{ t.name }}</span>
                    <span class="text-xs text-gray-500 font-mono">{{ t.phone }} &bull; {{ t.note }}</span>
                  </div>
                  <button class="text-red-500 hover:text-red-700 p-1 cursor-pointer" (click)="phoneState.removeFromTrustList(t.phone)" aria-label="Remove from trust list">
                    <mat-icon class="text-[18px]">delete_outline</mat-icon>
                  </button>
                </div>
              }
              @if(phoneState.trustList().length === 0) {
                <div class="text-center py-6 text-gray-400 text-xs">Trust list is empty</div>
              }
            </div>

            <!-- Add new trust item -->
            <div class="bg-gray-50 p-3 rounded-2xl border border-gray-200">
              <span class="text-xs font-semibold text-gray-700 block mb-2">Add trusted number:</span>
              <input type="text" [value]="newTrustName()" (input)="newTrustName.set($any($event.target).value)" placeholder="Name / Note (e.g. Courier)" class="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg mb-2 outline-none" />
              <input type="tel" [value]="newTrustPhone()" (input)="newTrustPhone.set($any($event.target).value)" placeholder="Phone number" class="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg mb-2 outline-none font-mono" />
              <button class="w-full py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg disabled:opacity-50 cursor-pointer"
                      [disabled]="!newTrustName() || !newTrustPhone()"
                      (click)="saveTrustItem()">
                + Add to Trust List
              </button>
            </div>
          </div>
        </div>
      }


      <!-- ADD CONTACT MODAL (With Save to Mobile / Gmail / SIM Selector) -->
      @if(phoneState.isAddModalOpen()) {
        <div class="fixed inset-0 bg-black/45 z-[170] flex items-center justify-center p-4 cursor-pointer"
             tabindex="0"
             role="button"
             aria-label="Close add contact modal"
             (click)="phoneState.closeAddContact()"
             (keydown.enter)="phoneState.closeAddContact()"
             (keydown.space)="phoneState.closeAddContact()">
          <div class="bg-white rounded-3xl w-full max-w-sm p-5 shadow-2xl relative flex flex-col cursor-default max-h-[90vh] overflow-y-auto"
               tabindex="0"
               role="dialog"
               aria-modal="true"
               (click)="$event.stopPropagation()"
               (keydown)="$event.stopPropagation()">
            <div class="flex justify-between items-center mb-3">
              <h3 class="text-xl font-bold text-gray-900">New contact</h3>
              <button class="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-full cursor-pointer" (click)="phoneState.closeAddContact()">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <!-- Save To Account Selector: Mobile (Phone) | Gmail | SIM -->
            <div class="mb-4">
              <span class="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Save contact to</span>
              <div class="grid grid-cols-3 gap-2">
                <!-- Option 1: Mobile (Phone) -->
                <button type="button"
                        class="py-2.5 px-2 rounded-2xl border flex flex-col items-center justify-center transition-all cursor-pointer"
                        [class.border-[#007dff]]="addContactStorage() === 'mobile'"
                        [class.bg-blue-50/70]="addContactStorage() === 'mobile'"
                        [class.text-[#007dff]]="addContactStorage() === 'mobile'"
                        [class.border-gray-200]="addContactStorage() !== 'mobile'"
                        [class.text-gray-700]="addContactStorage() !== 'mobile'"
                        (click)="addContactStorage.set('mobile')">
                  <mat-icon class="text-[20px] w-5 h-5 mb-0.5">phone_android</mat-icon>
                  <span class="text-xs font-semibold leading-tight">Mobile</span>
                  <span class="text-[10px] text-gray-500 leading-tight">Phone</span>
                </button>

                <!-- Option 2: Gmail (Google Account) -->
                <button type="button"
                        class="py-2.5 px-2 rounded-2xl border flex flex-col items-center justify-center transition-all cursor-pointer"
                        [class.border-[#007dff]]="addContactStorage() === 'gmail'"
                        [class.bg-blue-50/70]="addContactStorage() === 'gmail'"
                        [class.text-[#007dff]]="addContactStorage() === 'gmail'"
                        [class.border-gray-200]="addContactStorage() !== 'gmail'"
                        [class.text-gray-700]="addContactStorage() !== 'gmail'"
                        (click)="addContactStorage.set('gmail')">
                  <mat-icon class="text-[20px] w-5 h-5 mb-0.5">mail</mat-icon>
                  <span class="text-xs font-semibold leading-tight">Gmail</span>
                  <span class="text-[10px] text-gray-500 leading-tight truncate max-w-[85px]">Google</span>
                </button>

                <!-- Option 3: SIM Card -->
                <button type="button"
                        class="py-2.5 px-2 rounded-2xl border flex flex-col items-center justify-center transition-all cursor-pointer"
                        [class.border-[#007dff]]="addContactStorage() === 'sim'"
                        [class.bg-blue-50/70]="addContactStorage() === 'sim'"
                        [class.text-[#007dff]]="addContactStorage() === 'sim'"
                        [class.border-gray-200]="addContactStorage() !== 'sim'"
                        [class.text-gray-700]="addContactStorage() !== 'sim'"
                        (click)="addContactStorage.set('sim')">
                  <mat-icon class="text-[20px] w-5 h-5 mb-0.5">sim_card</mat-icon>
                  <span class="text-xs font-semibold leading-tight">SIM Card</span>
                  <span class="text-[10px] text-gray-500 leading-tight">SIM 1</span>
                </button>
              </div>

              @if(addContactStorage() === 'gmail') {
                <div class="mt-2.5 bg-blue-50/70 border border-blue-200/90 rounded-2xl p-2.5">
                  <div class="flex items-center justify-between mb-1.5 px-0.5">
                    <span class="text-[10px] font-bold text-blue-800 uppercase tracking-wider">Gmail Accounts Logged In on Phone</span>
                    <span class="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      {{ phoneState.signedInGoogleAccounts().length }} Detected
                    </span>
                  </div>

                  <!-- Tap to Select Signed-in Phone Google Account (No login required!) -->
                  <button type="button"
                          class="w-full bg-white border border-blue-200 hover:border-[#007dff] rounded-xl px-3 py-2 flex items-center justify-between transition-all cursor-pointer shadow-2xs"
                          (click)="openGooglePickerForAdd()">
                    <div class="flex items-center space-x-2.5 min-w-0">
                      <div class="w-7 h-7 rounded-full bg-[#1a73e8] text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {{ ((addContactGmailAccount() || phoneState.connectedGmailAccount())[0] || 'G').toUpperCase() }}
                      </div>
                      <div class="flex flex-col text-left min-w-0">
                        <span class="text-xs font-bold text-gray-900 truncate">
                          {{ addContactGmailAccount() || phoneState.connectedGmailAccount() || 'Select your Google Account on phone' }}
                        </span>
                        <span class="text-[10px] text-gray-500 leading-tight">
                          Tap to choose from {{ phoneState.signedInGoogleAccounts().length }} Gmail accounts on phone
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
                                [class.bg-blue-50]="addContactGmailAccount() === acc.email"
                                [class.hover:bg-gray-50]="addContactGmailAccount() !== acc.email"
                                (click)="selectGoogleAccountForAdd(acc.email)">
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
                          @if(addContactGmailAccount() === acc.email) {
                            <mat-icon class="text-[#007dff] text-[18px] w-4.5 h-4.5 shrink-0">check_circle</mat-icon>
                          }
                        </button>
                      }
                    </div>
                  }
                </div>
              }
            </div>

            <div class="flex flex-col gap-3.5 mb-4">
              <div>
                <label class="block text-xs font-semibold text-gray-500 uppercase mb-1">
                  Name
                  <input type="text"
                         [value]="addContactName()"
                         (input)="addContactName.set($any($event.target).value)"
                         placeholder="Full name"
                         class="w-full mt-1 px-3 py-2 border border-gray-300 rounded-xl outline-none focus:border-[#007dff] text-[15px] font-normal text-gray-900 normal-case" />
                </label>
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-500 uppercase mb-1">
                  Phone number
                  <input type="tel"
                         [value]="addContactPhone()"
                         (input)="addContactPhone.set($any($event.target).value)"
                         placeholder="Phone number"
                         class="w-full mt-1 px-3 py-2 border border-gray-300 rounded-xl outline-none focus:border-[#007dff] text-[15px] font-normal text-gray-900 normal-case" />
                </label>
                @if (existingContactForTypedPhone(); as existingMatch) {
                  <div class="mt-1.5 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-start space-x-1.5">
                    <mat-icon class="text-[15px] w-4 h-4 text-amber-600 shrink-0 mt-0.5">info</mat-icon>
                    <span>
                      Same number as <strong>{{ existingMatch.name }}</strong> ({{ existingMatch.phone }}). Saving will update this existing contact instead of creating a duplicate.
                    </span>
                  </div>
                }
              </div>
              @if(addContactStorage() !== 'sim') {
                <div>
                  <label class="block text-xs font-semibold text-gray-500 uppercase mb-1">
                    Email (Optional)
                    <input type="email"
                           [value]="addContactEmail()"
                           (input)="addContactEmail.set($any($event.target).value)"
                           placeholder="Email address"
                           class="w-full mt-1 px-3 py-2 border border-gray-300 rounded-xl outline-none focus:border-[#007dff] text-[14px] font-normal text-gray-900 normal-case" />
                  </label>
                </div>
              }
            </div>

            <!-- Optional Direct File Export Toggle for Mobile (.vcf) or Gmail (.csv) -->
            <label class="flex items-center space-x-2.5 mb-5 px-3 py-2 bg-gray-50 rounded-xl border border-gray-200/80 cursor-pointer">
              <input type="checkbox"
                     [checked]="alsoExportContactFile()"
                     (change)="alsoExportContactFile.set($any($event.target).checked)"
                     class="w-4 h-4 accent-[#007dff] rounded cursor-pointer" />
              <span class="text-xs text-gray-700 leading-snug">
                @if(addContactStorage() === 'gmail') {
                  Also download Google Contacts file (<code>.csv</code>) for Gmail import
                } @else {
                  Also download vCard file (<code>.vcf</code>) to Mobile address book
                }
              </span>
            </label>

            <div class="flex justify-end gap-2.5">
              <button type="button"
                      class="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 font-medium text-sm cursor-pointer"
                      (click)="phoneState.closeAddContact()">Cancel</button>
              <button type="button"
                      class="px-5 py-2 bg-[#007dff] text-white rounded-xl font-semibold text-sm hover:bg-blue-600 disabled:opacity-50 cursor-pointer flex items-center space-x-1.5"
                      [disabled]="!addContactName() || !addContactPhone()"
                      (click)="saveNewContact()">
                <mat-icon class="text-[18px] w-4.5 h-4.5">
                  {{ addContactStorage() === 'gmail' ? 'cloud_done' : addContactStorage() === 'sim' ? 'sim_card' : 'save' }}
                </mat-icon>
                <span>Save to {{ addContactStorage() === 'gmail' ? 'Gmail' : addContactStorage() === 'sim' ? 'SIM' : 'Mobile' }}</span>
              </button>
            </div>
          </div>
        </div>
      }

      <!-- EDIT CONTACT MODAL (With Save to Mobile / Gmail / SIM Selector) -->
      @if(phoneState.isEditModalOpen() && phoneState.editModalData(); as editData) {
        <div class="fixed inset-0 bg-black/45 z-[170] flex items-center justify-center p-4 cursor-pointer"
             tabindex="0"
             role="button"
             aria-label="Close edit contact modal"
             (click)="phoneState.closeEditContact()"
             (keydown.enter)="phoneState.closeEditContact()"
             (keydown.space)="phoneState.closeEditContact()">
          <div class="bg-white rounded-3xl w-full max-w-sm p-5 shadow-2xl relative flex flex-col cursor-default max-h-[90vh] overflow-y-auto"
               tabindex="0"
               role="dialog"
               aria-modal="true"
               (click)="$event.stopPropagation()"
               (keydown)="$event.stopPropagation()">
            <div class="flex justify-between items-center mb-3">
              <h3 class="text-xl font-bold text-gray-900">Edit contact</h3>
              <button class="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-full cursor-pointer" (click)="phoneState.closeEditContact()">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <!-- Save To Account Selector: Mobile (Phone) | Gmail | SIM -->
            <div class="mb-4">
              <span class="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Saved in location</span>
              <div class="grid grid-cols-3 gap-2">
                <button type="button"
                        class="py-2 px-2 rounded-2xl border flex flex-col items-center justify-center transition-all cursor-pointer"
                        [class.border-[#007dff]]="editStorage() === 'mobile'"
                        [class.bg-blue-50/70]="editStorage() === 'mobile'"
                        [class.text-[#007dff]]="editStorage() === 'mobile'"
                        [class.border-gray-200]="editStorage() !== 'mobile'"
                        [class.text-gray-700]="editStorage() !== 'mobile'"
                        (click)="editStorage.set('mobile')">
                  <mat-icon class="text-[20px] w-5 h-5 mb-0.5">phone_android</mat-icon>
                  <span class="text-xs font-semibold leading-tight">Mobile</span>
                </button>
                <button type="button"
                        class="py-2 px-2 rounded-2xl border flex flex-col items-center justify-center transition-all cursor-pointer"
                        [class.border-[#007dff]]="editStorage() === 'gmail'"
                        [class.bg-blue-50/70]="editStorage() === 'gmail'"
                        [class.text-[#007dff]]="editStorage() === 'gmail'"
                        [class.border-gray-200]="editStorage() !== 'gmail'"
                        [class.text-gray-700]="editStorage() !== 'gmail'"
                        (click)="editStorage.set('gmail')">
                  <mat-icon class="text-[20px] w-5 h-5 mb-0.5">mail</mat-icon>
                  <span class="text-xs font-semibold leading-tight">Gmail</span>
                </button>
                <button type="button"
                        class="py-2 px-2 rounded-2xl border flex flex-col items-center justify-center transition-all cursor-pointer"
                        [class.border-[#007dff]]="editStorage() === 'sim'"
                        [class.bg-blue-50/70]="editStorage() === 'sim'"
                        [class.text-[#007dff]]="editStorage() === 'sim'"
                        [class.border-gray-200]="editStorage() !== 'sim'"
                        [class.text-gray-700]="editStorage() !== 'sim'"
                        (click)="editStorage.set('sim')">
                  <mat-icon class="text-[20px] w-5 h-5 mb-0.5">sim_card</mat-icon>
                  <span class="text-xs font-semibold leading-tight">SIM Card</span>
                </button>
              </div>

              @if(editStorage() === 'gmail') {
                <div class="mt-2.5 bg-blue-50/70 border border-blue-200/90 rounded-2xl p-2.5">
                  <div class="flex items-center justify-between mb-1.5 px-0.5">
                    <span class="text-[10px] font-bold text-blue-800 uppercase tracking-wider">Gmail Accounts Logged In on Phone</span>
                    <span class="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      {{ phoneState.signedInGoogleAccounts().length }} Detected
                    </span>
                  </div>

                  <!-- Tap to Select Signed-in Phone Google Account (No login required!) -->
                  <button type="button"
                          class="w-full bg-white border border-blue-200 hover:border-[#007dff] rounded-xl px-3 py-2 flex items-center justify-between transition-all cursor-pointer shadow-2xs"
                          (click)="openGooglePickerForEdit()">
                    <div class="flex items-center space-x-2.5 min-w-0">
                      <div class="w-7 h-7 rounded-full bg-[#1a73e8] text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {{ ((editGmailAccount() || phoneState.connectedGmailAccount())[0] || 'G').toUpperCase() }}
                      </div>
                      <div class="flex flex-col text-left min-w-0">
                        <span class="text-xs font-bold text-gray-900 truncate">
                          {{ editGmailAccount() || phoneState.connectedGmailAccount() || 'Select your Google Account on phone' }}
                        </span>
                        <span class="text-[10px] text-gray-500 leading-tight">
                          Tap to choose from {{ phoneState.signedInGoogleAccounts().length }} Gmail accounts on phone
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
                                [class.bg-blue-50]="editGmailAccount() === acc.email"
                                [class.hover:bg-gray-50]="editGmailAccount() !== acc.email"
                                (click)="selectGoogleAccountForEdit(acc.email)">
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
                          @if(editGmailAccount() === acc.email) {
                            <mat-icon class="text-[#007dff] text-[18px] w-4.5 h-4.5 shrink-0">check_circle</mat-icon>
                          }
                        </button>
                      }
                    </div>
                  }
                </div>
              }
            </div>

            <div class="flex flex-col gap-3.5 mb-5">
              <div>
                <label class="block text-xs font-semibold text-gray-500 uppercase mb-1">
                  Name
                  <input type="text"
                         [value]="editName()"
                         (input)="editName.set($any($event.target).value)"
                         placeholder="Full name"
                         class="w-full mt-1 px-3 py-2 border border-gray-300 rounded-xl outline-none focus:border-[#007dff] text-[15px] font-normal text-gray-900 normal-case" />
                </label>
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-500 uppercase mb-1">
                  Phone number
                  <input type="tel"
                         [value]="editPhone()"
                         (input)="editPhone.set($any($event.target).value)"
                         placeholder="Phone number"
                         class="w-full mt-1 px-3 py-2 border border-gray-300 rounded-xl outline-none focus:border-[#007dff] text-[15px] font-normal text-gray-900 normal-case" />
                </label>
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-500 uppercase mb-1">
                  Email (Optional)
                  <input type="email"
                         [value]="editEmail()"
                         (input)="editEmail.set($any($event.target).value)"
                         placeholder="Email address"
                         class="w-full mt-1 px-3 py-2 border border-gray-300 rounded-xl outline-none focus:border-[#007dff] text-[14px] font-normal text-gray-900 normal-case" />
                </label>
              </div>
            </div>

            <div class="flex justify-end gap-2.5">
              <button type="button"
                      class="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 font-medium text-sm cursor-pointer"
                      (click)="phoneState.closeEditContact()">Cancel</button>
              <button type="button"
                      class="px-5 py-2 bg-[#007dff] text-white rounded-xl font-semibold text-sm hover:bg-blue-600 disabled:opacity-50 cursor-pointer flex items-center space-x-1.5"
                      [disabled]="!editName() || !editPhone()"
                      (click)="saveEditedContact()">
                <mat-icon class="text-[18px] w-4.5 h-4.5">check</mat-icon>
                <span>Save to {{ editStorage() === 'gmail' ? 'Gmail' : editStorage() === 'sim' ? 'SIM' : 'Mobile' }}</span>
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ========================================================================= -->
      <!-- FORCE DEFAULT APP & 2-APP SPLIT APK ENFORCEMENT SCREEN                    -->
      <!-- Forces user to set Default Caller, Default Contacts & Split               -->
      <!-- ========================================================================= -->
      @if(phoneState.isForceDefaultModalOpen()) {
        <div class="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[190] flex items-center justify-center p-4 select-none">
          <div class="bg-slate-900 border border-white/15 rounded-3xl w-full max-w-[420px] max-h-[90vh] overflow-y-auto p-5 text-white shadow-2xl flex flex-col">
            
            <!-- Top 2 Split App Icons Preview -->
            <div class="flex items-center justify-center space-x-6 mt-1 mb-3">
              <!-- App 1: Phone -->
              <div class="flex flex-col items-center">
                <div class="w-13 h-13 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg border border-white/20 relative">
                  <mat-icon class="text-white text-2xl">call</mat-icon>
                  @if(phoneState.isDefaultCaller()) {
                    <span class="absolute -top-1 -right-1 w-4 h-4 bg-green-400 text-slate-950 rounded-full flex items-center justify-center text-[10px] font-bold">✓</span>
                  }
                </div>
                <span class="text-[11px] font-semibold text-gray-200 mt-1">Phone</span>
              </div>

              <mat-icon class="text-gray-500 text-lg">call_split</mat-icon>

              <!-- App 2: Contacts -->
              <div class="flex flex-col items-center">
                <div class="w-13 h-13 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg border border-white/20 relative">
                  <mat-icon class="text-white text-2xl">contacts</mat-icon>
                  @if(phoneState.isDefaultContacts()) {
                    <span class="absolute -top-1 -right-1 w-4 h-4 bg-green-400 text-slate-950 rounded-full flex items-center justify-center text-[10px] font-bold">✓</span>
                  }
                </div>
                <span class="text-[11px] font-semibold text-gray-200 mt-1">Contacts</span>
              </div>
            </div>

            <div class="text-center mb-4">
              <span class="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 mb-1.5">
                Multi-Launcher APK &bull; Default Role Enforcement
              </span>
              <h2 class="text-xl font-bold text-white leading-tight">
                {{ phoneState.allDefaultsGranted() ? 'Default Handlers Active & Split Ready' : 'Set as Default App to Continue' }}
              </h2>
              <p class="text-xs text-gray-400 mt-1 leading-relaxed">
                After installing, this single APK splits into <strong class="text-white">2 standalone apps</strong> (<strong class="text-green-400">Phone</strong> &amp; <strong class="text-amber-400">Contacts</strong>) and enforces Android Default Handler permissions.
              </p>
            </div>

            <!-- 2 Mandatory Default Roles List -->
            <div class="space-y-2.5 mb-4">
              
              <!-- 1. Default Caller Handler (ROLE_DIALER) -->
              <div class="bg-slate-800/90 border rounded-2xl p-3 flex items-center justify-between transition-colors"
                   [class.border-green-500/50]="phoneState.isDefaultCaller()"
                   [class.border-white/10]="!phoneState.isDefaultCaller()">
                <div class="flex items-center min-w-0 pr-2">
                  <div class="w-10 h-10 rounded-xl bg-green-500/20 text-green-400 flex items-center justify-center mr-3 shrink-0">
                    <mat-icon>phone_in_talk</mat-icon>
                  </div>
                  <div class="flex flex-col min-w-0">
                    <div class="flex items-center space-x-1.5">
                      <span class="text-sm font-bold text-white truncate">Default Caller App</span>
                      <span class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-gray-300">ROLE_DIALER</span>
                    </div>
                    <span class="text-[11px] text-gray-400 truncate">InCallService + Silent Call Anti-Bomber</span>
                  </div>
                </div>
                <button class="px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 cursor-pointer transition-all"
                        [class.bg-green-500/20]="phoneState.isDefaultCaller()"
                        [class.text-green-300]="phoneState.isDefaultCaller()"
                        [class.bg-green-600]="!phoneState.isDefaultCaller()"
                        [class.text-white]="!phoneState.isDefaultCaller()"
                        (click)="phoneState.toggleIndividualDefaultRole('caller')">
                  {{ phoneState.isDefaultCaller() ? 'Default ✓' : 'Set Default' }}
                </button>
              </div>

              <!-- 2. Default Contacts Handler (CONTACTS_HANDLER) -->
              <div class="bg-slate-800/90 border rounded-2xl p-3 flex items-center justify-between transition-colors"
                   [class.border-amber-500/50]="phoneState.isDefaultContacts()"
                   [class.border-white/10]="!phoneState.isDefaultContacts()">
                <div class="flex items-center min-w-0 pr-2">
                  <div class="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mr-3 shrink-0">
                    <mat-icon>import_contacts</mat-icon>
                  </div>
                  <div class="flex flex-col min-w-0">
                    <div class="flex items-center space-x-1.5">
                      <span class="text-sm font-bold text-white truncate">Default Contacts App</span>
                      <span class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-gray-300">CONTACTS</span>
                    </div>
                    <span class="text-[11px] text-gray-400 truncate">Contacts Provider + Caller ID Sync</span>
                  </div>
                </div>
                <button class="px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 cursor-pointer transition-all"
                        [class.bg-amber-500/20]="phoneState.isDefaultContacts()"
                        [class.text-amber-300]="phoneState.isDefaultContacts()"
                        [class.bg-amber-600]="!phoneState.isDefaultContacts()"
                        [class.text-white]="!phoneState.isDefaultContacts()"
                        (click)="phoneState.toggleIndividualDefaultRole('contacts')">
                  {{ phoneState.isDefaultContacts() ? 'Default ✓' : 'Set Default' }}
                </button>
              </div>

              <!-- Split APK into 2 Launcher Apps Toggle -->
              <div class="bg-indigo-950/60 border border-indigo-500/30 rounded-2xl p-3 flex items-center justify-between">
                <div class="flex items-center pr-2">
                  <mat-icon class="text-indigo-400 mr-2.5">call_split</mat-icon>
                  <div class="flex flex-col">
                    <span class="text-xs font-bold text-indigo-200">Split APK into 2 Apps on Install</span>
                    <span class="text-[10px] text-indigo-300/80">Creates 2 separate icons: Phone &amp; Contacts</span>
                  </div>
                </div>
                <button class="px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer"
                        [class.bg-indigo-500]="phoneState.isSplitIntoThreeApps()"
                        [class.text-white]="phoneState.isSplitIntoThreeApps()"
                        [class.bg-white/10]="!phoneState.isSplitIntoThreeApps()"
                        [class.text-gray-400]="!phoneState.isSplitIntoThreeApps()"
                        (click)="phoneState.toggleSplitIntoThreeApps()">
                  {{ phoneState.isSplitIntoThreeApps() ? 'SPLIT ON' : 'OFF' }}
                </button>
              </div>
            </div>

            <!-- Primary CTA: Force Set All as Default & Split into 2 Apps -->
            <button class="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 active:scale-98 text-slate-950 font-extrabold text-sm rounded-2xl shadow-lg flex items-center justify-center space-x-2 cursor-pointer transition-all mb-2.5"
                    (click)="phoneState.forceSetAllDefaultsAndSplit()">
              <mat-icon class="text-[20px] w-5 h-5">verified</mat-icon>
              <span>{{ phoneState.allDefaultsGranted() ? 'All Default Roles Active — Continue' : 'Set All as Default & Split into 2 Apps' }}</span>
            </button>

            <!-- Secondary Actions: Open 2-App Home Screen Launcher OR View APK Manifest Code -->
            <div class="grid grid-cols-2 gap-2">
              <button class="py-2.5 px-3 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 cursor-pointer transition-colors"
                      (click)="phoneState.forceSetAllDefaultsAndSplit(); phoneState.isSplitLauncherModalOpen.set(true)">
                <mat-icon class="text-[16px] w-4 h-4 text-blue-400">apps</mat-icon>
                <span>See 2 Split Apps</span>
              </button>
              <button class="py-2.5 px-3 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 cursor-pointer transition-colors"
                      (click)="phoneState.isApkManifestModalOpen.set(true)">
                <mat-icon class="text-[16px] w-4 h-4 text-emerald-400">android</mat-icon>
                <span>APK Manifest / Code</span>
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ========================================================================= -->
      <!-- ANDROID SYSTEM ROLE MANAGER DIALOG (ROLE_DIALER / CONTACTS)               -->
      <!-- ========================================================================= -->
      @if(phoneState.activeSystemRolePrompt(); as rolePrompt) {
        <div class="fixed inset-0 bg-black/70 z-[210] flex items-center justify-center p-4 select-none">
          <div class="bg-[#202124] text-white rounded-3xl w-full max-w-[350px] p-6 shadow-2xl border border-white/10 flex flex-col items-center">
            <div class="w-12 h-12 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center mb-3">
              <mat-icon class="text-2xl">
                {{ rolePrompt === 'caller' ? 'call' : 'contacts' }}
              </mat-icon>
            </div>

            <h3 class="text-base font-bold text-center leading-snug mb-1">
              @if(rolePrompt === 'caller') { Set Phone as your default Phone app? }
              @else if(rolePrompt === 'contacts') { Set Contacts as your default Contacts handler? }
              @else { Set both split apps as default handlers? }
            </h3>
            <p class="text-xs text-gray-400 text-center mb-4">
              Android RoleManager requires a default handler to manage system calls and contacts.
            </p>

            <!-- Radio Options -->
            <div class="w-full space-y-2 mb-5">
              <!-- Option 1: Stock System App -->
              <div class="w-full p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-colors"
                   [class.border-blue-400]="phoneState.selectedRoleCandidate() === 'system_stock'"
                   [class.bg-blue-500/10]="phoneState.selectedRoleCandidate() === 'system_stock'"
                   [class.border-white/10]="phoneState.selectedRoleCandidate() !== 'system_stock'"
                   (click)="phoneState.selectedRoleCandidate.set('system_stock')"
                   (keyup.enter)="phoneState.selectedRoleCandidate.set('system_stock')"
                   tabindex="0"
                   role="button">
                <div class="flex items-center space-x-3">
                  <div class="w-9 h-9 rounded-xl bg-gray-700 flex items-center justify-center text-gray-300">
                    <mat-icon class="text-[20px] w-5 h-5">phone_android</mat-icon>
                  </div>
                  <div class="flex flex-col">
                    <span class="text-sm font-medium text-gray-200">System Stock Handler</span>
                    <span class="text-[10px] text-gray-400">Basic Android app</span>
                  </div>
                </div>
                <mat-icon class="text-[20px] w-5 h-5" [class.text-blue-400]="phoneState.selectedRoleCandidate() === 'system_stock'" [class.text-gray-500]="phoneState.selectedRoleCandidate() !== 'system_stock'">
                  {{ phoneState.selectedRoleCandidate() === 'system_stock' ? 'radio_button_checked' : 'radio_button_unchecked' }}
                </mat-icon>
              </div>

              <!-- Option 2: Our Split APK App -->
              <div class="w-full p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-colors"
                   [class.border-blue-400]="phoneState.selectedRoleCandidate() === 'our_app'"
                   [class.bg-blue-500/15]="phoneState.selectedRoleCandidate() === 'our_app'"
                   [class.border-white/10]="phoneState.selectedRoleCandidate() !== 'our_app'"
                   (click)="phoneState.selectedRoleCandidate.set('our_app')"
                   (keyup.enter)="phoneState.selectedRoleCandidate.set('our_app')"
                   tabindex="0"
                   role="button">
                <div class="flex items-center space-x-3">
                  <div class="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white">
                    <mat-icon class="text-[20px] w-5 h-5">verified_user</mat-icon>
                  </div>
                  <div class="flex flex-col">
                    <div class="flex items-center space-x-1.5">
                      <span class="text-sm font-bold text-white">
                        {{ rolePrompt === 'caller' ? 'Phone (Anti-Bomber)' : 'Contacts (Split APK)' }}
                      </span>
                    </div>
                    <span class="text-[10px] text-blue-300">com.puredial.suite &bull; Split APK</span>
                  </div>
                </div>
                <mat-icon class="text-[20px] w-5 h-5" [class.text-blue-400]="phoneState.selectedRoleCandidate() === 'our_app'" [class.text-gray-500]="phoneState.selectedRoleCandidate() !== 'our_app'">
                  {{ phoneState.selectedRoleCandidate() === 'our_app' ? 'radio_button_checked' : 'radio_button_unchecked' }}
                </mat-icon>
              </div>
            </div>

            <div class="w-full flex justify-end space-x-2">
              <button class="px-4 py-2 rounded-full text-xs font-semibold text-gray-300 hover:bg-white/10 cursor-pointer"
                      (click)="phoneState.activeSystemRolePrompt.set(null)">
                Cancel
              </button>
              <button class="px-5 py-2 rounded-full text-xs font-bold bg-[#8ab4f8] text-slate-950 hover:bg-blue-300 cursor-pointer"
                      (click)="phoneState.confirmSystemRoleSelection()">
                Set as default
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ========================================================================= -->
      <!-- ANDROID HOME SCREEN: 2 SPLIT APPS LAUNCHER VIEW                           -->
      <!-- Shows how 1 installed APK splits into 2 separate apps on the device       -->
      <!-- ========================================================================= -->
      @if(phoneState.isSplitLauncherModalOpen()) {
        <div class="fixed inset-0 bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-950 z-[195] flex flex-col justify-between p-6 max-w-[480px] mx-auto text-white select-none animate-fade-in">
          
          <!-- Android Status Bar -->
          <div class="flex justify-between items-center text-xs text-gray-300 px-1">
            <span class="font-semibold">Android Home &bull; Installed Split APK</span>
            <div class="flex items-center space-x-2">
              <span class="px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 text-[10px] font-bold border border-green-500/30">
                1 APK = 2 Apps Active
              </span>
              <button class="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer"
                      (click)="phoneState.isSplitLauncherModalOpen.set(false)"
                      aria-label="Close launcher">
                <mat-icon class="text-[16px] w-4 h-4">close</mat-icon>
              </button>
            </div>
          </div>

          <!-- Center Info Banner & 2 Split App Icons Grid -->
          <div class="flex flex-col items-center my-auto">
            <div class="bg-white/5 border border-white/10 rounded-2xl p-4 mb-8 w-full text-center backdrop-blur-md">
              <span class="text-[10px] font-mono uppercase tracking-widest text-indigo-300 block mb-1">
                Package: com.puredial.suite
              </span>
              <h3 class="text-lg font-bold text-white">Split into 2 Standalone Apps</h3>
              <p class="text-xs text-gray-300 mt-1">
                Tap either of the 2 installed launcher icons below to launch that specific default handler app:
              </p>
            </div>

            <!-- 2 Split Apps Icons on Android Home Screen -->
            <div class="grid grid-cols-2 gap-8 w-full max-w-[280px] px-1">
              
              <!-- App 1: Phone (Default Caller) -->
              <div class="flex flex-col items-center">
                <button class="flex flex-col items-center group cursor-pointer active:scale-95 transition-transform"
                        (click)="launchSplitApp('caller')">
                  <div class="w-20 h-20 rounded-3xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-[0_8px_25px_rgba(16,185,129,0.4)] border-2 border-white/25 relative group-hover:scale-105 transition-transform">
                    <mat-icon class="text-white text-4xl">call</mat-icon>
                    <span class="absolute -bottom-1.5 px-2 py-0.5 rounded-full bg-slate-950 text-green-400 text-[9px] font-bold border border-green-500/40">
                      DEFAULT
                    </span>
                  </div>
                  <span class="text-sm font-bold text-white mt-3">Phone</span>
                  <span class="text-[10px] text-gray-400">Caller &amp; Dialer</span>
                </button>
                <button class="mt-2 px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-[10px] text-emerald-300 font-semibold flex items-center space-x-1 cursor-pointer"
                        (click)="phoneState.openThemeModalForApp('caller')">
                  <mat-icon class="text-[12px] w-3 h-3">palette</mat-icon>
                  <span class="truncate max-w-[72px]">{{ phoneState.callerTheme().name }}</span>
                </button>
              </div>

              <!-- App 2: Contacts (Default Contacts) -->
              <div class="flex flex-col items-center">
                <button class="flex flex-col items-center group cursor-pointer active:scale-95 transition-transform"
                        (click)="launchSplitApp('contacts')">
                  <div class="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-[0_8px_25px_rgba(245,158,11,0.4)] border-2 border-white/25 relative group-hover:scale-105 transition-transform">
                    <mat-icon class="text-white text-4xl">contacts</mat-icon>
                    <span class="absolute -bottom-1.5 px-2 py-0.5 rounded-full bg-slate-950 text-amber-400 text-[9px] font-bold border border-amber-500/40">
                      DEFAULT
                    </span>
                  </div>
                  <span class="text-sm font-bold text-white mt-3">Contacts</span>
                  <span class="text-[10px] text-gray-400">Address Book</span>
                </button>
                <button class="mt-2 px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-[10px] text-amber-300 font-semibold flex items-center space-x-1 cursor-pointer"
                        (click)="phoneState.openThemeModalForApp('contacts')">
                  <mat-icon class="text-[12px] w-3 h-3">palette</mat-icon>
                  <span class="truncate max-w-[72px]">{{ phoneState.contactsTheme().name }}</span>
                </button>
              </div>

            </div>
          </div>

          <!-- Bottom Actions -->
          <div class="space-y-2.5">
            <button class="w-full py-3 bg-white/10 hover:bg-white/15 border border-white/15 rounded-2xl text-xs font-bold flex items-center justify-center space-x-2 cursor-pointer transition-colors"
                    (click)="phoneState.isSplitLauncherModalOpen.set(false); phoneState.isForceDefaultModalOpen.set(true)">
              <mat-icon class="text-[18px] w-4.5 h-4.5 text-indigo-400">admin_panel_settings</mat-icon>
              <span>Configure Default App Roles (Caller &amp; Contacts)</span>
            </button>
            <button class="w-full py-3 bg-emerald-600 hover:bg-emerald-700 rounded-2xl text-xs font-bold flex items-center justify-center space-x-2 cursor-pointer transition-colors shadow-lg"
                    (click)="phoneState.isApkManifestModalOpen.set(true)">
              <mat-icon class="text-[18px] w-4.5 h-4.5">download</mat-icon>
              <span>View / Export 2-App Split APK Manifest &amp; Native Code</span>
            </button>
          </div>
        </div>
      }

      <!-- ========================================================================= -->
      <!-- APK MANIFEST & NATIVE 2-APP SPLIT CODE EXPORTER MODAL                     -->
      <!-- ========================================================================= -->
      @if(phoneState.isApkManifestModalOpen()) {
        <div class="fixed inset-0 bg-black/80 z-[220] flex items-center justify-center p-4 select-none">
          <div class="bg-slate-900 border border-white/15 text-white rounded-3xl w-full max-w-[440px] max-h-[88vh] flex flex-col p-5 shadow-2xl">
            <div class="flex justify-between items-center mb-3">
              <div class="flex items-center space-x-2">
                <mat-icon class="text-emerald-400">android</mat-icon>
                <h3 class="text-base font-bold">2-App Split APK &amp; Default Handler Code</h3>
              </div>
              <button class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer"
                      (click)="phoneState.isApkManifestModalOpen.set(false)">
                <mat-icon class="text-[18px] w-4.5 h-4.5">close</mat-icon>
              </button>
            </div>

            <p class="text-xs text-gray-300 mb-3 leading-relaxed">
              Included in <code class="text-emerald-300 bg-white/10 px-1.5 py-0.5 rounded">/android/app/src/main/</code>:
              Uses 2 <code class="text-amber-300">&lt;activity-alias&gt;</code> launcher entries to split 1 APK into <strong>Phone</strong> and <strong>Contacts</strong> after installing, and uses <code class="text-blue-300">RoleManager</code> to force default roles.
            </p>

            <div class="flex-1 overflow-y-auto bg-slate-950 border border-white/10 rounded-2xl p-3 font-mono text-[11px] text-emerald-300 whitespace-pre-wrap select-all mb-4 leading-relaxed">{{ apkArchitectureSummary }}</div>

            <div class="flex gap-2">
              <button class="flex-1 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-semibold cursor-pointer flex items-center justify-center space-x-1.5"
                      (click)="downloadApkBundle()">
                <mat-icon class="text-[16px] w-4 h-4">download</mat-icon>
                <span>Download APK Config (.xml)</span>
              </button>
              <button class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-xs font-bold cursor-pointer"
                      (click)="phoneState.isApkManifestModalOpen.set(false)">
                Done
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ========================================================================= -->
      <!-- UNIFIED GLOBAL THEME SELECTOR MODAL (ALL 12 HONOR UPLOADED THEMES)        -->
      <!-- Choose 1 theme -> Automatically applies across Phone & Contacts!          -->
      <!-- ========================================================================= -->
      @if(phoneState.isThemeModalOpen()) {
        @let activeThemeId = phoneState.activeThemeId();
        <div class="fixed inset-0 bg-black/75 z-[230] flex items-end sm:items-center justify-center p-0 sm:p-4 select-none animate-fade-in"
             (click)="phoneState.isThemeModalOpen.set(false)"
             (keyup.escape)="phoneState.isThemeModalOpen.set(false)"
             tabindex="0">
          <div class="bg-slate-900 border border-white/15 text-white rounded-t-3xl sm:rounded-3xl w-full max-w-[460px] max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
               (click)="$event.stopPropagation()"
               (keydown)="$event.stopPropagation()"
               tabindex="0">
            
            <!-- Modal Header -->
            <div class="px-5 pt-5 pb-3 border-b border-white/10 flex justify-between items-center bg-slate-950/60">
              <div class="flex items-center space-x-2.5">
                <div class="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <mat-icon>palette</mat-icon>
                </div>
                <div>
                  <h3 class="text-base font-bold leading-tight">
                    All Themes (Light Default + 12 Honor Themes)
                  </h3>
                  <p class="text-[11px] text-emerald-400 font-medium">
                    Choose once &bull; Applies to all apps (Phone &amp; Contacts)
                  </p>
                </div>
              </div>
              <button class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer"
                      (click)="phoneState.isThemeModalOpen.set(false)"
                      aria-label="Close theme selector">
                <mat-icon class="text-[18px] w-4.5 h-4.5">close</mat-icon>
              </button>
            </div>

            <!-- Unified Apply Banner & Custom Wallpaper Option -->
            <div class="px-4 py-2.5 bg-slate-950/50 border-b border-white/10 flex flex-col space-y-2">
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-2 text-[11px] text-gray-300">
                  <mat-icon class="text-[16px] w-4 h-4 text-emerald-400 shrink-0">check_circle</mat-icon>
                  <span>Global sync across <strong>Phone</strong> &amp; <strong>Caller Screen</strong></span>
                </div>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {{ phoneState.customWallpaper() ? 'Custom Photo' : phoneState.currentTheme().name }}
                </span>
              </div>

              <!-- Custom Wallpaper Upload & Clear Bar -->
              <div class="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                <div class="flex items-center space-x-2 min-w-0 pr-2">
                  <mat-icon class="text-pink-400 text-[18px] w-4.5 h-4.5 shrink-0">image</mat-icon>
                  <div class="flex flex-col truncate">
                    <span class="text-xs font-semibold text-white">Your Custom Wallpaper</span>
                    <span class="text-[10px] text-gray-400 truncate">
                      {{ phoneState.customWallpaper() ? 'Applied to Home & Translucent Caller Screen' : 'Pick any image from your gallery' }}
                    </span>
                  </div>
                </div>
                <div class="flex items-center space-x-1.5 shrink-0">
                  <input type="file" accept="image/*" class="hidden" #customWallInput (change)="handleCustomWallpaperUpload($event)">
                  <button type="button"
                          class="px-2.5 py-1 bg-pink-600 hover:bg-pink-700 active:scale-95 text-white font-semibold text-[11px] rounded-lg transition-all cursor-pointer flex items-center space-x-1 shadow-xs"
                          (click)="customWallInput.click()">
                    <mat-icon class="text-[14px] w-3.5 h-3.5">add_photo_alternate</mat-icon>
                    <span>{{ phoneState.customWallpaper() ? 'Change' : 'Pick Photo' }}</span>
                  </button>
                  @if (phoneState.customWallpaper()) {
                    <button type="button"
                            class="px-2 py-1 bg-white/10 hover:bg-white/20 active:scale-95 text-gray-300 hover:text-white font-semibold text-[11px] rounded-lg transition-colors cursor-pointer"
                            (click)="phoneState.clearCustomWallpaper()"
                            title="Reset to theme wallpaper">
                      Reset
                    </button>
                  }
                </div>
              </div>
            </div>

            <!-- Grid of All 12 Uploaded Honor Themes -->
            <div class="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-3.5">
              @for(t of phoneState.availableThemes; track t.id) {
                @let isSelected = activeThemeId === t.id;
                <div class="rounded-2xl border-2 overflow-hidden flex flex-col transition-all cursor-pointer group relative"
                     [class.border-emerald-400]="isSelected"
                     [class.ring-2]="isSelected"
                     [class.ring-emerald-400/30]="isSelected"
                     [class.border-white/15]="!isSelected"
                     tabindex="0"
                     role="button"
                     (click)="phoneState.selectGlobalTheme(t.id)"
                     (keyup.enter)="phoneState.selectGlobalTheme(t.id)">
                  
                  <!-- Live Miniature Phone + Contacts Split Preview of the Theme -->
                  <div class="h-44 w-full relative flex flex-col justify-between overflow-hidden"
                       [style.background]="t.upperBg">
                    
                    <!-- Top Header + Selected Badge -->
                    <div class="px-2.5 pt-2 flex justify-between items-center z-10"
                         [style.background]="t.topHeaderBarBg">
                      <span class="text-[10px] font-bold truncate" [style.color]="t.primaryTextColor">
                        {{ t.index > 0 ? '#' + t.index + ' ' + t.name : t.name }}
                      </span>
                      @if(isSelected) {
                        <span class="px-1.5 py-0.5 rounded-full text-[8px] font-extrabold bg-emerald-500 text-slate-950 shadow-xs shrink-0">
                          ACTIVE
                        </span>
                      }
                    </div>

                    <!-- Mini Contact Row & Dialed Number Preview -->
                    <div class="px-2.5 my-auto z-10">
                      <div class="flex items-center space-x-1.5 mb-1">
                        <div class="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold"
                             [style.background]="t.contactAvatarBg"
                             [style.color]="t.contactAvatarIconColor">A</div>
                        <span class="text-[9px] font-medium" [style.color]="t.primaryTextColor">Amy</span>
                        <span class="text-[8px] font-mono" [style.color]="t.matchHighlightColor">098765432</span>
                      </div>
                      @if(t.numberBoxBg !== 'transparent') {
                        <div class="rounded-md px-2 py-0.5 text-center text-[10px] font-bold tracking-wider"
                             [style.background]="t.numberBoxBg"
                             [style.color]="t.numberTextColor">
                          098765432
                        </div>
                      } @else {
                        <div class="text-center text-[11px] font-bold tracking-wider"
                             [style.color]="t.numberTextColor">
                          098765432
                        </div>
                      }
                    </div>

                    <!-- Mini Keypad Panel Preview -->
                    <div class="px-2 pt-1.5 pb-1.5 z-10 border-t"
                         [class.rounded-t-xl]="t.keypadPanelRounded"
                         [style.background]="t.keypadPanelBg"
                         [style.borderColor]="t.dividerColor">
                      <div class="grid grid-cols-3 gap-1 mb-1">
                        @for(n of [1,2,3,4,5,6]; track n) {
                          <div class="h-4 flex items-center justify-center text-[9px] font-bold relative"
                               [class.rounded-md]="t.keyStyle === 'squircle-3d'"
                               [class.rounded-full]="t.keyStyle !== 'squircle-3d'"
                               [style.background]="t.keyStyle === 'squircle-3d' ? '#eef1f6' : 'transparent'"
                               [style.boxShadow]="t.keyStyle === 'squircle-3d' ? '1px 2px 3px rgba(0,0,0,0.18)' : 'none'"
                               [style.border]="t.keyStyle === 'hand-drawn' ? '1px solid #26e6ff' : 'none'"
                               [style.color]="t.keyDigitColor">
                            {{ n }}
                          </div>
                        }
                      </div>
                      <!-- Mini Call Button -->
                      <div class="flex justify-center">
                        <div class="h-4 w-10 rounded-full flex items-center justify-center shadow-xs"
                             [style.background]="t.callButtonBg"
                             [style.color]="t.callButtonIconColor">
                          <mat-icon class="text-[10px] w-2.5 h-2.5">call</mat-icon>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Theme Footer Info -->
                  <div class="p-2.5 bg-slate-950 flex items-center justify-between border-t border-white/10">
                    <div class="min-w-0 pr-1">
                      <div class="text-xs font-bold text-white truncate">{{ t.name }}</div>
                      <div class="text-[10px] text-gray-400 truncate">{{ t.subtitle }}</div>
                    </div>
                    <button class="px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 cursor-pointer transition-colors"
                            [class.bg-emerald-500]="isSelected"
                            [class.text-slate-950]="isSelected"
                            [class.bg-white/10]="!isSelected"
                            [class.text-white]="!isSelected"
                            [class.hover:bg-white/20]="!isSelected">
                      {{ isSelected ? 'Applied' : 'Apply All' }}
                    </button>
                  </div>
                </div>
              }
            </div>

            <!-- Modal Footer -->
            <div class="px-5 py-3 bg-slate-950 border-t border-white/10 flex justify-between items-center">
              <div class="text-[11px] text-gray-400">
                Applied to <strong class="text-white">All Apps</strong>:
                <span class="text-emerald-400 font-semibold ml-1">
                  {{ phoneState.currentTheme().index > 0 ? '#' + phoneState.currentTheme().index + ' ' + phoneState.currentTheme().name : phoneState.currentTheme().name }}
                </span>
              </div>
              <button class="px-5 py-2 bg-white text-slate-950 hover:bg-gray-200 rounded-xl text-xs font-bold cursor-pointer"
                      (click)="phoneState.isThemeModalOpen.set(false)">
                Done
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ========================================================================= -->
      <!-- CONFIRMATION DIALOG (Delete Contact / Clear Call History / Delete Log)    -->
      <!-- ========================================================================= -->
      @if(phoneState.confirmDialog(); as dialog) {
        <div class="fixed inset-0 bg-black/55 z-[260] flex items-end sm:items-center justify-center p-4 select-none cursor-pointer"
             tabindex="0"
             role="button"
             aria-label="Close confirmation dialog"
             (click)="phoneState.closeConfirmDialog()"
             (keydown.escape)="phoneState.closeConfirmDialog()">
          <div class="bg-white rounded-[28px] w-full max-w-[360px] p-6 shadow-2xl text-gray-900 cursor-default animate-fade-in mb-2 sm:mb-0"
               tabindex="0"
               role="alertdialog"
               aria-modal="true"
               (click)="$event.stopPropagation()"
               (keydown)="$event.stopPropagation()">
            <div class="flex items-center space-x-3 mb-2.5">
              <div class="w-10 h-10 rounded-full bg-red-50 text-[#e53935] flex items-center justify-center shrink-0">
                <mat-icon class="text-[22px] w-5.5 h-5.5">delete_outline</mat-icon>
              </div>
              <h3 class="text-[18px] font-bold text-gray-900 leading-snug">{{ dialog.title }}</h3>
            </div>
            <p class="text-[14px] text-gray-600 leading-relaxed mb-6">
              {{ dialog.message }}
            </p>
            <div class="grid grid-cols-2 gap-3">
              <button type="button"
                      class="w-full py-2.5 px-4 rounded-full bg-gray-100 hover:bg-gray-200 active:scale-95 text-[#007dff] font-semibold text-[15px] transition-all cursor-pointer"
                      (click)="phoneState.closeConfirmDialog()">
                Cancel
              </button>
              <button type="button"
                      class="w-full py-2.5 px-4 rounded-full bg-[#e53935] hover:bg-red-700 active:scale-95 text-white font-semibold text-[15px] shadow-md transition-all cursor-pointer"
                      (click)="dialog.onConfirm()">
                {{ dialog.confirmLabel }}
              </button>
            </div>
          </div>
        </div>
      }

    </div>
  `,
  styles: []
})
export class App {
  phoneState = inject(PhoneState);
  Math = Math;

  currentTab = signal<'phone' | 'contacts' | 'favourites'>('phone');
  currentView = signal<'main' | 'recordings' | 'contact-details'>('main');

  // Unified global theme applied to all apps and bottom navigation
  activeAppTheme = computed(() => this.phoneState.currentTheme());

  // Translucent home screen wallpaper for caller screens (always matches home screen wallpaper 100%)
  callerWallpaperBg = computed(() => {
    const custom = this.phoneState.customWallpaper();
    if (custom) {
      return `url("${custom}")`;
    }
    const theme = this.phoneState.currentTheme();
    if (theme.wallpaperUrl) {
      return `url("${theme.wallpaperUrl}")`;
    }
    if (theme.upperBg && theme.upperBg.includes('url(')) {
      const match = theme.upperBg.match(/url\(["']?([^"']+)["']?\)/);
      if (match) return `url("${match[1]}")`;
    }
    if (theme.contactsBg && theme.contactsBg.includes('url(')) {
      const match = theme.contactsBg.match(/url\(["']?([^"']+)["']?\)/);
      if (match) return `url("${match[1]}")`;
    }
    return `url('/src/assets/images/theme_starry_astronaut_1791199179243.jpg')`;
  });

  handleCustomWallpaperUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          this.phoneState.setCustomWallpaper(result);
        }
      };
      reader.readAsDataURL(file);
    }
  }

  apkArchitectureSummary = `<!-- AndroidManifest.xml: Splits 1 APK into 2 Launcher Apps (Phone & Contacts) -->
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.puredial.suite">

  <!-- Permissions for Local SIM Card, Default Caller, Default Contacts & Phone Accounts -->
  <uses-permission android:name="android.permission.CALL_PHONE" />
  <uses-permission android:name="android.permission.READ_PHONE_STATE" />
  <uses-permission android:name="android.permission.READ_PHONE_NUMBERS" />
  <uses-permission android:name="android.permission.READ_BASIC_PHONE_STATE" />
  <uses-permission android:name="android.permission.PROCESS_OUTGOING_CALLS" />
  <uses-permission android:name="android.permission.READ_CALL_LOG" />
  <uses-permission android:name="android.permission.WRITE_CALL_LOG" />
  <uses-permission android:name="android.permission.ANSWER_PHONE_CALLS" />
  <uses-permission android:name="android.permission.MANAGE_OWN_CALLS" />
  <uses-permission android:name="android.permission.RECORD_AUDIO" />
  <uses-permission android:name="android.permission.CAMERA" />
  <uses-permission android:name="android.permission.READ_CONTACTS" />
  <uses-permission android:name="android.permission.WRITE_CONTACTS" />
  <uses-permission android:name="android.permission.GET_ACCOUNTS" />

  <application android:label="PureSuite">
    <!-- Silent Magic Anti-Bomber CallScreeningService (Drops unknown/spam calls with zero ring & zero popup) -->
    <service
        android:name=".AntiBomberCallScreeningService"
        android:permission="android.permission.BIND_SCREENING_SERVICE"
        android:exported="true">
      <intent-filter>
        <action android:name="android.telecom.CallScreeningService" />
      </intent-filter>
    </service>

    <!-- 1. SPLIT APP #1: PHONE (DEFAULT CALLER - ROLE_DIALER) -->
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
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="tel" />
      </intent-filter>
    </activity-alias>

    <!-- 2. SPLIT APP #2: CONTACTS (DEFAULT CONTACTS HANDLER) -->
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
        <action android:name="android.intent.action.INSERT" />
        <action android:name="android.intent.action.EDIT" />
        <category android:name="android.intent.category.DEFAULT" />
        <data android:mimeType="vnd.android.cursor.dir/contact" />
        <data android:mimeType="vnd.android.cursor.item/contact" />
      </intent-filter>
    </activity-alias>
  </application>
</manifest>`;

  selectedContact = computed(() => this.phoneState.selectedContact());

  addContactName = signal('');
  addContactPhone = signal('');
  addContactType = signal('Mobile');
  addContactEmail = signal('');
  addContactStorage = signal<'mobile' | 'gmail' | 'sim'>('mobile');
  addContactGmailAccount = signal('');
  alsoExportContactFile = signal(false);

  existingContactForTypedPhone = computed(() => {
    const typed = this.addContactPhone().trim();
    if (!typed || this.phoneState.getCanonicalPhoneKey(typed).length < 5) {
      return undefined;
    }
    return this.phoneState.findContactByPhone(typed);
  });

  editName = signal('');
  editPhone = signal('');
  editType = signal('Mobile');
  editEmail = signal('');
  editStorage = signal<'mobile' | 'gmail' | 'sim'>('mobile');
  editGmailAccount = signal('');

  newTrustName = signal('');
  newTrustPhone = signal('');

  addCallSearchQuery = signal('');
  addCallFilteredContacts = computed(() => {
    const q = this.addCallSearchQuery().trim().toLowerCase();
    const list = this.phoneState.contacts();
    if (!q) return list;
    return list.filter(c => c.name.toLowerCase().includes(q) || c.phone.replace(/\s+/g, '').includes(q.replace(/\s+/g, '')));
  });

  dialSecondPerson(name: string, phone: string) {
    this.addCallSearchQuery.set('');
    this.phoneState.addSecondCall(name, phone);
  }

  // 360-degree swipe-to-answer gesture state (No arrows!)
  isDragging = signal(false);
  dragX = signal(0);
  dragY = signal(0);
  private startX = 0;
  private startY = 0;

  currentDragDistance = computed(() => {
    return Math.hypot(this.dragX(), this.dragY());
  });

  swipeTransform = computed(() => {
    return `translate3d(${this.dragX()}px, ${this.dragY()}px, 0)`;
  });

  constructor() {
    try {
      if (typeof window !== 'undefined' && window.location?.search) {
        const params = new URLSearchParams(window.location.search);
        const appMode = params.get('app');
        if (appMode === 'contacts') {
          this.currentTab.set('contacts');
          this.phoneState.activeSplitApp.set('contacts');
        } else {
          this.currentTab.set('phone');
          this.phoneState.activeSplitApp.set('caller');
        }
      }
    } catch {
      // ignore URL parsing errors
    }

    effect(() => {
      if (this.phoneState.isAddModalOpen()) {
        const prefill = this.phoneState.addModalPrefill();
        this.addContactName.set(prefill.name || '');
        this.addContactPhone.set(prefill.phone || '');
        this.addContactType.set('Mobile');
        this.addContactEmail.set('');
        this.addContactStorage.set(prefill.storageLocation || this.phoneState.defaultContactStorage() || 'mobile');
        this.addContactGmailAccount.set(this.phoneState.connectedGmailAccount());
        this.alsoExportContactFile.set(false);
      }
    });

    effect(() => {
      if (this.phoneState.isEditModalOpen()) {
        const data = this.phoneState.editModalData();
        if (data) {
          this.editName.set(data.name);
          this.editPhone.set(data.phone);
          this.editType.set(data.type);
          this.editEmail.set(data.email || '');
          this.editStorage.set(data.storageLocation || 'mobile');
          this.editGmailAccount.set(data.gmailAccount || this.phoneState.connectedGmailAccount());
        }
      }
    });
  }

  // --- Swipe-To-Answer Handlers: Call is NOT answered until finger is released beyond threshold ---
  onSwipeStart(event: PointerEvent) {
    this.isDragging.set(true);
    this.startX = event.clientX;
    this.startY = event.clientY;
    this.dragX.set(0);
    this.dragY.set(0);
    (event.target as HTMLElement)?.setPointerCapture?.(event.pointerId);
  }

  onSwipeMove(event: PointerEvent) {
    if (!this.isDragging()) return;
    const dx = event.clientX - this.startX;
    const dy = event.clientY - this.startY;
    this.dragX.set(dx);
    this.dragY.set(dy);
    // User requirement: Do NOT answer call while finger is moving. Call is only answered on release!
  }

  onSwipeEnd() {
    if (!this.isDragging()) return;
    const distance = Math.hypot(this.dragX(), this.dragY());
    this.isDragging.set(false);

    // User requirement: If user swiped away >= 55px and released finger, answer!
    // If user put green button back at or near original place (< 55px) and released finger, call is NOT picked!
    if (distance >= 55) {
      this.dragX.set(0);
      this.dragY.set(0);
      this.phoneState.acceptIncomingCall();
    } else {
      // Smoothly springs back to origin without picking call
      this.dragX.set(0);
      this.dragY.set(0);
    }
  }

  toggleInCallKeypad() {
    this.phoneState.isInCallKeypadOpen.update(v => !v);
  }

  switchTab(tab: 'phone' | 'contacts' | 'favourites') {
    this.currentTab.set(tab);
    this.currentView.set('main');
    if (tab === 'phone') {
      this.phoneState.activeSplitApp.set('caller');
    } else if (tab === 'contacts') {
      this.phoneState.activeSplitApp.set('contacts');
    }
  }

  launchSplitApp(appMode: 'caller' | 'contacts') {
    this.phoneState.activeSplitApp.set(appMode);
    this.phoneState.isSplitLauncherModalOpen.set(false);
    this.currentView.set('main');
    if (appMode === 'caller') {
      this.currentTab.set('phone');
    } else if (appMode === 'contacts') {
      this.currentTab.set('contacts');
    }
  }

  downloadApkBundle() {
    try {
      const blob = new Blob([this.apkArchitectureSummary], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'AndroidManifest-3AppSplit.xml';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // ignore download errors
    }
  }

  openContactDetails(contact: ContactData) {
    this.phoneState.selectedContact.set(contact);
    this.currentView.set('contact-details');
  }

  handleGlobalEscape() {
    if (this.phoneState.incomingCall()) {
      this.phoneState.declineIncomingCall();
    } else if (this.phoneState.isInCallKeypadOpen()) {
      this.phoneState.isInCallKeypadOpen.set(false);
    } else if (this.phoneState.isAddPersonModalOpen()) {
      this.phoneState.isAddPersonModalOpen.set(false);
    } else if (this.phoneState.activeCall()) {
      this.phoneState.endCall();
    } else if (this.phoneState.activeVideoCall()) {
      this.phoneState.endVideoCall();
    } else if (this.phoneState.isTrustListModalOpen()) {
      this.phoneState.isTrustListModalOpen.set(false);
    } else if (this.phoneState.isAddModalOpen()) {
      this.phoneState.closeAddContact();
    } else if (this.phoneState.isEditModalOpen()) {
      this.phoneState.closeEditContact();
    } else if (this.currentView() !== 'main') {
      this.currentView.set('main');
    }
  }

  async openGooglePickerForAdd() {
    await this.phoneState.openOrToggleGoogleAccountPicker();
    if (this.phoneState.connectedGmailAccount()) {
      this.addContactGmailAccount.set(this.phoneState.connectedGmailAccount());
    }
  }

  selectGoogleAccountForAdd(email: string) {
    this.addContactGmailAccount.set(email);
    this.phoneState.selectPhoneGoogleAccount(email);
  }

  async signInAndSelectGoogleForAdd() {
    const token = await this.phoneState.signInWithGoogleForContacts();
    if (token) {
      this.addContactGmailAccount.set(this.phoneState.connectedGmailAccount());
    }
  }

  async openGooglePickerForEdit() {
    await this.phoneState.openOrToggleGoogleAccountPicker();
    if (this.phoneState.connectedGmailAccount()) {
      this.editGmailAccount.set(this.phoneState.connectedGmailAccount());
    }
  }

  selectGoogleAccountForEdit(email: string) {
    this.editGmailAccount.set(email);
    this.phoneState.selectPhoneGoogleAccount(email);
  }

  async signInAndSelectGoogleForEdit() {
    const token = await this.phoneState.signInWithGoogleForContacts();
    if (token) {
      this.editGmailAccount.set(this.phoneState.connectedGmailAccount());
    }
  }

  saveNewContact() {
    this.phoneState.saveNewContact(this.addContactName(), this.addContactPhone(), {
      type: this.addContactType(),
      email: this.addContactEmail(),
      storageLocation: this.addContactStorage(),
      gmailAccount: this.addContactGmailAccount(),
      alsoExportFile: this.alsoExportContactFile()
    });
    this.addContactName.set('');
    this.addContactPhone.set('');
    this.addContactEmail.set('');
  }

  saveEditedContact() {
    this.phoneState.saveEditContact(this.editName(), this.editPhone(), this.editType(), {
      email: this.editEmail(),
      storageLocation: this.editStorage(),
      gmailAccount: this.editGmailAccount()
    });
  }

  saveTrustItem() {
    this.phoneState.addToTrustList(this.newTrustName(), this.newTrustPhone());
    this.newTrustName.set('');
    this.newTrustPhone.set('');
  }
}
