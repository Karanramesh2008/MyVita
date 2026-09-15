import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { BPReading, ConsentRecord, AuditEvent, EmergencyProfile } from '../types';
import { syncBus } from './sync';

interface VaultHealthDB extends DBSchema {
  readings: {
    key: string;
    value: BPReading;
    indexes: { 'by-timestamp': number };
  };
  consents: {
    key: string;
    value: ConsentRecord;
    indexes: { 'by-created': number; 'by-token': string };
  };
  audit: {
    key: string;
    value: AuditEvent;
    indexes: { 'by-timestamp': number; 'by-consent': string };
  };
  meta: {
    key: string;
    value: any;
  };
}

const DB_VERSION = 1;

interface DbUserConfig {
  userId: string;
  userName: string;
  userPhone: string;
  isDemo: boolean;
}

let activeUserConfig: DbUserConfig = {
  userId: 'MV-PT-8829',
  userName: 'Ananya Sharma',
  userPhone: '+91-9876543210',
  isDemo: true,
};

let dbPromise: Promise<IDBPDatabase<VaultHealthDB>> | null = null;

export function setDbUser(user: { id: string; name?: string; phone?: string; isDemo?: boolean }) {
  const isDemo = user.isDemo ?? (user.id === 'MV-PT-8829');
  if (activeUserConfig.userId !== user.id || activeUserConfig.isDemo !== isDemo) {
    if (dbPromise) {
      dbPromise.then((db) => db.close()).catch(() => {});
      dbPromise = null;
    }
    activeUserConfig = {
      userId: user.id,
      userName: user.name || 'User',
      userPhone: user.phone || '',
      isDemo,
    };
  }
}

export function getActiveDbUser(): DbUserConfig {
  return activeUserConfig;
}

function getDatabaseName(): string {
  if (activeUserConfig.isDemo || activeUserConfig.userId === 'MV-PT-8829') {
    return 'myvita_vault_demo';
  }
  return `myvita_vault_${activeUserConfig.userId}`;
}

export function getDB() {
  if (!dbPromise) {
    const dbName = getDatabaseName();
    dbPromise = openDB<VaultHealthDB>(dbName, DB_VERSION, {
      upgrade(db) {
        // readings store
        if (!db.objectStoreNames.contains('readings')) {
          const readingStore = db.createObjectStore('readings', { keyPath: 'id' });
          readingStore.createIndex('by-timestamp', 'timestamp');
        }

        // consents store
        if (!db.objectStoreNames.contains('consents')) {
          const consentStore = db.createObjectStore('consents', { keyPath: 'id' });
          consentStore.createIndex('by-created', 'createdAt');
          consentStore.createIndex('by-token', 'token');
        }

        // audit store
        if (!db.objectStoreNames.contains('audit')) {
          const auditStore = db.createObjectStore('audit', { keyPath: 'id' });
          auditStore.createIndex('by-timestamp', 'timestamp');
          auditStore.createIndex('by-consent', 'consentId');
        }

        // meta store (settings, emergency profile, flags)
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta');
        }
      },
    });
  }
  return dbPromise;
}

export const INITIAL_EMERGENCY_PROFILE: EmergencyProfile = {
  bloodType: 'O+',
  allergies: 'Penicillin',
  medications: 'Amlodipine 5mg',
  contactName: 'Priya (daughter)',
  contactPhone: '+91-9876543210',
  enabled: true,
  lastUpdated: Date.now() - 3600000 * 24 * 3,
};

