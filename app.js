"use strict";

import {
  STATUS_ORDER,
  PRIORITY_RANK,
  todayISO,
  validateProjectData,
  normalizeProject,
  normalizeBudget,
  parseTags,
  filterAndSortProjects,
  isOverdue,
} from "./logic.mjs";

const STORAGE_KEY = "project_manager_projects_v2";
const LEGACY_STORAGE_KEYS = ["project_manager_projects", "project_manager_projects_v1"];
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;

const form = document.getElementById("project-form");
const statusMessage = document.getElementById("app-status");

const inputs = {
  id: document.getElementById("project-id"),
  name: document.getElementById("name"),
  owner: document.getElementById("owner"),
  status: document.getElementById("status"),
  priority: document.getElementById("priority"),
  dueDate: document.getElementById("dueDate"),
  budget: document.getElementById("budget"),
  tags: document.getElementById("tags"),
  description: document.getElementById("description"),
};

const submitBtn = document.getElementById("submit-btn");
const formTitle = document.getElementById("form-title");
const cancelEditBtn = document.getElementById("cancel-edit");

const listView = document.getElementById("list-view");
const kanbanView = document.getElementById("kanban-view");
const kanbanColumns = {
  pendiente: document.getElementById("kanban-pendiente"),
  "en-progreso": document.getElementById("kanban-en-progreso"),
  completado: document.getElementById("kanban-completado"),
};

const searchInput = document.getElementById("search");
const filterStatus = document.getElementById("filter-status");
const filterPriority = document.getElementById("filter-priority");
const filterOwner = document.getElementById("filter-owner");
const sortBy = document.getElementById("sort-by");
const projectCount = document.getElementById("project-count");

const resetFiltersBtn = document.getElementById("reset-filters");
const clearCompletedBtn = document.getElementById("clear-completed");
const exportBtn = document.getElementById("export-btn");
const importFileInput = document.getElementById("import-file");

const viewListBtn = document.getElementById("view-list");
const viewKanbanBtn = document.getElementById("view-kanban");

const metrics = {
  total: document.getElementById("metric-total"),
  progress: document.getElementById("metric-progress"),
  overdue: document.getElementById("metric-overdue"),
  completion: document.getElementById("metric-completion"),
};

const state = {
  projects: loadProjects(),
  currentView: "list",
};

function setStatusMessage(message, type = "info") {
  statusMessage.textContent = message;
  statusMessage.dataset.type = type;
}

function safeJSONParse(raw, fallback = null) {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function readStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    setStatusMessage("No se pudo leer almacenamiento local.", "error");
    return null;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    setStatusMessage("No se pudo guardar. Revisa espacio de almacenamiento.", "error");
    return false;
  }
}

function saveProjects() {
  return writeStorage(STORAGE_KEY, JSON.stringify(state.projects));
}

function loadProjects() {
  const keys = [STORAGE_KEY, ...LEGACY_STORAGE_KEYS];

  for (const key of keys) {
    const raw = readStorage(key);
    if (!raw) continue;

    const parsed = safeJSONParse(raw, []);
    if (!Array.isArray(parsed)) continue;

    const normalized = parsed.map((item) => normalizeProject(item)).filter(Boolean);
    if (normalized.length && key !== STORAGE_KEY) {
      writeStorage(STORAGE_KEY, JSON.stringify(normalized));
    }
    return normalized;
  }

  return [];
}

function formatDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Sin fecha";

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatMoney(value) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function getStatusLabel(status) {
  if (status === "en-progreso") return "En progreso";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function getPriorityLabel(priority) {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

function getFilteredProjects() {
  return filterAndSortProjects(state.projects, {
    search: searchInput.value,
    status: filterStatus.value,
    priority: filterPriority.value,
    owner: filterOwner.value,
    sortKey: sortBy.value,
  });
}

function buildTagList(tags) {
  if (!tags.length) return null;
  const wrapper = document.createElement("div");
  wrapper.className = "tags";
  tags.forEach((tag) => {
    const span = document.createElement("span");
    span.className = "tag";
    span.textContent = `#${tag}`;
    wrapper.appendChild(span);
  });
  return wrapper;
}

function createButton(label, action, classes = "icon-btn") {
  const button = document.createElement("button");
  button.className = classes;
  button.type = "button";
  button.dataset.action = action;
  button.textContent = label;
  return button;
}

function createProjectCard(project, compact) {
  const card = document.createElement("article");
  card.className = `project-card${compact ? " compact" : ""}`;
  card.dataset.id = project.id;

  if (isOverdue(project)) card.classList.add("overdue");

  const title = document.createElement("h3");
  title.textContent = project.name;

  const meta = document.createElement("p");
  meta.className = "meta";
  meta.textContent = `Responsable: ${project.owner}`;

  const badges = document.createElement("div");
  badges.className = "badges";

  const statusBadge = document.createElement("span");
  statusBadge.className = "badge status-badge";
  statusBadge.dataset.status = project.status;
  statusBadge.textContent = getStatusLabel(project.status);

  const priorityBadge = document.createElement("span");
  priorityBadge.className = "badge priority-badge";
  priorityBadge.dataset.priority = project.priority;
  priorityBadge.textContent = `Prioridad ${getPriorityLabel(project.priority)}`;

  const description = document.createElement("p");
  description.className = "description";
  description.textContent = project.description || "Sin descripción";

  const info = document.createElement("p");
  info.className = "meta mono";
  info.textContent = `Entrega: ${formatDate(project.dueDate)} | Presupuesto: ${formatMoney(project.budget)}`;

  badges.append(statusBadge, priorityBadge);

  const actions = document.createElement("div");
  actions.className = "project-actions";
  actions.append(
    createButton("Editar", "edit"),
    createButton("Estado", "toggle-status"),
    createButton("Eliminar", "delete", "icon-btn danger")
  );

  card.append(title, meta, badges, description, info);

  const tags = buildTagList(project.tags);
  if (tags) card.appendChild(tags);

  card.appendChild(actions);
  return card;
}

function renderList(items) {
  listView.innerHTML = "";

  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "No hay proyectos para mostrar.";
    listView.appendChild(empty);
    return;
  }

  const grid = document.createElement("div");
  grid.className = "project-grid";
  items.forEach((project) => grid.appendChild(createProjectCard(project, false)));
  listView.appendChild(grid);
}

function renderKanban(items) {
  Object.values(kanbanColumns).forEach((column) => {
    column.innerHTML = "";
  });

  STATUS_ORDER.forEach((status) => {
    const statusItems = items.filter((project) => project.status === status);

    if (!statusItems.length) {
      const empty = document.createElement("p");
      empty.className = "empty small";
      empty.textContent = "Sin proyectos";
      kanbanColumns[status].appendChild(empty);
      return;
    }

    statusItems.forEach((project) => {
      kanbanColumns[status].appendChild(createProjectCard(project, true));
    });
  });
}

function renderMetrics() {
  const total = state.projects.length;
  const inProgress = state.projects.filter((project) => project.status === "en-progreso").length;
  const overdue = state.projects.filter((project) => isOverdue(project)).length;
  const completed = state.projects.filter((project) => project.status === "completado").length;
  const completion = total === 0 ? 0 : Math.round((completed / total) * 100);

  metrics.total.textContent = String(total);
  metrics.progress.textContent = String(inProgress);
  metrics.overdue.textContent = String(overdue);
  metrics.completion.textContent = `${completion}%`;
}

function render() {
  const visibleProjects = getFilteredProjects();
  renderList(visibleProjects);
  renderKanban(visibleProjects);
  renderMetrics();

  projectCount.textContent = `${visibleProjects.length} proyecto${visibleProjects.length === 1 ? "" : "s"} visibles`;
}

function resetFormState() {
  form.reset();
  inputs.id.value = "";
  inputs.dueDate.value = todayISO();
  inputs.budget.value = "0";

  formTitle.textContent = "Nuevo proyecto";
  submitBtn.textContent = "Guardar proyecto";
  cancelEditBtn.classList.add("hidden");
}

function loadProjectIntoForm(projectId) {
  const project = state.projects.find((item) => item.id === projectId);
  if (!project) return;

  inputs.id.value = project.id;
  inputs.name.value = project.name;
  inputs.owner.value = project.owner;
  inputs.status.value = project.status;
  inputs.priority.value = project.priority;
  inputs.dueDate.value = project.dueDate;
  inputs.budget.value = String(project.budget);
  inputs.tags.value = project.tags.join(", ");
  inputs.description.value = project.description;

  formTitle.textContent = "Editando proyecto";
  submitBtn.textContent = "Actualizar proyecto";
  cancelEditBtn.classList.remove("hidden");
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function cycleStatus(currentStatus) {
  const currentIndex = STATUS_ORDER.indexOf(currentStatus);
  const nextIndex = (currentIndex + 1) % STATUS_ORDER.length;
  return STATUS_ORDER[nextIndex];
}

function performCardAction(eventTarget) {
  const button = eventTarget.closest("button[data-action]");
  if (!button) return false;

  const card = button.closest(".project-card");
  if (!card) return false;

  const projectId = card.dataset.id;
  const action = button.dataset.action;

  if (action === "edit") {
    loadProjectIntoForm(projectId);
    return true;
  }

  if (action === "delete") {
    const confirmed = window.confirm("¿Eliminar este proyecto? Esta acción no se puede deshacer.");
    if (!confirmed) return true;

    state.projects = state.projects.filter((project) => project.id !== projectId);
    if (inputs.id.value === projectId) resetFormState();
    saveProjects();
    setStatusMessage("Proyecto eliminado.", "success");
    render();
    return true;
  }

  if (action === "toggle-status") {
    state.projects = state.projects.map((project) => {
      if (project.id !== projectId) return project;
      return { ...project, status: cycleStatus(project.status), updatedAt: Date.now() };
    });

    saveProjects();
    setStatusMessage("Estado actualizado.", "success");
    render();
    return true;
  }

  return false;
}

function setView(view) {
  state.currentView = view;
  const listActive = view === "list";

  listView.classList.toggle("hidden", !listActive);
  kanbanView.classList.toggle("hidden", listActive);

  viewListBtn.classList.toggle("active", listActive);
  viewKanbanBtn.classList.toggle("active", !listActive);

  viewListBtn.setAttribute("aria-selected", String(listActive));
  viewKanbanBtn.setAttribute("aria-selected", String(!listActive));
}

function debounce(fn, delayMs = 200) {
  let timeoutId = null;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delayMs);
  };
}

