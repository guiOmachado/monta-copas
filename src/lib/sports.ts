import type { Sport, Tournament } from './types';

export interface SportMeta {
  id: Sport;
  label: string;
  title: string;
  description: string;
  chipClass: string;
  accentClass: string;
  fieldLabel: string;
  placeholder: string;
  suggestions: string[];
  /** Sinuca não tem empate: toda partida tem vencedor. */
  allowsDraw: boolean;
}

export const SPORTS: SportMeta[] = [
  {
    id: 'fifa',
    label: 'FIFA',
    title: 'FIFA / videogame',
    description: 'No console, PC ou celular',
    chipClass: 'chip--lime',
    accentClass: 'tcard--fifa',
    fieldLabel: 'Jogo',
    placeholder: 'Ex.: EA SPORTS FC 26',
    suggestions: ['EA SPORTS FC 26', 'EA SPORTS FC 25', 'eFootball', 'PES 2017', 'FIFA 23', 'FIFA 22'],
    allowsDraw: true,
  },
  {
    id: 'real',
    label: 'Vida real',
    title: 'Vida real',
    description: 'Quadra, campo ou society',
    chipClass: 'chip--sky',
    accentClass: 'tcard--real',
    fieldLabel: 'Local',
    placeholder: 'Ex.: quadra do condomínio',
    suggestions: [],
    allowsDraw: true,
  },
  {
    id: 'sinuca',
    label: 'Sinuca',
    title: 'Sinuca',
    description: 'Mesa de bar, clube ou em casa',
    chipClass: 'chip--coral',
    accentClass: 'tcard--sinuca',
    fieldLabel: 'Modalidade',
    placeholder: 'Ex.: sinuca brasileira',
    suggestions: ['Sinuca brasileira', '8-ball', '9-ball', 'Snooker', 'Snooker 6 reds'],
    allowsDraw: false,
  },
];

export const sportMeta = (sport: Sport): SportMeta =>
  SPORTS.find((item) => item.id === sport) ?? SPORTS[0];

/** Como a modalidade aparece no cabeçalho/card: jogo/modalidade ou o nome do esporte. */
export function sportHeadline(tournament: Tournament): string {
  const meta = sportMeta(tournament.sport);
  if (tournament.sport === 'real') return tournament.location || meta.label;
  return tournament.game || meta.label;
}

export const bestOfTarget = (bestOf: number): number => Math.max(1, Math.ceil(bestOf / 2));

export function bestOfLabel(bestOf: number): string {
  return bestOf > 1 ? `Melhor de ${bestOf}` : 'Jogo único';
}
