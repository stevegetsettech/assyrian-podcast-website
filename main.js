const ACCESS_KEY = "assyrianlove";
const STORAGE_KEY = "assyrian-podcast-access";

const state = {
  episodes: [],
  posts: [],
  dataLoaded: false,
  episodeQuery: "",
  episodeYear: "all",
  episodeTopic: "all",
  episodeArchiveExpanded: false,
  postType: "all",
  visiblePosts: 8,
  activePost: null,
  activeSlide: 0,
};

const elements = {
  gate: document.querySelector("#gate"),
  siteShell: document.querySelector("#site-shell"),
  gateForm: document.querySelector("#gate-form"),
  gateError: document.querySelector("#gate-error"),
  password: document.querySelector("#password"),
  remember: document.querySelector("#remember"),
  episodeList: document.querySelector("#episode-list"),
  episodeCount: document.querySelector("#episode-count"),
  episodeEmpty: document.querySelector("#episode-empty"),
  episodeSearch: document.querySelector("#episode-search"),
  yearFilter: document.querySelector("#year-filter"),
  topicFilters: document.querySelector("#topic-filters"),
  episodeArchiveActions: document.querySelector("#episode-archive-actions"),
  episodeArchiveNote: document.querySelector("#episode-archive-note"),
  episodeArchiveToggle: document.querySelector("#episode-archive-toggle"),
  postFilters: document.querySelector("#post-filters"),
  postWall: document.querySelector("#post-wall"),
  loadMore: document.querySelector("#load-more"),
  player: document.querySelector("#player"),
  playerNumber: document.querySelector("#player-number"),
  playerTitle: document.querySelector("#player-title"),
  playerPlay: document.querySelector("#player-play"),
  playerScrub: document.querySelector("#player-scrub"),
  playerTime: document.querySelector("#player-time"),
  playerSpeed: document.querySelector("#player-speed"),
  playerCollapse: document.querySelector("#player-collapse"),
  audio: document.querySelector("#audio"),
  lightbox: document.querySelector("#lightbox"),
  lightboxStage: document.querySelector("#lightbox-stage"),
  lightboxTitle: document.querySelector("#lightbox-title"),
  lightboxDate: document.querySelector("#lightbox-date"),
  lightboxNote: document.querySelector("#lightbox-note"),
  lightboxCaption: document.querySelector("#lightbox-caption"),
  lightboxTags: document.querySelector("#lightbox-tags"),
  lightboxPosition: document.querySelector("#lightbox-position"),
  lightboxPrev: document.querySelector("#lightbox-prev"),
  lightboxNext: document.querySelector("#lightbox-next"),
};

