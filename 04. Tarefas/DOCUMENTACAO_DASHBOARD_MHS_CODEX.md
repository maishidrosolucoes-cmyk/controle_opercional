# Documentação técnica — Dashboard Gestão à Vista MHS

## 1. Objetivo

Este projeto é um dashboard operacional, somente leitura, para apresentar as atividades registradas no banco Supabase da Mais Hidro Soluções.

O painel foi estruturado como uma SPA (Single Page Application) em um único arquivo HTML, contendo:

- HTML;
- CSS;
- JavaScript;
- rotas por `location.hash`;
- conexão direta com a API REST do Supabase;
- persistência local da configuração da API.

O arquivo principal é:

```text
dashboard_gestao_atividades_mhs_v3.html
```

Não há dependências externas, frameworks, bibliotecas de gráficos ou processo de build.

---

## 2. Princípios do projeto

1. Trabalhar somente com dados existentes no banco.
2. Não inserir valores inventados.
3. Manter navegação simples e dividida por páginas.
4. Separar visão executiva, visão setorial e detalhes operacionais.
5. Operar somente com requisições de leitura.
6. Permitir evolução futura por outro agente sem reescrever toda a base.

---

## 3. Arquitetura visual

O painel possui uma barra lateral fixa e cinco páginas principais.

### 3.1 Visão Geral

Rota:

```text
#overview
```

Exibe:

- total de atividades;
- realizadas;
- em execução;
- pendentes;
- atrasadas;
- taxa de conclusão;
- linha do tempo geral;
- leitura gerencial;
- setores em destaque;
- últimos processamentos.

### 3.2 Setores

Rota:

```text
#sectors
```

Exibe um cartão para cada setor, com:

- total;
- concluídas;
- em execução;
- pendentes;
- atrasadas;
- taxa de conclusão;
- minigráfico de linha do tempo;
- acesso à página do setor.

### 3.3 Detalhe do setor

Rota:

```text
#sector/<nome-do-setor>
```

Exibe:

- KPIs do setor;
- linha do tempo do setor;
- resumo gerencial calculado;
- último resumo setorial salvo no banco;
- objetivos do setor;
- tabela de atividades do setor.

### 3.4 Atividades

Rota:

```text
#activities
```

Exibe:

- pesquisa textual;
- filtro por setor;
- filtro por status;
- ordenação;
- tabela operacional completa;
- modal de detalhes ao clicar na atividade.

### 3.5 Objetivos

Rota:

```text
#objectives
```

Os objetivos são agrupados a partir do campo:

```text
activities.objective_text
```

Exibe:

- total de atividades;
- atividades concluídas;
- atividades abertas;
- atrasos;
- setores envolvidos.

### 3.6 Processamentos

Rota:

```text
#processing
```

Exibe:

- lotes diários;
- status do lote;
- total de mensagens;
- atividades criadas;
- erros registrados;
- resumos setoriais.

---

## 4. Fontes de dados

Schema:

```text
tarefas_v2
```

### 4.1 Tabela `activities`

Campos usados:

```text
id
activity_number
title
detailing
status
complexity
registered_by_name
registered_by_sector_name
executor_name
executor_sector_name
start_date
due_date
conclusion_date
objective_text
client_supplier
source_channel
source_message_id
created_at
```

### 4.2 Tabela `daily_processing_batches`

Campos usados:

```text
id
work_date
batch_status
total_messages
total_activities_created
started_at
finished_at
error_message
summary_text
```

### 4.3 Tabela `daily_sector_summaries`

O dashboard consulta:

```text
select=*
```

Isso evita quebra por pequenas diferenças de estrutura.

Campos esperados para exibição:

```text
work_date
sector_name
summary_text
activities_created
```

---

## 5. Regras de classificação

### 5.1 Setor da atividade

Prioridade:

```javascript
activity.executor_sector_name
|| activity.registered_by_sector_name
|| "Sem setor"
```

### 5.2 Responsável

Prioridade:

```javascript
activity.executor_name
|| activity.registered_by_name
|| "Não definido"
```

### 5.3 Status

A função `normalizeStatus()` converte textos diferentes para:

```text
concluida
em_andamento
pendente
bloqueada
cancelada
```

Qualquer status não reconhecido é tratado como `pendente`.

### 5.4 Atividade atrasada

Uma atividade é atrasada quando:

```text
status é pendente, em andamento ou bloqueada
e
due_date é anterior ao dia atual
```

### 5.5 Data de referência do período

O filtro global usa:

```text
activities.created_at
```

A linha do tempo também usa `created_at` para atividades registradas.

Para atividades concluídas, o total concluído de cada janela usa:

```text
conclusion_date
ou
created_at, quando conclusion_date não existe
```

---

## 6. Linha do tempo

As janelas são:

```text
Dia: 1 dia
Semana: 7 dias
Quinzena: 15 dias
Mês: 30 dias
Trimestre: 90 dias
Semestre: 180 dias
Ano: 365 dias
```

Importante: são janelas móveis, e não períodos civis fechados.

Exemplo:

```text
Mês = últimos 30 dias
```

A função principal é:

```javascript
timelineData(activities)
```

---

## 7. Estado da aplicação

Objeto principal:

```javascript
state
```

Campos:

```javascript
{
  config,
  activities,
  batches,
  summaries,
  selectedSector,
  currentRoute,
  loading,
  autoRefreshHandle
}
```

---

## 8. Configuração da API

A configuração é salva no navegador em:

```text
localStorage
```

Chave:

```text
mhs_dashboard_cfg_v1
```

Objeto salvo:

```javascript
{
  url,
  anonKey,
  refreshMinutes
}
```

