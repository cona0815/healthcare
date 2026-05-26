import * as fs from 'fs';

let content = fs.readFileSync('components/Dashboard.tsx', 'utf8').replace(/\r\n/g, '\n');

// 1. Remove "Quick Add Workout Section"
const quickAddStart = content.indexOf('{/* Quick Add Workout Section */}');
const workoutGridStart = content.indexOf('<div className="grid grid-cols-1 md:grid-cols-2 gap-6">');

if (quickAddStart !== -1 && workoutGridStart !== -1) {
  content = content.slice(0, quickAddStart) + content.slice(workoutGridStart);
  console.log("Removed Quick Add Workout");
}

fs.writeFileSync('components/Dashboard.tsx', content);
