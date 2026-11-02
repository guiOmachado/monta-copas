import { useEffect, useMemo, useState } from 'react';
import type { BracketRound, BracketTie, Participant } from '../lib/types';
import {
  FORMAT_LABEL,
  groupStageComplete,
  groupStandings,
  leagueStandings,
  matchSides,
  participantMap,
  resolveBracket,
  resolveThirdPlace,
  tournamentStatus,
} from '../lib/engine';
import { actions, useTournament } from '../lib/store';
import { navigate } from '../lib/router';
import { exportTournament, shareTournament } from '../lib/export';
import { PageBar } from '../components/AppHeader';
import { Avatar } from '../components/Avatar';
import { Bracket, ThirdPlace } from '../components/Bracket';
import { MatchList, KnockoutList } from '../components/MatchList';
import { ScoreSheet, TieSheet } from '../components/MatchSheets';
import { StandingsTable } from '../components/StandingsTable';
import { ConfirmSheet } from '../components/Sheet';
import {
  IconBall,
  IconCopy,
  IconDownload,
  IconFlag,
  IconInfo,
  IconList,
  IconShare,
  IconSwords,
  IconTrash,
  IconTrophy,
  IconUsers,
} from '../components/Icons';
import { cx, formatDate, plural } from '../lib/ui';

type SheetState =
  | { kind: 'score'; matchId: string; backToTie?: string }
  | { kind: 'tie'; tieId: string };

type TabId = 'matches' | 'table' | 'bracket' | 'info';