const episodeTopics = ["all", "Music", "Sport", "Identity", "History", "Community", "Wellness"];
const postTypes = ["all", "image", "carousel", "video"];
const speeds = [1, 1.25, 1.5, 2];
let speedIndex = 0;

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Could not load ${path}`);
  return response.json();
}

async function loadSiteData() {
  if (state.dataLoaded) return;
  try {
    const bundledData = window.ASSYRIAN_PODCAST_DATA;
    const [episodes, posts] = bundledData
      ? [bundledData.episodes, bundledData.posts]
      : await Promise.all([
          loadJson("./data/episodes.json"),
          loadJson("./data/posts.json"),
        ]);
    state.episodes = episodes;
    state.posts = posts;
    state.dataLoaded = true;
    populateEpisodeFilters();
    populatePostFilters();
    renderEpisodes();
    renderPosts();
  } catch (error) {
    const message = document.createElement("p");
    message.className = "data-error";
    message.textContent = "The story archive could not load. Refresh the page, or make sure the site is opened through a web server.";
    elements.episodeList.replaceChildren(message);
    elements.episodeCount.textContent = "Archive unavailable";
    console.error(error);
  }
}

function unlockSite(persist = false) {
  if (persist) localStorage.setItem(STORAGE_KEY, "unlocked");
  elements.gate.hidden = true;
  elements.siteShell.hidden = false;
  document.body.classList.add("is-unlocked");
  loadSiteData();
}

function lockSite() {
  localStorage.removeItem(STORAGE_KEY);
  elements.audio.pause();
  elements.siteShell.hidden = true;
  elements.gate.hidden = false;
  document.body.classList.remove("is-unlocked");
  elements.password.value = "";
  elements.gateError.textContent = "";
  requestAnimationFrame(() => elements.password.focus());
}

if (localStorage.getItem(STORAGE_KEY) === "unlocked") {
  unlockSite(false);
} else {
  requestAnimationFrame(() => elements.password.focus());
}

elements.gateForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (elements.password.value === ACCESS_KEY) {
    elements.gateError.textContent = "";
    unlockSite(elements.remember.checked);
  } else {
    elements.gateError.textContent = "That password doesn’t match. Please try again.";
    elements.password.select();
  }
});

document.querySelector("#lock-site").addEventListener("click", lockSite);
document.querySelector("#copyright-year").textContent = String(new Date().getFullYear());

function populateEpisodeFilters() {
  const years = [...new Set(state.episodes.map((episode) => episode.year))].sort((a, b) => b - a);
  elements.yearFilter.insertAdjacentHTML("beforeend", years.map((year) => `<option value="${year}">${year}</option>`).join(""));
  elements.topicFilters.innerHTML = episodeTopics.map((topic) => `
    <button class="filter-chip${topic === "all" ? " is-active" : ""}" type="button" data-episode-topic="${escapeHtml(topic)}" aria-pressed="${topic === "all"}">
      ${topic === "all" ? "All stories" : escapeHtml(topic)}
    </button>
  `).join("");
}

function filteredEpisodes() {
  const query = state.episodeQuery.trim().toLowerCase();
  return state.episodes.filter((episode) => {
    const searchable = [episode.title, episode.guest, episode.topic, episode.summary, ...episode.notes].join(" ").toLowerCase();
    const queryMatch = !query || searchable.includes(query);
    const yearMatch = state.episodeYear === "all" || String(episode.year) === state.episodeYear;
    const topicMatch = state.episodeTopic === "all" || searchable.includes(state.episodeTopic.toLowerCase());
    return queryMatch && yearMatch && topicMatch;
  });
}

function episodeMarkup(episode) {
  const episodeKey = episode.id || episode.number;
  const notes = episode.notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("");
  const byline = episode.guest
    ? `<small>With ${escapeHtml(episode.guest)}</small>`
    : "";
  const conversationNotes = notes
    ? `<div><h4>In this conversation</h4><ul class="episode-notes">${notes}</ul></div>`
    : `<div><h4>From the archive</h4><p>Originally published in ${escapeHtml(episode.year)}. Open the original episode page for the complete description and links.</p></div>`;
  const timestamps = episode.timestamps.length
    ? `<ol class="episode-notes">${episode.timestamps.map((item) => `<li><button type="button" data-seek="${Number(item.seconds)}" data-play-episode="${escapeHtml(episodeKey)}">${escapeHtml(item.time)} — ${escapeHtml(item.label)}</button></li>`).join("")}</ol>`
    : `<p class="timestamp-note">Editorial chapter markers have not been supplied for this episode yet. The player remains fully scrubbable.</p>`;
  const transcript = episode.transcript
    ? `<p>${escapeHtml(episode.transcript)}</p>`
    : `<p>A verified transcript has not been published for this episode yet. This panel is ready for transcript text whenever it becomes available.</p>`;

  return `
    <article class="episode-item" data-episode-item="${escapeHtml(episodeKey)}">
      <div class="episode-item__main">
        <span class="episode-item__number">${escapeHtml(episode.number)}</span>
        <img class="episode-item__image" src="${escapeHtml(episode.image)}" alt="Artwork for ${escapeHtml(episode.title)}" loading="lazy" />
        <div class="episode-item__copy">
          <p class="episode-item__meta"><span>${formatDate(episode.date)}</span><span>${escapeHtml(episode.duration)}</span><span>${escapeHtml(episode.topic)}</span></p>
          <h3>${escapeHtml(episode.title)}${byline}</h3>
          <p class="episode-item__summary">${escapeHtml(episode.summary)}</p>
        </div>
        <div class="episode-item__actions">
          <button class="play-episode" type="button" data-play-episode="${escapeHtml(episodeKey)}">Play</button>
          <button class="expand-episode" type="button" data-toggle-episode="${escapeHtml(episodeKey)}" aria-expanded="false">Show notes</button>
        </div>
      </div>
      <div class="episode-detail" aria-hidden="true">
        <div class="episode-detail__inner">
          <div class="episode-detail__content">
            <div><h4>${episode.guest ? "Guest bio" : "About this episode"}</h4><p>${escapeHtml(episode.guestBio || episode.summary)}</p></div>
            ${conversationNotes}
            <div class="episode-utility">
              <div><h4>Timestamps</h4>${timestamps}</div>
              <details class="transcript"><summary>Transcript</summary>${transcript}</details>
              <a href="${escapeHtml(episode.episodeUrl)}" target="_blank" rel="noopener">Open full episode page ↗</a>
            </div>
          </div>
        </div>
      </div>
    </article>
  `;
}

function renderEpisodes() {
  const matches = filteredEpisodes();
  const filtersAreActive = Boolean(
    state.episodeQuery.trim()
    || state.episodeYear !== "all"
    || state.episodeTopic !== "all"
  );
  const showCompleteArchive = filtersAreActive || state.episodeArchiveExpanded;
  const episodes = showCompleteArchive ? matches : matches.slice(0, 5);
  elements.episodeList.innerHTML = episodes.map(episodeMarkup).join("");
  elements.episodeCount.textContent = !showCompleteArchive && matches.length > 5
    ? `5 latest conversations · ${matches.length} in the full archive`
    : `${matches.length} ${matches.length === 1 ? "conversation" : "conversations"}`;
  elements.episodeEmpty.hidden = matches.length > 0;
  elements.episodeArchiveActions.hidden = filtersAreActive || matches.length <= 5;
  elements.episodeArchiveToggle.setAttribute("aria-expanded", String(state.episodeArchiveExpanded));
  elements.episodeArchiveToggle.textContent = state.episodeArchiveExpanded
    ? "Show latest 5 ↑"
    : `Browse all ${matches.length} episodes ↓`;
  elements.episodeArchiveNote.textContent = state.episodeArchiveExpanded
    ? "You’re viewing the complete collection, from the newest release back to the 2018 trailer."
    : `${matches.length - 5} more conversations are waiting in the complete archive.`;
}

function setActiveFilter(buttons, selectedButton) {
  buttons.forEach((button) => {
    const isActive = button === selectedButton;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

elements.episodeSearch.addEventListener("input", () => {
  state.episodeQuery = elements.episodeSearch.value;
  renderEpisodes();
});
elements.yearFilter.addEventListener("change", () => {
  state.episodeYear = elements.yearFilter.value;
  renderEpisodes();
});
elements.topicFilters.addEventListener("click", (event) => {
  const button = event.target.closest("[data-episode-topic]");
  if (!button) return;
  state.episodeTopic = button.dataset.episodeTopic;
  setActiveFilter([...elements.topicFilters.querySelectorAll("button")], button);
  renderEpisodes();
});

function resetEpisodeFilters() {
  state.episodeQuery = "";
  state.episodeYear = "all";
  state.episodeTopic = "all";
  elements.episodeSearch.value = "";
  elements.yearFilter.value = "all";
  const firstTopic = elements.topicFilters.querySelector("button");
  if (firstTopic) setActiveFilter([...elements.topicFilters.querySelectorAll("button")], firstTopic);
  renderEpisodes();
}

document.querySelector("#reset-filters").addEventListener("click", resetEpisodeFilters);
document.querySelector("[data-reset-filters]").addEventListener("click", resetEpisodeFilters);
elements.episodeArchiveToggle.addEventListener("click", () => {
  const wasExpanded = state.episodeArchiveExpanded;
  state.episodeArchiveExpanded = !wasExpanded;
  renderEpisodes();
  if (wasExpanded) document.querySelector("#episodes-title").scrollIntoView({ behavior: "smooth", block: "start" });
});

/* Audio player */
function episodeByKey(key) {
  return state.episodes.find((episode) => String(episode.id || episode.number) === String(key))
    || state.episodes.find((episode) => String(episode.number) === String(key));
}

async function playEpisode(episode, seekSeconds = null) {
  if (!episode) return;
  const requested = new URL(episode.audio, window.location.href).href;
  const current = elements.audio.currentSrc || elements.audio.src;
  if (current !== requested) {
    elements.audio.src = episode.audio;
    elements.audio.load();
  }
  elements.playerNumber.textContent = episode.number;
  elements.playerTitle.textContent = episode.title;
  elements.playerTime.textContent = `00:00 / ${formatTime(episode.durationSeconds)}`;
  elements.playerPlay.setAttribute("aria-label", `Pause ${episode.title}`);
  elements.player.classList.remove("is-minimized");
  elements.playerCollapse.setAttribute("aria-label", "Minimize player");
  if (seekSeconds !== null) {
    const seek = () => {
      elements.audio.currentTime = seekSeconds;
      elements.audio.removeEventListener("loadedmetadata", seek);
    };
    if (elements.audio.readyState >= 1) elements.audio.currentTime = seekSeconds;
    else elements.audio.addEventListener("loadedmetadata", seek);
  }
  try { await elements.audio.play(); } catch { /* Browser may require a second direct gesture. */ }
}

async function togglePlayback() {
  if (elements.audio.paused) {
    try { await elements.audio.play(); } catch { return; }
  } else {
    elements.audio.pause();
  }
}

elements.playerPlay.addEventListener("click", togglePlayback);
elements.audio.addEventListener("play", () => {
  elements.playerPlay.textContent = "PAUSE";
  elements.playerPlay.setAttribute("aria-label", `Pause ${elements.playerTitle.textContent}`);
});
elements.audio.addEventListener("pause", () => {
  elements.playerPlay.textContent = "PLAY";
  elements.playerPlay.setAttribute("aria-label", `Play ${elements.playerTitle.textContent}`);
});
elements.audio.addEventListener("timeupdate", () => {
  const duration = elements.audio.duration;
  elements.playerScrub.value = duration ? String(Math.round((elements.audio.currentTime / duration) * 1000)) : "0";
  elements.playerTime.textContent = `${formatTime(elements.audio.currentTime)} / ${formatTime(duration)}`;
});
elements.playerScrub.addEventListener("input", () => {
  if (elements.audio.duration) elements.audio.currentTime = (Number(elements.playerScrub.value) / 1000) * elements.audio.duration;
});
elements.playerSpeed.addEventListener("click", () => {
  speedIndex = (speedIndex + 1) % speeds.length;
  elements.audio.playbackRate = speeds[speedIndex];
  elements.playerSpeed.textContent = `${speeds[speedIndex]}×`;
});
elements.playerCollapse.addEventListener("click", () => {
  const minimized = elements.player.classList.toggle("is-minimized");
  elements.playerCollapse.setAttribute("aria-label", minimized ? "Restore player" : "Minimize player");
});

/* Community media wall */
function populatePostFilters() {
  elements.postFilters.innerHTML = postTypes.map((type) => `
    <button class="filter-chip${type === "all" ? " is-active" : ""}" type="button" data-post-type="${type}" aria-pressed="${type === "all"}">
      ${type === "all" ? "All media" : type}
    </button>
  `).join("");
}

function filteredPosts() {
  return state.posts.filter((post) => state.postType === "all" || post.type === state.postType);
}

function postPreview(post) {
  if (post.type === "video") {
    return `<video src="${escapeHtml(post.src)}#t=0.1" aria-label="${escapeHtml(post.alt)}" muted playsinline preload="metadata"></video>`;
  }
  const src = post.type === "carousel" ? post.slides[0] : post.src;
  return `<img src="${escapeHtml(src)}" alt="${escapeHtml(post.alt)}" loading="lazy" />`;
}

function postMarkup(post) {
  const badge = post.type === "carousel" ? `${post.slides.length} photos` : post.type;
  return `
    <button class="post-card" type="button" data-open-post="${escapeHtml(post.id)}" aria-label="Open ${escapeHtml(post.title)}">
      <div class="post-card__media">${postPreview(post)}<span class="post-card__badge">${escapeHtml(badge)}</span></div>
      <div class="post-card__copy"><small>${formatDate(post.date)}</small><h3>${escapeHtml(post.title)}</h3><p>${escapeHtml(post.note)}</p></div>
    </button>
  `;
}

function renderPosts() {
  const posts = filteredPosts();
  const visible = posts.slice(0, state.visiblePosts);
  elements.postWall.innerHTML = visible.map(postMarkup).join("");
  elements.loadMore.hidden = visible.length >= posts.length;
}

elements.postFilters.addEventListener("click", (event) => {
  const button = event.target.closest("[data-post-type]");
  if (!button) return;
  state.postType = button.dataset.postType;
  state.visiblePosts = 8;
  setActiveFilter([...elements.postFilters.querySelectorAll("button")], button);
  renderPosts();
});
elements.loadMore.addEventListener("click", () => {
  state.visiblePosts += 6;
  renderPosts();
});

function mediaForPost(post) {
  return post.type === "carousel" ? post.slides : [post.src];
}

function renderLightboxStage() {
  const post = state.activePost;
  if (!post) return;
  const media = mediaForPost(post);
  const src = media[state.activeSlide];
  elements.lightboxStage.innerHTML = post.type === "video"
    ? `<video src="${escapeHtml(src)}" controls autoplay playsinline aria-label="${escapeHtml(post.alt)}"></video>`
    : `<img src="${escapeHtml(src)}" alt="${escapeHtml(post.alt)}" />`;
  const multiple = media.length > 1;
  elements.lightboxPrev.hidden = !multiple;
  elements.lightboxNext.hidden = !multiple;
  elements.lightboxPosition.hidden = !multiple;
  elements.lightboxPosition.textContent = multiple ? `${state.activeSlide + 1} / ${media.length}` : "";
}

function openLightbox(post) {
  state.activePost = post;
  state.activeSlide = 0;
  elements.lightboxTitle.textContent = post.title;
  elements.lightboxDate.textContent = formatDate(post.date);
  elements.lightboxNote.textContent = post.note;
  elements.lightboxCaption.textContent = post.caption;
  elements.lightboxTags.replaceChildren(...post.tags.map((tag) => {
    const span = document.createElement("span");
    span.textContent = tag;
    return span;
  }));
  renderLightboxStage();
  elements.lightbox.showModal();
  document.body.classList.add("modal-open");
}

function closeLightbox() {
  elements.lightbox.querySelector("video")?.pause();
  elements.lightbox.close();
  document.body.classList.remove("modal-open");
  state.activePost = null;
}

function changeSlide(direction) {
  if (!state.activePost) return;
  const media = mediaForPost(state.activePost);
  state.activeSlide = (state.activeSlide + direction + media.length) % media.length;
  renderLightboxStage();
}

elements.postWall.addEventListener("click", (event) => {
  const button = event.target.closest("[data-open-post]");
  if (!button) return;
  openLightbox(state.posts.find((post) => post.id === button.dataset.openPost));
});
document.querySelector("#lightbox-close").addEventListener("click", closeLightbox);
elements.lightboxPrev.addEventListener("click", () => changeSlide(-1));
elements.lightboxNext.addEventListener("click", () => changeSlide(1));
elements.lightbox.addEventListener("click", (event) => {
  if (event.target === elements.lightbox) closeLightbox();
});
elements.lightbox.addEventListener("close", () => document.body.classList.remove("modal-open"));

document.addEventListener("keydown", (event) => {
  if (!elements.lightbox.open) return;
  if (event.key === "ArrowLeft") changeSlide(-1);
  if (event.key === "ArrowRight") changeSlide(1);
});

/* Shared click actions */
document.addEventListener("click", (event) => {
  const playTrigger = event.target.closest("[data-play-episode]");
  if (playTrigger) {
    const episode = episodeByKey(playTrigger.dataset.playEpisode);
    const seek = playTrigger.hasAttribute("data-seek") ? Number(playTrigger.dataset.seek) : null;
    playEpisode(episode, seek);
    return;
  }

  const detailsTrigger = event.target.closest("[data-toggle-episode]");
  if (!detailsTrigger) return;
  const item = detailsTrigger.closest(".episode-item");
  const detail = item.querySelector(".episode-detail");
  const open = item.classList.toggle("is-open");
  detailsTrigger.setAttribute("aria-expanded", String(open));
  detailsTrigger.textContent = open ? "Close notes" : "Show notes";
  detail.setAttribute("aria-hidden", String(!open));
});
