// Serves the Angular app on its own address and sends every other hostname there.
// TARIA only returns farmer risk assessments to agrifinance.tripsecureagrifinanceltd.com (plus
// the Vercel and localhost addresses), so the app must be used from that address.
const appHost = "agrifinance.tripsecureagrifinanceltd.com";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname !== appHost) {
      url.hostname = appHost;
      url.port = "";
      return Response.redirect(url.toString(), 301);
    }
    return env.ASSETS.fetch(request);
  },
};
