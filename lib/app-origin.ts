function stripOrigin(value: string) {
  return value.replace(/\/+$/, "");
}

export function knowledgeHubOrigin() {
  const configured = process.env.AUTH_URL?.trim();
  if (configured) {
    return stripOrigin(configured).replace(/^http:\/\//i, "https://");
  }

  const railwayStatic = process.env.RAILWAY_STATIC_URL?.trim();
  if (railwayStatic) {
    return stripOrigin(railwayStatic).replace(/^http:\/\//i, "https://");
  }

  const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN?.trim();
  if (railwayDomain) {
    return `https://${railwayDomain.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
  }

  return "";
}

export function knowledgeHubUrl(href: string) {
  const origin = knowledgeHubOrigin();
  const path = href.startsWith("/") ? href : `/${href}`;
  return origin ? `${origin}${path}` : path;
}
