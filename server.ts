import express from "express";
import path from "path";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();


const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));

const GEMINI_REST = "https://generativelanguage.googleapis.com/v1beta";

const resolveGeminiKey = (req: express.Request): string | null => {
  const clientKey = req.headers['authorization']?.replace('Bearer ', '');
  if (clientKey && clientKey.length > 5 && clientKey !== "null") return clientKey;
  return process.env.GEMINI_API_KEY || process.env.API_KEY || null;
};

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
  return { code, status, message };
};

const getGeminiClient = (req: express.Request) => {
  const httpOptions = { headers: { 'User-Agent': 'aistudio-build' } };
  
  // Prefer client-provided key first (since the app has a Settings input for it)
  const clientKey = req.headers['authorization']?.replace('Bearer ', '');
  if (clientKey && clientKey.length > 5 && clientKey !== "null") {
     return new GoogleGenAI({ apiKey: clientKey });
  }

  // Option to use the server's environment variable (Secure)
  const serverKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  console.log("SERVER KEY USED length:", serverKey ? serverKey.length : 0);
  if (serverKey) {
    return new GoogleGenAI({ apiKey: serverKey });
  }
  
  throw new Error("Missing Gemini API Key in server environment");
};

app.get("/api/debug", (req, res) => {
  const clientKey = req.headers['authorization']?.replace('Bearer ', '') || '';
  const serverKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
  res.json({ hasClientKey: Boolean(clientKey), hasServerKey: Boolean(serverKey) });
});

// Generic endpoint for generateContent
app.post("/api/gemini/generateContent", async (req, res) => {
  try {
    const ai = getGeminiClient(req);
    const { model, contents, config } = req.body;
    
    // We expect the frontend to send the exact payload format GoogleGenAI wants
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
      res.status(401).json({ error: "Missing Gemini API Key", code: 401, status: "UNAUTHENTICATED" });
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
  try {
    const ai = getGeminiClient(req);
    const { model, contents, config } = req.body;
    
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

// Export app for Netlify Serverless/Lambda (using serverless-http later)
export default app;

// If we are not running inside a Serverless environment, start Vite/Express natively
if (process.env.NETLIFY !== 'true' && process.env.LAMBDA_TASK_ROOT === undefined) {
  async function startServer() {
    // Vite middleware for development
    if (process.env.NODE_ENV !== "production") {
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

    app.listen(PORT, () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  }

  startServer();
}
