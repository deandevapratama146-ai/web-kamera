// Google Sheet yang diberikan:
const SHEET_ID = "1-Du8e4omNwqm-mCtP-n8dCw66mWgiCwlWMmdKSYja8M";

// Ganti dengan ID folder Google Drive untuk menyimpan foto.
const FOLDER_ID = "MASUKKAN_ID_FOLDER_GOOGLE_DRIVE";

function doGet() {
  return ContentService.createTextOutput("API aktif");
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
    let fotoUrl = "";

    if (data.foto && data.foto.includes(",")) {
      if (FOLDER_ID.includes("MASUKKAN_ID")) {
        throw new Error("FOLDER_ID belum diisi.");
      }
      const folder = DriveApp.getFolderById(FOLDER_ID);
      const bytes = Utilities.base64Decode(data.foto.split(",")[1]);
      const blob = Utilities.newBlob(
        bytes,
        data.tipeFoto || "image/jpeg",
        "foto_" + Date.now() + ".jpg"
      );
      const file = folder.createFile(blob);
      fotoUrl = file.getUrl();
    }

    sheet.appendRow([
      new Date(),
      data.nama || "",
      data.nohp || "",
      data.keterangan || "",
      fotoUrl
    ]);

    return json({success:true,message:"Data berhasil disimpan"});
  } catch (error) {
    return json({success:false,error:String(error)});
  }
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
