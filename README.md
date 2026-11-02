# Monta Copas 🏆

Aplicativo (PWA) para montar e acompanhar campeonatos — tanto de **FIFA / videogame** quanto da **vida real**
(quadra, campo, society). Sorteia os confrontos, registra os placares e atualiza tabela, classificados e chave
automaticamente.

Funciona como app instalado na tela inicial do celular, em tela cheia, e **100% offline** depois do primeiro
acesso. Os dados ficam salvos no próprio aparelho.

## O que ele faz

- **Três formatos de disputa**
  - Pontos corridos (todos contra todos)
  - Grupos + mata-mata (classificados gerados automaticamente)
  - Mata-mata direto
- **Sorteio automático** dos confrontos, com cabeças de chave distribuídos e byes quando o número de jogadores
  não é potência de 2.
- **Turno e returno**, **ida e volta no mata-mata** (placar agregado) e **disputa de 3º lugar**.
- **Registro de placar** com stepper grande, pensado para usar no celular durante a resenha.
- **Classificação automática**: pontos, vitórias, saldo de gols e gols pró como critérios de desempate.
- **Chave visual** do mata-mata, com agregado, classificado e decisão por pênaltis quando o agregado empata.
- **Compartilhar** resumo do campeonato e **exportar/importar** backup em JSON.
- **Instalável** (PWA): ícone próprio, tela cheia e cache offline via service worker.
- **Campeonato de exemplo** com um toque, para ver grupos, mata-mata e tabela funcionando.

## Rodando o projeto

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # testes de lógica e de interface (vitest)
npm run build    # gera dist/
npm run preview  # serve o build com service worker ativo (PWA completo)
```

> O service worker só é registrado em produção (`npm run build` + `npm run preview`). No modo dev ele fica
> desligado para não atrapalhar o hot reload.

## Instalar como aplicativo

- **Android / Chrome / Edge:** abra o app, toque em **Instalar** (ou menu → “Instalar aplicativo”).
- **iPhone / Safari:** botão **Compartilhar** → **Adicionar à Tela de Início**.

Depois de instalado, abre em tela cheia, com ícone próprio e sem barra do navegador.

## Estrutura

```
src/
  lib/
    types.ts     modelos (campeonato, partidas, chave)
    engine.ts    motor: tabela de jogos, grupos, chave, classificação, pênaltis
    store.ts     persistência em localStorage + ações (React store)
    router.ts    roteador por hash (#/, #/novo, #/c/:id)
    pwa.ts       instalação, modo standalone, status offline
    export.ts    backup JSON e compartilhamento
  components/    UI (sheets, tabela, chave, listas de jogos)
  pages/         Home, Criar campeonato, Campeonato
  styles.css     design system (dark + lime, tipografia condensada)
public/
  manifest.webmanifest
  sw.js          service worker (network-first no shell, cache-first nos assets)
  icons/         ícones 192/512, maskable e apple-touch
```

## Deploy

O build usa caminhos relativos (`base: './'`), então funciona em qualquer subpasta — inclusive no GitHub Pages.
O workflow em `.github/workflows/deploy.yml` publica automaticamente o `dist/` a cada push na `main`
(basta habilitar Pages → “GitHub Actions” nas configurações do repositório).

## Privacidade

Nenhum dado sai do dispositivo: não há login, servidor ou analytics. Para trocar de aparelho, exporte o
campeonato (aba **Info → Exportar**) e importe o arquivo no outro.
