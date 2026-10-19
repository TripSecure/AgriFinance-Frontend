// Serves the Angular app on www.tripsecureagrifinanceltd.com and sends every other hostname
// (the bare domain, agrifinance., workers.dev) there. TARIA only returns farmer risk assessments
// to the addresses on its allowed list, which includes this one.
const appHost = "www.tripsecureagrifinanceltd.com";

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
