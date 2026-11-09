const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");

const ROOT = path.resolve(__dirname, "..");
const CLIENT = path.join(ROOT, "client");
const STORE = path.join(__dirname, "store.json");
const PORT = Number(process.env.PORT || 3000);

const seed = {
  me: {
    name: "李同学",
    campus: "大学城校区",
    credit: 82,
    monthGain: 12,
    completed: 6,
    records: [
      { t: "昨天 18:20", text: "按时归还四六级耳机", delta: 4 },
      { t: "11 月 3 日", text: "完成一次教材转手", delta: 5 },
      { t: "10 月 29 日", text: "完成一次外卖代取", delta: 3 },
    ],
    lastGain: null,
  },
  items: [
    { id: "i1", title: "高数上册与手写笔记", condition: "九成新", mode: "寄存柜", locker: "东1门外 丰巢柜", slot: "周四 12:00 至 13:30", owner: "李同学", credit: 92, campus: "大学城校区" },
    { id: "i2", title: "四六级耳机", condition: "八成新", mode: "寄存柜", locker: "C10 负一层 快递点", slot: "周五 18:00 后", owner: "周同学", credit: 88, kind: "borrow", campus: "大学城校区" },
  ],
  orders: [],
};

function load() {
  try {
    return JSON.parse(fs.readFileSync(STORE, "utf8"));
  } catch (e) {
    return JSON.parse(JSON.stringify(seed));
  }
}

let db = load();

function save() {
  try {
    fs.writeFileSync(STORE, JSON.stringify(db, null, 2));
  } catch (e) {
    console.error("store write failed", e.message);
  }
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
};

function send(res, code, body, type) {
  res.writeHead(code, {
    "Content-Type": type || "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function json(res, code, data) {
  send(res, code, JSON.stringify(data));
}

function body(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (c) => {
      raw += c;
      if (raw.length > 1e6) req.destroy();
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        resolve({});
      }
    });
  });
}

function today() {
  const d = new Date();
  return String(d.getMonth() + 1).padStart(2, "0") + " 月 " + String(d.getDate()).padStart(2, "0") + " 日";
}

const routes = {
  "GET /api/health": (req, res) => json(res, 200, { ok: true, service: "campus-mutual-aid", time: new Date().toISOString() }),

  "GET /api/me": (req, res) => json(res, 200, db.me),

  "POST /api/campus": async (req, res) => {
    const b = await body(req);
    const allowed = ["五山校区", "大学城校区", "广州国际校区"];
    if (!allowed.includes(b.campus)) return json(res, 400, { error: "不支持的校区" });
    db.me.campus = b.campus;
    save();
    json(res, 200, db.me);
  },

  "POST /api/complete": async (req, res) => {
    const b = await body(req);
    const n = Number(b.n) || 3;
    const reason = String(b.reason || "完成一次互助").slice(0, 40);
    db.me.credit += n;
    db.me.monthGain += n;
    db.me.completed += 1;
    db.me.records.unshift({ t: today(), text: reason, delta: n });
    db.me.lastGain = { n, reason };
    save();
    json(res, 200, db.me);
  },

  "POST /api/undo": (req, res) => {
    if (!db.me.lastGain) return json(res, 409, { error: "没有可撤回的记录" });
    const n = db.me.lastGain.n;
    db.me.credit -= n;
    db.me.monthGain -= n;
    db.me.completed = Math.max(0, db.me.completed - 1);
    db.me.records.shift();
    db.me.lastGain = null;
    save();
    json(res, 200, db.me);
  },

  "GET /api/items": (req, res, q) => {
    const list = q && q.campus ? db.items.filter((it) => it.campus === q.campus) : db.items;
    json(res, 200, list);
  },

  "POST /api/items": async (req, res) => {
    const b = await body(req);
    if (!b.title || !String(b.title).trim()) return json(res, 400, { error: "标题不能为空" });
    const item = {
      id: "i" + Date.now(),
      title: String(b.title).trim().slice(0, 40),
      condition: b.condition || "九成新",
      mode: b.mode || "寄存柜",
      locker: b.locker || "C11 楼下 丰巢柜",
      slot: b.slot || "周四 12:00 至 13:30",
      owner: db.me.name,
      credit: db.me.credit,
      campus: b.campus || db.me.campus,
      createdAt: new Date().toISOString(),
    };
    db.items.unshift(item);
    save();
    json(res, 201, item);
  },

  "GET /api/orders": (req, res) => json(res, 200, db.orders),

  "POST /api/orders": async (req, res) => {
    const b = await body(req);
    const order = {
      id: "o" + Date.now(),
      kind: b.kind || "errand",
      campus: b.campus || db.me.campus,
      pickup: b.pickup || "",
      portions: b.portions || "",
      spill: b.spill || "",
      place: b.place || "",
      createdAt: new Date().toISOString(),
      status: "published",
    };
    db.orders.unshift(order);
    save();
    json(res, 201, order);
  },
};

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = decodeURIComponent(parsed.pathname);

  if (req.method === "OPTIONS") {
    return send(res, 204, "");
  }

  const key = req.method + " " + pathname;
  if (routes[key]) {
    try {
      return await routes[key](req, res, parsed.query);
    } catch (e) {
      return json(res, 500, { error: e.message });
    }
  }

  let filePath = path.join(CLIENT, pathname === "/" ? "index.html" : pathname);
  if (!filePath.startsWith(CLIENT)) return send(res, 403, "forbidden", "text/plain");

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (!path.extname(filePath)) {
        return fs.readFile(path.join(CLIENT, "index.html"), (e2, html) => {
          if (e2) return send(res, 404, "not found", "text/plain");
          send(res, 200, html, MIME[".html"]);
        });
      }
      return send(res, 404, "not found", "text/plain");
    }
    send(res, 200, data, MIME[path.extname(filePath)] || "application/octet-stream");
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log("campus-mutual-aid server on http://127.0.0.1:" + PORT);
  console.log("client: " + CLIENT);
});
