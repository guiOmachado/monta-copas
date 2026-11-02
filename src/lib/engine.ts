import type {
  BracketRound,
  BracketTie,
  Group,
  Match,
  Participant,
  Sport,
  StandingRow,
  Tournament,
  TournamentFormat,
  TournamentOptions,
} from './types';
import { DEFAULT_OPTIONS } from './types';

/* ------------------------------------------------------------------ */
/* ids                                                                 */
/* ------------------------------------------------------------------ */

export const uid = (prefix = 'id'): string =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/* ------------------------------------------------------------------ */
/* utilidades                                                          */
/* ------------------------------------------------------------------ */

export function shuffle<T>(arr: readonly T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export const isPlayed = (m: Match): boolean => m.homeGoals !== null && m.awayGoals !== null;

export function bracketSize(n: number): number {
  return 2 ** Math.max(1, Math.ceil(Math.log2(Math.max(2, n))));
}

/** Distribuição clássica dos cabeças de chave: retorna o número do seed em cada slot. */
export function seedPositions(size: number): number[] {
  let order = [1];
  while (order.length < size) {
    const n = order.length * 2;
    const next: number[] = [];
    for (const seed of order) next.push(seed, n + 1 - seed);
    order = next;
  }
  return order;
}

/** Participantes (na ordem de seed) distribuídos nos slots da chave. */
export function slotsFromSeeds(ids: string[]): (string | null)[] {
  const size = bracketSize(ids.length);
  return seedPositions(size).map((seed) => ids[seed - 1] ?? null);
}

export function koRoundLabel(round: number, totalRounds: number): string {
  const ties = 2 ** (totalRounds - round - 1);
  switch (ties) {
    case 1:
      return 'Final';
    case 2:
      return 'Semifinal';
    case 4:
      return 'Quartas de final';
    case 8:
      return 'Oitavas de final';
    case 16:
      return '16 avos de final';
    default:
      return `${ties * 2} classificados`;
  }
}

/* ------------------------------------------------------------------ */
/* tabela de jogos (round robin / pontos corridos)                      */
/* ------------------------------------------------------------------ */

export interface ScheduledPair {
  homeId: string;
  awayId: string;
  round: number;
}

export function roundRobin(ids: string[], doubleRound: boolean): ScheduledPair[] {
  if (ids.length < 2) return [];
  const BYE = '__bye__';
  const list0 = [...ids];
  if (list0.length % 2 === 1) list0.push(BYE);
  const n = list0.length;
  const totalRounds = n - 1;
  const out: ScheduledPair[] = [];
  let list = [...list0];

  for (let r = 0; r < totalRounds; r++) {
    for (let i = 0; i < n / 2; i++) {
      const a = list[i];
      const b = list[n - 1 - i];
      if (a === BYE || b === BYE) continue;
      const swap = (r + i) % 2 === 1;
      out.push({
        homeId: swap ? b : a,
        awayId: swap ? a : b,
        round: r + 1,
      });
    }
    const fixed = list[0];
    const rest = list.slice(1);
    rest.unshift(rest.pop() as string);
    list = [fixed, ...rest];
  }

  if (doubleRound) {
    for (const pair of [...out]) {
      out.push({
        homeId: pair.awayId,
        awayId: pair.homeId,
        round: pair.round + totalRounds,
      });
    }
  }
  return out;
}

export function leagueMatches(participantIds: string[], doubleRound: boolean): Match[] {
  return roundRobin(participantIds, doubleRound).map((pair) => ({
    id: uid('m'),
    stage: 'league',
    round: pair.round,
    homeId: pair.homeId,
    awayId: pair.awayId,
    homeGoals: null,
    awayGoals: null,
  }));
}

/* ------------------------------------------------------------------ */
/* grupos                                                              */
/* ------------------------------------------------------------------ */

export function splitGroups(participantIds: string[], groupCount: number): Group[] {
  const count = Math.max(1, Math.min(8, groupCount));
  const letters = 'ABCDEFGH';
  const groups: Group[] = Array.from({ length: count }, (_, i) => ({
    id: `group-${letters[i]}`,
    name: `Grupo ${letters[i]}`,
    participantIds: [],
  }));

  // distribuição em serpentina: equilíbria os grupos e espalha os cabeças
  participantIds.forEach((id, index) => {
    const block = Math.floor(index / count);
    const pos = index % count;
    const target = block % 2 === 0 ? pos : count - 1 - pos;
    groups[target].participantIds.push(id);
  });
  return groups;
}

export function groupMatches(groups: Group[], doubleRound: boolean): Match[] {
  const out: Match[] = [];
  for (const group of groups) {
    for (const pair of roundRobin(group.participantIds, doubleRound)) {
      out.push({
        id: uid('m'),
        stage: 'group',
        round: pair.round,
        groupId: group.id,
        homeId: pair.homeId,
        awayId: pair.awayId,
        homeGoals: null,
        awayGoals: null,
      });
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* mata-mata                                                           */
/* ------------------------------------------------------------------ */

export function knockoutMatches(size: number, legs: 1 | 2, thirdPlace: boolean): Match[] {
  const totalRounds = Math.log2(size);
  const out: Match[] = [];
  for (let round = 0; round < totalRounds; round++) {
    const ties = size / 2 ** (round + 1);
    for (let slot = 0; slot < ties; slot++) {
      for (let leg = 1 as 1 | 2; leg <= legs; leg = (leg + 1) as 1 | 2) {
        out.push({
          id: uid('m'),
          stage: 'ko',
          round,
          tieId: `ko-${round}-${slot}`,
          leg,
          homeId: null,
          awayId: null,
          homeGoals: null,
          awayGoals: null,
        });
      }
    }
  }
  if (thirdPlace && totalRounds >= 2) {
    for (let leg = 1 as 1 | 2; leg <= legs; leg = (leg + 1) as 1 | 2) {
      out.push({
        id: uid('m'),
        stage: 'ko',
        round: totalRounds - 1,
        tieId: 'ko-third',
        leg,
        homeId: null,
        awayId: null,
        homeGoals: null,
        awayGoals: null,
      });
    }
  }
  return out;
}

function computeTie(
  tournament: Tournament,
  tieId: string,
  round: number,
  slot: number,
  home: Participant | null,
  away: Participant | null,
): BracketTie {
  const matches = tournament.matches
    .filter((m) => m.tieId === tieId)
    .sort((a, b) => (a.leg ?? 1) - (b.leg ?? 1));

  let homeAggregate: number | null = null;
  let awayAggregate: number | null = null;
  let allPlayed = matches.length > 0;

  if (matches.length === 1) {
    const m = matches[0];
    if (isPlayed(m)) {
      homeAggregate = m.homeGoals;
      awayAggregate = m.awayGoals;
    } else {
      allPlayed = false;
    }
  } else {
    homeAggregate = 0;
    awayAggregate = 0;
    for (const m of matches) {
      if (!isPlayed(m)) {
        allPlayed = false;
        homeAggregate = null;
        awayAggregate = null;
        break;
      }
      const homeGoals = m.homeGoals as number;
      const awayGoals = m.awayGoals as number;
      if ((m.leg ?? 1) === 1) {
        homeAggregate += homeGoals;
        awayAggregate += awayGoals;
      } else {
        // perna 2: mando invertido
        homeAggregate += awayGoals;
        awayAggregate += homeGoals;
      }
    }
  }

  // Byes só existem na primeira fase: nas seguintes, "vazio" significa
  // que o classificado anterior ainda não foi definido.
  const bye = round === 0 && ((!!home && !away) || (!home && !!away));
  let winnerId: string | null = null;
  if (bye) {
    winnerId = home?.id ?? away?.id ?? null;
  } else if (home && away && allPlayed && homeAggregate !== null && awayAggregate !== null) {
    if (homeAggregate > awayAggregate) winnerId = home.id;
    else if (awayAggregate > homeAggregate) winnerId = away.id;
    else {
      const penaltyWinner = tournament.penaltyWinners[tieId];
      if (penaltyWinner === home.id) winnerId = home.id;
      else if (penaltyWinner === away.id) winnerId = away.id;
    }
  }

  const decided = winnerId !== null;
  const needsPenalties =
    !!home &&
    !!away &&
    allPlayed &&
    !decided &&
    homeAggregate !== null &&
    awayAggregate !== null &&
    homeAggregate === awayAggregate;

  return {
    id: tieId,
    round,
    slot,
    home,
    away,
    matches,
    homeAggregate,
    awayAggregate,
    homePens: null,
    awayPens: null,
    winnerId,
    loserId:
      decided && home && away
        ? winnerId === home.id
          ? away.id
          : home.id
        : null,
    decided,
    bye,
    needsPenalties,
  };
}

function emptyTie(tieId: string, round: number, slot: number): BracketTie {
  return {
    id: tieId,
    round,
    slot,
    home: null,
    away: null,
    matches: [],
    homeAggregate: null,
    awayAggregate: null,
    homePens: null,
    awayPens: null,
    winnerId: null,
    loserId: null,
    decided: false,
    bye: false,
    needsPenalties: false,
  };
}

export function resolveBracket(tournament: Tournament): BracketRound[] {
  const size = tournament.bracketSlots.length;
  if (size < 2) return [];
  const totalRounds = Math.log2(size);
  const byId = new Map(tournament.participants.map((p) => [p.id, p]));
  const rounds: BracketRound[] = [];
  let previous: BracketTie[] = [];

  for (let round = 0; round < totalRounds; round++) {
    const tieCount = size / 2 ** (round + 1);
    const ties: BracketTie[] = [];
    for (let slot = 0; slot < tieCount; slot++) {
      let homeId: string | null;
      let awayId: string | null;
      if (round === 0) {
        homeId = tournament.bracketSlots[slot * 2] ?? null;
        awayId = tournament.bracketSlots[slot * 2 + 1] ?? null;
      } else {
        homeId = previous[slot * 2]?.winnerId ?? null;
        awayId = previous[slot * 2 + 1]?.winnerId ?? null;
      }
      const home = homeId ? byId.get(homeId) ?? null : null;
      const away = awayId ? byId.get(awayId) ?? null : null;
      ties.push(computeTie(tournament, `ko-${round}-${slot}`, round, slot, home, away));
    }
    rounds.push({ round, label: koRoundLabel(round, totalRounds), ties });
    previous = ties;
  }
  return rounds;
}

export function resolveThirdPlace(tournament: Tournament): BracketTie | null {
  const size = tournament.bracketSlots.length;
  if (!size || !tournament.options.thirdPlace) return null;
  const totalRounds = Math.log2(size);
  if (totalRounds < 2) return null;
  const semis = resolveBracket(tournament)[totalRounds - 2];
  if (!semis) return null;
  const byId = new Map(tournament.participants.map((p) => [p.id, p]));
  const home = semis.ties[0]?.loserId ? byId.get(semis.ties[0].loserId as string) ?? null : null;
  const away = semis.ties[1]?.loserId ? byId.get(semis.ties[1].loserId as string) ?? null : null;
  if (!home && !away) {
    return emptyTie('ko-third', totalRounds - 1, 0);
  }
  return computeTie(tournament, 'ko-third', totalRounds - 1, 0, home, away);
}

export function finalTie(tournament: Tournament): BracketTie | null {
  const rounds = resolveBracket(tournament);
  if (!rounds.length) return null;
  const last = rounds[rounds.length - 1];
  return last.ties[0] ?? null;
}

/* ------------------------------------------------------------------ */
/* classificação                                                       */
/* ------------------------------------------------------------------ */

function computeRows(
  tournament: Tournament,
  participantIds: string[],
  matches: Match[],
): StandingRow[] {
  const byId = new Map(tournament.participants.map((p) => [p.id, p]));
  const rows = new Map<string, StandingRow>();
  for (const id of participantIds) {
    rows.set(id, {
      participantId: id,
      name: byId.get(id)?.name ?? '—',
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      diff: 0,
      points: 0,
    });
  }
  const { pointsWin, pointsDraw, pointsLoss } = tournament.options;

  for (const m of matches) {
    if (!m.homeId || !m.awayId || !isPlayed(m)) continue;
    const home = rows.get(m.homeId);
    const away = rows.get(m.awayId);
    if (!home || !away) continue;
    const hg = m.homeGoals as number;
    const ag = m.awayGoals as number;
    home.played++;
    away.played++;
    home.goalsFor += hg;
    home.goalsAgainst += ag;
    away.goalsFor += ag;
    away.goalsAgainst += hg;
    if (hg > ag) {
      home.wins++;
      away.losses++;
      home.points += pointsWin;
      away.points += pointsLoss;
    } else if (hg < ag) {
      away.wins++;
      home.losses++;
      away.points += pointsWin;
      home.points += pointsLoss;
    } else {
      home.draws++;
      away.draws++;
      home.points += pointsDraw;
      away.points += pointsDraw;
    }
  }

  return [...rows.values()]
    .map((row) => ({ ...row, diff: row.goalsFor - row.goalsAgainst }))
    .sort(
      (a, b) =>
        b.points - a.points ||
        b.wins - a.wins ||
        b.diff - a.diff ||
        b.goalsFor - a.goalsFor ||
        a.name.localeCompare(b.name, 'pt-BR'),
    );
}

export function leagueStandings(tournament: Tournament): StandingRow[] {
  return computeRows(
    tournament,
    tournament.participants.map((p) => p.id),
    tournament.matches.filter((m) => m.stage === 'league'),
  );
}

export function groupStandings(tournament: Tournament, groupId: string): StandingRow[] {
  const group = tournament.groups.find((g) => g.id === groupId);
  if (!group) return [];
  return computeRows(
    tournament,
    group.participantIds,
    tournament.matches.filter((m) => m.stage === 'group' && m.groupId === groupId),
  );
}

/* ------------------------------------------------------------------ */
/* fase de grupos -> mata-mata                                         */
/* ------------------------------------------------------------------ */

export function groupStageComplete(tournament: Tournament): boolean {
  const matches = tournament.matches.filter((m) => m.stage === 'group');
  return matches.length > 0 && matches.every(isPlayed);
}

export function qualifiedParticipants(tournament: Tournament): string[] {
  const qualifiers = Math.max(1, tournament.options.qualifiersPerGroup);
  const ids: string[] = [];
  for (let rank = 0; rank < qualifiers; rank++) {
    for (const group of tournament.groups) {
      const row = groupStandings(tournament, group.id)[rank];
      if (row) ids.push(row.participantId);
    }
  }
  return ids;
}

/** Monta os slots da chave a partir dos classificados, evitando duelos do mesmo grupo. */
export function slotsFromGroupQualifiers(tournament: Tournament): (string | null)[] {
  const qualified = qualifiedParticipants(tournament);
  const slots = slotsFromSeeds(qualified);
  const groupOf = new Map<string, string>();
  for (const group of tournament.groups) {
    for (const id of group.participantIds) groupOf.set(id, group.id);
  }

  for (let i = 0; i < slots.length; i += 2) {
    const a = slots[i];
    const b = slots[i + 1];
    if (!a || !b || groupOf.get(a) !== groupOf.get(b)) continue;

    for (let j = 0; j < slots.length; j++) {
      if (j === i || j === i + 1) continue;
      const candidate = slots[j];
      if (!candidate || groupOf.get(candidate) === groupOf.get(a)) continue;
      const partnerIndex = j % 2 === 0 ? j + 1 : j - 1;
      const partner = slots[partnerIndex];
      if (partner && groupOf.get(partner) === groupOf.get(b)) continue;
      slots[i + 1] = candidate;
      slots[j] = b;
      break;
    }
  }
  return slots;
}

/** Gera a chave do mata-mata após a fase de grupos. */
export function generateGroupKnockout(tournament: Tournament): Tournament {
  const slots = slotsFromGroupQualifiers(tournament);
  if (slots.filter(Boolean).length < 2) return tournament;
  const legs: 1 | 2 = tournament.options.knockoutTwoLegged ? 2 : 1;
  const matches = tournament.matches.filter((m) => m.stage !== 'ko');
  const size = slots.length;
  return {
    ...tournament,
    bracketSlots: slots,
    matches: [...matches, ...knockoutMatches(size, legs, tournament.options.thirdPlace)],
    penaltyWinners: {},
    updatedAt: Date.now(),
  };
}

/* ------------------------------------------------------------------ */
/* criação                                                             */
/* ------------------------------------------------------------------ */

export interface CreateTournamentInput {
  name: string;
  sport: Sport;
  game?: string;
  location?: string;
  format: TournamentFormat;
  participantNames: string[];
  options: TournamentOptions;
  draw?: boolean;
}

export function buildTournament(input: CreateTournamentInput): Tournament {
  const options: TournamentOptions = { ...DEFAULT_OPTIONS, ...input.options };
  const names = input.participantNames.map((n) => n.trim()).filter(Boolean);
  const ordered = input.draw === false ? names : shuffle(names);
  const participants: Participant[] = ordered.map((name) => ({ id: uid('p'), name }));

  let matches: Match[] = [];
  let groups: Group[] = [];
  let bracketSlots: (string | null)[] = [];

  if (input.format === 'league') {
    matches = leagueMatches(
      participants.map((p) => p.id),
      options.doubleRound,
    );
  } else if (input.format === 'groups') {
    groups = splitGroups(
      participants.map((p) => p.id),
      options.groupCount,
    );
    matches = groupMatches(groups, options.doubleRound);
  } else {
    bracketSlots = slotsFromSeeds(participants.map((p) => p.id));
    matches = knockoutMatches(
      bracketSize(participants.length),
      options.knockoutTwoLegged ? 2 : 1,
      options.thirdPlace,
    );
  }

  return {
    id: uid('t'),
    name: input.name.trim() || 'Campeonato sem nome',
    sport: input.sport,
    game: input.game?.trim() || undefined,
    location: input.location?.trim() || undefined,
    format: input.format,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    participants,
    groups,
    matches,
    bracketSlots,
    penaltyWinners: {},
    options,
  };
}

/* ------------------------------------------------------------------ */
/* situação do campeonato                                              */
/* ------------------------------------------------------------------ */

export interface TournamentStatus {
  played: number;
  total: number;
  percent: number;
  champion: Participant | null;
  runnerUp: Participant | null;
  finished: boolean;
}

/** Jogos que realmente precisam de placar (byes avançam automaticamente). */
export function playableMatches(tournament: Tournament): Match[] {
  if (!tournament.bracketSlots.length) return tournament.matches;
  const byeTies = new Set<string>();
  for (const round of resolveBracket(tournament)) {
    for (const tie of round.ties) {
      if (tie.bye) byeTies.add(tie.id);
    }
  }
  return tournament.matches.filter((m) => !(m.tieId && byeTies.has(m.tieId)));
}

export function tournamentStatus(tournament: Tournament): TournamentStatus {
  const playable = playableMatches(tournament);
  const total = playable.length;
  const played = playable.filter(isPlayed).length;
  const byId = new Map(tournament.participants.map((p) => [p.id, p]));

  let champion: Participant | null = null;
  let runnerUp: Participant | null = null;
  let finished = false;

  if (tournament.format === 'league') {
    const standings = leagueStandings(tournament);
    finished = total > 0 && played === total;
    if (finished && standings[0]) {
      champion = byId.get(standings[0].participantId) ?? null;
      if (standings[1]) runnerUp = byId.get(standings[1].participantId) ?? null;
    }
  } else {
    const final = finalTie(tournament);
    if (final?.winnerId) {
      champion = byId.get(final.winnerId) ?? null;
      runnerUp = final.loserId ? byId.get(final.loserId) ?? null : null;
      finished = played === total;
    }
  }

  return {
    played,
    total,
    percent: total === 0 ? 0 : Math.round((played / total) * 100),
    champion,
    runnerUp,
    finished,
  };
}

export const FORMAT_LABEL: Record<TournamentFormat, string> = {
  league: 'Pontos corridos',
  knockout: 'Mata-mata',
  groups: 'Grupos + mata-mata',
};

export const SPORT_LABEL: Record<Sport, string> = {
  fifa: 'FIFA',
  real: 'Vida real',
};

/* ------------------------------------------------------------------ */
/* helpers de apresentação                                             */
/* ------------------------------------------------------------------ */

export function participantMap(tournament: Tournament): Map<string, Participant> {
  return new Map(tournament.participants.map((p) => [p.id, p]));
}

export function matchSides(
  match: Match,
  tie: BracketTie | undefined,
  byId: Map<string, Participant>,
): { home: Participant | null; away: Participant | null } {
  if (match.stage === 'ko' && tie) {
    if ((match.leg ?? 1) === 2) return { home: tie.away, away: tie.home };
    return { home: tie.home, away: tie.away };
  }
  return {
    home: match.homeId ? byId.get(match.homeId) ?? null : null,
    away: match.awayId ? byId.get(match.awayId) ?? null : null,
  };
}

export function groupName(tournament: Tournament, groupId?: string): string {
  return tournament.groups.find((g) => g.id === groupId)?.name ?? '';
}
