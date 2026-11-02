import type { StandingRow } from '../lib/types';
import { Avatar } from './Avatar';
import { cx } from '../lib/ui';

interface StandingsTableProps {
  rows: StandingRow[];
  qualifiers?: number;
  emptyLabel?: string;
}

export function StandingsTable({ rows, qualifiers = 0, emptyLabel }: StandingsTableProps) {
  if (!rows.length) {
    return <p className="empty-inline">{emptyLabel ?? 'Sem dados ainda.'}</p>;
  }

  return (
    <div className="table-scroll">
      <table className="standings">
        <thead>
          <tr>
            <th className="col-pos">#</th>
            <th className="col-team">Equipe</th>
            <th>P</th>
            <th>J</th>
            <th>V</th>
            <th>E</th>
            <th>D</th>
            <th>GP</th>
            <th>GC</th>
            <th>SG</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={row.participantId}
              className={cx(index < qualifiers && 'is-qualified')}
            >
              <td className="col-pos">{index + 1}</td>
              <td className="col-team">
                <Avatar name={row.name} size="sm" />
                <span className="col-team-name">{row.name}</span>
              </td>
              <td className="col-points">{row.points}</td>
              <td>{row.played}</td>
              <td>{row.wins}</td>
              <td>{row.draws}</td>
              <td>{row.losses}</td>
              <td>{row.goalsFor}</td>
              <td>{row.goalsAgainst}</td>
              <td>{row.diff > 0 ? `+${row.diff}` : row.diff}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {qualifiers > 0 && (
        <p className="table-legend">
          <span className="legend-dot" /> Os {qualifiers} primeiros avançam ao mata-mata
        </p>
      )}
    </div>
  );
}
