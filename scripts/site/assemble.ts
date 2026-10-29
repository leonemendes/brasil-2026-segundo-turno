import { readFileSync } from "node:fs";

export const PAGES = ["story", "explore", "day", "fake-news", "method"];
export const SCRIPTS = ["app.js"];

const read = (path: string) => readFileSync(`web/${path}`, "utf8");

export function assemblePage() {
  const sections = PAGES.map((p) => read(`pages/${p}.html`)).join("\n");
  const js = SCRIPTS.map((s) => read(`js/${s}`)).join("");
  return `<style>\n${read("styles/site.css")}</style>\n\n<div class="bz">\n${read("pages/header.html")}\n${sections}</div>\n\n<script>\n${js}</script>\n`;
}
