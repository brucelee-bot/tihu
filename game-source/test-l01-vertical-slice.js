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
const window={addEventListener(){},requestAnimationFrame(){},L01VerticalSlice:null};
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
