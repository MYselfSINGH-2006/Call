import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, Auth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

export const SCOPES = [
  'https://www.googleapis.com/auth/contacts',
  'https://www.googleapis.com/auth/userinfo.email',
];

export interface GoogleAccountProfile {
  email: string;
  displayName: string;
  photoURL?: string;
  isDefaultPhoneAccount?: boolean;
}

export interface GooglePersonContact {
  resourceName?: string;
  etag?: string;
  name: string;
  phone: string;
  email?: string;
  organisation?: string;
  avatar?: string;
}

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;

function getClientAuth(): Auth | null {
  if (typeof window === 'undefined') return null;
  if (!firebaseApp) {
    firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  }
  if (!firebaseAuth) {
    firebaseAuth = getAuth(firebaseApp);
  }
  return firebaseAuth;
}

function createGoogleProvider(forceSelectAccount = true): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  for (const scope of SCOPES) {
    provider.addScope(scope);
  }
  if (forceSelectAccount) {
    provider.setCustomParameters({ prompt: 'select_account' });
  }
  return provider;
}

// Flag to indicate if we are in the middle of a sign-in flow.
let isSigningIn = false;
// Cache the access token in memory ONLY (never in localStorage or sessionStorage).
let cachedAccessToken: string | null = null;

// Initialize auth state listener. Call this on app load.
export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  const auth = getClientAuth();
  if (!auth) return () => undefined;

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        // User profile is known from Firebase session, though accessToken requires interactive sign-in for API mutations
        if (onAuthSuccess) onAuthSuccess(user, null);
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Must be called from a button click or user interaction
export const googleSignIn = async (
  forceSelectAccount = true
): Promise<{ user: User; accessToken: string } | null> => {
  const auth = getClientAuth();
  if (!auth) return null;

  try {
    isSigningIn = true;
    const provider = createGoogleProvider(forceSelectAccount);
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Firebase Auth');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: unknown) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  const auth = getClientAuth();
  if (auth) {
    await auth.signOut();
  }
  cachedAccessToken = null;
};

// Create a contact in Google Contacts using People API v1
export async function createGoogleContactInCloud(
  accessToken: string,
  contact: {
    name: string;
    phone: string;
    email?: string;
    organisation?: string;
  }
): Promise<{ resourceName?: string }> {
  const parts = contact.name.trim().split(/\s+/);
  const givenName = parts[0] || contact.name.trim();
  const familyName = parts.slice(1).join(' ');

  const body: Record<string, unknown> = {
    names: [
      {
        givenName,
        ...(familyName ? { familyName } : {})
      }
    ],
    phoneNumbers: [
      {
        value: contact.phone.trim(),
        type: 'mobile'
      }
    ]
  };

  if (contact.email?.trim()) {
    body['emailAddresses'] = [{ value: contact.email.trim(), type: 'home' }];
  }
  if (contact.organisation?.trim()) {
    body['organizations'] = [{ name: contact.organisation.trim() }];
  }

  const res = await fetch(
    'https://people.googleapis.com/v1/people:createContact?personFields=names,emailAddresses,phoneNumbers,organizations',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Contacts API error (${res.status}): ${errText}`);
  }

  return res.json();
}

// Fetch user's contacts from Google Contacts using People API v1
export async function fetchGoogleContactsFromCloud(accessToken: string): Promise<GooglePersonContact[]> {
  const res = await fetch(
    'https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses,phoneNumbers,photos,organizations&pageSize=100&sortOrder=FIRST_NAME_ASCENDING',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Contacts API error (${res.status}): ${errText}`);
  }

  const data = (await res.json()) as {
    connections?: {
      resourceName?: string;
      etag?: string;
      names?: { displayName?: string }[];
      phoneNumbers?: { value?: string }[];
      emailAddresses?: { value?: string }[];
      organizations?: { name?: string }[];
      photos?: { url?: string }[];
    }[];
  };

  const results: GooglePersonContact[] = [];
  for (const person of data.connections || []) {
    const phone = person.phoneNumbers?.[0]?.value?.trim() || '';
    const name = person.names?.[0]?.displayName?.trim() || phone;
    if (!phone && !name) continue;
    results.push({
      resourceName: person.resourceName,
      etag: person.etag,
      name: name || 'Unnamed Contact',
      phone: phone || '',
      email: person.emailAddresses?.[0]?.value,
      organisation: person.organizations?.[0]?.name,
      avatar: person.photos?.[0]?.url
    });
  }
  return results;
}
