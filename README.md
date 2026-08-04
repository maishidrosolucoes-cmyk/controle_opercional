# Central de Execucao MHS

Dashboard estatico para acompanhar objetivos, atividades por objetivo e rotinas/tarefas avulsas.

## Estrutura

```text
.
|-- index.html
|-- assets/
|   |-- css/styles.css
|   |-- js/
|   |   |-- public-config.js
|   |   `-- app.js
|   `-- img/
|       |-- logo-mhs.jpg
|       |-- silhouette.png
|       `-- sector-icons/
|-- scripts/validate.mjs
`-- .github/workflows/validate.yml
```

## Como rodar

Abra `index.html` no navegador. O projeto nao precisa de build para funcionar.

## Configuracao

O painel usa a API REST do Supabase em modo somente leitura.

Para o link publicado funcionar para todos, informe a chave publica `anon` em `assets/js/public-config.js`. Essa chave e publica por natureza, mas o Supabase precisa estar protegido por RLS/policies de leitura adequadas.

A tela `Configurar API` continua existindo para sobrescrever a conexao somente no navegador atual via `localStorage`.

Nunca use `service_role` no frontend.

## Validacao local

Com Node.js 18 ou superior:

```bash
npm run validate
```

No PowerShell, se a politica de execucao bloquear `npm.ps1`, use:

```bash
npm.cmd run validate
```

ou:

```bash
node scripts/validate.mjs
```

Esse comando verifica os arquivos principais, assets obrigatorios, sintaxe do JavaScript e evita subir uma chave `service_role` por acidente.

## GitHub Pages

Como a entrada principal e `index.html`, o projeto pode ser publicado diretamente via GitHub Pages usando a raiz do repositorio.
