const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? 'https://kxpeuyomuohexsvcxneu.supabase.co';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4cGV1eW9tdW9oZXhzdmN4bmV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE0NDc0MzQsImV4cCI6MjA1NzAyMzQzNH0.3qwGqTuhWPlrKoxQGLns2E4o-0Gcbyn161S5sjgazEE';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4cGV1eW9tdW9oZXhzdmN4bmV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTQ0NzQzNCwiZXhwIjoyMDU3MDIzNDM0fQ.yBeUWjx6rX4vPw_Emr2DkFF-W2tXGarahOdylMlRW9M';
Deno.serve(async (req)=>{
  const headers = new Headers({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  });
  // Handle OPTIONS pre-flight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers
    });
  }
  try {
    // Parse the incoming request body
    const { email } = await req.json();
    // Validate the email input
    if (!email || typeof email !== 'string') {
      return new Response(JSON.stringify({
        error: 'Invalid email address'
      }), {
        status: 400,
        headers
      });
    }
    // Make the API call to invite the user
    const response = await fetch(`${SUPABASE_URL}/auth/v1/invite`, {
      method: 'POST',
      headers: {
        apikey: Deno.env.get('SUPABASE_KEY') ?? `${ANON_KEY}`,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email
      })
    });
    // Check if the response is not OK
    if (!response.ok) {
      const errorData = await response.json();
      return new Response(JSON.stringify({
        error: errorData
      }), {
        status: response.status,
        headers
      });
    }
    // Return success response
    const result = await response.json();
    return new Response(JSON.stringify(result), {
      status: 200,
      headers
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Failed to send invite',
      details: error.message
    }), {
      status: 500,
      headers
    });
  }
});
