import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const FEED_URL = "https://feed.podbean.com/assyrianpodcast/feed.xml";
const EPISODES_PATH = resolve("data/episodes.json");
const FALLBACK_IMAGE = "./assets/images/assyrian-podcast-mark.jpg";

const currentEpisodes = JSON.parse(readFileSync(EPISODES_PATH, "utf8"));
const curatedByUrl = new Map(
  currentEpisodes
    .filter((episode) => episode.image?.startsWith("./assets/images/episode-"))
    .map((episode) => [episode.episodeUrl, episode]),
);

const response = await fetch(FEED_URL);
if (!response.ok) throw new Error(`Could not download the podcast feed (${response.status})`);
const xml = await response.text();

function decodeEntities(value = "") {
  const named = { amp: "&", apos: "'", gt: ">", lt: "<", nbsp: " ", quot: '"' };
  let decoded = value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
  const replaceEntity = (entity, code) => {
      if (code[0] !== "#") return named[code.toLowerCase()] ?? entity;
      const numeric = code[1].toLowerCase() === "x"
        ? Number.parseInt(code.slice(2), 16)
        : Number.parseInt(code.slice(1), 10);
      return Number.isFinite(numeric) ? String.fromCodePoint(numeric) : entity;
  };
  for (let pass = 0; pass < 4; pass += 1) {
    const next = decoded.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, replaceEntity);
    if (next === decoded) break;
    decoded = next;
  }
  return decoded;
}

function element(block, name) {
  return decodeEntities(block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i"))?.[1]?.trim() ?? "");
}

function attribute(block, tag, name) {
  const markup = block.match(new RegExp(`<${tag}\\b[^>]*>`, "i"))?.[0] ?? "";
  return decodeEntities(markup.match(new RegExp(`${name}=["']([^"']+)["']`, "i"))?.[1]?.trim() ?? "");
}

function cleanText(html = "") {
  return decodeEntities(html)
    .replace(/<br\s*\/?\s*>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function trimAtWord(value, maxLength) {
  if (value.length <= maxLength) return value;
  const shortened = value.slice(0, maxLength + 1);
  return `${shortened.slice(0, shortened.lastIndexOf(" ")).trim()}…`;
}

function primaryDescription(value, title) {
  const withoutPromos = value
    .split(/\b(?:Sponsor:|Support for this week(?:'|’)s episode|Follow us|Instagram:|Facebook:|Twitter:)\b/i)[0]
    .trim();
  const withoutNumber = withoutPromos
    .replace(/^(?:Episode(?:\s+Description)?|Ep\.?)\s*(?:#\s*)?(?:[-:]\s*)?\d+(?:\s*(?:Part|Pt\.?)\s*\d+)?\s*[:–—-]*\s*/i, "")
    .trim();
  return withoutNumber || withoutPromos || `${title} from the Assyrian Podcast archive.`;
}

function episodeNumber(description, title, itunesEpisode) {
  if (/trailer/i.test(title)) return "TR";
  const match = `${description} ${title}`.match(
    /\b(?:Episode(?:\s+Description)?|Ep\.?)\s*(?:#\s*)?(?:[-:]\s*)?(\d+)(?:\s*(?:Part|Pt\.?)\s*(\d+))?/i,
  );
  if (match) return match[2] ? `${match[1]}.${match[2]}` : match[1];
  return itunesEpisode || "—";
}

function durationLabel(seconds) {
  const totalMinutes = Math.floor(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (!hours) return `${Math.max(1, totalMinutes)} min`;
  return minutes ? `${hours} hr ${minutes} min` : `${hours} hr`;
}

function topicFor(text) {
  const value = text.toLowerCase();
  if (/music|singer|song|rapper|album|artist|dance|dj\b|composer/.test(value)) return "Music & Arts";
  if (/football|soccer|sport|athlet|bodybuild|basketball|coach|wrestl/.test(value)) return "Sport & Community";
  if (/history|histor|ancient|assyriolog|archive|genocide|heritage|museum|nineveh/.test(value)) return "History & Heritage";
  if (/health|doctor|medical|medicine|mental|wellness|therap|psycholog|nutrition/.test(value)) return "Wellness & Community";
  if (/language|aramaic|education|school|teacher|professor|student|university|book|author/.test(value)) return "Language & Education";
  if (/church|faith|bishop|priest|community|nonprofit|activis|advocacy|organization/.test(value)) return "Community & Service";
  return "Identity & Culture";
}

function slugFromUrl(url, index) {
  try {
    const slug = new URL(url).pathname.split("/").filter(Boolean).at(-1);
    return slug ? `episode-${slug}` : `episode-feed-${index + 1}`;
  } catch {
    return `episode-feed-${index + 1}`;
  }
}

const itemBlocks = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((match) => match[1]);
const episodes = itemBlocks.map((item, index) => {
  const title = element(item, "title").trim();
  const episodeUrl = element(item, "link");
  const description = cleanText(element(item, "description"));
  const published = new Date(element(item, "pubDate"));
  const durationSeconds = Number.parseInt(element(item, "itunes:duration"), 10) || 0;
  const itunesEpisode = element(item, "itunes:episode");
  const number = episodeNumber(description, title, itunesEpisode);
  const image = attribute(item, "itunes:image", "href") || FALLBACK_IMAGE;
  const audio = attribute(item, "enclosure", "url");
  const summaryText = primaryDescription(description, title);
  const withMatch = title.match(/^(.*?)\s+with\s+(.+)$/i);
  const curated = curatedByUrl.get(episodeUrl);

  if (curated) {
    return { ...curated, id: slugFromUrl(episodeUrl, index), audio: audio || curated.audio };
  }

  return {
    id: slugFromUrl(episodeUrl, index),
    number,
    title: withMatch?.[1]?.trim() || title,
    guest: withMatch?.[2]?.trim() || "",
    date: published.toISOString().slice(0, 10),
    year: published.getUTCFullYear(),
    duration: durationLabel(durationSeconds),
    durationSeconds,
    topic: topicFor(`${title} ${description}`),
    image,
    audio,
    episodeUrl,
    summary: trimAtWord(summaryText, 330),
    guestBio: trimAtWord(summaryText, 900),
    notes: [],
    timestamps: [],
    transcript: "",
  };
});

episodes.sort((a, b) => b.date.localeCompare(a.date));
writeFileSync(EPISODES_PATH, `${JSON.stringify(episodes, null, 2)}\n`, "utf8");

const years = [...new Set(episodes.map((episode) => episode.year))].sort((a, b) => b - a);
console.log(`Synced ${episodes.length} feed entries across ${years.at(-1)}–${years[0]}.`);
