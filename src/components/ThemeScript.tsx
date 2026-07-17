// Runs before first paint (inline, blocking, in <head>) to set the theme class
// from the `theme` cookie. This prevents a flash of the wrong theme (FOUC).
// Dark is the default when no cookie is present.
export function ThemeScript() {
  const js = `(function(){try{
    var m = document.cookie.match(/(?:^|; )theme=([^;]+)/);
    var t = m ? decodeURIComponent(m[1]) : 'dark';
    var d = document.documentElement;
    if (t === 'light') { d.classList.remove('dark'); d.style.colorScheme = 'light'; }
    else { d.classList.add('dark'); d.style.colorScheme = 'dark'; }
  } catch (e) {
    document.documentElement.classList.add('dark');
  }})();`;
  return <script dangerouslySetInnerHTML={{ __html: js }} />;
}
