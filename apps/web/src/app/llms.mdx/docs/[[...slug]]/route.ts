import { notFound } from "next/navigation";
import type { NextRequest } from "next/server";

import { getLLMText, source } from "@/lib/source";

export const revalidate = false;

export async function GET(_req: NextRequest, context: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await context.params;
  const page = source.getPage(slug ?? []);
  if (!page) notFound();

  return new Response(await getLLMText(page), {
    headers: {
      "Content-Type": "text/markdown",
    },
  });
}

export function generateStaticParams() {
  return source.generateParams();
}
