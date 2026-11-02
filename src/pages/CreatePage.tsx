import { useEffect, useMemo, useState } from 'react';
import type { Sport, TournamentFormat, TournamentOptions } from '../lib/types';
import { DEFAULT_OPTIONS } from '../lib/types';
import { buildTournament } from '../lib/engine';
import { actions } from '../lib/store';
import { navigate } from '../lib/router';
import { PageBar } from '../components/AppHeader';
import { Avatar } from '../components/Avatar';
import {
  IconBall,
  IconCheck,
  IconFlag,
  IconLayers,
  IconList,
  IconPlus,
  IconShuffle,
  IconSwords,
  IconUsers,
  IconX,
} from '../components/Icons';
import { cx, plural } from '../lib/ui';

const STEPS = ['Básico', 'Formato', 'Jogadores'];

const GAME_SUGGESTIONS = [
  'EA SPORTS FC 26',
  'EA SPORTS FC 25',
  'eFootball',
  'PES 2017',
  'FIFA 23',
  'FIFA 22',
];

function splitNames(value: string): string[] {
  return value
    .split(/[\n,;]+/)
    .map((part) => part.trim().replace(/\s+/g, ' '))
    .filter(Boolean);
}

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className="toggle-row"
      onClick={() => onChange(!checked)}
    >
      <span className="toggle-copy">
        <strong>{label}</strong>
        {description && <span>{description}</span>}
      </span>
      <span className={cx('switch', checked && 'is-on')} aria-hidden="true">
        <span />
      </span>
    </button>
  );
}

const FORMATS: {
  id: TournamentFormat;
  title: string;
  description: string;
  icon: typeof IconList;
}[] = [
  {
    id: 'league',
    title: 'Pontos corridos',
    description: 'Todos jogam contra todos. Quem somar mais pontos leva a taça.',
    icon: IconList,
  },
  {
    id: 'groups',
    title: 'Grupos + mata-mata',
    description: 'Divide em grupos, classifica os melhores e decide no mata-mata.',
    icon: IconLayers,
  },
  {
    id: 'knockout',
    title: 'Mata-mata',
    description: 'Eliminatória direta. Quem perde, está fora.',
    icon: IconSwords,
  },
];

