/* ==========================================================================
   BLACK LIST — site configuration
   Edit this file only. Nothing here is hardcoded into the components.
   ========================================================================== */
window.BLACKLIST_CONFIG = {
  /* Launch moment as an ISO-8601 string WITH a timezone offset.
     Example: "2026-12-12T20:00:00+05:30"
     Leave null and the countdown shows "THE DATE IS CLASSIFIED."
     For previews you can also append ?launch=2026-12-12T20:00:00+05:30 to the URL. */
  launchDate: "2027-06-25T20:00:00+05:30",

  /* Full Instagram profile URL, e.g. "https://www.instagram.com/blacklist.official/".
     Leave empty and the footer shows the icon as "SOON" (no dead link). */
  instagramUrl: "",

  /* Email capture. The form POSTs here and only shows success on a 2xx response.
     - endpoint: your backend / serverless function / provider form URL
     - format:   "json" (application/json body) or "form" (urlencoded, e.g. Formspree, Kit, Buttondown)
     - emailField: the field name your endpoint expects
     - extraFields: sent with every request (consent is always sent as consent=true + consentText)
     A 409 response is treated as "already on the list".
     See server/subscribe.example.js for a ready-made handler. */
  signup: {
    endpoint: "",
    format: "json",
    emailField: "email",
    headers: {},
    extraFields: { source: "blacklist-coming-soon" },
    timeoutMs: 12000
  }
};
