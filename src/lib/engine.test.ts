import { describe, expect, it } from 'vitest';
import {
  buildTournament,
  generateGroupKnockout,
  groupStandings,
  leagueStandings,
  playableMatches,
  resolveBracket,
  roundRobin,
  seedPositions,
  slotsFromSeeds,
  tournamentStatus,
} from './engine';
import { DEFAULT_OPTIONS } from './types';
import { createDemoTournament } from './demo';

describe('roundRobin', () => {
  it('gera todos os confrontos uma única vez', () => {
    const ids = ['a', 'b', 'c', 'd', 'e'];
    const matches = roundRobin(ids, false);
    expect(matches).toHaveLength(10);
    const pairs = matches.map((m) => [m.homeId, m.awayId].sort().join('-'));
    expect(new Set(pairs).size).toBe(10);
    expect(new Set(matches.map((m) => m.round))).toEqual(new Set([1, 2, 3, 4, 5]));
    for (const match of matches) {
      expect(match.homeId).not.toBe(match.awayId);
      expect(ids).toContain(match.homeId);
      expect(ids).toContain(match.awayId);
    }
  });

  it('duplica os jogos com mando invertido no turno e returno', () => {
    const matches = roundRobin(['a', 'b', 'c', 'd'], true);
    expect(matches).toHaveLength(12);
    const second = matches.filter((m) => m.round > 3);
    expect(second).toHaveLength(6);
    for (const match of second) {
      expect(
        matches.some(
          (first) =>
            first.round === match.round - 3 &&
            first.homeId === match.awayId &&
            first.awayId === match.homeId,
        ),
      ).toBe(true);
    }
  });
});

