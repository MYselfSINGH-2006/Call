export interface Call {
  id: number;
  name: string;
  phone?: string;
  type: 'incoming' | 'outgoing' | 'missed';
  location: string;
  time: string;
  count: number;
  detailStatus?: string;
  detailTimestamp?: string;
}

// Clean initial call history (zero dummy/example contacts)
export const CALL_HISTORY: Call[] = [];

export interface ContactItem {
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
  group?: string;
  ringtone?: string;
}

export const CONTACTS: ContactItem[] = [];

export const FAVOURITES: { name: string; color: string }[] = [];

export const FREQUENT: { name: string; type: string; number: string; color: string; avatar?: string }[] = [];

export const ALPHABET = ['#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];

export interface Recording {
  id: number;
  name: string;
  phone: string;
  date: string;
  time: string;
  duration: string;
  audioUrl?: string;
}

export const RECORDINGS: Recording[] = [];

export interface Group {
  id: number;
  name: string;
  contactCount: number;
  memberPhones?: string[];
}

export const GROUPS: Group[] = [
  { id: 1, name: 'Family', contactCount: 0, memberPhones: [] },
  { id: 2, name: 'Friends', contactCount: 0, memberPhones: [] },
  { id: 3, name: 'Work', contactCount: 0, memberPhones: [] }
];
