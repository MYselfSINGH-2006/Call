import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express, { Request, Response } from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

app.use('/api', express.json({ limit: '10mb' }));

// ============================================================================
// REAL-TIME TELEPHONY, WEBRTC SIGNALING & SMS RELAY ENGINE (Server State)
// ============================================================================

interface ConnectedPeer {
  clientId: string;
  phone: string;
  normalizedPhone: string;
  name: string;
  antiBomber: boolean;
  contacts: string[];
  trustList: string[];
  lastSeen: number;
  res: Response;
}

interface StoredSmsEvent {
  id: number;
  fromPhone: string;
  fromName: string;
  toPhone: string;
  text: string;
  time: string;
  timestamp: number;
}

const connectedPeers = new Map<string, ConnectedPeer>();
const recentSmsHistory: StoredSmsEvent[] = [];
const callFloodTracker = new Map<string, number[]>();
const smsFloodTracker = new Map<string, number[]>();

function normalizeDigits(phone: string): string {
  return (phone || '').replace(/\D/g, '');
}

function phonesMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  const cleanA = a.trim().toLowerCase();
  const cleanB = b.trim().toLowerCase();
  if (cleanA === cleanB) return true;
  const dA = normalizeDigits(a);
  const dB = normalizeDigits(b);
  if (dA.length >= 4 && dB.length >= 4) {
    if (dA === dB) return true;
    const tailA = dA.slice(-10);
    const tailB = dB.slice(-10);
    if (tailA.length >= 7 && tailA === tailB) return true;
  }
  return false;
}

function isRateLimited(tracker: Map<string, number[]>, key: string, maxPerMinute: number): boolean {
  const now = Date.now();
  const windowStart = now - 60_000;
  const list = (tracker.get(key) || []).filter(t => t >= windowStart);
  list.push(now);
  tracker.set(key, list);
  return list.length > maxPerMinute;
}

function isOtpOrBulkSpam(sender: string, text: string): boolean {
  const lower = (text || '').toLowerCase();
  const senderUpper = (sender || '').toUpperCase();
  const hasBulkPrefix = /^(VM-|AD-|JD-|BZ-|AX-|TM-|QP-|VK-|CP-|IX-|BP-|JM-|VD-|MD-|TX-|HP-)/.test(senderUpper);
  const isShortCode = /^\d{5,6}$/.test((sender || '').replace(/\D/g, ''));
  const hasDigits = /\b\d{4,8}\b/.test(lower);
  const hasOtpKeywords =
    lower.includes('otp') ||
    lower.includes('verification') ||
    lower.includes('security code') ||
    lower.includes('one time password') ||
    lower.includes('one-time') ||
    lower.includes('login code') ||
    lower.includes('auth code') ||
    lower.includes('passcode') ||
    lower.includes('do not share') ||
    lower.includes('valid for');
  return hasBulkPrefix || isShortCode || hasOtpKeywords || (hasDigits && (lower.includes('code') || lower.includes('pin') || lower.includes('verify')));
}

function broadcastEvent(eventType: string, payload: unknown, excludeClientId?: string, targetPhone?: string) {
  const message = `data: ${JSON.stringify({ type: eventType, payload })}\n\n`;
  for (const [clientId, peer] of connectedPeers.entries()) {
    if (excludeClientId && clientId === excludeClientId) continue;
    if (targetPhone && peer.phone && !phonesMatch(peer.phone, targetPhone)) {
      // Still deliver if targetPhone is not matched to a specific peer so open second tabs can answer!
      const anyExactMatch = Array.from(connectedPeers.values()).some(
        p => p.clientId !== excludeClientId && phonesMatch(p.phone, targetPhone)
      );
      if (anyExactMatch) continue;
    }
    try {
      peer.res.write(message);
    } catch {
      connectedPeers.delete(clientId);
    }
  }
}

function getActiveDirectory() {
  const list: { clientId: string; phone: string; name: string }[] = [];
  for (const peer of connectedPeers.values()) {
    list.push({
      clientId: peer.clientId,
      phone: peer.phone,
      name: peer.name,
    });
  }
  return list;
}

