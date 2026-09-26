const refreshIntervalMs = 30_000;
const headlineIntervalMs = 6_500;
const themeStorageKey = "jin-class-board-theme";
const themes = new Set(["jade", "macaron", "cyber"]);
const displayLimits = Object.freeze({ schedule: 15, homework: 5, countdowns: 6, notices: 4 });

// A small read-only snapshot keeps the public page useful if a browser, CDN, or
// school network temporarily blocks JSON requests. The JSON file remains the
// normal source for future updates.
const embeddedBoard = {
  className: "高一（12）班 · 贯通班",
  dateLabel: "2026年9月26日 星期六 · 中秋假期",
  dailyMessage: "中秋安康，愿假期有团圆、有休息，也有新的能量。",
  updatedAt: "2026-09-26T03:00:00Z",
  schedule: [],
  homework: [
    { id: "homework-0925", title: "9月25—27日学案§2-3-1 匀变速直线运动的位移与时间", completed: 14, total: 49, deadline: "9月28日 08:00" },
    { id: "homework-0923", title: "9月23—24日学案§2-2 匀变速直线运动的速度与时间的关系", completed: 15, total: 49, deadline: "9月28日 08:00" },
    { id: "homework-0921", title: "9月21日物理学案§2.1 实验：探究小车速度随时间变化规律", completed: 47, total: 49, deadline: "9月22日 08:00" },
    { id: "homework-0918", title: "9月18日作业（学探诊§2.2的2—5；§2.3的2—5）", completed: 48, total: 49, deadline: "9月19日 08:00" },
    { id: "homework-0917", title: "9月17日物理作业", completed: 47, total: 49, deadline: "9月18日 08:00" }
  ],
  countdowns: [
    { id: "countdown-mid-autumn", title: "中秋假期", date: "2026-09-26" }
  ],
  notices: [
    { id: "notice-holiday-1", title: "9月26日（周六）中秋假期", detail: "今日不上课，祝同学们中秋安康。", level: "important" },
    { id: "notice-holiday-2", title: "9月27日（周日）中秋假期", detail: "明日继续放假，返校安排以班主任后续通知为准。", level: "normal" }
  ]
};

const elements = {
  classTitle: document.querySelector("#class-title"),
  dateLabel: document.querySelector("#date-label"),
  dailyMessage: document.querySelector("#daily-message"),
  syncState: document.querySelector("#sync-state"),
  lessonCount: document.querySelector("#lesson-count"),
  scheduleList: document.querySelector("#schedule-list"),
  overallRing: document.querySelector("#overall-ring"),
  overallPercent: document.querySelector("#overall-percent"),
  completionSummary: document.querySelector("#completion-summary"),
  homeworkList: document.querySelector("#homework-list"),
  countdownList: document.querySelector("#countdown-list"),
  noticeList: document.querySelector("#notice-list"),
  updatedAt: document.querySelector("#updated-at"),
  themeButtons: [...document.querySelectorAll("[data-theme-choice]")],
  headlineSlider: document.querySelector("#headline-slider"),
  headlineTrack: document.querySelector("#headline-track"),
  schedulePanel: document.querySelector(".schedule-panel"),
  seatMapModal: document.querySelector("#seat-map-modal"),
  seatMapStage: document.querySelector("#seat-map-stage"),
  seatMapImage: document.querySelector("#seat-map-image")
};

let hasLoadedBoard = false;
let headlineIndex = 0;
let headlineTimer = null;
let pointerStartX = null;

function setTheme(theme) {
  const safeTheme = themes.has(theme) ? theme : "jade";
  document.documentElement.dataset.theme = safeTheme;
  for (const button of elements.themeButtons) {
    button.setAttribute("aria-pressed", String(button.dataset.themeChoice === safeTheme));
  }
  try {
    localStorage.setItem(themeStorageKey, safeTheme);
  } catch {
    // 主题仍然可在当前页面使用；隐私模式下可能无法写入浏览器偏好。
  }
}

function initializeTheme() {
  let savedTheme = "jade";
  try {
    savedTheme = localStorage.getItem(themeStorageKey) || "jade";
  } catch {
    savedTheme = "jade";
  }
  setTheme(savedTheme);
  for (const button of elements.themeButtons) {
    button.addEventListener("click", () => setTheme(button.dataset.themeChoice));
  }
}

