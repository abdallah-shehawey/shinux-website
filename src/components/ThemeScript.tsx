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
  const js = `(function(){try{
    var m = document.cookie.match(/(?:^|; )theme=([^;]+)/);
    var t = m ? decodeURIComponent(m[1]) : 'dark';
    var d = document.documentElement;
    if (t === 'light') { d.setAttribute('data-theme', 'light'); d.style.colorScheme = 'light'; }
    else { d.removeAttribute('data-theme'); d.style.colorScheme = 'dark'; }
    var mc = document.querySelector('meta[name="theme-color"]');
    if (mc) mc.setAttribute('content', t === 'light' ? '#ffffff' : '#010409');
  } catch (e) {
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.colorScheme = 'dark';
  }})();`;
  return <script dangerouslySetInnerHTML={{ __html: js }} />;
}