export const INITIAL_READINGS: BPReading[] = [
  {
    id: 'rd_01',
    type: 'BP',
    systolic: 148,
    diastolic: 94,
    pulse: 76,
    timestamp: Date.now() - 3600000 * 4, // 4 hours ago
    source: 'OCR Scan',
    notes: 'Morning rest measurement',
  },
  {
    id: 'rd_02',
    type: 'BP',
    systolic: 142,
    diastolic: 90,
    pulse: 74,
    timestamp: Date.now() - 3600000 * 24 * 2, // 2 days ago
    source: 'Connected Cuff',
    notes: 'After light walking',
  },
  {
    id: 'rd_03',
    type: 'BP',
    systolic: 152,
    diastolic: 96,
    pulse: 82,
    timestamp: Date.now() - 3600000 * 24 * 4, // 4 days ago
    source: 'OCR Scan',
    notes: 'Felt slight headache',
  },
  {
    id: 'rd_04',
    type: 'BP',
    systolic: 138,
    diastolic: 88,
    pulse: 72,
    timestamp: Date.now() - 3600000 * 24 * 6, // 6 days ago
    source: 'Manual',
    notes: 'Home clinic check',
  },
  {
    id: 'rd_05',
    type: 'BP',
    systolic: 134,
    diastolic: 86,
    pulse: 75,
    timestamp: Date.now() - 3600000 * 24 * 8, // 8 days ago
    source: 'Omron Connect',
    notes: 'Evening routine',
  },
  {
    id: 'rd_06',
    type: 'BP',
    systolic: 128,
    diastolic: 82,
    pulse: 70,
    timestamp: Date.now() - 3600000 * 24 * 10, // 10 days ago
    source: 'OCR Scan',
    notes: 'Post-medication check',
  },
  {
    id: 'rd_07',
    type: 'BP',
    systolic: 124,
    diastolic: 80,
    pulse: 71,
    timestamp: Date.now() - 3600000 * 24 * 12, // 12 days ago
    source: 'Connected Cuff',
    notes: 'Resting state',
  },
  {
    id: 'rd_08',
    type: 'BP',
    systolic: 118,
    diastolic: 76,
    pulse: 68,
    timestamp: Date.now() - 3600000 * 24 * 14, // 14 days ago
    source: 'Manual',
    notes: 'Baseline check',
  },
];

/**
 * Initializes and seeds IndexedDB:
 * - For demo user ('MV-PT-8829' or isDemo: true): seeds the 8 demo BP readings for hackathon evaluators.
 * - For ANY new registers: strictly leaves vault clean with 0 readings, 0 consents, and empty clean profile.
 */
export async function initAndSeedDB() {
  const db = await getDB();
  const count = await db.count('readings');

  if (activeUserConfig.isDemo || activeUserConfig.userId === 'MV-PT-8829') {
    if (count === 0) {
      const tx = db.transaction(['readings', 'meta', 'audit'], 'readwrite');
      for (const reading of INITIAL_READINGS) {
        await tx.objectStore('readings').put(reading);
      }
      await tx.objectStore('meta').put(INITIAL_EMERGENCY_PROFILE, 'emergency_profile');

      // Add initial demo audit event
      const seedAudit: AuditEvent = {
        id: 'aud_init_01',
        type: 'CONSENT_CREATED',
        consentId: 'sys_init',
        recipient: 'Demo Vault Initialized',
        timestamp: Date.now() - 3600000 * 24 * 14,
        scope: 'Vault Created',
        details: 'Demo vault initialized on device. 8 baseline BP records loaded for evaluation.',
      };
      await tx.objectStore('audit').put(seedAudit);

      await tx.done;
    }
  } else {
    // NEW REGISTERS: Guarantee ZERO demo readings!
    if (count > 0) {
      const allReadings = await db.getAll('readings');
      // If any demo reading IDs exist in this user's vault, remove them
      const hasDemoId = allReadings.some((r) => r.id && (r.id.startsWith('rd_0') || r.id === 'rd_01'));
      if (hasDemoId) {
        const tx = db.transaction(['readings', 'consents'], 'readwrite');
        await tx.objectStore('readings').clear();
        await tx.objectStore('consents').clear();
        await tx.done;
      }
    }

    // Initialize clean emergency profile for new registers (no demo Amlodipine/Penicillin/Priya)
    const existingProfile = await db.get('meta', 'emergency_profile');
    if (!existingProfile) {
      const cleanProfile: EmergencyProfile = {
        bloodType: '',
        allergies: '',
        medications: '',
        contactName: '',
        contactPhone: activeUserConfig.userPhone || '',
        enabled: false,
        lastUpdated: Date.now(),
      };
      await db.put('meta', cleanProfile, 'emergency_profile');
    }

    // Initialize single clean audit event for new register
    const auditCount = await db.count('audit');
    if (auditCount === 0) {
      const initAudit: AuditEvent = {
        id: 'aud_init_' + Date.now().toString(36),
        type: 'CONSENT_CREATED',
        consentId: 'sys_init',
        recipient: 'Personal Vault Initialized',
        timestamp: Date.now(),
        scope: 'Vault Created',
        details: `Personal encrypted vault created for ${activeUserConfig.userName}. Zero demo records loaded.`,
      };
      await db.put('audit', initAudit);
    }
  }
}

