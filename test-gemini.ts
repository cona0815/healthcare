import { GoogleGenAI } from "@google/genai";
async function run() {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: 'Say EXACTLY the json {"test": 123}',
  });
  console.log(JSON.stringify({...response, text: response.text}));
}
run();
