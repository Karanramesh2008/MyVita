// Real-time synchronization layer using BroadcastChannel & storage events
// Modiqo.ai (Rote) secure data routing engine

export interface SyncMessage {
  type: 'READING_ADDED' | 'READING_DELETED' | 'CONSENT_CREATED' | 'CONSENT_REVOKED' | 'CONSENT_ACCESSED' | 'EMERGENCY_UPDATED' | 'DEMO_RESET';
  senderId: string;
  timestamp: number;
  payload?: any;
}

type SyncCallback = (msg: SyncMessage) => void;

class SyncManager {
  private channel: BroadcastChannel | null = null;
  private listeners: Set<SyncCallback> = new Set();
  private clientId: string;

  constructor() {
    this.clientId = 'client_' + Math.random().toString(36).substring(2, 9);
    
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel('vaulthealth_sync_modiqo_rote');
        this.channel.onmessage = (event) => {
          if (event.data && event.data.senderId !== this.clientId) {
            this.notify(event.data);
          }
        };
      } catch (e) {
        console.warn('BroadcastChannel not available, falling back to storage events', e);
      }
    }

    // Storage event fallback for cross-tab sync
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === 'vh_sync_trigger' && e.newValue) {
          try {
            const data: SyncMessage = JSON.parse(e.newValue);
            if (data.senderId !== this.clientId) {
              this.notify(data);
            }
          } catch (err) {
            // ignore
          }
        }
      });
    }
  }

  public publish(type: SyncMessage['type'], payload?: any) {
    const message: SyncMessage = {
      type,
      senderId: this.clientId,
      timestamp: Date.now(),
      payload
    };

    // 1. Broadcast channel
    if (this.channel) {
      try {
        this.channel.postMessage(message);
      } catch (e) {
        // ignore
      }
    }

    // 2. Storage fallback for cross-tab
    try {
      localStorage.setItem('vh_sync_trigger', JSON.stringify(message));
    } catch (e) {
      // ignore
    }

    // Also notify local listeners in the current tab
    this.notify(message);
  }

  public subscribe(callback: SyncCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notify(msg: SyncMessage) {
    this.listeners.forEach((cb) => {
      try {
        cb(msg);
      } catch (e) {
        console.error('Error in sync listener:', e);
      }
    });
  }

  public getClientId() {
    return this.clientId;
  }
}

export const syncBus = new SyncManager();
