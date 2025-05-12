// app/api/erzeuge-abrechnung/route.ts

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  return new Response(JSON.stringify({ ok: true, message: "Die API funktioniert 🎉" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
