import type { BracketRound, BracketTie, Match, Participant, Tournament } from '../lib/types';
import { groupName, matchSides, isPlayed } from '../lib/engine';
import { Avatar } from './Avatar';
import { IconChevronRight, IconTrophy } from './Icons';
import { cx, plural } from '../lib/ui';

interface MatchListProps {
  tournament: Tournament;
  ties: Map<string, BracketTie>;
  byId: Map<string, Participant>;
  onOpenScore: (matchId: string) => void;
  /** Filtra a fase de grupos por um grupo específico */
  groupId?: string;
}

function MatchRow({
  match,
  ties,
  byId,
  onOpenScore,
}: {
  match: Match;
  ties: Map<string, BracketTie>;
  byId: Map<string, Participant>;
  onOpenScore: (matchId: string) => void;
}) {
  const tie = match.tieId ? ties.get(match.tieId) : undefined;
  const { home, away } = matchSides(match, tie, byId);
  const played = isPlayed(match);

  return (
    <button
      type="button"
      className={cx('match-row', played && 'is-played')}
      onClick={() => onOpenScore(match.id)}
    >
      <span className="match-side">
        <Avatar name={home?.name ?? '?'} size="sm" />
        <span className={cx('match-name', home && match.homeGoals !== null && match.awayGoals !== null && match.homeGoals > match.awayGoals && 'is-winning')}>
          {home?.name ?? 'A definir'}
        </span>
      </span>
      <span className={cx('match-score', played && 'is-filled')}>
        {match.homeGoals ?? '–'}
        <em>×</em>
        {match.awayGoals ?? '–'}
      </span>
      <span className="match-side match-side--away">
        <span className={cx('match-name', away && match.homeGoals !== null && match.awayGoals !== null && match.awayGoals > match.homeGoals && 'is-winning')}>
          {away?.name ?? 'A definir'}
        </span>
        <Avatar name={away?.name ?? '?'} size="sm" />
      </span>
    </button>
  );
}

export function MatchList({ tournament, ties, byId, onOpenScore, groupId }: MatchListProps) {
  const stage = tournament.format === 'league' ? 'league' : 'group';
  const matches = tournament.matches.filter(
    (m) => m.stage === stage && (!groupId || m.groupId === groupId),
  );

  const rounds = new Map<number, Match[]>();
  for (const match of matches) {
    const list = rounds.get(match.round) ?? [];
    list.push(match);
    rounds.set(match.round, list);
  }
  const roundNumbers = [...rounds.keys()].sort((a, b) => a - b);

  if (!roundNumbers.length) {
    return <p className="empty-inline">Nenhum jogo gerado.</p>;
  }

  return (
    <div className="round-list">
      {roundNumbers.map((round) => {
        const list = rounds.get(round) ?? [];
        const played = list.filter(isPlayed).length;
        return (
          <section className="round-block" key={round}>
            <header className="round-head">
              <span>Rodada {round}</span>
              <span className="round-progress">
                {played}/{list.length}
              </span>
            </header>
            <div className="round-matches">
              {list.map((match) => (
                <div className="match-wrap" key={match.id}>
                  {tournament.format === 'groups' && !groupId && (
                    <span className="match-group">{groupName(tournament, match.groupId)}</span>
                  )}
                  <MatchRow
                    match={match}
                    ties={ties}
                    byId={byId}
                    onOpenScore={onOpenScore}
                  />
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function TieRow({
  tie,
  roundLabel,
  onOpenTie,
}: {
  tie: BracketTie;
  roundLabel: string;
  onOpenTie: (tieId: string) => void;
}) {
  if (tie.bye) {
    const solo = tie.home ?? tie.away;
    return (
      <div className="tie-row tie-row--bye">
        <div className="tie-teams">
          <div className="tie-team">
            <Avatar name={solo?.name ?? '?'} size="sm" />
            <span className="match-name">{solo?.name ?? 'A definir'}</span>
            <span className="badge-soft">Avança direto</span>
          </div>
        </div>
      </div>
    );
  }

  const playedLegs = tie.matches.filter(isPlayed).length;
  const totalLegs = tie.matches.length;
  const pending = tie.needsPenalties;
  const ready = !!tie.home && !!tie.away;

  if (!ready) {
    return (
      <div className="tie-row tie-row--pending">
        <div className="tie-teams">
          <div className="tie-team">
            <span className="avatar avatar--sm avatar--ghost">?</span>
            <span className="match-name">Aguardando os classificados</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button type="button" className="tie-row" onClick={() => onOpenTie(tie.id)}>
      <div className="tie-teams">
        <div className={cx('tie-team', tie.winnerId && tie.winnerId === tie.home?.id && 'is-winner')}>
          <Avatar name={tie.home?.name ?? '?'} size="sm" />
          <span className="match-name">{tie.home?.name ?? 'A definir'}</span>
          <span className="tie-score">{tie.homeAggregate ?? '–'}</span>
        </div>
        <div className={cx('tie-team', tie.winnerId && tie.winnerId === tie.away?.id && 'is-winner')}>
          <Avatar name={tie.away?.name ?? '?'} size="sm" />
          <span className="match-name">{tie.away?.name ?? 'A definir'}</span>
          <span className="tie-score">{tie.awayAggregate ?? '–'}</span>
        </div>
        <div className="tie-meta">
          <span>{roundLabel}</span>
          <span className="dot" />
          <span>{totalLegs > 1 ? `Agregado · ${playedLegs}/${totalLegs} jogos` : 'Jogo único'}</span>
          {pending && <span className="badge-warn">Pênaltis pendentes</span>}
          {tie.decided && tie.winnerId && (
            <span className="badge-lime">
              <IconTrophy size={11} />
              {tie.winnerId === tie.home?.id ? tie.home?.name : tie.away?.name}
            </span>
          )}
        </div>
      </div>
      <IconChevronRight size={16} className="tie-chevron" />
    </button>
  );
}

export function KnockoutList({
  rounds,
  onOpenTie,
  thirdPlace,
}: {
  rounds: BracketRound[];
  onOpenTie: (tieId: string) => void;
  thirdPlace?: BracketTie | null;
}) {
  if (!rounds.length) {
    return <p className="empty-inline">O mata-mata ainda não foi gerado.</p>;
  }

  const playableTies = rounds.flatMap((r) => r.ties).filter((t) => !t.bye);
  const totalPlayed = playableTies.filter((t) => t.decided).length;
  const totalTies = playableTies.length;

  return (
    <div className="round-list">
      <p className="list-caption">
        {totalPlayed} de {plural(totalTies, 'confronto decidido', 'confrontos decididos')}
      </p>
      {rounds.map((round) => (
        <section className="round-block" key={round.round}>
          <header className="round-head">
            <span>{round.label}</span>
            <span className="round-progress">
              {round.ties.filter((t) => t.decided).length}/{round.ties.length}
            </span>
          </header>
          <div className="round-matches">
            {round.ties.map((tie) => (
              <TieRow key={tie.id} tie={tie} roundLabel={round.label} onOpenTie={onOpenTie} />
            ))}
          </div>
        </section>
      ))}
      {thirdPlace && (thirdPlace.home || thirdPlace.away) && (
        <section className="round-block">
          <header className="round-head">
            <span>Disputa de 3º lugar</span>
          </header>
          <div className="round-matches">
            <TieRow tie={thirdPlace} roundLabel="3º lugar" onOpenTie={onOpenTie} />
          </div>
        </section>
      )}
    </div>
  );
}
