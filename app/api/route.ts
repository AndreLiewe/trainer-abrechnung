/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  return NextResponse.json({
    ok: true,
    url: "https://example.com/test.pdf"
  });
}
