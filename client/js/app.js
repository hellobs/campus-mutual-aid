const App = (() => {
  const ERRAND = {
    "大学城校区": { pickup: "东1门 外卖柜", place: "C12 栋楼下，18:40 前", route: "东1门 外卖柜 到 C12 栋楼下" },
    "五山校区": { pickup: "33号楼 外卖柜", place: "北四栋楼下，18:40 前", route: "33号楼 外卖柜 到 北四栋楼下" },
    "广州国际校区": { pickup: "D3b 楼下 外卖柜", place: "D5e 学生社区，18:40 前", route: "D3b 楼下 外卖柜 到 D5e 学生社区" },
  };

  const state = {
    credit: 82,
    campus: "大学城校区",
    monthGain: 12,
    completed: 0,
    lastGain: null,
    lastErrand: null,
    trend: [55, 63, 69, 74, 78, 80, 82],
    records: [
      { t: "昨天 18:20", text: "按时归还四六级耳机", delta: 4 },
      { t: "11 月 3 日", text: "完成一次教材转手", delta: 5 },
      { t: "10 月 29 日", text: "完成一次外卖代取", delta: 3 },
    ],
  };

  function fmt(n) {
    return String(n);
  }

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function paintTrend() {
    const vals = (state.trend || []).slice(-7);
    if (vals.length < 2) return;
    vals[vals.length - 1] = Math.max(50, Math.min(100, state.credit));
    const pts = vals.map((v, i) => [i * (300 / (vals.length - 1)), 72 - (v - 50) * 1.28]);
    let d = "M" + pts[0][0] + "," + pts[0][1];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
      const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += " C" + c1x.toFixed(1) + "," + c1y.toFixed(1) + " " + c2x.toFixed(1) + "," + c2y.toFixed(1) + " " + p2[0].toFixed(1) + "," + p2[1].toFixed(1);
    }
    const now = new Date();
    const fmt = (d) => d.getMonth() + 1 + "." + String(d.getDate()).padStart(2, "0");
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    setText("trend-start", fmt(start));
    setText("trend-end", fmt(now));
    document.querySelectorAll("svg[data-trend]").forEach((svg) => {
      const line = svg.querySelector(".line");
      const area = svg.querySelector(".area");
      if (line) line.setAttribute("d", d);
      if (area) area.setAttribute("d", d + " L300,80 L0,80 Z");
    });
  }

  function paintGain() {
    const g = state.credit >= 100 ? 0 : Math.max(1, Math.round(3 * gainFactor(state.credit)));
    document.querySelectorAll(".js-gain").forEach((el) => {
      el.textContent = g ? "互助 +" + g : "互助 已满";
    });
    document.querySelectorAll(".js-gain-short").forEach((el) => {
      el.textContent = g ? "+" + g : "0";
    });
    const g5 = state.credit >= 100 ? 0 : Math.max(1, Math.round(5 * gainFactor(state.credit)));
    document.querySelectorAll(".js-gain-review").forEach((el) => {
      el.textContent = g5 ? "双方各 +" + g5 : "双方已满";
    });
    document.querySelectorAll(".js-gain-review3").forEach((el) => {
      el.textContent = g ? "双方各 +" + g : "双方已满";
    });
  }

  function paintCredit() {
    document.querySelectorAll(".js-credit").forEach((el) => {
      el.textContent = fmt(state.credit);
    });
    document.querySelectorAll(".js-month").forEach((el) => {
      el.textContent = "+" + state.monthGain;
    });
    paintTrend();
    paintGain();
    const left = Math.max(0, 9 - state.completed);
    setText("review-left", left ? "还差 " + left + " 次" : "已具备");
    const log = document.getElementById("credit-log");
    if (log) {
      log.innerHTML = state.records
        .map(
          (r) => `
        <div class="tl">
          <div class="d"></div>
          <div class="c"><b>${r.text}</b><small>${r.t}</small></div>
          <div class="plus">+${r.delta}</div>
        </div>`
        )
        .join("");
    }
  }

  function gainFactor(score) {
    return Math.pow(Math.max(0, 100 - score) / 18, 0.9);
  }

  function addCredit(n, reason) {
    const gain = Math.min(100 - state.credit, Math.max(1, Math.round(n * gainFactor(state.credit))));
    if (gain <= 0) {
      toast("信用分已满");
      return 0;
    }
    state.credit += gain;
    state.monthGain += gain;
    state.completed += 1;
    const now = new Date();
    const t =
      String(now.getMonth() + 1).padStart(2, "0") +
      " 月 " +
      String(now.getDate()).padStart(2, "0") +
      " 日";
    state.records.unshift({ t, text: reason, delta: gain });
    state.lastGain = { n: gain, reason };
    paintCredit();
    Logger.note("credit +" + gain + " " + reason);
    return gain;
  }

  function syncMe(me) {
    if (!me) return;
    if (me.campus) applyCampus(me.campus, true);
    state.credit = me.credit;
    state.monthGain = me.monthGain;
    state.completed = me.completed;
    if (Array.isArray(me.records)) state.records = me.records;
    paintCredit();
  }

  function toast(msg) {
    const el = document.getElementById("toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove("show"), 1800);
  }

  function openSheet(id) {
    const s = document.getElementById(id);
    if (s) s.classList.add("show");
  }

  function closeSheet(id) {
    const s = document.getElementById(id);
    if (s) s.classList.remove("show");
  }

  function choose(el, group) {
    const parent = el.parentElement;
    parent.querySelectorAll(".chip").forEach((c) => c.classList.remove("on"));
    el.classList.add("on");
    Logger.click(group + ":" + el.textContent.trim());
  }

  function pickStar(n) {
    document.querySelectorAll("#stars i").forEach((s, i) => {
      s.classList.toggle("on", i < n);
    });
    Logger.click("rating:" + n);
  }

  function onScreen(id) {
    const tabMap = { "s-home": "home", "s-credit": "credit" };
    const active = tabMap[id] || "";
    document.querySelectorAll(".tabbar button").forEach((b) => {
      b.classList.toggle("on", b.dataset.tab === active);
    });
    if (id === "s-credit") paintCredit();
    if (id === "s-errand-progress" || id === "s-errand-proof") paintErrand();
  }

  function undoLast() {
    if (!state.lastGain) {
      toast("没有可撤回的记录");
      return;
    }
    const n = state.lastGain.n;
    state.credit -= n;
    state.monthGain -= n;
    state.completed = Math.max(0, state.completed - 1);
    state.records.shift();
    state.lastGain = null;
    if (state.lastErrand && state.lastErrand.status === "已完成") {
      state.lastErrand.status = "进行中";
      setText("mine-status", "进行中");
    }
    paintCredit();
    document.querySelectorAll(".sheet").forEach((el) => el.classList.remove("show"));
    toast("已撤回，扣回 " + n + " 分信用");
    Logger.note("undo credit -" + n);
    if (window.API) API.undo().then(syncMe);
  }

  function finishReview() {
    const g = addCredit(5, "完成一次教材转手");
    if (!g) return;
    setText("review-gain-text", "你和对方各得 " + g + " 分信用，已记入信用记录。");
    setText("review-gain", "信用分 +" + g);
    openSheet("sheet-review");
    if (window.API) API.complete({ n: g, reason: "完成一次教材转手" }).then(syncMe);
  }

  function finishBorrow() {
    const g = addCredit(4, "按时归还四六级耳机");
    if (!g) return;
    setText("borrow-gain-text", "对方已确认收回，按时归还记 " + g + " 分信用。");
    setText("borrow-gain", "信用分 +" + g);
    openSheet("sheet-borrow");
    if (window.API) API.complete({ n: g, reason: "按时归还四六级耳机" }).then(syncMe);
  }

  function finishErrand() {
    if (state.lastErrand) state.lastErrand.status = "已完成";
    setText("mine-status", "已完成");
    const g = addCredit(3, "完成一次外卖代取");
    if (!g) return;
    setText("errand-gain-text", "交接凭证已留存，双方各得 " + g + " 分信用。");
    setText("errand-gain", "信用分 +" + g);
    openSheet("sheet-errand");
    if (window.API) API.complete({ n: g, reason: "完成一次外卖代取" }).then(syncMe);
  }

  function toggle(el, name) {
    const off = el.classList.toggle("off");
    el.textContent = off ? "已关闭" : "已开启";
    el.classList.toggle("on", !off);
    toast(name + (off ? "已关闭" : "已开启"));
    Logger.click("toggle:" + name + ":" + (off ? "off" : "on"));
  }

  function switchDelivery(el) {
    const next = el.textContent.trim() === "寄存柜" ? "当面" : "寄存柜";
    el.textContent = next;
    toast("默认交付方式已改为" + next);
    Logger.click("delivery:" + next);
  }

  function applyCampus(name, silent) {
    state.campus = name;
    const cfg = ERRAND[name];
    if (cfg) {
      setText("post-pickup", cfg.pickup);
      setText("post-place", cfg.place);
    }
    const chip = document.getElementById("campus-chip");
    if (chip) chip.textContent = name;
    document.querySelectorAll("[data-campus]").forEach((el) => {
      el.style.display = el.dataset.campus === name ? "" : "none";
    });
    document.querySelectorAll("[data-campus-opt]").forEach((btn) => {
      const on = btn.dataset.campusOpt === name;
      btn.classList.toggle("on", on);
      const mark = btn.querySelector("b");
      if (mark) mark.textContent = on ? "当前" : "";
    });
    const cards = document.querySelectorAll("#s-errand [data-campus]");
    let visible = 0;
    cards.forEach((el) => {
      if (el.dataset.campus === name) visible += 1;
    });
    const cnt = document.getElementById("errand-count");
    if (cnt) cnt.textContent = visible + " 单";
    if (!silent) {
      closeSheet("sheet-campus");
      toast("已切换到" + name);
      Logger.click("campus:" + name);
    }
  }

  function setCampus(name) {
    applyCampus(name, false);
    if (window.API) API.setCampus(name).then(syncMe);
  }

  function acceptOrder(el) {
    const route = el.dataset.route || "";
    const meta = el.dataset.meta || "";
    const r = document.getElementById("accept-route");
    const m = document.getElementById("accept-meta");
    if (r) r.textContent = route;
    if (m) m.textContent = meta;
    setText("accept-tip", (el.dataset.tip || "3 元") + " · 平台代收");
    const owner = el.dataset.owner || "同校同学";
    setText("task-owner", owner);
    setText("task-owner-meta", "信用 " + (el.dataset.credit || "82") + " · 刚发布");
    setText("task-avatar", owner[0]);
    openSheet("sheet-accept");
    Logger.click("accept:" + route);
  }

  function confirmAccept() {
    const r = document.getElementById("accept-route");
    const m = document.getElementById("accept-meta");
    const route = r ? r.textContent : "";
    const meta = m ? m.textContent : "";
    const tr = document.getElementById("task-route");
    const tm = document.getElementById("task-meta");
    if (tr) tr.textContent = route;
    if (tm) tm.textContent = meta;
    const at = document.getElementById("accept-tip");
    const tt = document.getElementById("task-tip");
    if (tt && at) tt.textContent = at.textContent;
    const box = document.getElementById("proof-box");
    const pb = document.getElementById("proof-btn");
    const done = document.getElementById("task-done");
    if (box) box.textContent = "取餐后拍照上传";
    if (pb) pb.disabled = false;
    if (done) done.disabled = true;
    closeSheet("sheet-accept");
    const place = route.includes(" 到 ") ? route.split(" 到 ").slice(1).join(" 到 ") : "";
    if (window.API) API.createOrder({ kind: "errand", pickup: route, place });
    go("s-errand-task");
  }

  function uploadProof() {
    const box = document.getElementById("proof-box");
    const pb = document.getElementById("proof-btn");
    const done = document.getElementById("task-done");
    if (box) box.textContent = "已上传 · 取餐照片";
    if (pb) pb.disabled = true;
    if (done) done.disabled = false;
    toast("凭证已上传");
    Logger.click("proof:upload");
  }

  function finishHelp() {
    const g = addCredit(3, "完成一次代取接单");
    if (!g) return;
    setText("errand-gain-text", "交接凭证已留存，双方各得 " + g + " 分信用。");
    setText("errand-gain", "信用分 +" + g);
    openSheet("sheet-errand");
    if (window.API) API.complete({ n: g, reason: "完成一次代取接单" }).then(syncMe);
  }

  function validatePost() {
    const el = document.getElementById("post-title");
    const btn = document.getElementById("post-submit");
    if (btn) btn.disabled = !(el && el.value.trim());
  }

  function publishItem() {
    const el = document.getElementById("post-title");
    const title = el ? el.value.trim() : "";
    if (!title) {
      toast("请先填写标题");
      if (el) el.focus();
      return;
    }
    if (window.API) API.createItem({ title }).then(() => {});
    toast("已发布，等待同校同学");
    setTimeout(() => go("s-detail"), 700);
  }

  function applyBorrow() {
    if (window.API) API.createOrder({ kind: "borrow", place: "C9 楼下 丰巢柜" });
    go("s-borrow-return");
  }

  function helpTab(name, btn) {
    const pool = document.getElementById("help-pool");
    const mine = document.getElementById("help-mine");
    if (pool) pool.hidden = name !== "pool";
    if (mine) mine.hidden = name !== "mine";
    document.querySelectorAll("#help-seg button").forEach((b) => b.classList.toggle("on", b === btn));
    Logger.click("help-tab:" + name);
  }

  function chipText(id, fallback) {
    const el = document.querySelector("#" + id + " .chip.on");
    return el ? el.textContent.trim() : fallback;
  }

  function paintErrand() {
    const o = state.lastErrand;
    if (!o) return;
    setText("progress-pickup", o.pickup);
    setText("progress-meta", o.portions + "，" + o.spill);
    setText("progress-place", o.place);
    const tipText = o.tip === "不加" ? "无打赏" : o.tip + " · 平台代收";
    setText("progress-tip", tipText);
    setText("proof-tip", tipText);
    const helper = o.helper || { name: "王同学", credit: 90, eta: "18:30" };
    setText("progress-helper", helper.name);
    setText("progress-helper-meta", "信用 " + helper.credit + " · 顺路，预计 " + helper.eta + " 到");
    setText("proof-helper", helper.name + " · 信用 " + helper.credit);
    setText("proof-photo", "取餐照片 · " + o.pickup + " · " + (o.pickupTime || "18:22"));
    setText("proof-pickup-time", o.pickupTime || "18:22");
    setText("proof-deliver-time", o.deliveredTime || "18:31");
  }

  function publishErrand() {
    const cfg = ERRAND[state.campus] || ERRAND["大学城校区"];
    const portions = chipText("chip-portions", "1 份");
    const spill = chipText("chip-spill", "有汤，易洒");
    const tip = chipText("chip-tip", "3 元");
    const tipText = tip === "不加" ? "无打赏" : "打赏 " + tip;
    const order = {
      pickup: cfg.pickup,
      portions,
      spill,
      place: cfg.place,
      route: cfg.route,
      campus: state.campus,
      tip,
      helper: { name: "王同学", credit: 90, eta: "18:30" },
      pickupTime: "18:22",
      deliveredTime: "18:31",
    };
    state.lastErrand = order;
    setText("mine-route", cfg.route);
    setText("mine-meta", portions + " · " + spill + " · " + tipText);
    setText("mine-status", "进行中");
    const mine = document.getElementById("mine-order");
    const empty = document.getElementById("mine-empty");
    if (mine) mine.hidden = false;
    if (empty) empty.hidden = true;
    if (window.API) {
      API.createOrder({ kind: "errand", pickup: order.pickup, portions, spill, place: order.place, tip: tip === "不加" ? "0 元" : tip, campus: state.campus });
    }
    toast("已发布，等待顺路的人");
    setTimeout(() => go("s-errand-progress"), 600);
  }

  function scale() {
    const stage = document.getElementById("stage");
    if (!stage) return;
    if (window.matchMedia("(max-width: 600px)").matches) {
      stage.style.transform = "none";
      return;
    }
    const s = Math.min(1, (window.innerHeight - 70) / 880, (window.innerWidth - 40) / 420);
    stage.style.transform = "scale(" + Math.max(0.5, s) + ")";
  }

  window.addEventListener("resize", scale);
  document.addEventListener("DOMContentLoaded", () => {
    paintCredit();
    applyCampus(state.campus, true);
    validatePost();
    scale();
    if (window.API) API.getMe().then(syncMe);
  });

  return { state, addCredit, toast, openSheet, closeSheet, choose, pickStar, onScreen, finishReview, finishBorrow, finishErrand, paintCredit, toggle, switchDelivery, undoLast, validatePost, publishItem, applyBorrow, publishErrand, acceptOrder, confirmAccept, uploadProof, finishHelp, applyCampus, setCampus, helpTab };
})();

window.App = App;

window.go = function (id) {
  Logger.click("go:" + id);
  if (id === "s-home" || id === "s-credit") {
    Router.reset(id);
    return;
  }
  Router.show(id);
};
window.back = function () {
  Router.back();
};
