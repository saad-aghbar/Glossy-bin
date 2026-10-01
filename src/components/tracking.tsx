"use client";

import { useEffect, useSyncExternalStore } from "react";
import { purchaseEvent, shouldLoadPixel, type TrackingChoice } from "@/lib/tracking";

const COOKIE = "glossy_tracking";

function readChoice(): TrackingChoice {
  const item = document.cookie.split("; ").find((part) => part.startsWith(`${COOKIE}=`));
  const value = item?.slice(COOKIE.length + 1);
  return value === "granted" || value === "denied" ? value : null;
}

function writeChoice(choice: Exclude<TrackingChoice, null>) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${COOKIE}=${choice}; Path=/; Max-Age=15552000; SameSite=Lax${secure}`;
  listeners.forEach((listener) => listener());
}

type ChoiceView = TrackingChoice | "pending" | "ask";
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function choiceSnapshot(): ChoiceView {
  return readChoice() ?? "ask";
}

function choiceOnServer(): ChoiceView {
  return "pending";
}

type Fbq = {
  (command: string, event: string, params?: Record<string, unknown>, options?: { eventID?: string }): void;
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[];
  loaded: boolean;
  version: string;
  push: Fbq;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
    __glossyPixel?: string;
  }
}

function installPixel(pixelId: string) {
  if (window.__glossyPixel === pixelId) return;
  if (window.fbq) {
    window.__glossyPixel = pixelId;
    return;
  }
  const queued: unknown[] = [];
  const fbq = function (...args: unknown[]) {
    const self = fbq as Fbq;
    if (self.callMethod) self.callMethod(...args);
    else self.queue.push(args);
  } as Fbq;
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = queued;
  window.fbq = fbq;
  window._fbq = fbq;
  const script = document.createElement("script");
  script.id = "meta-pixel";
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.body.appendChild(script);
  window.fbq("init", pixelId);
  window.fbq("track", "PageView");
  window.__glossyPixel = pixelId;
}

export function TrackingConsent({ isAdmin, pixelId }: { isAdmin: boolean; pixelId: string }) {
  const choice = useSyncExternalStore(subscribe, choiceSnapshot, choiceOnServer);

  useEffect(() => {
    if (choice === "granted" && shouldLoadPixel({ pixelId, consent: "granted", isAdmin })) {
      installPixel(pixelId);
    }
  }, [choice, isAdmin, pixelId]);

  if (!pixelId || isAdmin || choice !== "ask") return null;
  return (
    <div className="card fixed inset-x-4 bottom-4 z-40 mx-auto grid max-w-xl gap-3 p-4">
      <p>قياس الزيارات اختياري. يمكنك التسوق بدونه.</p>
      <div className="flex flex-wrap gap-3">
        <button
          className="btn btn-primary"
          type="button"
          onClick={() => {
            writeChoice("granted");
          }}
        >
          قبول
        </button>
        <button
          className="btn btn-ghost"
          type="button"
          onClick={() => {
            writeChoice("denied");
          }}
        >
          رفض
        </button>
      </div>
    </div>
  );
}

export function TrackingPurchase({
  pixelId,
  isAdmin,
  currency,
  totalMinor,
  minorUnit,
  eventId,
}: {
  pixelId: string;
  isAdmin: boolean;
  currency: string;
  totalMinor: number;
  minorUnit: number;
  eventId: string;
}) {
  useEffect(() => {
    if (!shouldLoadPixel({ pixelId, consent: readChoice(), isAdmin })) return;
    const key = `glossy-purchase-${eventId}`;
    if (window.sessionStorage.getItem(key)) return;
    const event = purchaseEvent({ currency, totalMinor, minorUnit, publicToken: eventId });
    let stopped = false;
    const send = () => {
      if (stopped || window.sessionStorage.getItem(key) || typeof window.fbq !== "function") return false;
      window.fbq("track", "Purchase", { currency: event.currency, value: event.value }, { eventID: event.eventID });
      window.sessionStorage.setItem(key, "1");
      return true;
    };
    if (send()) return;
    const timer = window.setInterval(() => {
      if (send()) window.clearInterval(timer);
    }, 200);
    const stop = window.setTimeout(() => window.clearInterval(timer), 4000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      window.clearTimeout(stop);
    };
  }, [currency, eventId, isAdmin, minorUnit, pixelId, totalMinor]);

  return null;
}
