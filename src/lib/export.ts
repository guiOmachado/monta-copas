import type { Tournament } from './types';
import { FORMAT_LABEL, SPORT_LABEL, tournamentStatus } from './engine';
import { slugify } from './ui';

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function exportTournament(tournament: Tournament) {
  downloadJson(`${slugify(tournament.name)}.json`, {
    app: 'monta-copas',
    version: 1,
    exportedAt: new Date().toISOString(),
    tournaments: [tournament],
  });
}

export function exportAll(tournaments: Tournament[]) {
  const stamp = new Date().toISOString().slice(0, 10);
  downloadJson(`monta-copas-backup-${stamp}.json`, {
    app: 'monta-copas',
    version: 1,
    exportedAt: new Date().toISOString(),
    tournaments,
  });
}

export async function readBackupFile(file: File): Promise<Tournament[]> {
  const text = await file.text();
  const parsed = JSON.parse(text) as unknown;
  const list = Array.isArray(parsed)
    ? parsed
    : (parsed as { tournaments?: unknown })?.tournaments;
  if (!Array.isArray(list)) throw new Error('Arquivo inválido');
  return list as Tournament[];
}

export function buildShareText(tournament: Tournament): string {
  const status = tournamentStatus(tournament);
  const lines: string[] = [
    `🏆 ${tournament.name}`,
    `${SPORT_LABEL[tournament.sport]}${tournament.game ? ` · ${tournament.game}` : ''} · ${FORMAT_LABEL[tournament.format]}`,
    `${tournament.participants.length} participantes · ${status.played}/${status.total} jogos registrados`,
  ];
  if (status.champion) {
    lines.push('', `Campeão: ${status.champion.name}`);
    if (status.runnerUp) lines.push(`Vice: ${status.runnerUp.name}`);
  } else {
    lines.push('', 'Ainda em disputa — vem acompanhar!');
  }
  lines.push('', 'Feito no Monta Copas');
  return lines.join('\n');
}

export async function shareTournament(tournament: Tournament): Promise<'shared' | 'copied' | 'failed'> {
  const text = buildShareText(tournament);
  const nav = navigator as Navigator & {
    share?: (data: { title?: string; text?: string }) => Promise<void>;
  };
  if (nav.share) {
    try {
      await nav.share({ title: tournament.name, text });
      return 'shared';
    } catch (error) {
      if ((error as DOMException)?.name === 'AbortError') return 'failed';
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'failed';
  }
}
