export function canonicalizeDiscoveryUrl(
  url: string | undefined,
): string {
  if (!url) return "";

  try {
    const normalizedUrl = new URL(url.trim());
    normalizedUrl.hash = "";
    normalizedUrl.hostname = normalizedUrl.hostname
      .toLocaleLowerCase()
      .replace(/^www\./, "");

    if (
      (normalizedUrl.protocol === "https:" && normalizedUrl.port === "443") ||
      (normalizedUrl.protocol === "http:" && normalizedUrl.port === "80")
    ) {
      normalizedUrl.port = "";
    }

    for (const key of [...normalizedUrl.searchParams.keys()]) {
      if (/^(utm_.+|fbclid|gclid|mc_cid|mc_eid)$/i.test(key)) {
        normalizedUrl.searchParams.delete(key);
      }
    }

    normalizedUrl.searchParams.sort();
    if (normalizedUrl.pathname !== "/") {
      normalizedUrl.pathname = normalizedUrl.pathname.replace(/\/+$/, "");
    }
    return normalizedUrl.toString().replace(/\/$/, "");
  } catch {
    return url.trim().replace(/\/$/, "").toLocaleLowerCase();
  }
}
