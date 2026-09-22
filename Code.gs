const SPREADSHEET_ID='1-Du8e4omNwqm-mCtP-n8dCw66mWgiCwlWMmdKSYja8M';
const DEFAULT_DEVICES=['Tripod','Kamera','TV','Lampu 1','Lampu 2','Laptop','Kebersihan'];
const DEFAULT_BUSINESS=['KLIK INDOMARET'];
const DEFAULT_DURATION=['09:00 - 21:00','11:00 - 21:00'];

function SS(){return SpreadsheetApp.openById(SPREADSHEET_ID)}
function out(x){return ContentService.createTextOutput(JSON.stringify(x)).setMimeType(ContentService.MimeType.JSON)}
function clean(s){return String(s||'').replace(/[\\/?*\[\]:]/g,'-').slice(0,90)}
function fmt(d){if(!d)return Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'dd/MM/yy'); return Utilities.formatDate(new Date(String(d)+'T00:00:00'),Session.getScriptTimeZone(),'dd/MM/yy')}

function sheet(name,headers){
  let s=SS().getSheetByName(name);
  if(!s){s=SS().insertSheet(name);s.appendRow(headers)}
  return s;
}
function setup(){
  const c=sheet('Master Data',['Jenis','Nama','Aktif']);
  if(c.getLastRow()===1){
    DEFAULT_BUSINESS.forEach(x=>c.appendRow(['UNIT BISNIS',x,'YA']));
    ['Studio 1'].forEach(x=>c.appendRow(['STUDIO',x,'YA']));
    DEFAULT_DEVICES.forEach(x=>c.appendRow(['PERALATAN',x,'YA']));
    DEFAULT_DURATION.forEach(x=>c.appendRow(['DURASI',x,'YA']));
  }
  sheet('Transaksi',['No','Tanggal','Unit Bisnis','Studio','Durasi','Keterangan','Waktu Input']);
  sheet('Pemeriksaan',['No','Tanggal','Unit Bisnis','Studio','Perangkat','Foto','Status','Keterangan','Transaksi No']);
  return out({ok:true,message:'Sistem siap'});
}
function doGet(){return setup()}

function saveMaster(p){
  const s=sheet('Master Data',['Jenis','Nama','Aktif']);
  const jenis=String(p.jenis||'').toUpperCase(), nama=String(p.nama||'').trim();
  if(!jenis||!nama)return out({ok:false,message:'Master tidak lengkap'});
  s.appendRow([jenis,nama,'YA']);
  return out({ok:true});
}
function transaction(p){
  const tr=sheet('Transaksi',['No','Tanggal','Unit Bisnis','Studio','Durasi','Keterangan','Waktu Input']);
  const pr=sheet('Pemeriksaan',['No','Tanggal','Unit Bisnis','Studio','Perangkat','Foto','Status','Keterangan','Transaksi No']);
  const no=tr.getLastRow();
  tr.appendRow([no,fmt(p.date),p.unit||'',p.studio||'',p.duration||'',p.note||'',new Date()]);
  const items=p.items||[];
  const folder=DriveApp.getFoldersByName('Web Kamera - Foto Pemeriksaan').hasNext()
    ? DriveApp.getFoldersByName('Web Kamera - Foto Pemeriksaan').next()
    : DriveApp.createFolder('Web Kamera - Foto Pemeriksaan');
  items.forEach((it,i)=>{
    let url='';
    if(it.image){
      const b=Utilities.base64Decode(String(it.image).split(',').pop());
      const f=folder.createFile(Utilities.newBlob(b,'image/jpeg',
        clean(p.unit)+'-'+clean(p.studio)+'-'+clean(it.device)+'-'+Date.now()+'.jpg'));
      url=f.getUrl();
    }
    pr.appendRow([pr.getLastRow(),fmt(p.date),p.unit||'',p.studio||'',it.device||'',url,it.status||'',it.note||'',no]);
  });
  return out({ok:true,no:no,message:'Pemakaian & pemeriksaan tersimpan'});
}
function report(p){
  const s=SS().getSheetByName('Transaksi');
  if(!s)return out({ok:true,rows:[]});
  const v=s.getDataRange().getValues();
  return out({ok:true,rows:v});
}
function doPost(e){
  try{
    const p=JSON.parse(e.postData.contents||'{}');
    if(p.action==='setup')return setup();
    if(p.action==='master')return saveMaster(p);
    if(p.action==='transaction')return transaction(p);
    if(p.action==='report')return report(p);
    return out({ok:false,message:'Action tidak dikenal'});
  }catch(err){return out({ok:false,message:String(err)})}
}