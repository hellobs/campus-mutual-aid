const Router = (() => {
  const stack = [];
  let current = null;

  function show(id, opts = {}) {
    const next = document.getElementById(id);
    if (!next || current === id) return;
    const prev = current ? document.getElementById(current) : null;
    if (prev) {
      clearTimeout(prev._leaveTimer);
      prev.classList.add("leaving");
      prev._leaveTimer = setTimeout(() => {
        prev.classList.remove("active", "leaving");
      }, 200);
    }
    clearTimeout(next._leaveTimer);
    next.classList.remove("leaving");
    next.classList.add("active");
    if (!opts.replace && current) stack.push(current);
    current = id;
    if (window.Logger) Logger.enter(id);
    if (window.App) App.onScreen(id);
    const body = next.querySelector(".body");
    if (body) body.scrollTop = 0;
  }

  function back() {
    if (!stack.length) {
      if (current && current !== "s-home") show("s-home", { replace: true });
      return;
    }
    const prev = stack.pop();
    const cur = document.getElementById(current);
    if (cur) {
      clearTimeout(cur._leaveTimer);
      cur.classList.remove("active", "leaving");
    }
    const target = document.getElementById(prev);
    if (target) {
      clearTimeout(target._leaveTimer);
      target.classList.remove("leaving");
      target.classList.add("active");
    }
    current = prev;
    if (window.Logger) Logger.back();
    if (window.App) App.onScreen(prev);
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

  document.addEventListener("DOMContentLoaded", () => {
    const active = document.querySelector(".page.active");
    if (active) current = active.id;
  });

  return { show, back, reset, get current() { return current; } };
})();

window.Router = Router;
