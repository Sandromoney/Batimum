"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, PhoneInput, Textarea } from "@/components/ui/input";
import { buildAuthenticatedFetchInit } from "@/lib/authenticated-api-fetch";
import { buildCompanyAddress } from "@/lib/fourniture/helpers";
import type { GeocodedLocation, OsmDepotResult } from "@/lib/maps/depot-types";
import {
  COMPANY_ADDRESS_EMPTY_MESSAGE,
  COMPANY_ADDRESS_UNRELIABLE_MESSAGE,
  isCompanyAddressComplete,
} from "@/lib/maps/geocode-company-address";
import { distanceKmBetween, formatDistanceKm } from "@/lib/maps/geo";
import {
  formatWebsiteHref,
  normalizeFrenchPhone,
  normalizeWebsite,
} from "@/lib/maps/supplier-contact";
import { logSupplierSearchClient } from "@/lib/maps/supplier-search-logger";
import {
  buildFournisseurFromDepot,
  buildFournisseurManual,
  isOsmIdAlreadyRegistered,
} from "@/lib/fourniture/fournisseur-storage";
import {
  normalizeForBrandMatch,
  SUPPLIER_SEARCH_SUGGESTIONS,
} from "@/lib/fourniture/brand-normalization";
import type { Fournisseur, Parametres } from "@/lib/types";
import { generateId } from "@/lib/utils";
import { Check, MapPin, Search, Store } from "lucide-react";
import type { FournisseurMapProps } from "@/components/maps/FournisseurMap";
import "@/components/maps/fournisseur-map.css";

const FournisseurMap = dynamic(() => import("@/components/maps/FournisseurMap"), {
  ssr: false,
  loading: () => (
    <div className="fournisseur-map-placeholder">Chargement de la carte…</div>
  ),
});

type Props = {
  parametres: Parametres;
  companyId: string;
  existingFournisseurs: Fournisseur[];
  onAddFournisseur: (fournisseur: Fournisseur) => boolean;
};

type ApiSupplierResult = {
  id: string;
  name: string;
  displayName: string;
  address: string;
  city: string;
  postcode: string;
  phone?: string;
  website?: string;
  phoneSource?: OsmDepotResult["phoneSource"];
  websiteSource?: OsmDepotResult["websiteSource"];
  latitude: number;
  longitude: number;
  distanceKm: number;
  source?: string;
};

const EMPTY_MANUAL = {
  nom: "",
  nomDepot: "",
  adresseDepot: "",
  ville: "",
  codePostal: "",
  telephone: "",
  email: "",
  siteWeb: "",
  commentaireInterne: "",
};

const API_UNAVAILABLE_MESSAGE =
  "La recherche automatique est temporairement indisponible. Vous pouvez ajouter le fournisseur manuellement.";

function toOsmDepot(result: ApiSupplierResult, enseigneFallback: string): OsmDepotResult {
  const osmType = result.id.includes("/") ? result.id.split("/")[0] : "node";

  return {
    osmId: result.id,
    osmType:
      osmType === "way" || osmType === "relation" || osmType === "node"
        ? osmType
        : "node",
    name: result.name,
    enseigne: enseigneFallback || result.name,
    adresse: result.address,
    ville: result.city,
    codePostal: result.postcode,
    latitude: result.latitude,
    longitude: result.longitude,
    distanceKm: result.distanceKm,
    telephone: result.phone,
    siteWeb: result.website,
    phoneSource: result.phoneSource ?? (result.phone ? "openstreetmap" : "unavailable"),
    websiteSource:
      result.websiteSource ?? (result.website ? "openstreetmap" : "unavailable"),
  };
}

function ResultSkeletons() {
  return (
    <div className="space-y-3 p-4">
      {[0, 1, 2].map((key) => (
        <div key={key} className="fournisseur-search-skeleton h-[88px]" />
      ))}
    </div>
  );
}

