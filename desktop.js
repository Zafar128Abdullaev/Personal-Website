"use strict";

const titles = {
  start: "START HERE.txt", university: "University", projects: "Projects",
  hackathons: "Hackathons", work: "Work Experience", contact: "CV & Contact",
  offclock: "Off the Clock", music: "Music", settings: "Settings", about: "About this website"
};
const layer = document.querySelector("#window-layer");
const folders = document.querySelector(".folders");
const tasks = document.querySelector("#tasks");
const startMenu = document.querySelector("#start-menu");
const startButton = document.querySelector("#start-button");
const showButton = document.querySelector("#show-desktop");
const narrow = matchMedia("(max-width: 700px)");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const windows = new Map();
let active = null;
let order = 0;
let desktopVisible = false;

function readPreference(key) {
  try { return localStorage.getItem("zafar-" + key); }
  catch { return null; }
}

function savePreference(key, value) {
  try { localStorage.setItem("zafar-" + key, value); }
  catch { /* Appearance and windows still work for this page load. */ }
}

function control(text, label, action) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = text;
  if (label) {
    button.setAttribute("aria-label", label);
    button.title = label;
  }
  if (action) button.dataset.windowAction = action;
  return button;
}

function desktopShortcut(id) {
  return document.querySelector(`.folders [data-open="${id}"], .brand[data-open="${id}"]`);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function defaultBounds(id, index = 0) {
  const options = {
    start: [620, 475], music: [460, 490], settings: [490, 410],
    about: [490, 345], work: [610, 500]
  };
  const [preferredWidth, preferredHeight] = options[id] || [760, 670];
  const availableWidth = layer.clientWidth;
  const availableHeight = layer.clientHeight;
  const width = Math.min(preferredWidth, Math.max(335, availableWidth - 36));
  const height = Math.min(preferredHeight, Math.max(210, availableHeight - 66));
  const left = Math.min(availableWidth - width - 24, Math.max(228, (availableWidth - width) * .47));
  return {
    x: Math.max(12, left) + (index % 5) * 24,
    y: Math.max(16, Math.min(76, (availableHeight - height) * .44)) + (index % 5) * 19,
    width, height
  };
}

// Keep the preferred rectangle separately. Clamping to a smaller viewport or
// maximising never overwrites the position and size used when there is room again.
function fitBounds(rect) {
  const width = clamp(rect.width, Math.min(335, layer.clientWidth), layer.clientWidth);
  const height = clamp(rect.height, Math.min(210, layer.clientHeight), layer.clientHeight);
  return {
    x: clamp(rect.x, 0, layer.clientWidth - width),
    y: clamp(rect.y, 0, layer.clientHeight - height),
    width, height
  };
}

function layout(item) {
  const bounds = item.maximised
    ? { x: 5, y: 5, width: Math.max(0, layer.clientWidth - 10), height: Math.max(0, layer.clientHeight - 10) }
    : fitBounds(item.bounds);
  const { x, y, width, height } = bounds;
  Object.assign(item.panel.style, { left: x + "px", top: y + "px", width: width + "px", height: height + "px" });
  item.panel.classList.toggle("maximised", item.maximised);
  const label = `${item.maximised ? "Restore" : "Maximise"} ${titles[item.id]}`;
  item.maxButton.setAttribute("aria-label", label);
  item.maxButton.title = label;
  item.maxButton.textContent = item.maximised ? "❐" : "□";
}

function refresh() {
  for (const item of windows.values()) {
    const front = item === active;
    item.panel.hidden = item.minimised || desktopVisible || (narrow.matches && !front);
    item.panel.inert = item.panel.hidden || item.exiting;
    item.panel.classList.toggle("active", front && !desktopVisible);
    item.task.classList.toggle("active", front && !desktopVisible);
    item.task.classList.toggle("minimised", item.minimised || desktopVisible);
    item.task.setAttribute("aria-pressed", String(front && !desktopVisible));
    item.task.title = titles[item.id] + (item.minimised ? " — minimised" : "");
  }
  folders.inert = Boolean(narrow.matches && active && active.id !== "start" && !desktopVisible);
  folders.querySelectorAll("[data-open]").forEach(button => {
    button.setAttribute("aria-pressed", String(!desktopVisible && active?.id === button.dataset.open));
  });
  showButton.setAttribute("aria-pressed", String(desktopVisible));
  showButton.title = desktopVisible ? "Restore desktop windows" : "Show desktop";
  showButton.setAttribute("aria-label", showButton.title);
}

function bringForward(item, focus = false) {
  const wasHidden = item.panel.hidden || item.exiting;
  const switched = active !== item;
  item.exitAnimation?.cancel();
  item.exiting = false;
  desktopVisible = false;
  item.minimised = false;
  active = item;
  if (switched || wasHidden || !item.order) {
    item.order = ++order;
    item.panel.style.zIndex = item.order;
  }
  refresh();
  if (switched && !wasHidden && !reducedMotion.matches) {
    item.panel.querySelector(".titlebar").animate([{ backgroundColor: "#493228" }, {}], 160);
  }
  if (wasHidden && !reducedMotion.matches) {
    item.panel.animate([{ opacity: .4, transform: "translateY(6px)" }, {}], 150);
  }
  if (focus) item.content.focus({ preventScroll: true });
}

function frontmost() {
  return [...windows.values()]
    .filter(item => !item.minimised && !item.exiting)
    .sort((a, b) => b.order - a.order)[0] || null;
}

function dismiss(item, minimise = false) {
  if (minimise && item.exiting) return;
  const finish = () => {
    if (minimise) {
      item.minimised = true;
      item.exiting = false;
    } else {
      item.panel.remove();
      item.task.remove();
      windows.delete(item.id);
    }
    refresh();
  };

  // Minimise keeps the same DOM and scroll container, including any app state.
  item.exiting = true;
  if (active === item) active = frontmost();
  if (minimise && !narrow.matches && !reducedMotion.matches) {
    const animation = item.panel.animate([{ opacity: 1 }, { opacity: 0, transform: "translateY(8px)" }], 120);
    item.exitAnimation = animation;
    animation.onfinish = finish;
    refresh();
  } else {
    finish();
  }
  if (minimise) item.task.focus();
  else if (item.trigger?.isConnected && !item.trigger.closest("[hidden], [inert]")) item.trigger.focus({ preventScroll: true });
  else if (active && !desktopVisible) active.content.focus({ preventScroll: true });
  else (desktopShortcut(item.id) || startButton).focus({ preventScroll: true });
}

function attachPointerControl(item, handle, resize = false) {
  handle.addEventListener("pointerdown", event => {
    if (narrow.matches || item.maximised || event.button !== 0 || event.target.closest("button")) return;
    event.preventDefault();
    handle.setPointerCapture(event.pointerId);
    const rect = fitBounds(item.bounds);
    const origin = [event.clientX, event.clientY];
    item.panel.classList.add("moving");
    const move = motion => {
      if (motion.pointerId !== event.pointerId) return;
      const dx = motion.clientX - origin[0];
      const dy = motion.clientY - origin[1];
      if (resize) {
        item.bounds = {
          ...rect,
          width: clamp(rect.width + dx, Math.min(335, layer.clientWidth - rect.x), layer.clientWidth - rect.x),
          height: clamp(rect.height + dy, Math.min(210, layer.clientHeight - rect.y), layer.clientHeight - rect.y)
        };
      } else {
        item.bounds = fitBounds({ ...rect, x: rect.x + dx, y: rect.y + dy });
      }
      layout(item);
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("lostpointercapture", () => {
      handle.removeEventListener("pointermove", move);
      item.panel.classList.remove("moving");
    }, { once: true });
  });
}

function openWindow(id, trigger, anchor) {
  const template = document.getElementById("content-" + id);
  if (!template || !Object.hasOwn(titles, id)) return;
  let item = windows.get(id);
  if (!item) {
    const panel = document.createElement("section");
    panel.className = id === "start" ? "window intro-window" : "window";
    panel.id = "window-" + id;
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-labelledby", "title-" + id);

    const bar = document.createElement("header");
    bar.className = "titlebar";
    const dot = document.createElement("span");
    dot.className = "title-dot";
    dot.setAttribute("aria-hidden", "true");
    const title = document.createElement("h2");
    title.className = "window-title";
    title.id = "title-" + id;
    title.textContent = titles[id];
    const controls = document.createElement("div");
    controls.className = "window-controls";
    const minimise = control("−", "Minimise " + titles[id], "minimise");
    const maxButton = control("□", "Maximise " + titles[id], "maximise");
    const close = control("×", "Close " + titles[id], "close");
    controls.append(minimise, maxButton, close);
    bar.append(dot, title, controls);

    const content = document.createElement("div");
    content.className = "window-content";
    content.tabIndex = 0;
    content.setAttribute("role", "region");
    content.setAttribute("aria-label", titles[id] + " contents");
    content.append(template.content.cloneNode(true));
    const grip = document.createElement("span");
    grip.className = "resize-grip";
    grip.setAttribute("aria-hidden", "true");
    panel.append(bar, content, grip);

    const task = control(titles[id]);
    task.dataset.task = id;
    task.setAttribute("aria-controls", panel.id);
    item = {
      id, panel, content, task, maxButton, maximised: false, bounds: defaultBounds(id, windows.size),
      trigger: trigger?.closest("#start-menu") ? startButton : trigger || desktopShortcut(id)
    };
    windows.set(id, item);
    layer.append(panel);
    tasks.append(task);
    layout(item);
    panel.addEventListener("pointerdown", () => bringForward(item));
    panel.addEventListener("focusin", () => { if (item !== active) bringForward(item); });
    minimise.addEventListener("click", () => dismiss(item, true));
    maxButton.addEventListener("click", () => { item.maximised = !item.maximised; layout(item); });
    close.addEventListener("click", () => dismiss(item));
    task.addEventListener("click", () => bringForward(item, true));
    attachPointerControl(item, bar);
    attachPointerControl(item, grip, true);
    document.dispatchEvent(new CustomEvent("portfolio-window", { detail: item }));
  }
  bringForward(item, true);
  if (anchor) {
    const destination = item.content.querySelector(`[data-topic="${CSS.escape(anchor)}"]`);
    if (destination) {
      const heading = destination.querySelector("h2") || destination;
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
      item.content.scrollTop += destination.getBoundingClientRect().top - item.content.getBoundingClientRect().top - 10;
    }
  }
  return item;
}

function resetWindows() {
  let index = 0;
  for (const item of windows.values()) {
    item.bounds = defaultBounds(item.id, index++);
    item.maximised = false;
    layout(item);
  }
}

function setStartMenu(show, restoreFocus = false) {
  startMenu.hidden = !show;
  startButton.setAttribute("aria-expanded", String(show));
  if (show) startMenu.querySelector("button").focus();
  else if (restoreFocus) startButton.focus();
}

startButton.addEventListener("click", () => setStartMenu(startMenu.hidden, true));
showButton.addEventListener("click", () => {
  desktopVisible = !desktopVisible;
  if (!desktopVisible) active = frontmost();
  refresh();
});

document.addEventListener("click", event => {
  const target = event.target;
  const trigger = target.closest("[data-open]");
  if (!startMenu.hidden && !startButton.contains(target) && !startMenu.contains(target)) setStartMenu(false);
  if (trigger) {
    if (startMenu.contains(trigger)) setStartMenu(false);
    openWindow(trigger.dataset.open, trigger, trigger.dataset.anchor);
  }
  if (target.closest("[data-explore]")) {
    const intro = windows.get("start");
    if (intro) dismiss(intro);
    desktopShortcut("projects").focus();
  }
  if (target.closest("[data-reset]")) {
    resetWindows();
    if (!startMenu.hidden) setStartMenu(false, true);
    const status = windows.get("settings")?.content.querySelector("[data-settings-status]");
    if (status) status.textContent = "Window positions reset.";
  }
});

document.addEventListener("keydown", event => {
  if (event.defaultPrevented || event.key !== "Escape" || document.querySelector("dialog[open]")) return;
  if (!startMenu.hidden) setStartMenu(false, true);
  else if (active && !desktopVisible) dismiss(active);
});

folders.addEventListener("keydown", event => {
  const buttons = [...event.currentTarget.querySelectorAll("button")];
  const index = buttons.indexOf(event.target);
  if (index < 0) return;
  const columns = getComputedStyle(event.currentTarget).gridTemplateColumns.split(" ").length;
  const targets = { ArrowLeft: index - 1, ArrowRight: index + 1, ArrowUp: index - columns, ArrowDown: index + columns, Home: 0, End: buttons.length - 1 };
  if (!Object.hasOwn(targets, event.key)) return;
  event.preventDefault();
  buttons[clamp(targets[event.key], 0, buttons.length - 1)].focus();
});

function resizeWindows() {
  windows.forEach(layout);
  refresh();
}
window.addEventListener("resize", resizeWindows);
narrow.addEventListener("change", resizeWindows);

const clock = document.querySelector("#clock");
const sydneyTime = new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Sydney", hour: "2-digit", minute: "2-digit", hour12: false });
function updateClock() {
  const now = new Date();
  clock.dateTime = now.toISOString();
  clock.textContent = sydneyTime.format(now);
}
updateClock();
setInterval(updateClock, 15000);

if (!readPreference("intro")) {
  openWindow("start");
  savePreference("intro", "seen");
}
