const STORAGE_KEY = "behavior-review-system-v1";
const CATEGORIES = ["决策", "执行", "精力", "学习", "娱乐", "其他"];
const DECISIONS = ["", "保留", "放弃", "调整"];
const RESULT_LABELS = {
  success: "成功",
  failure: "失败"
};

const refs = {
  todayText: document.getElementById("todayText"),
  tabs: document.querySelectorAll(".tab"),
  views: document.querySelectorAll(".view"),
  reviewForm: document.getElementById("reviewForm"),
  reviewSavedState: document.getElementById("reviewSavedState"),
  reviewCompleted: document.getElementById("reviewCompleted"),
  reviewProblem: document.getElementById("reviewProblem"),
  reviewImprove: document.getElementById("reviewImprove"),
  reviewSummary: document.getElementById("reviewSummary"),
  principleReminderList: document.getElementById("principleReminderList"),
  refreshPrinciplesBtn: document.getElementById("refreshPrinciplesBtn"),
  principleForm: document.getElementById("principleForm"),
  principleFormTitle: document.getElementById("principleFormTitle"),
  principleSubmitBtn: document.getElementById("principleSubmitBtn"),
  principleCancelBtn: document.getElementById("principleCancelBtn"),
  principleId: document.getElementById("principleId"),
  principleText: document.getElementById("principleText"),
  principleCategory: document.getElementById("principleCategory"),
  principleList: document.getElementById("principleList"),
  experimentForm: document.getElementById("experimentForm"),
  experimentFormTitle: document.getElementById("experimentFormTitle"),
  experimentSubmitBtn: document.getElementById("experimentSubmitBtn"),
  experimentCancelBtn: document.getElementById("experimentCancelBtn"),
  experimentId: document.getElementById("experimentId"),
  experimentName: document.getElementById("experimentName"),
  experimentStartDate: document.getElementById("experimentStartDate"),
  experimentEndDate: document.getElementById("experimentEndDate"),
  experimentChangeTarget: document.getElementById("experimentChangeTarget"),
  experimentTrigger: document.getElementById("experimentTrigger"),
  experimentAlternative: document.getElementById("experimentAlternative"),
  experimentSuccessCriteria: document.getElementById("experimentSuccessCriteria"),
  experimentFinalDecision: document.getElementById("experimentFinalDecision"),
  experimentFinalReview: document.getElementById("experimentFinalReview"),
  dashboardExperimentList: document.getElementById("dashboardExperimentList"),
  experimentList: document.getElementById("experimentList"),
  reviewHistoryList: document.getElementById("reviewHistoryList"),
  experimentHistoryList: document.getElementById("experimentHistoryList"),
  toast: document.getElementById("toast")
};

let state = loadState();
let reminderIds = [];
let toastTimer = 0;

init();

function init() {
  ensureSeedPrinciples();
  setTodayText();
  bindEvents();
  resetPrincipleForm();
  resetExperimentForm();
  fillTodayReview();
  refreshPrincipleReminders();
  render();
}

function bindEvents() {
  refs.tabs.forEach((tab) => {
    tab.addEventListener("click", () => switchView(tab.dataset.view));
  });

  document.addEventListener("click", (event) => {
    const navButton = event.target.closest("[data-go-view]");
    if (navButton) {
      switchView(navButton.dataset.goView);
    }
  });

  refs.reviewForm.addEventListener("submit", handleReviewSubmit);
  refs.refreshPrinciplesBtn.addEventListener("click", () => {
    refreshPrincipleReminders();
    renderPrincipleReminders();
  });

  refs.principleForm.addEventListener("submit", handlePrincipleSubmit);
  refs.principleCancelBtn.addEventListener("click", resetPrincipleForm);
  refs.principleList.addEventListener("click", handlePrincipleListClick);

  refs.experimentForm.addEventListener("submit", handleExperimentSubmit);
  refs.experimentCancelBtn.addEventListener("click", resetExperimentForm);
  refs.experimentStartDate.addEventListener("change", () => {
    if (refs.experimentStartDate.value) {
      refs.experimentEndDate.value = addDays(refs.experimentStartDate.value, 29);
    }
  });
  refs.experimentList.addEventListener("click", handleExperimentClick);
  refs.dashboardExperimentList.addEventListener("click", handleExperimentClick);
}

