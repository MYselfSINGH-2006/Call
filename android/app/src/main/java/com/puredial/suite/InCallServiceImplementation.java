package com.puredial.suite;

import android.telecom.Call;
import android.telecom.CallAudioState;
import android.telecom.InCallService;
import android.telecom.VideoProfile;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * InCallServiceImplementation:
 * Real Android Telecom InCallService (ROLE_DIALER requirement).
 * Manages active GSM/VoLTE SIM calls, multi-party Hold, Swap, Conference Merge,
 * Mute, Speakerphone routing, and DTMF tone transmission.
 */
public class InCallServiceImplementation extends InCallService {
    private static InCallServiceImplementation instance;
    private static final List<Call> activeCalls = new ArrayList<>();

    private final Call.Callback callCallback = new Call.Callback() {
        @Override
        public void onStateChanged(Call call, int state) {
            super.onStateChanged(call, state);
            MainActivity.notifyWebViewCallState(getPhoneNumber(call), state);
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
    }

    @Override
    public void onCallAdded(Call call) {
        super.onCallAdded(call);
        activeCalls.add(call);
        call.registerCallback(callCallback);
        MainActivity.notifyWebViewCallState(getPhoneNumber(call), call.getState());
    }

    @Override
    public void onCallRemoved(Call call) {
        super.onCallRemoved(call);
        call.unregisterCallback(callCallback);
        activeCalls.remove(call);
        MainActivity.notifyWebViewCallState(getPhoneNumber(call), Call.STATE_DISCONNECTED);
    }

    private static String getPhoneNumber(Call call) {
        if (call != null && call.getDetails() != null && call.getDetails().getHandle() != null) {
            return call.getDetails().getHandle().getSchemeSpecificPart();
        }
        return "Unknown";
    }

    public static void answerCurrentCall() {
        for (Call c : activeCalls) {
            if (c.getState() == Call.STATE_RINGING) {
                c.answer(VideoProfile.STATE_AUDIO_ONLY);
                return;
            }
        }
    }

    public static void disconnectCurrentCall() {
        if (activeCalls.isEmpty()) return;
        Call target = activeCalls.get(activeCalls.size() - 1);
        target.disconnect();
    }

    public static void setHoldState(boolean hold) {
        for (Call c : activeCalls) {
            if (hold && c.getState() == Call.STATE_ACTIVE) {
                c.hold();
                return;
            } else if (!hold && c.getState() == Call.STATE_HOLDING) {
                c.unhold();
                return;
            }
        }
    }

    public static void setMutedState(boolean muted) {
        if (instance != null) {
            instance.setMuted(muted);
        }
    }

    public static void setSpeakerState(boolean speaker) {
        if (instance != null) {
            instance.setAudioRoute(speaker ? CallAudioState.ROUTE_SPEAKER : CallAudioState.ROUTE_EARPIECE);
        }
    }

    public static void playDtmf(char digit) {
        for (Call c : activeCalls) {
            if (c.getState() == Call.STATE_ACTIVE) {
                c.playDtmfTone(digit);
                c.stopDtmfTone();
                return;
            }
        }
    }

    public static void swapActiveAndHeldCalls() {
        if (activeCalls.size() < 2) return;
        for (Call c : activeCalls) {
            if (c.getState() == Call.STATE_HOLDING) {
                c.unhold();
                return;
            }
        }
    }

    public static void mergeCallsIntoConference() {
        if (activeCalls.size() < 2) return;
        Call primary = activeCalls.get(0);
        Call secondary = activeCalls.get(1);
        List<Call> conferenceable = primary.getConferenceableCalls();
        if (conferenceable != null && conferenceable.contains(secondary)) {
            primary.conference(secondary);
        } else {
            secondary.conference(primary);
        }
    }

    public static List<Call> getCallsSnapshot() {
        return Collections.unmodifiableList(activeCalls);
    }
}
