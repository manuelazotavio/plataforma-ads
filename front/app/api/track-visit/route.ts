import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const BOT_RE = /bot|crawl|spider|scraper|curl|wget|python|go-http|libwww|java\/|headless/i

export async function POST(req: NextRequest) {
  try {
    const { path, user_id } = await req.json() as { path: string; user_id?: string | null }

    const userAgent = req.headers.get('user-agent') || null
    if (userAgent && BOT_RE.test(userAgent)) return NextResponse.json({ ok: true })

    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      null

    await supabase.from('page_views').insert({
      path,
      ip,
      user_agent: userAgent,
      user_id: user_id || null,
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false })
  }
}
