package com.puredial.suite;

import android.content.ContentProviderOperation;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.media.MediaRecorder;
import android.net.Uri;
import android.os.Bundle;
import android.provider.ContactsContract;
import android.provider.Telephony;
import android.telecom.TelecomManager;
import android.telephony.SmsManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.util.ArrayList;

/**
 * NativeBridge:
 * Exposes real Android hardware Telephony, SIM SMS, Call Recording, Anti-Bomber,
 * and Contacts Provider APIs to the WebView UI via window.AndroidNativeBridge.
 */
public class NativeBridge {
    private final Context context;
    private final WebView webView;
    private MediaRecorder activeRecorder;
    private String currentRecordingPath;

    public NativeBridge(Context context, WebView webView) {
        this.context = context;
        this.webView = webView;
    }

    @JavascriptInterface
    public void requestSimPermissions() {
        if (context instanceof MainActivity) {
            ((MainActivity) context).runOnUiThread(() -> ((MainActivity) context).requestLocalSimRuntimePermissions());
        }
    }

    @JavascriptInterface
    public String getLocalSimStatusJson() {
        try {
            android.telephony.TelephonyManager tm = (android.telephony.TelephonyManager) context.getSystemService(Context.TELEPHONY_SERVICE);
            JSONObject obj = new JSONObject();
            if (tm != null) {
                int simState = tm.getSimState();
                boolean simReady = (simState == android.telephony.TelephonyManager.SIM_STATE_READY);
                String carrier = tm.getNetworkOperatorName();
                obj.put("simReady", simReady);
                obj.put("carrierName", carrier != null && !carrier.isEmpty() ? carrier : "Local SIM");
                obj.put("simStateCode", simState);
            } else {
                obj.put("simReady", false);
                obj.put("carrierName", "No SIM Detected");
            }
            return obj.toString();
        } catch (Exception e) {
            return "{\"simReady\":false,\"carrierName\":\"Permission Required\"}";
        }
    }

    @JavascriptInterface
    public boolean placeRealSimCall(String phoneNumber) {
        try {
            TelecomManager tm = (TelecomManager) context.getSystemService(Context.TELECOM_SERVICE);
            Uri uri = Uri.fromParts("tel", phoneNumber, null);
            if (tm != null) {
                Bundle extras = new Bundle();
                tm.placeCall(uri, extras);
                return true;
            } else {
                Intent callIntent = new Intent(Intent.ACTION_CALL, uri);
                callIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(callIntent);
                return true;
            }
        } catch (SecurityException e) {
            Intent dialIntent = new Intent(Intent.ACTION_DIAL, Uri.fromParts("tel", phoneNumber, null));
            dialIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(dialIntent);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    @JavascriptInterface
    public void answerRingingCall() {
        InCallServiceImplementation.answerCurrentCall();
    }

    @JavascriptInterface
    public void endActiveCall() {
        InCallServiceImplementation.disconnectCurrentCall();
    }

    @JavascriptInterface
    public void setCallHold(boolean hold) {
        InCallServiceImplementation.setHoldState(hold);
    }

    @JavascriptInterface
    public void setCallMute(boolean muted) {
        InCallServiceImplementation.setMutedState(muted);
    }

    @JavascriptInterface
    public void setSpeakerphone(boolean speaker) {
        InCallServiceImplementation.setSpeakerState(speaker);
    }

    @JavascriptInterface
    public void sendDtmfTone(String digit) {
        if (digit != null && !digit.isEmpty()) {
            InCallServiceImplementation.playDtmf(digit.charAt(0));
        }
    }

    @JavascriptInterface
    public void swapCalls() {
        InCallServiceImplementation.swapActiveAndHeldCalls();
    }

    @JavascriptInterface
    public void mergeCalls() {
        InCallServiceImplementation.mergeCallsIntoConference();
    }

    @JavascriptInterface
    public boolean sendRealSimSms(String recipientPhone, String messageBody) {
        try {
            Intent smsIntent = new Intent(Intent.ACTION_SENDTO, Uri.parse("smsto:" + recipientPhone));
            smsIntent.putExtra("sms_body", messageBody != null ? messageBody : "");
            smsIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(smsIntent);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    @JavascriptInterface
    public String startNativeCallRecording(String callerName) {
        try {
            stopNativeCallRecording();
            File dir = new File(context.getFilesDir(), "call_recordings");
            if (!dir.exists()) {
                dir.mkdirs();
            }
            String safeName = callerName != null ? callerName.replaceAll("[^a-zA-Z0-9_-]", "_") : "call";
            File outFile = new File(dir, "rec_" + safeName + "_" + System.currentTimeMillis() + ".m4a");
            currentRecordingPath = outFile.getAbsolutePath();

            activeRecorder = new MediaRecorder();
            activeRecorder.setAudioSource(MediaRecorder.AudioSource.VOICE_RECOGNITION);
            activeRecorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);
            activeRecorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC);
            activeRecorder.setAudioEncodingBitRate(128000);
            activeRecorder.setAudioSamplingRate(44100);
            activeRecorder.setOutputFile(currentRecordingPath);
            activeRecorder.prepare();
            activeRecorder.start();
            return currentRecordingPath;
        } catch (Exception e) {
            activeRecorder = null;
            return "";
        }
    }

    @JavascriptInterface
    public String stopNativeCallRecording() {
        if (activeRecorder != null) {
            try {
                activeRecorder.stop();
            } catch (Exception ignored) {
            }
            try {
                activeRecorder.release();
            } catch (Exception ignored) {
            }
            activeRecorder = null;
            return currentRecordingPath != null ? currentRecordingPath : "";
        }
        return "";
    }

    @JavascriptInterface
    public void syncAntiBomberSettings(boolean enabled, String trustListJson, String contactsJson) {
        SharedPreferences prefs = context.getSharedPreferences("PureSuitePrefs", Context.MODE_PRIVATE);
        prefs.edit()
                .putBoolean("anti_bomber_enabled", enabled)
                .putString("trust_list_json", trustListJson != null ? trustListJson : "[]")
                .putString("contacts_json", contactsJson != null ? contactsJson : "[]")
                .apply();
    }

    @JavascriptInterface
    public String getDeviceContactsJson() {
        JSONArray result = new JSONArray();
        ContentResolver cr = context.getContentResolver();
        try (Cursor cursor = cr.query(
                ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
                new String[]{
                        ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
                        ContactsContract.CommonDataKinds.Phone.NUMBER
                },
                null,
                null,
                ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME + " ASC")) {
            if (cursor != null) {
                int nameIdx = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME);
                int numIdx = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.NUMBER);
                while (cursor.moveToNext()) {
                    String name = nameIdx >= 0 ? cursor.getString(nameIdx) : "";
                    String phone = numIdx >= 0 ? cursor.getString(numIdx) : "";
                    if (name != null && phone != null && !phone.isEmpty()) {
                        JSONObject obj = new JSONObject();
                        obj.put("name", name);
                        obj.put("phone", phone);
                        result.put(obj);
                    }
                }
            }
        } catch (Exception ignored) {
        }
        return result.toString();
    }