function createInitialState() {
  return {
    reviews: {},
    principles: [],
    experiments: []
  };
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return createInitialState();
  }

  try {
    return normalizeState(JSON.parse(raw));
  } catch (error) {
    console.error("读取本地数据失败，已使用空数据。", error);
    return createInitialState();
  }
}

function normalizeState(rawState) {
  const nextState = createInitialState();

  if (rawState?.reviews && typeof rawState.reviews === "object") {
    Object.entries(rawState.reviews).forEach(([dateKey, review]) => {
      if (isDateKey(dateKey)) {
        nextState.reviews[dateKey] = normalizeReview({ ...review, date: dateKey });
      }
    });
  }

  if (Array.isArray(rawState?.principles)) {
    nextState.principles = rawState.principles.map(normalizePrinciple).filter((item) => item.text);
  }

  if (Array.isArray(rawState?.experiments)) {
    nextState.experiments = rawState.experiments.map(normalizeExperiment).filter((item) => item.name);
  }

  return nextState;
}

function normalizeReview(review) {
  const now = new Date().toISOString();
  return {
    date: isDateKey(review?.date) ? review.date : getDateKey(),
    completed: String(review?.completed || ""),
    problem: String(review?.problem || ""),
    improve: String(review?.improve || ""),
    summary: String(review?.summary || ""),
    createdAt: review?.createdAt || now,
    updatedAt: review?.updatedAt || now
  };
}

function normalizePrinciple(principle) {
  const now = new Date().toISOString();
  return {
    id: String(principle?.id || createId()),
    text: String(principle?.text || "").trim(),
    category: CATEGORIES.includes(principle?.category) ? principle.category : "其他",
    createdAt: principle?.createdAt || now,
    updatedAt: principle?.updatedAt || now
  };
}

function normalizeExperiment(experiment) {
  const startDate = isDateKey(experiment?.startDate) ? experiment.startDate : getDateKey();
  const now = new Date().toISOString();
  const logs = {};

  if (experiment?.logs && typeof experiment.logs === "object") {
    Object.entries(experiment.logs).forEach(([dateKey, result]) => {
      if (isDateKey(dateKey) && ["success", "failure"].includes(result)) {
        logs[dateKey] = result;
      }
    });
  }

  return {
    id: String(experiment?.id || createId()),
    name: String(experiment?.name || "").trim(),
    changeTarget: String(experiment?.changeTarget || ""),
    trigger: String(experiment?.trigger || ""),
    alternative: String(experiment?.alternative || ""),
    successCriteria: String(experiment?.successCriteria || ""),
    startDate,
    endDate: isDateKey(experiment?.endDate) ? experiment.endDate : addDays(startDate, 29),
    logs,
    finalDecision: DECISIONS.includes(experiment?.finalDecision) ? experiment.finalDecision : "",
    finalReview: String(experiment?.finalReview || ""),
    createdAt: experiment?.createdAt || now,
    updatedAt: experiment?.updatedAt || now
  };
}

function ensureSeedPrinciples() {
  if (state.principles.length) {
    return;
  }

  state.principles = [
    ["当我想刷短视频时，我就先做5分钟主线任务。", "娱乐"],
    ["当我犹豫要不要做一件小事时，我就默认去做。", "决策"],
    ["当任务太大导致抗拒时，我就只做第一个动作。", "执行"],
    ["当我疲惫到想逃避时，我就先休息10分钟再决定。", "精力"],
    ["当我想临时换目标时，我就先写下换目标的理由。", "决策"],
    ["当我学不进去时，我就把问题改写成一个最小问题。", "学习"]
  ].map(([text, category]) => normalizePrinciple({ text, category }));
  persist();
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function render() {
  renderReviewState();
  renderPrincipleReminders();
  renderPrincipleList();
  renderDashboardExperiments();
  renderExperimentList();
  renderReviewHistory();
  renderExperimentHistory();
}

function setTodayText() {
  const today = new Date();
  refs.todayText.textContent = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
}

function switchView(viewName) {
  refs.tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.view === viewName));
  refs.views.forEach((view) => view.classList.toggle("active", view.id === `${viewName}View`));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function fillTodayReview() {
  const review = state.reviews[getDateKey()];
  refs.reviewCompleted.value = review?.completed || "";
  refs.reviewProblem.value = review?.problem || "";
  refs.reviewImprove.value = review?.improve || "";
  refs.reviewSummary.value = review?.summary || "";
}

