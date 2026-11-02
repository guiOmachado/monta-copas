import { Sheet, SheetHeader } from './Sheet';
import { IconInstall } from './Icons';

interface InstallSheetProps {
  open: boolean;
  onClose: () => void;
  canInstall: boolean;
  isIos: boolean;
  installed: boolean;
  onInstall: () => void;
}

export function InstallSheet({ open, onClose, canInstall, isIos, installed, onInstall }: InstallSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} labelledBy="install-title">
      <SheetHeader eyebrow="Aplicativo" title="Instalar na tela inicial" onClose={onClose} titleId="install-title" />

      {installed ? (
        <p className="sheet-text">
          Tudo pronto — o Monta Copas já está instalado neste aparelho. Ele abre em tela cheia, como um app
          nativo, e continua funcionando sem internet.
        </p>
      ) : (
        <>
          <div className="install-hero">
            <span className="brand-mark brand-mark--lg">
              <IconInstall size={26} />
            </span>
            <div>
              <strong>Monta Copas no seu celular</strong>
              <p>Ícone próprio, tela cheia e acesso rápido — mesmo offline.</p>
            </div>
          </div>

          {canInstall && (
            <button type="button" className="btn btn--primary btn--full" onClick={onInstall}>
              Instalar aplicativo
            </button>
          )}

          <ol className="install-steps">
            {isIos ? (
              <>
                <li>
                  Toque no botão <strong>Compartilhar</strong> do Safari (o quadrado com a seta para cima).
                </li>
                <li>
                  Escolha <strong>Adicionar à Tela de Início</strong>.
                </li>
                <li>
                  Confirme em <strong>Adicionar</strong>. O ícone do Monta Copas aparece junto dos seus apps.
                </li>
              </>
            ) : (
              <>
                <li>
                  Abra o menu do navegador (os três pontinhos, no canto superior).
                </li>
                <li>
                  Toque em <strong>Instalar aplicativo</strong> ou <strong>Adicionar à tela inicial</strong>.
                </li>
                <li>Confirme. Pronto — o app abre em tela cheia.</li>
              </>
            )}
          </ol>
        </>
      )}

      <p className="sheet-hint">
        Seus campeonatos ficam salvos apenas neste dispositivo. Use a exportação no menu do campeonato para
        guardar um backup.
      </p>
    </Sheet>
  );
}
