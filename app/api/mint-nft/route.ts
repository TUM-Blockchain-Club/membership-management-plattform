
// app/api/mint-nft/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { buildNftImage } from '@/lib/server/buildNftImage';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!serviceKey) {
  throw new Error("Missing Supabase Service Role Key.");
}

const supabase = createClient(supabaseUrl, serviceKey);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const requestId = body.requestId || body.id;

    if (!requestId) throw new Error("No ID was provided.");

    // 1. Fetch Member Data
    const { data: requestRecord, error: dbError } = await supabase
      .from('nft_requests')
      .select(`*, members_main (*)`)
      .eq('id', requestId)
      .maybeSingle();

    if (dbError || !requestRecord) throw new Error("Member not found in database.");

    const member = requestRecord.members_main || {};
    const nickname = (member.nickname || requestRecord.display_name || "NEW MEMBER");

    // 2. Build the image using the shared utility (identical logic to preview)
    const finalImageBuffer = await buildNftImage({
      nickname,
      batch:      member.Batch ? String(member.Batch) : '',
      degreeAtUni: member.degree_at_uni || '',
      programs: member.highlight || '',
      department: member.Department || 'Board',
      imageUrl:   member.nft_avatar,
    });

    // 3. Upload to Supabase Storage
    const filename = `member_${nickname.replace(/\s/g, '_')}_${Date.now()}.png`;
    const { error: uploadError } = await supabase.storage
      .from('nft-images-picks')
      .upload(`final/${filename}`, finalImageBuffer, {
        contentType: 'image/png',
        upsert: true,
      });

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    // 4. Update Database
    const { error: updateError } = await supabase
      .from('nft_requests')
      .update({
        status: 'approved',
        image_path: `final/${filename}`,
        mint_tx_hash: "0x_dummy_bypass_hash",
      })
      .eq('id', requestId);

    if (updateError) throw new Error(`DB update failed: ${updateError.message}`);

    return NextResponse.json({
      success: true,
      message: "NFT Minted!",
      imagePath: `final/${filename}`,
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Minting failed.";
    console.error("Minting Error:", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
