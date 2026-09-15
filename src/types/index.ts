export type BPSource = 'OCR Scan' | 'Manual' | 'Omron Connect' | 'Connected Cuff';

export interface BPReading {
  id: string;
  type: 'BP';
  systolic: number;
  diastolic: number;
  pulse: number;
  timestamp: number;
  source: BPSource;
  notes?: string;
}

export type ConsentRecipient = 'Dr. Sharma' | 'Mom' | 'Insurance' | 'Paramedics' | string;
export type ConsentScope = 'This reading' | 'Last 30 days' | 'All BP' | 'Summary only';
export type ConsentPurpose = 'Consultation' | 'Monitoring' | 'Insurance' | 'Emergency';
export type ConsentDuration = '1 hour' | '24 hours' | '7 days' | '30 days';

export interface ConsentRecord {
  id: string;
  readingIds: string[];
  recipient: ConsentRecipient;
  scope: ConsentScope;
  purpose: ConsentPurpose;
  expiresAt: number;
  revoked: boolean;
  token: string;
  createdAt: number;
  patientName?: string;
  allowedFields?: string[];
}

export type AuditEventType = 'CONSENT_CREATED' | 'CONSENT_ACCESSED' | 'CONSENT_REVOKED' | 'EMERGENCY_ACCESSED';

export interface AuditEvent {
  id: string;
  type: AuditEventType;
  consentId: string;
  recipient: string;
  timestamp: number;
  scope?: string;
  details?: string;
  deviceInfo?: string;
}

export interface EmergencyProfile {
  bloodType: string;
  allergies: string;
  medications: string;
  contactName: string;
  contactPhone: string;
  enabled: boolean;
  lastUpdated: number;
}

export type UserRole = 'patient' | 'doctor';

export interface UserSession {
  role: UserRole;
  name: string;
  title: string;
  id: string;
  avatarColor: string;
  email: string;
  phone?: string;
  specialty?: string;
  licenseNumber?: string;
  isDemo?: boolean;
}

export interface AuthAccount extends UserSession {
  passwordHash?: string;
  createdAt: number;
}

export interface TokenPayload {
  consentId: string;
  patientName: string;
  recipient: string;
  scope: ConsentScope;
  purpose: ConsentPurpose;
  readingIds: string[];
  readingsData?: BPReading[];
  patientId?: string;
  createdAt: number;
  expiresAt: number;
  ver: string;
  routing: string;
}
