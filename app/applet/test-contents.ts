import { GoogleGenAI } from "@google/genai";

async function testGenAIFormat() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const res1 = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [{ text: "Hello part 1" }] } as any
    });
    console.log("res1 success:", !!res1.text);
  } catch (e: any) {
    console.error("res1 error:", e.message);
  }

  try {
    const res2 = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { text: "Hello" }
      ]
    });
    console.log("res2 success:", !!res2.text);
  } catch (e: any) {
    console.error("res2 error:", e.message);
  }
}
testGenAIFormat();
