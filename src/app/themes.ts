export interface AppTheme {
  id: string;
  index: number;
  name: string;
  subtitle: string;
  isDark: boolean;
  // Wallpaper & Backgrounds
  wallpaperUrl?: string;
  rootBg: string;
  upperBg: string;
  contactsBg: string;
  topHeaderBarBg: string; // e.g. '#27292b' in Black Water Drops or 'transparent'
  keypadPanelBg: string;
  keypadPanelRounded: boolean;
  showQuickContactActionsInSheet: boolean; // e.g. true in Ice Blue Pastel (#11)
  bottomNavBg: string;
  // Dialed number box (used in Misty Pine Forest #10)
  numberBoxBg: string;
  numberTextColor: string;
  // Typography & list colors
  primaryTextColor: string;
  secondaryTextColor: string;
  accentColor: string;
  matchHighlightColor: string;
  dividerColor: string;
  cardBg: string;
  searchBarBg: string;
  searchBarBorder: string;
  // Contacts specific
  contactAvatarBg: string;
  contactAvatarIconColor: string;
  contactsFabBg: string;
  contactsFabIconColor: string;
  myCardStyle: 'outline-honor' | 'blue-circle';
  // Keypad button styling
  keyStyle:
    | 'squircle-3d'
    | 'thin-sans'
    | 'bold-sans'
    | 'hand-drawn'
    | 'ultra-thin'
    | 'retro-wide'
    | 'medium-sans'
    | 'stencil';
  keyDigitColor: string;
  keySublabelColor: string;
  // Call button styling
  callButtonBg: string;
  callButtonIconColor: string;
  // Bottom Nav colors
  navActiveColor: string;
  navInactiveColor: string;
}

const IMG_WHITE_SPHERES = '/src/assets/images/theme_white_spheres_1791199154714.jpg';
const IMG_ANIME_BAN_ANXIETY = '/src/assets/images/theme_anime_ban_anxiety_1791199167547.jpg';
const IMG_STARRY_ASTRONAUT = '/src/assets/images/theme_starry_astronaut_1791199179243.jpg';
const IMG_CYBER_SUPERCAR = '/src/assets/images/theme_cyber_supercar_1791199192271.jpg';
const IMG_KATANA_WARRIOR = '/src/assets/images/theme_katana_warrior_1791199204601.jpg';
const IMG_LONE_TREE_MOON = '/src/assets/images/theme_lone_tree_moon_1791199215596.jpg';
const IMG_BLACK_WATER_DROPS = '/src/assets/images/theme_black_water_drops_1791199227065.jpg';
const IMG_MISTY_PINE_FOREST = '/src/assets/images/theme_misty_pine_forest_1791199236656.jpg';
const IMG_DAISY_MOON_OIL = '/src/assets/images/theme_daisy_moon_oil_1791199246695.jpg';

