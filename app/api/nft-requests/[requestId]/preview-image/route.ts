
// app/api/nft-requests/[requestId]/preview-image/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { buildNftImage, DEPT_MAP } from '@/lib/server/buildNftImage';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!
); 

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, context: { params: Promise<{ requestId: string }> }) {
  try {
    const { requestId } = await context.params;
    if (!requestId) return new NextResponse('No ID', { status: 400 });

    const { data: rec, error } = await supabase
      .from('nft_requests')
      .select('*, members_main (*)')
      .eq('id', requestId)
      .maybeSingle();

    if (error || !rec) return new NextResponse('Not found', { status: 404 });

    const m = rec.members_main || {};
    const buffer = await buildNftImage({
      nickname:   (m.nickname || rec.display_name || 'NEW MEMBER'),
      batch:      m.Batch ? String(m.Batch) : '',
      degreeAtUni: m.degree_at_uni || '',
      programs: m.highlight || '',
      department: m.Department || 'Board',
      imageUrl:   m.nft_avatar,
    });

    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (e: any) {
    return new NextResponse(e.message, { status: 500 });
  }
}




