// functions/support_email/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
serve(async (req)=>{
  try {
    // 1. Parse request
    const email = await req.json();
    console.log('Received email:', JSON.stringify(email, null, 2));
    // Validate required fields
    const requiredFields = [
      'subject',
      'messageId',
      'text',
      'from',
      'to'
    ];
    for (const field of requiredFields){
      if (!email[field]) {
        return new Response(`Missing required field: ${field}`, {
          status: 400
        });
      }
    }
    // 2. Threading logic
    let threadId;
    if (email.inReplyTo) {
      console.log('Searching for thread with inReplyTo:', email.inReplyTo);
      const { data: thread, error: threadQueryError } = await supabase.schema('external').from('conversations').select('id, ticket_id, message_id, parent_message_id').or(`message_id.eq.${email.inReplyTo},parent_message_id.eq.${email.inReplyTo}`).single();
      if (threadQueryError) {
        console.error('Thread query error:', JSON.stringify(threadQueryError, null, 2));
      }
      console.log('Thread query result:', JSON.stringify(thread, null, 2));
      if (thread) {
        threadId = thread.id;
        console.log('Found thread:', thread.id, 'for ticket:', thread.ticket_id);
        await supabase.from('tickets').update({
          updated_at: new Date().toISOString()
        }).eq('id', thread.ticket_id);
      } else {
        console.log('No thread found for inReplyTo:', email.inReplyTo);
      }
    }
    // 3. Create or use existing ticket/thread
    if (!threadId) {
      let ticketId = email.ticketId;
      if (!ticketId) {
        // Create new ticket (e.g., for auto-scheduled or new manual tickets)
        console.log('Creating new ticket for subject:', email.subject);
        const { data: ticket, error: ticketError } = await supabase.from('tickets').insert({
          subject: email.subject
        }).select().single();
        if (ticketError) {
          console.error('Ticket creation error:', JSON.stringify(ticketError, null, 2));
          return new Response('Ticket creation failed: ' + JSON.stringify(ticketError), {
            status: 500
          });
        }
        console.log('Created ticket:', ticket.id);
        ticketId = ticket.id;
      } else {
        // Verify ticket exists
        const { data: ticket, error: ticketError } = await supabase.from('tickets').select('id').eq('id', ticketId).single();
        if (ticketError || !ticket) {
          console.error('Ticket not found:', JSON.stringify(ticketError, null, 2));
          return new Response('Ticket not found', {
            status: 404
          });
        }
      }
      // Create new thread
      const { data: thread, error: threadError } = await supabase.schema('external').from('conversations').insert({
        ticket_id: ticketId,
        message_id: email.messageId,
        parent_message_id: email.inReplyTo || null
      }).select().single();
      if (threadError) {
        console.error('Thread creation error:', JSON.stringify(threadError, null, 2));
        return new Response('Thread creation failed: ' + JSON.stringify(threadError), {
          status: 500
        });
      }
      console.log('Created thread:', thread.id);
      threadId = thread.id;
    }
    // 4. Insert message
    console.log('Inserting message for thread:', threadId);
    const { error: messageError } = await supabase.schema('external').from('messages').insert({
      thread_id: threadId,
      content: email.text,
      from_email: email.from,
      to_email: email.to,
      is_outbound: email.from.includes('support@') || email.from.includes('team@') || email.from.includes('system@')
    });
    if (messageError) {
      console.error('Message creation error:', JSON.stringify(messageError, null, 2));
      return new Response('Message save failed: ' + JSON.stringify(messageError), {
        status: 500
      });
    }
    console.log('Message inserted successfully');
    return new Response(JSON.stringify({
      threadId
    }), {
      status: 200
    }); // Return threadId for reference
  } catch (error) {
    console.error('Unexpected error:', JSON.stringify(error, null, 2));
    return new Response('Unexpected error: ' + error.message, {
      status: 500
    });
  }
});
