const nav=document.querySelector('.nav');
const menuToggle=document.querySelector('.menu-toggle');
function menu(open){
  nav.classList.toggle('open',open);
  menuToggle.setAttribute('aria-expanded',String(open));
  menuToggle.setAttribute('aria-label',open?'Menüyü kapat':'Menüyü aç');
}
menuToggle.addEventListener('click',()=>menu(!nav.classList.contains('open')));
nav.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>menu(false)));
nav.addEventListener('keydown',event=>{
  if(event.key==='Escape'){menu(false);menuToggle.focus();}
});
