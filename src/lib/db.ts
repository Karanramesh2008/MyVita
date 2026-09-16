import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { BPReading, ConsentRecord, AuditEvent, EmergencyProfile } from '../types';
import { syncBus } from './sync';

interface VaultHealthDB extends DBSchema {
  readings: { key: string; value: BPReading; indexes: { 'by-timestamp': number } };
  consents: { key: string; value: ConsentRecord; indexes: { 'by-created': number; 'by-token': string } };
  audit: { key: string; value: AuditEvent; indexes: { 'by-timestamp': number; 'by-consent': string } };
  meta: { key: string; value: any };
}

const DB_VERSION = 1;
const DEMO_DATA_VERSION = 2;

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

export function getActiveDbUser(): DbUserConfig { return activeUserConfig; }

function getDatabaseName(): string {
  return activeUserConfig.isDemo || activeUserConfig.userId === 'MV-PT-8829'
    ? 'myvita_vault_demo'
    : `myvita_vault_${activeUserConfig.userId}`;
}

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<VaultHealthDB>(getDatabaseName(), DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('readings')) {
          const store = db.createObjectStore('readings', { keyPath: 'id' });
          store.createIndex('by-timestamp', 'timestamp');
        }
        if (!db.objectStoreNames.contains('consents')) {
          const store = db.createObjectStore('consents', { keyPath: 'id' });
          store.createIndex('by-created', 'createdAt');
          store.createIndex('by-token', 'token');
        }
        if (!db.objectStoreNames.contains('audit')) {
          const store = db.createObjectStore('audit', { keyPath: 'id' });
          store.createIndex('by-timestamp', 'timestamp');
          store.createIndex('by-consent', 'consentId');
        }
        if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
      },
    });
  }
  return dbPromise;
}

export const INITIAL_EMERGENCY_PROFILE: EmergencyProfile = {
  bloodType: 'O+',
  allergies: 'Penicillin',
  medications: 'Amlodipine 5mg',
  contactName: 'Priya Sharma (daughter)',
  contactPhone: '+91-9876543210',
  enabled: true,
  lastUpdated: Date.now() - 3 * 86400000,
};

const hoursAgo = (hours: number) => Date.now() - hours * 3600000;
const daysAgo = (days: number) => Date.now() - days * 86400000;

export const INITIAL_READINGS: BPReading[] = [
  { id: 'rd_01', type: 'BP', systolic: 148, diastolic: 94, pulse: 76, timestamp: hoursAgo(4), source: 'OCR Scan', notes: 'Morning rest measurement' },
  { id: 'rd_02', type: 'BP', systolic: 142, diastolic: 90, pulse: 74, timestamp: daysAgo(2), source: 'Connected Cuff', notes: 'After light walking' },
  { id: 'rd_03', type: 'BP', systolic: 152, diastolic: 96, pulse: 82, timestamp: daysAgo(4), source: 'OCR Scan', notes: 'Slight headache reported' },
  { id: 'rd_04', type: 'BP', systolic: 138, diastolic: 88, pulse: 72, timestamp: daysAgo(6), source: 'Manual', notes: 'Home clinic check' },
  { id: 'rd_05', type: 'BP', systolic: 134, diastolic: 86, pulse: 75, timestamp: daysAgo(8), source: 'Omron Connect', notes: 'Evening routine' },
  { id: 'rd_06', type: 'BP', systolic: 128, diastolic: 82, pulse: 70, timestamp: daysAgo(10), source: 'OCR Scan', notes: 'Post-medication check' },
  { id: 'rd_07', type: 'BP', systolic: 124, diastolic: 80, pulse: 71, timestamp: daysAgo(12), source: 'Connected Cuff', notes: 'Resting state' },
  { id: 'rd_08', type: 'BP', systolic: 118, diastolic: 76, pulse: 68, timestamp: daysAgo(14), source: 'Manual', notes: 'Baseline check' },
  { id: 'rd_09', type: 'BP', systolic: 132, diastolic: 84, pulse: 69, timestamp: daysAgo(16), source: 'Omron Connect', notes: 'Evening measurement' },
  { id: 'rd_10', type: 'BP', systolic: 126, diastolic: 81, pulse: 70, timestamp: daysAgo(18), source: 'Connected Cuff', notes: 'Before breakfast' },
  { id: 'rd_11', type: 'BP', systolic: 130, diastolic: 83, pulse: 72, timestamp: daysAgo(21), source: 'Manual', notes: 'Routine monitoring' },
  { id: 'rd_12', type: 'BP', systolic: 136, diastolic: 87, pulse: 73, timestamp: daysAgo(24), source: 'OCR Scan', notes: 'Clinic report scan' },
];

