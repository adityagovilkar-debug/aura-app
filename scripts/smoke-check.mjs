// One-shot CDP smoke check against a running app with --remote-debugging-port.
// Prints the rendered brand text and any console errors. Used for packaging QA.

const port = process.argv[2] ?? '9223';
const pages = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const page = pages.find((p) => p.type === 'page');
if (!page) {
  console.error('no page target found');
  process.exit(1);
}

const ws = new WebSocket(page.webSocketDebuggerUrl);
const send = (id, method, params) => ws.send(JSON.stringify({ id, method, params }));

ws.onopen = () => {
  send(1, 'Runtime.evaluate', {
    expression: `JSON.stringify({
      brand: document.querySelector('.brand-name')?.textContent ?? null,
      navItems: document.querySelectorAll('.nav-item').length,
      rings: document.querySelectorAll('svg circle').length,
      bodyFont: getComputedStyle(document.body).fontFamily,
    })`,
  });
};

ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id === 1) {
    console.log(msg.result?.result?.value ?? JSON.stringify(msg));
    ws.close();
    process.exit(0);
  }
};

setTimeout(() => {
  console.error('timed out');
  process.exit(1);
}, 8000);
