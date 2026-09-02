import { chromium } from 'playwright-core';
import fs from 'fs';
const EXEC='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PROTO='file:///home/user/life-dashboard/design_handoff_pulse_redesign/Dashboard%20Mobile.dc.html';
const BASE='http://localhost:3000';
const OUT='/tmp/shots';
fs.mkdirSync(OUT,{recursive:true});
const [id, path] = process.argv.slice(2); // e.g. 3a today
const b=await chromium.launch({executablePath:EXEC});

// 1) prototype dark frame
const pp=await b.newPage({viewport:{width:1500,height:2200}});
await pp.route('**/support.js',r=>r.abort());
await pp.goto(PROTO,{waitUntil:'domcontentloaded',timeout:60000});
await pp.waitForTimeout(700);
const frame=await pp.$(`[id="${id}"] div[style*="width:390px"]`);
if(!frame){console.log('NO FRAME',id);process.exit(1);}
await frame.screenshot({path:`${OUT}/_p.png`});
const pbox=await frame.boundingBox();
await pp.close();

// 2) app page
const ctx=await b.newContext({viewport:{width:390,height:900},colorScheme:'dark',storageState:'/tmp/storage.json'});
const ap=await ctx.newPage();
await ap.goto(BASE+'/'+path,{waitUntil:'networkidle',timeout:60000});
await ap.waitForTimeout(1800);
// hide the backup banner + FAB so we compare the page itself
await ap.screenshot({path:`${OUT}/_a.png`,fullPage:true});
const abox=await ap.evaluate(()=>({w:document.documentElement.scrollWidth,h:document.body.scrollHeight}));
await ctx.close();

// 3) composite side by side
const H=Math.max(pbox.height, abox.h);
const html=`<body style="margin:0;background:#111;display:flex;gap:24px;padding:24px;font:12px sans-serif;color:#fff">
<div><div style="margin-bottom:6px">CLAUDE DESIGN (${id})</div><img src="file://${OUT}/_p.png" style="width:390px;display:block"></div>
<div><div style="margin-bottom:6px">MY APP (/${path})</div><img src="file://${OUT}/_a.png" style="width:390px;display:block"></div>
</body>`;
fs.writeFileSync('/tmp/shots/_cmp.html',html);
const cp=await b.newPage({viewport:{width:880,height:Math.min(H+80,20000)}});
await cp.goto('file:///tmp/shots/_cmp.html',{waitUntil:'load'});
await cp.waitForTimeout(600);
await cp.screenshot({path:`${OUT}/cmp-${id}.png`,fullPage:true});
console.log('composed',`${OUT}/cmp-${id}.png`,'protoH',Math.round(pbox.height),'appH',abox.h);
await b.close();