function renderReviewState() {
  const review = state.reviews[getDateKey()];
  refs.reviewSavedState.textContent = review ? "今日已保存" : "未保存";
}

function refreshPrincipleReminders() {
  const count = Math.min(state.principles.length, state.principles.length <= 2 ? 2 : 3);
  reminderIds = shuffle([...state.principles]).slice(0, count).map((principle) => principle.id);
}

function renderPrincipleReminders() {
  const reminders = reminderIds.map(getPrincipleById).filter(Boolean);

  if (!reminders.length) {
    refs.principleReminderList.innerHTML = `<div class="empty-state">原则库为空。先添加一条“当我____时，我就____。”</div>`;
    return;
  }

  refs.principleReminderList.innerHTML = reminders
    .map(
      (principle) => `
        <article class="principle-card">
          <div class="card-top">
            <p class="principle-text">${escapeHtml(principle.text)}</p>
            <span class="tag">${escapeHtml(principle.category)}</span>
          </div>
        </article>
      `
    )
    .join("");
}

function renderPrincipleList() {
  if (!state.principles.length) {
    refs.principleList.innerHTML = `<div class="empty-state">还没有原则。</div>`;
    return;
  }

  refs.principleList.innerHTML = state.principles
    .map(
      (principle) => `
        <article class="principle-card" data-principle-id="${escapeHtml(principle.id)}">
          <div class="card-top">
            <p class="principle-text">${escapeHtml(principle.text)}</p>
            <span class="tag">${escapeHtml(principle.category)}</span>
          </div>
          <div class="card-actions">
            <button class="small-btn" type="button" data-action="edit-principle">编辑</button>
            <button class="danger-btn" type="button" data-action="delete-principle">删除</button>
          </div>
        </article>
      `
    )
    .join("");
}

function renderDashboardExperiments() {
  const currentExperiments = getCurrentExperiments().slice(0, 2);

  if (!currentExperiments.length) {
    refs.dashboardExperimentList.innerHTML = `<div class="empty-state">当前没有进行中的行为实验。</div>`;
    return;
  }

  refs.dashboardExperimentList.innerHTML = currentExperiments.map(renderExperimentCard).join("");
}

function renderExperimentList() {
  if (!state.experiments.length) {
    refs.experimentList.innerHTML = `<div class="empty-state">还没有行为实验。先创建一个 30 天实验。</div>`;
    return;
  }

  refs.experimentList.innerHTML = [...state.experiments]
    .sort((a, b) => b.startDate.localeCompare(a.startDate))
    .map(renderExperimentCard)
    .join("");
}

