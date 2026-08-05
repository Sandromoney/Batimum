/**
 * Transparent TCP proxy :3130 -> 127.0.0.1:3140
 * Preserves Content-Type / Content-Encoding / bodies byte-for-byte.
 */
import net from "node:net";

const LISTEN = Number(process.env.PROXY_PORT || 3130);
const TARGET_HOST = process.env.PROXY_TARGET_HOST || "127.0.0.1";
const TARGET_PORT = Number(process.env.PROXY_TARGET_PORT || 3140);

const server = net.createServer((client) => {
  const upstream = net.connect(TARGET_PORT, TARGET_HOST);
  client.pipe(upstream);
  upstream.pipe(client);

  const closeBoth = () => {
    client.destroy();
    upstream.destroy();
  };
  client.on("error", closeBoth);
  upstream.on("error", closeBoth);
  client.on("close", () => upstream.destroy());
  upstream.on("close", () => client.destroy());
});

server.on("error", (err) => {
  console.error("[tcp-proxy] listen error", err);
  process.exit(1);
});

server.listen(LISTEN, "0.0.0.0", () => {
  console.log(`[tcp-proxy] :${LISTEN} -> ${TARGET_HOST}:${TARGET_PORT}`);
});
