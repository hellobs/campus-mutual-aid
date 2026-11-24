const API = (() => {
  function friendly(err) {
    if (!err) return new Error("云服务暂时不可用");
    if (err.code === "42P01") return new Error("云端数据表尚未创建");
    if (err.code === "42501") return new Error("没有权限访问云端数据");
    if (err.code === "23505") return new Error("这条记录已经存在");
    if (err.message) return new Error(err.message);
    return new Error("云服务暂时不可用");
  }

  function check(res) {
    if (res && res.error) throw friendly(res.error);
    return res ? res.data : null;
  }

  function db() {
    if (!window.Cloud || typeof window.Cloud.get !== "function") {
      throw new Error("云服务配置未加载");
    }
    return window.Cloud.get().database;
  }

  function report(e) {
    const message = e && e.message ? e.message : "云服务暂时不可用";
    window.dispatchEvent(new CustomEvent("cloud-error", { detail: message }));
    return null;
  }

  async function run(fn) {
    try {
      return await fn();
    } catch (e) {
      return report(e);
    }
  }

  function today() {
    const d = new Date();
    return String(d.getMonth() + 1).padStart(2, "0") + " 月 " + String(d.getDate()).padStart(2, "0") + " 日";
  }

  function toMe(row) {
    return {
      campus: row.campus,
      credit: row.credit,
      monthGain: row.month_gain,
      completed: row.completed,
      records: Array.isArray(row.records) ? row.records : [],
      lastGain: row.last_gain || null,
    };
  }

  async function getState() {
    const data = check(
      await db().from("demo_state").select("*").eq("id", 1).maybeSingle()
    );
    if (!data) throw new Error("云端演示数据未初始化");
    return data;
  }

  async function getMe() {
    return run(async () => toMe(await getState()));
  }

  async function setCampus(campus) {
    return run(async () => {
      const allowed = ["五山校区", "大学城校区", "广州国际校区"];
      if (!allowed.includes(campus)) throw new Error("不支持的校区");
      const data = check(
        await db().from("demo_state").update({ campus }).eq("id", 1).select().single()
      );
      return toMe(data);
    });
  }

  async function complete(payload) {
    return run(async () => {
      const row = await getState();
      const requested = Number(payload && payload.n) || 0;
      const gain = Math.min(100 - row.credit, Math.max(0, requested));
      if (gain <= 0) return toMe(row);
      const reason = String((payload && payload.reason) || "完成一次互助").slice(0, 40);
      const records = [
        { t: today(), text: reason, delta: gain },
        ...(Array.isArray(row.records) ? row.records : []),
      ].slice(0, 20);
      const data = check(
        await db()
          .from("demo_state")
          .update({
            credit: row.credit + gain,
            month_gain: row.month_gain + gain,
            completed: row.completed + 1,
            records,
            last_gain: { n: gain, reason },
            updated_at: new Date().toISOString(),
          })
          .eq("id", 1)
          .select()
          .single()
      );
      return toMe(data);
    });
  }

  async function undo() {
    return run(async () => {
      const row = await getState();
      const last = row.last_gain;
      if (!last) throw new Error("没有可撤回的记录");
      const n = Number(last.n) || 0;
      const records = Array.isArray(row.records) ? row.records.slice(1) : [];
      const data = check(
        await db()
          .from("demo_state")
          .update({
            credit: Math.max(0, row.credit - n),
            month_gain: Math.max(0, row.month_gain - n),
            completed: Math.max(0, row.completed - 1),
            records,
            last_gain: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", 1)
          .select()
          .single()
      );
      return toMe(data);
    });
  }

  async function getItems() {
    return run(async () =>
      check(
        await db()
          .from("demo_items")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50)
      )
    );
  }

  async function createItem(payload) {
    return run(async () => {
      const row = await getState();
      const title = String((payload && payload.title) || "").trim().slice(0, 40);
      if (!title) throw new Error("标题不能为空");
      const item = {
        id: "i" + Date.now() + Math.floor(Math.random() * 1000),
        title,
        condition: (payload && payload.condition) || "九成新",
        mode: (payload && payload.mode) || "寄存柜",
        locker: (payload && payload.locker) || "C11 楼下 丰巢柜",
        slot: (payload && payload.slot) || "周四 12:00 至 13:30",
        owner: row.campus === "大学城校区" ? "李同学" : "本班同学",
        credit: row.credit,
        kind: (payload && payload.kind) || null,
        campus: (payload && payload.campus) || row.campus,
        created_at: new Date().toISOString(),
      };
      return check(await db().from("demo_items").insert(item).select().single());
    });
  }

  async function getOrders() {
    return run(async () =>
      check(
        await db()
          .from("demo_orders")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50)
      )
    );
  }

  async function createOrder(payload) {
    return run(async () => {
      const row = await getState();
      const order = {
        id: "o" + Date.now() + Math.floor(Math.random() * 1000),
        kind: (payload && payload.kind) || "errand",
        campus: (payload && payload.campus) || row.campus,
        pickup: (payload && payload.pickup) || "",
        portions: (payload && payload.portions) || "",
        spill: (payload && payload.spill) || "",
        place: (payload && payload.place) || "",
        tip: (payload && payload.tip) || "",
        status: "published",
        created_at: new Date().toISOString(),
      };
      return check(await db().from("demo_orders").insert(order).select().single());
    });
  }

  return {
    getMe,
    complete,
    undo,
    setCampus,
    getItems,
    createItem,
    getOrders,
    createOrder,
  };
})();

window.API = API;
