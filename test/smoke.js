// Plays complete 20-year games against a stubbed DOM. Catches the class of bug that
// froze the game on its first month: anything that throws inside the monthly tick.
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
const data = html.match(/<script id="gamedata" type="application\/json">([\s\S]*?)<\/script>/)[1];
let js = html.match(/<script>\n(\(function\(\)\{[\s\S]*?)\n<\/script>/)[1];
js = js.replace('start(null);',
  'window.__T={get S(){return S;},step:function(n){for(var i=0;i<n;i++){if(S.finished)return;advanceMonth();}},' +
  'buy:buyAsset,begin:beginGame,mk:function(c){return newState(makeSeed(codeToSeed(c)));}};start(null);');

const node = () => new Proxy(function () {}, {
  get: (t, k) => k === 'style' ? {} : k === 'classList' ? { add() {}, remove() {} }
    : k === 'querySelectorAll' ? () => [] : (k === 'childNodes' || k === 'children') ? []
    : k === 'getBoundingClientRect' ? () => ({ left: 0, top: 0, width: 800, height: 200 })
    : k === 'clientWidth' ? 800 : k === 'clientHeight' ? 200 : k === 'value' ? ''
    : typeof k === 'symbol' ? undefined : node(),
  set: () => true,
  apply: () => node()
});
Object.assign(global, {
  window: global, location: { protocol: 'http:', host: 'test', href: 'test' },
  document: {
    getElementById: id => id === 'gamedata' ? { textContent: data } : node(),
    createElement: () => node(), createTextNode: () => node(),
    querySelectorAll: () => [], querySelector: () => null,
    addEventListener() {}, documentElement: node()
  },
  requestAnimationFrame: () => 0, performance: { now: () => Date.now() },
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  getComputedStyle: () => ({ getPropertyValue: () => '' }),
  WebSocket: function () {}, addEventListener() {}, scrollTo() {}
});

new Function(js)();
const T = window.__T;
let failed = 0;
for (const code of ['82UG', 'AX8G', 'DMVU', 'SCHF', 'Q9ZR']) {
  try {
    T.begin(T.mk(code));
    T.S.running = false;
    T.step(30);
    T.buy('index', T.S.savings / 2);
    T.step(260);
    const ok = T.S.t === 240 && T.S.finished;
    if (!ok) failed++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${code} (${1970 + Math.floor(T.S.ws / 12)}): ${T.S.t} months`);
  } catch (e) {
    failed++;
    console.log(`FAIL ${code}: ${e.stack.split('\n').slice(0, 3).join(' | ')}`);
  }
}
process.exit(failed ? 1 : 0);
