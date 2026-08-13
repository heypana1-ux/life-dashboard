// Supabase Edge Function: Strava OAuth proxy.
//
// Holds the Strava client secret (never exposed to the browser) and performs the three
// operations that must not run client-side: exchanging the OAuth code for tokens,
// refreshing tokens, and fetching activities (Strava's API doesn't send CORS headers).
//
// Deploy (from the repo root, with the Supabase CLI):
//   supabase functions deploy strava --no-verify-jwt
//   supabase secrets set STRAVA_CLIENT_ID=xxxxx STRAVA_CLIENT_SECRET=yyyyy
//
// The app calls it at:  https://<project>.supabase.co/functions/v1/strava

const CLIENT_ID = Deno.env.get("STRAVA_CLIENT_ID") ?? "";
const CLIENT_SECRET = Deno.env.get("STRAVA_CLIENT_SECRET") ?? "";

function cors(origin: string | null): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    "Access-Control-Max-Age": "86400",
  };
}

function json(body: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...cors(origin) },
  });
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405, origin);
  if (!CLIENT_ID || !CLIENT_SECRET) return json({ error: "server not configured" }, 500, origin);

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "bad json" }, 400, origin);
  }
  const action = String(payload.action ?? "");

  try {
    if (action === "exchange" || action === "refresh") {
      const params = new URLSearchParams({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET });
      if (action === "exchange") {
        params.set("code", String(payload.code ?? ""));
        params.set("grant_type", "authorization_code");
      } else {
        params.set("refresh_token", String(payload.refresh_token ?? ""));
        params.set("grant_type", "refresh_token");
      }
      const r = await fetch("https://www.strava.com/oauth/token", { method: "POST", body: params });
      const data = await r.json();
      return json(data, r.ok ? 200 : r.status, origin);
    }

    if (action === "activities") {
      const accessToken = String(payload.access_token ?? "");
      const after = Number(payload.after ?? 0);
      const perPage = Number(payload.per_page ?? 100);
      const url = new URL("https://www.strava.com/api/v3/athlete/activities");
      if (after > 0) url.searchParams.set("after", String(Math.floor(after)));
      url.searchParams.set("per_page", String(Math.min(200, perPage)));
      const r = await fetch(url.toString(), { headers: { Authorization: `Bearer ${accessToken}` } });
      const data = await r.json();
      return json(data, r.ok ? 200 : r.status, origin);
    }

    return json({ error: "unknown action" }, 400, origin);
  } catch (e) {
    return json({ error: String(e) }, 500, origin);
  }
});
