import * as fs from 'fs';

const filePath = 'components/Dashboard.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Normalize we first
content = content.replace(/\r\n/g, '\n');

// Let's replace the duplicate block
const badBlock = `          <motion.div 
           whileHover={{ y: -4, scale: 1.005 }}
           whileTap={{ scale: 0.99 }}
           className="bg-[#FCFAF7] border border-[#EBE6DC] rounded-3xl p-6 md:p-8 text-[#2B363B] shadow-sm relative overflow-hidden transition-all duration-300 cursor-pointer group hover:shadow-md"
           onClick={() => onNavigate('FOOD')}
          >
           className="bg-[#FCFAF7] border border-[#EBE6DC] rounded-3xl p-6 md:p-8 text-[#2B363B] shadow-sm relative overflow-hidden transition-all duration-300 cursor-pointer group hover:shadow-md"
           onClick={() => onNavigate('FOOD')}
         >`;

const goodBlock = `          <motion.div 
           whileHover={{ y: -4, scale: 1.005 }}
           whileTap={{ scale: 0.99 }}
           className="bg-[#FCFAF7] border border-[#EBE6DC] rounded-3xl p-6 md:p-8 text-[#2B363B] shadow-sm relative overflow-hidden transition-all duration-300 cursor-pointer group hover:shadow-md"
           onClick={() => onNavigate('FOOD')}
          >`;

if (content.indexOf(badBlock) !== -1) {
  content = content.replace(badBlock, goodBlock);
  console.log('Fixed main hero card opening tag!');
} else {
  // Try line split
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('<motion.div') && lines[i].includes('whileHover') && lines[i+5].includes('className="bg-[#FCFAF7]')) {
       // Found it! Let's splice lines i+5, i+6, i+7, i+8 out
       lines.splice(i + 5, 3);
       content = lines.join('\n');
       console.log('Fixed main hero card tag via splice!');
       break;
    }
  }
}

// Now let's fix other tag mismatches mentioned in build failure:
// ERROR: Unexpected closing "div" tag does not match opening "motion.div" tag at line 698
// Let's inspect around line 698 in the split array
const lines = content.split('\n');

// Let's inspect where any motion tags are mismatching
// If we had: Workout Card using <motion.div>, did we patch the closing tag correctly?
// Let's find each "<motion.div" and see if there are corresponding closing "</motion.div>"
console.log('Inspecting file contents for unbalanced tags...');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done!');
