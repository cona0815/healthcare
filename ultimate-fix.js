import * as fs from 'fs';

const filePath = 'components/Dashboard.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// standard line ends
content = content.replace(/\r\n/g, '\n');
let lines = content.split('\n');

// Let's find exactly the line patterns and remove the duplicates by detecting them
// 1. Clean Main Hero Card duplicate
for (let i = 0; i < lines.length; i++) {
   if (lines[i].includes('{/* MAIN HERO CARD (KNOWKNOW.APP ESTHETIC) */}')) {
      // The i+6 should be closing of motion.div opening
      if (lines[i+6].trim() === '>') {
         // This means lines i+7 to i+11 are the duplicate properties!
         // Let's verify: i+7 should have className, i+8 should have onClick, i+9 should have >
         if (lines[i+7].includes('className="bg-[#FCFAF7]') && lines[i+8].includes('onClick') && lines[i+9].trim() === '>') {
            lines.splice(i+7, 3);
            console.log('Removed Main Hero Card duplicates!');
         }
      } else if (lines[i+6].trim() === '>') {
         
      }
   }
}

// Re-evaluate array
content = lines.join('\n');
lines = content.split('\n');

// Let's do a reliable cleanup on Medication checklist duplicates:
for (let i = 0; i < lines.length; i++) {
   if (lines[i].includes('{/* Medication Checklist Card */}')) {
      // lines[i+1] is: <div className="bg-white p-6 rounded-3xl shadow-sm border border-emerald-100 relative overflow-hidden mb-6 hover:shadow-md hover:scale-[1.005] duration-300 transition-all">
      // lines[i+2] to i+4 are: whileHover, className, >
      if (lines[i+2].includes('whileHover') && lines[i+3].includes('className="bg-white') && lines[i+4].trim() === '>') {
         lines.splice(i+2, 3);
         console.log('Removed Medication Card duplicate!');
      }
   }
}

content = lines.join('\n');
lines = content.split('\n');

// Clean Achievements Card duplicates:
for (let i = 0; i < lines.length; i++) {
   if (lines[i].includes('{/* Achievements Card */}')) {
      if (lines[i+2].includes('whileHover') && lines[i+3].includes('className="bg-white') && lines[i+4].trim() === '>') {
         lines.splice(i+2, 3);
         console.log('Removed Achievements Card duplicate!');
      }
   }
}

content = lines.join('\n');
lines = content.split('\n');

// Clean Workout Card duplicates:
for (let i = 0; i < lines.length; i++) {
   if (lines[i].includes('{/* Workout Card */}')) {
      // lines[i+1] is: <div
      // lines[i+2] is: className={`p-6 ...`}
      // lines[i+3] is: onClick={() => onNavigate('WORKOUT')}
      // lines[i+4] is: >
      // We expect lines[i+5] to i+9 to contain duplicate: className, onClick, >
      if (lines[i+5].includes('className={`p-6') && lines[i+8].trim() === '>') {
         lines.splice(i+5, 5);
         console.log('Removed Workout Card duplicate!');
      }
   }
}

content = lines.join('\n');
lines = content.split('\n');

// Clean Appointment Card duplicates:
for (let i = 0; i < lines.length; i++) {
   if (lines[i].includes('{/* Appointment Card */}')) {
      // lines[i+1] is <div
      // lines[i+2] is className
      // lines[i+3] is onClick
      // lines[i+4] is >
      // lines[i+5] to i+9 are duplicates
      if (lines[i+5].includes('className={`bg-white') && lines[i+9].trim() === '>') {
         lines.splice(i+5, 5);
         console.log('Removed Appointment Card duplicate!');
      }
   }
}

// Clean the Achievements card extra closing tag (there may still be <div className="space-y-6"> issues)
content = lines.join('\n');
lines = content.split('\n');

fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log('Ultimate Fix Run Complete!');
