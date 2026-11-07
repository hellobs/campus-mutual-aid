const API = (() => {
  const bases =
    location.protocol === "file:"
      ? ["http://127.0.0.1:3000"]
      : ["", "http://127.0.0.1:3000"];

  async function req(path, opts = {}) {
    for (const base of bases) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 1200);
      try {
        const res = await fetch(base + path, {
          headers: { "Content-Type": "application/json" },
          signal: ctrl.signal,
          ...opts,
        });
        if (!res.ok) continue;
        return await res.json();
      } catch (e) {
        continue;
      } finally {
        clearTimeout(timer);
      }
    }
    return null;
  }

  return {
    getMe: () => req("/api/me"),
    complete: (payload) => req("/api/complete", { method: "POST", body: JSON.stringify(payload) }),
    undo: () => req("/api/undo", { method: "POST" }),
    setCampus: (campus) => req("/api/campus", { method: "POST", body: JSON.stringify({ campus }) }),
    getItems: () => req("/api/items"),
    createItem: (payload) => req("/api/items", { method: "POST", body: JSON.stringify(payload) }),
    getOrders: () => req("/api/orders"),
    createOrder: (payload) => req("/api/orders", { method: "POST", body: JSON.stringify(payload) }),
  };
})();

window.API = API;
