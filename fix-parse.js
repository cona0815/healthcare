import fs from 'fs';
let content = fs.readFileSync('services/geminiService.ts', 'utf8');
content = content.replace(/JSON\.parse\(response\.text \|\| "\[\]"\)/g, 'JSON.parse(extractJson(response.text || "[]"))');
content = content.replace(/result\.text\(\)/g, 'result.text');
fs.writeFileSync('services/geminiService.ts', content);
