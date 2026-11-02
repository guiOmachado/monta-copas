// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { act } from 'react';
import App from './App';
import { actions } from './lib/store';
import { buildTournament } from './lib/engine';
import { DEFAULT_OPTIONS } from './lib/types';

function setRoute(hash: string) {
  window.location.hash = hash;
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

/** jsdom não dispara hashchange de forma síncrona; força a troca de rota. */
function flushRoute() {
  act(() => {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
}

beforeEach(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  actions.replaceAll([]);
  window.scrollTo = vi.fn();
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  setRoute('#/');
});

afterEach(() => {
  cleanup();
});

describe('Monta Copas', () => {
  it('mostra a home vazia com o convite para criar', () => {
    render(<App />);
    expect(screen.getByText(/Monte sua copa/i)).toBeTruthy();
    expect(screen.getByText(/Nenhuma copa por aqui ainda/i)).toBeTruthy();
  });

  it('percorre o wizard e cria um campeonato de mata-mata', () => {
    render(<App />);
    fireEvent.click(screen.getAllByRole('button', { name: /Criar campeonato/i })[0]);
    flushRoute();

    const nameInput = screen.getByLabelText(/Nome do campeonato/i);
    fireEvent.change(nameInput, { target: { value: 'Copa dos Cria' } });
    fireEvent.click(screen.getByRole('button', { name: /Continuar/i }));

    const knockoutCard = screen
      .getAllByRole('button', { name: /Mata-mata/i })
      .find((button) => button.textContent?.startsWith('Mata-mata'));
    expect(knockoutCard).toBeTruthy();
    fireEvent.click(knockoutCard as HTMLElement);
    fireEvent.click(screen.getByRole('button', { name: /Continuar/i }));

    const playerInput = screen.getByPlaceholderText(/Nome do jogador/i);
    for (const name of ['Ana', 'Bia', 'Caio', 'Duda']) {
      fireEvent.change(playerInput, { target: { value: name } });
      fireEvent.keyDown(playerInput, { key: 'Enter', code: 'Enter' });
    }

    fireEvent.click(screen.getByRole('button', { name: /Criar campeonato/i }));
    flushRoute();

    expect(screen.getByText('Copa dos Cria')).toBeTruthy();
    expect(screen.getAllByText('Ana').length).toBeGreaterThan(0);
  });

  it('registra um placar e atualiza a classificação', () => {
    const tournament = buildTournament({
      name: 'Liga de Teste',
      sport: 'real',
      format: 'league',
      participantNames: ['Ana', 'Bia', 'Caio'],
      options: { ...DEFAULT_OPTIONS },
      draw: false,
    });
    actions.add(tournament);
    setRoute(`#/c/${tournament.id}`);

    render(<App />);
    expect(screen.getByText('Liga de Teste')).toBeTruthy();

    const firstMatch = document.querySelector('.match-row') as HTMLElement;
    expect(firstMatch).toBeTruthy();
    fireEvent.click(firstMatch);

    const sheet = document.querySelector('.sheet') as HTMLElement;
    expect(sheet).toBeTruthy();
    const plusButtons = within(sheet).getAllByLabelText(/Aumentar gols/i);
    fireEvent.click(plusButtons[0]);
    fireEvent.click(plusButtons[0]);
    fireEvent.click(plusButtons[1]);
    fireEvent.click(within(sheet).getByRole('button', { name: /Salvar placar/i }));

    expect(document.querySelector('.match-score')?.textContent).toContain('2');

    fireEvent.click(screen.getByRole('tab', { name: /Tabela/i }));
    const rows = document.querySelectorAll('.standings tbody tr');
    expect(rows.length).toBe(3);
    expect(rows[0].textContent).toContain('3');
  });

  it('gera a chave depois da fase de grupos', () => {
    const tournament = buildTournament({
      name: 'Copa de Grupos',
      sport: 'fifa',
      format: 'groups',
      participantNames: ['Ana', 'Bia', 'Caio', 'Duda', 'Edu', 'Fê', 'Gui', 'Hugo'],
      options: { ...DEFAULT_OPTIONS, groupCount: 2, qualifiersPerGroup: 2 },
      draw: false,
    });
    for (const match of tournament.matches) {
      match.homeGoals = 2;
      match.awayGoals = 0;
    }
    actions.add(tournament);
    setRoute(`#/c/${tournament.id}`);

    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: /Chave/i }));
    const generate = screen.getByRole('button', { name: /Gerar mata-mata/i });
    fireEvent.click(generate);

    expect(document.querySelectorAll('.bracket-card').length).toBeGreaterThan(0);
  });
});
