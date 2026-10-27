import { ChangeDetectionStrategy, Component, signal, output, inject, computed } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ContactData, PhoneState } from './phone-state';

@Component({
  selector: 'app-favourites',
  standalone: true,
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let theme = phoneState.currentTheme();
    <div class="flex flex-col h-full relative pb-[60px] select-none transition-colors duration-200 overflow-hidden"
         [style.background]="theme.contactsBg"
         [style.color]="theme.primaryTextColor"
         tabindex="0">
      <!-- Top Header (Matching Video 2 00:02-00:04) -->
      <div class="px-5 pt-3 pb-1 flex flex-col relative shrink-0"
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

            <button type="button"
                    class="w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer hover:bg-black/5 active:bg-black/10"
                    [style.color]="theme.primaryTextColor"
                    (click)="isMenuOpen.set(!isMenuOpen())"
                    aria-label="Favourites menu">
              <svg viewBox="0 0 24 24" class="w-5 h-5 fill-current">
                <circle cx="12" cy="4.5" r="1.6" />
                <circle cx="12" cy="9.5" r="1.6" />
                <circle cx="12" cy="14.5" r="1.6" />
                <circle cx="12" cy="19.5" r="1.6" />
              </svg>
            </button>
          </div>
        </div>
        <h1 class="text-[30px] font-normal tracking-tight leading-tight mb-1"
            [style.color]="theme.primaryTextColor">Favourites</h1>

        <!-- Settings Menu Popup -->
        @if(isMenuOpen()) {
          <div class="fixed inset-0 z-40" (click)="isMenuOpen.set(false)" (keyup.enter)="isMenuOpen.set(false)" tabindex="0" role="button" aria-label="Close menu"></div>
          <div class="absolute right-4 top-12 bg-white rounded-2xl shadow-[0_6px_30px_rgba(0,0,0,0.18)] z-50 w-72 py-2 overflow-hidden border border-gray-100 text-[14px]">
            <button class="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center justify-between transition-colors cursor-pointer" (click)="phoneState.toggleAntiBomber()">
              <div class="flex items-center pr-2">
                <mat-icon class="text-red-600 mr-2.5 text-[20px] w-5 h-5 shrink-0">security</mat-icon>
                <div class="flex flex-col">
                  <span class="text-gray-900 font-bold tracking-tight">ANTI BOMBER</span>
                  <span class="text-[11px] text-gray-500 leading-snug">Real rate-limit &amp; unknown caller firewall</span>
                </div>
              </div>
              <span class="text-xs font-semibold px-2 py-0.5 rounded-md shrink-0" [class.bg-red-600]="phoneState.antiBomber()" [class.text-white]="phoneState.antiBomber()" [class.bg-gray-100]="!phoneState.antiBomber()" [class.text-gray-600]="!phoneState.antiBomber()">
                {{ phoneState.antiBomber() ? 'ON' : 'OFF' }}
              </span>
            </button>

            <button class="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center justify-between text-gray-800 transition-colors cursor-pointer" (click)="phoneState.isTrustListModalOpen.set(true); isMenuOpen.set(false)">
              <div class="flex items-center">
                <mat-icon class="text-green-600 mr-2.5 text-[20px] w-5 h-5">verified_user</mat-icon>
                <span>Manage Trust List</span>
              </div>
              <span class="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-medium">{{ phoneState.trustList().length }}</span>
            </button>

            <div class="border-t border-gray-100 my-1"></div>

            <button class="w-full text-left px-4 py-2 text-gray-800 font-normal hover:bg-gray-50 active:bg-gray-100 cursor-pointer flex items-center" (click)="openRecordings()">
              <mat-icon class="text-red-500 mr-2.5 text-[18px] w-4.5 h-4.5">mic</mat-icon>
              <span>Call recordings</span>
            </button>

            <div class="border-t border-gray-100 my-1"></div>

            <button class="w-full text-left px-4 py-2 text-gray-800 font-normal hover:bg-gray-50 active:bg-gray-100 flex items-center justify-between transition-colors cursor-pointer" (click)="phoneState.openThemeModal(); isMenuOpen.set(false)">
              <div class="flex items-center">
                <mat-icon class="text-pink-600 mr-2.5 text-[18px] w-4.5 h-4.5">palette</mat-icon>
                <span>Themes (Apply to All)</span>
              </div>
              <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-pink-50 text-pink-700 truncate max-w-[85px]">{{ theme.name }}</span>
            </button>
          </div>
        }
      </div>

      <!-- Scrollable Favourites + FREQUENT List (Matching Video 2 00:02-00:04) -->
      <div class="flex-1 overflow-y-auto px-5 pb-20">
        <!-- Starred Favourites Vertical Rows -->
        @if (phoneState.favourites().length > 0) {
          <div class="divide-y mb-3" [style.borderColor]="theme.dividerColor">
            @for (fav of phoneState.favourites(); track fav.name) {
              @let c = phoneState.findContact(fav.name) || phoneState.findContact(fav.phone);
              <div class="flex items-center justify-between py-3 cursor-pointer transition-colors hover:bg-black/5"
                   [style.borderColor]="theme.dividerColor"
                   (click)="callFav(fav)"
                   (keyup.enter)="callFav(fav)"
                   tabindex="0"
                   role="button">
                <div class="flex items-center min-w-0 pr-3">
                  @if (c?.avatar) {
                    <img [src]="c!.avatar" alt="{{ fav.name }}" class="w-10 h-10 rounded-full object-cover mr-4 shrink-0" referrerpolicy="no-referrer" />
                  } @else {
                    <div class="w-10 h-10 rounded-full flex items-center justify-center text-white text-[17px] font-normal mr-4 shrink-0"
                         [style.background]="c?.color || (fav.color.startsWith('#') ? fav.color : '#f48fb1')">
                      {{ fav.name[0]?.toUpperCase() || 'F' }}
                    </div>
                  }
                  <span class="text-[16px] font-normal truncate"
                        [style.color]="theme.primaryTextColor">{{ fav.name }}</span>
                </div>
                <button type="button"
                        class="w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer hover:bg-black/10 shrink-0"
                        [style.color]="theme.primaryTextColor"
                        (click)="openDetailsFor(fav.name, fav.phone); $event.stopPropagation()"
                        aria-label="Contact info">
                  <span class="w-[22px] h-[22px] rounded-full border-[1.5px] flex items-center justify-center text-[12px] font-sans font-semibold leading-none"
                        [style.borderColor]="theme.primaryTextColor">i</span>
                </button>
              </div>
            }
          </div>
        }

        <!-- FREQUENT Section (Matching Video 2 00:02-00:04) -->
        <div class="pt-1 pb-1">
          <span class="text-[12px] font-medium uppercase tracking-wider"
                [style.color]="theme.secondaryTextColor">FREQUENT</span>
        </div>

        <div class="divide-y" [style.borderColor]="theme.dividerColor">
          @for (freq of frequentContactsList(); track freq.phone) {
            <div class="flex items-center justify-between py-2.5 cursor-pointer transition-colors hover:bg-black/5"
                 [style.borderColor]="theme.dividerColor"
                 (click)="phoneState.startCall(freq.name, freq.phone)"
                 (keyup.enter)="phoneState.startCall(freq.name, freq.phone)"
                 tabindex="0"
                 role="button">
              <div class="flex items-center min-w-0 pr-3">
                @if (freq.avatar) {
                  <img [src]="freq.avatar" alt="{{ freq.name }}" class="w-10 h-10 rounded-full object-cover mr-4 shrink-0" referrerpolicy="no-referrer" />
                } @else {
                  <div class="w-10 h-10 rounded-full flex items-center justify-center text-white text-[17px] font-normal mr-4 shrink-0"
                       [style.background]="freq.color || '#90caf9'">
                    {{ freq.name[0]?.toUpperCase() || 'C' }}
                  </div>
                }
                <div class="flex flex-col truncate">
                  <span class="text-[16px] font-normal leading-snug truncate"
                        [style.color]="theme.primaryTextColor">{{ freq.name }}</span>
                  <span class="text-[13px] leading-snug truncate"
                        [style.color]="theme.secondaryTextColor">{{ freq.type || 'Mobile' }} {{ freq.phone }}</span>
                </div>
              </div>
              <button type="button"
                      class="w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer hover:bg-black/10 shrink-0"
                      [style.color]="theme.primaryTextColor"
                      (click)="openDetailsFor(freq.name, freq.phone); $event.stopPropagation()"
                      aria-label="Contact info">
                <span class="w-[22px] h-[22px] rounded-full border-[1.5px] flex items-center justify-center text-[12px] font-sans font-semibold leading-none"
                      [style.borderColor]="theme.primaryTextColor">i</span>
              </button>
            </div>
          }
        </div>
      </div>

      <!-- Bottom-Right Floating Blue Star+ Button (Matching Video 2 00:02-00:04!) -->
      <button type="button"
              class="absolute bottom-[74px] right-6 w-[56px] h-[56px] rounded-full bg-[#007dff] text-white shadow-[0_6px_20px_rgba(0,125,255,0.42)] flex items-center justify-center z-30 active:scale-90 transition-transform cursor-pointer"
              (click)="openAddModal()"
              aria-label="Add favourite">
        <div class="relative flex items-center justify-center">
          <mat-icon class="text-[26px] w-6.5 h-6.5">star_border</mat-icon>
          <span class="absolute -bottom-1 -right-1.5 w-3.5 h-3.5 rounded-full bg-[#007dff] text-white flex items-center justify-center text-[12px] font-bold leading-none">+</span>
        </div>
      </button>

      <!-- Add Favourite Modal -->
      @if(isAddModalOpen()) {
        <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
             tabindex="0"
             role="button"
             aria-label="Close modal"
             (click)="isAddModalOpen.set(false)"
             (keydown.enter)="isAddModalOpen.set(false)"
             (keydown.space)="isAddModalOpen.set(false)">
          <div class="bg-white rounded-3xl w-full max-w-sm max-h-[80vh] flex flex-col p-6 shadow-2xl"
               tabindex="0"
               role="dialog"
               aria-modal="true"
               (click)="$event.stopPropagation()"
               (keydown)="$event.stopPropagation()">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-lg font-bold text-gray-900">Add to Favourites</h3>
              <button class="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 cursor-pointer" (click)="isAddModalOpen.set(false)">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            
            <div class="mb-3">
              <div class="bg-gray-100 rounded-xl flex items-center px-3 py-2">
                <mat-icon class="text-gray-400 mr-2 text-[20px] w-5 h-5">search</mat-icon>
                <input type="text" [value]="addSearchQuery()" (input)="addSearchQuery.set($any($event.target).value)"
                       placeholder="Search contacts..." class="bg-transparent outline-none flex-1 text-sm text-gray-800 placeholder-gray-400" />
              </div>
            </div>

            <div class="flex-1 overflow-y-auto divide-y divide-gray-100">
              @for(c of availableContactsForFav(); track c.phone) {
                <button class="w-full py-3 px-2 flex items-center justify-between hover:bg-gray-50 rounded-xl transition-colors cursor-pointer text-left"
                        (click)="addContactToFavourites(c)">
                  <div class="flex items-center min-w-0 pr-2">
                    <div class="w-9 h-9 rounded-full text-white flex items-center justify-center font-medium mr-3 shrink-0"
                         [style.background]="c.color || '#80cbc4'">
                      {{ c.name[0]?.toUpperCase() || 'C' }}
                    </div>
                    <div class="flex flex-col truncate">
                      <span class="text-sm font-medium text-gray-900 truncate">{{ c.name }}</span>
                      <span class="text-xs text-gray-500 truncate">{{ c.phone }}</span>
                    </div>
                  </div>
                  <mat-icon class="text-[#007dff]">add_circle_outline</mat-icon>
                </button>
              }
              @if(availableContactsForFav().length === 0) {
                <div class="py-8 text-center text-gray-400 text-sm">No matching contacts available</div>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class FavouritesComponent {
  phoneState = inject(PhoneState);
  isMenuOpen = signal(false);
  isAddModalOpen = signal(false);
  addSearchQuery = signal('');

  openRecordingsRequest = output<void>();
  openContactDetailsRequest = output<ContactData>();
  selectContact = output<ContactData>();

  frequentContactsList = computed(() => {
    const preferredOrder = [
      'mom',
      'Inder Bhaji',
      'Ravinder',
      'Naunehal Bhaji',
      'Inderpal Singh',
      'Snia D',
      'Prithvi',
      'Preeti',
      'Pinky Aunty',
      'Jaspal Uncle'
    ];
    const allContacts = this.phoneState.contacts();
    const result: ContactData[] = [];
    for (const name of preferredOrder) {
      const found = allContacts.find(c => c.name.toLowerCase() === name.toLowerCase());
      if (found) {
        result.push(found);
      }
    }
    return result;
  });

  availableContactsForFav = computed(() => {
    const q = this.addSearchQuery().toLowerCase().trim();
    return this.phoneState.contacts().filter(c => {
      const alreadyFav = this.phoneState.isFavourite(c.name, c.phone);
      if (alreadyFav) return false;
      if (!q) return true;
      return c.name.toLowerCase().includes(q) || c.phone.includes(q);
    });
  });

  openAddModal() {
    this.addSearchQuery.set('');
    this.isAddModalOpen.set(true);
  }

  addContactToFavourites(c: { name: string; phone: string; color?: string }) {
    this.phoneState.toggleFavourite({ name: c.name, phone: c.phone, type: 'Mobile', color: c.color });
    this.isAddModalOpen.set(false);
  }

  openRecordings() {
    this.isMenuOpen.set(false);
    this.openRecordingsRequest.emit();
  }

  callFav(fav: { name: string; phone: string }) {
    const phone = fav.phone || this.phoneState.lookupPhone(fav.name);
    const isNonContact = !this.phoneState.isContact(fav.name) && !this.phoneState.isContact(phone) && !this.phoneState.isTrusted(phone);
    this.phoneState.startCall(fav.name, phone, isNonContact);
  }

  openDetailsFor(name: string, phone: string) {
    const existing = (phone ? this.phoneState.findContactByPhone(phone) : undefined) ||
                     this.phoneState.findContact(name) ||
                     (phone ? this.phoneState.findContact(phone) : undefined);
    const resolvedPhone = phone || (existing ? existing.phone : this.phoneState.lookupPhone(name));
    const data: ContactData = existing
      ? { ...existing }
      : { name, phone: resolvedPhone, type: 'Mobile' };
    this.openContactDetailsRequest.emit(data);
    this.selectContact.emit(data);
  }
}

