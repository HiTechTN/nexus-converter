package com.nexusconverter.app;

import android.content.Context;
import android.content.res.AssetManager;
import android.util.Log;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.List;

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
            String binDir = filesDir + "/bin";
            String pythonDir = filesDir + "/python";

            // Clean previous extraction first (ensures APK update refreshes binaries)
            deleteRecursive(new File(nodeProjectPath));
            deleteRecursive(new File(binDir));
            deleteRecursive(new File(pythonDir));

            copyAssets(context.getAssets(), NODE_PROJECT_ASSET, nodeProjectPath);
            copyAssets(context.getAssets(), "bin", binDir);
            copyAssets(context.getAssets(), "python", pythonDir);

            chmodExecutable(binDir + "/ffmpeg");
            chmodExecutable(binDir + "/ffprobe");
            chmodExecutable(pythonDir + "/bin/python3");

            String ytdlpScript = binDir + "/yt-dlp";
            String wrapperContent = "#!/system/bin/sh\nexec " + pythonDir + "/bin/python3 " + binDir + "/yt-dlp.zip \"$@\"\n";
            writeFile(ytdlpScript, wrapperContent);
            chmodExecutable(ytdlpScript);

            List<String> argsList = new ArrayList<>();
            argsList.add("node");
            String currentPath = System.getenv("PATH");
            argsList.add("ENV:PATH=" + binDir + ":" + pythonDir + "/bin:" + (currentPath != null ? currentPath : ""));
            argsList.add("ENV:FFMPEG_PATH=" + binDir + "/ffmpeg");
            argsList.add("ENV:YTDLP_PATH=" + ytdlpScript);
            argsList.add(nodeProjectPath + "/main.js");

            String[] args = argsList.toArray(new String[0]);

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

    private static void chmodExecutable(String path) {
        File file = new File(path);
        if (file.exists()) {
            file.setExecutable(true, false);
            Log.i(TAG, "chmod +x " + path);
        }
    }

    private static void writeFile(String path, String content) throws IOException {
        File file = new File(path);
        file.getParentFile().mkdirs();
        try (OutputStream out = new FileOutputStream(file)) {
            out.write(content.getBytes("UTF-8"));
        }
    }

    private static void copyAssets(AssetManager assetManager, String assetPath, String outputPath) throws IOException {
        File outFile = new File(outputPath);

        String[] assets;
        try {
            assets = assetManager.list(assetPath);
        } catch (IOException e) {
            Log.w(TAG, "Asset path not found: " + assetPath + " (" + e.getMessage() + ")");
            return;
        }

        if (assets == null) {
            Log.w(TAG, "Null assets at " + assetPath);
            return;
        }

        if (assets.length == 0) {
            // File (empty directory listing means it's a file in assets)
            File parent = outFile.getParentFile();
            if (parent != null) parent.mkdirs();
            try (InputStream in = assetManager.open(assetPath);
                 OutputStream out = new FileOutputStream(outputPath)) {
                byte[] buffer = new byte[8192];
                int read;
                while ((read = in.read(buffer)) != -1) {
                    out.write(buffer, 0, read);
                }
            }
            Log.i(TAG, "Copied asset " + assetPath + " -> " + outputPath);
        } else {
            // Directory
            outFile.mkdirs();
            for (String asset : assets) {
                String fullAssetPath = assetPath + "/" + asset;
                String fullOutputPath = outputPath + "/" + asset;
                copyAssets(assetManager, fullAssetPath, fullOutputPath);
            }
        }
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
