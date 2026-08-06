/** Charge l'API Google Maps JS une seule fois (côté navigateur). */

type GoogleMapsWindow = Window & {
  google?: typeof google;
  __batimumGoogleMapsPromise?: Promise<typeof google>;
};

function readPublicKey(): string {
  return (
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY?.trim() ||
    ""
  );
}

export async function resolveGoogleMapsBrowserKey(): Promise<string | null> {
  const fromEnv = readPublicKey();
  if (fromEnv) return fromEnv;

  try {
    const response = await fetch("/api/maps/browser-key", {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { key?: string | null };
    const key = payload.key?.trim();
    return key || null;
  } catch {
    return null;
  }
}

export function loadGoogleMapsApi(apiKey: string): Promise<typeof google> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps uniquement côté client."));
  }

  const win = window as GoogleMapsWindow;
  if (win.google?.maps) {
    return Promise.resolve(win.google);
  }
  if (win.__batimumGoogleMapsPromise) {
    return win.__batimumGoogleMapsPromise;
  }

  win.__batimumGoogleMapsPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      "script[data-batimum-google-maps]",
    );
    if (existing) {
      existing.addEventListener("load", () => {
        if (win.google?.maps) resolve(win.google);
        else reject(new Error("Google Maps non disponible après chargement."));
      });
      existing.addEventListener("error", () =>
        reject(new Error("Échec de chargement Google Maps.")),
      );
      return;
    }

    const script = document.createElement("script");
    script.dataset.batimumGoogleMaps = "1";
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey,
    )}&libraries=places&language=fr&region=FR&v=weekly`;
    script.onload = () => {
      if (win.google?.maps) resolve(win.google);
      else reject(new Error("Google Maps non disponible après chargement."));
    };
    script.onerror = () =>
      reject(new Error("Échec de chargement Google Maps."));
    document.head.appendChild(script);
  });

  return win.__batimumGoogleMapsPromise;
}
