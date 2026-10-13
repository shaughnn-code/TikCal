// Injects Dynamic Island, status bar and home indicator into every .screen.
// data-tone="light" on .screen = dark glyphs (for light UIs).
const sys = (c) => `
  <svg width="18" height="12" viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1" fill="${c}"/><rect x="5" y="5.5" width="3" height="6.5" rx="1" fill="${c}"/><rect x="10" y="3" width="3" height="9" rx="1" fill="${c}"/><rect x="15" y="0" width="3" height="12" rx="1" fill="${c}"/></svg>
  <svg width="16" height="12" viewBox="0 0 16 12"><path d="M8 11.5 5.6 9a3.4 3.4 0 0 1 4.8 0L8 11.5Z M3.4 6.8a6.5 6.5 0 0 1 9.2 0l-1.4 1.4a4.5 4.5 0 0 0-6.4 0L3.4 6.8Z M1.1 4.5a9.8 9.8 0 0 1 13.8 0l-1.4 1.4a7.8 7.8 0 0 0-11 0L1.1 4.5Z" fill="${c}"/></svg>
  <svg width="27" height="13" viewBox="0 0 27 13"><rect x=".5" y=".5" width="23" height="12" rx="3.5" fill="none" stroke="${c}" opacity=".4"/><rect x="2" y="2" width="18" height="9" rx="2" fill="${c}"/><rect x="24.5" y="4.5" width="1.6" height="4" rx=".8" fill="${c}" opacity=".45"/></svg>`;
document.querySelectorAll('.screen').forEach((s) => {
  const c = s.dataset.tone === 'light' ? '#16140f' : '#ffffff';
  s.insertAdjacentHTML('beforeend', `
    <div class="island"></div>
    <div class="status" style="color:${c}"><span>9:41</span><span class="sys">${sys(c)}</span></div>
    <div class="home-ind" style="background:${c};opacity:.85"></div>`);
});
