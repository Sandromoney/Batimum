import https from "node:https";

function shouldAllowInsecureTls(): boolean {
  return (
    process.env.OVERPASS_INSECURE_TLS === "true" ||
    process.env.NOMINATIM_INSECURE_TLS === "true" ||
    process.env.SUPPLIER_SEARCH_INSECURE_TLS === "true" ||
    process.env.NODE_ENV === "development"
  );
}

export function httpsRequest(input: {
  url: string;
  method?: "GET" | "POST";
  body?: string;
  headers?: Record<string, string>;
  timeoutMs: number;
}): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    const url = new URL(input.url);
    const allowInsecure = shouldAllowInsecureTls();
    const method = input.method ?? "GET";
    const headers: Record<string, string> = { ...input.headers };

    if (input.body != null) {
      headers["Content-Length"] = String(Buffer.byteLength(input.body));
    }

    const request = https.request(
      {
        hostname: url.hostname,
        port: url.port || 443,
        path: `${url.pathname}${url.search}`,
        method,
        headers,
        timeout: input.timeoutMs,
        rejectUnauthorized: !allowInsecure,
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => {
          resolve({
            status: response.statusCode ?? 0,
            text: Buffer.concat(chunks).toString("utf8"),
          });
        });
      },
    );

    request.on("error", reject);
    request.on("timeout", () => {
      request.destroy(new Error(`Timeout HTTPS (${input.timeoutMs}ms)`));
    });

    if (input.body != null) request.write(input.body);
    request.end();
  });
}

/** @deprecated Prefer httpsRequest — kept for Overpass fallback body posts. */
export function requestOverpassViaHttps(
  endpoint: string,
  body: string,
  timeoutMs: number,
  userAgent: string,
): Promise<{ status: number; text: string }> {
  return httpsRequest({
    url: endpoint,
    method: "POST",
    body,
    timeoutMs,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Accept: "application/json",
      "User-Agent": userAgent,
    },
  });
}