export function TournamentPage({ id }: { id: string }) {
  const tournament = useTournament(id);
  const [tab, setTab] = useState<TabId>('matches');
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [groupFilter, setGroupFilter] = useState<string>('');
  const [stageFilter, setStageFilter] = useState<'groups' | 'ko'>('groups');
  const [confirm, setConfirm] = useState<'delete' | 'reset' | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const rounds = useMemo<BracketRound[]>(
    () => (tournament ? resolveBracket(tournament) : []),
    [tournament],
  );
  const tiesMap = useMemo(() => {
    const map = new Map<string, BracketTie>();
    for (const round of rounds) for (const tie of round.ties) map.set(tie.id, tie);
    const third = tournament ? resolveThirdPlace(tournament) : null;
    if (third) map.set(third.id, third);
    return map;
  }, [rounds, tournament]);
  const byId = useMemo<Map<string, Participant>>(
    () => (tournament ? participantMap(tournament) : new Map()),
    [tournament],
  );
  const status = tournament ? tournamentStatus(tournament) : null;

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (tournament) document.title = `${tournament.name} · Monta Copas`;
    return () => {
      document.title = 'Monta Copas';
    };
  }, [tournament]);

  if (!tournament || !status) {
    return (
      <div className="page">
        <PageBar title="Campeonato" onBack={() => navigate('/')} />
        <div className="empty-state">
          <span className="empty-icon">
            <IconTrophy size={28} />
          </span>
          <h3>Campeonato não encontrado</h3>
          <p>Ele pode ter sido excluído ou este link pertence a outro aparelho.</p>
          <button type="button" className="btn btn--primary" onClick={() => navigate('/')}>
            Voltar para o início
          </button>
        </div>
      </div>
    );
  }

  const isGroups = tournament.format === 'groups';
  const isLeague = tournament.format === 'league';
  const groupMatchesDone = groupStageComplete(tournament);
  const thirdPlace = resolveThirdPlace(tournament);
  const bracketGenerated = tournament.bracketSlots.length > 0;
  const activeGroup = groupFilter || tournament.groups[0]?.id || '';

  const tabs: { id: TabId; label: string }[] = [
    { id: 'matches', label: 'Jogos' },
    ...(isLeague || isGroups ? [{ id: 'table' as TabId, label: 'Tabela' }] : []),
    ...(!isLeague ? [{ id: 'bracket' as TabId, label: 'Chave' }] : []),
    { id: 'info', label: 'Info' },
  ];

  const share = async () => {
    const result = await shareTournament(tournament);
    setToast(
      result === 'copied'
        ? 'Resumo copiado para a área de transferência'
        : result === 'shared'
          ? 'Resumo compartilhado'
          : 'Não foi possível compartilhar',
    );
  };

  const scoreMatch = sheet?.kind === 'score'
    ? tournament.matches.find((match) => match.id === sheet.matchId)
    : undefined;
  const scoreTie = scoreMatch?.tieId ? tiesMap.get(scoreMatch.tieId) : undefined;
  const scoreSides = scoreMatch ? matchSides(scoreMatch, scoreTie, byId) : { home: null, away: null };
  const scoreEyebrow = scoreMatch
    ? scoreMatch.stage === 'ko'
      ? `${scoreMatch.tieId === 'ko-third' ? 'Disputa de 3º lugar' : rounds[scoreMatch.round]?.label ?? 'Mata-mata'}${scoreMatch.leg === 2 ? ' · jogo 2' : scoreMatch.leg === 1 && scoreTie && scoreTie.matches.length > 1 ? ' · jogo 1' : ''}`
      : scoreMatch.stage === 'group'
        ? `${tournament.groups.find((g) => g.id === scoreMatch.groupId)?.name ?? 'Grupo'} · Rodada ${scoreMatch.round}`
        : `Rodada ${scoreMatch.round}`
    : '';

  const sheetTie = sheet?.kind === 'tie' ? tiesMap.get(sheet.tieId) : undefined;
  const sheetTieLabel = sheetTie
    ? sheetTie.id === 'ko-third'
      ? 'Disputa de 3º lugar'
      : rounds[sheetTie.round]?.label ?? 'Mata-mata'
    : '';

  const noteValue = tournament.notes ?? '';

  return (
    <div className="page page--tournament">
      <div className="t-sticky">
        <PageBar
          title={tournament.name}
          subtitle={tournament.sport === 'fifa' ? tournament.game || 'FIFA' : 'Vida real'}
          onBack={() => navigate('/')}
          right={
            <button type="button" className="icon-btn" onClick={share} aria-label="Compartilhar campeonato">
              <IconShare size={18} />
            </button>
          }
        />
        <nav className="tabs" role="tablist" aria-label="Seções do campeonato">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              className={cx('tab', tab === item.id && 'is-active')}
              onClick={() => setTab(item.id)}
              aria-selected={tab === item.id}
              role="tab"
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      <main className="t-main">
        <section className="t-hero">
          <div className="t-hero-chips">
            <span className={cx('chip', tournament.sport === 'fifa' ? 'chip--lime' : 'chip--sky')}>
              {tournament.sport === 'fifa' ? <IconBall size={13} /> : <IconFlag size={13} />}
              {tournament.sport === 'fifa' ? tournament.game || 'FIFA' : 'Vida real'}
            </span>
            <span className="chip chip--ghost">{FORMAT_LABEL[tournament.format]}</span>
            {status.finished && <span className="chip chip--ghost">Finalizado</span>}
          </div>

          <div className="t-hero-meta">
            <span>
              <IconUsers size={14} />
              {plural(tournament.participants.length, 'jogador', 'jogadores')}
            </span>
            <span className="dot" />
            <span>
              {status.played}/{status.total} jogos
            </span>
          </div>

          <div className="t-progress">
            <div className="progress progress--hero">
              <span style={{ width: `${Math.max(status.percent, status.total ? 3 : 0)}%` }} />
            </div>
            <span className="t-progress-label">{status.percent}%</span>
          </div>

          {status.champion && (
            <div className="champion-banner">
              <span className="champion-icon">
                <IconTrophy size={20} />
              </span>
              <Avatar name={status.champion.name} />
              <div className="champion-copy">
                <span>Campeão</span>
                <strong>{status.champion.name}</strong>
              </div>
              {status.runnerUp && (
                <span className="champion-runner">
                  2º: {status.runnerUp.name}
                </span>
              )}
            </div>
          )}
        </section>

        {tab === 'matches' && (
          <section className="tab-pane">
            {!isLeague && bracketGenerated && isGroups && (
              <div className="segmented" role="tablist" aria-label="Fase">
                <button
                  type="button"
                  className={cx(stageFilter === 'groups' && 'is-active')}
                  onClick={() => setStageFilter('groups')}
                >
                  Fase de grupos
                </button>
                <button
                  type="button"
                  className={cx(stageFilter === 'ko' && 'is-active')}
                  onClick={() => setStageFilter('ko')}
                >
                  Mata-mata
                </button>
              </div>
            )}

            {isGroups && groupMatchesDone && !bracketGenerated && (
              <div className="notice notice--action">
                <span>Fase de grupos concluída! Gere a chave do mata-mata.</span>
                <button
                  type="button"
                  className="btn btn--tiny btn--primary"
                  onClick={() => {
                    actions.generateKnockout(tournament.id);
                    setStageFilter('ko');
                    setTab('bracket');
                  }}
                >
                  Gerar chave
                </button>
              </div>
            )}

            {isGroups && (
              stageFilter === 'groups' || !bracketGenerated ? (
                <>
                  <div className="filter-row">
                    {tournament.groups.map((group) => (
                      <button
                        key={group.id}
                        type="button"
                        className={cx('filter-chip', activeGroup === group.id && 'is-active')}
                        onClick={() => setGroupFilter(group.id)}
                      >
                        {group.name}
                      </button>
                    ))}
                  </div>
                  <MatchList
                    tournament={tournament}
                    ties={tiesMap}
                    byId={byId}
                    groupId={activeGroup}
                    onOpenScore={(matchId) => setSheet({ kind: 'score', matchId })}
                  />
                </>
              ) : (
                <KnockoutList
                  rounds={rounds}
                  thirdPlace={thirdPlace}
                  onOpenTie={(tieId) => setSheet({ kind: 'tie', tieId })}
                />
              )
            )}

            {isLeague && (
              <MatchList
                tournament={tournament}
                ties={tiesMap}
                byId={byId}
                onOpenScore={(matchId) => setSheet({ kind: 'score', matchId })}
              />
            )}

            {tournament.format === 'knockout' && (
              <KnockoutList
                rounds={rounds}
                thirdPlace={thirdPlace}
                onOpenTie={(tieId) => setSheet({ kind: 'tie', tieId })}
              />
            )}

            <p className="tab-hint">Toque em um jogo para registrar o placar.</p>
          </section>
        )}

        {tab === 'table' && isLeague && (
          <section className="tab-pane">
            <StandingsTable rows={leagueStandings(tournament)} />
            <p className="tab-hint">
              Critérios de desempate: pontos, vitórias, saldo de gols e gols pró.
            </p>
          </section>
        )}

        {tab === 'table' && isGroups && (
          <section className="tab-pane tab-pane--groups">
            {tournament.groups.map((group) => (
              <div className="group-block" key={group.id}>
                <header className="group-head">
                  <h3>{group.name}</h3>
                  <span>{plural(group.participantIds.length, 'jogador', 'jogadores')}</span>
                </header>
                <StandingsTable
                  rows={groupStandings(tournament, group.id)}
                  qualifiers={tournament.options.qualifiersPerGroup}
                />
              </div>
            ))}
          </section>
        )}

        {tab === 'bracket' && !isLeague && (
          <section className="tab-pane">
            {bracketGenerated ? (
              <>
                <Bracket rounds={rounds} onOpenTie={(tieId) => setSheet({ kind: 'tie', tieId })} />
                {thirdPlace && <ThirdPlace tie={thirdPlace} onOpenTie={(tieId) => setSheet({ kind: 'tie', tieId })} />}
                <p className="tab-hint">Toque em um confronto para registrar os placares.</p>
              </>
            ) : (
              <div className="empty-state empty-state--compact">
                <span className="empty-icon">
                  <IconSwords size={26} />
                </span>
                <h3>Mata-mata ainda não definido</h3>
                <p>
                  {groupMatchesDone
                    ? 'Fase de grupos concluída. Gere a chave com os classificados de cada grupo.'
                    : 'Conclua os jogos da fase de grupos para gerar automaticamente a chave.'}
                </p>
                <button
                  type="button"
                  className="btn btn--primary"
                  disabled={!groupMatchesDone}
                  onClick={() => {
                    actions.generateKnockout(tournament.id);
                    setStageFilter('ko');
                  }}
                >
                  {groupMatchesDone ? 'Gerar mata-mata' : 'Aguardando a fase de grupos'}
                </button>
              </div>
            )}
          </section>
        )}

        {tab === 'info' && (
          <section className="tab-pane">
            <div className="info-card">
              <h3>Detalhes</h3>
              <dl className="info-grid">
                <div>
                  <dt>Formato</dt>
                  <dd>{FORMAT_LABEL[tournament.format]}</dd>
                </div>
                <div>
                  <dt>Participantes</dt>
                  <dd>{tournament.participants.length}</dd>
                </div>
                <div>
                  <dt>Jogos</dt>
                  <dd>
                    {status.played}/{status.total}
                  </dd>
                </div>
                <div>
                  <dt>Criado em</dt>
                  <dd>{formatDate(tournament.createdAt)}</dd>
                </div>
                {tournament.game && (
                  <div>
                    <dt>Jogo</dt>
                    <dd>{tournament.game}</dd>
                  </div>
                )}
                {tournament.location && (
                  <div>
                    <dt>Local</dt>
                    <dd>{tournament.location}</dd>
                  </div>
                )}
              </dl>
              <div className="info-chips">
                {tournament.format !== 'knockout' && tournament.options.doubleRound && (
                  <span className="chip chip--ghost">Turno e returno</span>
                )}
                {tournament.format !== 'league' && tournament.options.knockoutTwoLegged && (
                  <span className="chip chip--ghost">Ida e volta no mata-mata</span>
                )}
                {tournament.format === 'groups' && (
                  <span className="chip chip--ghost">
                    {tournament.options.groupCount} grupos · {tournament.options.qualifiersPerGroup} por grupo
                  </span>
                )}
                {tournament.format !== 'knockout' && (
                  <span className="chip chip--ghost">
                    Vitória {tournament.options.pointsWin} · Empate {tournament.options.pointsDraw}
                  </span>
                )}
                {tournament.options.thirdPlace && <span className="chip chip--ghost">3º lugar</span>}
              </div>
            </div>

            <div className="info-card">
              <h3>Participantes</h3>
              <ul className="player-grid">
                {tournament.participants.map((participant) => (
                  <li key={participant.id}>
                    <Avatar name={participant.name} size="sm" />
                    <span>{participant.name}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="info-card">
              <h3>Anotações</h3>
              <textarea
                className="input textarea"
                rows={3}
                placeholder="Regras da casa, prêmio, horário dos jogos…"
                value={noteValue}
                onChange={(event) =>
                  actions.update(tournament.id, (current) => ({ ...current, notes: event.target.value }))
                }
              />
            </div>

            <div className="info-card">
              <h3>Ações</h3>
              <div className="action-list">
                <button
                  type="button"
                  className="action-row"
                  onClick={() => {
                    exportTournament(tournament);
                    setToast('Arquivo exportado');
                  }}
                >
                  <IconDownload size={17} />
                  Exportar campeonato (.json)
                </button>
                <button
                  type="button"
                  className="action-row"
                  onClick={async () => {
                    await share();
                  }}
                >
                  <IconShare size={17} />
                  Compartilhar resumo
                </button>
                <button
                  type="button"
                  className="action-row"
                  onClick={() => {
                    actions.duplicate(tournament.id);
                    setToast('Cópia criada no início');
                  }}
                >
                  <IconCopy size={17} />
                  Duplicar campeonato
                </button>
                <button type="button" className="action-row" onClick={() => setConfirm('reset')}>
                  <IconList size={17} />
                  Limpar todos os placares
                </button>
                <button
                  type="button"
                  className="action-row action-row--danger"
                  onClick={() => setConfirm('delete')}
                >
                  <IconTrash size={17} />
                  Excluir campeonato
                </button>
              </div>
            </div>

            <p className="info-foot">
              <IconInfo size={14} />
              Tudo fica salvo somente neste dispositivo. Exporte um backup de vez em quando.
            </p>
          </section>
        )}
      </main>

      {sheet?.kind === 'score' && scoreMatch && (
        <ScoreSheet
          key={scoreMatch.id}
          eyebrow={scoreEyebrow}
          homeName={scoreSides.home?.name ?? null}
          awayName={scoreSides.away?.name ?? null}
          homeGoals={scoreMatch.homeGoals}
          awayGoals={scoreMatch.awayGoals}
          onClose={() =>
            setSheet(sheet.backToTie ? { kind: 'tie', tieId: sheet.backToTie } : null)
          }
          onSave={(home, away) => {
            actions.setScore(tournament.id, scoreMatch.id, { homeGoals: home, awayGoals: away });
            setSheet(sheet.backToTie ? { kind: 'tie', tieId: sheet.backToTie } : null);
          }}
          onClear={() => {
            actions.setScore(tournament.id, scoreMatch.id, { homeGoals: null, awayGoals: null });
            setSheet(sheet.backToTie ? { kind: 'tie', tieId: sheet.backToTie } : null);
          }}
        />
      )}

      {sheet?.kind === 'tie' && sheetTie && (
        <TieSheet
          key={sheetTie.id}
          tie={sheetTie}
          roundLabel={sheetTieLabel}
          hasPenalty={!!tournament.penaltyWinners[sheetTie.id]}
          onClose={() => setSheet(null)}
          onEditMatch={(matchId) => setSheet({ kind: 'score', matchId, backToTie: sheetTie.id })}
          onPenalty={(participantId) => actions.setPenaltyWinner(tournament.id, sheetTie.id, participantId)}
          onClearPenalty={() => actions.clearPenaltyWinner(tournament.id, sheetTie.id)}
        />
      )}

      <ConfirmSheet
        open={confirm === 'delete'}
        title="Excluir campeonato?"
        message={`"${tournament.name}" e todos os placares serão apagados deste aparelho. Não dá pra desfazer.`}
        confirmLabel="Excluir"
        danger
        onConfirm={() => {
          actions.remove(tournament.id);
          navigate('/');
        }}
        onClose={() => setConfirm(null)}
      />

      <ConfirmSheet
        open={confirm === 'reset'}
        title="Limpar placares?"
        message="Todos os resultados registrados serão apagados. A tabela de jogos e a chave continuam."
        confirmLabel="Limpar placares"
        onConfirm={() => {
          actions.clearResults(tournament.id);
          setToast('Placares limpos');
        }}
        onClose={() => setConfirm(null)}
      />

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