export const INITIAL_CONSENTS: ConsentRecord[] = [
  {
    id: 'consent_demo_01', readingIds: ['rd_01', 'rd_02', 'rd_04'], recipient: 'Dr. Sharma',
    scope: 'Last 30 days', purpose: 'Consultation', expiresAt: Date.now() + 5 * 86400000,
    revoked: false, token: 'demo-dr-sharma-2026', createdAt: daysAgo(1), patientName: 'Ananya Sharma',
    allowedFields: ['Blood pressure', 'Pulse', 'Measurement date'],
  },
  {
    id: 'consent_demo_02', readingIds: ['rd_01', 'rd_02'], recipient: 'Insurance',
    scope: 'Summary only', purpose: 'Insurance', expiresAt: Date.now() - 2 * 86400000,
    revoked: false, token: 'demo-insurance-2026', createdAt: daysAgo(8), patientName: 'Ananya Sharma',
    allowedFields: ['BP summary'],
  },
  {
    id: 'consent_demo_03', readingIds: ['rd_03'], recipient: 'Paramedics',
    scope: 'This reading', purpose: 'Emergency', expiresAt: Date.now() - 3600000,
    revoked: true, token: 'demo-paramedic-2026', createdAt: daysAgo(5), patientName: 'Ananya Sharma',
    allowedFields: ['Blood pressure', 'Pulse'],
  },
];

export const INITIAL_AUDIT_EVENTS: AuditEvent[] = [
  { id: 'aud_demo_01', type: 'CONSENT_CREATED', consentId: 'consent_demo_01', recipient: 'Dr. Sharma', timestamp: daysAgo(1), scope: 'Last 30 days', details: 'Consultation consent created for Dr. Sharma.' },
  { id: 'aud_demo_02', type: 'CONSENT_ACCESSED', consentId: 'consent_demo_01', recipient: 'Dr. Sharma', timestamp: hoursAgo(20), scope: 'Last 30 days', details: 'Doctor opened the shared health summary.' },
  { id: 'aud_demo_03', type: 'CONSENT_CREATED', consentId: 'consent_demo_02', recipient: 'Insurance', timestamp: daysAgo(8), scope: 'Summary only', details: 'Insurance summary consent created.' },
  { id: 'aud_demo_04', type: 'CONSENT_ACCESSED', consentId: 'consent_demo_02', recipient: 'Insurance', timestamp: daysAgo(7), scope: 'Summary only', details: 'Insurance recipient accessed the summary.' },
  { id: 'aud_demo_05', type: 'CONSENT_CREATED', consentId: 'consent_demo_03', recipient: 'Paramedics', timestamp: daysAgo(5), scope: 'This reading', details: 'Emergency access token generated.' },
  { id: 'aud_demo_06', type: 'EMERGENCY_ACCESSED', consentId: 'consent_demo_03', recipient: 'Paramedics', timestamp: daysAgo(5), scope: 'Emergency profile', details: 'Emergency profile accessed through emergency workflow.' },
  { id: 'aud_demo_07', type: 'CONSENT_REVOKED', consentId: 'consent_demo_03', recipient: 'Paramedics', timestamp: daysAgo(4), scope: 'This reading', details: 'Emergency access consent revoked by patient.' },
  { id: 'aud_demo_08', type: 'CONSENT_ACCESSED', consentId: 'sys_init', recipient: 'Demo Vault', timestamp: daysAgo(14), scope: 'Vault Created', details: 'Demo vault initialized with evaluation data.' },
];