describe('chave do mata-mata', () => {
  it('distribui os cabeças de chave na ordem clássica', () => {
    expect(seedPositions(4)).toEqual([1, 4, 2, 3]);
    expect(seedPositions(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
  });

  it('coloca o time 1 contra o último e dá bye aos melhores', () => {
    const slots = slotsFromSeeds(['a', 'b', 'c', 'd', 'e']);
    expect(slots).toHaveLength(8);
    expect(slots[0]).toBe('a');
    expect(slots[1]).toBeNull();
    expect(slots.filter(Boolean)).toHaveLength(5);
  });

  it('resolve byes e avança automaticamente', () => {
    const tournament = buildTournament({
      name: 'Copa',
      sport: 'fifa',
      format: 'knockout',
      participantNames: ['Ana', 'Bia', 'Caio', 'Duda', 'Edu'],
      options: { ...DEFAULT_OPTIONS },
      draw: false,
    });

    const rounds = resolveBracket(tournament);
    expect(rounds).toHaveLength(3);
    expect(rounds[0].ties).toHaveLength(4);
    const byes = rounds[0].ties.filter((tie) => tie.bye);
    expect(byes).toHaveLength(3);
    const realTie = rounds[0].ties.find((tie) => !tie.bye);
    expect(realTie?.home?.name).toBe('Duda');
    expect(realTie?.away?.name).toBe('Edu');

    // semifinal já tem os cabeças 1 e 2 definidos por bye
    expect(rounds[1].ties[0].home?.name).toBe('Ana');
    expect(rounds[1].ties[1].away?.name).toBe('Caio');
  });

  it('soma o placar agregado com mando invertido', () => {
    const tournament = buildTournament({
      name: 'Copa',
      sport: 'fifa',
      format: 'knockout',
      participantNames: ['Ana', 'Bia'],
      options: { ...DEFAULT_OPTIONS, knockoutTwoLegged: true },
      draw: false,
    });
    const legs = tournament.matches.filter((m) => m.tieId === 'ko-0-0');
    expect(legs).toHaveLength(2);

    legs[0].homeGoals = 2;
    legs[0].awayGoals = 1;
    legs[1].homeGoals = 0;
    legs[1].awayGoals = 0;

    const final = resolveBracket(tournament)[0].ties[0];
    expect(final.homeAggregate).toBe(2);
    expect(final.awayAggregate).toBe(1);
    expect(final.winnerId).toBe(tournament.participants[0].id);
  });

  it('não cobra placar de confrontos com bye', () => {
    const tournament = buildTournament({
      name: 'Copa',
      sport: 'fifa',
      format: 'knockout',
      participantNames: ['Ana', 'Bia', 'Caio', 'Duda', 'Edu'],
      options: { ...DEFAULT_OPTIONS },
      draw: false,
    });
    expect(tournament.matches).toHaveLength(7);
    expect(playableMatches(tournament)).toHaveLength(4);

    for (const match of playableMatches(tournament)) {
      match.homeGoals = 1;
      match.awayGoals = 0;
    }
    const status = tournamentStatus(tournament);
    expect(status.played).toBe(4);
    expect(status.percent).toBe(100);
  });

  it('exige pênaltis quando o agregado empata', () => {
    const tournament = buildTournament({
      name: 'Copa',
      sport: 'fifa',
      format: 'knockout',
      participantNames: ['Ana', 'Bia'],
      options: { ...DEFAULT_OPTIONS, knockoutTwoLegged: true },
      draw: false,
    });
    const [first, second] = tournament.matches;
    first.homeGoals = 1;
    first.awayGoals = 0;
    second.homeGoals = 1;
    second.awayGoals = 0;

    let tie = resolveBracket(tournament)[0].ties[0];
    expect(tie.needsPenalties).toBe(true);
    expect(tie.winnerId).toBeNull();

    tie = resolveBracket({
      ...tournament,
      penaltyWinners: { 'ko-0-0': tournament.participants[1].id },
    })[0].ties[0];
    expect(tie.winnerId).toBe(tournament.participants[1].id);
    expect(tie.needsPenalties).toBe(false);
  });
});

describe('classificação', () => {
  it('soma pontos, gols e ordena por saldo', () => {
    const tournament = buildTournament({
      name: 'Liga',
      sport: 'real',
      format: 'league',
      participantNames: ['Ana', 'Bia', 'Caio'],
      options: { ...DEFAULT_OPTIONS },
      draw: false,
    });
    const [ana, bia] = tournament.participants;
    const match = tournament.matches.find(
      (m) => m.homeId === ana.id && m.awayId === bia.id,
    );
    expect(match).toBeDefined();
    if (!match) return;
    match.homeGoals = 3;
    match.awayGoals = 1;

    const standings = leagueStandings(tournament);
    expect(standings[0].name).toBe('Ana');
    expect(standings[0].points).toBe(3);
    expect(standings[0].diff).toBe(2);
    expect(standings[1].name).toBe('Caio');
    expect(standings[1].points).toBe(0);
    expect(standings[2].name).toBe('Bia');
    expect(standings[2].diff).toBe(-2);
  });

  it('encerra a liga quando todos os jogos têm placar', () => {
    const tournament = buildTournament({
      name: 'Liga',
      sport: 'real',
      format: 'league',
      participantNames: ['Ana', 'Bia', 'Caio'],
      options: { ...DEFAULT_OPTIONS },
      draw: false,
    });
    for (const match of tournament.matches) {
      match.homeGoals = 1;
      match.awayGoals = 0;
    }
    const status = tournamentStatus(tournament);
    expect(status.finished).toBe(true);
    expect(status.champion).not.toBeNull();
  });
});

describe('grupos', () => {
  it('distribui em dois grupos equilibrados e monta a classificação', () => {
    const names = ['Ana', 'Bia', 'Caio', 'Duda', 'Edu', 'Fê', 'Gui', 'Hugo'];
    const tournament = buildTournament({
      name: 'Grupos',
      sport: 'fifa',
      format: 'groups',
      participantNames: names,
      options: { ...DEFAULT_OPTIONS, groupCount: 2, qualifiersPerGroup: 2 },
      draw: false,
    });

    expect(tournament.groups).toHaveLength(2);
    expect(tournament.groups.map((g) => g.participantIds.length)).toEqual([4, 4]);
    expect(tournament.matches).toHaveLength(12);
    for (const group of tournament.groups) {
      expect(groupStandings(tournament, group.id)).toHaveLength(4);
    }
  });

  it('gera a chave a partir dos classificados', () => {
    const tournament = buildTournament({
      name: 'Grupos',
      sport: 'fifa',
      format: 'groups',
      participantNames: ['Ana', 'Bia', 'Caio', 'Duda', 'Edu', 'Fê', 'Gui', 'Hugo'],
      options: { ...DEFAULT_OPTIONS, groupCount: 2, qualifiersPerGroup: 2 },
      draw: false,
    });
    for (const match of tournament.matches) {
      if (!match.homeId || !match.awayId) continue;
      match.homeGoals = match.homeId < match.awayId ? 2 : 0;
      match.awayGoals = match.homeId < match.awayId ? 0 : 2;
    }
    const generated = generateGroupKnockout(tournament);
    expect(generated.bracketSlots.filter(Boolean)).toHaveLength(4);
    expect(resolveBracket(generated)).toHaveLength(2);
  });
});

describe('campeonato de exemplo', () => {
  it('monta um campeonato consistente com finais pendentes', () => {
    const demo = createDemoTournament();
    const status = tournamentStatus(demo);
    expect(status.total).toBe(16);
    expect(status.played).toBe(14);
    expect(status.champion).toBeNull();
    expect(demo.bracketSlots.filter(Boolean)).toHaveLength(4);

    const rounds = resolveBracket(demo);
    const final = rounds[rounds.length - 1].ties[0];
    expect(final.home).not.toBeNull();
    expect(final.away).not.toBeNull();
    expect(final.decided).toBe(false);
  });
});
