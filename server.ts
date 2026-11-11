import { sanitizeGenerateConfig, validContents, publicErrorMessage } from "./proxyGuard";
import express from "express";
import path from "path";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();


const app = express();
const PORT = process.env.PORT || 3000;
app.disable("x-powered-by");
// esbuild 打包的正式版（npm run build 產生）一律視為正式環境，避免忘了設 NODE_ENV 就跑開發模式。
declare const HG_BUNDLED: boolean | undefined;
const IS_PRODUCTION = process.env.NODE_ENV === "production" || (typeof HG_BUNDLED !== "undefined" && HG_BUNDLED === true);
const FULL_CSP = "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob:; media-src 'self' data: blob:; connect-src 'self' https://script.google.com https://script.googleusercontent.com; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";

// 只允許本站（含 Netlify 預覽網址）與本機開發跨來源呼叫；同源請求不受影響。
const ALLOWED_ORIGIN = /^(https:\/\/([a-z0-9-]+--)?healthcona\.netlify\.app|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?)$/;
app.use(cors({ origin: (origin, cb) => cb(null, !origin || ALLOWED_ORIGIN.test(origin)) }));
// 影片上限 3 MB，base64 後約 4 MB；保留餘裕但不再接受 50 MB。
app.use(express.json({ limit: "8mb" }));
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  if (!req.path.startsWith("/api/")) {
    res.setHeader("X-Frame-Options", "DENY");
    // 正式版用和 netlify.toml 相同的完整 CSP；開發模式 Vite 需要內嵌程式，只套不影響開發的部分。
    res.setHeader("Content-Security-Policy", IS_PRODUCTION ? FULL_CSP : "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'");
  }
  next();
});

const GEMINI_REST = "https://generativelanguage.googleapis.com/v1beta";

// 只使用使用者自己在設定頁填的金鑰。不再退回伺服器環境變數的金鑰，避免網站變成任何人都能免費使用的開放代理。
const resolveGeminiKey = (req: express.Request): string | null => {
  const clientKey = String(req.headers['authorization'] || '').replace(/^Bearer\s+/i, '').trim();
  return clientKey.length >= 20 && clientKey.length <= 200 && clientKey !== "null" ? clientKey : null;
};
const VALID_MODEL = /^[a-z0-9][a-z0-9.\-]{1,63}$/;
const missingKey = (res: express.Response) => res.status(401).json({ error: "請先在設定填寫 Gemini API Key", code: 401, status: "UNAUTHENTICATED" });
const invalidModel = (res: express.Response) => res.status(400).json({ error: "模型名稱格式錯誤", code: 400, status: "INVALID_ARGUMENT" });

// 把 @google/genai 丟出的錯誤還原成 Google 的 HTTP 狀態碼與 status 字串，讓前端能分辨金鑰錯、額度用完、模型停用。
const describeGeminiError = (error: any) => {
  const message = String(error?.message || error || "Gemini request failed");
  let code = Number(error?.status ?? error?.code ?? error?.response?.status ?? 0);
  let status = "";
  const jsonStart = message.indexOf("{");
  if (jsonStart >= 0) {
    try {
      const parsed = JSON.parse(message.slice(jsonStart));
      code = code || Number(parsed?.error?.code || 0);
      status = String(parsed?.error?.status || "");
    } catch {}
  }
  if (!status) {
    if (/RESOURCE_EXHAUSTED/.test(message)) status = "RESOURCE_EXHAUSTED";
    else if (/NOT_FOUND/.test(message)) status = "NOT_FOUND";
    else if (/PERMISSION_DENIED/.test(message)) status = "PERMISSION_DENIED";
    else if (/UNAUTHENTICATED/.test(message)) status = "UNAUTHENTICATED";
    else if (/API key not valid|INVALID_ARGUMENT/.test(message)) status = "INVALID_ARGUMENT";
  }
  if (!(code >= 400 && code <= 599)) {
    code = status === "RESOURCE_EXHAUSTED" ? 429 : status === "NOT_FOUND" ? 404 : status === "PERMISSION_DENIED" ? 403 : status === "UNAUTHENTICATED" ? 401 : status === "INVALID_ARGUMENT" ? 400 : 500;
  }
  return { code, status, message: publicErrorMessage(message, code) };
};

const getGeminiClient = (key: string) => new GoogleGenAI({ apiKey: key });
const badRequest = (res: express.Response, message: string) => res.status(400).json({ error: message, code: 400, status: "INVALID_ARGUMENT" });

