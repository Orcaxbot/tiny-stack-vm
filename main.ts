// Tiny stack VM: a faithful interpreter of the ISA in the kit.
// Each step checks traps first (step limit, pc bounds, unknown opcode,
// truncated immediate), then stack needs, then the instruction's own
// traps. Memory is an Int32Array of 256 words; every trap exits with
// its exact code from the ISA table, keeping output written so far.
import{mkdirSync,readdirSync,readFileSync,writeFileSync}from'node:fs';
import{join}from'node:path';
function run(p,inp){
const S=[],C=[],M=new Int32Array(256),out=[];
let pc=0,ip=0,steps=0;
const trap=c=>({out,code:c});
for(;;){
if(steps>=1e6)return trap(10);
if(pc<0||pc>=p.length)return trap(9);
const op=p[pc];
steps++;
switch(op){
case 0:return{out,code:0};
case 1:
if(pc+2>p.length)return trap(9);
if(S.length>=256)return trap(3);
S.push((p[pc+1]<<24)>>24);pc+=2;break;
case 2:
if(pc+5>p.length)return trap(9);
if(S.length>=256)return trap(3);
S.push(p[pc+1]|p[pc+2]<<8|p[pc+3]<<16|p[pc+4]<<24);pc+=5;break;
case 3:
if(!S.length)return trap(2);
S.pop();pc++;break;
case 4:
if(!S.length)return trap(2);
if(S.length>=256)return trap(3);
S.push(S[S.length-1]);pc++;break;
case 5:{
if(S.length<2)return trap(2);
const b=S.pop(),a=S.pop();S.push(b,a);pc++;break;}
case 6:
if(S.length<2)return trap(2);
if(S.length>=256)return trap(3);
S.push(S[S.length-2]);pc++;break;
case 7:{
if(S.length<3)return trap(2);
const c=S.pop(),b=S.pop(),a=S.pop();S.push(b,c,a);pc++;break;}
case 0x10:case 0x11:case 0x12:case 0x13:case 0x14:case 0x15:case 0x16:
case 0x18:case 0x19:case 0x1a:case 0x1c:case 0x1d:case 0x1e:
case 0x20:case 0x21:case 0x22:{
if(S.length<2)return trap(2);
const b=S.pop(),a=S.pop();let r;
if(op===0x10)r=a+b;
else if(op===0x11)r=a-b;
else if(op===0x12)r=Math.imul(a,b);
else if(op===0x13){if(!b)return trap(4);r=Math.trunc(a/b);}
else if(op===0x14){if(!b)return trap(4);r=a%b;}
else if(op===0x15){if(!b)return trap(4);r=Math.trunc((a>>>0)/(b>>>0));}
else if(op===0x16){if(!b)return trap(4);r=(a>>>0)%(b>>>0);}
else if(op===0x18)r=a&b;
else if(op===0x19)r=a|b;
else if(op===0x1a)r=a^b;
else if(op===0x1c)r=a<<b;
else if(op===0x1d)r=a>>b;
else if(op===0x1e)r=a>>>b;
else if(op===0x20)r=a===b?1:0;
else if(op===0x21)r=a<b?1:0;
else r=(a>>>0)<(b>>>0)?1:0;
S.push(r|0);pc++;break;}
case 0x17:
if(!S.length)return trap(2);
S[S.length-1]=-S[S.length-1]|0;pc++;break;
case 0x1b:
if(!S.length)return trap(2);
S[S.length-1]=~S[S.length-1];pc++;break;
case 0x30:case 0x31:case 0x32:{
if(pc+3>p.length)return trap(9);
const rel=((p[pc+1]|p[pc+2]<<8)<<16)>>16;
let take=op===0x30;
if(op!==0x30){
if(!S.length)return trap(2);
const v=S.pop();
take=op===0x31?v===0:v!==0;
}
pc=take?pc+3+rel:pc+3;break;}
case 0x33:
if(pc+3>p.length)return trap(9);
if(C.length>=64)return trap(7);
C.push(pc+3);pc=p[pc+1]|p[pc+2]<<8;break;
case 0x34:
if(!C.length)return trap(8);
pc=C.pop();break;
case 0x40:{
if(!S.length)return trap(2);
const a=S.pop();
if(a<0||a>255)return trap(6);
S.push(M[a]);pc++;break;}
case 0x41:{
if(S.length<2)return trap(2);
const a=S.pop(),v=S.pop();
if(a<0||a>255)return trap(6);
M[a]=v;pc++;break;}
case 0x50:{
if(!S.length)return trap(2);
const s=String(S.pop());
if(out.length+s.length>65536)return trap(11);
for(let i=0;i<s.length;i++)out.push(s.charCodeAt(i));
pc++;break;}
case 0x51:
if(!S.length)return trap(2);
if(out.length+1>65536)return trap(11);
out.push(S.pop()&255);pc++;break;
case 0x52:
if(S.length>=256)return trap(3);
S.push(ip<inp.length?inp[ip++]:-1);pc++;break;
case 0x53:
if(!S.length)return trap(2);
return{out,code:S.pop()&255};
default:return trap(5);
}
}
}
const I=process.env.MAKEFUN_INPUT_DIR??'/input';
const O=process.env.MAKEFUN_OUTPUT_DIR??'/output';
for(const id of readdirSync(I).sort()){
const r=run(readFileSync(join(I,id,'program.bin')),readFileSync(join(I,id,'input.bin')));
mkdirSync(join(O,id),{recursive:true});
writeFileSync(join(O,id,'stdout.bin'),Uint8Array.from(r.out));
writeFileSync(join(O,id,'exit.txt'),r.code+'\n');
}