function showHeadline(index) {
  const slideCount = elements.headlineTrack?.children.length || 1;
  headlineIndex = (index + slideCount) % slideCount;
  elements.headlineTrack?.style.setProperty("--headline-index", String(headlineIndex));
  [...(elements.headlineTrack?.children || [])].forEach((slide, slideIndex) => {
    slide.setAttribute("aria-hidden", String(slideIndex !== headlineIndex));
  });
}

function stopHeadlineRotation() {
  if (headlineTimer !== null) window.clearInterval(headlineTimer);
  headlineTimer = null;
}

function startHeadlineRotation() {
  stopHeadlineRotation();
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  headlineTimer = window.setInterval(() => showHeadline(headlineIndex + 1), headlineIntervalMs);
}

function fitClassTitle() {
  const title = elements.classTitle;
  if (!title) return;
  title.style.fontSize = "";
  let fontSize = Number.parseFloat(window.getComputedStyle(title).fontSize);
  while (title.scrollWidth > title.clientWidth && fontSize > 18) {
    fontSize -= 1;
    title.style.fontSize = `${fontSize}px`;
  }
}

function initializeHeadlineSlider() {
  if (!elements.headlineSlider || !elements.headlineTrack) return;

  elements.headlineSlider.addEventListener("pointerdown", (event) => {
    pointerStartX = event.clientX;
    elements.headlineSlider.classList.add("is-dragging");
    elements.headlineSlider.setPointerCapture?.(event.pointerId);
    stopHeadlineRotation();
  });

  const finishSwipe = (event) => {
    if (pointerStartX === null) return;
    const distance = event.clientX - pointerStartX;
    if (Math.abs(distance) >= 42) showHeadline(headlineIndex + (distance < 0 ? 1 : -1));
    pointerStartX = null;
    elements.headlineSlider.classList.remove("is-dragging");
    startHeadlineRotation();
  };

  elements.headlineSlider.addEventListener("pointerup", finishSwipe);
  elements.headlineSlider.addEventListener("pointercancel", () => {
    pointerStartX = null;
    elements.headlineSlider.classList.remove("is-dragging");
    startHeadlineRotation();
  });
  elements.headlineSlider.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    showHeadline(headlineIndex + (event.key === "ArrowRight" ? 1 : -1));
    startHeadlineRotation();
  });
  elements.headlineSlider.addEventListener("focusin", stopHeadlineRotation);
  elements.headlineSlider.addEventListener("focusout", startHeadlineRotation);
  window.addEventListener("resize", fitClassTitle, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopHeadlineRotation();
    else startHeadlineRotation();
  });
  showHeadline(0);
  fitClassTitle();
  startHeadlineRotation();
}

function initializeSeatMap() {
  if (!elements.seatMapModal || !elements.seatMapStage || !elements.seatMapImage) return;
  let zoom = 1;
  const applyZoom = () => {
    elements.seatMapImage.style.width = `${Math.round(zoom * 100)}%`;
    elements.seatMapImage.style.maxWidth = zoom <= 1 ? "100%" : "none";
    elements.seatMapModal.querySelector('[data-seat-map-zoom="reset"]').textContent = `${Math.round(zoom * 100)}%`;
  };
  const setOpen = (open, sourceButton = null) => {
    elements.seatMapModal.setAttribute("aria-hidden", String(!open));
    document.body.classList.toggle("seat-map-open", open);
    if (open) {
      const source = sourceButton?.dataset.seatMapSrc || "./class12-seat-map.png";
      const title = sourceButton?.dataset.seatMapTitle || "高一（12）班座位表";
      elements.seatMapImage.src = source;
      elements.seatMapImage.alt = title;
      elements.seatMapModal.querySelector("#seat-map-title").textContent = title;
      zoom = 1;
      applyZoom();
      elements.seatMapModal.querySelector(".seat-map-close")?.focus();
    }
  };
  document.addEventListener("click", (event) => {
    const target = event.target.closest?.("[data-open-seat-map]");
    if (target) setOpen(true, target);
    if (event.target.closest?.("[data-seat-map-close]")) setOpen(false);
    const zoomButton = event.target.closest?.("[data-seat-map-zoom]");
    if (zoomButton) {
      const action = zoomButton.dataset.seatMapZoom;
      zoom = action === "reset" ? 1 : Math.min(2.8, Math.max(0.65, zoom + (action === "in" ? 0.2 : -0.2)));
      applyZoom();
    }
  });
  elements.seatMapStage.addEventListener("wheel", (event) => {
    if (!elements.seatMapModal || elements.seatMapModal.getAttribute("aria-hidden") === "true") return;
    event.preventDefault();
    zoom = Math.min(2.8, Math.max(0.65, zoom + (event.deltaY < 0 ? 0.12 : -0.12)));
    applyZoom();
  }, { passive: false });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && elements.seatMapModal.getAttribute("aria-hidden") === "false") setOpen(false);
  });
  applyZoom();
}

function createElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function minutesSinceMidnight(date = new Date()) {
  return date.getHours() * 60 + date.getMinutes();
}

function parseTimeRange(timeText) {
  const matches = String(timeText).match(/(\d{1,2}):(\d{2})\s*[–-]\s*(\d{1,2}):(\d{2})/);
  if (!matches) return null;
  return { start: Number(matches[1]) * 60 + Number(matches[2]), end: Number(matches[3]) * 60 + Number(matches[4]) };
}

function getActivityView(activityPlans) {
  if (!activityPlans || typeof activityPlans !== "object") return null;
  const keys = Object.keys(activityPlans).sort();
  if (!keys.length) return null;
  const today = localDateKey();
  if (today > keys[keys.length - 1]) return null;
  const now = minutesSinceMidnight();
  let selectedKey = keys.find((key) => key > today) || keys[keys.length - 1];
  if (keys.includes(today)) {
    const todayItems = Array.isArray(activityPlans[today].items) ? activityPlans[today].items : [];
    const remainingToday = todayItems.filter((item) => {
      const range = parseTimeRange(item.time);
      return !range || range.end > now;
    });
    if (remainingToday.length) selectedKey = today;
  }
  const plan = activityPlans[selectedKey];
  const isToday = selectedKey === today;
  const remaining = Array.isArray(plan.items) ? plan.items.filter((item) => {
    const range = parseTimeRange(item.time);
    return !isToday || !range || range.end > now;
  }) : [];
  return { ...plan, date: selectedKey, items: remaining.length ? remaining : plan.items || [], isToday };
}

function replaceChildren(container, children, emptyText) {
  if (!children.length) {
    container.replaceChildren(createElement("p", "empty-state", emptyText));
    return;
  }
  container.replaceChildren(...children);
}

function renderSchedule(schedule, { activity = false } = {}) {
  const now = minutesSinceMidnight();
  const visibleSchedule = activity
    ? schedule
    : schedule.filter((lesson) => {
        const range = parseTimeRange(lesson.time);
        return !range || range.end > now;
      }).slice(0, displayLimits.schedule);
  elements.schedulePanel?.classList.toggle("activity-panel", activity);
  elements.schedulePanel?.querySelector("#schedule-title")?.replaceChildren(document.createTextNode(activity ? "入学教育安排" : "今日课表"));
  elements.lessonCount.textContent = activity
    ? `${visibleSchedule.length} 项安排`
    : `${visibleSchedule.length} 节待上`;
  const items = visibleSchedule.map((lesson, index) => {
    const row = createElement("div", "schedule-item");
    const range = parseTimeRange(lesson.time);
    if (activity && range) {
      const now = minutesSinceMidnight();
      const isToday = lesson.date === localDateKey();
      row.classList.toggle("is-current", isToday && range.start <= now && range.end > now);
    }
    row.style.animationDelay = `${index * 55}ms`;
    row.append(createElement("time", "schedule-time", lesson.time));
    row.append(createElement("span", "subject-pill", lesson.subject));
    const detail = createElement("div", "schedule-detail");
    const title = lesson.topic && lesson.topic !== "按周四课表执行" ? lesson.topic : lesson.subject;
    detail.append(createElement("strong", "", title));
    row.append(detail);
    return row;
  });
  replaceChildren(elements.scheduleList, items, activity ? "今天暂无入学教育安排" : "今日暂无课程安排");
}

