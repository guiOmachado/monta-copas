export type Sport = 'fifa' | 'real' | 'sinuca';

/** Liga / pontos corridos, mata-mata puro, ou grupos + mata-mata. */
export type TournamentFormat = 'league' | 'knockout' | 'groups';

export interface Participant {
  id: string;
  name: string;
}

export interface Group {
  id: string;
  name: string;
  participantIds: string[];
}

export interface Match {
  id: string;
  /** league = pontos corridos, group = fase de grupos, ko = mata-mata */
  stage: 'league' | 'group' | 'ko';
  /** Rodada (1..n) nas fases de liga/grupo; índice da fase no mata-mata (0..n) */
  round: number;
  groupId?: string;
  /** Ties do mata-mata: agrupa jogos de ida/volta de um confronto */
  tieId?: string;
  leg?: 1 | 2;
  /** Jogos do mata-mata têm os participantes resolvidos pela chave, não armazenados */
  homeId: string | null;
  awayId: string | null;
  homeGoals: number | null;
  awayGoals: number | null;
  playedAt?: number | null;
}

export interface TournamentOptions {
  /** Turno e returno na fase de liga/grupos */
  doubleRound: boolean;
  /** Ida e volta no mata-mata */
  knockoutTwoLegged: boolean;
  pointsWin: number;
  pointsDraw: number;
  pointsLoss: number;
  groupCount: number;
  qualifiersPerGroup: number;
  thirdPlace: boolean;
  /** Sinuca: melhor de X partidas (1 = jogo único) */
  bestOf: number;
}

export interface Tournament {
  id: string;
  name: string;
  sport: Sport;
  game?: string;
  location?: string;
  format: TournamentFormat;
  createdAt: number;
  updatedAt: number;
  participants: Participant[];
  groups: Group[];
  matches: Match[];
  /** Vagas da chave em ordem de posição (null = bye). Vazio até o mata-mata existir. */
  bracketSlots: (string | null)[];
  /** Desempate por pênaltis: tieId -> participantId que avançou */
  penaltyWinners: Record<string, string>;
  options: TournamentOptions;
  notes?: string;
}

export interface StandingRow {
  participantId: string;
  name: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  diff: number;
  points: number;
}

export interface BracketTie {
  id: string;
  round: number;
  slot: number;
  home: Participant | null;
  away: Participant | null;
  matches: Match[];
  homeAggregate: number | null;
  awayAggregate: number | null;
  homePens: number | null;
  awayPens: number | null;
  winnerId: string | null;
  loserId: string | null;
  decided: boolean;
  bye: boolean;
  /** Aguardando disputa de pênaltis (agregado empatado) */
  needsPenalties: boolean;
}

export interface BracketRound {
  round: number;
  label: string;
  ties: BracketTie[];
}

export const DEFAULT_OPTIONS: TournamentOptions = {
  doubleRound: false,
  knockoutTwoLegged: false,
  pointsWin: 3,
  pointsDraw: 1,
  pointsLoss: 0,
  groupCount: 2,
  qualifiersPerGroup: 2,
  thirdPlace: false,
  bestOf: 1,
};
