import type { Tournament } from './types';
import { DEFAULT_OPTIONS } from './types';
import { buildTournament, generateGroupKnockout, isPlayed } from './engine';

/**
 * Campeonato de exemplo com grupos já jogados e semifinais decididas,
 * usado para apresentar o app sem precisar digitar nada.
 */
export function createDemoTournament(): Tournament {
  const names = ['Ana', 'Bia', 'Caio', 'Duda', 'Edu', 'Fê', 'Gui', 'Hugo'];

  let tournament = buildTournament({
    name: 'Copa do Rolê 2026',
    sport: 'fifa',
    game: 'EA SPORTS FC 26',
    format: 'groups',
    participantNames: names,
    options: {
      ...DEFAULT_OPTIONS,
      groupCount: 2,
      qualifiersPerGroup: 2,
      doubleRound: false,
      knockoutTwoLegged: false,
      thirdPlace: true,
    },
    draw: false,
  });

  const scores: [number, number][] = [
    [4, 1], [2, 2], [0, 3], [1, 0], [3, 3], [2, 1],
    [1, 1], [0, 2], [5, 0], [2, 3], [1, 2], [0, 1],
  ];

  tournament.matches.forEach((match, index) => {
    if (match.stage !== 'group') return;
    const [home, away] = scores[index % scores.length];
    match.homeGoals = home;
    match.awayGoals = away;
  });

  tournament = generateGroupKnockout(tournament);

  const semiScores: [number, number][] = [
    [3, 1],
    [2, 4],
  ];
  let semiIndex = 0;
  for (const match of tournament.matches) {
    if (match.stage === 'ko' && match.round === 0) {
      const [home, away] = semiScores[semiIndex % semiScores.length];
      match.homeGoals = home;
      match.awayGoals = away;
      semiIndex += 1;
    }
  }

  const played = tournament.matches.filter(isPlayed).length;

  return {
    ...tournament,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
    updatedAt: Date.now(),
    notes: `Exemplo pronto para explorar.\n\nFaltam ${tournament.matches.length - played} jogos: a final e a disputa de 3º lugar. Toque na aba Chave para ver o mata-mata.`,
  };
}
