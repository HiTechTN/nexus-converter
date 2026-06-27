package com.nexusconverter.app;

import android.app.Service;
import android.content.Intent;
import android.os.IBinder;
import android.util.Log;

public class NodeServerService extends Service {

    private static final String TAG = "NEXUS-SERVER";

    @Override
    public void onCreate() {
        super.onCreate();
        Log.i(TAG, "NodeServerService created");
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.i(TAG, "Starting Node.js server service...");
        NodeRunner.startNode(this.getApplicationContext());
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        Log.i(TAG, "NodeServerService destroyed");
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