async function seedDemoData(db: IDBPDatabase<VaultHealthDB>) {
  const tx = db.transaction(['readings', 'consents', 'audit', 'meta'], 'readwrite');
  for (const reading of INITIAL_READINGS) await tx.objectStore('readings').put(reading);
  await tx.objectStore('meta').put(INITIAL_EMERGENCY_PROFILE, 'emergency_profile');
  for (const consent of INITIAL_CONSENTS) await tx.objectStore('consents').put(consent);
  for (const event of INITIAL_AUDIT_EVENTS) await tx.objectStore('audit').put(event);
  await tx.objectStore('meta').put(DEMO_DATA_VERSION, 'demo_data_version');
  await tx.done;
}

export async function initAndSeedDB() {
  const db = await getDB();
  const isDemo = activeUserConfig.isDemo || activeUserConfig.userId === 'MV-PT-8829';

  if (isDemo) {
    const version = await db.get('meta', 'demo_data_version');
    if (version !== DEMO_DATA_VERSION) {
      await seedDemoData(db);
    }
    return;
  }

  const count = await db.count('readings');
  if (count > 0) {
    const allReadings = await db.getAll('readings');
    if (allReadings.some((r) => r.id?.startsWith('rd_0'))) {
      const tx = db.transaction(['readings', 'consents'], 'readwrite');
      await tx.objectStore('readings').clear();
      await tx.objectStore('consents').clear();
      await tx.done;
    }
  }

  const existingProfile = await db.get('meta', 'emergency_profile');
  if (!existingProfile) {
    await db.put('meta', {
      bloodType: '', allergies: '', medications: '', contactName: '',
      contactPhone: activeUserConfig.userPhone || '', enabled: false, lastUpdated: Date.now(),
    }, 'emergency_profile');
  }

  if ((await db.count('audit')) === 0) {
    await db.put('audit', {
      id: 'aud_init_' + Date.now().toString(36), type: 'CONSENT_CREATED', consentId: 'sys_init',
      recipient: 'Personal Vault Initialized', timestamp: Date.now(), scope: 'Vault Created',
      details: `Personal vault created for ${activeUserConfig.userName}.`,
    });
  }
}

export async function resetDemoDB() {
  const db = await getDB();
  const tx = db.transaction(['readings', 'consents', 'audit', 'meta'], 'readwrite');
  await tx.objectStore('readings').clear();
  await tx.objectStore('consents').clear();
  await tx.objectStore('audit').clear();
  await tx.objectStore('meta').clear();
  if (activeUserConfig.isDemo || activeUserConfig.userId === 'MV-PT-8829') {
    for (const reading of INITIAL_READINGS) await tx.objectStore('readings').put(reading);
    await tx.objectStore('meta').put(INITIAL_EMERGENCY_PROFILE, 'emergency_profile');
    for (const consent of INITIAL_CONSENTS) await tx.objectStore('consents').put(consent);
    for (const event of INITIAL_AUDIT_EVENTS) await tx.objectStore('audit').put(event);
    await tx.objectStore('meta').put(DEMO_DATA_VERSION, 'demo_data_version');
  } else {
    await tx.objectStore('meta').put({ bloodType: '', allergies: '', medications: '', contactName: '', contactPhone: activeUserConfig.userPhone || '', enabled: false, lastUpdated: Date.now() }, 'emergency_profile');
  }
  await tx.done;
  syncBus.publish('DEMO_RESET');
}

