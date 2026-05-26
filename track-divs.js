import * as fs from 'fs';

const filePath = 'components/Dashboard.tsx';
const content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
const lines = content.split('\n');

const returnIndex = lines.findIndex(l => l.includes('return ('));
let stack = [];

console.log("--- TRACING DIV TAGS ---");
for (let i = returnIndex; i < lines.length; i++) {
   const line = lines[i];
   if (line.trim().startsWith('//') || line.trim().startsWith('{/*')) continue;
   
   // Check for <div opening
   const openMatches = line.match(/<div(?:\s+[^>]*?)?>/g) || [];
   // Check for </div> closing
   const closeMatches = line.match(/<\/div>/g) || [];
   
   // Self-closing divs are rare, let's ignore or check.
   for (const match of openMatches) {
      if (!match.endsWith('/>')) {
         stack.push({ line: i+1, content: line.trim() });
      }
   }
   
   for (const match of closeMatches) {
      if (stack.length > 0) {
         stack.pop();
      } else {
         console.log(`EXTRA CLOSE DIV AT LINE ${i+1}: "${line.trim()}"`);
      }
   }
}

console.log("\n--- UNCLOSED DIVS ---");
stack.forEach(d => {
   console.log(`Line ${d.line}: "${d.content}"`);
});
