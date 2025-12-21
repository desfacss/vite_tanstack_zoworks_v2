// Setup type definitions for built-in Supabase Runtime APIs
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
serve(async (req)=>{
  try {
    // 1. Parse request
    const email = await req.json();
    console.log('Received email:', JSON.stringify(email, null, 2));
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
        // Log all threads to inspect message_id and parent_message_id
        const { data: allThreads, error: allThreadsError } = await supabase.schema('external').from('conversations').select('id, ticket_id, message_id, parent_message_id');
        if (allThreadsError) {
          console.error('Error fetching all threads:', JSON.stringify(allThreadsError, null, 2));
        } else {
          console.log('All threads:', JSON.stringify(allThreads, null, 2));
        }
      }
    }
    // 3. Create new ticket/thread if needed
    if (!threadId) {
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
      const { data: thread, error: threadError } = await supabase.schema('external').from('conversations').insert({
        ticket_id: ticket.id,
        message_id: email.messageId,
        parent_message_id: email.inReplyTo // Store inReplyTo as parent_message_id
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
      to_email: email.to
    });
    if (messageError) {
      console.error('Message creation error:', JSON.stringify(messageError, null, 2));
      return new Response('Message save failed: ' + JSON.stringify(messageError), {
        status: 500
      });
    }
    console.log('Message inserted successfully');
    return new Response('OK', {
      status: 200
    });
  } catch (error) {
    console.error('Unexpected error:', JSON.stringify(error, null, 2));
    return new Response('Unexpected error: ' + JSON.stringify(error), {
      status: 500
    });
  }
});
