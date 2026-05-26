import * as fs from 'fs';

const filePath = 'components/Dashboard.tsx';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/\r\n/g, '\n');
const lines = content.split('\n');

// Line 656 (which is index 655 zero-indexed) is:             </div>
// Line 663 (which is index 662 zero-indexed) is:             </motion.div>
// Let's verify line index 662 is index 662 or near:

for (let i = 640; i < 680; i++) {
  if (lines[i] && lines[i].includes('</motion.div>')) {
     lines[i] = lines[i].replace('</motion.div>', '</div>');
     console.log(`Replaced medication card closing tag to standard div at line ${i+1}!`);
  }
}

fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log('Balance patch written!');
