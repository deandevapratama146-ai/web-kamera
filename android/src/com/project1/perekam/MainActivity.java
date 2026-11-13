package com.project1.perekam;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.Typeface;
import android.os.Bundle;
import android.text.InputType;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.inputmethod.EditorInfo;
import android.view.inputmethod.InputMethodManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;

/** Browser sederhana yang mencatat tombol dan kolom yang dipakai di halaman web. */
public class MainActivity extends Activity {
    private static final String PREFS = "rekaman";
    private static final String KEY_STEPS = "steps";
    private static final String BERANDA = "https://www.google.com";

    private WebView web;
    private EditText alamat;
    private TextView jumlah;
    private TextView daftar;
    private ScrollView panel;
    private ProgressBar progres;
    private Button tombolLihat;
    private String skrip = "";
    private JSONArray langkah = new JSONArray();

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        skrip = bacaAset("rekam-inject.js");
        muatLangkah();
        setContentView(buatTampilan());
        siapkanWeb();
        segarkan();
        if (state != null) web.restoreState(state);
        else buka(BERANDA);
    }

    // ---------- Tampilan ----------
    private int dp(int v) {
        return (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, getResources().getDisplayMetrics());
    }

    private Button tombol(String teks, View.OnClickListener aksi) {
        Button b = new Button(this);
        b.setText(teks);
        b.setAllCaps(false);
        b.setTextSize(13);
        b.setMinWidth(0);
        b.setMinimumWidth(0);
        b.setPadding(dp(10), 0, dp(10), 0);
        b.setOnClickListener(aksi);
        return b;
    }

    private View buatTampilan() {
        LinearLayout akar = new LinearLayout(this);
        akar.setOrientation(LinearLayout.VERTICAL);
        akar.setFitsSystemWindows(true);

        // Baris alamat
        LinearLayout atas = new LinearLayout(this);
        atas.setGravity(Gravity.CENTER_VERTICAL);
        atas.setPadding(dp(6), dp(2), dp(6), dp(2));
        alamat = new EditText(this);
        alamat.setHint("Ketik alamat web atau kata pencarian");
        alamat.setSingleLine(true);
        alamat.setTextSize(14);
        alamat.setSelectAllOnFocus(true);
        alamat.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);
        alamat.setImeOptions(EditorInfo.IME_ACTION_GO);
        alamat.setOnEditorActionListener(new TextView.OnEditorActionListener() {
            public boolean onEditorAction(TextView v, int id, KeyEvent e) {
                buka(alamat.getText().toString());
                return true;
            }
        });
        atas.addView(tombol("←", new View.OnClickListener() {
            public void onClick(View v) { if (web.canGoBack()) web.goBack(); }
        }));
        atas.addView(alamat, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));
        atas.addView(tombol("Buka", new View.OnClickListener() {
            public void onClick(View v) { buka(alamat.getText().toString()); }
        }));
        akar.addView(atas);

        progres = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progres.setMax(100);
        akar.addView(progres, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(3)));

        web = new WebView(this);
        akar.addView(web, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1));

        // Panel daftar langkah (disembunyikan sampai tombol "Lihat" ditekan)
        panel = new ScrollView(this);
        panel.setBackgroundColor(Color.parseColor("#1B1F27"));
        panel.setVisibility(View.GONE);
        daftar = new TextView(this);
        daftar.setTextColor(Color.parseColor("#E6E8EC"));
        daftar.setTypeface(Typeface.MONOSPACE);
        daftar.setTextSize(12);
        daftar.setTextIsSelectable(true);
        daftar.setPadding(dp(12), dp(10), dp(12), dp(10));
        panel.addView(daftar);
        akar.addView(panel, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(220)));

        // Baris bawah
        LinearLayout bawah = new LinearLayout(this);
        bawah.setGravity(Gravity.CENTER_VERTICAL);
        bawah.setBackgroundColor(Color.parseColor("#2B313C"));
        bawah.setPadding(dp(10), dp(2), dp(6), dp(2));
        jumlah = new TextView(this);
        jumlah.setTextColor(Color.WHITE);
        jumlah.setTextSize(13);
        bawah.addView(jumlah, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));
        tombolLihat = tombol("Lihat", new View.OnClickListener() {
            public void onClick(View v) {
                boolean buka = panel.getVisibility() != View.VISIBLE;
                panel.setVisibility(buka ? View.VISIBLE : View.GONE);
                tombolLihat.setText(buka ? "Tutup" : "Lihat");
                if (buka) gulirKeBawah();
            }
        });
        bawah.addView(tombolLihat);
        bawah.addView(tombol("Salin", new View.OnClickListener() {
            public void onClick(View v) { salin(); }
        }));
        bawah.addView(tombol("Bagikan", new View.OnClickListener() {
            public void onClick(View v) { bagikan(); }
        }));
        bawah.addView(tombol("Hapus", new View.OnClickListener() {
            public void onClick(View v) { konfirmasiHapus(); }
        }));
        akar.addView(bawah);
        return akar;
    }

    // ---------- WebView ----------
    private void siapkanWeb() {
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setBuiltInZoomControls(true);
        s.setDisplayZoomControls(false);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        web.addJavascriptInterface(new Jembatan(), "__rekamNative");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageStarted(WebView v, String url, Bitmap ikon) {
                alamat.setText(url);
            }

            @Override
            public void onPageFinished(WebView v, String url) {
                alamat.setText(url);
                v.evaluateJavascript(skrip, null);
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView v, int p) {
                progres.setProgress(p);
                progres.setVisibility(p >= 100 ? View.INVISIBLE : View.VISIBLE);
                // Suntikkan lebih awal juga, supaya halaman yang lambat tetap terekam.
                if (p >= 30) v.evaluateJavascript(skrip, null);
            }
        });
    }

    private void buka(String teks) {
        String t = teks == null ? "" : teks.trim();
        if (t.isEmpty()) return;
        String url;
        if (t.matches("(?i)^[a-z][a-z0-9+.-]*://.*")) url = t;
        else if (t.contains(".") && !t.contains(" ")) url = "https://" + t;
        else url = "https://www.google.com/search?q=" + android.net.Uri.encode(t);
        web.loadUrl(url);
        web.requestFocus();
        InputMethodManager imm = (InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);
        if (imm != null) imm.hideSoftInputFromWindow(alamat.getWindowToken(), 0);
    }

    /** Dipanggil dari skrip di halaman setiap ada klik atau ketikan. */
    private class Jembatan {
        @JavascriptInterface
        public void kirim(final String json) {
            runOnUiThread(new Runnable() {
                public void run() {
                    try {
                        langkah.put(new JSONObject(json));
                        simpanLangkah();
                        segarkan();
                    } catch (Exception ignored) {
                    }
                }
            });
        }
    }

    // ---------- Daftar langkah ----------
    private String teksLangkah() {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < langkah.length(); i++) {
            JSONObject s = langkah.optJSONObject(i);
            if (s == null) continue;
            sb.append(i + 1).append(". ").append(s.optString("aksi")).append(' ')
              .append(s.optString("jenis")).append(" \"").append(s.optString("nama")).append('"');
            if (s.has("nilai")) sb.append(" → \"").append(s.optString("nilai")).append('"');
            sb.append("\n   selector: ").append(s.optString("selector"));
            StringBuilder ex = new StringBuilder("tag=" + s.optString("tag"));
            if (!s.optString("type").isEmpty()) ex.append(", type=").append(s.optString("type"));
            if (!s.optString("id").isEmpty()) ex.append(", id=").append(s.optString("id"));
            if (!s.optString("name").isEmpty()) ex.append(", name=").append(s.optString("name"));
            sb.append("\n   ").append(ex);
            sb.append("\n   halaman: ").append(s.optString("url")).append("\n\n");
        }
        return sb.toString().trim();
    }

    private void segarkan() {
        jumlah.setText("● " + langkah.length() + " langkah");
        String t = teksLangkah();
        daftar.setText(t.isEmpty() ? "Belum ada langkah. Klik atau ketik di halaman web." : t);
        gulirKeBawah();
    }

    private void gulirKeBawah() {
        panel.post(new Runnable() {
            public void run() { panel.fullScroll(View.FOCUS_DOWN); }
        });
    }

    private void salin() {
        if (langkah.length() == 0) { pesan("Belum ada langkah"); return; }
        ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
        cm.setPrimaryClip(ClipData.newPlainText("Rekaman langkah", teksLangkah()));
        pesan(langkah.length() + " langkah disalin");
    }

    private void bagikan() {
        if (langkah.length() == 0) { pesan("Belum ada langkah"); return; }
        Intent i = new Intent(Intent.ACTION_SEND);
        i.setType("text/plain");
        i.putExtra(Intent.EXTRA_TEXT, teksLangkah());
        startActivity(Intent.createChooser(i, "Bagikan rekaman"));
    }

    private void konfirmasiHapus() {
        if (langkah.length() == 0) return;
        new AlertDialog.Builder(this)
            .setMessage("Hapus semua " + langkah.length() + " langkah?")
            .setPositiveButton("Hapus", new android.content.DialogInterface.OnClickListener() {
                public void onClick(android.content.DialogInterface d, int w) {
                    langkah = new JSONArray();
                    simpanLangkah();
                    segarkan();
                }
            })
            .setNegativeButton("Batal", null)
            .show();
    }

    private void pesan(String t) {
        Toast.makeText(this, t, Toast.LENGTH_SHORT).show();
    }

    // ---------- Penyimpanan ----------
    private void muatLangkah() {
        try {
            langkah = new JSONArray(getSharedPreferences(PREFS, MODE_PRIVATE).getString(KEY_STEPS, "[]"));
        } catch (Exception e) {
            langkah = new JSONArray();
        }
    }

    private void simpanLangkah() {
        SharedPreferences.Editor e = getSharedPreferences(PREFS, MODE_PRIVATE).edit();
        e.putString(KEY_STEPS, langkah.toString());
        e.apply();
    }

    private String bacaAset(String nama) {
        try (InputStream in = getAssets().open(nama); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buf = new byte[8192];
            int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            return out.toString("UTF-8");
        } catch (Exception e) {
            return "";
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    @Override
    public void onBackPressed() {
        if (panel.getVisibility() == View.VISIBLE) {
            panel.setVisibility(View.GONE);
            tombolLihat.setText("Lihat");
        } else if (web.canGoBack()) {
            web.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
