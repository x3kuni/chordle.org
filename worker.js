export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    const type = response.headers.get("content-type") || "";
    if (!type.includes("text/html")) return response;

    const html = await response.text();
    const tag = '<script type="module" src="/auth.js"></script>';
    const body = html.includes("</body>") ? html.replace("</body>", tag + "</body>") : html + tag;

    const headers = new Headers(response.headers);
    headers.delete("content-length");
    return new Response(body, { status: response.status, statusText: response.statusText, headers });
  }
};