function renderHomework(homework) {
  const completed = homework.reduce((sum, item) => sum + item.completed, 0);
  const total = homework.reduce((sum, item) => sum + item.total, 0);
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  elements.overallPercent.textContent = total > 0 ? `${percent}%` : "—";
  elements.overallRing.style.setProperty("--completion-degrees", `${percent * 3.6}deg`);
  elements.completionSummary.textContent = total > 0 ? `${homework.length} 项任务 · ${completed}/${total} 人次已完成` : "今日暂无待交任务";

  const items = homework.slice(0, displayLimits.homework).map((assignment, index) => {
    const item = createElement("div", "homework-item");
    item.style.animationDelay = `${index * 65}ms`;
    const itemPercent = Math.round((assignment.completed / assignment.total) * 100);

    const top = createElement("div", "homework-top");
    top.append(createElement("strong", "", assignment.title));
    top.append(createElement("span", "", `${itemPercent}%`));

    const track = createElement("div", "progress-track");
    const bar = createElement("i");
    bar.style.width = `${itemPercent}%`;
    track.append(bar);

    const meta = createElement("div", "homework-meta");
    meta.append(createElement("span", "", `${assignment.completed}/${assignment.total} 人已交`));
    meta.append(createElement("span", "", `截止：${assignment.deadline}`));
    item.append(top, track, meta);
    return item;
  });
  replaceChildren(elements.homeworkList, items, "今日暂无作业统计");
}

function startOfToday() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

