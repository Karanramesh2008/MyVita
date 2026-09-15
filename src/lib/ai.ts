import { BPReading } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface AIInsightResult {
  insight: string;
  disclaimer: string;
}

export async function getHealthInsight(readings: BPReading[]): Promise<AIInsightResult> {
  if (!readings.length) {
    throw new Error('Add a blood-pressure reading first.');
  }

  const response = await fetch(`${API_URL}/api/ai/health-insight`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      readings: readings.slice(-20).map(({ systolic, diastolic, pulse, source, notes }) => ({
        systolic,
        diastolic,
        pulse,
        source,
        notes,
      })),
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || 'Unable to generate an AI health insight.');
  }

  return data as AIInsightResult;
}
