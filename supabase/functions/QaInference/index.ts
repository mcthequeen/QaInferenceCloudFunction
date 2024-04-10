import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getDocuments } from "./getDocuments.ts";
import { getLLmResponse } from "./getLLmResponse.ts";



Deno.serve(async (req) => {

  //Client supabase to auth the user
  const supabaseUrl = Deno.env.get("_URL");
  const anonKey = Deno.env.get("_PRIVATE_KEY");
  const supabase = createClient(supabaseUrl!, anonKey!);

  //Get the body request
  const body = await req.json();
  const { userQuery, jwt } = body;

  //Check user jwt status
  const {
    data: { user },
  } = await supabase.auth.getUser(jwt);

  if (user) {

    //Fetch document in supabase vector store
    const documents = await getDocuments(
      userQuery,
      supabaseUrl!,
      anonKey!,
    );

    //Get the mistral async generator to stream
    const streamMistral = await getLLmResponse(userQuery, documents);
    let sendDocuments = true;
    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of streamMistral) {
          if (sendDocuments){
            controller.enqueue(
              new TextEncoder().encode(documents.stringDocs),
            );
              sendDocuments = false;
          };
          if (chunk.choices[0].delta.content !== undefined) {
            controller.enqueue(
              new TextEncoder().encode(chunk.choices[0].delta.content),
            );
          }
        }
        controller.close();
      },
    });
    return new Response(stream, {
      headers: { "Content-Type": "application/json" },
    });
  } else {
    return new Response(JSON.stringify({ message: "Jwt Auth error" }), {
      headers: { "Content-Type": "application/json" },
    });
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/QaInference' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data {"userQuery": {"history": "", "query" : "Comment puis-je arreter de fumer ?"}, "jwt" : "eyJhbGciOiJIUzI1NiIsImtpZCI6Im1zT0s0VjdZNVRESWpCQVEiLCJ0eXAiOiJKV1QifQ.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzEzMjc4NjUxLCJpYXQiOjE3MTI2NzM4NTIsImlzcyI6Imh0dHBzOi8vaHd1cnp5eHJxbWFjaGJxa3J0ZHMuc3VwYWJhc2UuY28vYXV0aC92MSIsInN1YiI6Ijg0NWE2NTNiLTJkMzQtNGJiYy04NmQxLTg3ZTMyMWIzYTNlZCIsImVtYWlsIjoidGVzdEB0ZXN0LmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnt9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIiwidGltZXN0YW1wIjoxNzEyNjczODUyfV0sInNlc3Npb25faWQiOiIyZjE0MGI3Ni03MDhkLTRiNDgtYjA4OS1iOWQyODA4ZjlmNmYiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.5aUNsLPOAmO-gus1_HDzqSFyTqskksCC4y82r4_q1Eg"}

*/

/*Functions*/
