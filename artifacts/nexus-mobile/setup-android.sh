#!/usr/bin/env bash
set -euo pipefail

# ═══════════════════════════════════════════════════════════════════════════════
# NEXUS CONVERTER — Setup Android Project with Node.js Mobile Integration
#
# This script must be run AFTER `npx cap add android`. It:
#   1. Extracts libnode.so (Node.js for Android) into the Android project
#   2. Adds the C++ JNI bridge code for starting Node.js
#   3. Modifies build.gradle to include CMake + ndk config
#   4. Creates the Java service to start the Node.js API server
#   5. Adds the bundled nodejs-project to Android assets
#   6. Patches MainActivity to start the service
#   7. Patches AndroidManifest.xml to register the service
# ═══════════════════════════════════════════════════════════════════════════════

NODEJS_VERSION="v18.20.4"
NODEJS_ZIP_URL="https://github.com/nodejs-mobile/nodejs-mobile/releases/download/${NODEJS_VERSION}/nodejs-mobile-${NODEJS_VERSION}-android.zip"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ANDROID_DIR="$SCRIPT_DIR/android"
JNI_LIBS_DIR="$ANDROID_DIR/app/src/main/jniLibs"
CPP_DIR="$ANDROID_DIR/app/src/main/cpp"
JAVA_DIR="$ANDROID_DIR/app/src/main/java/com/nexusconverter/app"
ASSETS_DIR="$ANDROID_DIR/app/src/main/assets"
NODEJS_PROJECT_DIR="$SCRIPT_DIR/nodejs-project"
BRIDGE_DIR="$SCRIPT_DIR/nodejs-bridge"

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  NEXUS CONVERTER — Android Node.js Integration Setup        ║"
echo "╚══════════════════════════════════════════════════════════════╝"

# Check prerequisites
if [ ! -d "$ANDROID_DIR" ]; then
  echo "Error: Android project not found at $ANDROID_DIR"
  echo "Run 'npx cap add android' first."
  exit 1
fi

if [ ! -d "$NODEJS_PROJECT_DIR" ]; then
  echo "Error: Bundled API server not found at $NODEJS_PROJECT_DIR"
  echo "Run './bundle-api-server.sh' first."
  exit 1
fi

# ─── Step 1: Download & extract libnode.so ────────────────────────────────────

echo ""
echo "[1/6] Downloading Node.js Mobile library ${NODEJS_VERSION}..."
NODEJS_ZIP="/tmp/nodejs-mobile-${NODEJS_VERSION}-android.zip"

if [ ! -f "$NODEJS_ZIP" ]; then
  curl -fsSL -o "$NODEJS_ZIP" "$NODEJS_ZIP_URL"
fi

echo "[2/6] Extracting libnode.so to jniLibs..."
mkdir -p "$JNI_LIBS_DIR"
unzip -o "$NODEJS_ZIP" "bin/*" -d /tmp/nodejs-mobile-extract/ > /dev/null

for arch in arm64-v8a armeabi-v7a x86_64; do
  mkdir -p "$JNI_LIBS_DIR/$arch"
  cp "/tmp/nodejs-mobile-extract/bin/$arch/libnode.so" "$JNI_LIBS_DIR/$arch/" 2>/dev/null || true
done

# Copy headers
mkdir -p "$JNI_LIBS_DIR/include"
cp -r /tmp/nodejs-mobile-extract/include/* "$JNI_LIBS_DIR/include/"
rm -rf /tmp/nodejs-mobile-extract

echo "[3/6] Adding C++ JNI bridge code..."
mkdir -p "$CPP_DIR"
cp "$BRIDGE_DIR/native-lib.cpp" "$CPP_DIR/"
cp "$BRIDGE_DIR/CMakeLists.txt" "$ANDROID_DIR/app/"

echo "[4/6] Adding Java service and runner..."
mkdir -p "$JAVA_DIR"
cp "$BRIDGE_DIR/NodeRunner.java" "$JAVA_DIR/"
cp "$BRIDGE_DIR/NodeServerService.java" "$JAVA_DIR/"

echo "[5/6] Bundling API server assets..."
mkdir -p "$ASSETS_DIR"
cp -r "$NODEJS_PROJECT_DIR" "$ASSETS_DIR/nodejs-project"

# ─── Step 6: Patch build.gradle ───────────────────────────────────────────────

echo "[6/6] Patching build.gradle..."
BUILD_GRADLE="$ANDROID_DIR/app/build.gradle"

if ! grep -q "externalNativeBuild" "$BUILD_GRADLE" 2>/dev/null; then
  sed -i 's/android {/android {\n    externalNativeBuild {\n        cmake {\n            path "CMakeLists.txt"\n            arguments "-DANDROID_STL=c++_shared"\n        }\n    }/' "$BUILD_GRADLE"

  sed -i 's/defaultConfig {/defaultConfig {\n        ndk {\n            abiFilters "armeabi-v7a", "arm64-v8a", "x86_64"\n        }/' "$BUILD_GRADLE"

  # Ensure minSdkVersion >= 24 for nodejs-mobile
  sed -i 's/minSdkVersion [0-9]*/minSdkVersion 24/' "$BUILD_GRADLE"
fi

if ! grep -q "jniLibs.srcDirs" "$BUILD_GRADLE" 2>/dev/null; then
  sed -i '/android {/a\    sourceSets {\n        main {\n            jniLibs.srcDirs "src\/main\/jniLibs"\n        }\n    }' "$BUILD_GRADLE"
fi

# ─── Step 7: Patch MainActivity ───────────────────────────────────────────────

MAIN_ACTIVITY="$JAVA_DIR/MainActivity.java"
if [ ! -f "$MAIN_ACTIVITY" ]; then
  echo "Warning: MainActivity.java not found at $MAIN_ACTIVITY"
  echo "Creating MainActivity with server startup..."
  cat > "$MAIN_ACTIVITY" << 'EOF'
package com.nexusconverter.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        NodeRunner.startNode(this.getApplicationContext());
    }
}
EOF
fi

# ─── Step 8: Patch AndroidManifest.xml ────────────────────────────────────────

MANIFEST="$ANDROID_DIR/app/src/main/AndroidManifest.xml"
if [ -f "$MANIFEST" ]; then
  if ! grep -q "NodeServerService" "$MANIFEST" 2>/dev/null; then
    sed -i 's|</application>|        <service android:name=".NodeServerService" android:exported="false" />\n    </application>|' "$MANIFEST"
  fi
fi

# ─── Cleanup ───────────────────────────────────────────────────────────────────

echo ""
echo "✓ Android project setup complete!"
echo "  - libnode.so: $JNI_LIBS_DIR"
echo "  - JNI bridge: $CPP_DIR"
echo "  - Node.js server: $ASSETS_DIR/nodejs-project"
echo "  - Service: $JAVA_DIR/NodeServerService.java"
echo ""
echo "Next: Run 'npx cap sync android' then build with Gradle."
