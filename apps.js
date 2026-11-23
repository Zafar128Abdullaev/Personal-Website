"use strict";

const searchDialog = document.querySelector("#search-dialog");
const searchLaunch = document.querySelector("#search-launch");
const query = document.querySelector("#query");
const searchStatus = document.querySelector("#search-status");
const searchResults = document.querySelector("#search-results");
let searchTrigger;

// Build the index from the actual HTML templates. Adding a data-topic to a
// section makes it a searchable destination without a second copy of its text.
const searchIndex = Object.entries(titles).flatMap(([id, title]) => {
  const content = document.getElementById("content-" + id).content;
  const topics = [...content.querySelectorAll("[data-topic]")];
  const sections = topics.length ? topics : [content];
  return sections.map(section => {
    const heading = section.querySelector("h2")?.textContent || title;
    const context = section.querySelector("p:not(.tag), figcaption")?.textContent.trim()
      || [...section.querySelectorAll("legend")].map(legend => legend.textContent).join(" and ")
      || title;
    return {
      id, heading, context, folder: title, anchor: section.dataset?.topic,
      text: section.textContent.toLowerCase().replace(/\s+/g, " ")
    };
  });
});

function search() {
  const phrase = query.value.trim().toLowerCase();
  const words = phrase.split(/\s+/).filter(Boolean);
  const results = searchIndex.filter(entry => {
    const corpus = (entry.heading + " " + entry.folder + " " + entry.text).toLowerCase();
    return words.every(word => corpus.includes(word));
  });
  function score(entry) {
    const heading = entry.heading.toLowerCase();
    if (heading === phrase) return 4;
    if (heading.startsWith(phrase)) return 3;
    if (heading.includes(phrase)) return 2;
    return Number(entry.text.includes(phrase));
  }
  results.sort((a, b) => score(b) - score(a));
  searchResults.replaceChildren();
  searchStatus.textContent = results.length === 0 ? "No matches. Try a project, technology, or interest."
    : phrase ? `${results.length} ${results.length === 1 ? "result" : "results"}`
      : "Browse the desktop or type to narrow the results.";

  for (const result of results) {
    const button = document.createElement("button");
    const title = document.createElement("strong");
    const context = document.createElement("small");
    title.textContent = result.heading;
    context.textContent = result.folder + " · " + (result.context.length > 148 ? result.context.slice(0, 145) + "…" : result.context);
    button.append(title, context);
    button.addEventListener("click", () => {
      searchDialog.close();
      openWindow(result.id, searchTrigger, result.anchor);
    });
    searchResults.append(button);
  }
}

function openSearch(trigger) {
  if (searchDialog.open || document.querySelector("#viewer[open]")) return;
  searchTrigger = trigger instanceof HTMLElement && !trigger.closest("#start-menu") ? trigger : searchLaunch;
  setStartMenu(false);
  query.value = "";
  search();
  searchDialog.showModal();
  query.focus();
}
searchLaunch.addEventListener("click", () => openSearch(searchLaunch));
query.addEventListener("input", search);
function dismissSearch() {
  searchDialog.close();
  if (searchTrigger?.isConnected) searchTrigger.focus({ preventScroll: true });
}
searchDialog.addEventListener("cancel", event => {
  event.preventDefault();
  dismissSearch();
});
document.addEventListener("keydown", event => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    openSearch(document.activeElement);
  }
});
searchDialog.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    event.preventDefault();
    dismissSearch();
    return;
  }
  const buttons = [...searchResults.querySelectorAll("button")];
  const index = buttons.indexOf(event.target);
  if (event.target === query && event.key === "Enter") {
    event.preventDefault();
    buttons[0]?.click();
  }
  if ((event.key === "ArrowDown" || event.key === "ArrowUp") && (event.target === query || index >= 0)) {
    event.preventDefault();
    if (event.key === "ArrowUp" && index === 0) query.focus();
    else buttons[clamp(index + (event.key === "ArrowDown" ? 1 : -1), 0, buttons.length - 1)]?.focus();
  }
});
document.querySelectorAll("[data-dismiss]").forEach(button => {
  button.addEventListener("click", () => {
    if (button.closest("dialog") === searchDialog) dismissSearch();
    else button.closest("dialog").close();
  });
});

const viewer = document.querySelector("#viewer");
const photoImage = document.querySelector("#full-photo");
const photoCaption = document.querySelector("#photo-caption");
const photoCount = document.querySelector("#photo-count");
let photoTrigger;
let photoButtons = [];
let photoIndex = 0;

function showPhoto(step = 0) {
  photoIndex = (photoIndex + step + photoButtons.length) % photoButtons.length;
  const thumb = photoButtons[photoIndex].querySelector("img");
  photoImage.src = thumb.src;
  photoImage.alt = thumb.alt;
  photoCaption.textContent = thumb.closest("figure").querySelector("figcaption").textContent;
  photoCount.textContent = `${photoIndex + 1} / ${photoButtons.length}`;
}

document.addEventListener("click", event => {
  const trigger = event.target.closest("[data-photo]");
  if (!trigger) return;
  photoTrigger = trigger;
  photoButtons = [...trigger.closest(".window-content").querySelectorAll("[data-photo]")];
  photoIndex = photoButtons.indexOf(trigger);
  showPhoto();
  viewer.showModal();
});
viewer.addEventListener("click", event => {
  const step = event.target.closest("[data-photo-step]")?.dataset.photoStep;
  if (step) showPhoto(Number(step));
});
viewer.addEventListener("keydown", event => {
  if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
    event.preventDefault();
    showPhoto(event.key === "ArrowRight" ? 1 : -1);
  }
});
viewer.addEventListener("close", () => photoTrigger?.focus({ preventScroll: true }));

