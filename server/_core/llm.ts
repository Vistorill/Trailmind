import { env } from "./env";

interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

export interface InvokeLLMOptions {
  jsonMode?: boolean;
  model?: string;
  maxTokens?: number;
}

function getBaseUrl(): string {
  if (env.LLM_PROVIDER === "openrouter") {
    return "https://openrouter.ai/api/v1/chat/completions";
  }
  return "https://api.openai.com/v1/chat/completions";
}

async function callLLM(
  messages: LLMMessage[],
  model: string,
  jsonMode: boolean,
  maxTokens: number
): Promise<string> {
  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: 0.4,
    max_tokens: maxTokens,
  };

  if (jsonMode) {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch(getBaseUrl(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": env.isProduction ? "https://trailmind.app" : "http://localhost:5173",
      "X-Title": "TrailMind",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("[LLM] Error:", response.status, model, err.slice(0, 300));
    const error = new Error(`Erro na IA (${response.status}): ${parseErrorMessage(err)}`) as Error & {
      status?: number;
    };
    error.status = response.status;
    throw error;
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
    error?: { message: string };
  };

  if (data.error) {
    throw new Error(`Erro na IA: ${data.error.message}`);
  }

  const content = data.choices[0]?.message?.content ?? "";
  if (!content) {
    throw new Error("IA retornou resposta vazia");
  }

  return content;
}

function parseErrorMessage(raw: string): string {
  try {
    const j = JSON.parse(raw) as { error?: { message?: string } };
    return j.error?.message ?? raw.slice(0, 200);
  } catch {
    return raw.slice(0, 200);
  }
}

export async function invokeLLM(
  messages: LLMMessage[],
  jsonModeOrOptions: boolean | InvokeLLMOptions = false,
  legacyModel?: string
): Promise<string> {
  const options: InvokeLLMOptions =
    typeof jsonModeOrOptions === "boolean"
      ? { jsonMode: jsonModeOrOptions, model: legacyModel }
      : jsonModeOrOptions;

  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY não configurada. Configure no .env para usar recursos de IA.");
  }

  const primaryModel = options.model ?? env.OPENAI_MODEL;
  const fallbackModel = env.OPENAI_MODEL;
  const maxTokens = options.maxTokens ?? 4096;
  const jsonMode = options.jsonMode ?? false;

  try {
    return await callLLM(messages, primaryModel, jsonMode, maxTokens);
  } catch (err) {
    const status = (err as Error & { status?: number }).status;
    // Créditos insuficientes no modelo premium → fallback para mini
    if (status === 402 && primaryModel !== fallbackModel) {
      console.warn(`[LLM] Fallback ${primaryModel} → ${fallbackModel} (créditos insuficientes)`);
      return await callLLM(messages, fallbackModel, jsonMode, maxTokens);
    }
    throw err;
  }
}

/** Extrai JSON mesmo quando o modelo envolve em ```json ... ``` */
export function parseLLMJson<T>(raw: string): T {
  let text = raw.trim();

  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    text = fenceMatch[1].trim();
  }

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    text = text.slice(start, end + 1);
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    console.error("[LLM] JSON parse failed. Raw:", raw.slice(0, 500));
    throw new Error("Resposta da IA não é JSON válido. Tente novamente.");
  }
}
