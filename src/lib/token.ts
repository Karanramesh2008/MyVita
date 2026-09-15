import { TokenPayload, ConsentScope, ConsentPurpose, BPReading } from '../types';

/**
 * Creates a JWT-style token (header.payload.signature)
 * Payload is base64 encoded JSON
 */
export function generateConsentToken(data: {
  consentId: string;
  patientName: string;
  recipient: string;
  scope: ConsentScope;
  purpose: ConsentPurpose;
  readingIds: string[];
  expiresAt: number;
  readingsData?: BPReading[];
  patientId?: string;
}): string {
  const header = {
    alg: 'VH-ES256',
    typ: 'JWT',
    engine: 'Modiqo.ai/Rote-v2'
  };

  const payload: TokenPayload = {
    consentId: data.consentId,
    patientName: data.patientName,
    recipient: data.recipient,
    scope: data.scope,
    purpose: data.purpose,
    readingIds: data.readingIds,
    readingsData: data.readingsData,
    patientId: data.patientId,
    createdAt: Date.now(),
    expiresAt: data.expiresAt,
    ver: '1.2.0',
    routing: 'rote://vault.modiqo.ai/consent-gateway'
  };

  const b64Header = btoa(JSON.stringify(header))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const b64Payload = btoa(JSON.stringify(payload))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  // Generate deterministic-looking pseudo signature for hackathon demo
  const rawSig = `${data.consentId.slice(0, 8)}_${data.expiresAt}_MODIQO_ROTE_VERIFIED`;
  const b64Sig = btoa(rawSig)
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${b64Header}.${b64Payload}.${b64Sig}`;
}

/**
 * Decodes and parses a JWT-style consent token
 */
export function decodeConsentToken(token: string): {
  validFormat: boolean;
  payload: TokenPayload | null;
  rawHeader: any | null;
} {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { validFormat: false, payload: null, rawHeader: null };
    }

    const base64UrlPayload = parts[1];
    let base64 = base64UrlPayload.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }

    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    const payload = JSON.parse(jsonPayload) as TokenPayload;

    let b64Header = parts[0].replace(/-/g, '+').replace(/_/g, '/');
    while (b64Header.length % 4) {
      b64Header += '=';
    }
    const header = JSON.parse(atob(b64Header));

    return {
      validFormat: true,
      payload,
      rawHeader: header,
    };
  } catch {
    return { validFormat: false, payload: null, rawHeader: null };
  }
}
