import * as fs from 'fs';

const filePath = 'components/Dashboard.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// replace all instances of </motion.div> that might be mismatched
// Wait, the only motion.div we want to keep are:
// - the outer container close </motion.div> (Wait, the outer was changed back to standard </div> so we don't need any </motion.div> at the bottom!)
// Wait! Let's check: are there ANY other motion.div tags left?
// Only the Hero Card: <motion.div> and </motion.div>.
// That's it!
// So any other </motion.div> should be changed to </div>!
// Let's replace any </motion.div> around index 650 to 670 with </div>:

content = content.replace(/\r\n/g, '\n');
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
   if (lines[i].includes('</motion.div>') && !lines[i].includes('MAIN HERO CARD')) {
      // Is it near lines 610-670?
      if (i > 608 && i < 670) {
         lines[i] = lines[i].replace('</motion.div>', '</div>');
         console.log(`Replaced </motion.div> mismatch at line ${i+1}`);
      }
   }
}

fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log('Inspect and Balance Complete!');
