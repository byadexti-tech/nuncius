function withProtocol(value: string) {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function withoutTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export function getSiteUrl() {
  const configuredUrl = process.env.SITE_URL?.trim();
  if (configuredUrl) {
    return withoutTrailingSlash(withProtocol(configuredUrl));
  }

  const vercelUrl =
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    return withoutTrailingSlash(withProtocol(vercelUrl));
  }

  return `http://localhost:${process.env.PORT?.trim() || "3000"}`;
}
