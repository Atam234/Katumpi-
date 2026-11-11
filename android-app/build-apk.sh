#!/usr/bin/env bash
# Gumagawa ng Katumpi.apk mula sa www/ (walang Gradle / Android Studio na kailangan).
# Kailangan (Ubuntu/Debian):
#   sudo apt-get install android-sdk-platform-23 android-sdk-build-tools dalvik-exchange openjdk-17-jdk
# Gamit:  ./android-app/build-apk.sh [path/sa/keystore.jks]
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(dirname "$HERE")"
SDK="${ANDROID_SDK:-/usr/lib/android-sdk}"
ANDROID_JAR="$SDK/platforms/android-23/android.jar"
DX_JAR="${DX_JAR:-/usr/share/java/com.android.dx.jar}"
OUT="$ROOT/dist"
BUILD="$(mktemp -d)"
KEYSTORE="${1:-$HOME/.katumpi-release.jks}"
KS_PASS="${KS_PASS:-katumpi123}"
VERSION_CODE="${VERSION_CODE:-1}"
VERSION_NAME="${VERSION_NAME:-1.0}"

echo "› Build dir: $BUILD"
mkdir -p "$OUT" "$BUILD/assets" "$BUILD/classes" "$BUILD/gen"
cp -r "$ROOT/www" "$BUILD/assets/www"
rm -f "$BUILD/assets/www/sw.js"

echo "› Resources (aapt2)"
aapt2 compile --dir "$HERE/res" -o "$BUILD/res.zip"
aapt2 link -I "$ANDROID_JAR" --manifest "$HERE/AndroidManifest.xml" \
  --min-sdk-version 21 --target-sdk-version 34 \
  --version-code "$VERSION_CODE" --version-name "$VERSION_NAME" \
  -A "$BUILD/assets" --java "$BUILD/gen" -0 mp3 \
  -o "$BUILD/unsigned.apk" "$BUILD/res.zip"

echo "› Java → dex"
javac -nowarn -Xlint:-options -source 8 -target 8 -bootclasspath "$ANDROID_JAR" \
  -d "$BUILD/classes" $(find "$HERE/src" "$BUILD/gen" -name '*.java')
java -cp "$DX_JAR" com.android.dx.command.Main --dex --min-sdk-version=21 \
  --output="$BUILD/classes.dex" "$BUILD/classes"
(cd "$BUILD" && zip -q unsigned.apk classes.dex)

echo "› zipalign + sign"
zipalign -f -p 4 "$BUILD/unsigned.apk" "$BUILD/aligned.apk"
if [ ! -f "$KEYSTORE" ]; then
  echo "  (bagong keystore: $KEYSTORE — ITAGO ito para ma-update ang app sa susunod)"
  keytool -genkeypair -keystore "$KEYSTORE" -alias katumpi -keyalg RSA -keysize 2048 \
    -validity 10000 -storepass "$KS_PASS" -keypass "$KS_PASS" \
    -dname "CN=Katumpi, O=Katumpi, C=PH" >/dev/null 2>&1
fi
apksigner sign --ks "$KEYSTORE" --ks-key-alias katumpi --ks-pass "pass:$KS_PASS" \
  --key-pass "pass:$KS_PASS" --min-sdk-version 21 --out "$OUT/Katumpi.apk" "$BUILD/aligned.apk"
apksigner verify --min-sdk-version 21 "$OUT/Katumpi.apk"
rm -rf "$BUILD"
echo "✔ $OUT/Katumpi.apk ($(du -h "$OUT/Katumpi.apk" | cut -f1))"
