// Runs before first paint (inline, blocking, in <head>) to apply the `theme`
// cookie, which prevents a flash of the wrong theme (FOUC).
//
// The theme lives in a `data-theme` ATTRIBUTE, never a class: <html>'s
// className is a React prop, so on the first client render React re-applies the
// server value and wipes anything we put there. That is a real bug we hit — the
// home page (its client hero re-renders immediately) reverted to dark ~13ms
// after DOMContentLoaded while every other page stayed light. React leaves
// attributes that do not appear in JSX alone, so `data-theme` survives.
//
// Dark is the default and needs no attribute; only `light` opts out. Being
// inline in the document, this also runs from service-worker-cached HTML, which
// is what keeps the theme identical offline. It also points meta[theme-color]
// at the chosen theme so the browser/PWA chrome matches the page.
export function ThemeScript() {
  const js = `(function(){
    var d = document.documentElement;
    function want(){
      var m = document.cookie.match(/(?:^|; )theme=([^;]+)/);
      return (m ? decodeURIComponent(m[1]) : 'dark') === 'light' ? 'light' : 'dark';
    }
    function apply(){
      try{
        var t = want();
        var attr = t === 'light' ? 'light' : null;
        // Every write is guarded by an equality check: an unconditional write
        // would re-trigger the observer below and spin forever.
        if (d.getAttribute('data-theme') !== attr) {
          if (attr) d.setAttribute('data-theme', attr); else d.removeAttribute('data-theme');
        }
        if (d.style.colorScheme !== t) d.style.colorScheme = t;
        var mc = document.querySelector('meta[name="theme-color"]');
        var c = t === 'light' ? '#ffffff' : '#010409';
        if (mc && mc.getAttribute('content') !== c) mc.setAttribute('content', c);
      } catch (e) {}
    }
    apply();
    // React owns <html> and resets its attributes when it hydrates and
    // re-renders — measured on the home page (its client hero re-renders
    // immediately), which wiped data-theme ~60ms in and snapped the page back
    // to dark. Re-assert the theme whenever that happens. The observer callback
    // runs at the microtask checkpoint, before the next paint, so nothing
    // flashes. apply() re-reads the cookie every time, so it agrees with the
    // toggle instead of fighting it.
    try { new MutationObserver(apply).observe(d, { attributes: true, attributeFilter: ['data-theme','class','style'] }); } catch (e) {}
    // The toggle changes the cookie, then asks for the same logic to run.
    window.__applyTheme = apply;
  })();`;
  return <script dangerouslySetInnerHTML={{ __html: js }} />;
}