export function CreatePage() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [sport, setSport] = useState<Sport>('fifa');
  const [game, setGame] = useState(GAME_SUGGESTIONS[0]);
  const [location, setLocation] = useState('');
  const [format, setFormat] = useState<TournamentFormat>('league');
  const [options, setOptions] = useState<TournamentOptions>({
    ...DEFAULT_OPTIONS,
    groupCount: 2,
    qualifiersPerGroup: 2,
  });
  const [names, setNames] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [draw, setDraw] = useState(true);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const maxGroups = Math.max(1, Math.floor(names.length / 2));
  const groupOptions = [2, 3, 4, 6, 8];

  const sanitizedOptions = useMemo<TournamentOptions>(() => {
    const total = names.length;
    if (format !== 'groups') {
      return {
        ...options,
        thirdPlace: options.thirdPlace && (format === 'knockout' ? total >= 3 : true),
      };
    }
    const groupCount = Math.max(1, Math.min(options.groupCount, Math.max(1, Math.floor(total / 2))));
    const smallestGroup = total > 0 ? Math.floor(total / groupCount) : 1;
    return {
      ...options,
      groupCount,
      qualifiersPerGroup: Math.max(1, Math.min(options.qualifiersPerGroup, Math.max(1, smallestGroup))),
      thirdPlace: options.thirdPlace && groupCount * options.qualifiersPerGroup >= 4,
    };
  }, [options, format, names.length]);

  const addNames = (raw: string) => {
    const incoming = splitNames(raw);
    if (!incoming.length) return;
    setNames((current) => {
      const seen = new Set(current.map((n) => n.toLowerCase()));
      const fresh = incoming.filter((n) => {
        const key = n.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return [...current, ...fresh];
    });
    setDraft('');
    setError(null);
  };

  const removeName = (index: number) => {
    setNames((current) => current.filter((_, i) => i !== index));
  };

  const goNext = () => {
    if (step === 0) {
      if (name.trim().length < 2) {
        setError('Dê um nome ao campeonato para começar.');
        return;
      }
    }
    if (step === 1) {
      if (format === 'groups' && names.length > 0 && names.length < 4) {
        setError('Para dividir em grupos são necessários pelo menos 4 jogadores.');
        return;
      }
    }
    setError(null);
    setStep((current) => Math.min(2, current + 1));
  };

  const create = () => {
    if (names.length < 2) {
      setError('Adicione pelo menos 2 participantes.');
      return;
    }
    if (format === 'groups' && names.length < 4) {
      setError('Para dividir em grupos são necessários pelo menos 4 participantes.');
      return;
    }
    const tournament = buildTournament({
      name,
      sport,
      game: sport === 'fifa' ? game : undefined,
      location: sport === 'real' ? location : undefined,
      format,
      participantNames: names,
      options: sanitizedOptions,
      draw,
    });
    actions.add(tournament);
    navigate(`/c/${tournament.id}`);
  };

  const canFinish = names.length >= 2 && !(format === 'groups' && names.length < 4);

  return (
    <div className="page page--create">
      <PageBar
        title="Novo campeonato"
        onBack={() => (step === 0 ? navigate('/') : setStep((current) => current - 1))}
        right={<span className="step-counter">{step + 1}/3</span>}
      />

      <div className="wizard-steps">
        {STEPS.map((label, index) => (
          <div
            key={label}
            className={cx('wizard-step', index === step && 'is-active', index < step && 'is-done')}
          >
            <span className="wizard-dot">{index < step ? <IconCheck size={12} /> : index + 1}</span>
            <span className="wizard-label">{label}</span>
          </div>
        ))}
      </div>

      <main className="wizard-body">
        {step === 0 && (
          <div className="wizard-pane">
            <div className="field">
              <label htmlFor="tournament-name">Nome do campeonato</label>
              <input
                id="tournament-name"
                className="input"
                value={name}
                maxLength={60}
                placeholder="Ex.: Copa do Rolê 2026"
                autoComplete="off"
                onChange={(event) => {
                  setName(event.target.value);
                  setError(null);
                }}
              />
            </div>

            <div className="field">
              <span className="label">Onde vai acontecer?</span>
              <div className="choice-grid">
                <button
                  type="button"
                  className={cx('choice-card', sport === 'fifa' && 'is-selected')}
                  onClick={() => setSport('fifa')}
                >
                  <span className="choice-icon">
                    <IconBall size={22} />
                  </span>
                  <strong>FIFA / videogame</strong>
                  <span>No console, PC ou celular</span>
                </button>
                <button
                  type="button"
                  className={cx('choice-card', sport === 'real' && 'is-selected')}
                  onClick={() => setSport('real')}
                >
                  <span className="choice-icon">
                    <IconFlag size={22} />
                  </span>
                  <strong>Vida real</strong>
                  <span>Quadra, campo ou society</span>
                </button>
              </div>
            </div>

            {sport === 'fifa' ? (
              <div className="field">
                <label htmlFor="game">Jogo</label>
                <input
                  id="game"
                  className="input"
                  value={game}
                  list="game-suggestions"
                  placeholder="Ex.: EA SPORTS FC 26"
                  onChange={(event) => setGame(event.target.value)}
                />
                <datalist id="game-suggestions">
                  {GAME_SUGGESTIONS.map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
              </div>
            ) : (
              <div className="field">
                <label htmlFor="place">Local (opcional)</label>
                <input
                  id="place"
                  className="input"
                  value={location}
                  placeholder="Ex.: quadra do condomínio"
                  onChange={(event) => setLocation(event.target.value)}
                />
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="wizard-pane">
            <div className="field">
              <span className="label">Formato da disputa</span>
              <div className="format-list">
                {FORMATS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={cx('format-card', format === item.id && 'is-selected')}
                      onClick={() => setFormat(item.id)}
                    >
                      <span className="choice-icon">
                        <Icon size={20} />
                      </span>
                      <span className="format-copy">
                        <strong>{item.title}</strong>
                        <span>{item.description}</span>
                      </span>
                      <span className={cx('radio', format === item.id && 'is-on')} />
                    </button>
                  );
                })}
              </div>
            </div>

            {format === 'groups' && (
              <div className="field">
                <span className="label">Quantos grupos?</span>
                <div className="chip-row">
                  {groupOptions.map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={cx('chip-btn', sanitizedOptions.groupCount === value && 'is-active')}
                      onClick={() => setOptions((current) => ({ ...current, groupCount: value }))}
                      disabled={names.length > 0 && value > maxGroups}
                    >
                      {value} grupos
                    </button>
                  ))}
                </div>
                <span className="field-hint">
                  {names.length >= 4
                    ? `Com ${names.length} jogadores serão ${sanitizedOptions.groupCount} grupos de ${Math.floor(names.length / sanitizedOptions.groupCount)} a ${Math.ceil(names.length / sanitizedOptions.groupCount)} participantes.`
                    : 'Você poderá ajustar depois de adicionar os jogadores.'}
                </span>
              </div>
            )}

            {format === 'groups' && (
              <div className="field">
                <span className="label">Quem avança por grupo?</span>
                <div className="chip-row">
                  {[1, 2].map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={cx('chip-btn', sanitizedOptions.qualifiersPerGroup === value && 'is-active')}
                      onClick={() => setOptions((current) => ({ ...current, qualifiersPerGroup: value }))}
                    >
                      {value === 1 ? 'Só o 1º' : 'Os 2 primeiros'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {format !== 'knockout' && (
              <Toggle
                checked={options.doubleRound}
                onChange={(next) => setOptions((current) => ({ ...current, doubleRound: next }))}
                label="Turno e returno"
                description="Todos se enfrentam duas vezes, com mando invertido."
              />
            )}

            {format !== 'league' && (
              <Toggle
                checked={options.knockoutTwoLegged}
                onChange={(next) => setOptions((current) => ({ ...current, knockoutTwoLegged: next }))}
                label="Ida e volta no mata-mata"
                description="Cada confronto tem dois jogos, com placar agregado."
              />
            )}

            {format !== 'league' && (
              <Toggle
                checked={options.thirdPlace}
                onChange={(next) => setOptions((current) => ({ ...current, thirdPlace: next }))}
                label="Disputa de 3º lugar"
                description="Os perdedores da semifinal disputam o bronze."
              />
            )}

            {format === 'league' && (
              <div className="field">
                <span className="label">Pontuação</span>
                <div className="chip-row">
                  <button
                    type="button"
                    className={cx('chip-btn', options.pointsWin === 3 && 'is-active')}
                    onClick={() =>
                      setOptions((current) => ({ ...current, pointsWin: 3, pointsDraw: 1, pointsLoss: 0 }))
                    }
                  >
                    Vitória 3 · Empate 1
                  </button>
                  <button
                    type="button"
                    className={cx('chip-btn', options.pointsWin === 2 && 'is-active')}
                    onClick={() =>
                      setOptions((current) => ({ ...current, pointsWin: 2, pointsDraw: 1, pointsLoss: 0 }))
                    }
                  >
                    Vitória 2 · Empate 1
                  </button>
                </div>
              </div>
            )}

            {format === 'groups' && (
              <p className="field-hint">
                Os jogos da fase de grupos seguem a pontuação 3 · 1 · 0. Depois, o mata-mata é gerado
                automaticamente com os classificados.
              </p>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="wizard-pane">
            <div className="field">
              <div className="field-head">
                <span className="label">Participantes</span>
                <span className="counter">{plural(names.length, 'jogador', 'jogadores')}</span>
              </div>
              <div className="add-row">
                <input
                  className="input"
                  value={draft}
                  placeholder="Nome do jogador ou time"
                  maxLength={40}
                  autoComplete="off"
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      addNames(draft);
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn btn--outline btn--icon"
                  onClick={() => addNames(draft)}
                  disabled={!draft.trim()}
                  aria-label="Adicionar participante"
                >
                  <IconPlus size={18} />
                </button>
              </div>
              <div className="add-hint-row">
                <button type="button" className="link-btn" onClick={() => setPasteOpen((current) => !current)}>
                  {pasteOpen ? 'Esconder colagem' : 'Colar lista de nomes'}
                </button>
                <span className="field-hint">Aperte Enter para adicionar</span>
              </div>

              {pasteOpen && (
                <div className="paste-box">
                  <textarea
                    className="input textarea"
                    rows={4}
                    placeholder={'Um nome por linha\nAna\nBruno\nCarla'}
                    value={pasteText}
                    onChange={(event) => setPasteText(event.target.value)}
                  />
                  <div className="paste-actions">
                    <button
                      type="button"
                      className="btn btn--outline btn--tiny"
                      onClick={() => {
                        addNames(pasteText);
                        setPasteText('');
                        setPasteOpen(false);
                      }}
                      disabled={!pasteText.trim()}
                    >
                      Adicionar {splitNames(pasteText).length || ''} nomes
                    </button>
                  </div>
                </div>
              )}
            </div>

            {names.length > 0 && (
              <ul className="player-list">
                {names.map((player, index) => (
                  <li key={`${player}-${index}`} className="player-item">
                    <span className="player-index">{index + 1}</span>
                    <Avatar name={player} size="sm" />
                    <span className="player-name">{player}</span>
                    <button
                      type="button"
                      className="icon-btn icon-btn--soft"
                      onClick={() => removeName(index)}
                      aria-label={`Remover ${player}`}
                    >
                      <IconX size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {names.length === 0 && (
              <div className="players-empty">
                <IconUsers size={22} />
                <p>Adicione de 2 a 32 participantes. Times, apelidos ou nomes — como preferir.</p>
              </div>
            )}

            <Toggle
              checked={draw}
              onChange={setDraw}
              label="Sortear os confrontos"
              description="Embaralha os participantes para montar a tabela e a chave."
            />

            {names.length >= 2 && (
              <div className="summary-card">
                <strong>{name || 'Seu campeonato'}</strong>
                <span>
                  {format === 'league'
                    ? 'Pontos corridos'
                    : format === 'groups'
                      ? `Grupos + mata-mata`
                      : 'Mata-mata'}{' '}
                  · {plural(names.length, 'jogador', 'jogadores')}
                </span>
                <div className="summary-chips">
                  <span className="chip chip--ghost">
                    <IconShuffle size={13} />
                    {draw ? 'Com sorteio' : 'Ordem informada'}
                  </span>
                  {format !== 'league' && options.knockoutTwoLegged && (
                    <span className="chip chip--ghost">Ida e volta</span>
                  )}
                  {format !== 'knockout' && options.doubleRound && (
                    <span className="chip chip--ghost">Turno e returno</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {error && <p className="form-error">{error}</p>}
      </main>

      <footer className="wizard-foot">
        {step > 0 ? (
          <button type="button" className="btn btn--ghost" onClick={() => setStep((current) => current - 1)}>
            Voltar
          </button>
        ) : (
          <button type="button" className="btn btn--ghost" onClick={() => navigate('/')}>
            Cancelar
          </button>
        )}
        {step < 2 ? (
          <button type="button" className="btn btn--primary" onClick={goNext}>
            Continuar
          </button>
        ) : (
          <button type="button" className="btn btn--primary" onClick={create} disabled={!canFinish}>
            {canFinish ? 'Criar campeonato' : 'Adicione jogadores'}
          </button>
        )}
      </footer>
    </div>
  );
}
