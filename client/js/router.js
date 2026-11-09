const Router = (() => {
  const stack = [];
  let current = null;

  function paint(id) {
    const next = document.getElementById(id);
    if (!next) return;
    const prev = current ? document.getElementById(current) : null;
    if (prev && prev !== next) {
      clearTimeout(prev._leaveTimer);
      prev.classList.add("leaving");
      prev._leaveTimer = setTimeout(() => {
        prev.classList.remove("active", "leaving");
      }, 200);
    }
    clearTimeout(next._leaveTimer);
    next.classList.remove("leaving");
    next.classList.add("active");
    current = id;
    if (window.Logger) Logger.enter(id);
    if (window.App) App.onScreen(id);
    const body = next.querySelector(".body");
    if (body) body.scrollTop = 0;
  }

  function show(id, opts = {}) {
    const next = document.getElementById(id);
    if (!next || current === id) return;
    if (!opts.replace && current) stack.push(current);
    paint(id);
    if (!opts.fromHistory) {
      if (opts.replace) history.replaceState({ screen: id }, "");
      else history.pushState({ screen: id }, "");
    }
  }

  function applyBack(target) {
    let prev = stack.pop();
    if (target) prev = target;
    if (!prev) prev = "s-home";
    const cur = document.getElementById(current);
    if (cur) {
      clearTimeout(cur._leaveTimer);
      cur.classList.remove("active", "leaving");
    }
    const next = document.getElementById(prev);
    if (next) {
      clearTimeout(next._leaveTimer);
      next.classList.remove("leaving");
      next.classList.add("active");
    }
    current = prev;
    if (window.Logger) Logger.back();
    if (window.App) App.onScreen(prev);
    const body = next ? next.querySelector(".body") : null;
    if (body) body.scrollTop = 0;
  }

  function back() {
    if (!stack.length && current === "s-home") return;
    if (history.state && history.state.screen && history.length > 1) {
      history.back();
      return;
    }
    applyBack(null);
  }

  function reset(id) {
    stack.length = 0;
    document.querySelectorAll(".page").forEach((p) => {
      clearTimeout(p._leaveTimer);
      p.classList.remove("active", "leaving");
    });
    current = null;
    show(id, { replace: true });
  }

  window.addEventListener("popstate", (e) => {
    const target = e.state && e.state.screen;
    applyBack(target);
  });

  document.addEventListener("DOMContentLoaded", () => {
    const active = document.querySelector(".page.active");
    if (active) {
      current = active.id;
      history.replaceState({ screen: current }, "");
    }
  });

  return { show, back, reset, get current() { return current; } };
})();

window.Router = Router;
