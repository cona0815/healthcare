import { GoogleGenAI } from "@google/genai";
const ai = new GoogleGenAI({});

async function test() {
  try {
     const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: "say hi"
     });
     console.log(response.text);
  } catch(e) {
     console.error("ERROR", e);
  }
}
test();
