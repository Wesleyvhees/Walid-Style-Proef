// Gedeelde scripts: menu, thema, jaar, aftelklok
(function(){
  const btn=document.querySelector('.menu-btn'), links=document.getElementById('links');
  if(btn&&links){
    btn.addEventListener('click',()=>{const o=links.classList.toggle('open');btn.setAttribute('aria-expanded',o);});
    links.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{links.classList.remove('open');btn.setAttribute('aria-expanded',false);}));
  }
  const root=document.documentElement;
  try{const t=localStorage.getItem('theme');if(t)root.dataset.theme=t;}catch(e){}
  document.querySelectorAll('.theme-btn').forEach(b=>b.addEventListener('click',()=>{
    const dark=root.dataset.theme?root.dataset.theme==='dark':matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme=dark?'light':'dark';
    try{localStorage.setItem('theme',root.dataset.theme);}catch(e){}
  }));
  const y=document.getElementById('year'); if(y) y.textContent=new Date().getFullYear();
})();

function startCountdown(iso,sel){
  const box=document.querySelector(sel); if(!box) return;
  const cells=box.querySelectorAll('b'), target=new Date(iso).getTime();
  const tick=()=>{
    let d=Math.max(0,target-Date.now())/1000;
    const v=[Math.floor(d/86400),Math.floor(d%86400/3600),Math.floor(d%3600/60),Math.floor(d%60)];
    cells.forEach((c,i)=>c.textContent=v[i]);
  };
  tick(); setInterval(tick,1000);
}
