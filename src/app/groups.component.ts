import { ChangeDetectionStrategy, Component, signal, output, computed, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ContactItem } from './data';
import { PhoneState } from './phone-state';

@Component({
  selector: 'app-groups',
  standalone: true,
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let theme = phoneState.currentTheme();
    <div class="flex flex-col h-full relative z-[100] w-full pb-[64px] transition-colors duration-200"
         [style.background]="theme.contactsBg"
         [style.color]="theme.primaryTextColor">
      <!-- App Bar -->
      <div class="h-14 flex items-center justify-between px-4 shrink-0 pt-2 border-b"
           [style.background]="theme.topHeaderBarBg"
           [style.borderColor]="theme.dividerColor">
        <div class="flex items-center">
          <button class="w-10 h-10 flex items-center justify-center hover:bg-black/10 rounded-full transition-colors mr-2 -ml-2 cursor-pointer"
                  [style.color]="theme.primaryTextColor"
                  (click)="activeGroupId() ? activeGroupId.set(null) : closeView.emit()">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <h1 class="text-[22px] font-normal" [style.color]="theme.primaryTextColor">
            {{ activeGroup() ? activeGroup()!.name : 'Groups' }}
          </h1>
        </div>
        <button class="w-10 h-10 flex items-center justify-center hover:bg-black/10 rounded-full transition-colors cursor-pointer"
                [style.color]="theme.primaryTextColor"
                (click)="phoneState.openThemeModal()"
                aria-label="Choose Theme">
          <mat-icon>palette</mat-icon>
        </button>
      </div>

      @if(!activeGroupId()) {
        <!-- Add Group Row -->
        <div class="flex items-center px-5 py-4 cursor-pointer hover:bg-black/5 border-b"
             [style.borderColor]="theme.dividerColor"
             (click)="createNewGroup()"
             (keyup.enter)="createNewGroup()"
             tabindex="0"
             role="button">
           <div class="w-10 h-10 rounded-full flex items-center justify-center mr-4 shadow-sm shrink-0"
                [style.background]="theme.cardBg"
                [style.color]="theme.accentColor">
             <mat-icon>group_add</mat-icon>
           </div>
           <div class="flex-1 text-[17px] font-medium" [style.color]="theme.accentColor">Create group</div>
        </div>

        <!-- Groups List -->
        <div class="flex-1 overflow-y-auto">
           @for(group of phoneState.groups(); track group.id) {
             <div class="flex items-center pl-5 pr-3 py-3 cursor-pointer hover:bg-black/5"
                  (click)="openGroup(group.id)"
                  (keyup.enter)="openGroup(group.id)"
                  tabindex="0"
                  role="button">
               <div class="w-10 h-10 rounded-full border flex items-center justify-center mr-4 shrink-0"
                    [style.background]="theme.cardBg"
                    [style.borderColor]="theme.dividerColor"
                    [style.color]="theme.secondaryTextColor">
                 <mat-icon>group</mat-icon>
               </div>
               <div class="flex-1 min-w-0 pr-2">
                 <div class="text-[17px] truncate" [style.color]="theme.primaryTextColor">{{group.name}}</div>
                 <div class="text-[13px]" [style.color]="theme.secondaryTextColor">{{ (group.memberPhones || []).length }} contacts</div>
               </div>
               
               <button class="w-10 h-10 flex items-center justify-center hover:bg-black/10 rounded-full transition-colors shrink-0 cursor-pointer"
                       [style.color]="theme.secondaryTextColor"
                       (click)="phoneState.deleteGroupById(group.id); $event.stopPropagation()"
                       aria-label="Delete group">
                 <mat-icon class="text-[20px]">delete_outline</mat-icon>
               </button>
             </div>
             <div class="ml-[76px] border-b" [style.borderColor]="theme.dividerColor"></div>
           }
        </div>
      } @else {
        <!-- Group Details View with Real Members -->
        <div class="flex-1 overflow-y-auto flex flex-col">
           <div class="flex flex-col items-center pt-6 pb-5 border-b" [style.borderColor]="theme.dividerColor">
             <div class="w-18 h-18 rounded-full flex items-center justify-center shadow-sm mb-3"
                  [style.background]="theme.cardBg"
                  [style.color]="theme.accentColor">
               <mat-icon class="text-[36px] w-9 h-9">group</mat-icon>
             </div>
             <h2 class="text-2xl font-normal mb-0.5" [style.color]="theme.primaryTextColor">{{activeGroup()?.name}}</h2>
             <p class="text-[14px] mb-5" [style.color]="theme.secondaryTextColor">{{ activeGroupMembers().length }} members</p>
             
             <div class="flex space-x-6">
               <button class="flex flex-col items-center cursor-pointer active:scale-95 transition-transform"
                       (click)="isMemberPickerOpen.set(true)">
                 <div class="w-12 h-12 rounded-full border flex items-center justify-center shadow-sm mb-1.5"
                      [style.background]="theme.cardBg"
                      [style.borderColor]="theme.dividerColor"
                      [style.color]="theme.primaryTextColor">
                   <mat-icon>person_add</mat-icon>
                 </div>
                 <span class="text-[12px] font-medium" [style.color]="theme.secondaryTextColor">Add / Remove</span>
               </button>

               <button class="flex flex-col items-center cursor-pointer active:scale-95 transition-transform"
                       (click)="openGroupSmsModal()">
                 <div class="w-12 h-12 rounded-full border flex items-center justify-center shadow-sm mb-1.5"
                      [style.background]="theme.cardBg"
                      [style.borderColor]="theme.dividerColor"
                      [style.color]="theme.accentColor">
                   <mat-icon>sms</mat-icon>
                 </div>
                 <span class="text-[12px] font-medium" [style.color]="theme.secondaryTextColor">Group SMS</span>
               </button>

               <button class="flex flex-col items-center cursor-pointer active:scale-95 transition-transform"
                       (click)="openEditGroup()">
                 <div class="w-12 h-12 rounded-full border flex items-center justify-center shadow-sm mb-1.5"
                      [style.background]="theme.cardBg"
                      [style.borderColor]="theme.dividerColor"
                      [style.color]="theme.primaryTextColor">
                   <mat-icon>edit</mat-icon>
                 </div>
                 <span class="text-[12px] font-medium" [style.color]="theme.secondaryTextColor">Rename</span>
               </button>

               <button class="flex flex-col items-center cursor-pointer active:scale-95 transition-transform"
                       (click)="activeGroupId.set(null)">
                 <div class="w-12 h-12 rounded-full border flex items-center justify-center shadow-sm mb-1.5"
                      [style.background]="theme.cardBg"
                      [style.borderColor]="theme.dividerColor"
                      [style.color]="theme.primaryTextColor">
                   <mat-icon>close</mat-icon>
                 </div>
                 <span class="text-[12px] font-medium" [style.color]="theme.secondaryTextColor">Close</span>
               </button>
             </div>
           </div>
           
           <!-- Real Group Members List -->
           @if (activeGroupMembers().length > 0) {
             <div class="divide-y" [style.borderColor]="theme.dividerColor">
               @for (member of activeGroupMembers(); track member.phone) {
                 <div class="flex items-center justify-between px-5 py-3 hover:bg-black/5">
                   <div class="flex items-center min-w-0 pr-2">
                     <div class="w-10 h-10 rounded-full flex items-center justify-center mr-3.5 shrink-0 font-bold"
                          [style.background]="theme.contactAvatarBg"
                          [style.color]="theme.contactAvatarIconColor">
                       {{ member.name[0]?.toUpperCase() || 'C' }}
                     </div>
                     <div class="flex flex-col truncate">
                       <span class="text-[16px] font-medium truncate" [style.color]="theme.primaryTextColor">{{ member.name }}</span>
                       <span class="text-[12px] font-mono truncate" [style.color]="theme.secondaryTextColor">{{ member.phone }}</span>
                     </div>
                   </div>
                   <div class="flex items-center space-x-1 shrink-0">
                     <button class="w-9 h-9 rounded-full flex items-center justify-center hover:bg-black/10 cursor-pointer"
                             [style.color]="theme.accentColor"
                             (click)="phoneState.openChat(member.name, member.phone)"
                             aria-label="Message member">
                       <mat-icon class="text-[18px] w-4.5 h-4.5">message</mat-icon>
                     </button>
                     <button class="w-9 h-9 rounded-full flex items-center justify-center hover:bg-black/10 cursor-pointer"
                             [style.color]="theme.accentColor"
                             (click)="phoneState.startCall(member.name, member.phone)"
                             aria-label="Call member">
                       <mat-icon class="text-[18px] w-4.5 h-4.5">call</mat-icon>
                     </button>
                     <button class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-500/15 text-red-500 cursor-pointer"
                             (click)="toggleMember(member.phone)"
                             aria-label="Remove from group">
                       <mat-icon class="text-[18px] w-4.5 h-4.5">person_remove</mat-icon>
                     </button>
                   </div>
                 </div>
               }
             </div>
           } @else {
             <div class="w-full mt-4 px-4 py-10 flex flex-col items-center"
                  [style.color]="theme.secondaryTextColor">
                <mat-icon class="text-[48px] w-12 h-12 mb-2 opacity-40">people_outline</mat-icon>
                <p class="text-[15px] mb-3">No contacts added to this group yet.</p>
                <button class="px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
                        [style.background]="theme.callButtonBg"
                        [style.color]="theme.callButtonIconColor"
                        (click)="isMemberPickerOpen.set(true)">
                  + Add Contacts to Group
                </button>
             </div>
           }
        </div>
      }
      
      <!-- Create or Rename Group Dialog -->
      @if(isCreatingGroup() || isEditingGroup()) {
        <div class="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center px-6">
          <div class="bg-white rounded-3xl w-full max-w-[340px] shadow-2xl p-6 text-gray-900">
            <h2 class="text-xl font-bold text-gray-900 mb-4">
              {{ isEditingGroup() ? 'Rename group' : 'Create new group' }}
            </h2>
            <input type="text" placeholder="Group name" [value]="newGroupName()" (input)="updateNewGroupName($event)"
                   (keyup.enter)="saveGroupDialog()"
                   class="w-full bg-transparent border-b-2 border-[#1a73e8] px-1 py-2 text-[17px] text-gray-900 outline-none mb-6 focus:bg-blue-50/50 transition-colors" />
            
            <div class="flex justify-end space-x-2">
               <button class="px-4 py-2 text-[15px] font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer" (click)="cancelGroupDialog()">Cancel</button>
               <button class="px-4 py-2 text-[15px] font-bold text-[#1a73e8] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer" (click)="saveGroupDialog()" [disabled]="!newGroupName().trim()" [class.opacity-50]="!newGroupName().trim()">Save</button>
            </div>
          </div>
        </div>
      }

      <!-- Real Contact Member Picker Modal -->
      @if(isMemberPickerOpen() && activeGroup(); as grp) {
        <div class="fixed inset-0 bg-black/50 z-[205] flex items-center justify-center p-4">
          <div class="bg-white rounded-3xl w-full max-w-sm max-h-[80vh] flex flex-col p-5 shadow-2xl text-gray-900">
            <div class="flex justify-between items-center mb-3">
              <h3 class="text-lg font-bold">Manage "{{ grp.name }}" Members</h3>
              <button class="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 cursor-pointer"
                      (click)="isMemberPickerOpen.set(false)">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            <div class="flex-1 overflow-y-auto divide-y divide-gray-100">
              @for(c of phoneState.contacts(); track c.phone) {
                @let inGrp = isPhoneInGroup(c.phone);
                <button type="button"
                        class="w-full py-2.5 px-2 flex items-center justify-between hover:bg-gray-50 rounded-xl cursor-pointer text-left"
                        (click)="toggleMember(c.phone)">
                  <div class="flex flex-col">
                    <span class="text-sm font-semibold text-gray-900">{{ c.name }}</span>
                    <span class="text-xs text-gray-500 font-mono">{{ c.phone }}</span>
                  </div>
                  <mat-icon [class.text-green-600]="inGrp" [class.text-gray-300]="!inGrp">
                    {{ inGrp ? 'check_circle' : 'add_circle_outline' }}
                  </mat-icon>
                </button>
              }
            </div>
            <button class="w-full mt-3 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-bold cursor-pointer"
                    (click)="isMemberPickerOpen.set(false)">
              Done
            </button>
          </div>
        </div>
      }

      <!-- Group SMS Broadcast Modal -->
      @if(isGroupSmsOpen() && activeGroup(); as grp) {
        <div class="fixed inset-0 bg-black/50 z-[205] flex items-center justify-center p-4">
          <div class="bg-white rounded-3xl w-full max-w-sm p-5 shadow-2xl text-gray-900">
            <div class="flex justify-between items-center mb-3">
              <h3 class="text-lg font-bold">Send SMS to "{{ grp.name }}" ({{ activeGroupMembers().length }})</h3>
              <button class="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 cursor-pointer"
                      (click)="isGroupSmsOpen.set(false)">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            <textarea rows="3"
                      [value]="groupSmsText()"
                      (input)="groupSmsText.set($any($event.target).value)"
                      placeholder="Type message to send to all group members..."
                      class="w-full border border-gray-300 rounded-xl p-3 text-sm outline-none focus:border-blue-500 resize-none mb-4"></textarea>
            <div class="flex justify-end gap-2">
              <button class="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 text-xs font-semibold cursor-pointer"
                      (click)="isGroupSmsOpen.set(false)">
                Cancel
              </button>
              <button class="px-5 py-2 bg-[#1a73e8] text-white rounded-xl text-xs font-bold disabled:opacity-50 cursor-pointer"
                      [disabled]="!groupSmsText().trim() || activeGroupMembers().length === 0"
                      (click)="sendSmsToGroup()">
                Send to All
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class GroupsComponent {
  phoneState = inject(PhoneState);
  closeView = output<void>();

  isCreatingGroup = signal(false);
  isEditingGroup = signal(false);
  isMemberPickerOpen = signal(false);
  isGroupSmsOpen = signal(false);
  newGroupName = signal('');
  groupSmsText = signal('');

  activeGroupId = signal<number | null>(null);
  activeGroup = computed(() => this.phoneState.groups().find(g => g.id === this.activeGroupId()));

  activeGroupMembers = computed<ContactItem[]>(() => {
    const grp = this.activeGroup();
    if (!grp) return [];
    const phones = grp.memberPhones || [];
    return phones.map(p => {
      const found = this.phoneState.findContact(p);
      return found || { name: p, phone: p };
    });
  });

  openGroup(id: number) {
    this.activeGroupId.set(id);
  }

  isPhoneInGroup(phone: string): boolean {
    const grp = this.activeGroup();
    if (!grp || !grp.memberPhones) return false;
    const clean = phone.replace(/\s+/g, '');
    return grp.memberPhones.some(p => p.replace(/\s+/g, '') === clean);
  }

  toggleMember(phone: string) {
    const id = this.activeGroupId();
    if (id) {
      this.phoneState.toggleContactInGroup(id, phone);
    }
  }

  createNewGroup() {
    this.isEditingGroup.set(false);
    this.isCreatingGroup.set(true);
    this.newGroupName.set('');
  }

  openEditGroup() {
    const grp = this.activeGroup();
    if (!grp) return;
    this.isCreatingGroup.set(false);
    this.isEditingGroup.set(true);
    this.newGroupName.set(grp.name);
  }

  openGroupSmsModal() {
    this.groupSmsText.set('');
    this.isGroupSmsOpen.set(true);
  }

  sendSmsToGroup() {
    const id = this.activeGroupId();
    const txt = this.groupSmsText().trim();
    if (id && txt) {
      this.phoneState.sendGroupSms(id, txt);
      this.isGroupSmsOpen.set(false);
      this.groupSmsText.set('');
    }
  }

  updateNewGroupName(event: Event) {
    this.newGroupName.set((event.target as HTMLInputElement).value);
  }

  cancelGroupDialog() {
    this.isCreatingGroup.set(false);
    this.isEditingGroup.set(false);
  }

  saveGroupDialog() {
    const name = this.newGroupName().trim();
    if (!name) return;
    if (this.isEditingGroup() && this.activeGroupId()) {
      this.phoneState.renameGroup(this.activeGroupId()!, name);
    } else {
      this.phoneState.createGroup(name);
    }
    this.isCreatingGroup.set(false);
    this.isEditingGroup.set(false);
  }
}
