import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getDocuments } from "./getDocuments.ts";
import { getLLmResponse } from "./getLLmResponse.ts";
import { corsHeaders } from "../_shared/cors.ts";

export type UserQueryType = {
  role: string;
  content: string;
};

export type DocumentObjectType = {
  content: string;
  metadata: {
    name: string;
    section: string;
    uri: string;
  };
};

export type SupabaseDocumentObjectType = {
  pageContent: string;
  metadata: {
    name: string;
    section: string;
    uri: string;
  };
};

export type DocumentsOutputType = {
  ids: number[];
  documentsAsString: string;
  documents: DocumentObjectType[];
};


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  //Client supabase to auth the user
  try {
    const supabaseUrl = Deno.env.get("_URL");
    const anonKey = Deno.env.get("_ANON_KEY");
    const authHeader = req.headers.get("Authorization")!;

    if (!supabaseUrl || !anonKey || !authHeader) {
      throw new Error("Missing required headers");
    }

    const supabaseClient = createClient(supabaseUrl!, anonKey!, {
      global: { headers: { Authorization: authHeader } },
    });

    //Get the body request
    const { userQuery, jwt, chatId } = await req.json();

    //Check user jwt status
    const { data: { user } } = await supabaseClient.auth.getUser(jwt);

    if (user) {
      //Fetch document in supabase vector store
      const documents: DocumentsOutputType = await getDocuments(
        userQuery,
        supabaseUrl!,
        anonKey!,
      );

      //Get the mistral async generator to stream
      const streamMistral = await getLLmResponse(userQuery, documents);

      //write the docs in supabase
      await supabaseClient.from("chats").update({
        documents: documents.ids,
      }).eq("id", chatId);

      const stream = new ReadableStream({
        async start(controller) {
          controller.enqueue(new TextEncoder().encode("<#DOC_IDS#>" + String(documents.ids) + "</#DOC_IDS#>"));
          for await (const chunk of streamMistral) {
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
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
        },
      });
    } else {
      return new Response(JSON.stringify({ message: "Jwt Auth error" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
