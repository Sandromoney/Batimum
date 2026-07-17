import { getRefreshedSupabaseAccessToken } from "@/lib/settings-client-auth";

export async function buildAuthenticatedFetchInit(
  init: RequestInit = {},
): Promise<RequestInit> {
  const accessToken = await getRefreshedSupabaseAccessToken();
  const headers = new Headers(init.headers);

  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  } else {
    console.log("[parametres-save] client: fetch without Bearer token");
  }

  return {
    ...init,
    credentials: "include",
    headers,
  };
}
