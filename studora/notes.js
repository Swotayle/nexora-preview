
'use strict';
const noteLabels={violet:'Mor',blue:'Mavi',mint:'Yeşil',amber:'Turuncu'};
const noteSearch=$('#noteSearch'), noteCategory=$('#notesCategory'), noteBody=$('#noteBody');
let selectedNoteId=null, previewOpen=false;
const selectedNote=()=>state.notes.find(note=>note.id===selectedNoteId);
const courseName=note=>state.lessons.find(x=>x.id===note.course)?.name??note.courseName??'';
const noteName=note=>note.title.trim()||'Başlıksız not';
function courseOptions(element,includeAll,selected){
  const courses=new Map(state.lessons.map(x=>[x.id,x.name]));
  for(const note of state.notes)if(note.course&&!courses.has(note.course))courses.set(note.course,note.courseName||'Kaldırılmış ders');
  element.innerHTML='<option value="">'+(includeAll?'Tüm dersler':'Ders seçilmedi')+'</option>'+
    [...courses].map(([id,name])=>'<option value="'+e(id)+'">'+e(name)+'</option>').join('');
  element.value=selected;
}
function paintNoteList(){
  const prior=noteCategory.value;
  courseOptions(noteCategory,true,prior);
  const query=noteSearch.value.trim().toLocaleLowerCase('tr');
  const matches=state.notes.filter(note=>
    (!$('#notesFavorites').checked||note.favorite)&&(!noteCategory.value||note.course===noteCategory.value)&&
    [note.title,note.body].some(value=>value.toLocaleLowerCase('tr').includes(query))
  ).sort((a,b)=>Number(b.pinned)-Number(a.pinned)||b.updatedAt-a.updatedAt);
  $('#noteList').innerHTML=matches.map(note=>{
    const label=Object.hasOwn(noteLabels,note.color)?note.color:'violet';
    return '<button type="button" class="note-item '+label+'" data-note="'+e(note.id)+'" aria-pressed="'+(note.id===selectedNoteId)+'"><strong>'+
      (note.pinned?'⌖ ':'')+(note.favorite?'★ ':'')+e(noteName(note))+'</strong><small>'+e(courseName(note)||'Genel')+
      ' · '+e(noteLabels[label])+'</small></button>';
  }).join('')||empty(state.notes.length?'Aramana uyan not yok.':'Henüz not eklemedin.');
}
function paintFormatting(){
  $('#noteBodyField').hidden=previewOpen;
  $('#notePreview').hidden=!previewOpen;
  $('#notePreviewToggle').setAttribute('aria-pressed',String(previewOpen));
  $('#notePreviewToggle').textContent=previewOpen?'Düzenle':'Önizle';
  if(!previewOpen)return;
  const inline=text=>e(text).replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
  const html=[];
  let list=false;
  for(const [index,line] of noteBody.value.split('\n').entries()){
    const bullet=/^[-*]\s+(.*)$/.exec(line);
    if(!bullet&&list){html.push('</ul>');list=false;}
    if(bullet){
      if(!list){html.push('<ul>');list=true;}
      const check=/^\[([ xX])\]\s*(.*)$/.exec(bullet[1]);
      html.push(check?'<li class="note-check"><label><input type="checkbox" data-line="'+index+'" '+(check[1]===' '?'':'checked')+'>'+inline(check[2])+'</label></li>':
        '<li>'+inline(bullet[1])+'</li>');
    }else if(/^#{1,3}\s/.test(line))html.push('<h3>'+inline(line.replace(/^#{1,3}\s+/,''))+'</h3>');
    else if(line.trim())html.push('<p>'+inline(line)+'</p>');
  }
  if(list)html.push('</ul>');
  $('#notePreview').innerHTML=html.join('')||empty('Notun henüz boş.');
}
function paintNoteMetadata(note){
  const options={dateStyle:'medium',timeStyle:'short'};
  $('#noteDates').textContent='Oluşturuldu '+dateText(new Date(note.createdAt),options)+' · Düzenlendi '+dateText(new Date(note.updatedAt),options);
  $('#noteFavorite').setAttribute('aria-pressed',String(note.favorite));
  $('#noteFavorite').textContent=note.favorite?'★ Favoride':'☆ Favoriye ekle';
  $('#notePin').setAttribute('aria-pressed',String(note.pinned));
  $('#notePin').textContent=note.pinned?'Sabitlemeyi kaldır':'Sabitle';
}
function openNote(id){
  selectedNoteId=id;
  const note=selectedNote();
  $('#noteEditor').hidden=!note;$('#noteEmpty').hidden=!!note;
  if(note){
    $('#noteTitle').value=note.title;noteBody.value=note.body;$('#noteColor').value=note.color;
    courseOptions($('#noteCourse'),false,note.course);
    previewOpen=false;paintFormatting();paintNoteMetadata(note);
    $('#noteSaved').textContent='Cihaza kaydedildi';
  }
  paintNoteList();
}
function updateNote(changes){
  syncStoredState();
  const note=selectedNote();
  if(!note){openNote(null);return;}
  const updated={...note,...changes,updatedAt:Date.now()};
  if(!persist({notes:state.notes.map(x=>x.id===note.id?updated:x)})){
    $('#noteSaved').textContent='Kaydedilemedi';return;
  }
  $('#noteSaved').textContent='Cihaza kaydedildi';
  paintNoteMetadata(updated);paintNoteList();
}
$('#newNote').onclick=()=>{
  syncStoredState();
  const time=Date.now(), id=uniqueId();
  const note={id,title:'',body:'',course:'',courseName:'',color:'violet',favorite:false,pinned:false,createdAt:time,updatedAt:time};
  if(!persist({notes:[...state.notes,note]}))return;
  noteSearch.value='';noteCategory.value='';$('#notesFavorites').checked=false;
  openNote(id);$('#noteTitle').focus();
};
$('#noteList').onclick=event=>{const item=event.target.closest('[data-note]');if(item)openNote(item.dataset.note);};
noteSearch.oninput=paintNoteList;
noteCategory.onchange=$('#notesFavorites').onchange=paintNoteList;
$('#noteTitle').oninput=event=>updateNote({title:event.target.value});
noteBody.oninput=event=>updateNote({body:event.target.value});
$('#noteColor').onchange=event=>updateNote({color:event.target.value});
$('#noteCourse').onchange=event=>updateNote({course:event.target.value,courseName:state.lessons.find(x=>x.id===event.target.value)?.name??''});
$('#noteFavorite').onclick=()=>updateNote({favorite:!selectedNote()?.favorite});
$('#notePin').onclick=()=>updateNote({pinned:!selectedNote()?.pinned});
$('#notePreviewToggle').onclick=()=>{previewOpen=!previewOpen;paintFormatting();};
$('.note-toolbar').addEventListener('click',event=>{
  const format=event.target.closest('[data-format]')?.dataset.format;
  if(!format)return;
  previewOpen=false;paintFormatting();
  const start=noteBody.selectionStart,end=noteBody.selectionEnd;
  if(format==='bold'){
    const content=noteBody.value.slice(start,end)||'metin';
    noteBody.setRangeText('**'+content+'**',start,end,'end');
  }else{
    const from=start?noteBody.value.lastIndexOf('\n',start-1)+1:0;
    const prefix={heading:'## ',bullet:'- ',check:'- [ ] '}[format];
    const text=noteBody.value.slice(from,end);
    noteBody.setRangeText(text.split('\n').map(line=>prefix+line).join('\n'),from,end,'end');
  }
  updateNote({body:noteBody.value});noteBody.focus();
});
$('#notePreview').onchange=event=>{
  const index=event.target.dataset.line;
  if(index===undefined)return;
  const lines=noteBody.value.split('\n');
  lines[index]=lines[index].replace(/^([-*]\s+)\[[ xX]\]/,(_,prefix)=>prefix+(event.target.checked?'[x]':'[ ]'));
  noteBody.value=lines.join('\n');
  updateNote({body:noteBody.value});paintFormatting();
};
$('#noteExport').onclick=()=>{
  const note=selectedNote();
  if(!note)return;
  const blob=new Blob([noteName(note),'\n\n',note.body],{type:'text/plain;charset=utf-8'});
  const url=URL.createObjectURL(blob), link=document.createElement('a');
  link.href=url;link.download=(noteName(note).replace(/[^\p{L}\p{N} _-]/gu,'_').slice(0,70)||'not')+'.txt';
  link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
$('#noteDelete').onclick=()=>{
  const note=selectedNote();
  if(!note||!window.confirm('“'+noteName(note)+'” silinsin mi?'))return;
  syncStoredState();
  if(persist({notes:state.notes.filter(x=>x.id!==note.id)}))openNote(null);
};
window.addEventListener('storage',event=>{
  if(event.key!==key)return;
  if(selectedNoteId&&!selectedNote())openNote(null);
  else if(selectedNote()&&!$('#noteEditor').contains(document.activeElement))openNote(selectedNoteId);
  else paintNoteList();
});
window.addEventListener('studora-change',()=>{
  courseOptions($('#noteCourse'),false,selectedNote()?.course??'');paintNoteList();
});
openNote(null);
