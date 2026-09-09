const fs = require('fs');
const path = require('path');

const clientDir = path.join(__dirname, '../prisma/client');

const filesToCreate = [
  { ts: 'enums.ts', js: 'enums.js' },
  { ts: 'internal/class.ts', js: 'internal/class.js' },
  { ts: 'internal/prismaNamespace.ts', js: 'internal/prismaNamespace.js' },
];

function createJsFile(fileInfo) {
  const tsPath = path.join(clientDir, fileInfo.ts);
  const jsPath = path.join(clientDir, fileInfo.js);
  
  if (fs.existsSync(tsPath)) {
    let content = fs.readFileSync(tsPath, 'utf8');
    
    content = content.replace(/import type \*/g, 'import *');
    
    content = content.replace(/export type \*/g, 'export *');
    
    content = content.replace(/import \{ type ([^}]+) \}/g, 'import { $1 }');
    
    const dir = path.dirname(jsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(jsPath, content, 'utf8');
    console.log(`✓ Created ${fileInfo.js}`);
  }
}

filesToCreate.forEach(file => {
  createJsFile(file);
});

console.log('✓ Fixed Prisma imports');
