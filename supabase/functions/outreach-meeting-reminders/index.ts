import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_ACCESS_TOKEN = Deno.env.get('EXPO_ACCESS_TOKEN') ?? '';

async function sendPush(tokens: string[], title: string, body: string): Promise<void> {
  const messages = tokens
    .filter(t => t && t.startsWith('ExponentPushToken'))
    .map(to => ({ to, title, body, sound: 'default', priority: 'high' }));
  if (messages.length === 0) return;
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };
  if (EXPO_ACCESS_TOKEN) headers['Authorization'] = `Bearer ${EXPO_ACCESS_TOKEN}`;
  await fetch(EXPO_PUSH_URL, { method: 'POST', headers, body: JSON.stringify(messages) });
}

serve(async () => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const windowStart = new Date(Date.now() + 85 * 60 * 1000).toISOString();
    const windowEnd   = new Date(Date.now() + 95 * 60 * 1000).toISOString();

    // Find meetings in the 85–95 minute window that haven't been reminded yet
    const { data: meetings, error: meetingsErr } = await supabase
      .from('outreach_meetings')
      .select('id, scheduled_at, meeting_link_or_location, contact_id')
      .eq('reminder_sent', false)
      .gte('scheduled_at', windowStart)
      .lte('scheduled_at', windowEnd);

    if (meetingsErr) throw meetingsErr;
    if (!meetings || meetings.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
    }

    // Fetch all internal team push tokens
    const { data: teamMembers, error: teamErr } = await supabase
      .from('profiles')
      .select('expo_push_token')
      .eq('is_internal_team', true)
      .not('expo_push_token', 'is', null);

    if (teamErr) throw teamErr;
    const tokens = (teamMembers ?? [])
      .map((m: any) => m.expo_push_token)
      .filter(Boolean);

    // Fetch contact names for all meetings
    const contactIds = [...new Set(meetings.map((m: any) => m.contact_id))];
    const { data: contacts } = await supabase
      .from('outreach_contacts')
      .select('id, contact_name')
      .in('id', contactIds);

    const contactMap = new Map((contacts ?? []).map((c: any) => [c.id, c.contact_name]));

    let sent = 0;
    for (const meeting of meetings as any[]) {
      const contactName = contactMap.get(meeting.contact_id) ?? 'Contact';
      const meetingTime = new Date(meeting.scheduled_at).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const locationPart = meeting.meeting_link_or_location
        ? ` ${meeting.meeting_link_or_location}`
        : '';
      const body = `${contactName} at ${meetingTime}.${locationPart}`;

      await sendPush(tokens, 'Meeting in 90 minutes', body);

      // Mark as reminded immediately to prevent duplicates
      await supabase
        .from('outreach_meetings')
        .update({ reminder_sent: true })
        .eq('id', meeting.id);

      sent++;
    }

    return new Response(JSON.stringify({ sent }), { status: 200 });
  } catch (err) {
    console.error('outreach-meeting-reminders error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
