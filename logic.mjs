export const MAX_TAGS = 8;
export const STATUS_ORDER = ["pendiente", "en-progreso", "completado"];
export const PRIORITY_RANK = { alta: 3, media: 2, baja: 1 };

export function todayISO(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function validateDueDate(date) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(date || ""));
}

export function normalizeBudget(rawBudget) {
  const numeric = Number(rawBudget);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : 0;
}

export function parseTags(rawTags) {
  return String(rawTags || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .filter((tag, index, all) => all.indexOf(tag) === index)
    .slice(0, MAX_TAGS);
}

export function validateProjectData(data) {
  const name = String(data?.name || "").trim();
  const owner = String(data?.owner || "").trim();

  if (!name || !owner) {
    return { valid: false, message: "Nombre y responsable son obligatorios." };
  }

  if (!validateDueDate(data?.dueDate)) {
    return { valid: false, message: "La fecha límite no es válida." };
  }

  if (!Object.prototype.hasOwnProperty.call(PRIORITY_RANK, data?.priority)) {
    return { valid: false, message: "La prioridad seleccionada no es válida." };
  }

  if (!STATUS_ORDER.includes(data?.status)) {
    return { valid: false, message: "El estado seleccionado no es válido." };
  }

  if (!Number.isFinite(Number(data?.budget)) || Number(data?.budget) < 0) {
    return { valid: false, message: "El presupuesto debe ser un número positivo." };
  }

  return { valid: true, message: "" };
}

export function isOverdue(project, today = todayISO()) {
  return project.status !== "completado" && project.dueDate < today;
}

export function normalizeProject(project, now = Date.now()) {
  if (!project || typeof project !== "object") return null;
  if (!project.id || !project.name || !project.owner) return null;

  const status = STATUS_ORDER.includes(project.status) ? project.status : "pendiente";
  const priority = Object.prototype.hasOwnProperty.call(PRIORITY_RANK, project.priority)
    ? project.priority
    : "media";

  return {
    id: String(project.id),
    name: String(project.name).trim(),
    owner: String(project.owner).trim(),
    status,
    priority,
    dueDate: validateDueDate(project.dueDate) ? project.dueDate : todayISO(),
    budget: normalizeBudget(project.budget),
    tags: Array.isArray(project.tags)
      ? project.tags
          .map((tag) => String(tag).trim().toLowerCase())
          .filter(Boolean)
          .filter((tag, index, all) => all.indexOf(tag) === index)
          .slice(0, MAX_TAGS)
      : [],
    description: String(project.description || "").trim(),
    createdAt: Number(project.createdAt) || now,
    updatedAt: Number(project.updatedAt) || now,
  };
}

export function filterAndSortProjects(items, filters) {
  const {
    search = "",
    status = "todos",
    priority = "todas",
    owner = "",
    sortKey = "dueDate",
  } = filters;

  const searchValue = search.trim().toLowerCase();
  const ownerValue = owner.trim().toLowerCase();

  return items
    .filter((project) => {
      const inSearch =
        project.name.toLowerCase().includes(searchValue) ||
        project.owner.toLowerCase().includes(searchValue) ||
        project.tags.join(" ").includes(searchValue) ||
        project.description.toLowerCase().includes(searchValue);

      const inStatus = status === "todos" || project.status === status;
      const inPriority = priority === "todas" || project.priority === priority;
      const inOwner = !ownerValue || project.owner.toLowerCase().includes(ownerValue);

      return inSearch && inStatus && inPriority && inOwner;
    })
    .sort((a, b) => {
      if (sortKey === "priority") return PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
      if (sortKey === "status") return STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
      if (sortKey === "newest") return b.createdAt - a.createdAt;
      if (sortKey === "name") return a.name.localeCompare(b.name, "es", { sensitivity: "base" });
      return a.dueDate.localeCompare(b.dueDate);
    });
}