function renderExperimentCard(experiment) {
  const progress = getExperimentProgress(experiment);
  const todayResult = experiment.logs[getDateKey()];
  const isDecisionDue = progress.isFinished && !experiment.finalDecision;

  return `
    <article class="experiment-card" data-experiment-id="${escapeHtml(experiment.id)}">
      <div class="card-top">
        <div>
          <h3>${escapeHtml(experiment.name)}</h3>
          <p class="muted">${escapeHtml(experiment.changeTarget || "未填写改变目标")}</p>
        </div>
        <span class="status-pill ${getResultClass(todayResult, isDecisionDue)}">
          ${escapeHtml(isDecisionDue ? "需要最终决策" : todayResult ? RESULT_LABELS[todayResult] : "今日未记录")}
        </span>
      </div>

      <div class="metric-row">
        <span class="metric">第 ${progress.dayNumber} 天 / 共30天</span>
        <span class="metric">连续成功 ${progress.streak} 天</span>
        <span class="metric">总成功率 ${progress.successRate}%</span>
      </div>

      <div class="experiment-detail">
        <p><strong>触发点：</strong>${escapeHtml(experiment.trigger || "未填写")}</p>
        <p><strong>替代行为：</strong>${escapeHtml(experiment.alternative || "未填写")}</p>
        <p><strong>成功标准：</strong>${escapeHtml(experiment.successCriteria || "未填写")}</p>
      </div>

      <div class="card-actions">
        <button class="primary-btn" type="button" data-action="mark-success">今天成功</button>
        <button class="ghost-btn" type="button" data-action="mark-failure">今天失败</button>
        <button class="small-btn" type="button" data-action="edit-experiment">编辑</button>
        <button class="danger-btn" type="button" data-action="delete-experiment">删除</button>
      </div>
    </article>
  `;
}

function renderReviewHistory() {
  const reviews = Object.values(state.reviews).sort((a, b) => b.date.localeCompare(a.date));

  if (!reviews.length) {
    refs.reviewHistoryList.innerHTML = `<div class="empty-state">还没有每日复盘历史。</div>`;
    return;
  }

  refs.reviewHistoryList.innerHTML = reviews
    .map(
      (review) => `
        <article class="history-card">
          <p class="history-date">${escapeHtml(formatDate(review.date))}</p>
          <div class="history-qa">
            <p><strong>完成：</strong>${escapeHtml(review.completed || "未填写")}</p>
            <p><strong>问题：</strong>${escapeHtml(review.problem || "未填写")}</p>
            <p><strong>改进：</strong>${escapeHtml(review.improve || "未填写")}</p>
            <p><strong>总结：</strong>${escapeHtml(review.summary || "未填写")}</p>
          </div>
        </article>
      `
    )
    .join("");
}

function renderExperimentHistory() {
  if (!state.experiments.length) {
    refs.experimentHistoryList.innerHTML = `<div class="empty-state">还没有行为实验历史。</div>`;
    return;
  }

  refs.experimentHistoryList.innerHTML = [...state.experiments]
    .sort((a, b) => b.startDate.localeCompare(a.startDate))
    .map((experiment) => {
      const progress = getExperimentProgress(experiment);
      return `
        <article class="history-card">
          <div class="card-top">
            <div>
              <p class="history-date">${escapeHtml(formatDate(experiment.startDate))} - ${escapeHtml(formatDate(experiment.endDate))}</p>
              <h3>${escapeHtml(experiment.name)}</h3>
            </div>
            <span class="tag">${escapeHtml(experiment.finalDecision || "未决策")}</span>
          </div>
          <div class="metric-row">
            <span class="metric">成功 ${progress.successCount} 天</span>
            <span class="metric">失败 ${progress.failureCount} 天</span>
            <span class="metric">成功率 ${progress.successRate}%</span>
          </div>
          <div class="history-qa">
            <p><strong>改变目标：</strong>${escapeHtml(experiment.changeTarget || "未填写")}</p>
            <p><strong>最终复盘：</strong>${escapeHtml(experiment.finalReview || "未填写")}</p>
          </div>
        </article>
      `;
    })
    .join("");
}

function handleReviewSubmit(event) {
  event.preventDefault();
  const todayKey = getDateKey();
  const existing = state.reviews[todayKey];

  state.reviews[todayKey] = normalizeReview({
    ...existing,
    date: todayKey,
    completed: refs.reviewCompleted.value.trim(),
    problem: refs.reviewProblem.value.trim(),
    improve: refs.reviewImprove.value.trim(),
    summary: refs.reviewSummary.value.trim(),
    createdAt: existing?.createdAt,
    updatedAt: new Date().toISOString()
  });

  persist();
  render();
  showToast("今日复盘已保存。");
}

