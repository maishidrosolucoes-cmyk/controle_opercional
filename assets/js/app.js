"use strict";

    const STORAGE_KEY = "mhs_dashboard_cfg_v1";
    const SCHEMA = "tarefas_v2";
    const FAB_ACCESS_PASSWORD = "mhs@calend";

    const DEFAULT_CONFIG = {
      url: "https://pwmgbaxywvyyfmlkygqr.supabase.co",
      anonKey: "",
      refreshMinutes: 5
    };

    const ROUTES = {
      macro: {
        title: "Macro",
        subtitle: "Leitura rápida do trabalho em andamento."
      },
      objectives: {
        title: "Objetivos",
        subtitle: "Acompanhamento das atividades vinculadas."
      },
      tasks: {
        title: "Rotinas e tarefas",
        subtitle: "Fila ativa de atividades abertas e em andamento."
      },
      calendar: {
        title: "Calendário",
        subtitle: "Eventos futuros e conflitos de agenda."
      }
    };

    const PERIODS = [
      { key: "today", label: "Hoje", days: 1 },
      { key: "week", label: "Últimos 7 dias", days: 7 },
      { key: "fortnight", label: "Últimos 15 dias", days: 15 },
      { key: "month", label: "Últimos 30 dias", days: 30 },
      { key: "quarter", label: "Últimos 90 dias", days: 90 },
      { key: "semester", label: "Últimos 180 dias", days: 180 },
      { key: "year", label: "Últimos 365 dias", days: 365 }
    ];

    const PERIOD_LABELS = {
      today: "Hoje",
      week: "Últimos 7 dias",
      fortnight: "Últimos 15 dias",
      month: "Últimos 30 dias",
      quarter: "Últimos 90 dias",
      semester: "Últimos 180 dias",
      year: "Últimos 365 dias",
      all: "Todo o histórico"
    };

    const SECTOR_SORT_LABELS = {
      volume: "Volume de tarefas",
      atingimento: "Atingimentos",
      atrasos: "Atrasos",
      entregas: "Entregas"
    };

    const state = {
      config: loadConfig(),
      activities: [],
      currentRoute: "macro",
      selectedObjective: "",
      macroSectorSort: "atrasos",
      calendarView: "month",
      calendarDate: new Date(),
      loading: false,
      autoRefreshHandle: null,
      objectiveResizeObserver: null
    };

    const $ = id => document.getElementById(id);

    const elements = {
      sidebar: $("sidebar"),
      headerWeek: $("headerWeek"),
      headerDate: $("headerDate"),
      globalPeriodFilter: $("globalPeriodFilter"),
      connectionDot: $("connectionDot"),
      connectionText: $("connectionText"),
      lastUpdated: $("lastUpdated"),
      setupBanner: $("setupBanner"),
      errorBanner: $("errorBanner"),
      refreshButton: $("refreshButton"),
      openConfigButton: $("openConfigButton"),
      fabShell: $("fabShell"),
      fabToggle: $("fabToggle"),
      fabOpenCalendarButton: $("fabOpenCalendarButton"),
      fabPeriodFilter: $("fabPeriodFilter"),
      fabOpenConfigButton: $("fabOpenConfigButton"),
      fabRefreshButton: $("fabRefreshButton"),

      macroMetricStrip: $("macroMetricStrip"),
      macroSectorSort: $("macroSectorSort"),
      macroSectorSortButton: $("macroSectorSortButton"),
      macroSectorSortMenu: $("macroSectorSortMenu"),
      macroSectorTable: $("macroSectorTable"),
      macroObjectiveSummary: $("macroObjectiveSummary"),
      macroRecentObjectives: $("macroRecentObjectives"),

      objectivesPeriodCaption: $("objectivesPeriodCaption"),
      objectiveSearch: $("objectiveSearch"),
      objectiveCategoryFilter: $("objectiveCategoryFilter"),
      objectiveSectorFilter: $("objectiveSectorFilter"),
      objectivesCountLabel: $("objectivesCountLabel"),
      objectiveList: $("objectiveList"),
      objectiveDetailTitle: $("objectiveDetailTitle"),
      objectiveDetailSubtitle: $("objectiveDetailSubtitle"),
      objectiveDetailBadge: $("objectiveDetailBadge"),
      objectiveDetailBody: $("objectiveDetailBody"),

      tasksCountLabel: $("tasksCountLabel"),
      taskSectorFilter: $("taskSectorFilter"),
      taskObjectiveFilter: $("taskObjectiveFilter"),
      tasksTable: $("tasksTable"),

      configModal: $("configModal"),
      adminAuthModal: $("adminAuthModal"),
      adminPasswordInput: $("adminPasswordInput"),
      adminAuthError: $("adminAuthError"),
      adminLoginButton: $("adminLoginButton"),
      closeAdminAuthButton: $("closeAdminAuthButton"),
      closeConfigButton: $("closeConfigButton"),
      saveConfigButton: $("saveConfigButton"),
      clearConfigButton: $("clearConfigButton"),
      supabaseUrlInput: $("supabaseUrlInput"),
      supabaseKeyInput: $("supabaseKeyInput"),
      refreshMinutesInput: $("refreshMinutesInput"),

      activityModal: $("activityModal"),
      activityModalTitle: $("activityModalTitle"),
      activityModalSubtitle: $("activityModalSubtitle"),
      activityModalBody: $("activityModalBody"),
      closeActivityModalButton: $("closeActivityModalButton"),

      calendarModal: $("calendarModal"),
      calendarModalSubtitle: $("calendarModalSubtitle"),
      closeCalendarButton: $("closeCalendarButton"),
      calendarTodayButton: $("calendarTodayButton"),
      calendarPrevButton: $("calendarPrevButton"),
      calendarNextButton: $("calendarNextButton"),
      calendarMonthInput: $("calendarMonthInput"),
      calendarInsights: $("calendarInsights"),
      calendarGrid: $("calendarGrid"),
      calendarDueCount: $("calendarDueCount"),
      calendarDueList: $("calendarDueList"),
      calendarConflictCount: $("calendarConflictCount"),
      calendarConflictList: $("calendarConflictList"),
      calendarFeedTitle: $("calendarFeedTitle"),
      calendarFeedCount: $("calendarFeedCount"),
      calendarFeed: $("calendarFeed"),
      calendarDayModal: $("calendarDayModal"),
      calendarDayModalTitle: $("calendarDayModalTitle"),
      calendarDayModalSubtitle: $("calendarDayModalSubtitle"),
      calendarDayModalSummary: $("calendarDayModalSummary"),
      calendarDayTimeline: $("calendarDayTimeline"),
      closeCalendarDayModalButton: $("closeCalendarDayModalButton")
    };

    function objectiveFilterIcon(kind) {
      const icons = {
        search: `
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7"></circle>
            <path d="m20 20-3.5-3.5"></path>
          </svg>
        `,
        category: `
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 6h16"></path>
            <path d="M7 12h10"></path>
            <path d="M10 18h4"></path>
          </svg>
        `,
        sector: `
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 19h16"></path>
            <path d="M5 19V9l7-4 7 4v10"></path>
            <path d="M9 19v-6h6v6"></path>
          </svg>
        `
      };

      return icons[kind] || icons.category;
    }

    function taskFilterIcon(kind) {
      const icons = {
        sector: `
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 7.5h16"></path>
            <path d="M7 12h10"></path>
            <path d="M10 16.5h4"></path>
            <circle cx="18" cy="7.5" r="1.7"></circle>
            <circle cx="8" cy="12" r="1.7"></circle>
            <circle cx="13" cy="16.5" r="1.7"></circle>
          </svg>
        `,
        objective: `
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="7"></circle>
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M12 2.8v3"></path>
            <path d="M12 18.2v3"></path>
            <path d="M2.8 12h3"></path>
            <path d="M18.2 12h3"></path>
          </svg>
        `
      };

      return icons[kind] || icons.sector;
    }

    function mountTaskFilters() {
      const filterRoot = document.querySelector(".task-filter-source");
      const header = document.querySelector('.page-view[data-page="tasks"] .page-heading');

      if (!filterRoot || !header || filterRoot.dataset.mounted) return;

      const configs = [
        {
          kind: "sector",
          title: "Filtrar por área",
          field: elements.taskSectorFilter.closest(".field")
        },
        {
          kind: "objective",
          title: "Filtrar por objetivo",
          field: elements.taskObjectiveFilter.closest(".field")
        }
      ];

      filterRoot.dataset.mounted = "true";
      filterRoot.className = "task-filter-dock";
      filterRoot.setAttribute("aria-label", "Filtros da fila ativa");
      header.classList.add("tasks-heading-with-filters");

      for (const config of configs) {
        if (!config.field) continue;

        const details = document.createElement("details");
        details.className = "task-filter";
        details.dataset.taskFilter = config.kind;

        const summary = document.createElement("summary");
        summary.setAttribute("aria-label", config.title);
        summary.setAttribute("title", config.title);
        summary.innerHTML = `
          <span class="task-filter-icon">${taskFilterIcon(config.kind)}</span>
          <span class="task-filter-current"></span>
        `;

        const popover = document.createElement("div");
        popover.className = "task-filter-popover";
        popover.appendChild(config.field);

        details.append(summary, popover);
        filterRoot.appendChild(details);
      }

      header.appendChild(filterRoot);
      updateTaskFilterState();
    }

    function mountObjectiveFilters() {
      const filterRoot = document.querySelector(".objective-filters");
      const header = document.querySelector(".objective-list-panel .panel-header");

      if (!filterRoot || !header || filterRoot.dataset.mounted) return;

      const configs = [
        {
          kind: "search",
          title: "Pesquisar",
          className: "objective-filter-search",
          field: elements.objectiveSearch.closest(".field")
        },
        {
          kind: "category",
          title: "Categoria",
          className: "",
          field: elements.objectiveCategoryFilter.closest(".field")
        },
        {
          kind: "sector",
          title: "Setor",
          className: "",
          field: elements.objectiveSectorFilter.closest(".field")
        }
      ];

      filterRoot.dataset.mounted = "true";
      filterRoot.className = "objective-filter-dock";
      filterRoot.setAttribute("aria-label", "Filtros de objetivos");
      header.classList.add("objective-list-header");

      for (const config of configs) {
        if (!config.field) continue;

        const details = document.createElement("details");
        details.className = `objective-filter ${config.className}`.trim();
        details.dataset.objectiveFilter = config.kind;

        const summary = document.createElement("summary");
        summary.setAttribute("aria-label", config.title);
        summary.setAttribute("title", config.title);
        summary.innerHTML = `
          <span class="objective-filter-icon">${objectiveFilterIcon(config.kind)}</span>
          <span class="objective-filter-current"></span>
        `;

        const popover = document.createElement("div");
        popover.className = "objective-filter-popover";
        popover.appendChild(config.field);

        details.append(summary, popover);
        filterRoot.appendChild(details);
      }

      header.appendChild(filterRoot);
      updateObjectiveFilterState();
    }

    function closeObjectiveFilters(except = null) {
      document.querySelectorAll(".objective-filter").forEach(filter => {
        if (filter !== except) filter.removeAttribute("open");
      });
    }

    function updateObjectiveFilterState() {
      const states = {
        search: Boolean(elements.objectiveSearch.value.trim()),
        category: elements.objectiveCategoryFilter.value !== "all",
        sector: Boolean(elements.objectiveSectorFilter.value)
      };

      const labels = {
        search: elements.objectiveSearch.value.trim() || "Pesquisar",
        category: selectedOptionLabel(elements.objectiveCategoryFilter, "Categoria"),
        sector: selectedOptionLabel(elements.objectiveSectorFilter, "Setor")
      };

      const defaults = {
        search: "Pesquisar",
        category: "Categoria",
        sector: "Setor"
      };

      document.querySelectorAll(".objective-filter").forEach(filter => {
        const kind = filter.dataset.objectiveFilter;
        const isActive = Boolean(states[kind]);
        const current = filter.querySelector(".objective-filter-current");

        filter.classList.toggle("active", isActive);
        if (current) current.textContent = isActive ? truncate(labels[kind], 20) : defaults[kind];
      });
    }

    function closeTaskFilters(except = null) {
      document.querySelectorAll(".task-filter").forEach(filter => {
        if (filter !== except) filter.removeAttribute("open");
      });
    }

    function selectedOptionLabel(select, fallback) {
      return select.selectedOptions?.[0]?.textContent?.trim() || fallback;
    }

    function updateTaskFilterState() {
      const states = {
        sector: Boolean(elements.taskSectorFilter.value),
        objective: Boolean(elements.taskObjectiveFilter.value)
      };

      const labels = {
        sector: selectedOptionLabel(elements.taskSectorFilter, "Área"),
        objective: selectedOptionLabel(elements.taskObjectiveFilter, "Objetivo")
      };

      document.querySelectorAll(".task-filter").forEach(filter => {
        const kind = filter.dataset.taskFilter;
        const isActive = Boolean(states[kind]);
        const current = filter.querySelector(".task-filter-current");

        filter.classList.toggle("active", isActive);
        if (current) current.textContent = isActive ? truncate(labels[kind], 22) : (kind === "sector" ? "Área" : "Objetivo");
      });
    }

    function loadConfig() {
      try {
        const publicConfig = window.MHS_PUBLIC_CONFIG || {};
        const localConfig = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
        const config = {
          ...DEFAULT_CONFIG,
          ...publicConfig
        };

        for (const [key, value] of Object.entries(localConfig)) {
          if (value === null || value === undefined) continue;
          if (typeof value === "string" && !value.trim()) continue;
          config[key] = value;
        }

        return config;
      } catch {
        return {
          ...DEFAULT_CONFIG,
          ...(window.MHS_PUBLIC_CONFIG || {})
        };
      }
    }

    function saveConfig(config) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      state.config = config;
    }

    function normalizeBaseUrl(value) {
      return String(value || "").trim().replace(/\/+$/, "");
    }

    function normalizeText(value) {
      return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
    }

    function escapeHtml(value) {
      return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }

    function formatNumber(value) {
      return new Intl.NumberFormat("pt-BR").format(Number(value || 0));
    }

    function formatPercent(value) {
      return `${Math.round(Number(value || 0))}%`;
    }

    function truncate(value, max = 190) {
      const text = String(value || "").trim();
      return text.length > max ? `${text.slice(0, max).trim()}...` : text;
    }

    function firstWords(value, maxWords = 4) {
      const words = String(value || "").trim().split(/\s+/).filter(Boolean);
      if (words.length <= maxWords) return words.join(" ");
      return `${words.slice(0, maxWords).join(" ")}...`;
    }

    function parseDate(value) {
      if (!value) return null;
      const text = String(value);

      if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        const dateOnly = new Date(`${text}T12:00:00`);
        return Number.isNaN(dateOnly.getTime()) ? null : dateOnly;
      }

      const date = new Date(text);
      return Number.isNaN(date.getTime()) ? null : date;
    }

    function formatDate(value, includeTime = false) {
      const date = parseDate(value);
      if (!date) return "—";

      return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {})
      }).format(date);
    }

    function isoWeekNumber(date) {
      const current = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const day = current.getUTCDay() || 7;
      current.setUTCDate(current.getUTCDate() + 4 - day);
      const yearStart = new Date(Date.UTC(current.getUTCFullYear(), 0, 1));

      return Math.ceil((((current - yearStart) / 86400000) + 1) / 7);
    }

    function formatShortDate(date) {
      return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit"
      }).format(date);
    }

    function renderHeaderMeta() {
      const today = new Date();
      elements.headerWeek.textContent = `Semana ${isoWeekNumber(today)}`;
      elements.headerDate.textContent = formatShortDate(today);
    }

    function startOfToday() {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      return now;
    }

    function startForDays(days) {
      const start = startOfToday();
      start.setDate(start.getDate() - (days - 1));
      return start;
    }

    function withinDays(value, days) {
      const date = parseDate(value);
      if (!date) return false;
      return date >= startForDays(days) && date <= new Date();
    }

    function currentPeriodKey() {
      return elements.globalPeriodFilter.value;
    }

    function inCurrentPeriod(value) {
      const period = currentPeriodKey();
      if (period === "all") return true;
      const item = PERIODS.find(entry => entry.key === period);
      return item ? withinDays(value, item.days) : true;
    }

    function normalizeStatus(value) {
      const status = normalizeText(value);

      if (
        status.includes("conclu") ||
        status.includes("finaliz") ||
        status.includes("realiz")
      ) {
        return "concluida";
      }

      if (status.includes("andamento") || status.includes("execucao")) {
        return "em_andamento";
      }

      if (status.includes("bloque")) return "bloqueada";
      if (status.includes("cancel")) return "cancelada";

      return "pendente";
    }

    function statusLabel(value) {
      const labels = {
        concluida: "Feita",
        em_andamento: "Em andamento",
        pendente: "Pendente",
        bloqueada: "Bloqueada",
        cancelada: "Cancelada"
      };

      return labels[normalizeStatus(value)] || value || "Não informado";
    }

    function statusBadge(value) {
      const status = normalizeStatus(value);
      const classes = {
        concluida: "badge-success",
        em_andamento: "badge-info",
        pendente: "badge-warning",
        bloqueada: "badge-danger",
        cancelada: "badge-neutral"
      };

      return `<span class="badge ${classes[status] || "badge-neutral"}">${escapeHtml(statusLabel(value))}</span>`;
    }

    function activitySector(activity) {
      return activity.executor_sector_name || activity.registered_by_sector_name || "Sem setor";
    }

    function activityResponsible(activity) {
      return activity.executor_name || activity.registered_by_name || "Não definido";
    }

    function activityObjective(activity) {
      return String(activity.objective_text || "").trim();
    }

    function activityReferenceDate(activity) {
      return activity.created_at;
    }

    function completionReferenceDate(activity) {
      return activity.conclusion_date || activity.created_at;
    }

    function isOpen(activity) {
      return ["pendente", "em_andamento", "bloqueada"].includes(normalizeStatus(activity.status));
    }

    function isOverdue(activity) {
      if (!isOpen(activity) || !activity.due_date) return false;
      const due = parseDate(activity.due_date);
      if (!due) return false;
      due.setHours(23, 59, 59, 999);
      return due < new Date();
    }

    function isMissingDueDate(activity) {
      return isOpen(activity) && !activity.due_date;
    }

    function dueClass(activity) {
      if (!activity.due_date || normalizeStatus(activity.status) === "concluida") return "";
      const due = parseDate(activity.due_date);
      if (!due) return "";

      const today = startOfToday();
      const dueDay = new Date(due);
      dueDay.setHours(0, 0, 0, 0);

      if (dueDay < today) return "overdue";
      if (dueDay.getTime() === today.getTime()) return "today";
      return "";
    }

    function isDueSoon(activity) {
      if (!isOpen(activity) || !activity.due_date) return false;
      const due = parseDate(activity.due_date);
      if (!due) return false;

      const today = startOfToday();
      const soonLimit = new Date(today);
      soonLimit.setDate(today.getDate() + 1);

      const dueDay = new Date(due);
      dueDay.setHours(0, 0, 0, 0);

      return dueDay >= today && dueDay <= soonLimit;
    }

    function activityPulseTone(activity) {
      if (!isOpen(activity)) return "";
      if (isOverdue(activity)) return "danger";
      if (isDueSoon(activity)) return "warning";
      return "success";
    }

    function activityPulseClass(activity) {
      const tone = activityPulseTone(activity);
      return tone ? `pulse-${tone}` : "";
    }

    function activitySurfacePulseClass(activity) {
      const tone = activityPulseTone(activity);
      return tone ? `activity-pulse-${tone}` : "";
    }

    function currentActivities() {
      return state.activities.filter(activity =>
        currentPeriodKey() === "all" ? true : inCurrentPeriod(activityReferenceDate(activity))
      );
    }

    function pad2(value) {
      return String(value).padStart(2, "0");
    }

    function dateKey(value) {
      const date = value instanceof Date ? value : parseDate(value);
      if (!date) return "";

      return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
    }

    function monthInputValue(date) {
      return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
    }

    function formatMonthYear(date) {
      return new Intl.DateTimeFormat("pt-BR", {
        month: "long",
        year: "numeric"
      }).format(date);
    }

    function formatMonthShort(date) {
      return new Intl.DateTimeFormat("pt-BR", {
        month: "short"
      }).format(date).replace(".", "");
    }

    function startOfMonth(date) {
      const result = new Date(date);
      result.setDate(1);
      result.setHours(0, 0, 0, 0);
      return result;
    }

    function endOfMonth(date) {
      const result = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      result.setHours(23, 59, 59, 999);
      return result;
    }

    function startOfWeek(date) {
      const result = new Date(date);
      result.setHours(0, 0, 0, 0);
      result.setDate(result.getDate() - result.getDay());
      return result;
    }

    function endOfWeek(date) {
      const result = startOfWeek(date);
      result.setDate(result.getDate() + 6);
      result.setHours(23, 59, 59, 999);
      return result;
    }

    function addDays(date, amount) {
      const result = new Date(date);
      result.setDate(result.getDate() + amount);
      return result;
    }

    function addMonths(date, amount) {
      const result = startOfMonth(date);
      result.setMonth(result.getMonth() + amount);
      return result;
    }

    function dateInRange(value, start, end) {
      const date = value instanceof Date ? value : parseDate(value);
      if (!date) return false;

      return date >= start && date <= end;
    }

    function calendarPeriodRange() {
      if (state.calendarView === "week") {
        return {
          start: startOfWeek(state.calendarDate),
          end: endOfWeek(state.calendarDate)
        };
      }

      return {
        start: startOfMonth(state.calendarDate),
        end: endOfMonth(state.calendarDate)
      };
    }

    function calendarGridRange(period) {
      if (state.calendarView === "week") return period;

      return {
        start: startOfWeek(period.start),
        end: endOfWeek(period.end)
      };
    }

    function calendarSectorActivities() {
      return state.activities;
    }

    function calendarEventText(activity) {
      return normalizeText([
        activity.title,
        activity.detailing,
        activity.client_supplier,
        activity.source_channel
      ].filter(Boolean).join(" "));
    }

    function calendarEventLabel(activity) {
      const text = calendarEventText(activity);

      if (text.includes("reuniao") || text.includes("meeting") || text.includes("meet")) return "Reunião";
      if (text.includes("feira")) return "Feira";
      if (text.includes("congresso")) return "Congresso";
      if (text.includes("exposicao") || text.includes("expo")) return "Exposição";
      if (text.includes("seminario") || text.includes("palestra")) return "Seminário";
      if (text.includes("visita") || text.includes("visitar")) return "Visita";
      if (text.includes("encontro")) return "Encontro";
      if (text.includes("call") || text.includes("zoom") || text.includes("teams") || text.includes("videoconf")) return "Call";
      if (text.includes("apresenta") || text.includes("demo") || text.includes("demonstracao")) return "Apresentação";
      if (text.includes("atendimento")) return "Atendimento";
      if (text.includes("treinamento") || text.includes("workshop")) return "Treinamento";
      if (text.includes("alinhamento") || text.includes("briefing")) return "Alinhamento";
      if (text.includes("negociacao") || text.includes("follow up") || text.includes("follow-up")) return "Negociação";

      return "Evento";
    }

    function isCalendarEventActivity(activity) {
      const text = calendarEventText(activity);
      const eventTerms = [
        "reuniao",
        "meeting",
        "meet",
        "feira",
        "evento",
        "congresso",
        "exposicao",
        "expo",
        "seminario",
        "palestra",
        "encontro",
        "visita",
        "visitar",
        "agenda",
        "agendad",
        "call",
        "zoom",
        "teams",
        "videoconf",
        "apresenta",
        "demo",
        "demonstracao",
        "atendimento",
        "treinamento",
        "workshop",
        "alinhamento",
        "briefing",
        "negociacao",
        "follow up",
        "follow-up"
      ];

      return eventTerms.some(term => text.includes(term));
    }

    function isMultiDayCalendarEvent(activity) {
      const text = calendarEventText(activity);
      return [
        "feira",
        "evento",
        "congresso",
        "exposicao",
        "expo",
        "seminario",
        "workshop",
        "treinamento"
      ].some(term => text.includes(term));
    }

    const CALENDAR_MONTHS = {
      janeiro: 0,
      jan: 0,
      fevereiro: 1,
      fev: 1,
      marco: 2,
      mar: 2,
      abril: 3,
      abr: 3,
      maio: 4,
      mai: 4,
      junho: 5,
      jun: 5,
      julho: 6,
      jul: 6,
      agosto: 7,
      ago: 7,
      setembro: 8,
      set: 8,
      outubro: 9,
      out: 9,
      novembro: 10,
      nov: 10,
      dezembro: 11,
      dez: 11
    };

    const CALENDAR_MONTH_PATTERN = "janeiro|jan|fevereiro|fev|marco|mar|abril|abr|maio|mai|junho|jun|julho|jul|agosto|ago|setembro|set|outubro|out|novembro|nov|dezembro|dez";

    function startOfDay(date) {
      const result = new Date(date);
      result.setHours(0, 0, 0, 0);
      return result;
    }

    function calendarDateReference(activity) {
      return (
        parseDate(activity.created_at) ||
        parseDate(activity.start_date) ||
        new Date()
      );
    }

    function safeCalendarDate(year, month, day) {
      const date = new Date(year, month, day, 12, 0, 0, 0);

      if (
        date.getFullYear() !== year ||
        date.getMonth() !== month ||
        date.getDate() !== day
      ) {
        return null;
      }

      return date;
    }

    function normalizeCalendarYear(year, reference) {
      if (!year) return reference.getFullYear();

      const numeric = Number(year);
      if (numeric < 100) return 2000 + numeric;
      return numeric;
    }

    function dateFromCalendarParts(day, month, year, reference, mode = "explicit") {
      const numericDay = Number(day);
      const numericMonth = Number(month);

      if (numericDay < 1 || numericDay > 31 || numericMonth < 1 || numericMonth > 12) {
        return null;
      }

      const hasYear = Boolean(year);
      const normalizedYear = normalizeCalendarYear(year, reference);
      let date = safeCalendarDate(normalizedYear, numericMonth - 1, numericDay);
      if (!date) return null;

      const referenceDay = startOfDay(reference);

      if (!hasYear && date < referenceDay) {
        if (mode === "dayOnly") {
          date = safeCalendarDate(date.getFullYear(), date.getMonth() + 1, numericDay);
        } else {
          date = safeCalendarDate(date.getFullYear() + 1, date.getMonth(), numericDay);
        }
      }

      return date;
    }

    function calendarTextForDate(activity) {
      return normalizeText([
        activity.title,
        activity.detailing,
        activity.client_supplier,
        activity.source_channel
      ].filter(Boolean).join(" "))
        .replace(/[–—−]/g, "-")
        .replace(/\s+/g, " ");
    }

    function uniqueCalendarDates(dates) {
      const map = new Map();

      for (const date of dates) {
        if (!date) continue;
        map.set(dateKey(date), date);
      }

      return [...map.values()].sort((a, b) => a - b);
    }

    function calendarRangeDates(start, end, maxDays = 45) {
      if (!start || !end || end < start) return [];

      const dates = [];
      let cursor = startOfDay(start);
      const last = startOfDay(end);

      while (cursor <= last && dates.length < maxDays) {
        dates.push(new Date(cursor));
        cursor = addDays(cursor, 1);
      }

      return dates;
    }

    function pushCalendarDateRange(candidates, startDate, endDate) {
      candidates.push(...calendarRangeDates(startDate, endDate));
    }

    function calendarDaysFromTextList(value) {
      return (String(value || "").match(/[0-3]?\d/g) || [])
        .filter(day => {
          const numeric = Number(day);
          return numeric >= 1 && numeric <= 31;
        });
    }

    function pushCalendarDayList(candidates, daysText, monthIndex, year, reference) {
      if (!Number.isInteger(monthIndex)) return;

      for (const day of calendarDaysFromTextList(daysText)) {
        const date = dateFromCalendarParts(day, monthIndex + 1, year, reference, "explicit");
        if (date) candidates.push(date);
      }
    }

    function extractCalendarDatesFromText(activity) {
      const text = calendarTextForDate(activity);
      const reference = calendarDateReference(activity);
      const candidates = [];
      const looseDayList = "((?:[0-3]?\\d\\s*(?:,|;|e|\\s)\\s*)+[0-3]?\\d)";

      if (isMultiDayCalendarEvent(activity)) {
        for (const match of text.matchAll(new RegExp(`\\b(${CALENDAR_MONTH_PATTERN})\\b(?:\\s*(?:de)?\\s*(\\d{2,4}))?[^\\d]{0,18}${looseDayList}`, "g"))) {
          pushCalendarDayList(candidates, match[3], CALENDAR_MONTHS[match[1]], match[2], reference);
        }

        for (const match of text.matchAll(new RegExp(`\\b${looseDayList}\\s*(?:de|em)?\\s+(${CALENDAR_MONTH_PATTERN})\\b(?:\\s*(?:de)?\\s*(\\d{2,4}))?`, "g"))) {
          pushCalendarDayList(candidates, match[1], CALENDAR_MONTHS[match[2]], match[3], reference);
        }
      }

      for (const match of text.matchAll(new RegExp(`\\b(?:entre(?:\\s+(?:os\\s+)?dias?)?|do\\s+dia|dos\\s+dias|de)\\s+([0-3]?\\d)\\s*(?:a|ate|ao|e)\\s*(?:o\\s+)?(?:dia\\s+)?([0-3]?\\d)\\s*(?:de|em)\\s+(${CALENDAR_MONTH_PATTERN})\\b(?:\\s*(?:de)?\\s*(\\d{2,4}))?`, "g"))) {
        const month = CALENDAR_MONTHS[match[3]];
        const startDate = dateFromCalendarParts(match[1], month + 1, match[4], reference, "explicit");
        const endDate = dateFromCalendarParts(match[2], month + 1, match[4], reference, "explicit");

        pushCalendarDateRange(candidates, startDate, endDate);
      }

      for (const match of text.matchAll(/\b(?:entre|de)\s+([0-3]?\d)[\/-]([01]?\d)(?:[\/-](\d{2,4}))?\s*(?:a|ate|ao|e)\s*([0-3]?\d)[\/-]([01]?\d)(?:[\/-](\d{2,4}))?/g)) {
        const startDate = dateFromCalendarParts(match[1], match[2], match[3], reference, "explicit");
        const endDate = dateFromCalendarParts(match[4], match[5], match[6] || match[3], reference, "explicit");

        pushCalendarDateRange(candidates, startDate, endDate);
      }

      for (const match of text.matchAll(new RegExp(`\\b(?:dias?|datas?)\\s+${looseDayList}\\s*(?:de|em)?\\s+(${CALENDAR_MONTH_PATTERN})\\b(?:\\s*(?:de)?\\s*(\\d{2,4}))?`, "g"))) {
        pushCalendarDayList(candidates, match[1], CALENDAR_MONTHS[match[2]], match[3], reference);
      }

      for (const match of text.matchAll(new RegExp(`\\b(${CALENDAR_MONTH_PATTERN})\\b(?:\\s*(?:de)?\\s*(\\d{2,4}))?[^\\d]{0,36}\\b(?:dias?|datas?)\\s+${looseDayList}`, "g"))) {
        pushCalendarDayList(candidates, match[3], CALENDAR_MONTHS[match[1]], match[2], reference);
      }

      for (const match of text.matchAll(new RegExp(`\\b(${CALENDAR_MONTH_PATTERN})\\b(?:\\s*(?:de)?\\s*(\\d{2,4}))?[^\\d]{0,36}\\b(?:dias?|periodo)\\s+([0-3]?\\d)\\s*(?:a|ate|ao)\\s*(?:o\\s+)?(?:dia\\s+)?([0-3]?\\d)\\b`, "g"))) {
        const month = CALENDAR_MONTHS[match[1]];
        const startDate = dateFromCalendarParts(match[3], month + 1, match[2], reference, "explicit");
        const endDate = dateFromCalendarParts(match[4], month + 1, match[2], reference, "explicit");

        pushCalendarDateRange(candidates, startDate, endDate);
      }

      for (const match of text.matchAll(new RegExp(`\\b([0-3]?\\d)\\s*(?:de\\s+)?(${CALENDAR_MONTH_PATTERN})(?:\\s*(?:de)?\\s*(\\d{2,4}))?\\s*(?:a|ate|ao|-)\\s*(?:o\\s+)?(?:dia\\s+)?([0-3]?\\d)\\s*(?:de\\s+)?(${CALENDAR_MONTH_PATTERN})(?:\\s*(?:de)?\\s*(\\d{2,4}))?`, "g"))) {
        const startMonth = CALENDAR_MONTHS[match[2]];
        const endMonth = CALENDAR_MONTHS[match[5]];
        const startDate = dateFromCalendarParts(match[1], startMonth + 1, match[3] || match[6], reference, "explicit");
        const endDate = dateFromCalendarParts(match[4], endMonth + 1, match[6] || match[3], reference, "explicit");

        pushCalendarDateRange(candidates, startDate, endDate);
      }

      for (const match of text.matchAll(/\b([0-3]?\d)\s*(?:-|a|ate|ao)\s*(?:o\s+)?(?:dia\s+)?([0-3]?\d)\s*[\/\-.]\s*([01]?\d)(?:[\/\-.](\d{2,4}))?/g)) {
        const startDate = dateFromCalendarParts(match[1], match[3], match[4], reference, "explicit");
        const endDate = dateFromCalendarParts(match[2], match[3], match[4], reference, "explicit");

        pushCalendarDateRange(candidates, startDate, endDate);
      }

      for (const match of text.matchAll(new RegExp(`\\b((?:[0-3]?\\d\\s*(?:,|e)\\s*)+[0-3]?\\d)\\s*(?:de|em)\\s+(${CALENDAR_MONTH_PATTERN})\\b(?:\\s*(?:de)?\\s*(\\d{2,4}))?`, "g"))) {
        pushCalendarDayList(candidates, match[1], CALENDAR_MONTHS[match[2]], match[3], reference);
      }

      for (const match of text.matchAll(/\b((?:[0-3]?\d\s*(?:,|e)\s*)+[0-3]?\d)\s*[\/-]\s*([01]?\d)(?:[\/-](\d{2,4}))?/g)) {
        pushCalendarDayList(candidates, match[1], Number(match[2]) - 1, match[3], reference);
      }

      for (const match of text.matchAll(/\b((?:[0-3]?\d\s*(?:,|e)\s*)+[0-3]?\d)\s*(?:de\s+)?(janeiro|jan|fevereiro|fev|marco|mar|abril|abr|maio|mai|junho|jun|julho|jul|agosto|ago|setembro|set|outubro|out|novembro|nov|dezembro|dez)\b(?:\s*(?:de)?\s*(\d{2,4}))?/g)) {
        pushCalendarDayList(candidates, match[1], CALENDAR_MONTHS[match[2]], match[3], reference);
      }

      for (const match of text.matchAll(/\b([0-3]?\d)\s*(?:a|ate|ao)\s*(?:o\s+)?(?:dia\s+)?([0-3]?\d)\s*(?:de\s+)?(janeiro|jan|fevereiro|fev|marco|mar|abril|abr|maio|mai|junho|jun|julho|jul|agosto|ago|setembro|set|out|outubro|novembro|nov|dezembro|dez)\b(?:\s*(?:de)?\s*(\d{2,4}))?/g)) {
        const month = CALENDAR_MONTHS[match[3]];
        const startDate = dateFromCalendarParts(match[1], month + 1, match[4], reference, "explicit");
        const endDate = dateFromCalendarParts(match[2], month + 1, match[4], reference, "explicit");

        pushCalendarDateRange(candidates, startDate, endDate);
      }

      for (const match of text.matchAll(/\b([0-3]?\d)\s*(?:a|ate|ao)\s*(?:o\s+)?(?:dia\s+)?([0-3]?\d)\s*[\/-]\s*([01]?\d)(?:[\/-](\d{2,4}))?/g)) {
        const startDate = dateFromCalendarParts(match[1], match[3], match[4], reference, "explicit");
        const endDate = dateFromCalendarParts(match[2], match[3], match[4], reference, "explicit");

        pushCalendarDateRange(candidates, startDate, endDate);
      }

      for (const match of text.matchAll(/([0-3]?\d)[\/\-.]([01]?\d)(?:[\/\-.](\d{2,4}))?\s*(?:a|ate|ao|-)\s*([0-3]?\d)(?:[\/\-.]([01]?\d))?(?:[\/\-.](\d{2,4}))?/g)) {
        const startDate = dateFromCalendarParts(match[1], match[2], match[3], reference, "explicit");
        const endMonth = match[5] || match[2];
        const endYear = match[6] || match[3];
        const endDate = dateFromCalendarParts(match[4], endMonth, endYear, reference, "explicit");

        pushCalendarDateRange(candidates, startDate, endDate);
      }

      for (const match of text.matchAll(/(?:^|[^\d])([0-3]?\d)[\/\-.]([01]?\d)(?:[\/\-.](\d{2,4}))?(?=$|[^\d])/g)) {
        const date = dateFromCalendarParts(match[1], match[2], match[3], reference, "explicit");
        if (date) candidates.push(date);
      }

      for (const match of text.matchAll(/(?:^|[^\d])([0-3]?\d)[\/-]([01]?\d)(?:[\/-](\d{2,4}))?(?=$|[^\d])/g)) {
        const date = dateFromCalendarParts(match[1], match[2], match[3], reference, "explicit");
        if (date) candidates.push(date);
      }

      for (const match of text.matchAll(/\b([0-3]?\d)\s*(?:de\s+)?(janeiro|jan|fevereiro|fev|marco|mar|abril|abr|maio|mai|junho|jun|julho|jul|agosto|ago|setembro|set|outubro|out|novembro|nov|dezembro|dez)\b(?:\s*(?:de)?\s*(\d{2,4}))?/g)) {
        const month = CALENDAR_MONTHS[match[2]];
        const date = dateFromCalendarParts(match[1], month + 1, match[3], reference, "explicit");
        if (date) candidates.push(date);
      }

      for (const match of text.matchAll(/\b(?:dia|para\s+(?:o\s+)?dia|para|marcado\s+(?:para\s+)?(?:o\s+)?dia|marcada\s+(?:para\s+)?(?:o\s+)?dia|agendado\s+(?:para\s+)?(?:o\s+)?dia|agendada\s+(?:para\s+)?(?:o\s+)?dia|em)\s+([0-3]?\d)\b(?!\s*[\/-]\s*\d)/g)) {
        const date = dateFromCalendarParts(
          match[1],
          reference.getMonth() + 1,
          null,
          reference,
          "dayOnly"
        );

        if (date) candidates.push(date);
      }

      const today = startOfToday();
      return uniqueCalendarDates(candidates.filter(date => date >= today));
    }

    function scheduledCalendarDates(activity) {
      const today = startOfToday();
      const textDates = extractCalendarDatesFromText(activity);
      const startDate = parseDate(activity.start_date);
      const dueDate = parseDate(activity.due_date);
      const rangeStart = startDate && dueDate && dueDate >= today && dueDate >= startDate
        ? (startDate < today ? today : startDate)
        : null;
      const rangeDates = rangeStart
        ? uniqueCalendarDates(calendarRangeDates(rangeStart, dueDate))
        : [];

      if (textDates.length) {
        return isMultiDayCalendarEvent(activity)
          ? uniqueCalendarDates([...textDates, ...rangeDates])
          : textDates;
      }

      if (rangeDates.length) return rangeDates;

      if (startDate && startDate >= today) return [startDate];
      if (dueDate && dueDate >= today) return [dueDate];

      return [];
    }

    function calendarTimeInfo(hour, minute = 0) {
      const numericHour = Number(hour);
      const numericMinute = Number(minute || 0);

      if (
        Number.isNaN(numericHour) ||
        Number.isNaN(numericMinute) ||
        numericHour < 0 ||
        numericHour > 23 ||
        numericMinute < 0 ||
        numericMinute > 59
      ) {
        return null;
      }

      return {
        hour: numericHour,
        minute: numericMinute,
        key: pad2(numericHour),
        label: `${pad2(numericHour)}h${numericMinute ? pad2(numericMinute) : ""}`
      };
    }

    function calendarTimeFromDateField(value) {
      const text = String(value || "");
      const match = text.match(/[T\s]([01]?\d|2[0-3]):([0-5]\d)/);
      return match ? calendarTimeInfo(match[1], match[2]) : null;
    }

    function calendarTimeFromText(activity) {
      const text = normalizeText([
        activity.title,
        activity.detailing
      ].filter(Boolean).join(" ")).replace(/\s+/g, " ");

      const withMarker = text.match(
        /\b(?:as|para as|marcado para as|marcada para as|agendado para as|agendada para as|horario|hora)\s+([01]?\d|2[0-3])(?:\s*(?:h|:)\s*([0-5]\d))?\b(?!\s*[\/-]\s*\d)/
      );
      if (withMarker) return calendarTimeInfo(withMarker[1], withMarker[2] || 0);

      const compact = text.match(/\b([01]?\d|2[0-3])\s*(?:h|:)\s*([0-5]\d)\b/);
      if (compact) return calendarTimeInfo(compact[1], compact[2]);

      return null;
    }

    function calendarEventTime(activity, eventDate) {
      const eventDayKey = dateKey(eventDate);
      const startTime = dateKey(activity.start_date) === eventDayKey
        ? calendarTimeFromDateField(activity.start_date)
        : null;
      const dueTime = dateKey(activity.due_date) === eventDayKey
        ? calendarTimeFromDateField(activity.due_date)
        : null;

      return (
        calendarTimeFromText(activity) ||
        startTime ||
        dueTime
      );
    }

    function pushCalendarEvent(events, activity, type, date, label) {
      if (!date) return;
      const time = calendarEventTime(activity, date);

      events.push({
        activity,
        type,
        date,
        key: dateKey(date),
        timeKey: time?.key || "",
        timeLabel: time?.label || "",
        label
      });
    }

    function calendarEventsFromActivities(activities) {
      const events = [];

      for (const activity of activities) {
        if (!isCalendarEventActivity(activity)) continue;

        const eventDates = scheduledCalendarDates(activity);

        for (const eventDate of eventDates) {
          pushCalendarEvent(events, activity, "scheduled", eventDate, calendarEventLabel(activity));
        }
      }

      return events.sort(calendarEventSort);
    }

    function calendarEventSort(a, b) {
      const toneOrder = { today: 0, soon: 1, scheduled: 2, neutral: 3 };

      return (
        a.date - b.date ||
        (toneOrder[calendarEventTone(a)] ?? 9) - (toneOrder[calendarEventTone(b)] ?? 9) ||
        String(a.activity.title || "").localeCompare(String(b.activity.title || ""), "pt-BR")
      );
    }

    function calendarEventTone(event) {
      const today = startOfToday();
      const eventDay = new Date(event.date);
      eventDay.setHours(0, 0, 0, 0);

      const soonLimit = new Date(today);
      soonLimit.setDate(today.getDate() + 3);

      if (eventDay.getTime() === today.getTime()) return "today";
      if (eventDay > today && eventDay <= soonLimit) return "soon";
      return "scheduled";
    }

    function periodCalendarEvents(events, period) {
      return events.filter(event => dateInRange(event.date, period.start, period.end));
    }

    function calendarUpcomingEvents(events) {
      const today = startOfToday();

      return events
        .filter(event => event.date >= today)
        .sort(calendarEventSort);
    }

    function calendarConflictGroups(events) {
      const grouped = new Map();

      for (const event of events) {
        if (!event.timeKey) continue;

        const groupKey = `${event.key}T${event.timeKey}`;
        const list = grouped.get(groupKey) || [];
        list.push(event);
        grouped.set(groupKey, list);
      }

      return [...grouped.entries()]
        .map(([key, dayEvents]) => {
          const dayActivities = new Map();
          const firstEvent = dayEvents[0];

          for (const event of dayEvents) {
            dayActivities.set(event.activity.id, event.activity);
          }

          return {
            key,
            dateKey: firstEvent.key,
            date: parseDate(firstEvent.key),
            timeKey: firstEvent.timeKey,
            timeLabel: firstEvent.timeLabel,
            events: dayEvents,
            activities: [...dayActivities.values()]
          };
        })
        .filter(group => group.activities.length > 1)
        .sort((a, b) =>
          a.date - b.date ||
          Number(a.timeKey) - Number(b.timeKey) ||
          b.activities.length - a.activities.length
        );
    }

    function calendarInsightHtml(label, value, detail, tone = "") {
      return `
        <div class="calendar-insight ${escapeHtml(tone)}">
          <strong>${escapeHtml(value)}</strong>
          <span>${escapeHtml(label)}</span>
          <small>${escapeHtml(detail)}</small>
        </div>
      `;
    }

    function calendarPersonName(value) {
      const text = String(value || "").trim();
      if (!text || normalizeText(text) === "nao definido") return "";
      return text;
    }

    function calendarPeopleSummary(activity, compact = false) {
      const markedBy = calendarPersonName(activity.registered_by_name);
      const target = calendarPersonName(activity.executor_name);
      const samePerson = target && markedBy && normalizeText(target) === normalizeText(markedBy);

      if (target && markedBy && !samePerson) {
        return compact
          ? `${target} · por ${markedBy}`
          : `Para ${target} · marcado por ${markedBy}`;
      }

      if (target) return compact ? `Resp. ${target}` : `Responsável ${target}`;
      if (markedBy) return `Marcado por ${markedBy}`;

      return "Responsáveis não informados";
    }

    function calendarEventSector(activity) {
      return activitySector(activity) || activity.executor_sector_name || activity.registered_by_sector_name || "Setor não informado";
    }

    function calendarEventMetaLine(event) {
      const parts = [
        formatDate(event.date),
        event.timeLabel,
        calendarEventSector(event.activity),
        event.activity.client_supplier
      ].filter(Boolean);

      return parts.join(" · ");
    }

    function calendarEventButtonHtml(event, compact = false) {
      const tone = calendarEventTone(event);
      const title = event.activity.title || "Atividade sem título";
      const peopleText = calendarPeopleSummary(event.activity, compact);
      const tooltip = `${title} · ${peopleText}`;

      return `
        <button type="button" class="calendar-event ${escapeHtml(tone)} ${compact ? "compact" : ""}" data-activity-id="${escapeHtml(event.activity.id)}" title="${escapeHtml(tooltip)}">
          <span class="calendar-event-accent" aria-hidden="true"></span>
          <span class="calendar-event-type">${escapeHtml(event.label)}</span>
          <span class="calendar-event-title">${escapeHtml(truncate(title, compact ? 42 : 92))}</span>
          <span class="calendar-event-people">${escapeHtml(truncate(peopleText, compact ? 46 : 92))}</span>
          ${compact ? "" : `<span class="calendar-event-meta">${escapeHtml(calendarEventMetaLine(event))}</span>`}
        </button>
      `;
    }

    function calendarEmptyHtml(message) {
      return `<div class="calendar-empty">${escapeHtml(message)}</div>`;
    }

    function calendarDayHtml(date, events, conflicts, period) {
      const key = dateKey(date);
      const dayEvents = events.filter(event => event.key === key);
      const conflict = conflicts.find(group => group.dateKey === key);
      const isOutsideMonth = state.calendarView === "month" && date.getMonth() !== state.calendarDate.getMonth();
      const isToday = key === dateKey(new Date());
      const isSelected = key === dateKey(state.calendarDate);
      const visibleLimit = state.calendarView === "week" ? 6 : 3;
      const visibleEvents = dayEvents.slice(0, visibleLimit);
      const hidden = dayEvents.length - visibleEvents.length;

      return `
        <div class="calendar-day ${dayEvents.length ? "has-events" : ""} ${isOutsideMonth ? "outside" : ""} ${isToday ? "today" : ""} ${isSelected ? "selected" : ""} ${conflict ? "conflict" : ""}" data-calendar-day="${key}">
          <div class="calendar-day-top">
            <span class="calendar-day-number">${date.getDate()}</span>
            <span class="calendar-day-flags">
              ${dayEvents.length ? `<span class="calendar-day-count" data-count="${formatNumber(dayEvents.length)}">${formatNumber(dayEvents.length)} evento${dayEvents.length > 1 ? "s" : ""}</span>` : ""}
              ${conflict ? `<span class="calendar-flag conflict">Conflito</span>` : ""}
              ${dayEvents.some(event => calendarEventTone(event) === "today") ? `<span class="calendar-flag today">Hoje</span>` : ""}
            </span>
          </div>
          <div class="calendar-day-events">
            ${visibleEvents.map(event => calendarEventButtonHtml(event, true)).join("")}
            ${hidden > 0 ? `<span class="calendar-more">+${formatNumber(hidden)} evento${hidden > 1 ? "s" : ""}</span>` : ""}
          </div>
        </div>
      `;
    }

    function renderCalendarGrid(period, events, conflicts) {
      const gridRange = calendarGridRange(period);
      const days = [];
      let cursor = new Date(gridRange.start);

      while (cursor <= gridRange.end) {
        days.push(new Date(cursor));
        cursor = addDays(cursor, 1);
      }

      elements.calendarGrid.classList.toggle("week-mode", state.calendarView === "week");
      elements.calendarGrid.innerHTML = days
        .map(day => calendarDayHtml(day, events, conflicts, period))
        .join("");
    }

    function calendarUpcomingItemHtml(event) {
      const tone = calendarEventTone(event);

      return `
        <button type="button" class="calendar-side-item ${tone}" data-activity-id="${escapeHtml(event.activity.id)}">
          <span class="calendar-side-date" aria-hidden="true">
            <strong>${escapeHtml(String(event.date.getDate()).padStart(2, "0"))}</strong>
            <small>${escapeHtml(formatMonthShort(event.date))}</small>
          </span>
          <span class="calendar-side-copy">
            <strong>${escapeHtml(truncate(event.activity.title || "Evento sem título", 92))}</strong>
            <span>${escapeHtml([event.timeLabel, event.label, calendarEventSector(event.activity)].filter(Boolean).join(" · "))}</span>
            <small>${escapeHtml(calendarPeopleSummary(event.activity))}</small>
          </span>
        </button>
      `;
    }

    function calendarConflictItemHtml(group) {
      const titles = group.activities
        .slice(0, 2)
        .map(activity => truncate(activity.title || "Atividade sem título", 48));
      const hidden = group.activities.length - titles.length;

      return `
        <div class="calendar-side-item conflict">
          <strong>${escapeHtml(formatDate(group.date))} · ${escapeHtml(group.timeLabel)} · ${formatNumber(group.activities.length)} evento(s)</strong>
          <span>${escapeHtml(titles.join(" · "))}${hidden > 0 ? ` +${formatNumber(hidden)}` : ""}</span>
        </div>
      `;
    }

    function calendarDayEvents(date) {
      const events = calendarEventsFromActivities(calendarSectorActivities());
      const key = dateKey(date);

      return events.filter(event => event.key === key);
    }

    function calendarEventObservation(activity) {
      const text = String(activity.detailing || "").trim();
      if (text) return text;

      return "Sem observações registradas.";
    }

    function calendarDayAgendaEventHtml(event) {
      const observation = calendarEventObservation(event.activity);

      return `
        <button type="button" class="calendar-day-agenda-event ${escapeHtml(calendarEventTone(event))}" data-activity-id="${escapeHtml(event.activity.id)}">
          <span class="calendar-day-agenda-dot" aria-hidden="true"></span>
          <span class="calendar-day-agenda-copy">
            <strong>${escapeHtml(truncate(event.activity.title || "Evento sem título", 96))}</strong>
            <span>${escapeHtml([event.timeLabel || "Sem horário", event.label, calendarEventSector(event.activity)].filter(Boolean).join(" · "))}</span>
            <small>${escapeHtml(calendarPeopleSummary(event.activity))}</small>
            <em>${escapeHtml(truncate(observation, 180))}</em>
          </span>
        </button>
      `;
    }

    function calendarHourRowHtml(hour, events) {
      const hourKey = pad2(hour);
      const hourEvents = events.filter(event => event.timeKey === hourKey);

      return `
        <div class="calendar-hour-row ${hourEvents.length ? "has-events" : ""}">
          <time>${hourKey}:00</time>
          <div class="calendar-hour-slot">
            ${hourEvents.length
              ? hourEvents.map(calendarDayAgendaEventHtml).join("")
              : `<span class="calendar-hour-empty">Livre</span>`}
          </div>
        </div>
      `;
    }

    function openCalendarDayModal(date) {
      const events = calendarDayEvents(date);
      const timedEvents = events.filter(event => event.timeKey);
      const untimedEvents = events.filter(event => !event.timeKey);
      const hours = Array.from({ length: 24 }, (_, hour) => hour);

      elements.calendarDayModalTitle.textContent = `Agenda de ${formatDate(date)}`;
      elements.calendarDayModalSubtitle.textContent = events.length
        ? `${formatNumber(events.length)} evento(s) identificado(s)`
        : "Nenhum evento marcado neste dia.";
      elements.calendarDayModalSummary.innerHTML = `
        <div>
          <strong>${escapeHtml(formatNumber(timedEvents.length))}</strong>
          <span>com horário</span>
        </div>
        <div>
          <strong>${escapeHtml(formatNumber(untimedEvents.length))}</strong>
          <span>sem horário</span>
        </div>
      `;
      elements.calendarDayTimeline.innerHTML = `
        ${untimedEvents.length ? `
          <section class="calendar-untimed-events">
            <header>Sem horário definido</header>
            <div>${untimedEvents.map(calendarDayAgendaEventHtml).join("")}</div>
          </section>
        ` : ""}
        <section class="calendar-hours-list">
          ${hours.map(hour => calendarHourRowHtml(hour, timedEvents)).join("")}
        </section>
      `;
      elements.calendarDayModal.style.display = "flex";
    }

    function closeCalendarDayModal() {
      elements.calendarDayModal.style.display = "none";
    }

    function renderCalendar() {
      const activities = calendarSectorActivities();
      const events = calendarEventsFromActivities(activities);
      const period = calendarPeriodRange();
      const periodEvents = periodCalendarEvents(events, period);
      const upcomingEvents = calendarUpcomingEvents(events);
      const nextEvent = upcomingEvents[0] || null;
      const conflicts = calendarConflictGroups(periodEvents);
      const viewLabel = state.calendarView === "week" ? "Semana" : "Mês";
      const selectedKey = dateKey(state.calendarDate);
      const selectedEvents = events.filter(event => event.key === selectedKey);

      elements.calendarMonthInput.value = monthInputValue(state.calendarDate);
      if (elements.calendarModalSubtitle) {
        elements.calendarModalSubtitle.textContent =
          `Todos os setores · ${formatMonthYear(state.calendarDate)} · ${formatDate(state.calendarDate)}`;
      }

      document.querySelectorAll("[data-calendar-view]").forEach(button => {
        button.classList.toggle("active", button.dataset.calendarView === state.calendarView);
      });

      elements.calendarInsights.innerHTML = [
        calendarInsightHtml("No dia", formatNumber(selectedEvents.length), formatDate(state.calendarDate), selectedEvents.length ? "active" : ""),
        calendarInsightHtml("Período", formatNumber(periodEvents.length), viewLabel.toLowerCase()),
        calendarInsightHtml("Próximo", nextEvent ? formatDate(nextEvent.date) : "—", nextEvent ? truncate(nextEvent.activity.title || "Evento", 34) : "sem agenda futura", nextEvent ? "today" : ""),
        calendarInsightHtml("Conflitos", formatNumber(conflicts.length), "dias sensíveis", conflicts.length ? "warning" : "")
      ].join("");

      renderCalendarGrid(period, periodEvents, conflicts);

      const dueTitle = elements.calendarDueList.closest(".calendar-side-card")?.querySelector("h3");
      if (dueTitle) {
        dueTitle.textContent = state.calendarView === "week"
          ? "Eventos da semana"
          : "Eventos do mês";
      }

      elements.calendarDueCount.textContent = periodEvents.length
        ? formatNumber(periodEvents.length)
        : "";
      elements.calendarDueList.innerHTML = periodEvents.length
        ? periodEvents.map(calendarUpcomingItemHtml).join("")
        : calendarEmptyHtml("Nenhum evento identificado neste período.");

      elements.calendarConflictCount.textContent = conflicts.length
        ? formatNumber(conflicts.length)
        : "";
      elements.calendarConflictList.innerHTML = conflicts.length
        ? conflicts.slice(0, 6).map(calendarConflictItemHtml).join("")
        : calendarEmptyHtml("Sem eventos no mesmo horário.");

      elements.calendarFeedTitle.textContent = `Agenda de ${formatDate(state.calendarDate)}`;
      elements.calendarFeedCount.textContent = selectedEvents.length
        ? formatNumber(selectedEvents.length)
        : "";
      elements.calendarFeed.innerHTML = selectedEvents.length
        ? selectedEvents.map(event => calendarEventButtonHtml(event)).join("")
        : calendarEmptyHtml("Nenhum evento para este dia. Selecione outra data no calendário.");
    }

    function openCalendar() {
      navigate("calendar");
    }

    function closeCalendar() {
      if (elements.calendarModal) elements.calendarModal.style.display = "none";
    }

    function hasValidConfig() {
      return Boolean(
        normalizeBaseUrl(state.config.url) &&
        String(state.config.anonKey || "").trim()
      );
    }

    function setConnectionState(type, text) {
      elements.connectionDot.className = `dot ${type || ""}`.trim();
      elements.connectionText.textContent = text;
    }

    function showError(message) {
      elements.errorBanner.textContent = message;
      elements.errorBanner.style.display = message ? "block" : "none";
    }

    function apiHeaders() {
      const key = String(state.config.anonKey || "").trim();

      return {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Accept-Profile": SCHEMA,
        "Content-Type": "application/json"
      };
    }

    async function fetchPage(table, params) {
      const query = new URLSearchParams(params);
      const response = await fetch(
        `${normalizeBaseUrl(state.config.url)}/rest/v1/${table}?${query.toString()}`,
        { method: "GET", headers: apiHeaders() }
      );

      const text = await response.text();
      let payload;

      try {
        payload = text ? JSON.parse(text) : [];
      } catch {
        payload = text;
      }

      if (!response.ok) {
        const detail =
          payload?.message ||
          payload?.hint ||
          payload?.details ||
          String(payload || response.statusText);

        throw new Error(`${table}: ${detail}`);
      }

      return Array.isArray(payload) ? payload : [];
    }

    async function fetchPaged({
      table,
      select = "*",
      order,
      pageSize = 1000,
      maxRows = 5000
    }) {
      const rows = [];
      let offset = 0;

      while (offset < maxRows) {
        const params = {
          select,
          limit: String(Math.min(pageSize, maxRows - offset)),
          offset: String(offset)
        };

        if (order) params.order = order;

        const page = await fetchPage(table, params);
        rows.push(...page);

        if (page.length < pageSize) break;
        offset += pageSize;
      }

      return rows;
    }

    async function loadDashboard() {
      if (!hasValidConfig()) {
        elements.setupBanner.style.display = "block";
        setConnectionState("", "Aguardando configuraÃ§Ã£o");
        return;
      }

      if (state.loading) return;

      state.loading = true;
      showError("");
      elements.setupBanner.style.display = "none";
      elements.refreshButton.disabled = true;
      elements.fabRefreshButton.disabled = true;
      elements.refreshButton.textContent = "Atualizando...";
      elements.fabRefreshButton.textContent = "Atualizando...";
      setConnectionState("loading", "Atualizando dados");

      try {
        state.activities = await fetchPaged({
          table: "activities",
          select: [
            "id",
            "activity_number",
            "title",
            "detailing",
            "status",
            "complexity",
            "registered_by_name",
            "registered_by_sector_name",
            "executor_name",
            "executor_sector_name",
            "start_date",
            "due_date",
            "conclusion_date",
            "objective_text",
            "client_supplier",
            "source_channel",
            "source_message_id",
            "created_at"
          ].join(","),
          order: "created_at.desc",
          pageSize: 1000,
          maxRows: 5000
        });

        populateSectorFilter();
        renderCurrentRoute();
        elements.lastUpdated.textContent = formatDate(new Date(), true);
        setConnectionState("connected", "Conectado ao Supabase");
      } catch (error) {
        console.error(error);
        setConnectionState("error", "Falha na atualização");
        showError(`Não foi possível carregar as atividades. ${error.message}`);
      } finally {
        state.loading = false;
        elements.refreshButton.disabled = false;
        elements.fabRefreshButton.disabled = false;
        elements.refreshButton.textContent = "Atualizar";
        elements.fabRefreshButton.textContent = "Atualizar";
      }
    }

    function countByStatus(activities) {
      const result = {
        total: activities.length,
        completed: 0,
        inProgress: 0,
        pending: 0,
        blocked: 0,
        cancelled: 0,
        open: 0,
        overdue: 0,
        withoutObjective: 0,
        withoutDue: 0
      };

      for (const activity of activities) {
        const status = normalizeStatus(activity.status);

        if (status === "concluida") result.completed += 1;
        if (status === "em_andamento") result.inProgress += 1;
        if (status === "pendente") result.pending += 1;
        if (status === "bloqueada") result.blocked += 1;
        if (status === "cancelada") result.cancelled += 1;
        if (isOpen(activity)) result.open += 1;
        if (isOverdue(activity)) result.overdue += 1;
        if (!activityObjective(activity)) result.withoutObjective += 1;
        if (isMissingDueDate(activity)) result.withoutDue += 1;
      }

      result.completionRate = result.total > 0 ? (result.completed / result.total) * 100 : 0;
      return result;
    }

    function objectiveStatistics(activities = currentActivities()) {
      const map = new Map();

      for (const activity of activities) {
        const objective = activityObjective(activity);
        if (!objective) continue;

        const item = map.get(objective) || {
          name: objective,
          total: 0,
          completed: 0,
          open: 0,
          overdue: 0,
          withoutDue: 0,
          sectors: new Set(),
          activities: []
        };

        item.total += 1;
        item.activities.push(activity);
        item.sectors.add(activitySector(activity));

        if (normalizeStatus(activity.status) === "concluida") {
          item.completed += 1;
        } else {
          item.open += 1;
        }

        if (isOverdue(activity)) item.overdue += 1;
        if (isMissingDueDate(activity)) item.withoutDue += 1;
        map.set(objective, item);
      }

      return [...map.values()]
        .map(item => ({
          ...item,
          sectors: [...item.sectors],
          completionRate: item.total > 0 ? (item.completed / item.total) * 100 : 0
        }))
        .sort(
          (a, b) =>
            b.overdue - a.overdue ||
            b.open - a.open ||
            b.total - a.total ||
            a.name.localeCompare(b.name, "pt-BR")
        );
    }

    function objectiveCategory(item) {
      if (item.overdue > 0) return "critical";
      if (item.open > 0) return "active";
      return "done";
    }

    function objectiveCategoryLabel(item) {
      const category = objectiveCategory(item);

      if (item.withoutDue > 0 && item.open > 0) return "Sem prazo";
      if (category === "critical") return "Crítico";
      if (category === "active") return "Em andamento";
      return "Finalizado";
    }

    function objectiveCategoryClass(item) {
      if (item.overdue > 0) return "risk";
      if (item.open > 0) return "active";
      return "done";
    }

    function activityStateLabel(activity) {
      if (isOverdue(activity)) return "Atrasada";
      if (isMissingDueDate(activity)) return "Sem prazo";
      if (normalizeStatus(activity.status) === "concluida") return "Feita";
      if (isOpen(activity)) return "Aberta";
      return "Encerrada";
    }

    function activityStateClass(activity) {
      if (isOverdue(activity)) return "risk";
      if (normalizeStatus(activity.status) === "concluida") return "done";
      if (isOpen(activity)) return "active";
      return "";
    }

    function activityStateClasses(activity) {
      return [activityStateClass(activity), activityPulseClass(activity)]
        .filter(Boolean)
        .join(" ");
    }

    function activityRowClass(activity) {
      if (isOverdue(activity)) return "row-overdue";
      if (normalizeStatus(activity.status) === "concluida") return "row-done";
      if (isOpen(activity)) return "row-open";
      return "";
    }

    function sectorStatistics(activities = currentActivities()) {
      const map = new Map();

      for (const activity of activities) {
        const sector = activitySector(activity);
        const item = map.get(sector) || {
          name: sector,
          activities: []
        };

        item.activities.push(activity);
        map.set(sector, item);
      }

      return [...map.values()]
        .map(item => ({
          ...item,
          ...countByStatus(item.activities)
        }))
        .sort(
          (a, b) =>
            b.overdue - a.overdue ||
            b.open - a.open ||
            b.total - a.total ||
            a.name.localeCompare(b.name, "pt-BR")
        );
    }

    function sectorSortValue(item, sortKey) {
      const values = {
        volume: item.total,
        atingimento: item.completionRate,
        atrasos: item.overdue,
        entregas: item.completed
      };

      return Number(values[sortKey] || 0);
    }

    function sortSectors(sectors) {
      const sortKey = SECTOR_SORT_LABELS[state.macroSectorSort]
        ? state.macroSectorSort
        : "atrasos";

      return [...sectors].sort((a, b) => {
        const primary = sectorSortValue(b, sortKey) - sectorSortValue(a, sortKey);
        if (primary !== 0) return primary;

        return (
          b.overdue - a.overdue ||
          b.open - a.open ||
          b.total - a.total ||
          a.name.localeCompare(b.name, "pt-BR")
        );
      });
    }

    function priorityScore(activity) {
      if (isOverdue(activity)) return 0;
      if (normalizeStatus(activity.status) === "bloqueada") return 1;
      if (isMissingDueDate(activity)) return 2;
      if (normalizeStatus(activity.status) === "pendente") return 3;
      if (normalizeStatus(activity.status) === "em_andamento") return 4;
      return 9;
    }

    function sortActivities(activities, mode = "priority") {
      const sorted = [...activities];

      if (mode === "newest") {
        return sorted.sort(
          (a, b) => (parseDate(b.created_at)?.getTime() || 0) - (parseDate(a.created_at)?.getTime() || 0)
        );
      }

      if (mode === "due") {
        return sorted.sort(
          (a, b) => (parseDate(a.due_date)?.getTime() ?? Infinity) - (parseDate(b.due_date)?.getTime() ?? Infinity)
        );
      }

      return sorted.sort((a, b) => {
        const score = priorityScore(a) - priorityScore(b);
        if (score !== 0) return score;

        return (
          (parseDate(a.due_date)?.getTime() ?? Infinity) -
          (parseDate(b.due_date)?.getTime() ?? Infinity)
        );
      });
    }

    function progressBarHtml(percent) {
      const width = Math.max(0, Math.min(100, Number(percent || 0)));

      return `
        <div class="progress">
          <div class="progress-fill" style="width: ${width}%"></div>
        </div>
      `;
    }

    function metricHtml({ label, value, emoji, tone = "" }) {
      return `
        <div class="metric ${escapeHtml(tone)}">
          <span class="metric-watermark" aria-hidden="true">${escapeHtml(emoji)}</span>
          <div class="metric-content">
            <strong>${escapeHtml(value)}</strong>
            <span>${escapeHtml(label)}</span>
          </div>
        </div>
      `;
    }

    function compactMetricHtml(label, value) {
      return `
        <div class="compact-metric">
          <strong>${escapeHtml(value)}</strong>
          <span>${escapeHtml(label)}</span>
        </div>
      `;
    }

    function objectiveBadge(item) {
      if (item.overdue > 0) {
        return `<span class="badge badge-danger">${formatNumber(item.overdue)} atraso(s)</span>`;
      }

      if (item.open > 0) {
        return `<span class="badge badge-warning">${formatNumber(item.open)} aberta(s)</span>`;
      }

      return `<span class="badge badge-success">Finalizado</span>`;
    }

    function shortList(values, max = 4) {
      const clean = values.filter(Boolean);
      const visible = clean.slice(0, max);
      const hidden = clean.length - visible.length;

      return visible.length
        ? `${visible.join(", ")}${hidden > 0 ? ` +${hidden}` : ""}`
        : "Não informado";
    }

    function renderWorkList(target, activities, emptyMessage, limit = 8) {
      const open = sortActivities(activities.filter(isOpen)).slice(0, limit);

      target.innerHTML = open.length
        ? open.map(activity => workButtonHtml(activity)).join("")
        : `<div class="empty">${escapeHtml(emptyMessage)}</div>`;
    }

    function workButtonHtml(activity) {
      const dueText = activity.due_date ? formatDate(activity.due_date) : "Sem prazo";

      return `
        <button type="button" class="work-row ${activitySurfacePulseClass(activity)}" data-activity-id="${escapeHtml(activity.id)}">
          <span class="row-between">
            <span class="work-title">${escapeHtml(activity.title || "Atividade sem título")}</span>
            <span class="state-pill ${activityStateClasses(activity)}">${escapeHtml(activityStateLabel(activity))}</span>
          </span>
          <span class="meta">
            ${escapeHtml(activityResponsible(activity))} ·
            ${escapeHtml(activitySector(activity))} ·
            <span class="${dueClass(activity)}">${escapeHtml(dueText)}</span>
          </span>
        </button>
      `;
    }

    function renderMacro() {
      const activities = currentActivities();
      const stats = countByStatus(activities);
      const objectives = objectiveStatistics(activities);
      const sectors = sortSectors(sectorStatistics(activities));

      document.querySelectorAll("[data-sector-sort]").forEach(button => {
        button.classList.toggle("active", button.dataset.sectorSort === state.macroSectorSort);
      });

      elements.macroMetricStrip.innerHTML = [
        {
          label: "Atividades ativas",
          value: formatNumber(stats.open),
          emoji: "📊",
          tone: ""
        },
        {
          label: "Total de atividades",
          value: formatNumber(stats.total),
          emoji: "⚡",
          tone: ""
        },
        {
          label: "Atividades atrasadas",
          value: formatNumber(stats.overdue),
          emoji: "⏳",
          tone: stats.overdue > 0 ? "danger" : ""
        },
        {
          label: "Taxa de conclusão",
          value: formatPercent(stats.completionRate),
          emoji: "🏁",
          tone: "success"
        }
      ].filter(metric => metric.label !== "Total de atividades").map(metricHtml).join("");

      elements.macroSectorTable.innerHTML = sectors.length
        ? sectors.map(macroSectorRowHtml).join("")
        : emptyTableRowHtml("Nenhum setor encontrado no período.", 6);

      const recentObjectives = latestObjectives(objectives).slice(0, 6);
      elements.macroObjectiveSummary.textContent = objectives.length
        ? `${formatNumber(objectives.length)} objetivos · ${formatNumber(objectives.filter(item => item.open > 0).length)} em ação · ${formatNumber(objectives.reduce((sum, item) => sum + item.overdue, 0))} atrasos`
        : "Nenhum objetivo informado no período.";

      elements.macroRecentObjectives.innerHTML = recentObjectives.length
        ? recentObjectives.map(recentObjectiveCardHtml).join("")
        : `<div class="empty">Nenhum objetivo recente no período.</div>`;
    }

    function latestActivityDate(activity) {
      const date =
        parseDate(activity.created_at) ||
        parseDate(activity.start_date) ||
        parseDate(activity.due_date) ||
        parseDate(activity.conclusion_date);

      return date?.getTime() || 0;
    }

    function latestObjectiveDate(item) {
      return item.activities.reduce(
        (latest, activity) => Math.max(latest, latestActivityDate(activity)),
        0
      );
    }

    function latestObjectives(objectives) {
      return [...objectives].sort(
        (a, b) =>
          latestObjectiveDate(b) - latestObjectiveDate(a) ||
          b.overdue - a.overdue ||
          b.open - a.open ||
          a.name.localeCompare(b.name, "pt-BR")
      );
    }

    function sectorVisual(name) {
      const key = normalizeText(name);
      const visuals = [
        { terms: ["sala tecnica", "tecnica"], emoji: "🛠️", icon: "assets/img/sector-icons/sala-tecnica.png", accent: "#08799a", soft: "rgba(8, 121, 154, 0.05)" },
        { terms: ["automacao"], emoji: "⚙️", icon: "assets/img/sector-icons/automacao.png", accent: "#456dc0", soft: "rgba(69, 109, 192, 0.05)" },
        { terms: ["financeiro"], emoji: "💎", icon: "assets/img/sector-icons/financeiro.png", accent: "#b89245", soft: "rgba(184, 146, 69, 0.05)" },
        { terms: ["comercial", "vendas"], emoji: "🤝", icon: "assets/img/sector-icons/comercial.png", accent: "#258456", soft: "rgba(37, 132, 86, 0.05)" },
        { terms: ["administracao", "admin"], emoji: "🏛️", icon: "assets/img/sector-icons/administrativo.png", accent: "#6b5fa8", soft: "rgba(107, 95, 168, 0.05)" },
        { terms: ["compras", "suprimentos"], emoji: "🧾", icon: "assets/img/sector-icons/compras.png", accent: "#b16f12", soft: "rgba(177, 111, 18, 0.05)" },
        { terms: ["producao", "operacao"], emoji: "🏭", icon: "assets/img/sector-icons/producao.png", accent: "#2f7f7a", soft: "rgba(47, 127, 122, 0.05)" },
        { terms: ["rh", "recursos humanos"], emoji: "🌱", icon: "assets/img/sector-icons/administrativo.png", accent: "#4b8d52", soft: "rgba(75, 141, 82, 0.05)" },
        { terms: ["juridico", "legal"], emoji: "⚖️", icon: "assets/img/sector-icons/administrativo.png", accent: "#56657b", soft: "rgba(86, 101, 123, 0.05)" }
      ];

      const matched = visuals.find(item => item.terms.some(term => key.includes(term)));
      if (matched) return matched;

      const hash = [...key].reduce((total, char) => total + char.charCodeAt(0), 0);
      return visuals[hash % visuals.length];
    }

    function sectorIconHtml(visual) {
      if (visual?.icon) {
        return `<img class="sector-icon-img" src="${escapeHtml(visual.icon)}" alt="" loading="lazy" decoding="async" draggable="false">`;
      }

      return escapeHtml(visual?.emoji || "•");
    }

    function sectorDonutHtml(item) {
      const percent = Math.max(0, Math.min(100, Number(item.completionRate) || 0));

      return `
        <span class="sector-donut-cell">
          <span class="sector-donut" role="img" aria-label="${formatPercent(percent)} de atingimento">
            <svg viewBox="0 0 36 36" aria-hidden="true" focusable="false">
              <circle class="sector-donut-track" cx="18" cy="18" r="15.5" pathLength="100"></circle>
              <circle class="sector-donut-meter" cx="18" cy="18" r="15.5" pathLength="100" style="stroke-dasharray: ${percent} 100"></circle>
            </svg>
            <strong>${formatPercent(percent)}</strong>
          </span>
        </span>
      `;
    }

    const SECTOR_HEADCOUNT = [
      { terms: ["sala tecnica", "tecnica"], count: 3 },
      { terms: ["automacao"], count: 2 },
      { terms: ["compras", "suprimentos"], count: 1 },
      { terms: ["administracao", "admin"], count: 3 },
      { terms: ["comercial", "vendas"], count: 3 },
      { terms: ["financeiro"], count: 2 },
      { terms: ["producao", "operacao"], count: 1 },
      { terms: ["gestao", "diretoria"], count: 1 }
    ];

    function sectorPeopleCount(item) {
      const key = normalizeText(item.name);
      const match = SECTOR_HEADCOUNT.find(entry =>
        entry.terms.some(term => key.includes(term))
      );

      return match?.count || 0;
    }

    function sectorPersonIconHtml() {
      return `<img class="sector-person" src="assets/img/silhouette.png" alt="" loading="lazy" decoding="async" draggable="false">`;
    }

    function sectorPeopleHtml(item) {
      const count = sectorPeopleCount(item);
      if (!count) return `<span class="sector-people" aria-hidden="true"></span>`;

      const visible = Math.min(count, 8);
      const hidden = count - visible;

      return `
        <span class="sector-people" title="${formatNumber(count)} pessoa(s) definida(s) no setor" aria-label="${formatNumber(count)} pessoa(s) definida(s) no setor">
          ${Array.from({ length: visible }, sectorPersonIconHtml).join("")}
          ${hidden > 0 ? `<span class="sector-people-more">+${formatNumber(hidden)}</span>` : ""}
        </span>
      `;
    }

    function liveActivitySort(a, b) {
      const statusWeight = activity => {
        const status = normalizeStatus(activity.status);
        if (status === "em_andamento") return 0;
        if (status === "bloqueada") return 1;
        if (status === "pendente") return 2;
        return 3;
      };
      const statusScore = statusWeight(a) - statusWeight(b);
      if (statusScore !== 0) return statusScore;

      return latestActivityDate(b) - latestActivityDate(a);
    }

    function dueDay(activity) {
      const due = parseDate(activity.due_date);
      if (!due) return null;
      due.setHours(0, 0, 0, 0);
      return due;
    }

    function daysFromToday(date) {
      if (!date) return null;
      return Math.round((date.getTime() - startOfToday().getTime()) / 86400000);
    }

    function riskDeadlineLabel(activity) {
      const diff = daysFromToday(dueDay(activity));
      if (diff === null) return "sem prazo";
      if (diff < 0) return `${Math.abs(diff)}d atraso`;
      if (diff === 0) return "vence hoje";
      if (diff === 1) return "vence amanha";
      return `vence em ${diff}d`;
    }

    function riskActivitySort(a, b) {
      const aOverdue = isOverdue(a) ? 0 : 1;
      const bOverdue = isOverdue(b) ? 0 : 1;
      if (aOverdue !== bOverdue) return aOverdue - bOverdue;

      return (
        (dueDay(a)?.getTime() ?? Infinity) -
        (dueDay(b)?.getTime() ?? Infinity)
      );
    }

    function isDueSoon(activity, days = 3) {
      if (!isOpen(activity) || isOverdue(activity)) return false;
      const diff = daysFromToday(dueDay(activity));
      return diff !== null && diff >= 0 && diff <= days;
    }

    function sectorRiskHtml(item) {
      const overdue = item.activities.filter(isOverdue).sort(riskActivitySort);
      const soon = item.activities.filter(activity => isDueSoon(activity)).sort(riskActivitySort);
      const risks = overdue.length ? overdue : soon;

      if (!risks.length) {
        return `<span class="sector-live-list sector-risk-list"><span class="live-empty risk-empty">Sem atraso critico</span></span>`;
      }

      const visible = risks.slice(0, 2);
      const hidden = risks.length - visible.length;
      const hiddenLabel = overdue.length ? "atraso(s)" : "vencimento(s)";

      return `
        <span class="sector-live-list sector-risk-list">
          ${visible.map(activity => {
            const title = activity.title || "Atividade sem titulo";
            const tone = isOverdue(activity) ? "danger" : "warning";
            return `
              <span class="live-pill risk-pill ${tone}" title="${escapeHtml(title)}" aria-label="${escapeHtml(`Risco: ${title}`)}">
                <span class="live-dot risk-dot" aria-hidden="true"></span>
                <span class="risk-label">${escapeHtml(riskDeadlineLabel(activity))}</span>
                <span class="live-task risk-task">${escapeHtml(truncate(title, 76))}</span>
              </span>
            `;
          }).join("")}
          ${hidden > 0 ? `<span class="live-more risk-more">+${formatNumber(hidden)} ${hiddenLabel}</span>` : ""}
        </span>
      `;
    }

    function sectorLiveHtml(item) {
      const openActivities = item.activities.filter(isOpen);

      if (!openActivities.length) {
        return `<span class="sector-live-list"><span class="live-empty">Sem ação</span></span>`;
      }

      const groups = new Map();
      for (const activity of openActivities) {
        const responsible = activityResponsible(activity);
        const list = groups.get(responsible) || [];
        list.push(activity);
        groups.set(responsible, list);
      }

      const liveItems = [...groups.values()]
        .map(activities => ({
          activity: [...activities].sort(liveActivitySort)[0]
        }))
        .sort((a, b) => liveActivitySort(a.activity, b.activity));
      const visible = liveItems.slice(0, 2);
      const hidden = liveItems.length - visible.length;

      return `
        <span class="sector-live-list">
          ${visible.map(item => {
            const title = item.activity.title || "Atividade sem título";
            return `
              <span class="live-pill" title="${escapeHtml(title)}" aria-label="${escapeHtml(`Pessoa em ação: ${title}`)}">
                <span class="live-dot" aria-hidden="true"></span>
                <span class="live-person" aria-hidden="true">${sectorPersonIconHtml()}</span>
                <span class="live-task">${escapeHtml(truncate(title, 72))}</span>
              </span>
            `;
          }).join("")}
          ${hidden > 0 ? `<span class="live-more">+${formatNumber(hidden)} em ação</span>` : ""}
        </span>
      `;
    }

    function sectorLastInsertionText(item) {
      const latest = [...item.activities]
        .filter(activity => activity.start_date || activity.created_at)
        .sort(
          (a, b) =>
            (parseDate(b.start_date || b.created_at)?.getTime() || 0) -
            (parseDate(a.start_date || a.created_at)?.getTime() || 0)
        )[0];
      const dateValue = latest?.start_date || latest?.created_at;

      return dateValue
        ? `Última atividade iniciada: ${formatDate(dateValue)}`
        : "Última atividade iniciada: —";
    }

    function macroSectorRowHtml(item) {
      const tone = item.overdue > 0
        ? "row-overdue"
        : item.open > 0
          ? "row-open"
          : "row-done";
      const visual = sectorVisual(item.name);

      return `
        <tr class="${tone}" data-sector="${escapeHtml(item.name)}" style="--sector-accent: ${visual.accent}; --sector-soft: ${visual.soft}; --sector-icon: url('${visual.icon || ""}');">
          <td data-label="Setor">
            <span class="sector-name-premium">
              <span class="sector-emoji" aria-hidden="true">${sectorIconHtml(visual)}</span>
              <span class="macro-name-cell">
                <span class="macro-name">${escapeHtml(item.name)}</span>
                <span class="macro-sub">${formatNumber(item.completed)} feitas</span>
                <span class="macro-last-entry">${escapeHtml(sectorLastInsertionText(item))}</span>
              </span>
              ${sectorPeopleHtml(item)}
            </span>
          </td>
          <td data-label="Total" class="number-cell">
            <span class="mobile-metric-label" aria-hidden="true">TOTAL</span>
            <span class="mobile-metric-value">${formatNumber(item.total)}</span>
          </td>
          <td data-label="Ativas" class="number-cell">
            <span class="mobile-metric-label" aria-hidden="true">ATIVAS</span>
            <span class="mobile-metric-value">${formatNumber(item.open)}</span>
          </td>
          <td data-label="Atraso" class="number-cell ${item.overdue > 0 ? "overdue" : ""}">
            <span class="mobile-metric-label" aria-hidden="true">ATRASOS</span>
            <span class="mobile-metric-value">${formatNumber(item.overdue)}</span>
          </td>
          <td data-label="Riscos">
            ${sectorRiskHtml(item)}
          </td>
          <td data-label="Atingimento">
            ${sectorDonutHtml(item)}
          </td>
        </tr>
      `;
    }

    function recentObjectiveCardHtml(item) {
      const activityDateValue = activity =>
        activity?.start_date ||
        activity?.created_at ||
        activity?.due_date ||
        activity?.conclusion_date;
      const activityDateTime = activity =>
        parseDate(activityDateValue(activity))?.getTime() || 0;
      const latestActivity = [...item.activities].sort(
        (a, b) => activityDateTime(b) - activityDateTime(a)
      )[0];
      const focusActivity = [...item.activities].filter(isOpen).sort(liveActivitySort)[0] || latestActivity;
      const latestDate = focusActivity ? formatDate(activityDateValue(focusActivity)) : "—";
      const focusTitle = focusActivity?.title || "Sem atividade registrada";
      const actionLabel = focusActivity && isOpen(focusActivity)
        ? item.overdue > 0
          ? "Atenção"
          : "Em ação"
        : "Último movimento";
      const statusLabel = item.overdue > 0
        ? `${formatNumber(item.overdue)} atraso(s)`
        : item.open > 0
          ? `${formatNumber(item.open)} ativa(s)`
          : "Em dia";
      const accent = item.overdue > 0
        ? "#b44848"
        : item.open > 0
          ? "#08799a"
          : "#258456";
      const progress = Math.max(0, Math.min(100, Number(item.completionRate) || 0));

      return `
        <button type="button" class="recent-objective ${escapeHtml(objectiveCategoryClass(item))}" data-objective="${encodeURIComponent(item.name)}" style="--objective-accent: ${accent}; --progress-width: ${progress}%;">
          <span class="recent-objective-main">
            <span class="recent-objective-title">
              <span class="recent-objective-mark" aria-hidden="true">◎</span>
              <strong>${escapeHtml(truncate(item.name, 92))}</strong>
            </span>
            <span class="recent-objective-action">${escapeHtml(actionLabel)}: ${escapeHtml(truncate(focusTitle, 96))}</span>
            <span class="recent-objective-meta">
              <span>${escapeHtml(latestDate)}</span>
              <span>${escapeHtml(shortList(item.sectors, 3))}</span>
            </span>
          </span>

          <span class="recent-objective-side">
            <span class="state-pill ${escapeHtml(objectiveCategoryClass(item))}">${escapeHtml(statusLabel)}</span>
            <span class="recent-objective-kpis">
              <span><strong>${formatNumber(item.total)}</strong> total</span>
              <span><strong>${formatNumber(item.completed)}</strong> feitas</span>
              <span><strong>${formatPercent(item.completionRate)}</strong></span>
            </span>
          </span>

          <span class="recent-objective-progress" aria-hidden="true"><span></span></span>
        </button>
      `;
    }

    function emptyTableRowHtml(message, columns) {
      return `
        <tr>
          <td colspan="${columns}">
            <div class="empty">${escapeHtml(message)}</div>
          </td>
        </tr>
      `;
    }

    function miniKpiHtml(label, value, className = "") {
      return `
        <span class="mini-kpi">
          <strong class="${escapeHtml(className)}">${escapeHtml(value)}</strong>
          <span>${escapeHtml(label)}</span>
        </span>
      `;
    }

    function objectiveListButtonHtml(item) {
      const selected = item.name === state.selectedObjective;

      return `
        <button
          type="button"
          class="list-button ${selected ? "active" : ""}"
          data-objective="${encodeURIComponent(item.name)}"
        >
          <span class="row-between">
            <span class="list-title">${escapeHtml(item.name)}</span>
            ${objectiveBadge(item)}
          </span>
          <span class="meta">
            ${formatNumber(item.total)} atividade(s) ·
            ${formatPercent(item.completionRate)} realizadas ·
            ${escapeHtml(shortList(item.sectors))}
          </span>
          <span class="state-pill ${objectiveCategoryClass(item)}">
            ${escapeHtml(objectiveCategoryLabel(item))}
          </span>
        </button>
      `;
    }

    function syncObjectiveListHeight() {
      const list = elements.objectiveList;
      const listPanel = list.closest(".objective-list-panel");
      const listBody = list.closest(".panel-body");
      const detailPanel = document.querySelector(".objective-detail-panel");
      const content = document.querySelector(".content");
      const items = [...list.querySelectorAll(".list-button")];
      const setScrollable = isScrollable => {
        list.classList.toggle("is-scrollable", Boolean(isScrollable));
        listPanel?.classList.toggle("has-scroll-window", Boolean(isScrollable));
      };

      if (!items.length) {
        list.style.height = "auto";
        list.style.maxHeight = "none";
        list.style.overflowY = "visible";
        setScrollable(false);
        if (listPanel) listPanel.style.minHeight = "";
        if (listBody) listBody.style.minHeight = "";
        if (detailPanel) detailPanel.style.minHeight = "";
        return;
      }

      if (window.matchMedia("(max-width: 899px)").matches) {
        list.style.height = "auto";
        list.style.maxHeight = "min(62svh, 720px)";
        const isScrollable = items.length > 6;
        list.style.overflowY = isScrollable ? "auto" : "visible";
        setScrollable(isScrollable);
        if (listPanel) listPanel.style.minHeight = "";
        if (listBody) listBody.style.minHeight = "";
        if (detailPanel) detailPanel.style.minHeight = "";
        return;
      }

      const panelHeader = listPanel?.querySelector(".panel-header");
      const headerHeight = panelHeader?.getBoundingClientRect().height || 0;
      const bodyStyles = listBody ? window.getComputedStyle(listBody) : null;
      const bodyPadding =
        (Number.parseFloat(bodyStyles?.paddingTop) || 0) +
        (Number.parseFloat(bodyStyles?.paddingBottom) || 0);
      const viewportHeight =
        window.visualViewport?.height ||
        window.innerHeight ||
        document.documentElement.clientHeight ||
        760;
      const contentTop = Math.max(0, content?.getBoundingClientRect().top || 0);
      const detailHeight = detailPanel?.getBoundingClientRect().height || 0;
      const viewportTarget = Math.min(
        Math.max(360, viewportHeight - contentTop - 42),
        Math.max(560, viewportHeight * 0.82)
      );
      const panelHeight = Math.max(360, detailHeight, viewportTarget);
      const targetHeight = Math.max(240, panelHeight - headerHeight - bodyPadding);

      if (listPanel) listPanel.style.minHeight = `${Math.ceil(panelHeight)}px`;
      if (listBody) listBody.style.minHeight = `${Math.ceil(targetHeight + bodyPadding)}px`;
      if (detailPanel) detailPanel.style.minHeight = `${Math.ceil(panelHeight)}px`;
      list.style.height = `${Math.ceil(targetHeight)}px`;
      list.style.maxHeight = `${Math.ceil(targetHeight)}px`;
      const isScrollable = list.scrollHeight > targetHeight + 1;
      list.style.overflowY = isScrollable ? "auto" : "hidden";
      setScrollable(isScrollable);
    }

    function isMobileViewport() {
      return window.matchMedia("(max-width: 720px)").matches;
    }

    function focusMobileObjectiveSelection(scrollDetail = false) {
      if (!isMobileViewport()) return;

      const selected = elements.objectiveList.querySelector(".list-button.active");
      selected?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center"
      });

      if (scrollDetail) {
        document.querySelector(".objective-detail-panel")?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }
    }

    function observeObjectiveDetailResize() {
      if (state.objectiveResizeObserver || typeof ResizeObserver === "undefined") return;

      const detailPanel = document.querySelector(".objective-detail-panel");
      if (!detailPanel) return;

      state.objectiveResizeObserver = new ResizeObserver(() => {
        if (state.currentRoute === "objectives") {
          requestAnimationFrame(syncObjectiveListHeight);
        }
      });
      state.objectiveResizeObserver.observe(detailPanel);
    }

    function renderObjectives() {
      const activities = currentActivities();
      const allObjectives = objectiveStatistics(activities);
      const objectives = filteredObjectives(allObjectives);

      elements.objectivesPeriodCaption.textContent = PERIOD_LABELS[currentPeriodKey()] || "";
      elements.objectivesCountLabel.textContent =
        `${formatNumber(objectives.length)} de ${formatNumber(allObjectives.length)} objetivo(s)`;
      updateObjectiveFilterState();

      if (!objectives.length) {
        state.selectedObjective = "";
        elements.objectiveList.innerHTML =
          `<div class="empty">Nenhum objetivo informado no período.</div>`;
        elements.objectiveList.classList.remove("has-active-selection");
        renderEmptyObjectiveDetail();
        requestAnimationFrame(syncObjectiveListHeight);
        return;
      }

      if (!objectives.some(item => item.name === state.selectedObjective)) {
        state.selectedObjective = objectives[0].name;
      }

      elements.objectiveList.innerHTML = objectives.map(objectiveListButtonHtml).join("");
      elements.objectiveList.classList.add("has-active-selection");
      renderObjectiveDetail(objectives.find(item => item.name === state.selectedObjective));
      requestAnimationFrame(() => {
        syncObjectiveListHeight();
        focusMobileObjectiveSelection(false);
      });
    }

    function filteredObjectives(objectives) {
      const search = normalizeText(elements.objectiveSearch.value);
      const category = elements.objectiveCategoryFilter.value;
      const sector = elements.objectiveSectorFilter.value;

      return objectives.filter(item => {
        const matchesSearch = !search || normalizeText(item.name).includes(search);

        const matchesCategory =
          category === "all" ||
          (category === "critical" && item.overdue > 0) ||
          (category === "active" && item.open > 0 && item.overdue === 0) ||
          (category === "done" && item.open === 0) ||
          (category === "without_due" && item.withoutDue > 0);

        const matchesSector = !sector || item.sectors.includes(sector);

        return matchesSearch && matchesCategory && matchesSector;
      });
    }

    function renderEmptyObjectiveDetail() {
      elements.objectiveDetailTitle.textContent = "Objetivo";
      elements.objectiveDetailSubtitle.textContent = "Nenhum objetivo selecionado.";
      elements.objectiveDetailBadge.innerHTML = "";
      elements.objectiveDetailBody.innerHTML =
        `<div class="empty">Selecione outro período ou aguarde novos registros.</div>`;
    }

    function objectiveKpiHtml(label, value, mark, tone = "") {
      return `
        <div class="objective-kpi ${escapeHtml(tone)}" data-mark="${escapeHtml(mark)}">
          <strong>${escapeHtml(value)}</strong>
          <span>${escapeHtml(label)}</span>
        </div>
      `;
    }

    function objectiveStageGroups(objective) {
      const map = new Map();

      for (const activity of sortedObjectiveTimeline(objective.activities)) {
        const sector = activitySector(activity);
        const item = map.get(sector) || {
          name: sector,
          activities: [],
          visual: sectorVisual(sector)
        };

        item.activities.push(activity);
        map.set(sector, item);
      }

      return [...map.values()]
        .map(item => ({
          ...item,
          ...countByStatus(item.activities)
        }))
        .sort((a, b) => stageFirstTime(a) - stageFirstTime(b));
    }

    function stageFirstTime(stage) {
      return stage.activities.reduce((first, activity) => {
        const time = activityTimelineDate(activity)?.getTime() || Infinity;
        return Math.min(first, time);
      }, Infinity);
    }

    function currentObjectiveStage(stages) {
      return stages.find(stage => stage.open > 0) || stages.at(-1) || null;
    }

    function objectiveFlowProgress(stages, currentStage) {
      if (stages.length <= 1) return stages.length === 1 && stages[0].open === 0 ? 100 : 0;

      const currentIndex = Math.max(0, stages.findIndex(stage => stage.name === currentStage?.name));
      const completedBeforeCurrent = stages
        .slice(0, currentIndex)
        .filter(stage => stage.open === 0 && stage.total > 0)
        .length;
      const currentContribution = currentStage?.open === 0 ? 1 : 0.5;
      const steps = Math.min(stages.length - 1, completedBeforeCurrent + currentContribution);

      return Math.round((steps / (stages.length - 1)) * 100);
    }

    function objectiveFlowMetrics(stages, currentStage) {
      const progress = objectiveFlowProgress(stages, currentStage);

      if (stages.length <= 1) {
        return {
          progress,
          edge: 50,
          fill: 0
        };
      }

      const edge = 50 / stages.length;
      const fill = (100 - (edge * 2)) * (progress / 100);

      return {
        progress,
        edge,
        fill
      };
    }

    function flowStageHtml(stage, currentStage) {
      const isCurrent = currentStage?.name === stage.name && stage.open > 0;
      const isDone = stage.open === 0 && stage.total > 0;
      const isExecuting = stage.activities.some(activity => normalizeStatus(activity.status) === "em_andamento");
      const statusText = isCurrent
        ? `${formatNumber(stage.open)} ativa(s)`
        : isDone
          ? "Entregue"
          : `${formatNumber(stage.total)} tarefa(s)`;

      return `
        <div class="flow-stage ${isCurrent ? "current" : isDone ? "done" : "pending"} ${isExecuting ? "executing" : ""}">
          <span class="flow-stage-icon" aria-hidden="true">
            ${stage.visual.emoji}
            ${isDone ? `<span class="flow-check">✓</span>` : ""}
          </span>
          <strong>${escapeHtml(stage.name)}</strong>
          <span>${escapeHtml(statusText)}</span>
        </div>
      `;
    }

    function objectiveStageRowHtml(stage, currentStage) {
      const isCurrent = currentStage?.name === stage.name && stage.open > 0;
      const activeTasks = sortActivities(stage.activities.filter(isOpen)).slice(0, 3);
      const fallbackTasks = sortedObjectiveTimeline(stage.activities).slice(-2).reverse();
      const tasks = activeTasks.length ? activeTasks : fallbackTasks;
      const hidden = Math.max(0, stage.activities.length - tasks.length);

      return `
        <div class="objective-stage-row ${isCurrent ? "current" : ""}">
          <div class="objective-stage-title">
            <span class="sector-emoji" aria-hidden="true">${stage.visual.emoji}</span>
            <span>
              <strong>${escapeHtml(stage.name)}</strong>
              <span>
                ${formatNumber(stage.total)} total · ${formatNumber(stage.open)} ativa(s) · ${formatNumber(stage.completed)} entregue(s)
              </span>
            </span>
          </div>

          <div class="objective-stage-tasks">
            ${tasks.map(activity => `
              <button type="button" class="objective-stage-task ${activitySurfacePulseClass(activity)}" data-activity-id="${escapeHtml(activity.id)}">
                <strong>${escapeHtml(activity.title || "Atividade sem título")}</strong>
                <span class="state-pill ${activityStateClasses(activity)}">
                  ${escapeHtml(activityStateLabel(activity))}
                </span>
              </button>
            `).join("")}
            ${hidden > 0 ? `<span class="meta">+${formatNumber(hidden)} tarefa(s) nesta etapa</span>` : ""}
          </div>
        </div>
      `;
    }

    function renderObjectiveDetail(objective) {
      const stats = countByStatus(objective.activities);
      const stages = objectiveStageGroups(objective);
      const currentStage = currentObjectiveStage(stages);
      const flowMetrics = objectiveFlowMetrics(stages, currentStage);
      const currentStageText = currentStage
        ? currentStage.open > 0
          ? `Etapa atual: ${currentStage.name}. ${formatNumber(currentStage.open)} atividade(s) ativa(s).`
          : `Fluxo finalizado em ${currentStage.name}.`
        : "Sem etapa identificada.";

      elements.objectiveDetailTitle.textContent = "Controle do objetivo";
      elements.objectiveDetailSubtitle.textContent =
        `${formatNumber(objective.total)} atividade(s) · ${shortList(objective.sectors)}`;
      elements.objectiveDetailBadge.innerHTML = "";

      elements.objectiveDetailBody.innerHTML = `
        <div class="objective-control">
          <section class="objective-hero">
            <div class="objective-hero-main">
              <span class="objective-hero-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M10 6h4"></path>
                  <path d="M3 10h18"></path>
                  <path d="M5 7h14v12H5z"></path>
                  <path d="M9 14h6"></path>
                </svg>
              </span>
              <div>
                <span class="objective-eyebrow">Objetivo</span>
                <h3>${escapeHtml(objective.name)}</h3>
                <p class="meta">${escapeHtml(shortList(objective.sectors))}</p>
              </div>
            </div>
            <span class="state-pill ${objectiveCategoryClass(objective)}">
              ${escapeHtml(objectiveCategoryLabel(objective))}
            </span>
          </section>

          <div class="objective-kpi-grid">
            ${objectiveKpiHtml("Tarefas", formatNumber(stats.total), "▦")}
            ${objectiveKpiHtml("Ativas", formatNumber(stats.open), "↗", "warning")}
            ${objectiveKpiHtml("Atrasos", formatNumber(stats.overdue), "!", stats.overdue > 0 ? "danger" : "")}
            ${objectiveKpiHtml("Entregas", formatNumber(stats.completed), "✓", "success")}
            ${objectiveKpiHtml("Sem prazo", formatNumber(stats.withoutDue), "◇")}
          </div>

          <section class="objective-flow-panel">
            <div class="objective-section-heading">
              <div>
                <h4>▣ Linha do tempo do fluxo</h4>
                <p class="meta">${escapeHtml(currentStageText)}</p>
              </div>
              <span class="badge badge-neutral">${formatPercent(stats.completionRate)}</span>
            </div>

            ${
              stages.length
                ? `<div class="objective-flow-track ${stages.length === 1 ? "single" : ""}" style="--flow-count: ${stages.length}; --flow-progress: ${flowMetrics.progress}; --flow-edge: ${flowMetrics.edge}%; --flow-fill: ${flowMetrics.fill}%;">${stages.map(stage => flowStageHtml(stage, currentStage)).join("")}</div>`
                : `<div class="empty">Nenhum setor identificado neste objetivo.</div>`
            }
          </section>

          <section class="objective-stage-panel">
            <div class="objective-section-heading">
              <div>
                <h4>▣ Tarefas por etapa do fluxo</h4>
                <p class="meta">Leitura por setor com tarefas em aberto primeiro.</p>
              </div>
            </div>

            ${
              stages.length
                ? `<div class="objective-stage-list">${stages.map(stage => objectiveStageRowHtml(stage, currentStage)).join("")}</div>`
                : `<div class="empty">Nenhuma tarefa vinculada a este objetivo.</div>`
            }
          </section>
        </div>
      `;
    }

    function sortedObjectiveTimeline(activities) {
      return [...activities].sort((a, b) => {
        const aTime = activityTimelineDate(a)?.getTime() || 0;
        const bTime = activityTimelineDate(b)?.getTime() || 0;

        return (
          aTime - bTime ||
          Number(a.activity_number || 0) - Number(b.activity_number || 0)
        );
      });
    }

    function activityTimelineDate(activity) {
      return (
        parseDate(activity.start_date) ||
        parseDate(activity.created_at) ||
        parseDate(activity.due_date) ||
        parseDate(activity.conclusion_date)
      );
    }

    function objectiveOriginHtml(firstActivity, objective) {
      if (!firstActivity) {
        return `<div class="empty">Sem tarefa inicial identificada.</div>`;
      }

      const openedBy = firstActivity.registered_by_name || "Não informado";
      const openedSector =
        firstActivity.registered_by_sector_name ||
        activitySector(firstActivity);
      const openedAt = firstActivity.created_at || firstActivity.start_date;

      return `
        <div class="objective-origin">
          <div>
            <span class="origin-label">Aberto por</span>
            <span class="origin-title">${escapeHtml(openedBy)}</span>
            <div class="meta">
              ${escapeHtml(openedSector)} · ${escapeHtml(formatDate(openedAt, true))}
            </div>
          </div>

          <div class="origin-meta">
            <span>
              <strong>Primeira tarefa</strong>
              ${escapeHtml(firstActivity.title || "Atividade sem título")}
            </span>
            <span>
              <strong>Setores</strong>
              ${escapeHtml(shortList(objective.sectors))}
            </span>
          </div>
        </div>
      `;
    }

    function timelineItemHtml(activity, index) {
      const normalizedStatus = normalizeStatus(activity.status);
      const dateValue = normalizedStatus === "concluida"
        ? activity.conclusion_date
        : activity.due_date;
      const referenceDate = activity.start_date || activity.created_at;
      const dateText = dateValue ? formatDate(dateValue) : "Sem prazo";

      return `
        <button
          type="button"
          class="timeline-item ${index === 0 ? "first" : ""} ${activitySurfacePulseClass(activity)}"
          data-activity-id="${escapeHtml(activity.id)}"
        >
          <span class="timeline-top">
            <span class="timeline-title">
              ${index === 0 ? "🏁 " : ""}${escapeHtml(activity.title || "Atividade sem título")}
            </span>
            <span class="status-cell">
              ${index === 0 ? `<span class="badge badge-neutral">Primeira tarefa</span>` : ""}
              <span class="state-pill ${activityStateClasses(activity)}">
                ${escapeHtml(activityStateLabel(activity))}
              </span>
            </span>
          </span>

          <span class="timeline-meta-grid">
            <span class="timeline-meta">
              <strong>Aberta por</strong>
              ${escapeHtml(activity.registered_by_name || "Não informado")}
            </span>
            <span class="timeline-meta">
              <strong>Responsável</strong>
              ${escapeHtml(activityResponsible(activity))}
            </span>
            <span class="timeline-meta">
              <strong>${normalizedStatus === "concluida" ? "Conclusão" : "Prazo"}</strong>
              <span class="${dueClass(activity)}">${escapeHtml(dateText)}</span>
            </span>
          </span>

          <span class="meta">
            Registro: ${escapeHtml(formatDate(referenceDate, true))} ·
            ${escapeHtml(activitySector(activity))}
          </span>
        </button>
      `;
    }

    function populateSectorFilter() {
      const currentTaskSector = elements.taskSectorFilter.value;
      const currentTaskObjective = elements.taskObjectiveFilter.value;
      const currentObjectiveSector = elements.objectiveSectorFilter.value;
      const sectors = [...new Set(state.activities.map(activitySector).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, "pt-BR"));
      const activeActivities = state.activities.filter(isOpen);
      const taskSectors = [...new Set(activeActivities.map(activitySector).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, "pt-BR"));
      const taskObjectives = [...new Set(activeActivities.map(activityObjective).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, "pt-BR"));
      const hasRoutineActivities = activeActivities.some(activity => !activityObjective(activity));

      const options =
        `<option value="">Todos</option>` +
        sectors
          .map(sector => `<option value="${escapeHtml(sector)}">${escapeHtml(sector)}</option>`)
          .join("");
      const taskSectorOptions =
        `<option value="">Todos</option>` +
        taskSectors
          .map(sector => `<option value="${escapeHtml(sector)}">${escapeHtml(sector)}</option>`)
          .join("");
      const objectiveOptions =
        `<option value="">Todos</option>` +
        (hasRoutineActivities ? `<option value="__without_objective">Sem objetivo</option>` : "") +
        taskObjectives
          .map(objective => `<option value="${escapeHtml(objective)}">${escapeHtml(objective)}</option>`)
          .join("");

      elements.taskSectorFilter.innerHTML = taskSectorOptions;
      elements.taskObjectiveFilter.innerHTML = objectiveOptions;
      elements.objectiveSectorFilter.innerHTML = options;

      if (taskSectors.includes(currentTaskSector)) {
        elements.taskSectorFilter.value = currentTaskSector;
      }

      if (
        taskObjectives.includes(currentTaskObjective) ||
        (currentTaskObjective === "__without_objective" && hasRoutineActivities)
      ) {
        elements.taskObjectiveFilter.value = currentTaskObjective;
      }

      if (sectors.includes(currentObjectiveSector)) {
        elements.objectiveSectorFilter.value = currentObjectiveSector;
      }

      updateTaskFilterState();
    }

    function filteredTasks() {
      const sector = elements.taskSectorFilter.value;
      const objectiveFilter = elements.taskObjectiveFilter.value;

      return currentActivities().filter(activity => {
        const objective = activityObjective(activity);

        const matchesOperationalQueue = isOpen(activity);
        const matchesSector = !sector || activitySector(activity) === sector;
        const matchesObjective =
          !objectiveFilter ||
          (objectiveFilter === "__without_objective" ? !objective : objective === objectiveFilter);

        return matchesOperationalQueue && matchesSector && matchesObjective;
      });
    }

    function renderTasks() {
      const tasks = sortActivities(filteredTasks());
      const overdue = tasks.filter(isOverdue).length;

      elements.tasksCountLabel.textContent =
        `${formatNumber(tasks.length)} em aberto · ${formatNumber(overdue)} em atraso`;

      elements.tasksTable.innerHTML = tasks.length
        ? tasks.map(activityRowHtml).join("")
        : `
          <tr>
            <td colspan="7">
              <div class="empty">Nenhuma atividade aberta encontrada.</div>
            </td>
          </tr>
        `;
    }

    function activityRowHtml(activity) {
      const normalizedStatus = normalizeStatus(activity.status);
      const dateValue = normalizedStatus === "concluida"
        ? activity.conclusion_date
        : activity.due_date;
      const statusText = statusLabel(activity.status);
      const stateText = activityStateLabel(activity);
      const showStatePill = statusText !== stateText;
      const responsible = activityResponsible(activity);
      const sector = activitySector(activity);
      const objective = activityObjective(activity) || "Sem objetivo";
      const dueText = dateValue ? formatDate(dateValue) : "Sem prazo";
      const title = activity.title || "Atividade sem título";
      const mobileTitle = firstWords(title, 4);

      return `
        <tr class="${activityRowClass(activity)} ${activitySurfacePulseClass(activity)}" data-activity-id="${escapeHtml(activity.id)}">
          <td data-label="Nº">${escapeHtml(activity.activity_number ?? "—")}</td>
          <td data-label="Atividade">
            <span class="activity-title activity-title-full">${escapeHtml(title)}</span>
            <span class="activity-title-mobile">${escapeHtml(mobileTitle)}</span>
            ${
              activity.detailing
                ? `<span class="activity-detail">${escapeHtml(truncate(activity.detailing, 210))}</span>`
                : ""
            }
            <span class="activity-mobile-meta">
              <span class="activity-mobile-meta-line activity-mobile-state-line">
                <span class="activity-mobile-meta-item activity-mobile-status ${activityStateClass(activity)}">
                  <span class="meta-label">Status</span>
                  <span class="meta-value">${escapeHtml(stateText)}</span>
                </span>
                <span class="activity-mobile-meta-item activity-mobile-deadline ${dueClass(activity)}">
                  <span class="meta-label">Prazo</span>
                  <span class="meta-value">${escapeHtml(dueText)}</span>
                </span>
              </span>
              <span class="activity-mobile-meta-line">
                <span class="activity-mobile-meta-item activity-mobile-owner">
                  <span class="meta-mark" aria-hidden="true"></span>
                  <span class="meta-label">Resp.</span>
                  <span class="meta-value">${escapeHtml(responsible)}</span>
                </span>
                <span class="activity-mobile-meta-item activity-mobile-sector">
                  <span class="meta-label">Área</span>
                  <span class="meta-value">${escapeHtml(sector)}</span>
                </span>
              </span>
              <span class="activity-mobile-meta-item activity-mobile-objective">
                <span class="meta-label">Objetivo</span>
                <span class="meta-value">${escapeHtml(objective)}</span>
              </span>
            </span>
          </td>
          <td data-label="Status">
            <span class="status-cell">
              ${statusBadge(activity.status)}
              ${showStatePill ? `
                <span class="state-pill ${activityStateClasses(activity)}">
                  ${escapeHtml(stateText)}
                </span>
              ` : ""}
            </span>
          </td>
          <td data-label="Responsável">${escapeHtml(responsible)}</td>
          <td data-label="Setor">${escapeHtml(sector)}</td>
          <td data-label="Objetivo">${escapeHtml(objective)}</td>
          <td data-label="Prazo" class="${dueClass(activity)}">${escapeHtml(dueText)}</td>
        </tr>
      `;
    }

    function openActivityModal(activityId) {
      const activity = state.activities.find(item => String(item.id) === String(activityId));
      if (!activity) return;

      elements.activityModalTitle.textContent = activity.title || "Atividade sem título";
      elements.activityModalSubtitle.textContent =
        `Atividade nº ${activity.activity_number ?? "—"} · ${activitySector(activity)}`;

      const fields = [
        ["Status", statusLabel(activity.status)],
        ["Responsável", activityResponsible(activity)],
        ["Setor", activitySector(activity)],
        ["Objetivo", activityObjective(activity) || "Sem objetivo"],
        ["Complexidade", activity.complexity || "Não informada"],
        ["Data de início", formatDate(activity.start_date)],
        ["Prazo", formatDate(activity.due_date)],
        ["Data de conclusão", formatDate(activity.conclusion_date)],
        ["Cliente / fornecedor", activity.client_supplier || "Não informado"],
        ["Canal de origem", activity.source_channel || "Não informado"],
        ["Registrada por", activity.registered_by_name || "Não informado"],
        ["Registrada em", formatDate(activity.created_at, true)]
      ];

      elements.activityModalBody.innerHTML = `
        <div class="detail-grid">
          ${fields
            .map(
              ([label, value]) => `
                <div class="detail-field">
                  <label>${escapeHtml(label)}</label>
                  <div>${escapeHtml(value)}</div>
                </div>
              `
            )
            .join("")}
        </div>

        <div class="detail-field">
          <label>Detalhamento</label>
          <div style="white-space: pre-wrap; line-height: 1.5;">
            ${escapeHtml(activity.detailing || "Sem detalhamento registrado.")}
          </div>
        </div>
      `;

      elements.activityModal.style.display = "flex";
    }

    function parseRoute() {
      const raw = location.hash.replace(/^#/, "") || "macro";
      return ROUTES[raw] ? raw : "macro";
    }

    function navigate(route) {
      location.hash = `#${ROUTES[route] ? route : "macro"}`;
    }

    function openFabMenu() {
      elements.fabShell.classList.add("open");
      elements.fabToggle.setAttribute("aria-expanded", "true");
      elements.fabToggle.setAttribute("aria-label", "Fechar menu");
    }

    function closeFabMenu() {
      elements.fabShell.classList.remove("open");
      elements.fabToggle.setAttribute("aria-expanded", "false");
      elements.fabToggle.setAttribute("aria-label", "Abrir menu");
    }

    function openAdminAuthModal() {
      elements.adminPasswordInput.value = "";
      elements.adminAuthError.textContent = "";
      elements.adminPasswordInput.classList.remove("invalid");
      elements.adminAuthModal.style.display = "flex";
      window.setTimeout(() => elements.adminPasswordInput.focus(), 60);
    }

    function closeAdminAuthModal() {
      elements.adminAuthModal.style.display = "none";
      elements.adminPasswordInput.value = "";
      elements.adminAuthError.textContent = "";
      elements.adminPasswordInput.classList.remove("invalid");
    }

    function submitAdminAuth() {
      const password = String(elements.adminPasswordInput.value || "");

      if (password === FAB_ACCESS_PASSWORD) {
        closeAdminAuthModal();
        openFabMenu();
        return;
      }

      elements.adminAuthError.textContent = "Senha incorreta. Verifique e tente novamente.";
      elements.adminPasswordInput.classList.add("invalid");
      elements.adminPasswordInput.select();
    }

    function toggleFabMenu() {
      if (elements.fabShell.classList.contains("open")) {
        closeFabMenu();
        return;
      }

      openAdminAuthModal();
    }

    function closeSectorSortMenu() {
      elements.macroSectorSort.classList.remove("open");
      elements.macroSectorSortMenu.classList.remove("open");
      elements.macroSectorSortButton.setAttribute("aria-expanded", "false");
      elements.macroSectorSort.closest(".panel")?.classList.remove("menu-open");
    }

    function positionSectorSortMenu() {
      const rect = elements.macroSectorSortButton.getBoundingClientRect();
      const menu = elements.macroSectorSortMenu;

      menu.classList.add("open");
      menu.style.visibility = "hidden";
      menu.style.left = "0px";
      menu.style.top = "0px";

      const menuWidth = menu.offsetWidth || 190;
      const menuHeight = menu.offsetHeight || 150;
      const left = Math.min(
        window.innerWidth - menuWidth - 12,
        Math.max(12, rect.right - menuWidth)
      );
      const top = Math.min(
        window.innerHeight - menuHeight - 12,
        rect.bottom + 8
      );

      menu.style.left = `${left}px`;
      menu.style.top = `${Math.max(12, top)}px`;
      menu.style.visibility = "";
    }

    function toggleSectorSortMenu() {
      const isOpen = elements.macroSectorSort.classList.contains("open");
      if (isOpen) {
        closeSectorSortMenu();
      } else {
        elements.macroSectorSort.classList.add("open");
        elements.macroSectorSortButton.setAttribute("aria-expanded", "true");
        elements.macroSectorSort.closest(".panel")?.classList.add("menu-open");
        positionSectorSortMenu();
      }
    }

    function applySectorSort(sortKey) {
      if (!SECTOR_SORT_LABELS[sortKey]) return;

      state.macroSectorSort = sortKey;
      closeSectorSortMenu();
      renderMacro();
    }

    function handleSectorSortSelection(event) {
      const button = event.target.closest("[data-sector-sort]");
      if (!button) return;

      event.preventDefault();
      event.stopPropagation();
      applySectorSort(button.dataset.sectorSort);
    }

    function renderCurrentRoute() {
      state.currentRoute = parseRoute();

      document.querySelectorAll(".page-view").forEach(page => {
        page.classList.toggle("active", page.dataset.page === state.currentRoute);
      });

      document.querySelectorAll(".nav-link").forEach(link => {
        link.classList.toggle("active", link.dataset.route === state.currentRoute);
      });

      document.querySelectorAll(".route-link").forEach(link => {
        link.classList.toggle("active", link.dataset.route === state.currentRoute);
      });

      document.querySelectorAll(".fab-nav-link").forEach(link => {
        link.classList.toggle("active", link.dataset.route === state.currentRoute);
      });

      if (state.currentRoute === "macro") renderMacro();
      if (state.currentRoute === "objectives") renderObjectives();
      if (state.currentRoute === "tasks") renderTasks();
      if (state.currentRoute === "calendar") renderCalendar();

      elements.sidebar.classList.remove("open");
      window.scrollTo({ top: 0, behavior: "auto" });
    }

    function openConfig() {
      elements.supabaseUrlInput.value = state.config.url || "";
      elements.supabaseKeyInput.value = state.config.anonKey || "";
      elements.refreshMinutesInput.value = String(state.config.refreshMinutes ?? 5);
      elements.configModal.style.display = "flex";
    }

    function closeConfig() {
      elements.configModal.style.display = "none";
    }

    function closeActivityModal() {
      elements.activityModal.style.display = "none";
    }

    function configureAutoRefresh() {
      if (state.autoRefreshHandle) {
        clearInterval(state.autoRefreshHandle);
        state.autoRefreshHandle = null;
      }

      const minutes = Number(state.config.refreshMinutes || 0);

      if (minutes > 0) {
        state.autoRefreshHandle = setInterval(loadDashboard, minutes * 60 * 1000);
      }
    }

    mountObjectiveFilters();
    mountTaskFilters();

    document.querySelectorAll(".objective-filter").forEach(filter => {
      filter.addEventListener("toggle", () => {
        if (!filter.open) return;

        closeObjectiveFilters(filter);

        if (filter.dataset.objectiveFilter === "search") {
          window.setTimeout(() => elements.objectiveSearch.focus(), 80);
        }
      });
    });

    document.querySelectorAll(".task-filter").forEach(filter => {
      filter.addEventListener("toggle", () => {
        if (!filter.open) return;
        closeTaskFilters(filter);
      });
    });

    document.querySelectorAll(".nav-link, .route-link").forEach(link => {
      link.addEventListener("click", () => navigate(link.dataset.route));
    });

    document.querySelectorAll(".fab-nav-link").forEach(link => {
      link.addEventListener("click", () => {
        navigate(link.dataset.route);
        closeFabMenu();
      });
    });

    window.addEventListener("hashchange", renderCurrentRoute);
    observeObjectiveDetailResize();

    const handleViewportResize = () => {
      if (state.currentRoute === "objectives") {
        requestAnimationFrame(syncObjectiveListHeight);
      }
    };

    window.addEventListener("resize", handleViewportResize);
    window.visualViewport?.addEventListener("resize", handleViewportResize);

    elements.fabPeriodFilter.value = elements.globalPeriodFilter.value;

    elements.globalPeriodFilter.addEventListener("change", () => {
      elements.fabPeriodFilter.value = elements.globalPeriodFilter.value;
      renderCurrentRoute();
    });

    elements.fabPeriodFilter.addEventListener("change", () => {
      elements.globalPeriodFilter.value = elements.fabPeriodFilter.value;
      renderCurrentRoute();
      closeFabMenu();
    });

    elements.refreshButton.addEventListener("click", loadDashboard);
    elements.fabRefreshButton.addEventListener("click", () => {
      closeFabMenu();
      loadDashboard();
    });

    elements.openConfigButton.addEventListener("click", openConfig);
    elements.fabOpenConfigButton.addEventListener("click", () => {
      closeFabMenu();
      openConfig();
    });

    elements.fabOpenCalendarButton.addEventListener("click", () => {
      closeFabMenu();
      openCalendar();
    });

    elements.closeCalendarButton?.addEventListener("click", closeCalendar);
    elements.calendarTodayButton?.addEventListener("click", () => {
      state.calendarDate = new Date();
      state.calendarView = "month";
      renderCalendar();
    });

    elements.calendarModal?.addEventListener("click", event => {
      if (event.target === elements.calendarModal) closeCalendar();
    });

    elements.closeCalendarDayModalButton.addEventListener("click", closeCalendarDayModal);
    elements.calendarDayModal.addEventListener("click", event => {
      if (event.target === elements.calendarDayModal) closeCalendarDayModal();
    });
    elements.calendarDayTimeline.addEventListener("click", event => {
      const activityTarget = event.target.closest("[data-activity-id]");
      if (!activityTarget) return;

      event.stopPropagation();
      closeCalendarDayModal();
      openActivityModal(activityTarget.dataset.activityId);
    });

    elements.adminLoginButton.addEventListener("click", event => {
      event.stopPropagation();
      submitAdminAuth();
    });
    elements.closeAdminAuthButton.addEventListener("click", event => {
      event.stopPropagation();
      closeAdminAuthModal();
    });
    elements.adminPasswordInput.addEventListener("input", () => {
      elements.adminAuthError.textContent = "";
      elements.adminPasswordInput.classList.remove("invalid");
    });
    elements.adminPasswordInput.addEventListener("keydown", event => {
      if (event.key === "Enter") submitAdminAuth();
    });

    elements.adminAuthModal.addEventListener("click", event => {
      event.stopPropagation();
      if (event.target === elements.adminAuthModal) closeAdminAuthModal();
    });

    elements.calendarPrevButton.addEventListener("click", () => {
      state.calendarDate = state.calendarView === "week"
        ? addDays(state.calendarDate, -7)
        : addMonths(state.calendarDate, -1);
      renderCalendar();
    });

    elements.calendarNextButton.addEventListener("click", () => {
      state.calendarDate = state.calendarView === "week"
        ? addDays(state.calendarDate, 7)
        : addMonths(state.calendarDate, 1);
      renderCalendar();
    });

    elements.calendarMonthInput.addEventListener("change", () => {
      const [year, month] = String(elements.calendarMonthInput.value || "").split("-").map(Number);
      if (!year || !month) return;

      state.calendarDate = new Date(year, month - 1, 1);
      renderCalendar();
    });

    document.querySelectorAll("[data-calendar-view]").forEach(button => {
      button.addEventListener("click", () => {
        state.calendarView = button.dataset.calendarView === "week" ? "week" : "month";
        renderCalendar();
      });
    });

    elements.calendarGrid.addEventListener("click", event => {
      if (event.target.closest("[data-activity-id]")) return;

      const day = event.target.closest("[data-calendar-day]");
      if (!day) return;

      const selected = parseDate(day.dataset.calendarDay);
      if (!selected) return;

      state.calendarDate = selected;
      renderCalendar();
      openCalendarDayModal(selected);
    });

    elements.fabToggle.addEventListener("click", toggleFabMenu);

    document.body.appendChild(elements.macroSectorSortMenu);

    elements.macroSectorSortButton.addEventListener("click", event => {
      event.stopPropagation();
      toggleSectorSortMenu();
    });

    elements.macroSectorSortMenu.addEventListener("pointerdown", handleSectorSortSelection);
    elements.macroSectorSortMenu.addEventListener("click", handleSectorSortSelection);

    document.addEventListener("click", event => {
      if (!elements.fabShell.contains(event.target)) closeFabMenu();
      if (!event.target.closest(".objective-filter-dock")) closeObjectiveFilters();
      if (!event.target.closest(".task-filter-dock")) closeTaskFilters();
      if (
        !elements.macroSectorSort.contains(event.target) &&
        !elements.macroSectorSortMenu.contains(event.target)
      ) {
        closeSectorSortMenu();
      }
    });

    window.addEventListener("resize", closeSectorSortMenu);

    elements.closeConfigButton.addEventListener("click", closeConfig);

    elements.saveConfigButton.addEventListener("click", async () => {
      const config = {
        url: normalizeBaseUrl(elements.supabaseUrlInput.value),
        anonKey: String(elements.supabaseKeyInput.value || "").trim(),
        refreshMinutes: Number(elements.refreshMinutesInput.value || 0)
      };

      if (!config.url || !config.anonKey) {
        alert("Informe a URL do Supabase e a chave pública anon.");
        return;
      }

      saveConfig(config);
      configureAutoRefresh();
      closeConfig();
      await loadDashboard();
    });

    elements.clearConfigButton.addEventListener("click", () => {
      localStorage.removeItem(STORAGE_KEY);
      state.config = loadConfig();
      state.activities = [];
      configureAutoRefresh();
      closeConfig();
      if (hasValidConfig()) {
        loadDashboard();
        return;
      }
      elements.setupBanner.style.display = hasValidConfig() ? "none" : "block";
      setConnectionState("", "Aguardando configuração");
      renderCurrentRoute();
    });

    elements.configModal.addEventListener("click", event => {
      if (event.target === elements.configModal) closeConfig();
    });

    elements.activityModal.addEventListener("click", event => {
      if (event.target === elements.activityModal) closeActivityModal();
    });

    elements.closeActivityModalButton.addEventListener("click", closeActivityModal);

    elements.objectiveList.addEventListener("click", event => {
      const button = event.target.closest("[data-objective]");
      if (!button) return;
      state.selectedObjective = decodeURIComponent(button.dataset.objective);
      renderObjectives();
      requestAnimationFrame(() => focusMobileObjectiveSelection(true));
    });

    [elements.objectiveSearch, elements.objectiveCategoryFilter, elements.objectiveSectorFilter]
      .forEach(input => {
        input.addEventListener("input", renderObjectives);
        input.addEventListener("change", renderObjectives);
      });

    [elements.objectiveCategoryFilter, elements.objectiveSectorFilter]
      .forEach(input => {
        input.addEventListener("change", () => closeObjectiveFilters());
      });

    elements.macroRecentObjectives.addEventListener("click", event => {
      const button = event.target.closest("[data-objective]");
      if (!button) return;
      state.selectedObjective = decodeURIComponent(button.dataset.objective);
      navigate("objectives");
    });

    elements.macroSectorTable.addEventListener("click", event => {
      const row = event.target.closest("[data-sector]");
      if (!row) return;

      elements.taskSectorFilter.value = row.dataset.sector;
      elements.taskObjectiveFilter.value = "";
      updateTaskFilterState();
      navigate("tasks");
    });

    [elements.taskSectorFilter, elements.taskObjectiveFilter]
      .forEach(input => {
        input.addEventListener("input", () => {
          updateTaskFilterState();
          renderTasks();
        });
        input.addEventListener("change", () => {
          updateTaskFilterState();
          renderTasks();
          closeTaskFilters();
        });
      });

    document.addEventListener("click", event => {
      const activityTarget = event.target.closest("[data-activity-id]");
      if (!activityTarget) return;
      openActivityModal(activityTarget.dataset.activityId);
    });

    document.addEventListener("keydown", event => {
      if (event.key !== "Escape") return;
      closeFabMenu();
      closeSectorSortMenu();
      closeObjectiveFilters();
      closeAdminAuthModal();
      closeConfig();
      closeActivityModal();
      closeCalendarDayModal();
      closeCalendar();
    });

    configureAutoRefresh();
    renderHeaderMeta();

    if (!location.hash) {
      location.hash = "#macro";
    }

    if (hasValidConfig()) {
      loadDashboard();
    } else {
      elements.setupBanner.style.display = "block";
      renderCurrentRoute();
    }
