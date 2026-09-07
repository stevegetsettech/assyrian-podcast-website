import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const episodes = JSON.parse(readFileSync(resolve("data/episodes.json"), "utf8"));
const posts = JSON.parse(readFileSync(resolve("data/posts.json"), "utf8"));
const bundle = `window.ASSYRIAN_PODCAST_DATA = ${JSON.stringify({ episodes, posts })};\n`;

writeFileSync(resolve("data/content-data.js"), bundle, "utf8");
