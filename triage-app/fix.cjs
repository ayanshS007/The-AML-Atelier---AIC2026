const fs = require('fs');

const files = [
  'src/components/WaitingRoom.tsx',
  'src/components/PatientDetail.tsx',
  'src/components/Oversight.tsx',
  'src/components/Audit.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  // It literally says: style={{ height: \`\${val}px\` }}
  // We want: style={{ height: `${val}px` }}
  // So we replace \`\${ with `${ and }\` with }`
  content = content.replace(/\\`\\\${/g, '`${');
  content = content.replace(/}\\`/g, '}`');
  // Handle any \` that is just solitary
  content = content.replace(/\\`/g, '`');
  
  fs.writeFileSync(file, content);
});
console.log('Fixed files');
