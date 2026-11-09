const App = (() => {
  const state = {
    credit: 82,
    campus: "大学城校区",
    monthGain: 12,
    completed: 0,
    lastGain: null,
    lastErrand: null,
    trend: [62, 66, 65, 72, 75, 79, 82],
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
    document.querySelectorAll("svg[data-trend]").forEach((svg) => {
      const line = svg.querySelector(".line");
      const area = svg.querySelector(".area");
      if (line) line.setAttribute("d", d);
      if (area) area.setAttribute("d", d + " L300,80 L0,80 Z");
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

  function addCredit(n, reason) {
    state.credit += n;
    state.monthGain += n;
    state.completed += 1;
    const now = new Date();
    const t =
      String(now.getMonth() + 1).padStart(2, "0") +
      " 月 " +
      String(now.getDate()).padStart(2, "0") +
      " 日";
    state.records.unshift({ t, text: reason, delta: n });
    state.lastGain = { n, reason };
    paintCredit();
    Logger.note("credit +" + n + " " + reason);
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
    paintCredit();
    document.querySelectorAll(".sheet").forEach((el) => el.classList.remove("show"));
    toast("已撤回，扣回 " + n + " 分信用");
    Logger.note("undo credit -" + n);
    if (window.API) API.undo().then(syncMe);
  }

  function finishReview() {
    addCredit(5, "完成一次教材转手");
    openSheet("sheet-review");
    if (window.API) API.complete({ n: 5, reason: "完成一次教材转手" }).then(syncMe);
  }

  function finishBorrow() {
    addCredit(4, "按时归还四六级耳机");
    openSheet("sheet-borrow");
    if (window.API) API.complete({ n: 4, reason: "按时归还四六级耳机" }).then(syncMe);
  }

  function finishErrand() {
    if (state.lastErrand) state.lastErrand.status = "已完成";
    setText("mine-status", "已完成");
    addCredit(3, "完成一次外卖代取");
    openSheet("sheet-errand");
    if (window.API) API.complete({ n: 3, reason: "完成一次外卖代取" }).then(syncMe);
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
    const chip = document.getElementById("campus-chip");
    if (chip) chip.textContent = name;
    const note = document.getElementById("campus-note");
    if (note) note.textContent = "仅显示" + name + "的内容";
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
    if (window.API) API.createOrder({ kind: "errand", pickup: route, place: meta });
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
    addCredit(3, "完成一次代取接单");
    openSheet("sheet-errand");
    if (window.API) API.complete({ n: 3, reason: "完成一次代取接单" }).then(syncMe);
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
    setText("progress-tip", o.tip + " · 平台代收");
    setText("proof-tip", o.tip + " · 平台代收");
  }

  function publishErrand() {
    const portions = chipText("chip-portions", "1 份");
    const spill = chipText("chip-spill", "有汤，易洒");
    const tip = chipText("chip-tip", "3 元");
    const order = {
      pickup: "东1门 外卖柜",
      portions,
      spill,
      place: "C12 栋楼下，18:40 前",
      tip,
    };
    state.lastErrand = order;
    setText("mine-route", "东1门 外卖柜 到 C12 栋楼下");
    setText("mine-meta", portions + " · " + spill + " · 打赏 " + tip);
    setText("mine-status", "进行中");
    const mine = document.getElementById("mine-order");
    const empty = document.getElementById("mine-empty");
    if (mine) mine.hidden = false;
    if (empty) empty.hidden = true;
    if (window.API) {
      API.createOrder({ kind: "errand", pickup: order.pickup, portions, spill, place: order.place, tip });
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
  if (id === "s-home" || id === "s-help" || id === "s-credit") {
    Router.reset(id);
    return;
  }
  Router.show(id);
};
window.back = function () {
  Router.back();
};
