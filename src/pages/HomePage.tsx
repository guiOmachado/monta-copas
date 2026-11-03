import { useMemo, useRef, useState } from 'react';
import { useTournaments } from '../lib/store';
import { actions } from '../lib/store';
import type { Sport } from '../lib/types';
import { tournamentStatus } from '../lib/engine';
import { navigate } from '../lib/router';
import { SPORTS } from '../lib/sports';
import { useOnlineStatus, usePwaInstall } from '../lib/pwa';
import { readBackupFile } from '../lib/export';
import { createDemoTournament } from '../lib/demo';
import { AppHeader } from '../components/AppHeader';
import { TournamentCard } from '../components/TournamentCard';
import { InstallSheet } from '../components/InstallSheet';
import { IconDownload, IconInstall, IconPlus, IconTrophy, IconUpload } from '../components/Icons';
import { cx, plural } from '../lib/ui';

type Filter = 'all' | Sport | 'done';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Todos' },
  ...SPORTS.map((sport) => ({ id: sport.id as Filter, label: sport.label })),
  { id: 'done', label: 'Finalizados' },
];

export function HomePage() {
  const tournaments = useTournaments();
  const [filter, setFilter] = useState<Filter>('all');
  const [installOpen, setInstallOpen] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const { canInstall, installed, install, isIos } = usePwaInstall();
  const online = useOnlineStatus();

  const stats = useMemo(() => {
    const finished = tournaments.filter((t) => tournamentStatus(t).finished).length;
    return {
      total: tournaments.length,
      running: tournaments.length - finished,
      finished,
    };
  }, [tournaments]);

  const visible = useMemo(() => {
    if (filter === 'all') return tournaments;
    if (filter === 'done') return tournaments.filter((t) => tournamentStatus(t).finished);
    return tournaments.filter((t) => t.sport === filter);
  }, [tournaments, filter]);

  const handleImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      const list = await readBackupFile(file);
      const count = actions.importTournaments(list);
      setImportMessage(
        count > 0
          ? `${plural(count, 'campeonato importado', 'campeonatos importados')}.`
          : 'Nada novo para importar — esses campeonatos já estão aqui.',
      );
    } catch {
      setImportMessage('Não consegui ler esse arquivo. Use um backup exportado pelo Monta Copas.');
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  return (
    <div className="page page--home">
      <AppHeader
        right={
          <div className="header-actions">
            {!online && <span className="offline-chip">Offline</span>}
            {!installed && (
              <button type="button" className="btn btn--tiny btn--outline" onClick={() => setInstallOpen(true)}>
                <IconInstall size={15} />
                <span className="hide-xs">Instalar</span>
              </button>
            )}
          </div>
        }
      />

      <main className="home-main">
        <section className="hero">
          <span className="hero-tag">FIFA, sinuca e vida real</span>
          <h1>
            Monte sua copa
            <br />
            em dois minutos.
          </h1>
          <p className="hero-sub">
            Sorteie os confrontos, registre os placares e acompanhe a classificação — no videogame, na mesa de
            sinuca ou na quadra do fim de semana.
          </p>
          <button type="button" className="btn btn--primary btn--lg btn--full" onClick={() => navigate('/novo')}>
            <IconPlus size={19} />
            Criar campeonato
          </button>
          <div className="hero-stats">
            <div>
              <strong>{stats.total}</strong>
              <span>campeonatos</span>
            </div>
            <div>
              <strong>{stats.running}</strong>
              <span>em andamento</span>
            </div>
            <div>
              <strong>{stats.finished}</strong>
              <span>finalizados</span>
            </div>
          </div>
        </section>

        {!installed && (
          <button type="button" className="install-bar" onClick={() => setInstallOpen(true)}>
            <span className="install-bar-icon">
              <IconInstall size={18} />
            </span>
            <span className="install-bar-text">
              <strong>Adicione à tela inicial</strong>
              <span>Use como um app, até sem internet</span>
            </span>
            <span className="install-bar-cta">Instalar</span>
          </button>
        )}

        {importMessage && (
          <div className="notice">
            <span>{importMessage}</span>
            <button type="button" className="link-btn" onClick={() => setImportMessage(null)}>
              fechar
            </button>
          </div>
        )}

        <div className="section-head">
          <h2>Seus campeonatos</h2>
          <button type="button" className="icon-btn icon-btn--soft" onClick={() => fileInput.current?.click()} aria-label="Importar backup">
            <IconUpload size={17} />
          </button>
        </div>

        <div className="filter-row" role="tablist" aria-label="Filtrar campeonatos">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={filter === item.id}
              className={cx('filter-chip', filter === item.id && 'is-active')}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tournaments.length === 0 ? (
          <section className="empty-state">
            <span className="empty-icon">
              <IconTrophy size={30} />
            </span>
            <h3>Nenhuma copa por aqui ainda</h3>
            <p>
              Crie seu primeiro campeonato: escolha entre pontos corridos, grupos ou mata-mata e o app monta
              toda a tabela de jogos para você.
            </p>
            <button type="button" className="btn btn--primary" onClick={() => navigate('/novo')}>
              <IconPlus size={17} />
              Criar meu primeiro campeonato
            </button>
            <div className="empty-links">
              <button
                type="button"
                className="link-btn"
                onClick={() => {
                  const demo = createDemoTournament();
                  actions.add(demo);
                  navigate(`/c/${demo.id}`);
                }}
              >
                <IconTrophy size={14} /> Ver campeonato de exemplo
              </button>
              <button type="button" className="link-btn" onClick={() => fileInput.current?.click()}>
                <IconUpload size={14} /> Importar backup
              </button>
            </div>
          </section>
        ) : visible.length === 0 ? (
          <p className="empty-inline">Nenhum campeonato neste filtro.</p>
        ) : (
          <div className="tcard-list">
            {visible.map((tournament) => (
              <TournamentCard key={tournament.id} tournament={tournament} />
            ))}
          </div>
        )}

        {tournaments.length === 0 && (
          <section className="how-card">
            <h3>Como funciona</h3>
            <ol>
              <li>
                <strong>Escolha o formato</strong>
                <span>Pontos corridos, grupos + mata-mata ou eliminatória direta.</span>
              </li>
              <li>
                <strong>Adicione os jogadores</strong>
                <span>O sorteio dos confrontos é automático — e equilibrado.</span>
              </li>
              <li>
                <strong>Registre os placares</strong>
                <span>A tabela, os classificados e a chave se atualizam sozinhos.</span>
              </li>
            </ol>
          </section>
        )}

        {tournaments.length > 0 && (
          <div className="home-footer">
            <button type="button" className="link-btn" onClick={() => fileInput.current?.click()}>
              <IconUpload size={14} /> Importar backup
            </button>
            {tournaments.length > 1 && (
              <span className="home-footer-note">
                <IconDownload size={14} /> Seus dados ficam salvos neste aparelho
              </span>
            )}
          </div>
        )}
      </main>

      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(event) => handleImport(event.target.files?.[0])}
      />

      <InstallSheet
        open={installOpen}
        onClose={() => setInstallOpen(false)}
        canInstall={canInstall}
        isIos={isIos}
        installed={installed}
        onInstall={() => {
          void install();
        }}
      />
    </div>
  );
}
