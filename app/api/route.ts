/* eslint-disable @typescript-eslint/no-unused-vars */

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  return new Response(JSON.stringify({
    ok: true,
    url: "https://example.com/test.pdf"
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
