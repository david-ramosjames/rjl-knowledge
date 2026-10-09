import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function notFound() {
  return NextResponse.json({ error: "not_found" }, { status: 404 });
}

export function GET() {
  return notFound();
}

export function POST() {
  return notFound();
}
