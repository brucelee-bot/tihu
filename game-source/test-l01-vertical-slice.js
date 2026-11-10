const fs = require('fs'); const vm = require('vm');
const html = fs.readFileSync(__dirname + '/l01-vertical-slice.html','utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
class Element {
  constructor(id){this.id=id;this.textContent='';this.classList={toggle(){},add(){},remove(){}};this.style={};this.listeners={};}
  addEventListener(name,fn){this.listeners[name]=fn;}
  setPointerCapture(){}
}
const elements={};
const ctx={
  createLinearGradient(){return {addColorStop(){}}}, fillRect(){}, fillText(){}, beginPath(){}, arc(){}, fill(){}, stroke(){}, strokeRect(){}, moveTo(){}, arcTo(){}, closePath(){}, save(){}, restore(){}, translate(){}, scale(){},
  setLineDash(){},
  set fillStyle(v){}, set strokeStyle(v){}, set shadowColor(v){}, set shadowBlur(v){}, set lineWidth(v){}, set font(v){}
};
const canvas=new Element('game'); canvas.getContext=()=>ctx;
for(const id of ['game','status','time','record','shadowState','gateState','tip','startOverlay','winOverlay','start','replay','restart','mute','touchRestart','left','right','jump']) elements[id]=id==='game'?canvas:new Element(id);
const document={getElementById(id){return elements[id]||new Element(id)}};
let now=0;
const windowListeners={};
const window={addEventListener(name,fn){windowListeners[name]=fn;},requestAnimationFrame(){},L01VerticalSlice:null};
const localStorage={setItem(){},getItem(){return null}};
const context={window,document,localStorage,performance:{now:()=>now},requestAnimationFrame(){},setTimeout(){},console,Math};
vm.createContext(context); vm.runInContext(script, context);
const game=context.window.L01VerticalSlice;
function assert(c,msg){if(!c) throw new Error(msg)}
game.start(); game.setInput({right:true}); for(let i=0;i<56;i++) game.tick(); game.setInput({}); for(let i=0;i<180;i++) game.tick();
let s=game.getState(); assert(s.shadowOnPlate, 'shadow did not reach plate'); assert(s.gateOpen>0.85, 'gate did not open');
game.setInput({right:true}); for(let i=0;i<150 && game.getState().state!=='won';i++) game.tick(); game.setInput({});
s=game.getState(); assert(s.state==='won', 'player did not reach exit');
console.log(JSON.stringify({state:s.state,frame:s.frame,playerX:s.player.x,gateOpen:s.gateOpen,shadowOnPlate:s.shadowOnPlate}));

// Exercise the registered DOM event handlers, not only the inspection hook.
function key(type, code) {
  let prevented = false;
  assert(typeof windowListeners[type] === 'function', type + ' listener missing');
  windowListeners[type]({code, preventDefault(){prevented = true;}});
  return prevented;
}
const keyboardCodes = ['ArrowLeft','ArrowRight','KeyA','KeyD','Space','ArrowUp','KeyW','Enter','KeyR'];
function resetForInputTest() {
  for (const code of keyboardCodes) key('keyup', code);
  game.setInput({});
  game.start();
  game.tick(); // Settle on the ground before movement or jump assertions.
}
function advance(frames) { for (let i = 0; i < frames; i++) game.tick(); }
let inputTests = 0;
for (const [code, direction] of [['ArrowRight',1],['KeyD',1],['ArrowLeft',-1],['KeyA',-1]]) {
  resetForInputTest();
  const before = game.getState().player.x;
  const prevented = key('keydown', code);
  advance(10);
  const held = game.getState().player.x;
  assert(Math.abs(held - before - direction * 39) < 1e-8, code + ' did not move the player');
  if (code.startsWith('Arrow')) assert(prevented, code + ' did not prevent page scrolling');
  key('keyup', code);
  advance(10);
  assert(game.getState().player.x === held, code + ' did not stop after keyup');
  inputTests++;
}
for (const code of ['Space','ArrowUp','KeyW']) {
  resetForInputTest();
  const groundY = game.getState().player.y;
  const prevented = key('keydown', code);
  game.tick();
  assert(game.getState().player.y < groundY, code + ' did not jump');
  if (code !== 'KeyW') assert(prevented, code + ' did not prevent page scrolling');
  key('keyup', code);
  advance(60);
  assert(game.getState().player.y === groundY, code + ' did not stay grounded after release');
  inputTests++;
}
// Physical aliases remain independent when one of two held keys is released.
resetForInputTest();
key('keydown','ArrowRight'); key('keydown','KeyD'); key('keyup','ArrowRight');
const aliasStart = game.getState().player.x;
advance(10);
assert(Math.abs(game.getState().player.x - aliasStart - 39) < 1e-8, 'Releasing ArrowRight incorrectly released held KeyD');
key('keyup','KeyD');
inputTests++;
resetForInputTest();
key('keydown','KeyA'); key('keydown','ArrowRight');
const opposedStart = game.getState().player.x;
advance(10);
assert(game.getState().player.x === opposedStart, 'Opposing directions did not cancel');
key('keyup','ArrowRight'); advance(10);
assert(Math.abs(game.getState().player.x - opposedStart + 39) < 1e-8, 'Held KeyA did not resume after releasing ArrowRight');
key('keyup','KeyA');
inputTests++;
for (const code of ['Enter','Space']) {
  resetForInputTest(); game.reset(true);
  key('keydown', code); key('keyup', code);
  assert(game.getState().state === 'playing', code + ' did not start the game');
  inputTests++;
}
resetForInputTest();
key('keydown','KeyD'); advance(10); key('keyup','KeyD');
key('keydown','KeyR'); key('keyup','KeyR');
assert(game.getState().frame === 0 && game.getState().player.x === 64, 'R did not restart the game');
inputTests++;
console.log(JSON.stringify({keyboardEventTests: inputTests, result: 'passed'}));
