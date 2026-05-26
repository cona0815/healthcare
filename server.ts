import express from "express";
import path from "path";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

console.log("SERVER START - GEMINI_API_KEY:", process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 10) : 'missing');
console.log("SERVER START - API_KEY:", process.env.API_KEY ? process.env.API_KEY.substring(0, 10) : 'missing');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));

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
  res.json({
    clientKeyLength: clientKey.length,
    clientKeyPrefix: clientKey.substring(0, 5),
    serverKeyLength: serverKey.length,
    serverKeyPrefix: serverKey.substring(0, 5),
    rawGenKey: process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 10) : 'none',
    rawApiKey: process.env.API_KEY ? process.env.API_KEY.substring(0, 10) : 'none'
  });
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
    console.error("Gemini Error:", error);
    res.status(500).json({ error: error.message });
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
    console.error("Gemini Stream Error:", error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
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
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    app.listen(PORT, () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  }

  startServer();
}