function handlePrincipleSubmit(event) {
  event.preventDefault();
  const id = refs.principleId.value;
  const payload = normalizePrinciple({
    id: id || createId(),
    text: refs.principleText.value,
    category: refs.principleCategory.value,
    createdAt: id ? getPrincipleById(id)?.createdAt : undefined,
    updatedAt: new Date().toISOString()
  });

  if (!payload.text) {
    showToast("原则内容不能为空。");
    return;
  }

  if (id) {
    state.principles = state.principles.map((principle) => (principle.id === id ? payload : principle));
    showToast("原则已更新。");
  } else {
    state.principles.unshift(payload);
    showToast("原则已新增。");
  }

  persist();
  resetPrincipleForm();
  refreshPrincipleReminders();
  render();
}

function handlePrincipleListClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    return;
  }

  const card = button.closest("[data-principle-id]");
  const principle = getPrincipleById(card?.dataset.principleId);
  if (!principle) {
    return;
  }

  if (button.dataset.action === "edit-principle") {
    fillPrincipleForm(principle);
  }

  if (button.dataset.action === "delete-principle") {
    if (!window.confirm("确定删除这条原则吗？")) {
      return;
    }
    state.principles = state.principles.filter((item) => item.id !== principle.id);
    persist();
    refreshPrincipleReminders();
    render();
    showToast("原则已删除。");
  }
}

function handleExperimentSubmit(event) {
  event.preventDefault();
  const id = refs.experimentId.value;
  const startDate = refs.experimentStartDate.value || getDateKey();
  const endDate = refs.experimentEndDate.value || addDays(startDate, 29);
  const existing = id ? getExperimentById(id) : null;
  const payload = normalizeExperiment({
    ...existing,
    id: id || createId(),
    name: refs.experimentName.value,
    changeTarget: refs.experimentChangeTarget.value,
    trigger: refs.experimentTrigger.value,
    alternative: refs.experimentAlternative.value,
    successCriteria: refs.experimentSuccessCriteria.value,
    startDate,
    endDate,
    finalDecision: refs.experimentFinalDecision.value,
    finalReview: refs.experimentFinalReview.value,
    createdAt: existing?.createdAt,
    updatedAt: new Date().toISOString()
  });

  if (!payload.name) {
    showToast("实验名称不能为空。");
    return;
  }

  if (id) {
    state.experiments = state.experiments.map((experiment) => (experiment.id === id ? payload : experiment));
    showToast("实验已更新。");
  } else {
    state.experiments.unshift(payload);
    showToast("实验已新增。");
  }

  persist();
  resetExperimentForm();
  render();
}

function handleExperimentClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    return;
  }

  const card = button.closest("[data-experiment-id]");
  const experiment = getExperimentById(card?.dataset.experimentId);
  if (!experiment) {
    return;
  }

  if (button.dataset.action === "mark-success") {
    markExperiment(experiment.id, "success");
  }

  if (button.dataset.action === "mark-failure") {
    markExperiment(experiment.id, "failure");
  }

  if (button.dataset.action === "edit-experiment") {
    fillExperimentForm(experiment);
    switchView("experiments");
  }

  if (button.dataset.action === "delete-experiment") {
    if (!window.confirm(`确定删除实验「${experiment.name}」吗？`)) {
      return;
    }
    state.experiments = state.experiments.filter((item) => item.id !== experiment.id);
    persist();
    render();
    showToast("实验已删除。");
  }
}

function markExperiment(experimentId, result) {
  const experiment = getExperimentById(experimentId);
  if (!experiment) {
    return;
  }

  experiment.logs[getDateKey()] = result;
  experiment.updatedAt = new Date().toISOString();
  persist();
  render();
  showToast(`今日已标记为${RESULT_LABELS[result]}。`);
}

