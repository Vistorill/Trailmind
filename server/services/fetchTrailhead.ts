import * as cheerio from "cheerio";
import { createHash } from "crypto";
import { env } from "../_core/env";
import type { TrailTestSection } from "../../shared/analyzer";

export interface FetchResult {
  title: string;
  content: string;
  quality: "full" | "partial" | "failed";
  contentHash: string;
}

const NOISE_PATTERNS = [
  /^recursos$/i,
  /^compartilhar/i,
  /^procurando ajuda/i,
  /^tempo estimado$/i,
  /^cerca de \d+/i,
  /^agentforce recursos$/i,
  /^tópicos$/i,
  /^objetivos de aprendizagem$/i,
  /^finalizar$/i,
  /^skip to main content/i,
];

function isNoise(text: string): boolean {
  const trimmed = text.trim();
  if (/^[A-D]$/i.test(trimmed) || /^\d+$/.test(trimmed)) return false;
  if (trimmed.length < 15) return true;
  return NOISE_PATTERNS.some((p) => p.test(trimmed));
}

function extractContent($: cheerio.CheerioAPI): string[] {
  const parts: string[] = [];
  const seen = new Set<string>();

  const add = (text: string, prefix = "") => {
    const cleaned = text.replace(/\s+/g, " ").trim();
    if (isNoise(cleaned) || seen.has(cleaned)) return;
    seen.add(cleaned);
    parts.push(prefix ? `${prefix}\n${cleaned}` : cleaned);
  };

  // Prioriza área principal do Trailhead
  const mainSelectors = [
    "main article",
    "main",
    "article",
    '[role="main"]',
    ".content",
    ".ql-editor",
  ];

  let root = $("body");
  for (const sel of mainSelectors) {
    const el = $(sel).first();
    if (el.length && el.text().trim().length > 200) {
      root = el;
      break;
    }
  }

  root.find("h1, h2, h3, h4, p, li, blockquote").each((_, el) => {
    const tag = (el as cheerio.Element).tagName?.toLowerCase();
    const text = $(el).text().trim();
    if (!text) return;

    if (tag === "h1" || tag === "h2" || tag === "h3" || tag === "h4") {
      const marker = tag === "h1" ? "#" : tag === "h2" ? "##" : tag === "h3" ? "###" : "####";
      add(`${marker} ${text}`);
    } else if (text.length > 20) {
      add(text);
    }
  });

  return parts;
}

interface TrailheadChallengeQuestion {
  question: string;
  options: string[];
}

