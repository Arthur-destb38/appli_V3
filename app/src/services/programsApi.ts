import { buildApiUrl, getAuthHeaders } from '@/utils/api';
import { Program } from '@/types/program';

const PROGRAMS_BASE = buildApiUrl('/programs');

export type GenerateProgramPayload = {
  title?: string;
  objective?: string;
  duration_weeks?: number;
  frequency?: number;
  user_id?: string | null;
  exercises_per_session?: number;
};

export const generateProgram = async (payload: GenerateProgramPayload): Promise<Program> => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${PROGRAMS_BASE}/generate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      title: payload.title || 'Programme personnalisé',
      objective: payload.objective,
      duration_weeks: payload.duration_weeks ?? 4,
      frequency: payload.frequency ?? 3,
      user_id: payload.user_id,
      exercises_per_session: payload.exercises_per_session ?? 4,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Impossible de générer le programme");
  }

  return (await response.json()) as Program;
};