function parseLocalDate(dateText) {
  const [year, month, day] = dateText.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function countdownLabel(dateText) {
  const days = Math.round((parseLocalDate(dateText).getTime() - startOfToday().getTime()) / 86_400_000);
  if (days > 0) return { value: days, unit: "天后" };
  if (days === 0) return { value: "今日", unit: "进行" };
  return { value: "已过", unit: `${Math.abs(days)}天` };
}

function formatDate(dateText) {
  const date = parseLocalDate(dateText);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function renderCountdowns(countdowns) {
  const ordered = [...countdowns].sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime());
  const items = ordered.slice(0, displayLimits.countdowns).map((countdown, index) => {
    const state = countdownLabel(countdown.date);
    const card = createElement("div", `countdown-card${state.value === "今日" ? " is-today" : ""}`);
    card.style.animationDelay = `${index * 55}ms`;
    card.append(createElement("strong", "", String(state.value)));
    card.append(createElement("span", "", state.unit));
    const date = createElement("time", "", `${countdown.title} · ${formatDate(countdown.date)}`);
    date.dateTime = countdown.date;
    card.append(date);
    return card;
  });
  replaceChildren(elements.countdownList, items, "近期暂无倒计时");
}

function renderNotices(notices) {
  const ordered = [...notices].sort((a, b) => {
    if (Boolean(b.important) !== Boolean(a.important)) return Number(b.important) - Number(a.important);
    const aDate = a.date ? parseLocalDate(a.date).getTime() : 0;
    const bDate = b.date ? parseLocalDate(b.date).getTime() : 0;
    return aDate - bDate;
  });
  const items = ordered.slice(0, displayLimits.notices).map((notice, index) => {
    const item = createElement("article", `notice-item ${notice.level}`);
    item.style.animationDelay = `${index * 60}ms`;
    if (notice.level === "important") item.append(createElement("span", "notice-label", "重要提醒"));
    item.append(createElement("strong", "", notice.title));
    item.append(createElement("p", "", notice.detail));
    return item;
  });
  replaceChildren(elements.noticeList, items, "目前没有新的班主任通知");
}

function formatUpdatedAt(isoText) {
  const date = new Date(isoText);
  if (Number.isNaN(date.getTime())) return "更新时间待确认";
  return `最近更新：${new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date)}`;
}

function renderBoard(board) {
  elements.classTitle.textContent = board.className;
  elements.dateLabel.textContent = board.dateLabel;
  elements.dailyMessage.textContent = board.dailyMessage;
  elements.updatedAt.textContent = formatUpdatedAt(board.updatedAt);
  document.title = `${board.className} · 班级看板`;
  const activity = getActivityView(board.activityPlans);
  if (activity) {
    const date = parseLocalDate(activity.date);
    elements.dateLabel.textContent = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 · ${activity.label || "入学教育"}`;
    renderSchedule(activity.items.map((item) => ({ ...item, date: activity.date })), { activity: true });
  } else {
    renderSchedule(board.schedule);
  }
  renderHomework(board.homework);
  renderCountdowns(board.countdowns);
  renderNotices(board.notices);
  window.requestAnimationFrame(fitClassTitle);
}

async function refreshBoard() {
  elements.syncState.classList.remove("error");
  elements.syncState.textContent = hasLoadedBoard ? "正在刷新" : "正在同步";
  try {
    let payload;
    const loadJson = async (url, timeoutMs = 2500) => {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(url, { cache: "no-cache", headers: { Accept: "application/json" }, signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      } finally {
        window.clearTimeout(timer);
      }
    };
    if (window.location.hostname === "jraixue.github.io") {
      payload = await loadJson("./class-board.json?v=20260920-homework2");
      renderBoard(payload);
    } else {
      try {
        payload = await loadJson("/api/board");
        if (!payload || !payload.board) throw new Error("班级数据结构不正确");
        renderBoard(payload.board);
      } catch {
        payload = await loadJson("./class-board.json?v=20260920-homework2");
        renderBoard(payload);
      }
    }
    hasLoadedBoard = true;
    elements.syncState.textContent = "已同步";
  } catch {
    if (!hasLoadedBoard) {
      renderBoard(embeddedBoard);
      hasLoadedBoard = true;
      elements.syncState.textContent = "已同步（内置快照）";
      return;
    }
    elements.syncState.classList.add("error");
    elements.syncState.textContent = "刷新失败";
  }
}

initializeTheme();
initializeHeadlineSlider();
initializeSeatMap();
refreshBoard();
window.setInterval(refreshBoard, refreshIntervalMs);

// Public demo login gate. It is deliberately client-only and must never be used for real student data.
(function initializePublicDemoAuth() {
  const auth = document.getElementById("public-auth");
  const passwordGate = document.getElementById("public-password");
  const studentDemo = document.getElementById("student-demo");
  const board = document.querySelector(".board-shell");
  const roleButtons = [...document.querySelectorAll("[data-auth-role]")];
  const username = document.getElementById("public-auth-username");
  const password = document.getElementById("public-auth-password");
  const error = document.getElementById("public-auth-error");
  const submit = document.getElementById("public-auth-submit");
  const newPassword = document.getElementById("public-new-password");
  const confirmPassword = document.getElementById("public-confirm-password");
  const passwordError = document.getElementById("public-password-error");
  const passwordSubmit = document.getElementById("public-password-submit");
  if (!auth || !passwordGate || !studentDemo || !board || !username || !password || !error || !submit || !newPassword || !confirmPassword || !passwordError || !passwordSubmit) return;
  let role = "student";
  let loggedInRole = "student";
  roleButtons.forEach((button) => button.addEventListener("click", () => {
    role = button.dataset.authRole || "student";
    roleButtons.forEach((item) => item.classList.toggle("active", item === button));
    username.placeholder = role === "teacher" ? "金然" : "演示学生01";
    submit.textContent = role === "teacher" ? "登录教师演示端" : "登录学生演示端";
    error.textContent = "";
  }));
  submit.addEventListener("click", () => {
    const expectedName = role === "teacher" ? "金然" : "演示学生01";
    if (username.value.trim() !== expectedName || password.value !== "123456") {
      error.textContent = `演示账号不匹配：${expectedName} / 初始密码 123456`;
      return;
    }
    loggedInRole = role;
    auth.hidden = true;
    passwordGate.hidden = false;
    newPassword.focus();
  });
  passwordSubmit.addEventListener("click", () => {
    if (!/^(?=.*[A-Za-z])(?=.*\d).{6,}$/.test(newPassword.value)) {
      passwordError.textContent = "新密码至少 6 位，并同时包含字母和数字。";
      return;
    }
    if (newPassword.value !== confirmPassword.value) {
      passwordError.textContent = "两次输入的新密码不一致。";
      return;
    }
    passwordGate.hidden = true;
    if (loggedInRole === "student") {
      board.hidden = true;
      studentDemo.hidden = false;
      const welcome = document.getElementById("student-demo-welcome");
      if (welcome) welcome.textContent = `欢迎，${username.value.trim()}。这里只展示当前账号本人的信息。`;
    } else {
      board.hidden = false;
    }
  });
  document.querySelectorAll("[data-public-logout]").forEach((button) => button.addEventListener("click", () => {
    studentDemo.hidden = true;
    board.hidden = false;
    auth.hidden = false;
    username.value = "";
    password.value = "";
    newPassword.value = "";
    confirmPassword.value = "";
  }));
})();
