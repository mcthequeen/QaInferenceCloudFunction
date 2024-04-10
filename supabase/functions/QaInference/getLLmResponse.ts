/**
 * @module getLLmResponse
 * @description Fonction asynchrone pour obtenir une réponse du modèle de langage MistralAI.
 * Cette fonction utilise l'API MistralAI pour générer une réponse basée sur les documents fournis et les règles définies.
 * @param {object} input - Objet contenant la requête de l'utilisateur. Dans cette objet, il y a l'historique et la query actuelle
 * @param {string} documents - Chaîne de caractères contenant les documents à utiliser pour générer la réponse.
 * @returns {Promise<object>} Objet de réponse de MistralAI.
 */


import MistralClient from "https://esm.sh/@mistralai/mistralai";

export const getLLmResponse = async (userQuery: object, documents: object) => {
    console.log("Fetching mistral response...");
    const apiKey = Deno.env.MISTRAL_API_KEY!;
  
    const client = new MistralClient(apiKey);

    const historique = "\n##HISTORIQUE##\n" + userQuery.history
  
    const prefix = "##DOCUMENTS##" + documents.documentString;
  
    const suffix = "\n##INSTRUCTIONS##" +
      "\nVous êtes dorénavant un assistant spécialisé en santé. Votre but est de répondre aux questions de l'utilisateur qui n'a aucune connaissance en médecine. Vous devez obéir aux règles." +
      "\nVoici les règles à respecter:" +
      "\n0. Soyez polis envers l'utilisateur" +
      "\n1. Conseillez et répondez à l'utilisateur de manière pertinente en quelques phrases." +
      "\n2. Faites des explications simples et vulgarisez les termes médicaux pour que l'utilisateur puisse comprendre." +
      "\n3. Utilisez uniquement les documents pour formuler votre réponse. Si la réponse n'est pas dans les documents, répondez uniquement que vous ne savez pas sans donner d'informations supplémentaires." +
      "\nA présent, répondez à l'utilisateur";

    let prePrompt = ""
    if (input.history.lenght > 1){
        prePrompt = prefix + documents + historique + suffix;
    }else{
        prePrompt = prefix + documents + suffix;
    }   
    
  
    const chatStreamResponse = await client.chatStream({
      model: "mistral-medium-latest",
      temperature: 0.1,
      maxTokens: 0,
      topP: 0.9,
      messages: [
        { role: "system", content: prePrompt },
        { role: "user", content: userQuery.query },
      ],
    });
  
    return chatStreamResponse;
  };