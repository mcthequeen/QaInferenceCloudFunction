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
import { MistralAIEmbeddings } from "https://esm.sh/@langchain/mistralai";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


export const getDocuments = async (userQuery: Array , url: string, privateKey: string) => {
    const client = createClient(url, privateKey);

    let query = '';

    for(let userQueryIndex=0 ; userQueryIndex<userQuery.length ; userQueryIndex++ ){
      if(userQuery[userQueryIndex].role == "user"){
        query += userQuery[userQueryIndex].content + " ";
      }
    }

    console.log("Query for documents: ", query);
  
    const embeddings = new MistralAIEmbeddings({
      apiKey: Deno.env.MISTRAL_API_KEY!,
    });
    
  
    const vectorStore = await SupabaseVectorStore.fromExistingIndex(embeddings, {
      client,
      tableName: "documents",
      queryName: "match_documents",
    });

    const result = await vectorStore.similaritySearch(query, 4);

  
    let docs = "";
    for (let i = 0; i < result.length; i++) {
      docs = docs + "\n Document " + i + ": \n" + result[i].metadata.name;
      +" " + result[i].metadata.section;
      docs = docs + " " + result[i].pageContent;
    }

    console.log("Docs: ", docs);
  
    const output = { ObjectDocument: result, stringDocs: docs };
    return output;
  };