# Central de Execução MHS

Dashboard estático para acompanhar objetivos, atividades por objetivo e rotinas/tarefas avulsas.

## Estrutura

```text
.
├── index.html
├── assets/
│   ├── css/styles.css
│   ├── js/app.js
│   └── img/
│       ├── logo-mhs.jpg
│       ├── silhouette.png
│       └── sector-icons/
├── scripts/validate.mjs
└── .github/workflows/validate.yml
```

## Como rodar

Abra `index.html` no navegador. O projeto não precisa de build para funcionar.

## Configuração

O painel usa a API REST do Supabase em modo somente leitura. A chave pública `anon` deve ser informada pela interface em `Configurar API`; ela fica salva apenas no `localStorage` do navegador.

Não grave chaves no código antes de subir para o GitHub.

## Validação local

Com Node.js 18 ou superior:

```bash
npm run validate
```

No PowerShell, se a política de execução bloquear `npm.ps1`, use:

```bash
npm.cmd run validate
```

ou:

```bash
node scripts/validate.mjs
```

Esse comando verifica os arquivos principais, assets obrigatórios, sintaxe do JavaScript e evita subir uma chave `service_role` por acidente.

## GitHub Pages

Como a entrada principal é `index.html`, o projeto pode ser publicado diretamente via GitHub Pages usando a raiz do repositório.
