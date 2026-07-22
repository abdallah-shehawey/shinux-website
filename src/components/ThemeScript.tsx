// Runs before first paint (inline, blocking, in <head>) to reconcile the theme
// with the `theme` cookie. This prevents a flash of the wrong theme (FOUC).
// Dark is the default: <html> already ships with the `dark` class from the
// server, so with no cookie we leave it as-is and only strip it for `light`.
export function ThemeScript() {
  const js = `(function(){try{
    var m = document.cookie.match(/(?:^|; )theme=([^;]+)/);
    var t = m ? decodeURIComponent(m[1]) : 'dark';
    var d = document.documentElement;
    if (t === 'light') { d.classList.remove('dark'); d.style.colorScheme = 'light'; }
    else { d.classList.add('dark'); d.style.colorScheme = 'dark'; }
  } catch (e) {
    document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = 'dark';
  }})();`;
  return <script dangerouslySetInnerHTML={{ __html: js }} />;
}