export function FournisseurDepotPicker({
  parametres,
  companyId,
  existingFournisseurs,
  onAddFournisseur,
}: Props) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [apiError, setApiError] = useState("");
  const [searchInfo, setSearchInfo] = useState("");
  const [radiusKm, setRadiusKm] = useState<15 | 30 | 60>(15);
  const [depots, setDepots] = useState<OsmDepotResult[]>([]);
  const [companyLocation, setCompanyLocation] = useState<GeocodedLocation | null>(
    null,
  );
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const [selectedOsmId, setSelectedOsmId] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [manual, setManual] = useState(EMPTY_MANUAL);
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [pendingDepot, setPendingDepot] = useState<OsmDepotResult | null>(null);
  const [sortKey, setSortKey] = useState<"distance" | "name">("distance");
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [addSuccessAnim, setAddSuccessAnim] = useState(false);
  const [addingLoading, setAddingLoading] = useState(false);
  const [mapRecenterKey, setMapRecenterKey] = useState(0);

  const resetSupplierSearch = useCallback(() => {
    setQuery("");
    setLoading(false);
    setApiError("");
    setSearchInfo("");
    setRadiusKm(15);
    setDepots([]);
    setSelectedOsmId(null);
    setShowManual(false);
    setManual(EMPTY_MANUAL);
    setSearchAttempted(false);
    setPendingDepot(null);
    setSortKey("distance");
    setMapRecenterKey((key) => key + 1);
  }, []);

  useEffect(() => {
    resetSupplierSearch();
  }, [resetSupplierSearch]);

  useEffect(() => {
    if (!successNotice) return;
    const timer = window.setTimeout(() => {
      setSuccessNotice(null);
      setAddSuccessAnim(false);
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [successNotice]);

  const companyLabel = parametres.entreprise?.trim() || "Votre entreprise";
  const cityLabel = parametres.ville?.trim() || "votre entreprise";
  const companyAddressLine = useMemo(() => {
    return [
      companyLabel,
      parametres.adresse,
      [parametres.codePostal, parametres.ville].filter(Boolean).join(" "),
    ]
      .filter(Boolean)
      .join(" — ");
  }, [companyLabel, parametres.adresse, parametres.codePostal, parametres.ville]);

  useEffect(() => {
    const input = {
      adresse: parametres.adresse ?? "",
      codePostal: parametres.codePostal ?? "",
      ville: parametres.ville ?? "",
    };

    if (!isCompanyAddressComplete(input)) {
      setCompanyLocation(null);
      setGeocodeError(COMPANY_ADDRESS_EMPTY_MESSAGE);
      setGeocoding(false);
      return;
    }

    let cancelled = false;
    setGeocoding(true);
    setGeocodeError(null);

    void (async () => {
      try {
        const response = await fetch(
          "/api/maps/geocode",
          await buildAuthenticatedFetchInit({
            method: "POST",
            body: JSON.stringify(input),
          }),
        );
        const data = (await response.json()) as {
          ok?: boolean;
          location?: GeocodedLocation;
          error?: string;
          code?: string;
        };
        if (cancelled) return;

        if (data.ok && data.location) {
          setCompanyLocation(data.location);
          setGeocodeError(null);
        } else {
          setCompanyLocation(null);
          setGeocodeError(
            data.error ??
              (data.code === "empty"
                ? COMPANY_ADDRESS_EMPTY_MESSAGE
                : COMPANY_ADDRESS_UNRELIABLE_MESSAGE),
          );
        }
      } catch {
        if (!cancelled) {
          setCompanyLocation(null);
          setGeocodeError(COMPANY_ADDRESS_UNRELIABLE_MESSAGE);
        }
      } finally {
        if (!cancelled) setGeocoding(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [parametres.adresse, parametres.codePostal, parametres.ville]);

  useEffect(() => {
    if (!successNotice) return;
    const t = window.setTimeout(() => setSuccessNotice(null), 8000);
    return () => window.clearTimeout(t);
  }, [successNotice]);

  function normalizeForCompare(value: string): string {
    return (value ?? "")
      .toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function depotNormalizedName(depot: OsmDepotResult): string {
    return normalizeForBrandMatch(
      `${depot.enseigne ?? ""} ${depot.name ?? ""}`.trim(),
    );
  }

  function depotNormalizedCity(depot: OsmDepotResult): string {
    return normalizeForCompare(depot.ville ?? "");
  }

  function depotNormalizedAddress(depot: OsmDepotResult): string {
    const full = `${depot.adresse ?? ""} ${depot.codePostal ?? ""} ${
      depot.ville ?? ""
    }`.trim();
    return normalizeForCompare(full);
  }

  function depotCompletenessScore(depot: OsmDepotResult): number {
    const addressLen = (depot.adresse ?? "").trim().length;
    const nameLen = (depot.name ?? "").trim().length;
    const phoneScore = depot.telephone ? 40 : 0;
    const websiteScore = depot.siteWeb ? 40 : 0;
    const addressScore = Math.min(60, addressLen / 2);
    const nameScore = Math.min(20, nameLen / 4);
    return phoneScore + websiteScore + addressScore + nameScore;
  }

  function areDepotsDuplicates(a: OsmDepotResult, b: OsmDepotResult): boolean {
    const km = distanceKmBetween(a.latitude, a.longitude, b.latitude, b.longitude);

    const sameAddress =
      depotNormalizedAddress(a) &&
      depotNormalizedAddress(a) === depotNormalizedAddress(b);
    if (sameAddress) return true;

    // Si les coordonnées sont très proches, on considère qu'il s'agit du même dépôt.
    if (km < 0.1) return true;

    const sameNameAndCity =
      Boolean(depotNormalizedName(a)) &&
      depotNormalizedName(a) === depotNormalizedName(b) &&
      Boolean(depotNormalizedCity(a)) &&
      depotNormalizedCity(a) === depotNormalizedCity(b);
    return sameNameAndCity && km < 0.1;
  }

  function dedupeAndFilterDepots(
    depots: OsmDepotResult[],
  ): OsmDepotResult[] {
    type Group = {
      representative: OsmDepotResult;
      hasRegisteredMember: boolean;
      bestUnregistered?: OsmDepotResult;
    };

    const groups: Group[] = [];

    for (const depot of depots) {
      const isRegistered = isOsmIdAlreadyRegistered(
        existingFournisseurs,
        companyId,
        depot.osmId,
      );

      let matched: Group | undefined;
      for (const g of groups) {
        if (areDepotsDuplicates(g.representative, depot)) {
          matched = g;
          break;
        }
      }

      if (!matched) {
        groups.push({
          representative: depot,
          hasRegisteredMember: isRegistered,
          bestUnregistered: isRegistered ? undefined : depot,
        });
        continue;
      }

      matched.hasRegisteredMember =
        matched.hasRegisteredMember || isRegistered;

      if (!isRegistered) {
        const prev = matched.bestUnregistered;
        if (!prev || depotCompletenessScore(depot) > depotCompletenessScore(prev)) {
          matched.bestUnregistered = depot;
        }
      }

      if (
        depotCompletenessScore(depot) >
        depotCompletenessScore(matched.representative)
      ) {
        matched.representative = depot;
      }
    }

    const result = groups
      .filter((g) => !g.hasRegisteredMember)
      .map((g) => g.bestUnregistered ?? g.representative);

    result.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
    return result;
  }

  async function searchDepots(
    nextRadius: 15 | 30 | 60 = 15,
    queryOverride?: string,
  ) {
    const trimmed = (queryOverride ?? query).trim();
    if (!trimmed) {
      setApiError("Saisissez une enseigne ou un dépôt.");
      return;
    }
    if (!companyLocation) {
      setApiError(geocodeError ?? COMPANY_ADDRESS_EMPTY_MESSAGE);
      return;
    }

    const requestBody = {
      query: trimmed,
      latitude: companyLocation.latitude,
      longitude: companyLocation.longitude,
      radiusKm: nextRadius,
      companyAddress: buildCompanyAddress(parametres),
      ville: parametres.ville?.trim() ?? "",
      codePostal: parametres.codePostal?.trim() ?? "",
    };

    logSupplierSearchClient("request", requestBody);

    setLoading(true);
    setApiError("");
    setSearchInfo("");
    setDepots([]);
    setSelectedOsmId(null);
    setRadiusKm(nextRadius);
    setSearchAttempted(true);
    if (queryOverride) setQuery(queryOverride);

    try {
      const response = await fetch(
        "/api/maps/suppliers/search",
        await buildAuthenticatedFetchInit({
          method: "POST",
          body: JSON.stringify(requestBody),
        }),
      );

      const data = (await response.json()) as {
        success?: boolean;
        results?: ApiSupplierResult[];
        message?: string;
        debugError?: string;
      };

      logSupplierSearchClient("responseStatus", response.status);
      logSupplierSearchClient("responseBody", data);

      if (!response.ok || data.success === false) {
        setApiError(data.message ?? API_UNAVAILABLE_MESSAGE);
        return;
      }

      const mapped = (data.results ?? []).map((item) => toOsmDepot(item, trimmed));
      const visible = dedupeAndFilterDepots(mapped);
      setDepots(visible);

      if (visible.length === 0) {
        setSearchInfo(
          mapped.length > 0
            ? "Les dépôts trouvés sont déjà enregistrés dans vos fournisseurs."
            : `Aucun dépôt trouvé dans un rayon de ${nextRadius} km. Vous pouvez élargir la recherche ou l'ajouter manuellement.`,
        );
      }
    } catch (error) {
      logSupplierSearchClient(
        "responseBody",
        error instanceof Error ? error.message : String(error),
      );
      setApiError(API_UNAVAILABLE_MESSAGE);
    } finally {
      setLoading(false);
    }
  }

  function selectDepot(depot: OsmDepotResult) {
    setSelectedOsmId(depot.osmId);
  }

  function chooseDepot(depot: OsmDepotResult) {
    if (isOsmIdAlreadyRegistered(existingFournisseurs, companyId, depot.osmId)) {
      setApiError("Ce dépôt est déjà enregistré dans vos fournisseurs.");
      return;
    }
    setPendingDepot(depot);
    setSelectedOsmId(depot.osmId);
    setManual({
      nom: depot.enseigne || depot.name,
      nomDepot: depot.name,
      adresseDepot: depot.adresse,
      ville: depot.ville,
      codePostal: depot.codePostal,
      telephone: depot.telephone ?? "",
      siteWeb: depot.siteWeb ?? "",
      email: "",
      commentaireInterne: "",
    });
    setApiError("");
  }

  function cancelChosenDepot() {
    setPendingDepot(null);
    setManual(EMPTY_MANUAL);
  }

  function submitChosenDepot() {
    if (!manual.nom.trim() || !pendingDepot) {
      setApiError("Le nom du fournisseur est obligatoire.");
      return;
    }
    if (isOsmIdAlreadyRegistered(existingFournisseurs, companyId, pendingDepot.osmId)) {
      setApiError("Ce dépôt est déjà enregistré dans vos fournisseurs.");
      return;
    }

    setAddingLoading(true);
    setApiError("");

    window.setTimeout(() => {
      const saved = onAddFournisseur(
        buildFournisseurFromDepot({
          id: generateId(),
          companyId,
          enseigne: manual.nom.trim(),
          nomDepot: manual.nomDepot.trim() || manual.nom.trim(),
          adresseDepot: manual.adresseDepot.trim(),
          ville: manual.ville.trim(),
          codePostal: manual.codePostal.trim(),
          latitude: pendingDepot.latitude,
          longitude: pendingDepot.longitude,
          distanceKm: pendingDepot.distanceKm,
          telephone: manual.telephone.trim() || undefined,
          email: manual.email.trim() || undefined,
          siteWeb: normalizeWebsite(manual.siteWeb) ?? undefined,
          phoneSource: (() => {
            const phone = manual.telephone.trim();
            if (!phone) return "unavailable";
            const original = (pendingDepot.telephone ?? "").trim();
            const changed =
              normalizeFrenchPhone(phone) !== normalizeFrenchPhone(original) &&
              phone !== original;
            return changed ? "manual" : (pendingDepot.phoneSource ?? "openstreetmap");
          })(),
          websiteSource: (() => {
            const site = normalizeWebsite(manual.siteWeb) ?? "";
            if (!site) return "unavailable";
            const original = normalizeWebsite(pendingDepot.siteWeb) ?? "";
            const changed = site !== original;
            return changed ? "manual" : (pendingDepot.websiteSource ?? "openstreetmap");
          })(),
          phoneVerified: (() => {
            const phone = manual.telephone.trim();
            if (!phone) return false;
            const original = (pendingDepot.telephone ?? "").trim();
            return (
              normalizeFrenchPhone(phone) !== normalizeFrenchPhone(original) ||
              phone !== original
            );
          })(),
          websiteVerified: (() => {
            const site = normalizeWebsite(manual.siteWeb) ?? "";
            if (!site) return false;
            const original = normalizeWebsite(pendingDepot.siteWeb) ?? "";
            return site !== original;
          })(),
          commentaireInterne: manual.commentaireInterne.trim() || undefined,
          osmId: pendingDepot.osmId,
          osmType: pendingDepot.osmType,
        }),
      );

      setAddingLoading(false);

      if (!saved) {
        setApiError("Ce dépôt est déjà enregistré dans vos fournisseurs.");
        return;
      }

      const depotName = pendingDepot.name || manual.nom.trim();
      const depotCity = pendingDepot.ville?.trim() || manual.ville.trim();
      setAddSuccessAnim(true);
      setSuccessNotice(
        `${depotName}${depotCity ? ` ${depotCity}` : ""} a été ajouté à vos fournisseurs.`,
      );

      setPendingDepot(null);
      setManual(EMPTY_MANUAL);
      setQuery("");
      setDepots([]);
      setSelectedOsmId(null);
      setSearchAttempted(false);
      setApiError("");
      setSearchInfo("");
    }, 450);
  }

  function submitManual() {
    if (!manual.nom.trim()) {
      setApiError("Le nom du fournisseur est obligatoire.");
      return;
    }
    onAddFournisseur(
      buildFournisseurManual({
        id: generateId(),
        companyId,
        nom: manual.nom.trim(),
        nomDepot: manual.nomDepot.trim() || manual.nom.trim(),
        adresseDepot: manual.adresseDepot.trim(),
        ville: manual.ville.trim(),
        codePostal: manual.codePostal.trim(),
        telephone: manual.telephone.trim() || undefined,
        email: manual.email.trim() || undefined,
        siteWeb: manual.siteWeb.trim() || undefined,
        commentaireInterne: manual.commentaireInterne.trim() || undefined,
      }),
    );
    setManual(EMPTY_MANUAL);
    setShowManual(false);
    setApiError("");
  }

  const mapProps: FournisseurMapProps = {
    company: companyLocation,
    depots,
    selectedOsmId,
    radiusKm: searchAttempted ? radiusKm : 15,
    recenterKey: mapRecenterKey,
    onSelectDepot: selectDepot,
    onConfirmDepot: chooseDepot,
    emptyMessage: geocodeError ?? COMPANY_ADDRESS_EMPTY_MESSAGE,
  };

  const sortedDepots = useMemo(() => {
    const list = [...depots];
    if (sortKey === "name") {
      list.sort((a, b) => {
        const an = normalizeForCompare(a.name ?? "");
        const bn = normalizeForCompare(b.name ?? "");
        return an.localeCompare(bn);
      });
      return list;
    }
    list.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
    return list;
  }, [depots, sortKey]);

  if (showManual) {
    return (
      <Card className="border-border/70 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold">Ajouter manuellement un fournisseur</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <section>
            <Label>Nom</Label>
            <Input
              value={manual.nom}
              onChange={(e) => setManual((d) => ({ ...d, nom: e.target.value }))}
            />
          </section>
          <section>
            <Label>Dépôt</Label>
            <Input
              value={manual.nomDepot}
              onChange={(e) => setManual((d) => ({ ...d, nomDepot: e.target.value }))}
            />
          </section>
          <section className="sm:col-span-2">
            <Label>Adresse</Label>
            <Input
              value={manual.adresseDepot}
              onChange={(e) =>
                setManual((d) => ({ ...d, adresseDepot: e.target.value }))
              }
            />
          </section>
          <section>
            <Label>Ville</Label>
            <Input
              value={manual.ville}
              onChange={(e) => setManual((d) => ({ ...d, ville: e.target.value }))}
            />
          </section>
          <section>
            <Label>Code postal</Label>
            <Input
              value={manual.codePostal}
              onChange={(e) =>
                setManual((d) => ({ ...d, codePostal: e.target.value }))
              }
            />
          </section>
          <section>
            <Label>Téléphone</Label>
            <PhoneInput
              mode="auto"
              value={manual.telephone}
              onChangeValue={(telephone) => setManual((d) => ({ ...d, telephone }))}
            />
          </section>
          <section>
            <Label>Email</Label>
            <Input
              type="email"
              value={manual.email}
              onChange={(e) => setManual((d) => ({ ...d, email: e.target.value }))}
            />
          </section>
          <section className="sm:col-span-2">
            <Label>Site web</Label>
            <Input
              value={manual.siteWeb}
              onChange={(e) => setManual((d) => ({ ...d, siteWeb: e.target.value }))}
            />
          </section>
          <section className="flex gap-2 sm:col-span-2">
            <Button type="button" size="sm" onClick={submitManual}>
              Enregistrer le fournisseur
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setShowManual(false)}
            >
              Retour à la recherche
            </Button>
          </section>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="rounded-[22px] border-border/60 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-foreground">
            Trouver un dépôt fournisseur
          </h2>
          <p className="text-sm text-muted-foreground">
            Recherchez une enseigne autour de votre entreprise, puis sélectionnez le
            dépôt avec lequel vous travaillez.
          </p>
        </div>

        {geocoding ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Localisation de votre entreprise…
          </p>
        ) : geocodeError ? (
          <p className="mt-3 text-xs text-muted-foreground">{geocodeError}</p>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">
            Recherche autour de :{" "}
            <span className="text-foreground/80">{companyAddressLine}</span>
            <span className="mt-1 block text-foreground/70">
              Recherche dans un rayon de 15 km autour de votre entreprise.
            </span>
          </p>
        )}

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void searchDepots(15);
              }}
              placeholder="Téréva, Point.P, CEDEO, Rexel, fournisseur local…"
              className="h-11 rounded-xl border-border/70 bg-neutral-50/70 pl-9"
            />
          </div>
          <Button
            type="button"
            className="h-11 rounded-xl bg-emerald-600 px-6 hover:bg-emerald-700"
            onClick={() => void searchDepots(15)}
            disabled={loading || geocoding || !companyLocation}
          >
            {loading ? "Recherche…" : "Rechercher"}
          </Button>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {SUPPLIER_SEARCH_SUGGESTIONS.map((brand) => (
            <button
              key={brand}
              type="button"
              className="rounded-full border border-border/60 bg-white px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-emerald-300 hover:bg-emerald-50/50 hover:text-emerald-700"
              disabled={loading || geocoding || !companyLocation}
              onClick={() => void searchDepots(15, brand)}
            >
              {brand}
            </button>
          ))}
        </div>

        {apiError ? (
          <div className="mt-3 rounded-xl border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-xs text-amber-950">
            {apiError}
          </div>
        ) : null}
      </Card>

      {successNotice ? (
        <div className="fournisseur-add-success flex items-center gap-3 rounded-xl border border-emerald-200/80 bg-emerald-50 px-4 py-3 text-sm text-emerald-950 shadow-sm">
          <span
            className={`fournisseur-add-check ${addSuccessAnim ? "is-animated" : ""}`}
            aria-hidden
          >
            <Check className="h-4 w-4" />
          </span>
          <p>{successNotice}</p>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-[22px] border border-border/60 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
        <div className="grid lg:grid-cols-[38fr_62fr]">
          <div className="flex min-h-[360px] flex-col border-b border-border/50 lg:min-h-[520px] lg:max-h-[520px] lg:border-b-0 lg:border-r">
            {searchAttempted ? (
              <div className="border-b border-border/50 bg-neutral-50/70 px-4 py-3 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    {depots.length > 0 ? (
                      <p className="text-sm font-semibold text-foreground">
                        {depots.length} dépôts trouvés autour de {cityLabel}
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs text-muted-foreground">
                      Rayon de recherche : {radiusKm} km
                    </p>
                  </div>
                  <div className="flex items-center rounded-xl border border-border/60 bg-white p-1">
                    <button
                      type="button"
                      className={`rounded-lg px-2 py-1 text-xs font-medium transition-colors ${
                        sortKey === "distance"
                          ? "bg-emerald-50 text-emerald-700"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      onClick={() => setSortKey("distance")}
                    >
                      Distance
                    </button>
                    <button
                      type="button"
                      className={`rounded-lg px-2 py-1 text-xs font-medium transition-colors ${
                        sortKey === "name"
                          ? "bg-emerald-50 text-emerald-700"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      onClick={() => setSortKey("name")}
                    >
                      Nom
                    </button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Recherche dans un rayon de {radiusKm} km autour de votre entreprise.
                </p>
              </div>
            ) : null}

            <div className="min-h-0 flex-1 overflow-y-auto">
              {loading ? (
                <div>
                  <p className="px-4 pt-4 text-sm text-muted-foreground">
                    Recherche des dépôts à proximité…
                  </p>
                  <ResultSkeletons />
                </div>
              ) : depots.length > 0 ? (
                <div className="space-y-2 p-3">
                  {sortedDepots.map((depot) => {
                    const selected = selectedOsmId === depot.osmId;
                    return (
                      <div
                        key={depot.osmId}
                        className={`cursor-pointer rounded-[14px] border px-3 py-3 transition-all ${
                          selected
                            ? "border-emerald-500 bg-emerald-50/80 shadow-sm"
                            : "border-border/60 bg-white hover:border-emerald-300/80"
                        }`}
                        onClick={() => selectDepot(depot)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            selectDepot(depot);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-3">
                            <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-200/70 bg-emerald-50 text-emerald-700">
                              <Store className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              {depot.enseigne &&
                              depot.enseigne.trim() !== depot.name.trim() ? (
                                <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-700">
                                  {depot.enseigne}
                                </p>
                              ) : null}
                              <p className="text-sm font-semibold text-foreground">
                                {depot.name}
                              </p>
                              {depot.adresse ? (
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                  {depot.adresse}
                                </p>
                              ) : null}
                              <p className="mt-1 text-xs text-muted-foreground">
                                {[depot.ville, depot.codePostal]
                                  .filter(Boolean)
                                  .join(" ")}
                              </p>
                              {depot.distanceKm != null ? (
                                <p className="mt-1 text-xs font-semibold text-emerald-800">
                                  {formatDistanceKm(depot.distanceKm)}
                                </p>
                              ) : null}
                              <div className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
                                {depot.telephone ? (
                                  <a
                                    href={`tel:${depot.telephone.replace(/\s/g, "")}`}
                                    className="block text-emerald-700 hover:underline"
                                    onClick={(event) => event.stopPropagation()}
                                  >
                                    {depot.telephone}
                                  </a>
                                ) : (
                                  <p>Téléphone non disponible</p>
                                )}
                                {depot.siteWeb ? (
                                  <a
                                    href={formatWebsiteHref(depot.siteWeb)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block text-emerald-700 hover:underline"
                                    onClick={(event) => event.stopPropagation()}
                                  >
                                    {depot.siteWeb.replace(/^https?:\/\//i, "")}
                                  </a>
                                ) : (
                                  <p>Site web non disponible</p>
                                )}
                              </div>
                            </div>
                          </div>

                          <Button
                            type="button"
                            size="sm"
                            className={`min-h-9 shrink-0 rounded-lg px-3 ${
                              selected
                                ? "bg-emerald-600 hover:bg-emerald-700"
                                : "bg-emerald-600/90 hover:bg-emerald-700"
                            }`}
                            onClick={(event) => {
                              event.stopPropagation();
                              chooseDepot(depot);
                            }}
                          >
                            {selected ? (
                              <span className="inline-flex items-center gap-1">
                                <Check className="h-3.5 w-3.5" />
                                Sélectionné
                              </span>
                            ) : (
                              "Choisir"
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : searchAttempted && searchInfo ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                  <p className="text-sm text-muted-foreground">{searchInfo}</p>
                  {radiusKm === 15 ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="rounded-xl"
                      onClick={() => void searchDepots(30)}
                    >
                      Élargir à 30 km
                    </Button>
                  ) : null}
                  {radiusKm === 30 ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="rounded-xl"
                      onClick={() => void searchDepots(60)}
                    >
                      Élargir à 60 km
                    </Button>
                  ) : null}
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <p className="max-w-[220px] text-sm text-muted-foreground">
                    Recherchez une enseigne pour afficher les dépôts proches.
                  </p>
                </div>
              )}
            </div>

            <div className="border-t border-border/50 p-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={() => setShowManual(true)}
              >
                Ajouter manuellement un fournisseur
              </Button>
            </div>
          </div>

          <div className="min-h-[360px] lg:min-h-[520px] lg:h-[520px]">
            {geocoding ? (
              <div className="fournisseur-map-placeholder">
                Localisation de votre entreprise…
              </div>
            ) : (
              <FournisseurMap {...mapProps} />
            )}
          </div>
        </div>
      </div>

      {pendingDepot ? (
        <Card className="rounded-[22px] border-emerald-200/80 bg-emerald-50/40 p-5 shadow-sm">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              Ajouter ce dépôt à vos fournisseurs ?
            </p>
            <p className="text-xs text-muted-foreground">
              Vérifiez, corrigez ou complétez le téléphone et le site web avant
              d’ajouter.
            </p>
          </div>
          <div className="mt-4 space-y-3 rounded-xl border border-border/60 bg-white p-4">
            <div className="space-y-1 text-xs text-muted-foreground">
              <p className="text-sm font-medium text-foreground">{pendingDepot.name}</p>
              <p className="break-words">
                {[
                  pendingDepot.adresse,
                  [pendingDepot.codePostal, pendingDepot.ville]
                    .filter(Boolean)
                    .join(" "),
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>
              {pendingDepot.distanceKm != null ? (
                <p className="font-medium text-emerald-700">
                  {formatDistanceKm(pendingDepot.distanceKm)}
                </p>
              ) : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Téléphone</Label>
                <PhoneInput
                  value={manual.telephone}
                  onChangeValue={(telephone) =>
                    setManual((d) => ({ ...d, telephone }))
                  }
                  placeholder="Non renseigné"
                />
                {!manual.telephone.trim() ? (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Téléphone non disponible — vous pouvez le saisir.
                  </p>
                ) : null}
              </div>
              <div>
                <Label>Site web</Label>
                <Input
                  value={manual.siteWeb}
                  onChange={(e) =>
                    setManual((d) => ({ ...d, siteWeb: e.target.value }))
                  }
                  placeholder="Non renseigné"
                />
                {!manual.siteWeb.trim() ? (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Site web non disponible — vous pouvez le saisir.
                  </p>
                ) : null}
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={cancelChosenDepot}>
              Annuler
            </Button>
            <Button
              type="button"
              size="sm"
              className="rounded-lg bg-emerald-600 hover:bg-emerald-700"
              disabled={addingLoading}
              onClick={submitChosenDepot}
            >
              {addingLoading ? "Ajout en cours…" : "Ajouter le fournisseur"}
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
