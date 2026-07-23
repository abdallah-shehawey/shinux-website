// Runs before first paint (inline, blocking, in <head>) to reconcile the theme
// with the `theme` cookie. This prevents a flash of the wrong theme (FOUC).
// Dark is the default: <html> already ships with the `dark` class from the
// server, so with no cookie we leave it as-is and only strip it for `light`.
// It also points meta[theme-color] at the chosen theme so the browser/PWA
// chrome matches the page instead of following the OS preference. Being inline
// in the document, this runs from the service-worker-cached HTML too, which is
// what keeps the theme stable offline.
export function ThemeScript() {
  const js = `(function(){try{
    var m = document.cookie.match(/(?:^|; )theme=([^;]+)/);
    var t = m ? decodeURIComponent(m[1]) : 'dark';
    var d = document.documentElement;
    if (t === 'light') { d.classList.remove('dark'); d.style.colorScheme = 'light'; }
    else { d.classList.add('dark'); d.style.colorScheme = 'dark'; }
    var mc = document.querySelector('meta[name="theme-color"]');
    if (mc) mc.setAttribute('content', t === 'light' ? '#ffffff' : '#010409');
  } catch (e) {
    document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = 'dark';
  }})();`;
  return <script dangerouslySetInnerHTML={{ __html: js }} />;
}
