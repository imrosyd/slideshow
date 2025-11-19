// Minimal supabase client shim for builds when Supabase isn't configured.
// This provides the small subset of API the app uses so TypeScript and
// Next.js build don't fail when a real Supabase client is not available.

// Minimal supabase client shim for builds when Supabase isn't configured.
// This provides a small subset of API the app uses so Next.js builds don't
// fail. Additionally, when running in a browser without a real Supabase
// client, use BroadcastChannel to allow same-origin tabs (main + remote)
// to communicate locally for development.

type Handler = (payload: any) => void;

const channels = new Map<string, any>();

function createNoopChannel(name: string) {
  const ch: any = {
    on: (_: any, __: any, cb?: Handler) => ch,
    subscribe: () => ch,
    send: async () => Promise.resolve(),
    close: () => {},
  };
  return ch;
}

function createBroadcastChannel(name: string) {
  // Use a dedicated channel name prefix to avoid collisions
  const bcName = `slideshow:${name}`;
  const bc = new (typeof BroadcastChannel !== 'undefined' ? BroadcastChannel : class {
    // Fallback stub for non-browser environments
    constructor(_n: string) {}
    postMessage() {}
    close() {}
    addEventListener() {}
    removeEventListener() {}
  })(bcName) as any;

  const listeners: Array<{ event: string; fn: Handler }> = [];

  let closed = false;

  const wrapper = {
    on: (_t: any, filter: any, cb?: Handler) => {
      // filter is expected like { event: 'slideshow-status' }
      const ev = filter && filter.event ? filter.event : '*';
      if (cb) listeners.push({ event: ev, fn: cb });
      return wrapper;
    },
    subscribe: () => {
      // listen for incoming messages
      if (typeof bc.addEventListener === 'function') {
        bc.addEventListener('message', (ev: any) => {
          const msg = ev.data;
          if (!msg) return;
          const matching = listeners.filter(l => l.event === '*' || l.event === msg.event);
          matching.forEach(l => {
            try {
              l.fn({ payload: msg.payload, event: msg.event, type: msg.type });
            } catch (err) {
              // ignore handler errors
            }
          });
        });
      }
      return wrapper;
    },
    send: async (message: any) => {
      if (closed) {
        // Channel already closed — behave like a no-op to avoid
        // exceptions when callers attempt to send after cleanup.
        return Promise.resolve();
      }
      try {
        // Normalise message shape (type, event, payload)
        const msg = message || {};
        const out = { type: msg.type || 'broadcast', event: msg.event || null, payload: msg.payload };
        if (typeof bc.postMessage === 'function') bc.postMessage(out);
        return Promise.resolve();
      } catch (err) {
        return Promise.reject(err);
      }
    },
    close: () => {
      try { bc.close(); } catch (e) {}
      closed = true;
    }
  };

  return wrapper;
}

export const supabase: any = {
  channel: (name: string) => {
    // If running in a browser with BroadcastChannel available, use it so
    // local tabs can communicate without an external Supabase instance.
    if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
      if (!channels.has(name)) {
        channels.set(name, createBroadcastChannel(name));
      }
      return channels.get(name);
    }

    // Fallback no-op (server-side or very old browsers)
    return createNoopChannel(name);
  },
  removeChannel: (ch: any) => {
    try {
      // If caller passed a channel wrapper, find and remove it from the map
      for (const [k, v] of channels.entries()) {
        if (v === ch) {
          try { v.close && v.close(); } catch (e) {}
          channels.delete(k);
          return;
        }
      }

      // If caller passed a name string, remove by name
      if (typeof ch === 'string') {
        const existing = channels.get(ch);
        try { existing && existing.close && existing.close(); } catch (e) {}
        channels.delete(ch);
        return;
      }

      // Fallback: if an object with close exists, call it but do not throw
      if (ch && typeof ch.close === 'function') {
        try { ch.close(); } catch (e) {}
      }
    } catch (e) {}
  },
};

export default supabase;