interface TrailheadChallengeData {
  title: string;
  points: number;
  type: string;
  questions: TrailheadChallengeQuestion[];
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

/** Extrai quiz/desafio do componente React embutido no HTML do Trailhead */
export function extractChallengeFromHtml(html: string): TrailheadChallengeData | null {
  const $ = cheerio.load(html);
  const el = $('[data-react-class="challenge/Challenge"]').first();
  if (!el.length) return null;

  const raw = el.attr("data-react-props");
  if (!raw) return null;

  try {
    const props = JSON.parse(decodeHtmlEntities(raw)) as {
      challenge?: {
        type?: string;
        title?: string;
        points?: number;
        questions?: TrailheadChallengeQuestion[];
        assessment_evaluation_context?: { questions?: TrailheadChallengeQuestion[] };
      };
    };

    const challenge = props.challenge;
    const questions =
      challenge?.questions ?? challenge?.assessment_evaluation_context?.questions ?? [];
    if (!questions.length) return null;

    const type = challenge?.type ?? "quiz";
    const title =
      challenge?.title?.trim() ||
      (type === "quiz" ? "Teste" : "Desafio");

    return {
      title,
      points: challenge?.points ?? 100,
      type,
      questions,
    };
  } catch {
    return null;
  }
}

export function challengeToTestSections(data: TrailheadChallengeData): TrailTestSection[] {
  return [
    {
      id: "test_challenge",
      title: `${data.title} +${Math.round(data.points)} pontos`,
      source: "desafio",
      questions: data.questions.map((q) => ({
        question: q.question,
        options: Object.fromEntries(
          q.options.map((opt, i) => [String.fromCharCode(65 + i), opt])
        ),
      })),
    },
  ];
}

function formatChallengeSection(data: TrailheadChallengeData): string {
  const lines = [`-- ${data.title}`, `+${Math.round(data.points)} pontos`, ""];
  data.questions.forEach((q, qi) => {
    lines.push(String(qi + 1));
    lines.push(q.question);
    lines.push("");
    q.options.forEach((opt, oi) => {
      lines.push(String.fromCharCode(65 + oi));
      lines.push(opt);
      lines.push("");
    });
  });
  return lines.join("\n");
}

/** Extrai seções de Teste/Desafio do HTML do Trailhead */
function extractQuizSections($: cheerio.CheerioAPI, root: cheerio.Cheerio<cheerio.Element>): string[] {
  const sections: string[] = [];

  root.find("h2, h3, h4").each((_, el) => {
    const rawTitle = $(el).text().trim();
    if (!/\b(teste|desafio|challenge|quiz|assessment)\b/i.test(rawTitle)) return;

    const lines: string[] = [`-- ${rawTitle}`];
    let node = $(el).next();

    while (node.length) {
      const tag = node.prop("tagName")?.toLowerCase() ?? "";
      if (tag === "h1" || tag === "h2") break;

      const nodeText = node.text().trim();
      if (nodeText) {
        if (/^\+?\d+\s*pontos$/i.test(nodeText)) {
          lines.push(nodeText);
        } else if (node.find("label").length >= 2) {
          node.find("legend, p, h5, strong, [class*='question']").each((_, q) => {
            const qt = $(q).text().trim();
            if (qt.length > 10 && !/^[A-D]$/i.test(qt)) lines.push(qt);
          });
          node.find("label").each((_, label) => {
            const lt = $(label).text().trim();
            const m = lt.match(/^([A-D])\s*(.*)/is);
            if (m) {
              lines.push(m[1].toUpperCase());
              if (m[2].trim()) lines.push(m[2].trim());
            } else if (lt.length > 1) {
              lines.push(lt);
            }
          });
        } else {
          nodeText.split(/\n+/).forEach((line) => {
            const t = line.trim();
            if (t) lines.push(t);
          });
        }
      }

      node = node.next();
    }

    if (lines.length > 2) sections.push(lines.join("\n"));
  });

  return sections;
}

export function isTrailheadUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname.includes("trailhead.salesforce.com");
  } catch {
    return false;
  }
}

/** Normaliza URLs do Trailhead para comparação e armazenamento consistente. */
export function normalizeTrailUrl(url: string): string {
  try {
    const u = new URL(url.trim());
    u.protocol = "https:";
    u.hostname = u.hostname.toLowerCase();
    u.hash = "";
    if (u.pathname.endsWith("/") && u.pathname.length > 1) {
      u.pathname = u.pathname.slice(0, -1);
    }
    return u.toString();
  } catch {
    return url.trim().toLowerCase();
  }
}

export async function fetchTrailheadContent(url: string): Promise<FetchResult> {
  if (!isTrailheadUrl(url)) {
    throw new Error("URL inválida. Use um link do Trailhead (trailhead.salesforce.com).");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.TRAILHEAD_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; TrailMind/1.0; Educational)",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      throw new Error(`Falha ao acessar URL: HTTP ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    $("script, style, nav, footer, header, .slds-global-header, aside, [aria-hidden='true']").remove();

    const title =
      $("h1").first().text().trim() ||
      $('meta[property="og:title"]').attr("content")?.trim() ||
      $("title").text().replace(/\s*\|.*$/, "").trim() ||
      "Unidade Trailhead";

    let root = $("body");
    for (const sel of ["main article", "main", "article", '[role="main"]', ".content", ".ql-editor"]) {
      const el = $(sel).first();
      if (el.length && el.text().trim().length > 200) {
        root = el;
        break;
      }
    }

    const contentParts = extractContent($);
    const quizParts = extractQuizSections($, root);
    const challenge = extractChallengeFromHtml(html);
    const challengePart = challenge ? formatChallengeSection(challenge) : null;

    const allParts = [
      ...contentParts,
      ...quizParts.filter((q) => !contentParts.some((c) => c.includes(q.slice(0, 40)))),
      ...(challengePart ? [challengePart] : []),
    ];
    const content = allParts.join("\n\n").slice(0, 50000);
    const contentHash = createHash("sha256").update(content).digest("hex");

    if (content.length < 100) {
      return {
        title,
        content: content || "Conteúdo insuficiente extraído. Cole o texto manualmente.",
        quality: "failed",
        contentHash,
      };
    }

    const quality = content.length < 500 ? "partial" : "full";
    return { title, content, quality, contentHash };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Timeout ao acessar a URL. Tente novamente.");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
