const fs = require('fs');
const path = require('path');

function getKeys(obj, prefix = '') {
    return Object.keys(obj).reduce((res, el) => {
        if (typeof obj[el] === 'object' && obj[el] !== null && !Array.isArray(obj[el])) {
            return [...res, ...getKeys(obj[el], prefix + el + '.')];
        }
        return [...res, prefix + el];
    }, []);
}

const enPath = path.join(__dirname, 'apps/www/messages/en.json');
const arPath = path.join(__dirname, 'apps/www/messages/ar.json');

const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const ar = JSON.parse(fs.readFileSync(arPath, 'utf8'));

const enKeys = new Set(getKeys(en));
const arKeys = new Set(getKeys(ar));

let missingInAr = [];
enKeys.forEach(k => {
    if (!arKeys.has(k)) missingInAr.push(k);
});

let missingInEn = [];
arKeys.forEach(k => {
    if (!enKeys.has(k)) missingInEn.push(k);
});

console.log('--- MISSING IN AR ---');
console.log(missingInAr.join('\n'));
console.log('\n--- MISSING IN EN ---');
console.log(missingInEn.join('\n'));
