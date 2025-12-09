const fs = require('fs');
const path = require('path');

const clientDir = path.join(__dirname, '../prisma/client');

// قائمة الملفات التي تحتاج إلى إنشاء .js
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
    
    // إزالة type annotations من const/let/var declarations
    // مثل: const config: Type = {...} -> const config = {...}
    content = content.replace(/(const|let|var)\s+(\w+)\s*:\s*[^=]+=/g, '$1 $2 =');
    
    // إزالة type assertions (as Type)
    // مثل: value as Type -> value
    // نتعامل مع حالات معقدة مثل: value as (new (secret: never) => typeof ...)
    // نزيل as مع كل ما بعده حتى نصل إلى فاصلة أو قوس إغلاق
    // نستخدم lookahead للتأكد من أننا نزيل فقط حتى الفاصلة أو القوس
    content = content.replace(/\s+as\s+\([^)]*\)(?=[,\s;\)\]}])/g, '');
    // إزالة as Type بسيط (لكن نتجنب as const)
    content = content.replace(/\s+as\s+(?!const\b)[A-Z][a-zA-Z0-9_<>[\]]*(?=[,\s;\)\]}])/g, '');
    // إزالة typeof type assertions
    content = content.replace(/\s+as\s+typeof\s+[a-zA-Z0-9_.]+(?=[,\s;\)\]}])/g, '');
    
    // إزالة arrow function type annotations المتبقية بعد إزالة as
    // مثل: value => typeof ... -> value
    content = content.replace(/\s*=>\s*typeof\s+[a-zA-Z0-9_.]+\)/g, '');
    
    // إزالة الأقواس الإضافية المتبقية بعد إزالة type assertions
    // مثل: value) -> value
    content = content.replace(/([a-zA-Z0-9_.]+)\)(?=[,\s;\)\]}])/g, '$1');
    
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