// Generic endpoint for generateContent
app.post("/api/gemini/generateContent", async (req, res) => {
  const key = resolveGeminiKey(req);
  if (!key) return missingKey(res);
  const { model, contents } = req.body || {};
  if (typeof model !== "string" || !VALID_MODEL.test(model)) return invalidModel(res);
  if (!validContents(contents)) return badRequest(res, "contents 格式錯誤");
  let config: Record<string, unknown> | undefined;
  try { config = sanitizeGenerateConfig(req.body?.config); } catch (e: any) { return badRequest(res, e.message); }
  try {
    const ai = getGeminiClient(key);

    const response = await ai.models.generateContent({
      model,
      contents,
      config,
    });
    
    res.json({
      ...response,
      text: response.text
    });
  } catch (error: any) {
    const described = describeGeminiError(error);
    console.error("Gemini Error:", described.code, described.status);
    res.status(described.code).json({ error: described.message, code: described.code, status: described.status });
  }
});

// 列出此金鑰目前可用的模型，供前端「自動換模型」在預設清單都失效時查詢。
app.get("/api/gemini/models", async (req, res) => {
  try {
    const key = resolveGeminiKey(req);
    if (!key) {
      missingKey(res);
      return;
    }
    const upstream = await fetch(`${GEMINI_REST}/models?pageSize=200`, { headers: { "x-goog-api-key": key } });
    const body: any = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      res.status(upstream.status).json({ error: String(body?.error?.message || "Failed to list models"), code: upstream.status, status: String(body?.error?.status || "") });
      return;
    }
    const models = (body?.models || []).map((m: any) => ({
      name: String(m?.name || "").replace(/^models\//, ""),
      displayName: m?.displayName,
      methods: Array.isArray(m?.supportedGenerationMethods) ? m.supportedGenerationMethods : [],
    }));
    res.json({ models });
  } catch (error: any) {
    const described = describeGeminiError(error);
    res.status(described.code === 500 ? 502 : described.code).json({ error: described.message, code: described.code, status: described.status });
  }
});

// Generic endpoint for streaming (useful for chat)
app.post("/api/gemini/generateContentStream", async (req, res) => {
  const key = resolveGeminiKey(req);
  if (!key) return missingKey(res);
  const { model, contents } = req.body || {};
  if (typeof model !== "string" || !VALID_MODEL.test(model)) return invalidModel(res);
  if (!validContents(contents)) return badRequest(res, "contents 格式錯誤");
  let config: Record<string, unknown> | undefined;
  try { config = sanitizeGenerateConfig(req.body?.config); } catch (e: any) { return badRequest(res, e.message); }
  try {
    const ai = getGeminiClient(key);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const responseStream = await ai.models.generateContentStream({
      model,
      contents,
      config,
    });

    for await (const chunk of responseStream) {
      if (chunk.text) {
         res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
      }
    }
    res.end();
  } catch (error: any) {
    const described = describeGeminiError(error);
    console.error("Gemini Stream Error:", described.code, described.status);
    res.write(`data: ${JSON.stringify({ error: described.message, code: described.code, status: described.status })}\n\n`);
    res.end();
  }
});

// 不存在的 API 路徑回 JSON 404，不要掉到網頁本體。
app.use("/api", (_req, res) => { res.status(404).json({ error: "Not found", code: 404 }); });

// 最後一道錯誤處理：不回傳堆疊、檔案路徑等內部資訊。
app.use("/api", (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const code = Number(err?.status || err?.statusCode) || 500;
  const message = err?.type === "entity.parse.failed" ? "Invalid JSON" : err?.type === "entity.too.large" ? "內容太大" : "Server error";
  if (code >= 500) console.error("API error:", err?.type || err?.name || "unknown");
  res.status(code >= 400 && code < 600 ? code : 500).json({ error: message, code });
});

// Export app for Netlify Serverless/Lambda (using serverless-http later)
export default app;

// If we are not running inside a Serverless environment, start Vite/Express natively
if (process.env.NETLIFY !== 'true' && process.env.LAMBDA_TASK_ROOT === undefined) {
  async function startServer() {
    // Vite middleware for development
    if (!IS_PRODUCTION) {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true, hmr: { port: Number(PORT) + 1 } },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('/{*path}', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    // 開發模式預設只聽本機，避免同網段的人連到開發伺服器；要給手機測試可設 HOST=0.0.0.0。
    const host = process.env.HOST || (IS_PRODUCTION ? "0.0.0.0" : "127.0.0.1");
    app.listen(Number(PORT), host, () => {
      console.log(`Server running on http://${host}:${PORT}`);
    });
  }

  startServer();
}
