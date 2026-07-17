// In-memory stand-in for @netlify/blobs, mapped in via the resolve hook.
const stores = new Map();
function mk() {
  const m = new Map();
  return {
    async get(k, opts) { if (!m.has(k)) return null; const v = m.get(k); return opts && opts.type === "json" ? JSON.parse(v) : v; },
    async set(k, v) { m.set(k, String(v)); },
    async setJSON(k, v) { m.set(k, JSON.stringify(v)); },
    async list(opts) {
      const prefix = (opts && opts.prefix) || "";
      return { blobs: [...m.keys()].filter((k) => k.startsWith(prefix)).map((k) => ({ key: k, etag: "x" })), directories: [] };
    },
    _raw: m,
  };
}
export function getStore(name) { if (!stores.has(name)) stores.set(name, mk()); return stores.get(name); }
export function _stores() { return stores; }
