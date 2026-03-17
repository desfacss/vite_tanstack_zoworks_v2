// // Resend API key
// // const resendApiKey = Deno.env.get('RESEND_API_KEY') ?? 're_VTPe8tkE_GRAog5gbk5kxjhUKUVpSsRF2'; //optionsalgotrade@gmail.com / optionsify.com
// // const resendApiKey = Deno.env.get('RESEND_API_KEY') ?? 're_81VQdPtL_3ZaerEENxBPjK5fAvTUog5ig'; //desfacss@gmail.com / nagarathars.in
// // const resendApiKey = Deno.env.get('RESEND_API_KEY') ?? 're_CVnuzzkf_FzvyCUWfuzWo9AsqYZ513K8r'; //ravi@claritiz.com / vkbs.zoworks.com
// const resendApiKey = Deno.env.get('RESEND_API_KEY') ?? ''; //ravi@claritiz.com / vkbs.zoworks.com
// console.log("rs K", resendApiKey);
// // Serve the function
// Deno.serve(async (req)=>{
//   const headers = new Headers({
//     'Access-Control-Allow-Origin': '*',
//     'Access-Control-Allow-Headers': 'Content-Type, Authorization',
//     'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
//     'Content-Type': 'application/json'
//   });
//   // Handle preflight requests
//   if (req.method === 'OPTIONS') {
//     return new Response(null, {
//       headers,
//       status: 204
//     });
//   }
//   try {
//     // Parse incoming request data (expecting array of email data)
//     const emails = await req.json();
//     // Log the incoming email data for debugging
//     console.log('Received emails data:', emails);
//     // Validate that it's an array of email objects
//     if (!Array.isArray(emails) || emails.length === 0) {
//       return new Response(JSON.stringify({
//         error: 'Invalid email data'
//       }), {
//         headers,
//         status: 400
//       });
//     }
//     // Send batch email request to Resend API using fetch
//     const response = await fetch('https://api.resend.com/emails/batch', {
//       method: 'POST',
//       headers: {
//         'Authorization': `Bearer ${resendApiKey}`,
//         'Content-Type': 'application/json'
//       },
//       body: JSON.stringify(emails)
//     });
//     // Check if the response was successful
//     if (response.ok) {
//       const result = await response.json();
//       console.log('Resend API response:', result);
//       return new Response(JSON.stringify({
//         message: 'Emails sent successfully',
//         data: result
//       }), {
//         headers,
//         status: 200
//       });
//     } else {
//       const errorResult = await response.json();
//       console.error('Error response from Resend API:', errorResult);
//       return new Response(JSON.stringify({
//         error: 'Failed to send emails',
//         details: errorResult
//       }), {
//         headers,
//         status: response.status
//       });
//     }
//   } catch (error) {
//     // Log any error that occurs during the email sending process
//     console.error('Error sending emails:', error);
//     // Send a 500 error response with the error message for further debugging
//     return new Response(JSON.stringify({
//       error: 'Error sending emails',
//       details: error.message
//     }), {
//       headers,
//       status: 500
//     });
//   }
// });
// Resend API key
// const resendApiKey = Deno.env.get('RESEND_API_KEY') ?? 're_VTPe8tkE_GRAog5gbk5kxjhUKUVpSsRF2'; //optionsalgotrade@gmail.com / optionsify.com
// const resendApiKey = Deno.env.get('RESEND_API_KEY') ?? 're_81VQdPtL_3ZaerEENxBPjK5fAvTUog5ig'; //desfacss@gmail.com / nagarathars.in
// const resendApiKey = Deno.env.get('RESEND_API_KEY') ?? 're_CVnuzzkf_FzvyCUWfuzWo9AsqYZ513K8r'; //ravi@claritiz.com / vkbs.zoworks.com
const resendApiKey = Deno.env.get('RESEND_API_KEY') ?? ''; //ravi@claritiz.com / vkbs.zoworks.com
console.log("rs K", resendApiKey);
// Serve the function
Deno.serve(async (req)=>{
  const headers = new Headers({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  });
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers,
      status: 204
    });
  }
  try {
    // Parse incoming request data (expecting array of email data)
    const emails = await req.json();
    // Log the incoming email data for debugging
    console.log('Received emails data:', emails);
    // Validate that it's an array of email objects
    if (!Array.isArray(emails) || emails.length === 0) {
      return new Response(JSON.stringify({
        error: 'Invalid email data'
      }), {
        headers,
        status: 400
      });
    }
    // Send batch email request to Resend API using fetch
    const response = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emails)
    });
    // Check if the response was successful
    if (response.ok) {
      const result = await response.json();
      console.log('Resend API response:', result);
      return new Response(JSON.stringify({
        message: 'Emails sent successfully',
        data: result
      }), {
        headers,
        status: 200
      });
    } else {
      const errorResult = await response.json();
      console.error('Error response from Resend API:', errorResult);
      return new Response(JSON.stringify({
        error: 'Failed to send emails',
        details: errorResult
      }), {
        headers,
        status: response.status
      });
    }
  } catch (error) {
    // Log any error that occurs during the email sending process
    console.error('Error sending emails:', error);
    // Send a 500 error response with the error message for further debugging
    return new Response(JSON.stringify({
      error: 'Error sending emails',
      details: error.message
    }), {
      headers,
      status: 500
    });
  }
});
