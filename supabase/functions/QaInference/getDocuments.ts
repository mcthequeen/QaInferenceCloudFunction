/**
 * @module getDocuments
 * @description Fonction asynchrone pour récupérer les documents similaires à une requête donnée à partir d'une base de données Supabase.
 * Cette fonction utilise l'API MistralAI pour générer des vecteurs de requête et les compare aux vecteurs de documents stockés dans la base de données Supabase pour trouver les documents les plus similaires.
 * @param {string} query - Chaîne de caractères contenant la requête de l'utilisateur.
 * @param {string} url - Chaîne de caractères contenant l'URL de la base de données Supabase.
 * @param {string} privateKey - Chaîne de caractères contenant la clé privée pour accéder à la base de données Supabase.
 * @returns {Promise<object>} Objet contenant les documents similaires sous forme de chaîne de caractères et d'objets.
 */

import { SupabaseVectorStore } from "https://esm.sh/@langchain/community/vectorstores/supabase";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import MistralClient from "https://esm.sh/@mistralai/mistralai";

export const getDocuments = async (
  userQuery: Array,
  url: string,
  privateKey: string,
) => {
  const supabase = createClient(url, privateKey);

  console.log(url);
  let query = "";

  for (
    let userQueryIndex = 0; userQueryIndex < userQuery.length; userQueryIndex++
  ) {
    if (userQuery[userQueryIndex].role == "user") {
      query += userQuery[userQueryIndex].content;
    }
  }

  console.log("Query for documents: ", query);

  const apiKey = Deno.env.MISTRAL_API_KEY!;

  const mistralClient = new MistralClient(apiKey);

  const embeddingsResponse = await mistralClient.embeddings({
    model: "mistral-embed",
    input: [query],
  });

  const embededResult = embeddingsResponse.data[0].embedding;

  console.log(embededResult[0]);

  let { data, error } = await supabase
    .rpc("hybrid_search", {
      full_text_weight : 5,
      match_count: 6,
      query_embedding: embededResult,
      query_text: query,
      rrf_k: 50,
      semantic_weight: 1,
    });


  let strings = "";  
  for (let i = 0; i < data.length; i++) {
    strings += "Document: " + i;
    strings += data[i].content;
  }

  const output = {stringDocs : strings, ObjectDocument : data}

  return output;
};
