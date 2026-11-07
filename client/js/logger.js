const Logger = (() => {
  const events = [];
  let enteredAt = 0;
  let currentScreen = "";

  function enter(screen) {
    if (currentScreen) {
      events.push({
        type: "dwell",
        screen: currentScreen,
        ms: Date.now() - enteredAt,
      });
    }
    currentScreen = screen;
    enteredAt = Date.now();
    events.push({ type: "enter", screen, t: new Date().toISOString() });
  }

  function click(label) {
    events.push({
      type: "click",
      screen: currentScreen,
      label,
      t: new Date().toISOString(),
    });
  }

  function back() {
    events.push({ type: "back", screen: currentScreen, t: new Date().toISOString() });
  }

  function note(text) {
    events.push({ type: "note", screen: currentScreen, text, t: new Date().toISOString() });
  }

  function summary() {
    const map = {};
    events.forEach((e) => {
      if (!map[e.screen]) map[e.screen] = { screen: e.screen, enters: 0, dwell: 0, clicks: 0, backs: 0 };
      const row = map[e.screen];
      if (e.type === "enter") row.enters += 1;
      if (e.type === "dwell") row.dwell += e.ms;
      if (e.type === "click") row.clicks += 1;
      if (e.type === "back") row.backs += 1;
    });
    return Object.values(map);
  }

  function csv() {
    const rows = [["screen", "enters", "dwell_ms", "clicks", "backs"]];
    summary().forEach((r) => rows.push([r.screen, r.enters, r.dwell, r.clicks, r.backs]));
    return rows.map((r) => r.join(",")).join("\n");
  }

  function download() {
    const blob = new Blob(["\ufeff" + csv()], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "usability-log.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function dump() {
    return { events, summary: summary() };
  }

  return { enter, click, back, note, summary, csv, download, dump };
})();

window.Logger = Logger;