// 1. Server-Sent Events (SSE) stream for real-time incoming calls, WebRTC SDP/ICE, and SMS
app.get('/api/events', (req: Request, res: Response) => {
  const clientId = String(req.query['clientId'] || `peer_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
  const phone = String(req.query['phone'] || '+91 98765 43210');
  const name = String(req.query['name'] || 'PureSuite User');
  const antiBomber = req.query['antiBomber'] === 'true';

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const peer: ConnectedPeer = {
    clientId,
    phone,
    normalizedPhone: normalizeDigits(phone),
    name,
    antiBomber,
    contacts: [],
    trustList: [],
    lastSeen: Date.now(),
    res,
  };

  connectedPeers.set(clientId, peer);

  // Send initial state and active peer directory
  res.write(
    `data: ${JSON.stringify({
      type: 'init',
      payload: {
        clientId,
        activePeers: getActiveDirectory(),
        recentSms: recentSmsHistory.slice(-50),
      },
    })}\n\n`
  );

  // Notify all peers of updated online directory
  broadcastEvent('presence:update', { activePeers: getActiveDirectory() }, clientId);

  const heartbeat = setInterval(() => {
    try {
      res.write(`: heartbeat\n\n`);
    } catch {
      clearInterval(heartbeat);
      connectedPeers.delete(clientId);
    }
  }, 20000);

  req.on('close', () => {
    clearInterval(heartbeat);
    connectedPeers.delete(clientId);
    broadcastEvent('presence:update', { activePeers: getActiveDirectory() });
  });
});

// 2. Update peer presence, line phone number, and Anti-Bomber firewall rules
app.post('/api/presence', (req: Request, res: Response) => {
  const { clientId, phone, name, antiBomber, contacts, trustList } = req.body || {};
  if (clientId && connectedPeers.has(clientId)) {
    const peer = connectedPeers.get(clientId)!;
    if (phone) {
      peer.phone = String(phone);
      peer.normalizedPhone = normalizeDigits(String(phone));
    }
    if (name) peer.name = String(name);
    if (typeof antiBomber === 'boolean') peer.antiBomber = antiBomber;
    if (Array.isArray(contacts)) peer.contacts = contacts.map(String);
    if (Array.isArray(trustList)) peer.trustList = trustList.map(String);
    peer.lastSeen = Date.now();
  }
  broadcastEvent('presence:update', { activePeers: getActiveDirectory() });
  res.json({ ok: true, activePeers: getActiveDirectory() });
});

// 3. Real-Time WebRTC Call Signaling Endpoint (offer, answer, ice, hangup, reject, hold, resume, dtmf)
app.post('/api/call/signal', (req: Request, res: Response) => {
  const {
    clientId,
    signalType,
    fromPhone,
    fromName,
    toPhone,
    callId,
    sdp,
    candidate,
    isVideo,
    dtmfDigit,
  } = req.body || {};

  if (!signalType) {
    res.status(400).json({ error: 'Missing signalType' });
    return;
  }

  // Server-side Anti-Bomber Call Flood & Non-Contact Firewall check on incoming 'offer'
  if (signalType === 'offer') {
    const floodBlocked = isRateLimited(callFloodTracker, normalizeDigits(fromPhone || clientId || 'unknown'), 4);
    for (const peer of connectedPeers.values()) {
      if (peer.clientId === clientId) continue;
      const isTarget = !toPhone || phonesMatch(peer.phone, toPhone) || connectedPeers.size <= 2;
      if (isTarget && peer.antiBomber) {
        const isSavedOrTrusted =
          peer.contacts.some(c => phonesMatch(c, fromPhone)) ||
          peer.trustList.some(t => phonesMatch(t, fromPhone));
        if (!isSavedOrTrusted || floodBlocked) {
          // Silently drop call for the protected receiver and notify caller that Anti-Bomber rejected it
          try {
            peer.res.write(
              `data: ${JSON.stringify({
                type: 'antibomber:call_blocked',
                payload: { fromPhone, fromName, callId, timestamp: Date.now(), reason: floodBlocked ? 'Flood rate-limit' : 'Non-contact silent block' },
              })}\n\n`
            );
          } catch {
            // ignore
          }
          res.json({ ok: true, blockedByAntiBomber: true });
          return;
        }
      }
    }
  }

  broadcastEvent(
    `call:${signalType}`,
    {
      clientId,
      signalType,
      fromPhone,
      fromName,
      toPhone,
      callId,
      sdp,
      candidate,
      isVideo: !!isVideo,
      dtmfDigit,
      timestamp: Date.now(),
    },
    clientId,
    toPhone
  );

  res.json({ ok: true, deliveredPeers: Math.max(0, connectedPeers.size - 1) });
});

// 4. Real-Time SMS Dispatch & Anti-Bomber OTP/Spam Firewall Endpoint
app.post('/api/sms/send', (req: Request, res: Response) => {
  const { clientId, fromPhone, fromName, toPhone, text, time } = req.body || {};
  if (!toPhone || !text) {
    res.status(400).json({ error: 'Recipient phone and text are required' });
    return;
  }

  const floodBlocked = isRateLimited(smsFloodTracker, normalizeDigits(fromPhone || clientId || 'unknown'), 5);
  const otpDetected = isOtpOrBulkSpam(fromPhone || '', text);

  const smsEvent: StoredSmsEvent = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    fromPhone: String(fromPhone || '+91 98765 43210'),
    fromName: String(fromName || fromPhone || 'Sender'),
    toPhone: String(toPhone),
    text: String(text),
    time: String(time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })),
    timestamp: Date.now(),
  };

  recentSmsHistory.push(smsEvent);
  if (recentSmsHistory.length > 200) {
    recentSmsHistory.shift();
  }

  // Deliver to target peer(s), enforcing server-side Anti-Bomber silent filter
  for (const [peerId, peer] of connectedPeers.entries()) {
    if (clientId && peerId === clientId) continue;
    const isTarget = phonesMatch(peer.phone, toPhone) || connectedPeers.size <= 2;
    if (!isTarget) continue;

    if (peer.antiBomber) {
      const isSavedOrTrusted =
        peer.contacts.some(c => phonesMatch(c, smsEvent.fromPhone)) ||
        peer.trustList.some(t => phonesMatch(t, smsEvent.fromPhone));

      if (!isSavedOrTrusted || otpDetected || floodBlocked) {
        try {
          peer.res.write(
            `data: ${JSON.stringify({
              type: 'antibomber:sms_blocked',
              payload: {
                ...smsEvent,
                reason: otpDetected ? 'OTP/Verification pattern' : floodBlocked ? 'SMS flood rate-limit' : 'Non-contact sender',
              },
            })}\n\n`
          );
        } catch {
          // ignore
        }
        continue;
      }
    }

    try {
      peer.res.write(
        `data: ${JSON.stringify({
          type: 'sms:received',
          payload: smsEvent,
        })}\n\n`
      );
    } catch {
      connectedPeers.delete(peerId);
    }
  }

  res.json({ ok: true, message: smsEvent });
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
