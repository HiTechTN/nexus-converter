package com.nexusconverter.app;

import android.content.Context;
import android.content.res.AssetManager;
import android.util.Log;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

public class NodeRunner {

    private static final String TAG = "NEXUS-SERVER";
    private static final String NODE_PROJECT_ASSET = "nodejs-project";
    private static final int SERVER_PORT = 3000;

    private static native int startNodeWithArguments(String[] arguments);

    private static boolean nodeRunning = false;

    public static synchronized void startNode(Context context) {
        if (nodeRunning) {
            Log.w(TAG, "Node.js is already running");
            return;
        }

        try {
            String filesDir = context.getFilesDir().getAbsolutePath();
            String nodeProjectPath = filesDir + "/" + NODE_PROJECT_ASSET;

            copyAssets(context.getAssets(), NODE_PROJECT_ASSET, nodeProjectPath);

            String[] args = {
                "node",
                nodeProjectPath + "/main.js"
            };

            new Thread(() -> {
                try {
                    Log.i(TAG, "Starting Node.js server on port " + SERVER_PORT + "...");
                    nodeRunning = true;
                    startNodeWithArguments(args);
                } catch (Exception e) {
                    Log.e(TAG, "Node.js exited: " + e.getMessage());
                    nodeRunning = false;
                }
            }, "nodejs-thread").start();

        } catch (Exception e) {
            Log.e(TAG, "Failed to start Node.js: " + e.getMessage());
            nodeRunning = false;
        }
    }

    public static boolean isRunning() {
        return nodeRunning;
    }

    public static int getPort() {
        return SERVER_PORT;
    }

    private static void copyAssets(AssetManager assetManager, String assetPath, String outputPath) throws IOException {
        File outFile = new File(outputPath);

        if (outFile.exists()) {
            deleteRecursive(outFile);
        }

        String[] assets;
        try {
            assets = assetManager.list(assetPath);
        } catch (IOException e) {
            Log.e(TAG, "No nodejs-project assets found: " + e.getMessage());
            return;
        }

        if (assets == null || assets.length == 0) {
            Log.e(TAG, "Empty nodejs-project assets");
            return;
        }

        for (String asset : assets) {
            String fullAssetPath = assetPath + "/" + asset;
            String fullOutputPath = outputPath + "/" + asset;

            String[] subAssets = assetManager.list(fullAssetPath);
            if (subAssets != null && subAssets.length > 0) {
                new File(fullOutputPath).mkdirs();
                copyAssets(assetManager, fullAssetPath, fullOutputPath);
            } else {
                try (InputStream in = assetManager.open(fullAssetPath);
                     OutputStream out = new FileOutputStream(fullOutputPath)) {
                    byte[] buffer = new byte[8192];
                    int read;
                    while ((read = in.read(buffer)) != -1) {
                        out.write(buffer, 0, read);
                    }
                }
            }
        }

        Log.i(TAG, "Copied assets to " + outputPath);
    }

    private static void deleteRecursive(File file) {
        if (file.isDirectory()) {
            File[] children = file.listFiles();
            if (children != null) {
                for (File child : children) {
                    deleteRecursive(child);
                }
            }
        }
        file.delete();
    }
}