export const APP_THEMES: AppTheme[] = [
  // ===========================================================================
  // DEFAULT THEME: Light (Default) — Classic Clean White & Blue
  // ===========================================================================
  {
    id: 'default',
    index: 0,
    name: 'Light (Default)',
    subtitle: 'Honor MagicOS clean white & blue default theme',
    isDark: false,
    wallpaperUrl: IMG_STARRY_ASTRONAUT,
    rootBg: '#f2f3f5',
    upperBg: '#f2f3f5',
    contactsBg: '#f2f3f5',
    topHeaderBarBg: 'transparent',
    keypadPanelBg: '#ffffff',
    keypadPanelRounded: true,
    showQuickContactActionsInSheet: false,
    bottomNavBg: '#ffffff',
    numberBoxBg: 'transparent',
    numberTextColor: '#191919',
    primaryTextColor: '#191919',
    secondaryTextColor: '#7f7f7f',
    accentColor: '#007dff',
    matchHighlightColor: '#007dff',
    dividerColor: 'rgba(0, 0, 0, 0.06)',
    cardBg: '#ffffff',
    searchBarBg: '#e6e8ec',
    searchBarBorder: 'transparent',
    contactAvatarBg: '#80cbc4',
    contactAvatarIconColor: '#ffffff',
    contactsFabBg: '#007dff',
    contactsFabIconColor: '#ffffff',
    myCardStyle: 'blue-circle',
    keyStyle: 'medium-sans',
    keyDigitColor: '#191919',
    keySublabelColor: '#666666',
    callButtonBg: '#262626',
    callButtonIconColor: '#ffffff',
    navActiveColor: '#007dff',
    navInactiveColor: '#191919'
  },

  // ===========================================================================
  // THEME 1: 3D White Spheres & Neumorphic Squircle Keys (Screenshots 1 & 2)
  // ===========================================================================
  {
    id: 'theme-1-white-spheres',
    index: 1,
    name: '3D White Spheres',
    subtitle: '3D squircle keys & soft white spheres',
    isDark: false,
    wallpaperUrl: IMG_WHITE_SPHERES,
    rootBg: '#e8eaee',
    upperBg: `url("${IMG_WHITE_SPHERES}") center top / cover no-repeat`,
    contactsBg: `url("${IMG_WHITE_SPHERES}") center center / cover no-repeat`,
    topHeaderBarBg: 'transparent',
    keypadPanelBg: '#e8eaee',
    keypadPanelRounded: false,
    showQuickContactActionsInSheet: false,
    bottomNavBg: '#e6e8ec',
    numberBoxBg: 'transparent',
    numberTextColor: '#000000',
    primaryTextColor: '#000000',
    secondaryTextColor: '#666666',
    accentColor: '#1a73e8',
    matchHighlightColor: '#1a73e8',
    dividerColor: 'rgba(0, 0, 0, 0.06)',
    cardBg: 'rgba(255, 255, 255, 0.75)',
    searchBarBg: '#ffffff',
    searchBarBorder: 'transparent',
    contactAvatarBg: '#a8c69f',
    contactAvatarIconColor: '#ffffff',
    contactsFabBg: '#c4c7cc',
    contactsFabIconColor: '#111111',
    myCardStyle: 'outline-honor',
    keyStyle: 'squircle-3d',
    keyDigitColor: '#4a4e54',
    keySublabelColor: '#5c6066',
    callButtonBg: '#8c9196',
    callButtonIconColor: '#ffffff',
    navActiveColor: '#1a73e8',
    navInactiveColor: '#666666'
  },

  // ===========================================================================
  // THEME 2: Monochrome Anime Boy "Ban anxiety" (Screenshots 3 & 4)
  // ===========================================================================
  {
    id: 'theme-2-anime-ban-anxiety',
    index: 2,
    name: 'Ban Anxiety Anime',
    subtitle: 'Monochrome anime boy & charcoal keypad',
    isDark: true,
    wallpaperUrl: IMG_ANIME_BAN_ANXIETY,
    rootBg: '#333333',
    upperBg: `url("${IMG_ANIME_BAN_ANXIETY}") center top / cover no-repeat`,
    contactsBg: `url("${IMG_ANIME_BAN_ANXIETY}") center center / cover no-repeat`,
    topHeaderBarBg: 'transparent',
    keypadPanelBg: '#333333',
    keypadPanelRounded: false,
    showQuickContactActionsInSheet: false,
    bottomNavBg: '#333333',
    numberBoxBg: 'transparent',
    numberTextColor: '#ffffff',
    primaryTextColor: '#ffffff',
    secondaryTextColor: '#b0b0b0',
    accentColor: '#6da8db',
    matchHighlightColor: '#6da8db',
    dividerColor: 'rgba(255, 255, 255, 0.12)',
    cardBg: 'rgba(40, 40, 40, 0.78)',
    searchBarBg: 'rgba(38, 38, 38, 0.88)',
    searchBarBorder: 'transparent',
    contactAvatarBg: '#a8c69f',
    contactAvatarIconColor: '#ffffff',
    contactsFabBg: '#6da8db',
    contactsFabIconColor: '#ffffff',
    myCardStyle: 'outline-honor',
    keyStyle: 'thin-sans',
    keyDigitColor: '#ffffff',
    keySublabelColor: '#b5b5b5',
    callButtonBg: '#6da8db',
    callButtonIconColor: '#ffffff',
    navActiveColor: '#6da8db',
    navInactiveColor: '#aaaaaa'
  },

  // ===========================================================================
  // THEME 3: Starry Night Cute Astronaut (Screenshots 5 & 6)
  // ===========================================================================
  {
    id: 'theme-3-starry-astronaut',
    index: 3,
    name: 'Starry Night Astronaut',
    subtitle: 'Swirling nebula astronaut & deep navy',
    isDark: true,
    wallpaperUrl: IMG_STARRY_ASTRONAUT,
    rootBg: '#1b2234',
    upperBg: `url("${IMG_STARRY_ASTRONAUT}") center top / cover no-repeat`,
    contactsBg: `url("${IMG_STARRY_ASTRONAUT}") center center / cover no-repeat`,
    topHeaderBarBg: 'transparent',
    keypadPanelBg: '#1b2234',
    keypadPanelRounded: false,
    showQuickContactActionsInSheet: false,
    bottomNavBg: '#1b2234',
    numberBoxBg: 'transparent',
    numberTextColor: '#ffffff',
    primaryTextColor: '#ffffff',
    secondaryTextColor: '#9aa4b8',
    accentColor: '#0d74f5',
    matchHighlightColor: '#0d74f5',
    dividerColor: 'rgba(255, 255, 255, 0.1)',
    cardBg: 'rgba(27, 34, 52, 0.8)',
    searchBarBg: 'rgba(28, 45, 68, 0.85)',
    searchBarBorder: 'transparent',
    contactAvatarBg: '#a8c69f',
    contactAvatarIconColor: '#ffffff',
    contactsFabBg: '#0d74f5',
    contactsFabIconColor: '#ffffff',
    myCardStyle: 'outline-honor',
    keyStyle: 'bold-sans',
    keyDigitColor: '#ffffff',
    keySublabelColor: '#c5ccd9',
    callButtonBg: '#0d74f5',
    callButtonIconColor: '#ffffff',
    navActiveColor: '#0d74f5',
    navInactiveColor: '#9aa4b8'
  },

  // ===========================================================================
  // THEME 4: Dark Cyberpunk Supercar & Sketch Keys (Screenshots 7 & 8)
  // ===========================================================================
  {
    id: 'theme-4-cyber-supercar',
    index: 4,
    name: 'Cyber Neon Supercar',
    subtitle: 'Matte black supercar & cyan sketch keys',
    isDark: true,
    wallpaperUrl: IMG_CYBER_SUPERCAR,
    rootBg: '#050708',
    upperBg: `url("${IMG_CYBER_SUPERCAR}") center top / cover no-repeat`,
    contactsBg: `url("${IMG_CYBER_SUPERCAR}") center center / cover no-repeat`,
    topHeaderBarBg: 'transparent',
    keypadPanelBg: '#050708',
    keypadPanelRounded: false,
    showQuickContactActionsInSheet: false,
    bottomNavBg: '#050708',
    numberBoxBg: 'transparent',
    numberTextColor: '#ffffff',
    primaryTextColor: '#ffffff',
    secondaryTextColor: '#999999',
    accentColor: '#1ec8c8',
    matchHighlightColor: '#1ec8c8',
    dividerColor: 'rgba(255, 255, 255, 0.1)',
    cardBg: 'rgba(20, 26, 28, 0.85)',
    searchBarBg: 'rgba(26, 32, 34, 0.88)',
    searchBarBorder: 'transparent',
    contactAvatarBg: '#a8c69f',
    contactAvatarIconColor: '#ffffff',
    contactsFabBg: '#1ec8c8',
    contactsFabIconColor: '#ffffff',
    myCardStyle: 'outline-honor',
    keyStyle: 'hand-drawn',
    keyDigitColor: '#ffffff',
    keySublabelColor: '#cccccc',
    callButtonBg: '#1ec8c8',
    callButtonIconColor: '#ffffff',
    navActiveColor: '#1ec8c8',
    navInactiveColor: '#888888'
  },

  // ===========================================================================
  // THEME 5: Crimson Katana Dark Warrior & Full Moon (Screenshots 9 & 10)
  // ===========================================================================
  {
    id: 'theme-5-katana-warrior',
    index: 5,
    name: 'Crimson Katana Moon',
    subtitle: 'Dark katana warrior & deep slate-teal',
    isDark: true,
    wallpaperUrl: IMG_KATANA_WARRIOR,
    rootBg: '#1d383c',
    upperBg: `url("${IMG_KATANA_WARRIOR}") center top / cover no-repeat`,
    contactsBg: `url("${IMG_KATANA_WARRIOR}") center center / cover no-repeat`,
    topHeaderBarBg: 'transparent',
    keypadPanelBg: '#1d383c',
    keypadPanelRounded: false,
    showQuickContactActionsInSheet: false,
    bottomNavBg: '#1d383c',
    numberBoxBg: 'transparent',
    numberTextColor: '#ffffff',
    primaryTextColor: '#ffffff',
    secondaryTextColor: '#a3bdc2',
    accentColor: '#14e8d8',
    matchHighlightColor: '#14e8d8',
    dividerColor: 'rgba(255, 255, 255, 0.12)',
    cardBg: 'rgba(29, 56, 60, 0.82)',
    searchBarBg: 'rgba(34, 64, 70, 0.85)',
    searchBarBorder: 'transparent',
    contactAvatarBg: '#a8c69f',
    contactAvatarIconColor: '#ffffff',
    contactsFabBg: '#21484e',
    contactsFabIconColor: '#ffffff',
    myCardStyle: 'outline-honor',
    keyStyle: 'ultra-thin',
    keyDigitColor: '#ffffff',
    keySublabelColor: '#cbe4e8',
    callButtonBg: '#14e8d8',
    callButtonIconColor: '#ffffff',
    navActiveColor: '#14e8d8',
    navInactiveColor: '#9ab4b8'
  },

  // ===========================================================================
  // THEME 6: Lone Tree Moon Reflection & Clean Green (Screenshots 11 & 12)
  // ===========================================================================
  {
    id: 'theme-6-lone-tree-moon',
    index: 6,
    name: 'Lone Tree Moon Lake',
    subtitle: 'Silver moon reflection & vibrant green',
    isDark: false,
    wallpaperUrl: IMG_LONE_TREE_MOON,
    rootBg: '#e4e6e7',
    upperBg: `url("${IMG_LONE_TREE_MOON}") center top / cover no-repeat`,
    contactsBg: `url("${IMG_LONE_TREE_MOON}") center center / cover no-repeat`,
    topHeaderBarBg: 'transparent',
    keypadPanelBg: '#e4e6e7',
    keypadPanelRounded: true,
    showQuickContactActionsInSheet: false,
    bottomNavBg: '#e4e6e7',
    numberBoxBg: 'transparent',
    numberTextColor: '#111111',
    primaryTextColor: '#111111',
    secondaryTextColor: '#444444',
    accentColor: '#1b873f',
    matchHighlightColor: '#1b873f',
    dividerColor: 'rgba(0, 0, 0, 0.12)',
    cardBg: 'rgba(255, 255, 255, 0.7)',
    searchBarBg: 'transparent',
    searchBarBorder: 'transparent',
    contactAvatarBg: '#6eb2e4',
    contactAvatarIconColor: '#ffffff',
    contactsFabBg: '#3ebd42',
    contactsFabIconColor: '#ffffff',
    myCardStyle: 'blue-circle',
    keyStyle: 'thin-sans',
    keyDigitColor: '#000000',
    keySublabelColor: '#333333',
    callButtonBg: '#3ebd42',
    callButtonIconColor: '#ffffff',
    navActiveColor: '#1b873f',
    navInactiveColor: '#222222'
  },

  // ===========================================================================
  // THEME 7: Minimalist Soft Gray & Bold Retro Steel (Screenshots 13 & 14)
  // ===========================================================================
  {
    id: 'theme-7-retro-steel',
    index: 7,
    name: 'Minimalist Retro Steel',
    subtitle: 'Wide bold geometric digits & steel teal',
    isDark: false,
    wallpaperUrl: IMG_BLACK_WATER_DROPS,
    rootBg: '#eceef0',
    upperBg: '#eceef0',
    contactsBg: '#eceef0',
    topHeaderBarBg: 'transparent',
    keypadPanelBg: '#eceef0',
    keypadPanelRounded: false,
    showQuickContactActionsInSheet: false,
    bottomNavBg: '#eceef0',
    numberBoxBg: 'transparent',
    numberTextColor: '#000000',
    primaryTextColor: '#000000',
    secondaryTextColor: '#666666',
    accentColor: '#5698ad',
    matchHighlightColor: '#5698ad',
    dividerColor: 'rgba(0, 0, 0, 0.06)',
    cardBg: '#ffffff',
    searchBarBg: '#ffffff',
    searchBarBorder: 'transparent',
    contactAvatarBg: '#a8c69f',
    contactAvatarIconColor: '#ffffff',
    contactsFabBg: '#ffffff',
    contactsFabIconColor: '#222222',
    myCardStyle: 'outline-honor',
    keyStyle: 'retro-wide',
    keyDigitColor: '#4a4d50',
    keySublabelColor: '#4a4d50',
    callButtonBg: '#5698ad',
    callButtonIconColor: '#ffffff',
    navActiveColor: '#5698ad',
    navInactiveColor: '#555555'
  },

  // ===========================================================================
  // THEME 8: Black Matte Water Droplets & Dodger Blue (Screenshots 15 & 16)
  // ===========================================================================
  {
    id: 'theme-8-black-water-drops',
    index: 8,
    name: 'Black Water Droplets',
    subtitle: 'Glossy dark water drops & dodger blue',
    isDark: true,
    wallpaperUrl: IMG_BLACK_WATER_DROPS,
    rootBg: '#27292b',
    upperBg: `url("${IMG_BLACK_WATER_DROPS}") center center / cover no-repeat`,
    contactsBg: `url("${IMG_BLACK_WATER_DROPS}") center center / cover no-repeat`,
    topHeaderBarBg: '#27292b',
    keypadPanelBg: '#27292b',
    keypadPanelRounded: true,
    showQuickContactActionsInSheet: false,
    bottomNavBg: '#27292b',
    numberBoxBg: 'transparent',
    numberTextColor: '#ffffff',
    primaryTextColor: '#ffffff',
    secondaryTextColor: '#cccccc',
    accentColor: '#3898f8',
    matchHighlightColor: '#3898f8',
    dividerColor: 'rgba(255, 255, 255, 0.14)',
    cardBg: 'rgba(39, 41, 43, 0.85)',
    searchBarBg: 'transparent',
    searchBarBorder: 'transparent',
    contactAvatarBg: '#6eb2e4',
    contactAvatarIconColor: '#ffffff',
    contactsFabBg: '#ffffff',
    contactsFabIconColor: '#111111',
    myCardStyle: 'blue-circle',
    keyStyle: 'bold-sans',
    keyDigitColor: '#ffffff',
    keySublabelColor: '#e5e7eb',
    callButtonBg: '#3898f8',
    callButtonIconColor: '#ffffff',
    navActiveColor: '#3898f8',
    navInactiveColor: '#ffffff'
  },

  // ===========================================================================
  // THEME 9: Soft Sage Radial Mist & Pastel Coral-Pink (Screenshots 17 & 18)
  // ===========================================================================
  {
    id: 'theme-9-sage-coral-mist',
    index: 9,
    name: 'Sage Radial & Coral',
    subtitle: 'Soft sage mist, forest green & coral pink',
    isDark: false,
    wallpaperUrl: IMG_MISTY_PINE_FOREST,
    rootBg: '#d5e0d6',
    upperBg: 'radial-gradient(circle at 50% 62%, #97b598 0%, #b5cbb6 45%, #e4ebe4 88%)',
    contactsBg: 'radial-gradient(circle at 50% 54%, #95b396 0%, #b3cab4 46%, #d5e0d6 90%)',
    topHeaderBarBg: 'transparent',
    keypadPanelBg: 'radial-gradient(circle at 72% 48%, rgba(149, 179, 150, 0.65) 0%, rgba(232, 239, 232, 0.92) 70%)',
    keypadPanelRounded: true,
    showQuickContactActionsInSheet: false,
    bottomNavBg: '#d0ddd2',
    numberBoxBg: 'transparent',
    numberTextColor: '#1b4d20',
    primaryTextColor: '#1b4d20',
    secondaryTextColor: '#486e4b',
    accentColor: '#e5858b',
    matchHighlightColor: '#e5858b',
    dividerColor: 'rgba(27, 77, 32, 0.15)',
    cardBg: 'rgba(255, 255, 255, 0.45)',
    searchBarBg: 'transparent',
    searchBarBorder: 'transparent',
    contactAvatarBg: '#7aa7df',
    contactAvatarIconColor: '#ffffff',
    contactsFabBg: '#a2dec9',
    contactsFabIconColor: '#1b4d20',
    myCardStyle: 'blue-circle',
    keyStyle: 'medium-sans',
    keyDigitColor: '#2b6e32',
    keySublabelColor: '#3b7a40',
    callButtonBg: 'rgba(195, 214, 198, 0.85)',
    callButtonIconColor: '#8ce0c8',
    navActiveColor: '#e5858b',
    navInactiveColor: '#1b4d20'
  },

  // ===========================================================================
  // THEME 10: Misty Pine Forest & Stencil Font (Screenshots 19 & 20)
  // ===========================================================================
  {
    id: 'theme-10-misty-pine-stencil',
    index: 10,
    name: 'Misty Pine Stencil',
    subtitle: 'Foggy pine forest, sage box & stencil keys',
    isDark: false,
    wallpaperUrl: IMG_MISTY_PINE_FOREST,
    rootBg: '#f5f7f5',
    upperBg: `url("${IMG_MISTY_PINE_FOREST}") center bottom / cover no-repeat`,
    contactsBg: `url("${IMG_MISTY_PINE_FOREST}") center bottom / cover no-repeat`,
    topHeaderBarBg: 'transparent',
    keypadPanelBg: 'transparent',
    keypadPanelRounded: false,
    showQuickContactActionsInSheet: false,
    bottomNavBg: 'rgba(225, 232, 226, 0.92)',
    numberBoxBg: '#a6b0ab',
    numberTextColor: '#000000',
    primaryTextColor: '#000000',
    secondaryTextColor: '#555555',
    accentColor: '#5e8768',
    matchHighlightColor: '#5e8768',
    dividerColor: 'rgba(0, 0, 0, 0.08)',
    cardBg: 'rgba(255, 255, 255, 0.75)',
    searchBarBg: '#ededed',
    searchBarBorder: 'transparent',
    contactAvatarBg: '#a8c69f',
    contactAvatarIconColor: '#ffffff',
    contactsFabBg: '#d8e2dc',
    contactsFabIconColor: '#5e8768',
    myCardStyle: 'outline-honor',
    keyStyle: 'stencil',
    keyDigitColor: '#111111',
    keySublabelColor: '#222222',
    callButtonBg: '#c2cfc6',
    callButtonIconColor: '#ffffff',
    navActiveColor: '#5e8768',
    navInactiveColor: '#555555'
  },

  // ===========================================================================
  // THEME 11: Ice Blue Pastel & White Sheet (Screenshots 21 & 22)
  // ===========================================================================
  {
    id: 'theme-11-ice-blue-pastel',
    index: 11,
    name: 'Ice Blue Pastel',
    subtitle: 'Pastel sky blue & white rounded sheet',
    isDark: false,
    wallpaperUrl: IMG_DAISY_MOON_OIL,
    rootBg: '#cde8fc',
    upperBg: '#cde8fc',
    contactsBg: '#cde8fc',
    topHeaderBarBg: 'transparent',
    keypadPanelBg: '#f4f7f9',
    keypadPanelRounded: true,
    showQuickContactActionsInSheet: true,
    bottomNavBg: '#cde8fc',
    numberBoxBg: 'transparent',
    numberTextColor: '#111111',
    primaryTextColor: '#111111',
    secondaryTextColor: '#4b5563',
    accentColor: '#42b2f4',
    matchHighlightColor: '#29a8f2',
    dividerColor: 'rgba(0, 0, 0, 0.1)',
    cardBg: '#ffffff',
    searchBarBg: 'transparent',
    searchBarBorder: 'transparent',
    contactAvatarBg: '#6eb2e4',
    contactAvatarIconColor: '#ffffff',
    contactsFabBg: '#42b2f4',
    contactsFabIconColor: '#ffffff',
    myCardStyle: 'blue-circle',
    keyStyle: 'bold-sans',
    keyDigitColor: '#111111',
    keySublabelColor: '#6b7280',
    callButtonBg: '#42b2f4',
    callButtonIconColor: '#ffffff',
    navActiveColor: '#42b2f4',
    navInactiveColor: '#111111'
  },

  // ===========================================================================
  // THEME 12: Oil-Painted Blue Moon & White Daisies (Screenshots 23 & 24)
  // ===========================================================================
  {
    id: 'theme-12-daisy-moon-oil',
    index: 12,
    name: 'Daisy Moon Oil Painting',
    subtitle: 'Impasto blue moon & white daisies wreath',
    isDark: false,
    wallpaperUrl: IMG_DAISY_MOON_OIL,
    rootBg: '#e4ebfa',
    upperBg: `url("${IMG_DAISY_MOON_OIL}") center top / cover no-repeat`,
    contactsBg: `url("${IMG_DAISY_MOON_OIL}") center top / cover no-repeat`,
    topHeaderBarBg: 'transparent',
    keypadPanelBg: 'rgba(228, 235, 250, 0.78)',
    keypadPanelRounded: false,
    showQuickContactActionsInSheet: false,
    bottomNavBg: '#dce5f7',
    numberBoxBg: 'transparent',
    numberTextColor: '#000000',
    primaryTextColor: '#000000',
    secondaryTextColor: '#5a6270',
    accentColor: '#6996bf',
    matchHighlightColor: '#5b88b8',
    dividerColor: 'rgba(0, 0, 0, 0.06)',
    cardBg: 'rgba(255, 255, 255, 0.7)',
    searchBarBg: 'rgba(208, 218, 236, 0.75)',
    searchBarBorder: 'transparent',
    contactAvatarBg: '#a8c69f',
    contactAvatarIconColor: '#ffffff',
    contactsFabBg: '#82accf',
    contactsFabIconColor: '#ffffff',
    myCardStyle: 'outline-honor',
    keyStyle: 'thin-sans',
    keyDigitColor: '#22262c',
    keySublabelColor: '#5a6270',
    callButtonBg: '#82accf',
    callButtonIconColor: '#ffffff',
    navActiveColor: '#5b88b8',
    navInactiveColor: '#5a6270'
  }
];
