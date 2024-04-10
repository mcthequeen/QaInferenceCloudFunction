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
    const apiKey = Deno.env.MISTRAL_API_KEY!;
  
    const client = new MistralClient(apiKey);

    const historique = "\n##HISTORIQUE DE CONVERSATION##\n" + userQuery.history;

    const prefix = "##DOCUMENTS##" + documents.stringDocs;
  
    const suffix =
    "\n##INSTSTRUCTIONS##" +
    "\nDésormais, vous êtes un assistant spécialisé en santé. Votre objectif est d'expliquer la médecine de manière simple et compréhensible." +
    "\nVoici les règles à respecter :" +
    "\n1. Soyez empathique." +
    "\n2. Il vous est interdit de poser un diagnostic." +
    "\n3. Il est indispensable d'expliquer simplement chaque terme médical." +
    "\n4. Utilisez uniquement les documents pour formuler votre réponse. Si la réponse n'est pas dans les documents, répondez simplement que vous ne savez pas sans donner d'informations supplémentaires." +
    "\nÀ présent, répondez à l'utilisateur en quelques phrases seulement.";
  
    let prePrompt = "";
    if (userQuery.history.length > 1){
        prePrompt = historique + prefix + suffix;
    }else{
        prePrompt = prefix  + suffix;
    }  

    console.log(prePrompt);
    console.log(userQuery.query);
  
    const chatStreamResponse = await client.chatStream({
      model: "mistral-medium-latest",
      temperature: 0.1,
      topP: 1,
      maxTokens: 50,
      randomSeed: 1337,
      messages: [
        { role: "system", content: prePrompt },
        { role: "user", content: userQuery.query},
      ],
    });
  
    return chatStreamResponse;
  };