function fillPrincipleForm(principle) {
  refs.principleFormTitle.textContent = "编辑原则";
  refs.principleSubmitBtn.textContent = "保存修改";
  refs.principleCancelBtn.textContent = "取消编辑";
  refs.principleId.value = principle.id;
  refs.principleText.value = principle.text;
  refs.principleCategory.value = principle.category;
  refs.principleForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetPrincipleForm() {
  refs.principleForm.reset();
  refs.principleFormTitle.textContent = "新增原则";
  refs.principleSubmitBtn.textContent = "保存原则";
  refs.principleCancelBtn.textContent = "清空";
  refs.principleId.value = "";
  refs.principleCategory.value = "决策";
}

function fillExperimentForm(experiment) {
  refs.experimentFormTitle.textContent = "编辑行为实验";
  refs.experimentSubmitBtn.textContent = "保存修改";
  refs.experimentCancelBtn.textContent = "取消编辑";
  refs.experimentId.value = experiment.id;
  refs.experimentName.value = experiment.name;
  refs.experimentStartDate.value = experiment.startDate;
  refs.experimentEndDate.value = experiment.endDate;
  refs.experimentChangeTarget.value = experiment.changeTarget;
  refs.experimentTrigger.value = experiment.trigger;
  refs.experimentAlternative.value = experiment.alternative;
  refs.experimentSuccessCriteria.value = experiment.successCriteria;
  refs.experimentFinalDecision.value = experiment.finalDecision;
  refs.experimentFinalReview.value = experiment.finalReview;
  refs.experimentForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetExperimentForm() {
  refs.experimentForm.reset();
  refs.experimentFormTitle.textContent = "新增行为实验";
  refs.experimentSubmitBtn.textContent = "保存实验";
  refs.experimentCancelBtn.textContent = "清空";
  refs.experimentId.value = "";
  refs.experimentStartDate.value = getDateKey();
  refs.experimentEndDate.value = addDays(getDateKey(), 29);
  refs.experimentFinalDecision.value = "";
}

function getCurrentExperiments() {
  const today = getDateKey();
  return state.experiments
    .filter((experiment) => experiment.startDate <= today && !experiment.finalDecision)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}

function getExperimentProgress(experiment) {
  const today = getDateKey();
  const dayNumber = clamp(daysBetween(experiment.startDate, today) + 1, 1, 30);
  const results = Object.entries(experiment.logs).filter(([dateKey]) => {
    return dateKey >= experiment.startDate && dateKey <= experiment.endDate;
  });
  const successCount = results.filter(([, result]) => result === "success").length;
  const failureCount = results.filter(([, result]) => result === "failure").length;
  const recordedCount = successCount + failureCount;

  return {
    dayNumber,
    successCount,
    failureCount,
    successRate: recordedCount ? Math.round((successCount / recordedCount) * 100) : 0,
    streak: getSuccessStreak(experiment),
    isFinished: today > experiment.endDate || dayNumber >= 30
  };
}

function getSuccessStreak(experiment) {
  const today = getDateKey();
  let cursor = experiment.logs[today] ? today : addDays(today, -1);
  let streak = 0;

  while (cursor >= experiment.startDate) {
    if (experiment.logs[cursor] !== "success") {
      break;
    }
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
}

function getResultClass(result, isDecisionDue) {
  if (isDecisionDue) {
    return "due";
  }
  if (result === "success") {
    return "success";
  }
  if (result === "failure") {
    return "failure";
  }
  return "pending";
}

function getPrincipleById(id) {
  return state.principles.find((principle) => principle.id === id);
}

function getExperimentById(id) {
  return state.experiments.find((experiment) => experiment.id === id);
}

function createId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isDateKey(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

function toDate(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(dateKey, dayCount) {
  const date = toDate(dateKey);
  date.setDate(date.getDate() + dayCount);
  return getDateKey(date);
}

function daysBetween(startDateKey, endDateKey) {
  const start = toDate(startDateKey);
  const end = toDate(endDateKey);
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}

function formatDate(dateKey) {
  const date = toDate(dateKey);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function shuffle(items) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [items[index], items[randomIndex]] = [items[randomIndex], items[index]];
  }
  return items;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function showToast(message) {
  refs.toast.textContent = message;
  refs.toast.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    refs.toast.classList.remove("show");
  }, 2000);
}