export async function getAllReadings(): Promise<BPReading[]> {
  const db = await getDB();
  return (await db.getAllFromIndex('readings', 'by-timestamp')).reverse();
}

export async function addReading(reading: Omit<BPReading, 'id'>): Promise<BPReading> {
  const db = await getDB();
  const newReading = { ...reading, id: 'rd_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6) };
  await db.put('readings', newReading);
  syncBus.publish('READING_ADDED', newReading);
  return newReading;
}

export async function deleteReading(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('readings', id);
  syncBus.publish('READING_DELETED', { id });
}

export async function getAllConsents(): Promise<ConsentRecord[]> {
  const db = await getDB();
  return (await db.getAllFromIndex('consents', 'by-created')).reverse();
}

export async function getConsentById(id: string): Promise<ConsentRecord | undefined> { return getDB().then((db) => db.get('consents', id)); }

export async function getConsentByToken(token: string): Promise<ConsentRecord | undefined> {
  const db = await getDB();
  const list = await db.getAllFromIndex('consents', 'by-token', token);
  if (list[0]) return list[0];
  try {
    const sharedMap = JSON.parse(localStorage.getItem('myvita_shared_tokens') || '{}');
    return sharedMap[token];
  } catch { return undefined; }
}

export async function saveConsent(consent: ConsentRecord): Promise<void> {
  const db = await getDB();
  await db.put('consents', consent);
  try {
    const sharedMap = JSON.parse(localStorage.getItem('myvita_shared_tokens') || '{}');
    sharedMap[consent.token] = consent;
    localStorage.setItem('myvita_shared_tokens', JSON.stringify(sharedMap));
  } catch {}
  await addAuditEvent({
    type: 'CONSENT_CREATED', consentId: consent.id, recipient: consent.recipient, scope: consent.scope,
    details: `Scoped consent generated for ${consent.recipient} (${consent.purpose}).`,
  });
  syncBus.publish('CONSENT_CREATED', consent);
}

export async function revokeConsent(id: string): Promise<void> {
  const db = await getDB();
  const consent = await db.get('consents', id);
  if (!consent) return;
  consent.revoked = true;
  await db.put('consents', consent);
  try {
    const sharedMap = JSON.parse(localStorage.getItem('myvita_shared_tokens') || '{}');
    if (sharedMap[consent.token]) sharedMap[consent.token].revoked = true;
    localStorage.setItem('myvita_shared_tokens', JSON.stringify(sharedMap));
  } catch {}
  await addAuditEvent({ type: 'CONSENT_REVOKED', consentId: consent.id, recipient: consent.recipient, scope: consent.scope, details: 'Consent revoked by patient.' });
  syncBus.publish('CONSENT_REVOKED', { id });
}

export async function getAllAuditEvents(): Promise<AuditEvent[]> {
  const db = await getDB();
  return (await db.getAllFromIndex('audit', 'by-timestamp')).reverse();
}

export async function addAuditEvent(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<AuditEvent> {
  const db = await getDB();
  const newEvent: AuditEvent = { ...event, id: 'aud_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6), timestamp: Date.now() };
  await db.put('audit', newEvent);
  syncBus.publish('CONSENT_ACCESSED', newEvent);
  return newEvent;
}

export async function getEmergencyProfile(): Promise<EmergencyProfile> {
  const db = await getDB();
  const profile = await db.get('meta', 'emergency_profile');
  if (profile) return profile;
  return activeUserConfig.isDemo || activeUserConfig.userId === 'MV-PT-8829'
    ? INITIAL_EMERGENCY_PROFILE
    : { bloodType: '', allergies: '', medications: '', contactName: '', contactPhone: activeUserConfig.userPhone || '', enabled: false, lastUpdated: Date.now() };
}

export async function saveEmergencyProfile(profile: EmergencyProfile): Promise<void> {
  const db = await getDB();
  await db.put('meta', profile, 'emergency_profile');
  syncBus.publish('EMERGENCY_UPDATED', profile);
}
