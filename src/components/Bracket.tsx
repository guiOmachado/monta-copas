import type { BracketRound, BracketTie } from '../lib/types';
import { Avatar } from './Avatar';
import { IconTrophy } from './Icons';
import { cx } from '../lib/ui';

function TieCard({ tie, onOpen }: { tie: BracketTie; onOpen: (tieId: string) => void }) {
  const rows = [
    {
      participant: tie.home,
      score: tie.homeAggregate,
      isWinner: !!tie.winnerId && tie.winnerId === tie.home?.id,
      isLoser: !!tie.winnerId && tie.winnerId !== tie.home?.id,
    },
    {
      participant: tie.away,
      score: tie.awayAggregate,
      isWinner: !!tie.winnerId && tie.winnerId === tie.away?.id,
      isLoser: !!tie.winnerId && tie.winnerId !== tie.away?.id,
    },
  ];

  const clickable = !tie.bye && !!tie.home && !!tie.away;

  return (
    <button
      type="button"
      className={cx('bracket-card', tie.bye && 'is-bye', tie.decided && !tie.bye && 'is-decided')}
      onClick={() => clickable && onOpen(tie.id)}
      disabled={!clickable}
    >
      {rows.map((row, index) => (
        <div className={cx('bracket-row', row.isWinner && 'is-winner', row.isLoser && 'is-loser')} key={index}>
          {row.participant ? (
            <Avatar name={row.participant.name} size="sm" />
          ) : (
            <span className="avatar avatar--sm avatar--ghost">?</span>
          )}
          <span className="bracket-name">
            {row.participant?.name ?? (tie.bye ? '—' : 'A definir')}
          </span>
          <span className="bracket-score">{row.score ?? '–'}</span>
        </div>
      ))}
      {tie.bye && <span className="bracket-note">Avança direto</span>}
      {tie.needsPenalties && <span className="bracket-note bracket-note--warn">Pênaltis pendentes</span>}
    </button>
  );
}

export function Bracket({
  rounds,
  onOpenTie,
}: {
  rounds: BracketRound[];
  onOpenTie: (tieId: string) => void;
}) {
  if (!rounds.length) return null;
  return (
    <div className="bracket-scroll">
      <div className="bracket">
        {rounds.map((round) => (
          <div className="bracket-col" key={round.round}>
            <div className="bracket-label">{round.label}</div>
            <div className="bracket-body">
              {round.ties.map((tie) => (
                <TieCard key={tie.id} tie={tie} onOpen={onOpenTie} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ThirdPlace({ tie, onOpenTie }: { tie: BracketTie; onOpenTie: (tieId: string) => void }) {
  if (!tie.home && !tie.away) return null;
  return (
    <section className="third-place">
      <header className="round-head">
        <span>Disputa de 3º lugar</span>
        <IconTrophy size={14} />
      </header>
      <TieCard tie={tie} onOpen={onOpenTie} />
    </section>
  );
}
