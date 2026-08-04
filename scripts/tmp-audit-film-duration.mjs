const MODULE_LOCK_MS = 640;
const AUTO_BREATH_MS = 240;
const AUTO_PLAN_BREATH_MS = 180;
const HOLD_MS = 220;
const INTRO_MS = 6000;
const readMs = (copyLen) => Math.round(Math.min(1100, Math.max(750, 520 + copyLen * 8)));
const modulePreMs = (enterMs, copyLen) => MODULE_LOCK_MS + enterMs + readMs(copyLen);
const DEMO_MS = {
  mumPlans: [4000, 1200, 1800, 900, 3600, 5200],
  clients: 3600,
  chantiers: 5000,
  planning: 3800,
  finance: 6000,
  pilotage: 2800,
};
const SIG = 1000 + 1100 + 1500 + 1700 + 500 + 1100 + 500 + 400;
function buildTotal() {
  let t = INTRO_MS + modulePreMs(680, 56);
  DEMO_MS.mumPlans.forEach((dur, plan) => {
    t += dur + HOLD_MS + (plan < DEMO_MS.mumPlans.length - 1 ? AUTO_PLAN_BREATH_MS : AUTO_BREATH_MS);
  });
  t += 750 + AUTO_BREATH_MS;
  for (const [e,d,r,c] of [[680, DEMO_MS.clients, 750, 62],[680, DEMO_MS.chantiers, 750, 58],[680, DEMO_MS.planning, 750, 62],[680, DEMO_MS.finance, 750, 58],[640, DEMO_MS.pilotage, 700, 62]]) {
    t += modulePreMs(e,c) + d + HOLD_MS + AUTO_BREATH_MS + r + AUTO_BREATH_MS;
  }
  t += 900 + AUTO_BREATH_MS + SIG + 300;
  return t;
}
function fmt(ms){const s=Math.max(0,Math.floor(ms/1000));return `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;}
const TOTAL=buildTotal();
const mod=(e,d,r,c)=>modulePreMs(e,c)+d+HOLD_MS+AUTO_BREATH_MS+r+AUTO_BREATH_MS;
let mum=modulePreMs(680,56);
DEMO_MS.mumPlans.forEach((dur,plan)=>{mum+=dur+HOLD_MS+(plan<DEMO_MS.mumPlans.length-1?AUTO_PLAN_BREATH_MS:AUTO_BREATH_MS);});
mum+=750+AUTO_BREATH_MS;
console.log(JSON.stringify({
  Introduction: INTRO_MS,
  "MUM IA": mum,
  Clients: mod(680, DEMO_MS.clients, 750, 62),
  Planning: mod(680, DEMO_MS.planning, 750, 62),
  Chantiers: mod(680, DEMO_MS.chantiers, 750, 58),
  Facturation: mod(680, DEMO_MS.finance, 750, 58),
  Pilotage: mod(640, DEMO_MS.pilotage, 700, 62),
  Conclusion: 900+AUTO_BREATH_MS+SIG+300,
  total: TOTAL,
  label: fmt(TOTAL),
}, null, 2));
if (TOTAL < 45000 || TOTAL > 80000) { console.error("DURATION_AUDIT_FAIL"); process.exit(1); }
console.log("DURATION_AUDIT_PASS");
