"use strict";

    const STORAGE_KEY = "mhs_dashboard_cfg_v1";
    const SCHEMA = "tarefas_v2";

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
        subtitle: "Atividades sem objetivo e visão completa."
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
      taskSearch: $("taskSearch"),
      taskLayerFilter: $("taskLayerFilter"),
      taskStatusFilter: $("taskStatusFilter"),
      taskSectorFilter: $("taskSectorFilter"),
      clearTaskFilters: $("clearTaskFilters"),
      tasksTable: $("tasksTable"),

      configModal: $("configModal"),
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
      calendarFeed: $("calendarFeed")
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
        summary.innerHTML = objectiveFilterIcon(config.kind);

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

      document.querySelectorAll(".objective-filter").forEach(filter => {
        filter.classList.toggle("active", Boolean(states[filter.dataset.objectiveFilter]));
      });
    }

    function loadConfig() {
      try {
        const publicConfig = window.MHS_PUBLIC_CONFIG || {};
        const localConfig = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");

        return {
          ...DEFAULT_CONFIG,
          ...publicConfig,
          ...localConfig
        };
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
      return state.activities.filter(activity => {
        const sectors = [
          activity.executor_sector_name,
          activity.registered_by_sector_name,
          activitySector(activity)
        ].map(normalizeText);

        return sectors.some(sector => sector.includes("comercial"));
      });
    }

    function calendarEventText(activity) {
      return normalizeText([
        activity.title,
        activity.detailing,
        activity.source_channel
      ].filter(Boolean).join(" "));
    }

    function calendarEventLabel(activity) {
      const text = calendarEventText(activity);

      if (text.includes("reuniao") || text.includes("meeting") || text.includes("meet")) return "Reunião";
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
        activity.detailing
      ].filter(Boolean).join(" "));
    }

    function extractCalendarDateFromText(activity) {
      const text = calendarTextForDate(activity);
      const reference = calendarDateReference(activity);
      const candidates = [];

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
      return candidates
        .filter(date => date >= today)
        .sort((a, b) => a - b)[0] || null;
    }

    function scheduledCalendarDate(activity) {
      const today = startOfToday();
      const textDate = extractCalendarDateFromText(activity);
      const startDate = parseDate(activity.start_date);
      const dueDate = parseDate(activity.due_date);

      if (textDate) return textDate;
      if (startDate && startDate >= today) return startDate;
      if (dueDate && dueDate >= today) return dueDate;

      return null;
    }

    function pushCalendarEvent(events, activity, type, date, label) {
      if (!date) return;

      events.push({
        activity,
        type,
        date,
        key: dateKey(date),
        label
      });
    }

    function calendarEventsFromActivities(activities) {
      const events = [];

      for (const activity of activities) {
        const eventDate = scheduledCalendarDate(activity);
        if (!eventDate || !isCalendarEventActivity(activity)) continue;

        pushCalendarEvent(events, activity, "scheduled", eventDate, calendarEventLabel(activity));
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
        const list = grouped.get(event.key) || [];
        list.push(event);
        grouped.set(event.key, list);
      }

      return [...grouped.entries()]
        .map(([key, dayEvents]) => {
          const dayActivities = new Map();

          for (const event of dayEvents) {
            dayActivities.set(event.activity.id, event.activity);
          }

          return {
            key,
            date: parseDate(key),
            events: dayEvents,
            activities: [...dayActivities.values()]
          };
        })
        .filter(group => group.activities.length > 1)
        .sort((a, b) => a.date - b.date || b.activities.length - a.activities.length);
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

    function calendarEventButtonHtml(event, compact = false) {
      const tone = calendarEventTone(event);
      const title = event.activity.title || "Atividade sem título";
      const clientText = event.activity.client_supplier
        ? ` · ${event.activity.client_supplier}`
        : "";
      const peopleText = calendarPeopleSummary(event.activity, compact);
      const tooltip = `${title} · ${peopleText}`;

      return `
        <button type="button" class="calendar-event ${escapeHtml(tone)} ${compact ? "compact" : ""}" data-activity-id="${escapeHtml(event.activity.id)}" title="${escapeHtml(tooltip)}">
          <span class="calendar-event-type">${escapeHtml(event.label)}</span>
          <span class="calendar-event-title">${escapeHtml(truncate(title, compact ? 42 : 92))}</span>
          <span class="calendar-event-people">${escapeHtml(truncate(peopleText, compact ? 46 : 92))}</span>
          ${compact ? "" : `<span class="calendar-event-meta">${escapeHtml(formatDate(event.date))}${escapeHtml(clientText)}</span>`}
        </button>
      `;
    }

    function calendarEmptyHtml(message) {
      return `<div class="calendar-empty">${escapeHtml(message)}</div>`;
    }

    function calendarDayHtml(date, events, conflicts, period) {
      const key = dateKey(date);
      const dayEvents = events.filter(event => event.key === key);
      const conflict = conflicts.find(group => group.key === key);
      const isOutsideMonth = state.calendarView === "month" && date.getMonth() !== state.calendarDate.getMonth();
      const isToday = key === dateKey(new Date());
      const isSelected = key === dateKey(state.calendarDate);
      const visibleLimit = state.calendarView === "week" ? 5 : 1;
      const visibleEvents = dayEvents.slice(0, visibleLimit);
      const hidden = dayEvents.length - visibleEvents.length;

      return `
        <div class="calendar-day ${isOutsideMonth ? "outside" : ""} ${isToday ? "today" : ""} ${isSelected ? "selected" : ""} ${conflict ? "conflict" : ""}" data-calendar-day="${key}">
          <div class="calendar-day-top">
            <span class="calendar-day-number">${date.getDate()}</span>
            <span class="calendar-day-flags">
              ${dayEvents.length ? `<span class="calendar-day-count">${formatNumber(dayEvents.length)} evento${dayEvents.length > 1 ? "s" : ""}</span>` : ""}
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
          <strong>${escapeHtml(truncate(event.activity.title || "Evento sem título", 84))}</strong>
          <span>${escapeHtml(formatDate(event.date))} · ${escapeHtml(event.label)}</span>
          <small>${escapeHtml(calendarPeopleSummary(event.activity))}</small>
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
          <strong>${escapeHtml(formatDate(group.date))} · ${formatNumber(group.activities.length)} atividade(s)</strong>
          <span>${escapeHtml(titles.join(" · "))}${hidden > 0 ? ` +${formatNumber(hidden)}` : ""}</span>
        </div>
      `;
    }

    function renderCalendar() {
      const activities = calendarSectorActivities();
      const events = calendarEventsFromActivities(activities);
      const period = calendarPeriodRange();
      const periodEvents = periodCalendarEvents(events, period);
      const weekEvents = periodCalendarEvents(events, {
        start: startOfWeek(state.calendarDate),
        end: endOfWeek(state.calendarDate)
      });
      const upcomingEvents = calendarUpcomingEvents(events);
      const nextEvent = upcomingEvents[0] || null;
      const conflicts = calendarConflictGroups(periodEvents);
      const viewLabel = state.calendarView === "week" ? "Semana" : "Mês";

      elements.calendarMonthInput.value = monthInputValue(state.calendarDate);
      elements.calendarModalSubtitle.textContent =
        `Comercial · eventos futuros · ${formatMonthYear(state.calendarDate)}`;

      document.querySelectorAll("[data-calendar-view]").forEach(button => {
        button.classList.toggle("active", button.dataset.calendarView === state.calendarView);
      });

      elements.calendarInsights.innerHTML = [
        calendarInsightHtml("Eventos", formatNumber(periodEvents.length), viewLabel.toLowerCase()),
        calendarInsightHtml("Esta semana", formatNumber(weekEvents.length), "compromissos", weekEvents.length ? "active" : ""),
        calendarInsightHtml("Próximo", nextEvent ? formatDate(nextEvent.date) : "—", nextEvent ? truncate(nextEvent.activity.title || "Evento", 34) : "sem agenda futura", nextEvent ? "today" : ""),
        calendarInsightHtml("Conflitos", formatNumber(conflicts.length), "dias sensíveis", conflicts.length ? "warning" : "")
      ].join("");

      renderCalendarGrid(period, periodEvents, conflicts);

      elements.calendarDueCount.textContent = upcomingEvents.length
        ? formatNumber(upcomingEvents.length)
        : "";
      elements.calendarDueList.innerHTML = upcomingEvents.length
        ? upcomingEvents.slice(0, 8).map(calendarUpcomingItemHtml).join("")
        : calendarEmptyHtml("Nenhum evento comercial futuro identificado.");

      elements.calendarConflictCount.textContent = conflicts.length
        ? formatNumber(conflicts.length)
        : "";
      elements.calendarConflictList.innerHTML = conflicts.length
        ? conflicts.slice(0, 6).map(calendarConflictItemHtml).join("")
        : calendarEmptyHtml("Sem sobreposição de eventos agendados.");

      elements.calendarFeedTitle.textContent = state.calendarView === "week"
        ? "Eventos da semana"
        : "Eventos do mês";
      elements.calendarFeedCount.textContent = periodEvents.length
        ? formatNumber(periodEvents.length)
        : "";
      elements.calendarFeed.innerHTML = periodEvents.length
        ? periodEvents.map(event => calendarEventButtonHtml(event)).join("")
        : calendarEmptyHtml("Nenhum evento comercial neste período.");
    }

    function openCalendar() {
      renderCalendar();
      elements.calendarModal.style.display = "flex";
    }

    function closeCalendar() {
      elements.calendarModal.style.display = "none";
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
        openConfig();
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
        if (elements.calendarModal.style.display === "flex") renderCalendar();
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
          label: "Total de objetivos",
          value: formatNumber(objectives.length),
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
          label: "Ativas / atrasadas",
          value: `${formatNumber(stats.open)} / ${formatNumber(stats.overdue)}`,
          emoji: "⏳",
          tone: stats.overdue > 0 ? "warning" : ""
        },
        {
          label: "Conclusão",
          value: formatPercent(stats.completionRate),
          emoji: "🏁",
          tone: "success"
        }
      ].map(metricHtml).join("");

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

    function sectorPeopleCount(item) {
      const people = new Set();

      for (const activity of item.activities) {
        const responsible = activityResponsible(activity);
        const key = normalizeText(responsible);

        if (!key || key === "nao definido") continue;
        people.add(key);
      }

      return people.size;
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
        <span class="sector-people" title="${formatNumber(count)} pessoa(s) identificada(s) no setor" aria-label="${formatNumber(count)} pessoa(s) identificada(s) no setor">
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
          <td data-label="Total" class="number-cell">${formatNumber(item.total)}</td>
          <td data-label="Ativas" class="number-cell">${formatNumber(item.open)}</td>
          <td data-label="Atraso" class="number-cell ${item.overdue > 0 ? "overdue" : ""}">${formatNumber(item.overdue)}</td>
          <td data-label="Equipe agora">
            ${sectorLiveHtml(item)}
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

      if (!items.length) {
        list.style.height = "auto";
        list.style.maxHeight = "none";
        list.style.overflowY = "visible";
        if (listPanel) listPanel.style.minHeight = "";
        if (listBody) listBody.style.minHeight = "";
        if (detailPanel) detailPanel.style.minHeight = "";
        return;
      }

      if (window.matchMedia("(max-width: 1120px)").matches) {
        list.style.height = "auto";
        list.style.maxHeight = "min(62svh, 720px)";
        list.style.overflowY = items.length > 6 ? "auto" : "visible";
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
      list.style.overflowY = list.scrollHeight > targetHeight + 1 ? "auto" : "hidden";
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
      requestAnimationFrame(syncObjectiveListHeight);
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
      const currentObjectiveSector = elements.objectiveSectorFilter.value;
      const sectors = [...new Set(state.activities.map(activitySector).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, "pt-BR"));

      const options =
        `<option value="">Todos</option>` +
        sectors
          .map(sector => `<option value="${escapeHtml(sector)}">${escapeHtml(sector)}</option>`)
          .join("");

      elements.taskSectorFilter.innerHTML = options;
      elements.objectiveSectorFilter.innerHTML = options;

      if (sectors.includes(currentTaskSector)) {
        elements.taskSectorFilter.value = currentTaskSector;
      }

      if (sectors.includes(currentObjectiveSector)) {
        elements.objectiveSectorFilter.value = currentObjectiveSector;
      }
    }

    function filteredTasks() {
      const search = normalizeText(elements.taskSearch.value);
      const layer = elements.taskLayerFilter.value;
      const status = elements.taskStatusFilter.value;
      const sector = elements.taskSectorFilter.value;

      return currentActivities().filter(activity => {
        const objective = activityObjective(activity);
        const normalizedStatus = normalizeStatus(activity.status);

        const matchesLayer =
          layer === "all" ||
          (layer === "routine" && !objective) ||
          (layer === "objectives" && objective);

        const matchesStatus =
          !status ||
          (status === "open" && isOpen(activity)) ||
          (status === "overdue" && isOverdue(activity)) ||
          (status === "without_due" && isMissingDueDate(activity)) ||
          normalizedStatus === status;

        const matchesSector = !sector || activitySector(activity) === sector;

        const haystack = normalizeText([
          activity.title,
          activity.detailing,
          activity.objective_text,
          activity.client_supplier,
          activity.registered_by_name,
          activity.executor_name,
          activitySector(activity)
        ].join(" "));

        return matchesLayer && matchesStatus && matchesSector && (!search || haystack.includes(search));
      });
    }

    function renderTasks() {
      const tasks = sortActivities(filteredTasks());

      elements.tasksCountLabel.textContent = `${formatNumber(tasks.length)} atividade(s)`;

      elements.tasksTable.innerHTML = tasks.length
        ? tasks.map(activityRowHtml).join("")
        : `
          <tr>
            <td colspan="7">
              <div class="empty">Nenhuma atividade encontrada.</div>
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

      return `
        <tr class="${activityRowClass(activity)} ${activitySurfacePulseClass(activity)}" data-activity-id="${escapeHtml(activity.id)}">
          <td data-label="Nº">${escapeHtml(activity.activity_number ?? "—")}</td>
          <td data-label="Atividade">
            <span class="activity-title">${escapeHtml(activity.title || "Atividade sem título")}</span>
            ${
              activity.detailing
                ? `<span class="activity-detail">${escapeHtml(truncate(activity.detailing, 210))}</span>`
                : ""
            }
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
          <td data-label="Responsável">${escapeHtml(activityResponsible(activity))}</td>
          <td data-label="Setor">${escapeHtml(activitySector(activity))}</td>
          <td data-label="Objetivo">${escapeHtml(activityObjective(activity) || "Sem objetivo")}</td>
          <td data-label="Prazo" class="${dueClass(activity)}">${escapeHtml(dateValue ? formatDate(dateValue) : "Sem prazo")}</td>
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

    function toggleFabMenu() {
      if (elements.fabShell.classList.contains("open")) {
        closeFabMenu();
      } else {
        openFabMenu();
      }
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

      document.querySelectorAll(".fab-nav-link").forEach(link => {
        link.classList.toggle("active", link.dataset.route === state.currentRoute);
      });

      if (state.currentRoute === "macro") renderMacro();
      if (state.currentRoute === "objectives") renderObjectives();
      if (state.currentRoute === "tasks") renderTasks();

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

    document.querySelectorAll(".objective-filter").forEach(filter => {
      filter.addEventListener("toggle", () => {
        if (!filter.open) return;

        closeObjectiveFilters(filter);

        if (filter.dataset.objectiveFilter === "search") {
          window.setTimeout(() => elements.objectiveSearch.focus(), 80);
        }
      });
    });

    document.querySelectorAll(".nav-link").forEach(link => {
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

    elements.closeCalendarButton.addEventListener("click", closeCalendar);

    elements.calendarModal.addEventListener("click", event => {
      if (event.target === elements.calendarModal) closeCalendar();
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
      state.config = { ...DEFAULT_CONFIG };
      state.activities = [];
      configureAutoRefresh();
      closeConfig();
      elements.setupBanner.style.display = "block";
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

      elements.taskLayerFilter.value = "all";
      elements.taskStatusFilter.value = "";
      elements.taskSectorFilter.value = row.dataset.sector;
      navigate("tasks");
    });

    [elements.taskSearch, elements.taskLayerFilter, elements.taskStatusFilter, elements.taskSectorFilter]
      .forEach(input => {
        input.addEventListener("input", renderTasks);
        input.addEventListener("change", renderTasks);
      });

    elements.clearTaskFilters.addEventListener("click", () => {
      elements.taskSearch.value = "";
      elements.taskLayerFilter.value = "routine";
      elements.taskStatusFilter.value = "";
      elements.taskSectorFilter.value = "";
      renderTasks();
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
      closeConfig();
      closeActivityModal();
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
