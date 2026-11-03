import { useSyncExternalStore } from 'react';
import type { Match, Tournament } from './types';
import { DEFAULT_OPTIONS } from './types';
import { generateGroupKnockout } from './engine';

const STORAGE_KEY = 'monta-copas:v1';

function normalize(raw: unknown): Tournament | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as Partial<Tournament>;
  if (!candidate.id || !Array.isArray(candidate.participants) || !Array.isArray(candidate.matches)) {
    return null;
  }
  return {
    ...(candidate as Tournament),
    groups: candidate.groups ?? [],
    bracketSlots: candidate.bracketSlots ?? [],
    penaltyWinners: candidate.penaltyWinners ?? {},
    options: { ...DEFAULT_OPTIONS, ...(candidate.options ?? {}) },
  };
}

function load(): Tournament[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    const list = Array.isArray(parsed)
      ? parsed
      : (parsed as { tournaments?: unknown[] })?.tournaments ?? [];
    return (Array.isArray(list) ? list : [])
      .map(normalize)
      .filter((t): t is Tournament => t !== null);
  } catch {
    return [];
  }
}

let state: Tournament[] = load();
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function commit(next: Tournament[]) {
  state = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* armazenamento cheio ou indisponível */
  }
  emit();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const getTournaments = (): Tournament[] => state;

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) {
      state = load();
      emit();
    }
  });
}

export function useTournaments(): Tournament[] {
  return useSyncExternalStore(subscribe, getTournaments, getTournaments);
}

export function useTournament(id: string | undefined): Tournament | undefined {
  const tournaments = useTournaments();
  return tournaments.find((t) => t.id === id);
}

/* ------------------------------------------------------------------ */
/* ações                                                               */
/* ------------------------------------------------------------------ */

function touch(tournament: Tournament): Tournament {
  return { ...tournament, updatedAt: Date.now() };
}

export const actions = {
  add(tournament: Tournament) {
    commit([tournament, ...state]);
    return tournament.id;
  },

  update(id: string, updater: (tournament: Tournament) => Tournament) {
    commit(state.map((t) => (t.id === id ? touch(updater(t)) : t)));
  },

  remove(id: string) {
    commit(state.filter((t) => t.id !== id));
  },

  duplicate(id: string) {
    const source = state.find((t) => t.id === id);
    if (!source) return;
    const copy: Tournament = {
      ...source,
      id: `t_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      name: `${source.name} (cópia)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    commit([copy, ...state]);
  },

  setScore(
    id: string,
    matchId: string,
    score: { homeGoals: number | null; awayGoals: number | null },
  ) {
    actions.update(id, (t) => ({
      ...t,
      matches: t.matches.map((m) =>
        m.id === matchId ? { ...m, ...score, playedAt: score.homeGoals === null ? null : Date.now() } : m,
      ),
    }));
  },

  setPenaltyWinner(id: string, tieId: string, participantId: string) {
    actions.update(id, (t) => ({
      ...t,
      penaltyWinners: { ...t.penaltyWinners, [tieId]: participantId },
    }));
  },

  clearPenaltyWinner(id: string, tieId: string) {
    actions.update(id, (t) => {
      const next = { ...t.penaltyWinners };
      delete next[tieId];
      return { ...t, penaltyWinners: next };
    });
  },

  clearResults(id: string) {
    actions.update(id, (t) => ({
      ...t,
      penaltyWinners: {},
      matches: t.matches.map(
        (m): Match => ({ ...m, homeGoals: null, awayGoals: null, playedAt: null }),
      ),
    }));
  },

  generateKnockout(id: string) {
    actions.update(id, (t) => generateGroupKnockout(t));
  },

  importTournaments(list: Tournament[]) {
    const normalized = list.map(normalize).filter((t): t is Tournament => t !== null);
    if (!normalized.length) return 0;
    const existing = new Set(state.map((t) => t.id));
    const fresh = normalized.filter((t) => !existing.has(t.id));
    if (!fresh.length) return 0;
    commit([...fresh, ...state]);
    return fresh.length;
  },

  replaceAll(list: Tournament[]) {
    commit(list.map(normalize).filter((t): t is Tournament => t !== null));
  },
};
