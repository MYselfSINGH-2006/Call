import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { PhoneState } from './phone-state';

@Component({
  selector: 'app-recordings',
  standalone: true,
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let theme = phoneState.currentTheme();
    <div class="flex flex-col h-full relative z-[100] w-full pb-[68px] transition-colors duration-200"
         [style.background]="theme.contactsBg"
         [style.color]="theme.primaryTextColor">
      <!-- App Bar -->
      <div class="h-14 flex items-center justify-between px-4 border-b shrink-0 shadow-xs pt-2"
           [style.background]="theme.topHeaderBarBg"
           [style.borderColor]="theme.dividerColor">
        <div class="flex items-center">
          <button class="w-10 h-10 flex items-center justify-center hover:bg-black/10 rounded-full transition-colors mr-2 cursor-pointer"
                  [style.color]="theme.primaryTextColor"
                  (click)="closeView.emit()"
                  aria-label="Go back">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <h1 class="text-[20px] font-medium flex-1" [style.color]="theme.primaryTextColor">Call recordings</h1>
        </div>
        <div class="flex items-center space-x-1">
          <button class="w-10 h-10 flex items-center justify-center hover:bg-black/10 rounded-full transition-colors cursor-pointer"
                  [style.color]="theme.primaryTextColor"
                  (click)="phoneState.openThemeModal()"
                  aria-label="Choose Theme">
            <mat-icon>palette</mat-icon>
          </button>
        </div>
      </div>

      <!-- Real Auto-Recording & Live Microphone Recorder Controls -->
      <div class="px-3 pt-3 pb-1 shrink-0 space-y-2">
        <!-- Live Mic Recording Card -->
        <div class="rounded-2xl p-3.5 border backdrop-blur-md flex items-center justify-between shadow-xs"
             [style.background]="theme.cardBg"
             [style.borderColor]="theme.dividerColor">
          <div class="flex items-center min-w-0 pr-2">
            <div class="w-10 h-10 rounded-full flex items-center justify-center mr-3 shrink-0"
                 [class.bg-red-600]="phoneState.isStandaloneVoiceRecording()"
                 [class.text-white]="phoneState.isStandaloneVoiceRecording()"
                 [class.animate-pulse]="phoneState.isStandaloneVoiceRecording()"
                 [style.background]="!phoneState.isStandaloneVoiceRecording() ? theme.searchBarBg : ''"
                 [style.color]="!phoneState.isStandaloneVoiceRecording() ? theme.accentColor : ''">
              <mat-icon>{{ phoneState.isStandaloneVoiceRecording() ? 'graphic_eq' : 'mic' }}</mat-icon>
            </div>
            <div class="flex flex-col min-w-0">
              <span class="text-sm font-bold truncate" [style.color]="theme.primaryTextColor">
                {{ phoneState.isStandaloneVoiceRecording() ? 'Recording Live Microphone...' : 'Live Microphone Recorder' }}
              </span>
              @if (phoneState.isStandaloneVoiceRecording()) {
                <div class="flex items-center space-x-2 mt-0.5">
                  <span class="text-xs font-mono font-bold text-red-500">{{ formattedStandaloneTimer() }}</span>
                  <div class="flex items-center space-x-0.5 h-3">
                    <div class="w-1 bg-red-500 rounded-full" [style.height.px]="Math.max(3, phoneState.liveMicLevel() * 0.14)"></div>
                    <div class="w-1 bg-red-500 rounded-full" [style.height.px]="Math.max(5, phoneState.liveMicLevel() * 0.22)"></div>
                    <div class="w-1 bg-red-500 rounded-full" [style.height.px]="Math.max(4, phoneState.liveMicLevel() * 0.18)"></div>
                  </div>
                </div>
              } @else {
                <span class="text-[11px] truncate" [style.color]="theme.secondaryTextColor">
                  Captures real voice audio from your device microphone (.wav)
                </span>
              }
            </div>
          </div>

          @if (phoneState.isStandaloneVoiceRecording()) {
            <button class="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1 shrink-0 cursor-pointer active:scale-95 transition-transform shadow-sm"
                    (click)="phoneState.stopStandaloneVoiceRecording()">
              <mat-icon class="text-[16px] w-4 h-4">stop</mat-icon>
              <span>Stop &amp; Save</span>
            </button>
          } @else {
            <button class="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1 shrink-0 cursor-pointer active:scale-95 transition-transform shadow-sm"
                    [style.background]="theme.callButtonBg"
                    [style.color]="theme.callButtonIconColor"
                    (click)="phoneState.startStandaloneVoiceRecording()">
              <mat-icon class="text-[16px] w-4 h-4">fiber_manual_record</mat-icon>
              <span>Record Mic</span>
            </button>
          }
        </div>

        <!-- Auto Call Recording Toggles -->
        <div class="rounded-2xl px-3.5 py-2.5 border backdrop-blur-md flex items-center justify-between text-xs"
             [style.background]="theme.cardBg"
             [style.borderColor]="theme.dividerColor">
          <div class="flex items-center space-x-2">
            <mat-icon class="text-[18px] w-4.5 h-4.5 text-red-500">radio_button_checked</mat-icon>
            <span class="font-semibold" [style.color]="theme.primaryTextColor">Auto-Record All Calls (Silent)</span>
          </div>
          <button class="px-2.5 py-1 rounded-lg font-bold text-[11px] cursor-pointer transition-colors"
                  [class.bg-red-600]="phoneState.autoRecordEnabled()"
                  [class.text-white]="phoneState.autoRecordEnabled()"
                  [style.background]="!phoneState.autoRecordEnabled() ? theme.searchBarBg : ''"
                  [style.color]="!phoneState.autoRecordEnabled() ? theme.secondaryTextColor : ''"
                  (click)="phoneState.toggleAutoRecord()">
            {{ phoneState.autoRecordEnabled() ? 'AUTO ON' : 'OFF' }}
          </button>
        </div>
      </div>

      <!-- List -->
      <div class="flex-1 overflow-y-auto pb-6">
        @if(phoneState.recordings().length === 0) {
          <div class="flex flex-col items-center justify-center h-full pb-16 pt-10" [style.color]="theme.secondaryTextColor">
             <mat-icon class="text-[56px] w-14 h-14 mb-3 opacity-40">mic_none</mat-icon>
             <p class="text-base font-semibold" [style.color]="theme.primaryTextColor">No voice or call recordings yet</p>
             <p class="text-xs mt-1 text-center px-8 leading-relaxed">
               Tap <strong>Record Mic</strong> above or press <strong>Record</strong> during any live call to record real audio from your microphone and call line.
             </p>
          </div>
        } @else {
          <div class="px-3 pt-2">
             @for(recording of phoneState.recordings(); track recording.id) {
               @let isPlaying = phoneState.playingRecordingId() === recording.id;
               <div class="rounded-2xl p-4 mb-3 shadow-xs border backdrop-blur-md transition-all"
                    [style.background]="theme.cardBg"
                    [style.borderColor]="theme.dividerColor"
                    [class.ring-2]="isPlaying"
                    [class.ring-blue-500/40]="isPlaying">
                  
                  <div class="flex justify-between items-start mb-2">
                     <div class="flex flex-col">
                        <span class="text-[17px] font-semibold" [style.color]="theme.primaryTextColor">{{recording.name}}</span>
                        <span class="text-[14px] font-mono" [style.color]="theme.secondaryTextColor">{{recording.phone}}</span>
                     </div>
                     <div class="flex items-center space-x-1">
                       <!-- Download / Export Audio Button -->
                       <button class="hover:opacity-80 transition-colors p-1 cursor-pointer" [style.color]="theme.accentColor" (click)="phoneState.downloadRecording(recording.id)" aria-label="Download audio WAV">
                         <mat-icon class="text-[20px] w-5 h-5">download</mat-icon>
                       </button>
                       <!-- Delete Button -->
                       <button class="hover:text-red-500 transition-colors p-1 cursor-pointer" [style.color]="theme.secondaryTextColor" (click)="phoneState.deleteRecording(recording.id)" aria-label="Delete recording">
                         <mat-icon class="text-[20px] w-5 h-5">delete_outline</mat-icon>
                       </button>
                     </div>
                  </div>
                  
                  <div class="flex items-center text-[13px] mb-3 space-x-3" [style.color]="theme.secondaryTextColor">
                     <span class="flex items-center"><mat-icon class="text-[14px] w-3.5 h-3.5 mr-1 opacity-75">calendar_today</mat-icon> {{recording.date}}</span>
                     <span class="flex items-center"><mat-icon class="text-[14px] w-3.5 h-3.5 mr-1 opacity-75">schedule</mat-icon> {{recording.time}}</span>
                     <span class="bg-green-500/15 text-green-600 text-[10px] font-bold px-2 py-0.5 rounded-full">Recorded WAV</span>
                  </div>

                  <!-- Real Working Audio Player -->
                  <div class="rounded-xl p-3 flex items-center border"
                       [style.background]="theme.searchBarBg"
                       [style.borderColor]="theme.dividerColor">
                     <!-- Play / Pause Button with real sound -->
                     <button class="w-11 h-11 rounded-full flex items-center justify-center shadow-sm active:scale-95 transition-all mr-3 shrink-0 cursor-pointer"
                             [style.background]="theme.callButtonBg"
                             [style.color]="theme.callButtonIconColor"
                             (click)="phoneState.playRecording(recording.id)"
                             [attr.aria-label]="isPlaying ? 'Pause audio' : 'Play real audio'">
                        <mat-icon class="text-2xl">{{ isPlaying ? 'pause' : 'play_arrow' }}</mat-icon>
                     </button>
                     
                     <!-- Interactive Scrubbable Progress Bar -->
                     <div class="flex-1 select-none">
                        <button type="button" class="w-full text-left p-0 bg-transparent border-0 cursor-pointer block group"
                             (click)="onSeekProgressBar($event, recording.duration)">
                          <div class="h-2.5 bg-gray-300/50 rounded-full w-full overflow-hidden relative group-hover:h-3 transition-all">
                             <div class="absolute left-0 top-0 bottom-0 rounded-full transition-all duration-200"
                                  [style.background]="theme.accentColor"
                                  [style.width]="isPlaying ? playbackPercent() : '0%'"></div>
                          </div>
                        </button>
                        
                        <!-- Live Real Time Counter -->
                        <div class="flex justify-between mt-1.5 text-[11px] font-medium tracking-wide" [style.color]="theme.secondaryTextColor">
                           <span class="font-mono font-semibold" [style.color]="theme.accentColor">{{ isPlaying ? formattedCurrentTime() : '00:00' }}</span>
                           <span class="font-mono">{{ recording.duration }}</span>
                        </div>
                     </div>

                     <!-- Speaker Status Icon when playing -->
                     <button class="ml-3 transition-colors shrink-0 cursor-pointer" [style.color]="theme.secondaryTextColor" (click)="phoneState.playRecording(recording.id)" aria-label="Toggle playback">
                        <mat-icon class="text-[22px] w-5.5 h-5.5" [class.text-green-500]="isPlaying" [class.animate-pulse]="isPlaying">
                          {{ isPlaying ? 'volume_up' : 'volume_mute' }}
                        </mat-icon>
                     </button>
                  </div>
               </div>
             }
          </div>
        }
      </div>
    </div>
  `
})
export class RecordingsComponent {
  phoneState = inject(PhoneState);
  closeView = output<void>();
  Math = Math;

  playbackPercent = computed(() => {
    const total = this.phoneState.recordingTotalSeconds() || 1;
    const cur = this.phoneState.recordingCurrentSeconds();
    const pct = Math.min(100, Math.round((cur / total) * 100));
    return `${pct}%`;
  });

  formattedCurrentTime = computed(() => {
    const sec = this.phoneState.recordingCurrentSeconds();
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  });

  formattedStandaloneTimer = computed(() => {
    const sec = this.phoneState.standaloneRecordingSeconds();
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  });

  onSeekProgressBar(event: MouseEvent, durationStr: string) {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const width = rect.width;
    const fraction = Math.max(0, Math.min(1, clickX / width));

    const parts = durationStr.split(':');
    const totalSec = Math.max(1, (parseInt(parts[0], 10) * 60) + parseInt(parts[1], 10) || 1);
    const targetSeconds = Math.round(fraction * totalSec);
    this.phoneState.seekRecording(targetSeconds);
  }
}
