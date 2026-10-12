/* Animaciones estilo estudio creativo: JavaScript y CSS puros, sin librerías */
(()=>{
const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
const cortina=document.getElementById("cortina");
const $=(s,c=document)=>[...c.querySelectorAll(s)];
let abrir;const listo=new Promise(r=>abrir=r);

/* 1. Pantalla de carga con contador + cortina entre páginas */
function salir(){cortina.classList.add("fuera");setTimeout(abrir,500);setTimeout(()=>cortina.style.display="none",1000)}
if(reduce||!cortina){if(cortina)cortina.remove();abrir()}
else if(!sessionStorage.getItem("brumaVisto")){
sessionStorage.setItem("brumaVisto","1");const n=document.getElementById("cuenta"),t0=performance.now();
(function paso(t){const p=Math.min(1,(t-t0)/1500);n.textContent=Math.round((1-Math.pow(1-p,3))*100);p<1?requestAnimationFrame(paso):setTimeout(salir,150)})(t0)}
else{cortina.classList.add("rapida");setTimeout(salir,60)}

if(cortina&&!reduce){
document.addEventListener("click",e=>{const a=e.target.closest("a[href]");
if(!a||e.metaKey||e.ctrlKey||e.shiftKey||e.button||a.target||a.hasAttribute("download"))return;
const u=new URL(a.href,location.href);if(u.origin!==location.origin||u.pathname===location.pathname)return;
e.preventDefault();cortina.style.display="grid";cortina.className="rapida abajo";void cortina.offsetHeight;cortina.classList.add("cubre");
setTimeout(()=>location.href=a.href,650)});
addEventListener("pageshow",e=>{if(e.persisted){cortina.className="rapida fuera"}})}
if(reduce)return;

/* 2. Títulos que suben palabra por palabra */
function dividir(el){let i=0;el.setAttribute("aria-label",el.textContent.replace(/\s+/g," ").trim());
(function rec(n){[...n.childNodes].forEach(c=>{
if(c.nodeType===3){const f=document.createDocumentFragment();
c.textContent.split(/(\s+)/).forEach(t=>{if(!t)return;if(/^\s+$/.test(t))return f.append(" ");
const w=document.createElement("span");w.className="w";w.setAttribute("aria-hidden","true");const s=document.createElement("span");s.textContent=t;s.style.setProperty("--i",i++);w.append(s);f.append(w)});
c.replaceWith(f)}else if(c.nodeType===1&&c.tagName!=="BR")rec(c)})})(el)}
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){io.unobserve(e.target);listo.then(()=>e.target.classList.add("en-vista"))}}),{threshold:.2});
$("h1,section h2").forEach(h=>{h.classList.remove("reveal");dividir(h);io.observe(h)});
$(".hero>p,.hero>div").forEach((e,i)=>{e.classList.add("reveal");e.style.transitionDelay=(.5+i*.15)+"s";listo.then(()=>e.classList.add("en-vista"))});

/* 3. Tarjetas que aparecen en cascada (también al filtrar) */
const ioC=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("en-vista");ioC.unobserve(e.target)}}),{threshold:.1});
function tarjetas(){$(".tarjeta-cerveza:not(.reveal)").forEach((c,i)=>{c.classList.add("reveal");c.style.transitionDelay=(i%4)*90+"ms";ioC.observe(c)})}
tarjetas();$(".grilla").forEach(g=>new MutationObserver(tarjetas).observe(g,{childList:true}));

/* 4. Texto que se ilumina con el scroll, parallax y barra de progreso */
const sc=$(".scrub");sc.forEach(p=>{dividir(p);p._w=$(".w>span",p)});
const par=$("[data-parallax]"),prog=document.createElement("div");prog.id="progreso";document.body.append(prog);
let pend=false;
function actualizar(){pend=false;const vh=innerHeight;
prog.style.transform=`scaleX(${scrollY/Math.max(1,document.documentElement.scrollHeight-vh)})`;
par.forEach(e=>{const r=e.parentElement.getBoundingClientRect();e.style.transform=`translateY(${(r.top+r.height/2-vh/2)*e.dataset.parallax}px)`});
sc.forEach(p=>{const pr=Math.min(1,Math.max(0,(vh*.85-p.getBoundingClientRect().top)/(vh*.5)));p._w.forEach((w,i)=>w.classList.toggle("on",i<pr*p._w.length))})}
const pedir=()=>{if(!pend){pend=true;requestAnimationFrame(actualizar)}};
addEventListener("scroll",pedir,{passive:true});addEventListener("resize",pedir);actualizar();

/* 5. Bruma: partículas doradas que flotan y siguen al mouse */
const cv=document.createElement("canvas");cv.id="niebla";cv.setAttribute("aria-hidden","true");document.body.prepend(cv);
const ctx=cv.getContext("2d");let W,H,mx=0,my=0;
const ps=Array.from({length:innerWidth<760?45:110},()=>({x:Math.random(),y:Math.random(),d:Math.random()*.9+.1,f:Math.random()*6.28,v:Math.random()*.012+.004}));
function medir(){const k=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;cv.width=W*k;cv.height=H*k;ctx.setTransform(k,0,0,k,0,0)}
medir();addEventListener("resize",medir);
addEventListener("pointermove",e=>{mx=e.clientX/W-.5;my=e.clientY/H-.5});
let cx=0,cy=0;
(function dibujar(t){cx+=(mx-cx)*.05;cy+=(my-cy)*.05;ctx.clearRect(0,0,W,H);
ps.forEach(p=>{p.y-=p.v/60;if(p.y<-.05)p.y=1.05;
const x=((p.x*W-cx*p.d*120)%W+W)%W,y=((p.y*H-cy*p.d*120-scrollY*p.d*.25)%H+H)%H,r=p.d*2.2+.5,a=(.25+.35*Math.sin(t/900+p.f))*(.4+p.d*.6);
ctx.fillStyle=`rgba(232,172,78,${a*.18})`;ctx.beginPath();ctx.arc(x,y,r*4,0,6.283);ctx.fill();
ctx.fillStyle=`rgba(243,234,212,${a})`;ctx.beginPath();ctx.arc(x,y,r,0,6.283);ctx.fill()});
requestAnimationFrame(dibujar)})(0);

/* 6. Cursor personalizado y botones magnéticos (solo con mouse) */
if(matchMedia("(hover:hover) and (pointer:fine)").matches){
document.documentElement.classList.add("cursor-custom");
const anillo=document.createElement("div"),punto=document.createElement("div");anillo.id="cursor";punto.id="cursor-punto";document.body.append(anillo,punto);
let px=-100,py=-100,ax=px,ay=py,mag=null;
addEventListener("pointermove",e=>{px=e.clientX;py=e.clientY;punto.style.transform=`translate(${px}px,${py}px)`;
const b=e.target.closest(".btn");
if(b){const r=b.getBoundingClientRect();b.style.transform=`translate(${(px-r.left-r.width/2)*.25}px,${(py-r.top-r.height/2)*.35}px)`}
if(mag&&mag!==b)mag.style.transform="";mag=b});
(function seguir(){ax+=(px-ax)*.16;ay+=(py-ay)*.16;anillo.style.transform=`translate(${ax}px,${ay}px)`;requestAnimationFrame(seguir)})();
document.addEventListener("pointerover",e=>anillo.classList.toggle("grande",!!e.target.closest("a,button,.tarjeta-cerveza,iframe")));
document.addEventListener("pointerleave",()=>{if(mag)mag.style.transform=""})}
})();
