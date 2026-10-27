package com.puredial.suite;

import android.app.Activity;
import android.app.role.RoleManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.telecom.TelecomManager;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebView;

import org.json.JSONObject;

/**
 * MainActivity:
 * 1. Splits the installed APK into 2 separate launcher apps (Phone, Contacts)
 *    using PackageManager and <activity-alias> components.
 * 2. Forces Default Caller (ROLE_DIALER) and Default Contacts handler roles on startup.
 * 3. Attaches NativeBridge (window.AndroidNativeBridge) for real SIM calls,
 *    real MediaRecorder call recording, and real ContactsContract synchronization.
 */
public class MainActivity extends Activity {
    private static final int REQUEST_ROLE_DIALER = 1001;
    private static final int REQUEST_SIM_PERMISSIONS = 1003;
    private static WebView activeWebView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 1. Ensure both Split Launcher Icons (Phone, Contacts) are enabled on install
        enableSplitLauncherApps();

        // 2. Request runtime Local SIM Card, Call, Contacts & Audio/Camera permissions
        requestLocalSimRuntimePermissions();

        // 3. Force Default Caller Role before allowing normal operation
        enforceDefaultHandlerRoles();

        // 4. Detect which split launcher icon opened the app
        String launchedMode = resolveLaunchedSplitApp(getIntent());
        loadWebViewWithMode(launchedMode);
    }

    public void requestLocalSimRuntimePermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            String[] permissions = new String[] {
                android.Manifest.permission.CALL_PHONE,
                android.Manifest.permission.READ_PHONE_STATE,
                android.Manifest.permission.READ_PHONE_NUMBERS,
                android.Manifest.permission.ANSWER_PHONE_CALLS,
                android.Manifest.permission.READ_CALL_LOG,
                android.Manifest.permission.WRITE_CALL_LOG,
                android.Manifest.permission.READ_CONTACTS,
                android.Manifest.permission.WRITE_CONTACTS,
                android.Manifest.permission.RECORD_AUDIO,
                android.Manifest.permission.CAMERA
            };
            requestPermissions(permissions, REQUEST_SIM_PERMISSIONS);
        }
    }

    private void enableSplitLauncherApps() {
        PackageManager pm = getPackageManager();
        String pkg = getPackageName();

        String[] aliases = new String[] {
            pkg + ".CallerLauncherAlias",
            pkg + ".ContactsLauncherAlias"
        };

        for (String alias : aliases) {
            ComponentName cn = new ComponentName(pkg, alias);
            pm.setComponentEnabledSetting(
                cn,
                PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
                PackageManager.DONT_KILL_APP
            );
        }
    }

    private void enforceDefaultHandlerRoles() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            RoleManager roleManager = (RoleManager) getSystemService(Context.ROLE_SERVICE);
            if (roleManager != null) {
                if (roleManager.isRoleAvailable(RoleManager.ROLE_DIALER)
                        && !roleManager.isRoleHeld(RoleManager.ROLE_DIALER)) {
                    Intent dialerIntent = roleManager.createRequestRoleIntent(RoleManager.ROLE_DIALER);
                    startActivityForResult(dialerIntent, REQUEST_ROLE_DIALER);
                }
            }
        } else {
            TelecomManager telecomManager = (TelecomManager) getSystemService(Context.TELECOM_SERVICE);
            if (telecomManager != null && !getPackageName().equals(telecomManager.getDefaultDialerPackage())) {
                Intent intent = new Intent(TelecomManager.ACTION_CHANGE_DEFAULT_DIALER);
                intent.putExtra(TelecomManager.EXTRA_CHANGE_DEFAULT_DIALER_PACKAGE_NAME, getPackageName());
                startActivityForResult(intent, REQUEST_ROLE_DIALER);
            }
        }
    }

    private String resolveLaunchedSplitApp(Intent intent) {
        if (intent == null || intent.getComponent() == null) {
            return "caller";
        }
        String className = intent.getComponent().getClassName();
        if (className.endsWith("ContactsLauncherAlias")) {
            return "contacts";
        }
        return "caller";
    }

    private void loadWebViewWithMode(String mode) {
        WebView webView = new WebView(this);
        activeWebView = webView;
        webView.getSettings().setJavaScriptEnabled(true);
        webView.getSettings().setDomStorageEnabled(true);
        webView.getSettings().setMediaPlaybackRequiresUserGesture(false);

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                request.grant(request.getResources());
            }
        });

        webView.addJavascriptInterface(new NativeBridge(this, webView), "AndroidNativeBridge");
        webView.loadUrl("file:///android_asset/public/index.html?app=" + mode);
        setContentView(webView);
    }

    public static void notifyWebViewCallState(String phone, int state) {
        if (activeWebView == null) return;
        activeWebView.post(() -> {
            String safePhone = JSONObject.quote(phone != null ? phone : "");
            activeWebView.evaluateJavascript(
                "window.dispatchEvent(new CustomEvent('native:callState', { detail: { phone: " + safePhone + ", state: " + state + " } }));",
                null
            );
        });
    }
}