const appearanceOptions = {
  wallpaper: ["ridge", "night", "dunes"],
  accent: ["ember", "sage", "blue"]
};
for (const [key, options] of Object.entries(appearanceOptions)) {
  const stored = readPreference(key);
  document.documentElement.dataset[key] = options.includes(stored) ? stored : options[0];
}
function bindSettings(content) {
  content.querySelectorAll("input[type=radio]").forEach(input => {
    input.checked = document.documentElement.dataset[input.name] === input.value;
    input.addEventListener("change", () => {
      document.documentElement.dataset[input.name] = input.value;
      savePreference(input.name, input.value);
    });
  });
}

// One audio element owns playback for the page. A music window can close
// without interrupting it. Files are read locally through object URLs.
const audio = new Audio();
audio.preload = "metadata";
audio.volume = .75;
let playlist = [];
let trackIndex = -1;
let musicStatus = "Choose audio files to build a playlist.";
let musicView = null;

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";
  return Math.floor(seconds / 60) + ":" + String(Math.floor(seconds % 60)).padStart(2, "0");
}

function updateMusic() {
  if (!musicView?.isConnected) return;
  const get = key => musicView.querySelector("[data-" + key + "]");
  const track = playlist[trackIndex];
  const playing = !audio.paused && !audio.ended && !audio.error && audio.readyState >= 3;
  get("track").textContent = track?.name || "No track selected";
  get("track-count").textContent = track ? `Track ${trackIndex + 1} of ${playlist.length}` : "";
  const status = get("music-status");
  if (status.textContent !== musicStatus) status.textContent = musicStatus;
  get("play").disabled = !track || Boolean(audio.error);
  get("play").textContent = audio.paused || audio.ended ? "Play" : "Pause";
  get("previous").disabled = get("next").disabled = playlist.length < 2;
  get("mute").textContent = audio.muted ? "Unmute" : "Mute";
  get("mute").setAttribute("aria-pressed", String(audio.muted));
  get("volume").value = audio.volume;
  const progress = get("progress");
  progress.disabled = !Number.isFinite(audio.duration) || audio.duration <= 0;
  progress.max = progress.disabled ? 1 : audio.duration;
  progress.value = audio.currentTime;
  get("track-time").textContent = formatTime(audio.currentTime) + " / " + formatTime(audio.duration);
  get("equalizer").classList.toggle("playing", playing);
}

async function playTrack() {
  const source = audio.src;
  try { await audio.play(); }
  catch (error) {
    if (source !== audio.src || error.name === "AbortError") return;
    musicStatus = "This track could not play. Try another audio file.";
    updateMusic();
  }
}

function selectTrack(index, play = false) {
  trackIndex = index;
  audio.src = playlist[index].url;
  musicStatus = "";
  audio.load();
  updateMusic();
  if (play) void playTrack();
}

function bindMusic(content) {
  musicView = content;
  const get = key => content.querySelector("[data-" + key + "]");
  const files = get("files");
  get("pick").addEventListener("click", () => files.click());
  files.addEventListener("change", () => {
    const chosen = [...files.files];
    files.value = "";
    if (!chosen.length) return;
    const supported = chosen.filter(file => audio.canPlayType(file.type) ||
      ((!file.type || file.type === "application/octet-stream") && /\.(mp3|wav|ogg|m4a|aac|flac|opus|webm)$/i.test(file.name)));
    if (!supported.length) {
      musicStatus = "No supported audio selected. Try an MP3 or WAV file.";
      updateMusic();
      return;
    }
    const oldPlaylist = playlist;
    playlist = supported.map(file => ({ name: file.name, url: URL.createObjectURL(file) }));
    selectTrack(0);
    oldPlaylist.forEach(track => URL.revokeObjectURL(track.url));
    if (supported.length !== chosen.length) musicStatus = "Some files were skipped because their format is unsupported.";
    updateMusic();
  });
  get("play").addEventListener("click", () => {
    if (audio.paused || audio.ended) void playTrack();
    else audio.pause();
    updateMusic();
  });
  get("previous").addEventListener("click", () => selectTrack((trackIndex - 1 + playlist.length) % playlist.length, !audio.paused));
  get("next").addEventListener("click", () => selectTrack((trackIndex + 1) % playlist.length, !audio.paused));
  get("volume").addEventListener("input", event => { audio.volume = Number(event.target.value); });
  get("mute").addEventListener("click", () => {
    audio.muted = !audio.muted;
    updateMusic();
  });
  get("progress").addEventListener("input", event => { audio.currentTime = Number(event.target.value); });
  updateMusic();
}

for (const event of ["play", "playing", "waiting", "pause", "timeupdate", "durationchange", "volumechange", "seeked"]) {
  audio.addEventListener(event, updateMusic);
}
audio.addEventListener("ended", () => {
  if (trackIndex + 1 < playlist.length) selectTrack(trackIndex + 1, true);
  else updateMusic();
});
audio.addEventListener("error", () => {
  musicStatus = "This file could not be decoded. Try another track or choose new files.";
  updateMusic();
});

document.addEventListener("portfolio-window", ({ detail }) => {
  if (detail.id === "music") bindMusic(detail.content);
  if (detail.id === "settings") bindSettings(detail.content);
});
