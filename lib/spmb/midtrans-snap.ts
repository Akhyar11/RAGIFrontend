import type { SpmbCheckout } from '@/types/spmb-payment.types';

interface MidtransSnap {
  pay: (token: string, callbacks: {
    onSuccess: () => void;
    onPending: () => void;
    onError: () => void;
    onClose: () => void;
  }) => void;
}

interface MidtransWindow extends Window {
  snap?: MidtransSnap;
}

interface SnapCallbacks {
  onSuccess: () => void;
  onPending: () => void;
  onError: () => void;
  onClose: () => void;
}

const MIDTRANS_SNAP_SCRIPT_ID = 'midtrans-spmb-snap-script';
let snapLoadPromise: Promise<MidtransSnap | null> | null = null;
let snapLoadIdentity: string | null = null;

function loadMidtransSnap(clientKey: string, environment: string): Promise<MidtransSnap | null> {
  const source = environment === 'production'
    ? 'https://app.midtrans.com/snap/snap.js'
    : 'https://app.sandbox.midtrans.com/snap/snap.js';
  const identity = `${source}:${clientKey}`;
  const browser = window as MidtransWindow;
  const currentScript = document.getElementById(MIDTRANS_SNAP_SCRIPT_ID) as HTMLScriptElement | null;

  if (browser.snap?.pay && currentScript?.src === source && currentScript.dataset.clientKey === clientKey) {
    return Promise.resolve(browser.snap);
  }
  if (snapLoadPromise && snapLoadIdentity === identity) return snapLoadPromise;
  if (currentScript) currentScript.remove();

  snapLoadIdentity = identity;
  snapLoadPromise = new Promise((resolve) => {
    const script = document.createElement('script');
    script.id = MIDTRANS_SNAP_SCRIPT_ID;
    script.src = source;
    script.async = true;
    script.dataset.clientKey = clientKey;
    script.onload = () => resolve((window as MidtransWindow).snap ?? null);
    script.onerror = () => {
      snapLoadPromise = null;
      snapLoadIdentity = null;
      script.remove();
      resolve(null);
    };
    document.body.appendChild(script);
  });

  return snapLoadPromise;
}

export async function openMidtransSnap(checkout: SpmbCheckout, callbacks: SnapCallbacks): Promise<boolean> {
  if (checkout.method !== 'snap' || !checkout.snap_token || !checkout.client_key) return false;

  const snap = await loadMidtransSnap(checkout.client_key, checkout.environment || 'sandbox');
  if (!snap?.pay) return false;

  snap.pay(checkout.snap_token, callbacks);
  return true;
}