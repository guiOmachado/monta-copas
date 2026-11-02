import { useState } from 'react';
import type { BracketTie } from '../lib/types';
import { Sheet, SheetHeader } from './Sheet';
import { Avatar } from './Avatar';
import { IconMinus, IconPlus, IconTrophy } from './Icons';

const clampScore = (value: number): number => Math.max(0, Math.min(99, value));

function Stepper({ value, onChange }: { value: number; onChange: (next: number) => void }) {
  return (
    <div className="stepper">
      <button
        type="button"
        className="stepper-btn"
        onClick={() => onChange(clampScore(value - 1))}
        aria-label="Diminuir gols"
      >
        <IconMinus size={18} />
      </button>
      <input
        className="stepper-value"
        inputMode="numeric"
        value={value}
        aria-label="Gols"
        onFocus={(event) => event.currentTarget.select()}
        onChange={(event) => {
          const digits = event.target.value.replace(/\D/g, '').slice(0, 2);
          onChange(digits === '' ? 0 : clampScore(Number(digits)));
        }}
      />
      <button
        type="button"
        className="stepper-btn"
        onClick={() => onChange(clampScore(value + 1))}
        aria-label="Aumentar gols"
      >
        <IconPlus size={18} />
      </button>
    </div>
  );
}

interface ScoreSheetProps {
  eyebrow: string;
  homeName: string | null;
  awayName: string | null;
  homeGoals: number | null;
  awayGoals: number | null;
  onClose: () => void;
  onSave: (home: number, away: number) => void;
  onClear: () => void;
}

export function ScoreSheet({
  eyebrow,
  homeName,
  awayName,
  homeGoals,
  awayGoals,
  onClose,
  onSave,
  onClear,
}: ScoreSheetProps) {
  const [home, setHome] = useState(homeGoals ?? 0);
  const [away, setAway] = useState(awayGoals ?? 0);

  return (
    <Sheet open onClose={onClose} labelledBy="score-title">
      <SheetHeader eyebrow={eyebrow} title="Registrar placar" onClose={onClose} titleId="score-title" />

      <div className="score-rows">
        <div className="score-row">
          <Avatar name={homeName ?? '?'} />
          <span className="score-name">{homeName ?? 'A definir'}</span>
          <Stepper value={home} onChange={setHome} />
        </div>
        <div className="score-divider">
          <span>×</span>
        </div>
        <div className="score-row">
          <Avatar name={awayName ?? '?'} />
          <span className="score-name">{awayName ?? 'A definir'}</span>
          <Stepper value={away} onChange={setAway} />
        </div>
      </div>

      <p className="sheet-hint">O placar fica salvo automaticamente no aparelho e funciona offline.</p>

      <div className="sheet-actions">
        <button type="button" className="btn btn--ghost" onClick={onClear}>
          Limpar
        </button>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => onSave(home, away)}
        >
          Salvar placar
        </button>
      </div>
    </Sheet>
  );
}

interface TieSheetProps {
  tie: BracketTie;
  roundLabel: string;
  onClose: () => void;
  onEditMatch: (matchId: string) => void;
  onPenalty: (participantId: string) => void;
  onClearPenalty: () => void;
  hasPenalty: boolean;
}

export function TieSheet({
  tie,
  roundLabel,
  onClose,
  onEditMatch,
  onPenalty,
  onClearPenalty,
  hasPenalty,
}: TieSheetProps) {
  const twoLegged = tie.matches.length > 1;
  const aggregateVisible = tie.homeAggregate !== null && tie.awayAggregate !== null;

  return (
    <Sheet open onClose={onClose} labelledBy="tie-title">
      <SheetHeader eyebrow={roundLabel} title="Confronto" onClose={onClose} titleId="tie-title" />

      <div className="tie-sheet-teams">
        <div className={tie.winnerId && tie.winnerId === tie.home?.id ? 'is-winner' : undefined}>
          <Avatar name={tie.home?.name ?? '?'} />
          <strong>{tie.home?.name ?? 'A definir'}</strong>
          <span className="tie-sheet-score">{aggregateVisible ? tie.homeAggregate : '–'}</span>
        </div>
        <span className="tie-sheet-x">×</span>
        <div className={tie.winnerId && tie.winnerId === tie.away?.id ? 'is-winner' : undefined}>
          <Avatar name={tie.away?.name ?? '?'} />
          <strong>{tie.away?.name ?? 'A definir'}</strong>
          <span className="tie-sheet-score">{aggregateVisible ? tie.awayAggregate : '–'}</span>
        </div>
      </div>
      {twoLegged && <p className="sheet-hint sheet-hint--center">Placar agregado (ida e volta)</p>}

      <div className="leg-list">
        {(!tie.home || !tie.away) && (
          <p className="empty-inline">Aguardando os classificados das fases anteriores.</p>
        )}
        {tie.matches.map((match, index) => {
          const swapped = (match.leg ?? 1) === 2;
          const home = swapped ? tie.away : tie.home;
          const away = swapped ? tie.home : tie.away;
          return (
            <div className="leg-row" key={match.id}>
              <div className="leg-info">
                <span className="leg-tag">{twoLegged ? `Jogo ${index + 1}` : 'Jogo único'}</span>
                <span className="leg-matchup">
                  {home?.name ?? 'A definir'} <em>×</em> {away?.name ?? 'A definir'}
                </span>
              </div>
              <span className="leg-score">
                {match.homeGoals ?? '–'} <em>×</em> {match.awayGoals ?? '–'}
              </span>
              {tie.home && tie.away && (
                <button type="button" className="btn btn--tiny" onClick={() => onEditMatch(match.id)}>
                  Editar
                </button>
              )}
            </div>
          );
        })}
      </div>

      {tie.needsPenalties && (
        <div className="penalty-box">
          <strong>Empate no agregado</strong>
          <p>Quem avançou na disputa de pênaltis?</p>
          <div className="penalty-options">
            <button type="button" className="btn btn--outline" onClick={() => tie.home && onPenalty(tie.home.id)}>
              {tie.home?.name}
            </button>
            <button type="button" className="btn btn--outline" onClick={() => tie.away && onPenalty(tie.away.id)}>
              {tie.away?.name}
            </button>
          </div>
        </div>
      )}

      {tie.winnerId && !tie.bye && (
        <div className="tie-winner">
          <IconTrophy size={15} />
          <span>
            Classificado: <strong>{tie.winnerId === tie.home?.id ? tie.home?.name : tie.away?.name}</strong>
          </span>
          {hasPenalty && (
            <button type="button" className="link-btn" onClick={onClearPenalty}>
              alterar
            </button>
          )}
        </div>
      )}

      <div className="sheet-actions">
        <button type="button" className="btn btn--ghost" onClick={onClose}>
          Fechar
        </button>
      </div>
    </Sheet>
  );
}
