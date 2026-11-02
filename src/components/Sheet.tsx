import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { IconX } from './Icons';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  labelledBy?: string;
}

export function Sheet({ open, onClose, children, labelledBy }: SheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="sheet-root">
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
        <div className="sheet-grip" aria-hidden="true" />
        {children}
      </div>
    </div>,
    document.body,
  );
}

interface SheetHeaderProps {
  eyebrow?: string;
  title: string;
  onClose: () => void;
  titleId?: string;
}

export function SheetHeader({ eyebrow, title, onClose, titleId }: SheetHeaderProps) {
  return (
    <div className="sheet-header">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2 id={titleId}>{title}</h2>
      </div>
      <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar">
        <IconX size={18} />
      </button>
    </div>
  );
}

interface ConfirmSheetProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  danger?: boolean;
}

export function ConfirmSheet({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onClose,
  danger,
}: ConfirmSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} labelledBy="confirm-title">
      <div className="confirm-body">
        <h2 id="confirm-title">{title}</h2>
        <p>{message}</p>
        <div className="sheet-actions sheet-actions--stack">
          <button
            type="button"
            className={danger ? 'btn btn--danger' : 'btn btn--primary'}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </button>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </Sheet>
  );
}
