import http from "node:http";

const server = http.createServer((request, response) => {
  const upstream = request.url?.startsWith("/api/")
    ? Number(process.env.API_PORT ?? 4000)
    : Number(process.env.WEB_PORT ?? 3000);
  const proxy = http.request(
    {
      hostname: "127.0.0.1",
      port: upstream,
      path: request.url,
      method: request.method,
      headers: { ...request.headers, host: "127.0.0.1:" + upstream },
    },
    (result) => {
      response.writeHead(result.statusCode ?? 502, result.headers);
      result.pipe(response);
    },
  );
  proxy.on("error", () => {
    response.writeHead(502).end("Service unavailable");
  });
  request.pipe(proxy);
});
server.listen(Number(process.env.PROXY_PORT ?? 8080), "127.0.0.1");
