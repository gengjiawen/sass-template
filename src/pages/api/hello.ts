import { getBlitzContext } from "@/src/app/blitz-server"
import type { NextApiRequest, NextApiResponse } from "next"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const ctx = await getBlitzContext()
  if (!ctx.session.userId) {
    return new Response("Unauthorized", { status: 401 })
  }
  res.status(200).json({ text: "Hello" })
}
