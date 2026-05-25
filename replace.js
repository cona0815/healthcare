import fs from 'fs';

let code = fs.readFileSync('services/geminiService.ts', 'utf8');

// Regex to match getAI().models.generateContent calls
const regex = /await getAI\(\)\.models\.generateContent\(\{\s*model:\s*['"]([^'"]+)['"],\s*contents:\s*([\s\S]*?)(?:,\s*config:\s*(\{[\s\S]*?\}))?\s*\}\)/g;

code = code.replace(regex, (match, model, contents, config) => {
    // contents might end in \n or spaces.
    let newCall = `await callGenerativeAI('${model}', ${contents.trim()}`;
    if (config) {
        newCall += `, ${config.trim()}`;
    }
    newCall += `)`;
    return newCall;
});

// Also replace the leftover raw getAI() in analyzeHealthTrends etc.
const regex2 = /const ai = getAI\(\);\n\s*const response = await ai\.models\.generateContent\(\{\s*model:\s*['"]([^'"]+)['"],\s*contents:\s*([^\n]+),\s*config:\s*(\{[\s\S]*?\})\s*\}\);/g;
code = code.replace(regex2, (match, model, contents, config) => {
    return `const response = await callGenerativeAI('${model}', ${contents.trim()}, ${config.trim()});`;
});

fs.writeFileSync('services/geminiService.ts', code);
console.log("Done");