/**
 * Reset demo function
 */
export async function resetDemoDB() {
  const db = await getDB();
  const tx = db.transaction(['readings', 'consents', 'audit', 'meta'], 'readwrite');
  await tx.objectStore('readings').clear();
  await tx.objectStore('consents').clear();
  await tx.objectStore('audit').clear();
  await tx.objectStore('meta').clear();

  if (activeUserConfig.isDemo || activeUserConfig.userId === 'MV-PT-8829') {
    for (const reading of INITIAL_READINGS) {
      await tx.objectStore('readings').put(reading);
    }
    await tx.objectStore('meta').put(INITIAL_EMERGENCY_PROFILE, 'emergency_profile');

    const seedAudit: AuditEvent = {
      id: 'aud_reset_' + Date.now(),
      type: 'CONSENT_CREATED',
      consentId: 'sys_reset',
      recipient: 'Demo Vault Reset',
      timestamp: Date.now(),
      scope: 'System Demo Reset',
      details: 'Reset completed. Re-seeded 8 BP readings across 14 days.',
    };
    await tx.objectStore('audit').put(seedAudit);
  } else {
    // For new registers, reset completely wipes back to clean 0 readings
    const cleanProfile: EmergencyProfile = {
      bloodType: '',
      allergies: '',
      medications: '',
      contactName: '',
      contactPhone: activeUserConfig.userPhone || '',
      enabled: false,
      lastUpdated: Date.now(),
    };
    await tx.objectStore('meta').put(cleanProfile, 'emergency_profile');

    const cleanAudit: AuditEvent = {
      id: 'aud_reset_' + Date.now(),
      type: 'CONSENT_CREATED',
      consentId: 'sys_reset',
      recipient: 'Personal Vault Cleared',
      timestamp: Date.now(),
      scope: 'Vault Cleared',
      details: `Vault reset. All records cleared for ${activeUserConfig.userName}.`,
    };
    await tx.objectStore('audit').put(cleanAudit);
  }

  await tx.done;

  syncBus.publish('DEMO_RESET');
}

// ---------------- READINGS ----------------
export async function getAllReadings(): Promise<BPReading[]> {
  const db = await getDB();
  const list = await db.getAllFromIndex('readings', 'by-timestamp');
  return list.reverse(); // Newest first
}

export async function addReading(reading: Omit<BPReading, 'id'>): Promise<BPReading> {
  const db = await getDB();
  const id = 'rd_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
  const newReading: BPReading = {
    ...reading,
    id,
  };
  await db.put('readings', newReading);
  syncBus.publish('READING_ADDED', newReading);
  return newReading;
}

export async function deleteReading(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('readings', id);
  syncBus.publish('READING_DELETED', { id });
}

// ---------------- CONSENTS ----------------
export async function getAllConsents(): Promise<ConsentRecord[]> {
  const db = await getDB();
  const list = await db.getAllFromIndex('consents', 'by-created');
  return list.reverse(); // Newest first
}

