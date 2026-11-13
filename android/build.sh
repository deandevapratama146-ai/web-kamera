#!/usr/bin/env bash
# Membangun PerekamBrowser.apk tanpa Gradle.
# Butuh: JDK 17+, Android SDK (platforms;android-34 dan build-tools;35.0.0).
#   ANDROID_HOME=/lokasi/sdk ./build.sh
set -euo pipefail
cd "$(dirname "$0")"
SDK="${ANDROID_HOME:-/opt/android-sdk}"
BT="$SDK/build-tools/35.0.0"
JAR="$SDK/platforms/android-34/android.jar"
OUT=build
KS="${KEYSTORE:-$OUT/debug.keystore}"

rm -rf "$OUT/classes" "$OUT/dex" && mkdir -p "$OUT/classes" "$OUT/dex"
"$BT/aapt2" link -o "$OUT/base.apk" -I "$JAR" --manifest AndroidManifest.xml -A assets
javac -source 8 -target 8 -Xlint:-options -cp "$JAR" -d "$OUT/classes" $(find src -name '*.java')
jar cf "$OUT/classes.jar" -C "$OUT/classes" .
"$BT/d8" --release --min-api 21 --lib "$JAR" --output "$OUT/dex" "$OUT/classes.jar"
cp "$OUT/base.apk" "$OUT/unaligned.apk"
(cd "$OUT/dex" && zip -q -j ../unaligned.apk classes.dex)
"$BT/zipalign" -f 4 "$OUT/unaligned.apk" "$OUT/aligned.apk"
[ -f "$KS" ] || keytool -genkeypair -keystore "$KS" -storepass android -keypass android -alias debug \
  -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Perekam Browser Debug" >/dev/null 2>&1
"$BT/apksigner" sign --ks "$KS" --ks-pass pass:android --key-pass pass:android --out PerekamBrowser.apk "$OUT/aligned.apk"
rm -f PerekamBrowser.apk.idsig
"$BT/apksigner" verify --verbose PerekamBrowser.apk | head -4
ls -la PerekamBrowser.apk
