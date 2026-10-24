#!/usr/bin/env bash
# Bangun installer .msi untuk Pixel Sinergi (native Rust).
# Butuh: Rust toolchain + WiX Toolset v3 (candle/light).
# WiX dapat diunduh otomatis ke ./tools/wix314 jika belum ada.
set -euo pipefail
cd "$(dirname "$0")/.."

WIX_DIR="tools/wix314"
WIX_ZIP="tools/wix314-binaries.zip"
WIX_URL="https://github.com/wixtoolset/wix3/releases/download/wix3141rtm/wix314-binaries.zip"

if [ ! -x "$WIX_DIR/candle.exe" ]; then
  echo "==> Mengunduh WiX Toolset v3.14"
  mkdir -p tools
  curl -sL -o "$WIX_ZIP" "$WIX_URL"
  (cd tools && unzip -q -o "$(basename "$WIX_ZIP")" -d wix314)
fi

echo "==> Build rilis (Rust)"
(cd native && cargo build --release)

EXE="native/target/release/pixel-sinergi.exe"
if [ ! -f "$EXE" ]; then
  echo "!! exe tidak ditemukan: $EXE"; exit 1
fi

mkdir -p dist-installer
echo "==> candle"
"$WIX_DIR/candle.exe" -nologo \
  -dExePath="$(pwd)/$EXE" \
  -dIconPath="$(pwd)/installer/app.ico" \
  -dReadmePath="$(pwd)/README.md" \
  -o dist-installer/pixel-sinergi.wixobj \
  installer/pixel-sinergi.wxs

echo "==> light"
"$WIX_DIR/light.exe" -nologo -ext WixUIExtension \
  -o "dist-installer/PixelSinergi-1.0.0-x64.msi" \
  dist-installer/pixel-sinergi.wixobj

ls -la dist-installer/*.msi
echo "==> Selesai."