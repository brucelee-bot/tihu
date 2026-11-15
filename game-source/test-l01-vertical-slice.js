const fs = require('fs'); const vm = require('vm');
const html = fs.readFileSync(__dirname + '/l01-vertical-slice.html','utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
class Element {
  constructor(id){
    this.id=id; this.textContent=''; this.style={}; this.listeners={};
    const classes = new Set();
    this.classList={
      toggle(name, force){const on=force === undefined ? !classes.has(name) : force; if(on) classes.add(name); else classes.delete(name); return on;},
      add(name){classes.add(name);}, remove(name){classes.delete(name);}, contains(name){return classes.has(name);}
    };
  }
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
const documentListeners={};
const document={hidden:false,addEventListener(name,fn){documentListeners[name]=fn;},getElementById(id){return elements[id]||new Element(id)}};
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

// Lost keyup and pointerup events must not leave movement or jump held.
function interruptInput(type) {
  if (type === 'blur') windowListeners.blur?.();
  else { document.hidden = true; documentListeners.visibilitychange?.(); }
}
function resumeInput() {
  document.hidden = false;
  documentListeners.visibilitychange?.();
  windowListeners.focus?.();
}
function pointer(id, type, pointerId = 1) {
  elements[id].listeners[type]({pointerId,preventDefault(){}});
}
function assertReleased(id, x, groundY, label) {
  if (id === 'jump') {
    advance(60);
    assert(game.getState().player.y === groundY, label + ' caused a repeated jump');
  } else {
    advance(10);
    assert(game.getState().player.x === x, label + ' left movement held');
  }
}
let interruptionTests = 0;
for (const type of ['blur','hidden']) {
  for (const code of ['ArrowRight','KeyD','ArrowLeft','KeyA']) {
    resetForInputTest(); key('keydown',code); game.tick();
    const stoppedX = game.getState().player.x;
    interruptInput(type); resumeInput(); advance(10);
    assert(game.getState().player.x === stoppedX, type + ' left ' + code + ' held without keyup');
    key('keydown',code); game.tick();
    assert(game.getState().player.x !== stoppedX, code + ' did not work after ' + type);
    key('keyup',code); interruptionTests++;
  }
  for (const code of ['Space','ArrowUp','KeyW']) {
    resetForInputTest(); const groundY = game.getState().player.y;
    key('keydown',code); game.tick();
    assert(game.getState().player.y < groundY, code + ' did not begin its jump');
    interruptInput(type); resumeInput(); advance(60);
    assert(game.getState().player.y === groundY, type + ' left ' + code + ' auto-jumping without keyup');
    key('keydown',code); game.tick();
    assert(game.getState().player.y < groundY, code + ' did not jump after ' + type);
    key('keyup',code); interruptionTests++;
  }
  for (const id of ['left','right','jump']) {
    resetForInputTest(); const groundY = game.getState().player.y;
    pointer(id,'pointerdown'); game.tick();
    const stoppedX = game.getState().player.x;
    assert(elements[id].classList.contains('on'), id + ' did not highlight while held');
    interruptInput(type); resumeInput();
    assert(!elements[id].classList.contains('on'), type + ' left ' + id + ' highlighted');
    assertReleased(id, stoppedX, groundY, type + ' on touch ' + id);
    pointer(id,'pointerdown',2); game.tick();
    assert(id === 'jump' ? game.getState().player.y < groundY : game.getState().player.x !== stoppedX, id + ' did not respond after ' + type);
    pointer(id,'pointerup',2);
    assert(!elements[id].classList.contains('on'), 'Stale pointer 1 kept ' + id + ' held after ' + type);
    interruptionTests++;
  }
  // Late cancellation of one old contact cannot resurrect another old contact.
  resetForInputTest();
  pointer('right','pointerdown',11); pointer('right','pointerdown',12); game.tick();
  const stoppedX = game.getState().player.x;
  interruptInput(type); resumeInput(); pointer('right','pointercancel',11);
  advance(10);
  assert(game.getState().player.x === stoppedX && !elements.right.classList.contains('on'), type + ' did not clear the full active pointer set');
  pointer('right','pointerup',12); interruptionTests++;
}
// A visible-page event alone must not cancel a legitimate held key.
resetForInputTest(); key('keydown','KeyD');
const visibleStart = game.getState().player.x;
resumeInput(); advance(10);
assert(Math.abs(game.getState().player.x-visibleStart-39) < 1e-8, 'Visible-page event cleared active input');
key('keyup','KeyD'); interruptionTests++;
// Existing pointer termination paths retain multi-touch semantics.
for (const end of ['pointerup','pointercancel','lostpointercapture']) {
  for (const id of ['left','right','jump']) {
    resetForInputTest(); const groundY = game.getState().player.y;
    pointer(id,'pointerdown'); game.tick(); const stoppedX = game.getState().player.x;
    pointer(id,end);
    assert(!elements[id].classList.contains('on'), end + ' left ' + id + ' highlighted');
    assertReleased(id, stoppedX, groundY, end + ' on ' + id);
    interruptionTests++;
  }
  resetForInputTest(); pointer('right','pointerdown',21); pointer('right','pointerdown',22);
  pointer('right',end,21); const oneContactX=game.getState().player.x; advance(10);
  assert(Math.abs(game.getState().player.x-oneContactX-39) < 1e-8, end + ' cleared another active contact');
  pointer('right',end,22); const noContactsX=game.getState().player.x; advance(10);
  assert(game.getState().player.x===noContactsX && !elements.right.classList.contains('on'), end + ' left the last contact held');
  interruptionTests++;
}
console.log(JSON.stringify({interruptionAndPointerTests:interruptionTests,result:'passed'}));
