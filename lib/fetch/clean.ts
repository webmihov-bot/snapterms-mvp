import * as cheerio from "cheerio";

// Collapsed accordions (common on terms pages) are [hidden] / aria-hidden: their text must be kept.
const STRIP = "script,style,noscript,template,svg,canvas,iframe,nav,footer,form,button,select,link,meta";
const BLOCKS = "p,div,section,article,main,li,ul,ol,table,tr,h1,h2,h3,h4,h5,h6,dt,dd,blockquote,pre,header,aside";

export interface CleanResult {
  text: string;
  title: string | null;
  scriptCount: number;
}

/** Collapses whitespace inside lines and keeps paragraph / heading breaks (so "7.3" numbering survives). */
export function collapse(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[\t\f\v   -​　]+/g, " ")
    .split("\n")
    .map((l) => l.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** "7.3\n\nWithdrawals" -> "7.3 Withdrawals": list and heading numbers often sit in their own element. */
export function joinClauseNumbers(text: string): string {
  return text.replace(/^((?:(?:section|clause|article)\s+)?\d{1,3}(?:\.\d{1,3}){0,3}[.)]?)\n+(?=\S)/gim, "$1 ");
}

export function cleanHtml(html: string): CleanResult {
  const $ = cheerio.load(html);
  const scriptCount = $("script").length;
  const title = $("title").first().text().trim() || null;
  $(STRIP).remove();
  $("br").replaceWith("\n");
  $(BLOCKS).each((_, el) => {
    $(el).prepend("\n").append("\n");
  });
  $("h1,h2,h3,h4,h5,h6").each((_, el) => {
    $(el).prepend("\n").append("\n");
  });
  const root = $("main").first().length && $("main").first().text().trim().length > 400 ? $("main").first() : $("body");
  return { text: joinClauseNumbers(collapse(root.text())), title, scriptCount };
}

export function cleanPlainText(text: string): string {
  return collapse(text);
}
