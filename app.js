const URL='https://script.google.com/macros/s/AKfycbwImFLJJdv_ggsmOpY15oAiZxe9Z0RF-OTT9-UOw-nTB9cSEFOaQqUsLZ1KIhZM8PJm/exec';
const defaults={business:['KLIK INDOMARET'],studio:['Studio 1'],device:['Tripod','Kamera','TV','Lampu 1','Lampu 2','Laptop','Kebersihan'],duration:['09:00 - 21:00','11:00 - 21:00']};
let master={...defaults}; let currentDevice=null,currentStatus='OK',items={};
const $=x=>document.getElementById(x);
$('date').value=new Date().toISOString().slice(0,10);

async function post(data){return fetch(URL,{method:'POST',mode:'no-cors',body:JSON.stringify(data)});}
function fill(id,arr){$(id).innerHTML=arr.map(x=>`<option>${esc(x)}</option>`).join('')}
function esc(x){return String(x).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function renderMaster(){
 fill('unit',master.business);fill('studio',master.studio);fill('duration',master.duration);
 $('businessList').innerHTML=master.business.map(x=>`<div class=row>${esc(x)}</div>`).join('');
 $('studioList').innerHTML=master.studio.map(x=>`<div class=row>${esc(x)}</div>`).join('');
 $('deviceList').innerHTML=master.device.map(x=>`<div class=row>${esc(x)}</div>`).join('');
 $('durationList').innerHTML=master.duration.map(x=>`<div class=row>${esc(x)}</div>`).join('');
 $('countStudio').textContent=master.studio.length;$('countDevice').textContent=master.device.length;$('countBusiness').textContent=master.business.length;
 renderDevices();
}
function renderDevices(){
 $('devices').innerHTML=master.device.map(d=>{let x=items[d]||{};return `<div class=device><div class=deviceHead><div><div class=deviceName>${esc(d)}</div><div class=state>${esc(x.status||'Belum diperiksa')}${x.note?' • '+esc(x.note):''}</div></div><button onclick="openDevice('${encodeURIComponent(d)}')">📷 Periksa</button></div>${x.image?'<img class=preview src="'+x.image+'">':''}</div>`}).join('');
}
window.showPage=function(id){document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));$(id).classList.add('active');$('pageTitle').textContent={dashboard:'Dashboard',transaction:'Pemakaian & Pemeriksaan',reports:'Laporan',master:'Master Data'}[id]||id;closeMenu()}
$('menu').onclick=()=>{$('drawer').classList.remove('hidden');$('shade').classList.remove('hidden')};
function closeMenu(){$('drawer').classList.add('hidden');$('shade').classList.add('hidden')}
window.closeMenu=closeMenu;
window.addMaster=async function(type,id){let v=$(id).value.trim();if(!v)return;let key={ 'UNIT BISNIS':'business','STUDIO':'studio','PERALATAN':'device','DURASI':'duration'}[type];if(!master[key].includes(v)){master[key].push(v);$(id).value='';renderMaster();await post({action:'master',jenis:type,nama:v})}}
window.openDevice=function(d){currentDevice=decodeURIComponent(d);currentStatus='OK';$('modalName').textContent=currentDevice;$('photo').value='';$('preview').classList.add('hidden');$('deviceNote').value='';$('ok').classList.add('selected');$('bad').classList.remove('selected');$('modal').classList.remove('hidden')}
window.closeModal=function(){$('modal').classList.add('hidden')}
window.setStatus=function(s){currentStatus=s;$('ok').classList.toggle('selected',s==='OK');$('bad').classList.toggle('selected',s==='TIDAK OK')}
$('photo').onchange=e=>{let f=e.target.files[0];if(!f)return;let r=new FileReader();r.onload=()=>{$('preview').src=r.result;$('preview').classList.remove('hidden');};r.readAsDataURL(f)}
window.saveDevice=function(){items[currentDevice]={status:currentStatus,note:$('deviceNote').value,image:$('preview').src||''};closeModal();renderDevices()}

$('save').onclick=async()=>{
 const selected=Object.entries(items).map(([device,x])=>({device,status:x.status,note:x.note||'',image:x.image||''}));
 if(!selected.length){$('statusMsg').textContent='Periksa minimal satu perangkat.';return}
 $('statusMsg').textContent='Menyimpan...';
 try{await post({action:'transaction',date:$('date').value,unit:$('unit').value,studio:$('studio').value,duration:$('duration').value,note:$('generalNote').value,items:selected});$('statusMsg').textContent='✓ Transaksi dikirim. Data akan masuk ke Spreadsheet dan foto ke Drive.';items={};$('generalNote').value='';renderDevices()}catch(e){$('statusMsg').textContent='Gagal mengirim: '+e.message}
}

window.loadReport=async function(){
 $('reportTable').innerHTML='<p>Memuat...</p>';
 try{
  const r=await fetch(URL,{method:'POST',mode:'no-cors',body:JSON.stringify({action:'report'})});
  $('reportTable').innerHTML='<p>Laporan utama tersimpan di Google Spreadsheet. Untuk versi berikutnya dapat ditambahkan pembacaan laporan live dari Apps Script.</p>';
 }catch(e){$('reportTable').innerHTML='<p>Gunakan sheet Transaksi dan Pemeriksaan di Spreadsheet.</p>'}
}
renderMaster();
