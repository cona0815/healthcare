// Gemini 代理的輸入把關（server.ts 與測試共用）。
// 只轉送前端真的會用到的生成設定。絕對不能把整包 config 交給 SDK：
// config.httpOptions 可以改掉請求的目的地與標頭，等於讓任何人把伺服器當跳板（SSRF）。
const ALLOWED_CONFIG_KEYS = new Set(["systemInstruction", "temperature", "topP", "topK", "maxOutputTokens", "responseMimeType", "responseSchema", "responseJsonSchema", "thinkingConfig", "toolConfig", "stopSequences", "candidateCount", "seed"]);
const ALLOWED_TOOLS = new Set(["googleSearch", "googleMaps"]);
const isPlainObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;
export const sanitizeGenerateConfig = (config: unknown): Record<string, unknown> | undefined => {
  if (config === undefined || config === null) return undefined;
  if (!isPlainObject(config)) throw new Error("config 格式錯誤");
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(config)) {
    if (ALLOWED_CONFIG_KEYS.has(key)) clean[key] = value;
  }
  if (config.tools !== undefined) {
    if (!Array.isArray(config.tools)) throw new Error("tools 格式錯誤");
    const tools = config.tools.filter(t => isPlainObject(t) && Object.keys(t).length === 1 && ALLOWED_TOOLS.has(Object.keys(t)[0])).map(t => ({ [Object.keys(t)[0]]: {} }));
    if (tools.length) clean.tools = tools;
  }
  return clean;
};
export const validContents = (contents: unknown) => typeof contents === "string" ? contents.length > 0 : Array.isArray(contents) || isPlainObject(contents);
// 只回傳 Google 錯誤 JSON 裡的說明文字（截短），不把底層連線錯誤原文送回前端。
export const publicErrorMessage = (message: string, code: number) => {
  const jsonStart = message.indexOf("{");
  if (jsonStart >= 0) {
    try {
      const text = JSON.parse(message.slice(jsonStart))?.error?.message;
      if (typeof text === "string" && text) return text.slice(0, 1000);
    } catch {}
  }
  if (/API key not valid/i.test(message)) return "API key not valid. Please pass a valid API key.";
  return code === 429 ? "Quota exceeded" : code === 404 ? "Model not found" : code === 401 || code === 403 ? "Permission denied" : code >= 500 ? "Gemini service error" : "Gemini request failed";
};
