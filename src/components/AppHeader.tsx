import type { ReactNode } from 'react';
import { IconTrophy } from './Icons';

export function AppHeader({ right }: { right?: ReactNode }) {
  return (
    <header className="app-header">
      <a className="brand" href="#/" aria-label="Monta Copas — página inicial">
        <span className="brand-mark">
          <IconTrophy size={20} />
        </span>
        <span className="brand-text">
          Monta <span>Copas</span>
        </span>
      </a>
      {right}
    </header>
  );
}

export function PageBar({
  title,
  onBack,
  right,
  subtitle,
}: {
  title: string;
  onBack: () => void;
  right?: ReactNode;
  subtitle?: string;
}) {
  return (
    <header className="page-bar">
      <button type="button" className="icon-btn" onClick={onBack} aria-label="Voltar">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M19 12H5M11 18l-6-6 6-6" />
        </svg>
      </button>
      <div className="page-bar-title">
        <strong>{title}</strong>
        {subtitle && <span>{subtitle}</span>}
      </div>
      <div className="page-bar-actions">{right}</div>
    </header>
  );
}
