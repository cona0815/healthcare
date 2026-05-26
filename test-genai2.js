import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

const serverKey = process.env.API_KEY || process.env.GEMINI_API_KEY;

const aiDefault = new GoogleGenAI({});
const aiExplicit = new GoogleGenAI({ apiKey: serverKey });

async function test() {
  try {
     console.log("Testing aiDefault:");
     const response1 = await aiDefault.models.generateContent({
        model: "gemini-2.5-flash",
        contents: "say hi"
     });
     console.log(response1.text);
  } catch(e) {
     console.error("aiDefault Error:", e);
  }
  
  try {
     console.log("Testing aiExplicit:");
     const response2 = await aiExplicit.models.generateContent({
        model: "gemini-2.5-flash",
        contents: "say hi"
     });
     console.log(response2.text);
  } catch(e) {
     console.error("aiExplicit Error:", e);
  }
}
test();
