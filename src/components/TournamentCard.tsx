import type { Tournament } from '../lib/types';
import { FORMAT_LABEL, tournamentStatus } from '../lib/engine';
import { navigate } from '../lib/router';
import { Avatar } from './Avatar';
import { IconBall, IconChevronRight, IconFlag, IconTrophy, IconUsers } from './Icons';
import { cx, plural } from '../lib/ui';

export function TournamentCard({ tournament }: { tournament: Tournament }) {
  const status = tournamentStatus(tournament);
  const isFifa = tournament.sport === 'fifa';

  return (
    <button
      type="button"
      className={cx('tcard', isFifa ? 'tcard--fifa' : 'tcard--real')}
      onClick={() => navigate(`/c/${tournament.id}`)}
    >
      <div className="tcard-head">
        <span className={cx('chip', isFifa ? 'chip--lime' : 'chip--sky')}>
          {isFifa ? <IconBall size={13} /> : <IconFlag size={13} />}
          {isFifa ? tournament.game || 'FIFA' : 'Vida real'}
        </span>
        <span className="tcard-format">{FORMAT_LABEL[tournament.format]}</span>
      </div>

      <h3 className="tcard-name">{tournament.name}</h3>

      <div className="tcard-meta">
        <span>
          <IconUsers size={14} />
          {plural(tournament.participants.length, 'jogador', 'jogadores')}
        </span>
        <span className="dot" />
        <span>{status.finished ? 'Finalizado' : `${status.played}/${status.total} jogos`}</span>
      </div>

      <div className="progress">
        <span style={{ width: `${Math.max(status.percent, status.total ? 3 : 0)}%` }} />
      </div>

      <div className="tcard-foot">
        {status.champion ? (
          <span className="champion-inline">
            <IconTrophy size={14} />
            <Avatar name={status.champion.name} size="sm" />
            {status.champion.name}
          </span>
        ) : (
          <span className="tcard-progress-label">{status.percent}% concluído</span>
        )}
        <IconChevronRight size={16} />
      </div>
    </button>
  );
}
