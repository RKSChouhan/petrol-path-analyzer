const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const IMG_BB_PAGE_HOSTS = new Set(["ibb.co", "www.ibb.co", "imgbb.com", "www.imgbb.com"]);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const getHostname = (value: string) => {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
};

const isImgBbPageUrl = (value: string) => {
  const hostname = getHostname(value);
  return hostname ? IMG_BB_PAGE_HOSTS.has(hostname) : false;
};

const extractMetaImageUrl = (html: string) => {
  const patterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return match[1].replace(/&amp;/g, "&");
    }
  }

  return null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json();
    const originalUrl = typeof body?.url === "string" ? body.url.trim() : "";

    if (!originalUrl) {
      return json({ url: null });
    }

    if (!isImgBbPageUrl(originalUrl)) {
      return json({ url: originalUrl });
    }

    const response = await fetch(originalUrl, {
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; LovableLogoResolver/1.0)",
        accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      return json({ url: originalUrl });
    }

    const html = await response.text();
    const resolvedUrl = extractMetaImageUrl(html);

    return json({ url: resolvedUrl || originalUrl });
  } catch (error) {
    return json({
      url: null,
      error: error instanceof Error ? error.message : "Unable to resolve logo URL",
    }, 500);
  }
});