    @JavascriptInterface
    public String getSignedInGoogleAccountsJson() {
        JSONArray result = new JSONArray();
        try {
            android.accounts.AccountManager am = android.accounts.AccountManager.get(context);
            if (am != null) {
                android.accounts.Account[] accounts = am.getAccountsByType("com.google");
                for (int i = 0; i < accounts.length; i++) {
                    android.accounts.Account acc = accounts[i];
                    if (acc.name != null && !acc.name.isEmpty()) {
                        JSONObject obj = new JSONObject();
                        obj.put("email", acc.name);
                        String prefix = acc.name.contains("@") ? acc.name.substring(0, acc.name.indexOf("@")) : acc.name;
                        obj.put("displayName", prefix + " (Signed in on Phone)");
                        obj.put("isDefaultPhoneAccount", i == 0);
                        result.put(obj);
                    }
                }
            }
        } catch (Exception ignored) {
        }
        return result.toString();
    }

    @JavascriptInterface
    public boolean saveContactToDevice(String name, String phone) {
        return saveContactToAccount(name, phone, null, null);
    }

    @JavascriptInterface
    public boolean saveContactToGoogleOnDevice(String name, String phone, String googleEmail) {
        if (googleEmail != null && !googleEmail.trim().isEmpty()) {
            return saveContactToAccount(name, phone, "com.google", googleEmail.trim());
        }
        return saveContactToAccount(name, phone, null, null);
    }

    private boolean saveContactToAccount(String name, String phone, String accountType, String accountName) {
        try {
            ArrayList<ContentProviderOperation> ops = new ArrayList<>();
            ops.add(ContentProviderOperation.newInsert(ContactsContract.RawContacts.CONTENT_URI)
                    .withValue(ContactsContract.RawContacts.ACCOUNT_TYPE, accountType)
                    .withValue(ContactsContract.RawContacts.ACCOUNT_NAME, accountName)
                    .build());
            ops.add(ContentProviderOperation.newInsert(ContactsContract.Data.CONTENT_URI)
                    .withValueBackReference(ContactsContract.Data.RAW_CONTACT_ID, 0)
                    .withValue(ContactsContract.Data.MIMETYPE, ContactsContract.CommonDataKinds.StructuredName.CONTENT_ITEM_TYPE)
                    .withValue(ContactsContract.CommonDataKinds.StructuredName.DISPLAY_NAME, name)
                    .build());
            ops.add(ContentProviderOperation.newInsert(ContactsContract.Data.CONTENT_URI)
                    .withValueBackReference(ContactsContract.Data.RAW_CONTACT_ID, 0)
                    .withValue(ContactsContract.Data.MIMETYPE, ContactsContract.CommonDataKinds.Phone.CONTENT_ITEM_TYPE)
                    .withValue(ContactsContract.CommonDataKinds.Phone.NUMBER, phone)
                    .withValue(ContactsContract.CommonDataKinds.Phone.TYPE, ContactsContract.CommonDataKinds.Phone.TYPE_MOBILE)
                    .build());
            context.getContentResolver().applyBatch(ContactsContract.AUTHORITY, ops);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}
