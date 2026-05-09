const DEFAULT_PROFILE = {
  interests: [
    "AI agents",
    "consumer AI tools",
    "OpenAI",
    "LLMs",
    "AI productivity",
    "AI safety",
    "multimodal AI"
  ],
  blockedTerms: ["crypto price", "stock alert"]
};

const state = {
  activeTopic: "All",
  digest: null
};

const elements = {
  interests: document.querySelector("#interests"),
  blockedTerms: document.querySelector("#blockedTerms"),
  refreshFeed: document.querySelector("#refreshFeed"),
  resetProfile: document.querySelector("#resetProfile"),
  topicTabs: document.querySelector("#topicTabs"),
  digestGrid: document.querySelector("#digestGrid"),
  sourceErrors: document.querySelector("#sourceErrors"),
  articleTemplate: document.querySelector("#articleTemplate"),
  sourceCount: document.querySelector("#sourceCount"),
  updatedAt: document.querySelector("#updatedAt"),
  briefTitle: document.querySelector("#briefTitle")
};

function listToText(items) {
  return items.join("\n");
}

function textToList(value) {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function loadProfile() {
  const saved = localStorage.getItem("ai-newsfeed-profile");
  return saved ? JSON.parse(saved) : DEFAULT_PROFILE;
}

function saveProfile(profile) {
  localStorage.setItem("ai-newsfeed-profile", JSON.stringify(profile));
}

function readProfile() {
  const profile = {
    interests: textToList(elements.interests.value),
    blockedTerms: textToList(elements.blockedTerms.value)
  };
  saveProfile(profile);
  return profile;
}

function writeProfile(profile) {
  elements.interests.value = listToText(profile.interests);
  elements.blockedTerms.value = listToText(profile.blockedTerms);
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function setLoading() {
  elements.digestGrid.innerHTML = `
    <div class="empty-state">
      <div class="loader"></div>
      <p>Building your AI digest...</p>
    </div>
  `;
}

function renderTabs() {
  const topics = ["All", ...(state.digest?.topics || [])];
  elements.topicTabs.replaceChildren();

  topics.forEach((topic) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = topic;
    button.className = topic === state.activeTopic ? "active" : "";
    button.addEventListener("click", () => {
      state.activeTopic = topic;
      render();
    });
    elements.topicTabs.append(button);
  });
}

function renderArticles() {
  const articles = state.digest.articles.filter((article) => {
    return state.activeTopic === "All" || article.topic === state.activeTopic;
  });

  elements.digestGrid.replaceChildren();

  if (articles.length === 0) {
    elements.digestGrid.innerHTML = `
      <div class="empty-state">
        <p>No articles matched this topic yet. Try broadening your interests or refreshing again.</p>
      </div>
    `;
    return;
  }

  articles.forEach((article) => {
    const card = elements.articleTemplate.content.firstElementChild.cloneNode(true);
    card.querySelector(".topic").textContent = article.topic;
    card.querySelector(".score").textContent = `${Math.round(article.relevanceScore)} fit`;
    card.querySelector("h3").textContent = article.title;
    card.querySelector(".digest").textContent = article.digest || "Open the source for the full article.";
    card.querySelector(".why").textContent = article.whySelected;
    card.querySelector(".source").textContent = `${article.source} - ${formatDate(article.publishedAt)}`;
    card.querySelector("a").href = article.url;
    elements.digestGrid.append(card);
  });
}

function renderStatus() {
  elements.sourceCount.textContent = `${state.digest.sources.length} sources`;
  elements.updatedAt.textContent = `Updated ${formatDate(state.digest.generatedAt)}`;
  elements.briefTitle.textContent = `${state.digest.articles.length} selected stories`;
}

function renderSourceErrors() {
  const errors = state.digest.sourceErrors || [];
  elements.sourceErrors.hidden = errors.length === 0;

  if (errors.length > 0) {
    const names = errors.map((error) => error.source).join(", ");
    elements.sourceErrors.replaceChildren();

    const count = document.createElement("strong");
    count.textContent = `${errors.length} feeds could not be reached.`;
    elements.sourceErrors.append(count, ` ${names}`);
  }
}

function render() {
  if (!state.digest) return;
  renderTabs();
  renderStatus();
  renderSourceErrors();
  renderArticles();
}

async function refreshDigest() {
  setLoading();
  elements.refreshFeed.disabled = true;
  elements.refreshFeed.textContent = "Refreshing...";

  try {
    const response = await fetch("/api/digest", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(readProfile())
    });

    if (!response.ok) throw new Error("Digest request failed");

    state.digest = await response.json();
    state.activeTopic = "All";
    render();
  } catch (error) {
    elements.digestGrid.innerHTML = `
      <div class="empty-state">
        <p>${error.message}. Check your network and try again.</p>
      </div>
    `;
  } finally {
    elements.refreshFeed.disabled = false;
    elements.refreshFeed.textContent = "Refresh Digest";
  }
}

elements.refreshFeed.addEventListener("click", refreshDigest);
elements.resetProfile.addEventListener("click", () => {
  writeProfile(DEFAULT_PROFILE);
  saveProfile(DEFAULT_PROFILE);
  refreshDigest();
});

writeProfile(loadProfile());
refreshDigest();
