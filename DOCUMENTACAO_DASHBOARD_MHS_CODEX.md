# Documentação Técnica - Central de Execução MHS

## Objetivo

Dashboard operacional, somente leitura, para acompanhar objetivos, atividades vinculadas a objetivos e tarefas de rotina ou esporádicas.

O painel trabalha apenas com os dados disponíveis no Supabase configurado pelo usuário na interface.

## Estrutura Atual

```text
index.html
assets/css/styles.css
assets/js/app.js
assets/img/
scripts/validate.mjs
```

O arquivo `dashboard_gestao_atividades_mhs_v3.html` foi mantido apenas como redirecionamento de compatibilidade para `index.html`.

## Páginas

- `#macro`: visão executiva por empresa, setores e objetivos recentes.
- `#objectives`: acompanhamento por objetivo, com lista, detalhe, KPIs e fluxo por setor.
- `#tasks`: todas as atividades, incluindo rotinas e tarefas sem objetivo específico.

## Configuração

A conexão com Supabase é configurada pela própria interface em `Configurar API`.

Campos esperados:

- URL do projeto Supabase.
- Chave pública `anon`.
- Intervalo de atualização automática.

Essas informações são gravadas no `localStorage` do navegador. Não há chave gravada no repositório.

## Segurança

- Não subir chave `service_role`.
- Não gravar chave `anon` diretamente em `assets/js/app.js`.
- Usar apenas operações de leitura.
- Validar antes de publicar com:

```bash
npm run validate
```

Se o PowerShell bloquear `npm.ps1`, use:

```bash
node scripts/validate.mjs
```

## Publicação

O projeto é estático e não precisa de build. Para GitHub Pages, publique a raiz do repositório, pois `index.html` é a entrada principal.

## Manutenção

- HTML estrutural fica em `index.html`.
- Estilos ficam em `assets/css/styles.css`.
- Regras, estado, integração Supabase e renderização ficam em `assets/js/app.js`.
- Imagens e ícones ficam em `assets/img`.
- Validações automatizadas ficam em `scripts/validate.mjs`.
