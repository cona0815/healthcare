(()=>{
 const dlg=document.getElementById('zoom'),img=dlg.querySelector('img');
 document.querySelectorAll('button.phone, button.wide').forEach(btn=>btn.addEventListener('click',()=>{
  const src=btn.querySelector('img');img.src=src.currentSrc||src.src;img.alt=src.alt;
  if(typeof dlg.showModal==='function')dlg.showModal();else window.open(img.src,'_blank');
 }));
 dlg.addEventListener('click',()=>dlg.close());
})();
