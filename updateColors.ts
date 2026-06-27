import * as fs from 'fs';
import * as path from 'path';

function walk(dir: string, callback: (file: string) => void) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(dirPath);
  });
}

walk('./src', (file) => {
  if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.css')) {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;
    
    // Replace indigo with emerald
    content = content.replace(/indigo/g, 'emerald');
    
    // Replace rose with red in general, we can fix specific instances later
    content = content.replace(/rose/g, 'red');

    if (content !== original) {
      fs.writeFileSync(file, content, 'utf8');
      console.log(`Updated ${file}`);
    }
  }
});
