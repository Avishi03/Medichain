const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const ids = [
  "DEMO-BATCH-001",
  "DEMO-BATCH-002",
  "DEMO-BATCH-003",
  "DEMO-BATCH-004",
  "DEMO-BATCH-RECALLED"
];

const outDir = path.join(__dirname, "../frontend/public/qrs");

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function generate() {
  console.log("Generating QRs...");
  for (const id of ids) {
    const file = path.join(outDir, `${id}.png`);
    await QRCode.toFile(file, id, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
    console.log(`Generated: ${file}`);
  }
}

generate().catch(console.error);