function resetFilters() {
  searchInput.value = "";
  filterStatus.value = "todos";
  filterPriority.value = "todas";
  filterOwner.value = "";
  sortBy.value = "dueDate";
  render();
}

function exportProjects() {
  const blob = new Blob([JSON.stringify(state.projects, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `proyectos-${todayISO()}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);

  setStatusMessage("Exportación completada.", "success");
}

function mergeProjects(importedProjects) {
  const byId = new Map(state.projects.map((project) => [project.id, project]));
  importedProjects.forEach((project) => byId.set(project.id, project));
  state.projects = [...byId.values()];
}

async function importProjectsFromFile(file) {
  if (!file) return;

  if (file.size > MAX_FILE_SIZE_BYTES) {
    setStatusMessage("Archivo demasiado grande. Máximo 2MB.", "error");
    return;
  }

  try {
    const text = await file.text();
    const parsed = safeJSONParse(text, null);
    if (!Array.isArray(parsed)) {
      setStatusMessage("El JSON debe contener un arreglo de proyectos.", "error");
      return;
    }

    const normalized = parsed.map((item) => normalizeProject(item)).filter(Boolean);
    mergeProjects(normalized);

    if (saveProjects()) {
      resetFormState();
      render();
      setStatusMessage(`Importación completada: ${normalized.length} proyecto(s).`, "success");
    }
  } catch {
    setStatusMessage("No se pudo importar el archivo JSON.", "error");
  }
}

function bindEvents() {
  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const data = Object.fromEntries(new FormData(form).entries());
    const validation = validateProjectData(data);

    if (!validation.valid) {
      setStatusMessage(validation.message, "error");
      return;
    }

    if (data.projectId) {
      const existing = state.projects.find((project) => project.id === data.projectId);
      if (!existing) {
        setStatusMessage("No se encontró el proyecto a editar.", "error");
        return;
      }

      const updated = {
        ...existing,
        name: data.name.trim(),
        owner: data.owner.trim(),
        status: data.status,
        priority: data.priority,
        dueDate: data.dueDate,
        budget: normalizeBudget(data.budget),
        tags: parseTags(data.tags),
        description: data.description.trim(),
        updatedAt: Date.now(),
      };

      state.projects = state.projects.map((project) => (project.id === updated.id ? updated : project));
      setStatusMessage("Proyecto actualizado.", "success");
    } else {
      state.projects.push({
        id: crypto.randomUUID(),
        name: data.name.trim(),
        owner: data.owner.trim(),
        status: data.status,
        priority: data.priority,
        dueDate: data.dueDate,
        budget: normalizeBudget(data.budget),
        tags: parseTags(data.tags),
        description: data.description.trim(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      setStatusMessage("Proyecto creado.", "success");
    }

    if (saveProjects()) {
      resetFormState();
      render();
    }
  });

  cancelEditBtn.addEventListener("click", resetFormState);

  [listView, kanbanView].forEach((container) => {
    container.addEventListener("click", (event) => {
      performCardAction(event.target);
    });
  });

  const debouncedRender = debounce(render, 180);
  [searchInput, filterOwner].forEach((control) => {
    control.addEventListener("input", debouncedRender);
  });

  [filterStatus, filterPriority, sortBy].forEach((control) => {
    control.addEventListener("change", render);
  });

  resetFiltersBtn.addEventListener("click", () => {
    resetFilters();
    setStatusMessage("Filtros restablecidos.", "info");
  });

  clearCompletedBtn.addEventListener("click", () => {
    const totalCompleted = state.projects.filter((project) => project.status === "completado").length;
    if (!totalCompleted) {
      setStatusMessage("No hay proyectos completados para borrar.", "info");
      return;
    }

    const confirmed = window.confirm(`Se eliminarán ${totalCompleted} proyecto(s) completados. ¿Continuar?`);
    if (!confirmed) return;

    state.projects = state.projects.filter((project) => project.status !== "completado");
    if (saveProjects()) {
      render();
      setStatusMessage("Proyectos completados eliminados.", "success");
    }
  });

  viewListBtn.addEventListener("click", () => setView("list"));
  viewKanbanBtn.addEventListener("click", () => setView("kanban"));

  exportBtn.addEventListener("click", exportProjects);

  importFileInput.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    await importProjectsFromFile(file);
    importFileInput.value = "";
  });
}

function init() {
  inputs.dueDate.value = todayISO();
  inputs.budget.value = "0";
  setView("list");
  bindEvents();
  render();
  setStatusMessage("Aplicación lista.", "info");
}

init();
