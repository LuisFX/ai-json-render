import { loadEnvelope, patchMeta } from "@/lib/conversation/store";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: RouteContext) {
  const { id } = await ctx.params;
  const envelope = await loadEnvelope(id);
  if (!envelope) {
    return Response.json({ error: "not found" }, { status: 404 });
  }
  return Response.json(envelope);
}

export async function PATCH(req: Request, ctx: RouteContext) {
  const { id } = await ctx.params;
  const body = (await req.json()) as {
    name?: string | null;
    pinnedAt?: string | null;
    archivedAt?: string | null;
  };

  const envelope = await patchMeta(id, body);
  if (!envelope) {
    return Response.json({ error: "not found" }, { status: 404 });
  }
  return Response.json(envelope);
}