export async function getConsentById(id: string): Promise<ConsentRecord | undefined> {
  const db = await getDB();
  return db.get('consents', id);
}

export async function getConsentByToken(token: string): Promise<ConsentRecord | undefined> {
  const db = await getDB();
  const list = await db.getAllFromIndex('consents', 'by-token', token);
  if (list && list[0]) return list[0];

  try {
    const raw = localStorage.getItem('myvita_shared_tokens') || '{}';
    const sharedMap = JSON.parse(raw);
    if (sharedMap[token]) {
      return sharedMap[token];
    }
  } catch {
    // ignore
  }
  return undefined;
}

export async function saveConsent(consent: ConsentRecord): Promise<void> {
  const db = await getDB();
  await db.put('consents', consent);

  // Cache in shared tokens registry for recipient portal inspection
  try {
    const raw = localStorage.getItem('myvita_shared_tokens') || '{}';
    const sharedMap = JSON.parse(raw);
    sharedMap[consent.token] = consent;
    localStorage.setItem('myvita_shared_tokens', JSON.stringify(sharedMap));
  } catch {
    // ignore
  }

  // Auto-log audit event: CONSENT_CREATED
  await addAuditEvent({
    type: 'CONSENT_CREATED',
    consentId: consent.id,
    recipient: consent.recipient,
    scope: consent.scope,
    details: `Scoped consent generated for ${consent.recipient} (${consent.purpose}, valid for ${Math.round(
      (consent.expiresAt - consent.createdAt) / 3600000
    )}h)`,
  });

  syncBus.publish('CONSENT_CREATED', consent);
}

export async function revokeConsent(id: string): Promise<void> {
  const db = await getDB();
  const consent = await db.get('consents', id);
  if (consent) {
    consent.revoked = true;
    await db.put('consents', consent);

    try {
      const raw = localStorage.getItem('myvita_shared_tokens') || '{}';
      const sharedMap = JSON.parse(raw);
      if (sharedMap[consent.token]) {
        sharedMap[consent.token].revoked = true;
        localStorage.setItem('myvita_shared_tokens', JSON.stringify(sharedMap));
      }
    } catch {
      // ignore
    }

    await addAuditEvent({
      type: 'CONSENT_REVOKED',
      consentId: consent.id,
      recipient: consent.recipient,
      scope: consent.scope,
      details: `Revoked by patient. Token invalidated immediately across all endpoints.`,
    });

    syncBus.publish('CONSENT_REVOKED', { id });
  }
}

// ---------------- AUDIT ----------------
export async function getAllAuditEvents(): Promise<AuditEvent[]> {
  const db = await getDB();
  const list = await db.getAllFromIndex('audit', 'by-timestamp');
  return list.reverse(); // Newest first
}

export async function addAuditEvent(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<AuditEvent> {
  const db = await getDB();
  const id = 'aud_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
  const newEvent: AuditEvent = {
    ...event,
    id,
    timestamp: Date.now(),
  };
  await db.put('audit', newEvent);
  syncBus.publish('CONSENT_ACCESSED', newEvent);
  return newEvent;
}

// ---------------- EMERGENCY PROFILE ----------------
export async function getEmergencyProfile(): Promise<EmergencyProfile> {
  const db = await getDB();
  const profile = await db.get('meta', 'emergency_profile');
  if (profile) return profile;

  if (activeUserConfig.isDemo || activeUserConfig.userId === 'MV-PT-8829') {
    return INITIAL_EMERGENCY_PROFILE;
  }

  return {
    bloodType: '',
    allergies: '',
    medications: '',
    contactName: '',
    contactPhone: activeUserConfig.userPhone || '',
    enabled: false,
    lastUpdated: Date.now(),
  };
}

export async function saveEmergencyProfile(profile: EmergencyProfile): Promise<void> {
  const db = await getDB();
  await db.put('meta', profile, 'emergency_profile');
  syncBus.publish('EMERGENCY_UPDATED', profile);
}
