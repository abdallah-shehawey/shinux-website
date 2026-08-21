// Strips the tracking parameters other platforms bolt onto a shared link.
//
// Paste `shinux.vercel.app` into a Facebook comment and the link everyone else
// clicks is `shinux.vercel.app/?fbclid=IwdGRjcAT1raJjbGNr…` — a hundred
// characters of Facebook's click id, sitting in the address bar of a site that
// never asked for it. Instagram, Google Ads, Mailchimp and the rest each have
// their own. None of them mean anything here: nothing on this site reads them,
// and every page that does read the query string (the tag filters) uses names
// that are not in this list.
//
// Inline and in <head>, like ThemeScript, for two reasons: it runs before the
// first paint, so the ugly URL is never on screen, and it runs before Next
// hydrates, so the router boots from the clean URL and never has to be told
// about the change. `replaceState` rather than `pushState`, so Back still
// returns to wherever the link was clicked instead of to the dirty copy of
// this same page.
//
// The alternative — a redirect in next.config.ts or a proxy rule — would cost a
// round trip on every shared link, and Next re-appends unmatched query
// parameters to a redirect destination anyway, which here would loop.
const TRACKING_PARAMS = [
  "fbclid", // Facebook
  "mibextid", // Facebook (in-app browser)
  "igshid", // Instagram
  "igsh", // Instagram (newer)
  "gclid", // Google Ads
  "dclid", // Google Display
  "gbraid",
  "wbraid",
  "msclkid", // Microsoft Ads
  "twclid", // X / Twitter
  "ttclid", // TikTok
  "yclid", // Yandex
  "li_fat_id", // LinkedIn
  "mc_cid", // Mailchimp
  "mc_eid",
  "ref_src", // X share links
  "ref_url",
  "_openstat",
];

export function CleanUrlScript() {
  const js = `(function(){
    try{
      if (!window.history || !history.replaceState) return;
      var junk = ${JSON.stringify(TRACKING_PARAMS)};
      var url = new URL(window.location.href);
      var params = url.searchParams;
      var dirty = false;
      var keys = [];
      params.forEach(function(_, key){ keys.push(key); });
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        // utm_* is a whole family and not worth enumerating.
        if (junk.indexOf(key) === -1 && key.slice(0, 4) !== 'utm_') continue;
        params.delete(key);
        dirty = true;
      }
      if (!dirty) return;
      // Rebuilt by hand rather than from url.href: URL percent-encodes the
      // path, and this site has Arabic question slugs, which would turn a
      // readable address into a wall of %D8%A7 on the way past.
      var query = params.toString();
      history.replaceState(history.state, '', window.location.pathname + (query ? '?' + query : '') + window.location.hash);
    } catch (e) {}
  })();`;
  return <script dangerouslySetInnerHTML={{ __html: js }} />;
}