URL padrão:

```text
https://pwmgbaxywvyyfmlkygqr.supabase.co
```

A chave não está incluída no arquivo.

---

## 9. Cabeçalhos enviados ao Supabase

```javascript
{
  apikey: anonKey,
  Authorization: `Bearer ${anonKey}`,
  "Accept-Profile": "tarefas_v2",
  "Content-Type": "application/json"
}
```

---

## 10. Segurança

Não usar no navegador:

```text
service_role
```

Usar somente:

```text
anon/public
```

Para publicação:

1. habilitar RLS;
2. criar policies somente de `SELECT`;
3. preferir views específicas para dashboard;
4. não permitir INSERT, UPDATE ou DELETE;
5. avaliar autenticação dos usuários internos;
6. considerar mover a chave para backend quando o projeto sair da fase de protótipo.

---

## 11. Navegação

A função central é:

```javascript
renderCurrentRoute()
```

O roteamento é controlado por:

```javascript
location.hash
```

A função:

```javascript
parseRoute()
```

interpreta a URL.

A função:

```javascript
navigate(route, value)
```

altera a rota.

---

## 12. Funções principais

### Dados e API

```javascript
fetchPage()
fetchPaged()
loadDashboard()
apiHeaders()
```

### Datas e filtros

```javascript
parseDate()
withinDays()
inCurrentPeriod()
currentActivities()
```

### Indicadores

```javascript
countByStatus()
sectorStatistics()
objectiveStatistics()
timelineData()
```

### Renderização

```javascript
renderOverview()
renderSectorCards()
renderSectorDetail()
renderActivitiesPage()
renderObjectivesPage()
renderProcessingPage()
```

### UI

```javascript
renderCurrentRoute()
openActivityModal()
openConfig()
configureAutoRefresh()
```

---

## 13. Evoluções recomendadas

### Prioridade alta

1. Criar uma view única para o dashboard.
2. Criar autenticação interna.
3. Substituir o acesso direto às tabelas por uma API ou Edge Function.
4. Adicionar paginação no banco para atividades.
5. Registrar alertas de falha de carregamento.

### Prioridade média

1. Exportação CSV/PDF.
2. Comparação entre períodos.
3. Metas por setor.
4. SLA e tempo médio de conclusão.
5. Filtro por usuário.
6. Filtro por cliente ou fornecedor.
7. Indicador de atividades sem prazo.
8. Indicador de atividades sem objetivo.

### Prioridade futura

1. Atualização em tempo real via Supabase Realtime.
2. Permissões por perfil.
3. Drill-down de objetivos para atividades.
4. Tela própria de administração.
5. Dashboard mobile dedicado.

---

## 14. View recomendada para o futuro

Criar uma view como:

```text
tarefas_v2.vw_dashboard_activities
```

Ela deve padronizar:

```text
sector_name
responsible_name
normalized_status
is_overdue
reference_date
objective_text
```

Isso reduzirá a lógica no JavaScript e melhorará desempenho.

---

## 15. Checklist de testes

### Conexão

- URL correta;
- chave anon válida;
- schema disponível;
- RLS permitindo leitura.

### Dados

- `activities` carrega;
- setores aparecem;
- filtro global altera os totais;
- atividades atrasadas são identificadas;
- objetivos são agrupados;
- lotes aparecem;
- resumos setoriais aparecem.

### Navegação

- `#overview`;
- `#sectors`;
- clique em setor;
- `#activities`;
- `#objectives`;
- `#processing`;
- voltar do detalhe do setor.

### Responsividade

- desktop;
- notebook;
- tablet;
- celular;
- menu lateral móvel.

---

## 16. Prompt recomendado para o Codex

```text
Você está trabalhando no projeto Dashboard Gestão à Vista MHS.

Leia integralmente o arquivo DOCUMENTACAO_DASHBOARD_MHS_CODEX.md antes de alterar o código.

O projeto atual é uma SPA em um único arquivo HTML, sem frameworks e sem dependências externas. Preserve essa característica até que uma migração seja explicitamente autorizada.

Regras:
1. Use somente dados existentes no schema tarefas_v2.
2. Não invente indicadores, metas ou campos.
3. Preserve as rotas existentes.
4. Preserve o modo somente leitura.
5. Nunca inclua service_role no frontend.
6. Mantenha a compatibilidade com a configuração salva em localStorage usando a chave mhs_dashboard_cfg_v1.
7. Antes de alterar consultas, confirme os campos existentes.
8. Evite telas carregadas. Cada página deve ter uma função clara.
9. Faça alterações pequenas, testáveis e documentadas.
10. Valide a sintaxe do JavaScript após cada modificação.

Arquivos:
- dashboard_gestao_atividades_mhs_v3.html
- DOCUMENTACAO_DASHBOARD_MHS_CODEX.md

Arquitetura visual:
- Visão Geral
- Setores
- Detalhe do Setor
- Atividades
- Objetivos
- Processamentos

Fontes:
- tarefas_v2.activities
- tarefas_v2.daily_processing_batches
- tarefas_v2.daily_sector_summaries

Objetivo das próximas evoluções:
melhorar usabilidade, desempenho, segurança e profundidade analítica sem tornar a navegação cansativa.
```

---

## 17. Limitações atuais

1. O frontend carrega até 5.000 atividades.
2. O filtro temporal é aplicado no navegador.
3. Os gráficos são SVG próprios.
4. O painel não altera dados.
5. Não há login.
6. Não há paginação visual.
7. As linhas do tempo são acumuladas por janela móvel.
8. O resumo gerencial é calculado por regras, sem IA.
9. O painel depende da disponibilidade do Supabase e da chave anon.
