export const datePlanStatuses = new Set(["proposed", "accepted", "declined", "countered", "completed", "cancelled", "no_show", "unresponsive"]);

const transitions = {
  proposed: new Set(["accepted", "declined", "countered", "cancelled", "unresponsive"]),
  countered: new Set(["accepted", "declined", "countered", "cancelled", "unresponsive"]),
  accepted: new Set(["completed", "cancelled", "no_show", "unresponsive"]),
  declined: new Set(["proposed"]),
  cancelled: new Set(["proposed"]),
  no_show: new Set(["proposed"]),
  unresponsive: new Set(["proposed", "cancelled"]),
  completed: new Set(),
};

export function canTransitionDatePlan(from, to) {
  return datePlanStatuses.has(from) && datePlanStatuses.has(to) && (from === to || transitions[from].has(to));
}

export function normalizeDateFeedback(value) {
  const outcome = ["continue", "pause", "close"].includes(value?.outcome) ? value.outcome : null;
  if (!outcome) return null;
  return {
    outcome,
    feltSafe: value?.feltSafe !== false,
    useForMatching: value?.useForMatching === true,
    notes: String(value?.notes || "").trim().slice(0, 1000),
  };
}
