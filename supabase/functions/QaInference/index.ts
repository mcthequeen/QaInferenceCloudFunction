import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import MistralClient from "https://esm.sh/@mistralai/mistralai";
import { SupabaseVectorStore } from "https://esm.sh/@langchain/community/vectorstores/supabase";
import { MistralAIEmbeddings } from "https://esm.sh/@langchain/mistralai";

/*Functions*/
const getLLmResponse = async (input: object, documents: string) => {
  console.log("Fetching mistral response...");
  const apiKey = Deno.env.MISTRAL_API_KEY!;

  const client = new MistralClient(apiKey);

  const prefix = "##DOCUMENTS##" + documents;

  const suffix = "\n##INSTRUCTIONS##" +
    "\nVous êtes dorénavant un assistant spécialisé en santé. Votre but est de répondre aux questions de l'utilisateur qui n'a aucune connaissance en médecine. Vous devez obéir aux règles." +
    "\nVoici les règles à respecter:" +
    "\n0. Soyez polis envers l'utilisateur" +
    "\n1. Conseillez et répondez à l'utilisateur de manière pertinente en quelques phrases." +
    "\n2. Faites des explications simples et vulgarisez les termes médicaux pour que l'utilisateur puisse comprendre." +
    "\n3. Utilisez uniquement les documents pour formuler votre réponse. Si la réponse n'est pas dans les documents, répondez uniquement que vous ne savez pas sans donner d'informations supplémentaires." +
    "\nA présent, répondez à l'utilisateur";

  const prePrompt = prefix + documents + suffix;

  const chatStreamResponse = await client.chatStream({
    model: "mistral-medium-latest",
    temperature: 0.1,
    maxTokens: 0,
    topP: 0.9,
    messages: [
      { role: "system", content: prePrompt },
      { role: "user", content: input.query },
    ],
  });

  return chatStreamResponse;
};

const getDocuments = async (query: string, url: string, privateKey: string) => {
  console.log("Fetchin docs..");
  const client = createClient(url, privateKey);

  /* Embed queries */
  const embeddings = new MistralAIEmbeddings({
    apiKey: Deno.env.MISTRAL_API_KEY,
  });

  const vectorStore = await SupabaseVectorStore.fromExistingIndex(embeddings, {
    client,
    tableName: "documents",
    queryName: "match_documents",
  });

  const result = await vectorStore.similaritySearch(query, 5);

  let docs = "";

  for (let i = 0; i < result.length; i++) {
    docs = docs + "\n Document " + i + ": " + result[i].metadata.name;
    +" " + result[i].metadata.section;
    docs = docs + result[i].pageContent;
  }

  const output = { ObjectDocument: result, stringDocs: docs };
  return output;
};

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get("_URL");
  const anonKey = Deno.env.get("_PRIVATE_KEY");

  const supabase = createClient(supabaseUrl!, anonKey!);

  const body = await req.json();
  const { userQuery, jwt } = body;

  const {
    data: { user },
  } = await supabase.auth.getUser(jwt);
  if (user) {
    const documents = await getDocuments(
      userQuery.query,
      supabaseUrl!,
      anonKey!,
    );
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
