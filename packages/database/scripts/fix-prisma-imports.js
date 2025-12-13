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
    // قراءة ملف .ts
    let content = fs.readFileSync(tsPath, 'utf8');
    
    // إزالة TypeScript-specific syntax
    // إزالة `import type *` واستبدالها بـ `import *`
    content = content.replace(/import type \*/g, 'import *');
    
    // إزالة `export type *` واستبدالها بـ `export *`
    content = content.replace(/export type \*/g, 'export *');
    
    // إزالة `type` من type-only imports
    content = content.replace(/import \{ type ([^}]+) \}/g, 'import { $1 }');
    
    // التأكد من وجود المجلد
    const dir = path.dirname(jsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(jsPath, content, 'utf8');
    console.log(`✓ Created ${fileInfo.js}`);
  }
}

// إنشاء جميع الملفات
filesToCreate.forEach(file => {
  createJsFile(file);
});

console.log('✓ Fixed Prisma imports');

