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

export const CALL_HISTORY: Call[] = [
  { id: 101, name: 'Naunehal Bhaji', phone: '+91 97801 00916', type: 'outgoing', location: 'India', time: 'Yesterday', count: 2, detailTimestamp: 'Yesterday, 8:40 pm', detailStatus: '1 min 12 sec' },
  { id: 102, name: 'Inder Bhaji', phone: '75086 61608', type: 'incoming', location: 'India', time: 'Yesterday', count: 1, detailTimestamp: 'Yesterday, 6:15 pm', detailStatus: '45 sec' },
  { id: 103, name: 'Ravinder', phone: '+91 98773 63313', type: 'missed', location: 'India', time: 'Yesterday', count: 1, detailTimestamp: '9 Oct, 5:09 pm', detailStatus: 'Rejected' },
  { id: 104, name: 'Naunehal Bhaji', phone: '+91 97801 00916', type: 'incoming', location: 'India', time: 'Yesterday', count: 1, detailTimestamp: 'Yesterday, 2:10 pm', detailStatus: '32 sec' },
  { id: 105, name: 'Inder Bhaji', phone: '75086 61608', type: 'incoming', location: 'India', time: 'Yesterday', count: 1, detailTimestamp: 'Yesterday, 11:05 am', detailStatus: '1 min 4 sec' },
  { id: 106, name: '+91 93199 96243', phone: '+91 93199 96243', type: 'missed', location: 'India', time: '08/10', count: 2, detailTimestamp: '8 Oct, 4:30 pm', detailStatus: 'Rang for 25 seconds' },
  { id: 107, name: 'Ravinder', phone: '+91 98773 63313', type: 'outgoing', location: 'India', time: '08/10', count: 2, detailTimestamp: '8 Oct, 11:24 am', detailStatus: 'Cancelled' },
  { id: 108, name: 'Ravinder', phone: '+91 98773 63313', type: 'missed', location: 'India', time: '08/10', count: 1, detailTimestamp: '8 Oct, 11:14 am', detailStatus: 'Rang for 30 seconds' },
  { id: 109, name: 'Ravinder', phone: '+91 98773 63313', type: 'outgoing', location: 'India', time: '06/10', count: 19, detailTimestamp: '6 Oct, 5:52 pm', detailStatus: 'Cancelled' },
  { id: 110, name: 'Prithvi', phone: '97798 52808', type: 'outgoing', location: 'India', time: '06/10', count: 5, detailTimestamp: '6 Oct, 3:20 pm', detailStatus: '2 min 18 sec' },
  { id: 111, name: 'mom', phone: '99142 25116', type: 'incoming', location: 'India', time: '06/10', count: 1, detailTimestamp: '6 Oct, 1:10 pm', detailStatus: '3 min 40 sec' },
  { id: 112, name: 'Pinky Aunty', phone: '+91 62831 27672', type: 'incoming', location: 'India', time: '06/10', count: 1, detailTimestamp: '6 Oct, 10:05 am', detailStatus: '1 min 15 sec' },
  { id: 113, name: 'Snia D', phone: '6284 634 963', type: 'outgoing', location: 'India', time: '29/09', count: 1, detailTimestamp: '29 Sept, 8:25 pm', detailStatus: '5 sec' },
  { id: 114, name: 'Snia D', phone: '6284 634 963', type: 'incoming', location: 'India', time: '29/09', count: 1, detailTimestamp: '29 Sept, 7:46 pm', detailStatus: '2 min 6 sec' }
];

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

export const CONTACTS: ContactItem[] = [
  { name: '!?!?!?!?!?', phone: '*121#', type: 'Mobile', color: '#facc15' },
  { name: 'Aditya Friend', phone: '+91 98123 45670', type: 'Mobile', color: '#f48fb1' },
  { name: 'Advance Talktime', phone: '52141', type: 'Mobile', color: '#b39ddb', isSim: true },
  { name: 'airtel live(AL)', phone: '54321', type: 'Mobile', color: '#80cbc4', isSim: true },
  { name: 'airtel money', phone: '*400#', type: 'Mobile', color: '#90caf9', isSim: true },
  { name: 'Baba G', phone: '+91 98760 11220', type: 'Mobile', color: '#b39ddb' },
  { name: 'Bajwa', phone: '+91 98760 22331', type: 'Mobile', color: '#b39ddb' },
  { name: 'Bheem Friend', phone: '+91 98760 33442', type: 'Mobile', color: '#ffab91' },
  { name: 'Bholi Bhua', phone: '+91 98760 44553', type: 'Mobile', color: '#80cbc4' },
  { name: 'Bhramjot', phone: '+91 98760 55664', type: 'Mobile', color: '#90caf9' },
  { name: 'Bibi G', phone: '+91 98760 66775', type: 'Mobile', color: '#80cbc4' },
  { name: 'Blazzeee', phone: '+91 98760 77886', type: 'Mobile', color: '#ffab91' },
  { name: 'Inder Bhaji', phone: '75086 61608', type: 'Mobile', color: '#90caf9' },
  { name: 'Inderpal Singh', phone: '+91 79738 84021', type: 'Mobile', color: '#f48fb1' },
  { name: 'Jaspal Uncle', phone: '+91 98558 77267', type: 'Mobile', color: '#90caf9' },
  { name: 'Maire Khand Mishri', phone: '+91 82889 50843', type: 'Mobile', color: '#f48fb1' },
  { name: 'mom', phone: '99142 25116', type: 'Custom', color: '#ce93d8' },
  { name: 'Naunehal Bhaji', phone: '+91 97801 00916', type: 'Mobile', color: '#d4e157' },
  { name: 'Pinky Aunty', phone: '+91 62831 27672', type: 'Mobile', color: '#d4e157' },
  { name: 'Preeti', phone: '+91 83608 10509', type: 'Mobile', color: '#b39ddb' },
  { name: 'Prithvi', phone: '97798 52808', type: 'Mobile', color: '#90caf9' },
  { name: 'Rajan Jiju', phone: '+91 98888 11223', type: 'Mobile', color: '#ce93d8' },
  { name: 'Ravinder', phone: '+91 98773 63313', type: 'Mobile', color: '#80cbc4', email: 'z7810780@gmail.com' },
  { name: 'Snia D', phone: '6284 634 963', type: 'Mobile', color: '#80cbc4' }
];

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
  { id: 1, name: 'Family', contactCount: 3, memberPhones: ['99142 25116', '75086 61608', '+91 97801 00916'] },
  { id: 2, name: 'Friends', contactCount: 4, memberPhones: ['+91 98123 45670', '97798 52808', '+91 98773 63313', '6284 634 963'] },
  { id: 3, name: 'Work', contactCount: 1, memberPhones: ['+91 79738 84021'] }
];

