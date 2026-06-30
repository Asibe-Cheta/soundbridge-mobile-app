import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const MBG_EMAIL = 'distributions@mbgsonics.com';
const FROM_EMAIL = 'justice@soundbridge.live';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' } });
  }

  try {
    const { requestId } = await req.json();

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: dr, error } = await supabase
      .from('distribution_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (error || !dr) {
      throw new Error('Distribution request not found');
    }

    // Generate 7-day signed URLs for audio file and cover art
    const { data: audioTrack } = await supabase
      .from('audio_tracks')
      .select('file_url, cover_art_url')
      .eq('id', dr.track_id)
      .single();

    const extractPath = (url: string, bucket: string) => {
      const marker = `/storage/v1/object/public/${bucket}/`;
      const idx = url.indexOf(marker);
      return idx >= 0 ? url.substring(idx + marker.length) : url;
    };

    let audioDownloadUrl = audioTrack?.file_url ?? 'Not available';
    let coverArtDownloadUrl = dr.distribution_cover_art_url ?? audioTrack?.cover_art_url ?? 'Not available';

    if (audioTrack?.file_url) {
      const audioPath = extractPath(audioTrack.file_url, 'audio-tracks');
      const { data: signedAudio } = await supabase.storage
        .from('audio-tracks')
        .createSignedUrl(audioPath, 60 * 60 * 24 * 7); // 7 days
      if (signedAudio?.signedUrl) audioDownloadUrl = signedAudio.signedUrl;
    }

    const rawCoverUrl = dr.distribution_cover_art_url ?? audioTrack?.cover_art_url;
    if (rawCoverUrl) {
      const bucket = dr.distribution_cover_art_url ? 'cover-art' : 'cover-art';
      const coverPath = extractPath(rawCoverUrl, bucket);
      const { data: signedCover } = await supabase.storage
        .from(bucket)
        .createSignedUrl(coverPath, 60 * 60 * 24 * 7);
      if (signedCover?.signedUrl) coverArtDownloadUrl = signedCover.signedUrl;
    }

    const emailHtml = `
<p>Hi MBG Sonics team,</p>
<p>A new distribution request has been submitted through SoundBridge.</p>

<h3>TRACK DETAILS</h3>
<p>
Track Title: ${dr.track_title}<br>
Artist Name: ${dr.artist_name}<br>
Featured Artists: ${dr.featured_artists || 'Not Applicable'}<br>
Genre: ${dr.genre || 'Not specified'}<br>
ISRC Code: ${dr.isrc_code || 'Not assigned'}<br>
Explicit Content: ${dr.explicit_content ? 'Yes' : 'No'}<br>
Requested Release Date: ${dr.requested_release_date}
</p>

<h3>CREATOR DETAILS</h3>
<p>
Creator Email: ${dr.creator_email}<br>
SoundBridge Creator ID: ${dr.creator_id}
</p>

<p>Reference: ${dr.id}</p>

<h3>TRACK DOWNLOAD</h3>
<p><a href="${audioDownloadUrl}">Download Track (expires in 7 days)</a></p>

<p>Cover art download:<br>
<a href="${coverArtDownloadUrl}">Download Cover Art (expires in 7 days)</a></p>

<p>Please confirm receipt by replying to this email.</p>

<p>Thank you.</p>

<p>SoundBridge Live Ltd<br>
${FROM_EMAIL}</p>
`;

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `SoundBridge <${FROM_EMAIL}>`,
        to: [MBG_EMAIL],
        subject: `New Distribution Request from SoundBridge — ${dr.track_title} by ${dr.artist_name}`,
        html: emailHtml,
        reply_to: FROM_EMAIL,
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      throw new Error(`Resend error: ${errText}`);
    }

    // Mark email sent
    await supabase
      .from('distribution_requests')
      .update({ email_sent_to_partner: true, email_sent_at: new Date().toISOString() })
      .eq('id', requestId);

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (err: any) {
    console.error('send-distribution-email error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
});
