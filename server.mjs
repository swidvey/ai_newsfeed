import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const PORT = Number(process.env.PORT || 4173);
const PUBLIC_DIR = join(process.cwd(), "public");

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
  blockedTerms: ["crypto price", "stock alert"],
  readingLevel: "practical"
};

const SOURCES = [
  { name: "OpenAI Blog", topic: "Frontier labs", url: "https://openai.com/blog/rss.xml" },
  { name: "Google DeepMind", topic: "Research labs", url: "https://deepmind.google/discover/blog/rss.xml" },
  { name: "Anthropic News", topic: "Frontier labs", url: "https://www.anthropic.com/news/rss.xml" },
  { name: "MIT Technology Review AI", topic: "Analysis", url: "https://www.technologyreview.com/topic/artificial-intelligence/feed" },
  { name: "VentureBeat AI", topic: "Products", url: "https://venturebeat.com/category/ai/feed/" },
  { name: "The Decoder", topic: "Consumer AI", url: "https://the-decoder.com/feed/" },
  { name: "Hugging Face Blog", topic: "Open source", url: "https://huggingface.co/blog/feed.xml" },
  { name: "AI Business", topic: "Industry", url: "https://aibusiness.com/rss.xml" }
];

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

function sendJson(res, status, payload) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function decodeEntities(value = "") {
  return value
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .trim();
}

function stripHtml(value = "") {
  return decodeEntities(value)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function firstTag(item, tags) {
  for (const tag of tags) {
    const match = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
    if (match) return decodeEntities(match[1]);
  }
  return "";
}

function firstAttr(item, tag, attr) {
  const match = item.match(new RegExp(`<${tag}[^>]*${attr}=["']([^"']+)["'][^>]*>`, "i"));
  return match ? decodeEntities(match[1]) : "";
}

function parseFeed(xml, source) {
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) || xml.match(/<entry[\s\S]*?<\/entry>/gi) || [];

  return blocks.map((block) => {
    const title = stripHtml(firstTag(block, ["title"]));
    const summary = stripHtml(firstTag(block, ["description", "summary", "content:encoded", "content"]));
    const link = firstTag(block, ["link"]) || firstAttr(block, "link", "href");
    const publishedRaw = firstTag(block, ["pubDate", "published", "updated", "dc:date"]);
    const publishedAt = Number.isNaN(Date.parse(publishedRaw))
      ? new Date().toISOString()
      : new Date(publishedRaw).toISOString();

    return {
      id: `${source.name}:${link || title}`,
      title,
      summary,
      url: link,
      publishedAt,
      source: source.name,
      sourceTopic: source.topic
    };
  }).filter((article) => article.title && article.url);
}

function keywordScore(text, keywords) {
  const haystack = text.toLowerCase();
  return keywords.reduce((score, keyword) => {
    const normalized = keyword.toLowerCase();
    if (haystack.includes(normalized)) return score + 6;
    return normalized.split(/\s+/).reduce((partial, word) => partial + (haystack.includes(word) ? 1 : 0), score);
  }, 0);
}

function buildReason(article, profile, score) {
  const matched = profile.interests
    .filter((interest) => `${article.title} ${article.summary}`.toLowerCase().includes(interest.toLowerCase()))
    .slice(0, 2);

  if (matched.length > 0) {
    return `Matched your interest in ${matched.join(" and ")}.`;
  }

  if (score >= 6) {
    return "Related to several words in your AI interest profile.";
  }

  return `Included for broader coverage of ${article.sourceTopic.toLowerCase()}.`;
}

function summarize(article) {
  const text = article.summary || article.title;
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  return sentences.slice(0, 2).join(" ").replace(/\s+/g, " ").trim();
}

function selectTopic(article) {
  const text = `${article.title} ${article.summary}`.toLowerCase();
  const topics = [
    ["Agents", ["agent", "workflow", "automation", "assistant"]],
    ["Consumer Tools", ["chatgpt", "claude", "gemini", "app", "tool", "productivity"]],
    ["Models", ["model", "llm", "gpt", "reasoning", "multimodal", "embedding"]],
    ["Research", ["research", "paper", "benchmark", "evaluation", "dataset"]],
    ["Policy and Safety", ["safety", "policy", "regulation", "risk", "governance"]],
    ["Business", ["enterprise", "funding", "startup", "revenue", "launch"]]
  ];

  const match = topics.find(([, words]) => words.some((word) => text.includes(word)));
  return match ? match[0] : article.sourceTopic;
}

function rankArticles(articles, profile) {
  const seen = new Set();
  const blockedTerms = profile.blockedTerms.map((term) => term.toLowerCase());

  return articles
    .filter((article) => {
      const key = article.url.replace(/\/$/, "");
      const text = `${article.title} ${article.summary}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return !blockedTerms.some((term) => text.includes(term));
    })
    .map((article) => {
      const recencyHours = Math.max(1, (Date.now() - Date.parse(article.publishedAt)) / 36e5);
      const relevance = keywordScore(`${article.title} ${article.summary}`, profile.interests);
      const recency = Math.max(0, 10 - Math.log2(recencyHours));
      const score = Math.round((relevance * 10 + recency * 4) * 10) / 10;

      return {
        ...article,
        topic: selectTopic(article),
        digest: summarize(article),
        relevanceScore: score,
        whySelected: buildReason(article, profile, relevance)
      };
    })
    .sort((a, b) => b.relevanceScore - a.relevanceScore || Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, 36);
}

async function fetchSource(source) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(source.url, {
      signal: controller.signal,
      headers: { "user-agent": "AI Newsfeed Agent/0.1" }
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    return { source, articles: parseFeed(await response.text(), source), error: null };
  } catch (error) {
    return { source, articles: [], error: error.message };
  } finally {
    clearTimeout(timeout);
  }
}

async function handleDigest(req, res) {
  let body = "";
  for await (const chunk of req) body += chunk;

  const profile = {
    ...DEFAULT_PROFILE,
    ...(body ? JSON.parse(body) : {})
  };

  const results = await Promise.all(SOURCES.map(fetchSource));
  const articles = results.flatMap((result) => result.articles);
  const errors = results
    .filter((result) => result.error)
    .map((result) => ({ source: result.source.name, error: result.error }));
  const ranked = rankArticles(articles, profile);
  const topics = [...new Set(ranked.map((article) => article.topic))];

  sendJson(res, 200, {
    generatedAt: new Date().toISOString(),
    profile,
    sources: SOURCES.map(({ name, topic, url }) => ({ name, topic, url })),
    sourceErrors: errors,
    topics,
    articles: ranked
  });
}

async function serveStatic(req, res) {
  const requested = new URL(req.url, `http://${req.headers.host}`).pathname;
  const filePath = normalize(join(PUBLIC_DIR, requested === "/" ? "index.html" : requested));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const data = await readFile(filePath);
    res.writeHead(200, { "content-type": MIME_TYPES[extname(filePath)] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}

createServer(async (req, res) => {
  try {
    if (req.url === "/api/digest" && req.method === "POST") {
      await handleDigest(req, res);
      return;
    }

    await serveStatic(req, res);
  } catch (error) {
    sendJson(res, 500, { error: error.message });
  }
}).listen(PORT, () => {
  console.log(`AI newsfeed running at http://localhost:${PORT}`);
});
