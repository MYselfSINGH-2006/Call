package com.puredial.suite;

import android.content.ContentResolver;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.net.Uri;
import android.provider.ContactsContract;
import android.telecom.Call;
import android.telecom.CallScreeningService;

/**
 * AntiBomberScreeningService:
 * Real Android CallScreeningService that checks incoming caller phone numbers
 * against the user's saved Contacts and Trust List, and silently rejects
 * non-contact or high-frequency call bombing with zero notification and zero popup
 * when ANTI BOMBER is enabled.
 */
public class AntiBomberScreeningService extends CallScreeningService {
    @Override
    public void onScreenCall(Call.Details callDetails) {
        SharedPreferences prefs = getSharedPreferences("PureSuitePrefs", MODE_PRIVATE);
        boolean antiBomberEnabled = prefs.getBoolean("anti_bomber_enabled", false);

        String incomingNumber = "";
        if (callDetails != null && callDetails.getHandle() != null) {
            incomingNumber = callDetails.getHandle().getSchemeSpecificPart();
        }

        boolean isKnownOrTrusted = isSavedContact(incomingNumber) || isTrustedNumber(prefs, incomingNumber);

        CallResponse.Builder response = new CallResponse.Builder();
        if (antiBomberEnabled && !isKnownOrTrusted) {
            // Silently block call bombing without any system notification, ringtone, or popup
            response.setDisallowCall(true)
                    .setRejectCall(true)
                    .setSkipCallLog(false)
                    .setSkipNotification(true);
        } else {
            response.setDisallowCall(false)
                    .setRejectCall(false)
                    .setSkipCallLog(false)
                    .setSkipNotification(false);
        }
        respondToCall(callDetails, response.build());
    }

    private boolean isSavedContact(String phoneNumber) {
        if (phoneNumber == null || phoneNumber.isEmpty()) return false;
        ContentResolver cr = getContentResolver();
        Uri uri = Uri.withAppendedPath(ContactsContract.PhoneLookup.CONTENT_FILTER_URI, Uri.encode(phoneNumber));
        try (Cursor cursor = cr.query(uri, new String[]{ContactsContract.PhoneLookup._ID}, null, null, null)) {
            return cursor != null && cursor.moveToFirst();
        } catch (Exception e) {
            return false;
        }
    }

    private boolean isTrustedNumber(SharedPreferences prefs, String phoneNumber) {
        if (phoneNumber == null || phoneNumber.isEmpty()) return false;
        String cleanDigits = phoneNumber.replaceAll("\\D", "");
        if (cleanDigits.length() < 7) return false;
        String tail = cleanDigits.substring(Math.max(0, cleanDigits.length() - 10));
        String trustJson = prefs.getString("trust_list_json", "[]");
        String contactsJson = prefs.getString("contacts_json", "[]");
        return trustJson.replaceAll("\\D", "").contains(tail) || contactsJson.replaceAll("\\D", "").contains(tail);
    }
}
