import { SupabaseVectorStore } from "https://esm.sh/@langchain/community/vectorstores/supabase";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import MistralClient from "https://esm.sh/@mistralai/mistralai";

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
  id: number;
  pageContent: string;
  metadata: {
    name: string;
    section: string;
    uri: string;
  };
};

export type DocumentsOutputType = {
  documentsAsString: string;
  documents: DocumentObjectType[];
};


export const getDocuments = async (
  userQuery: UserQueryType[],
  url: string,
  privateKey: string,
) => {
  const supabase = createClient(url, privateKey);

  // Extract only the user queries
  const userQueries = userQuery
    .filter((query) => query.role === "user")
    .map((query) => query.content)
    .join(" ");

  const apiKey = Deno.env.get("MISTRAL_API_KEY");
  if (!apiKey) {
    throw new Error("MISTRAL_API_KEY is not defined in the environment");
  }
  const mistralClient = new MistralClient(apiKey);

  const embeddingsResponse = await mistralClient.embeddings({
    model: "mistral-embed",
    input: [userQueries],
  });

  const embededResult = embeddingsResponse.data[0].embedding;

  const { data, error } = await supabase
    .rpc("hybrid_search", {
      full_text_weight: 5,
      match_count: 6,
      query_embedding: embededResult,
      query_text: userQueries,
      rrf_k: 50,
      semantic_weight: 1,
    });

  if (error) {
    throw new Error(`Supabase RPC error: ${error.message}`);
  }
  
  let strings = "";
  const ids: number[] = [];
  const objDocs: DocumentObjectType[] = [];
  data.forEach((datum: SupabaseDocumentObjectType, index: number) => {
    const { pageContent, metadata, id } = datum;
    ids.push(id)
    objDocs.push({
      content: pageContent,
      metadata: {
        name: metadata.name,
        section: metadata.section,
        uri: metadata.uri,
      },
    });
    strings += `Document ${index}:\n${pageContent}\n`;
  });  

  return { documentsAsString: strings, documents: objDocs, ids };
};
