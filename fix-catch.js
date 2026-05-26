import fs from 'fs';
let content = fs.readFileSync('services/geminiService.ts', 'utf8');
content = content.replace(/\} catch \(error\) \{ return \[\]; \}/g, `} catch (error: any) {
    if (error.message && error.message.includes("API key not valid")) {
      throw new Error("無效的 Gemini API Key，請至系統設定檢查。");
    }
    throw error;
  }`);
fs.writeFileSync('services/geminiService.ts', content);
