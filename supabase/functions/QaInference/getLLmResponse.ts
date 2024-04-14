/**
 * @module getLLmResponse
 * @description Fonction asynchrone pour obtenir une réponse du modèle de langage MistralAI.
 * Cette fonction utilise l'API MistralAI pour générer une réponse basée sur les documents fournis et les règles définies.
 * @param {object} input - Objet contenant la requête de l'utilisateur. Dans cette objet, il y a l'historique et la query actuelle
 * @param {string} documents - Chaîne de caractères contenant les documents à utiliser pour générer la réponse.
 * @returns {Promise<object>} Objet de réponse de MistralAI.
 */


import MistralClient from "https://esm.sh/@mistralai/mistralai";

export const getLLmResponse = async (userQuery: Array, documents: object) => {
    const apiKey = Deno.env.MISTRAL_API_KEY!;
  
    const client = new MistralClient(apiKey);

    const intro = "Vous êtes un assistant en santé. Votre tâche est d'apporter de l'information." + 
    "En vous basant sur les documents, répondez à l'utilisateur de manière vulgarisée."+
    "\n\n#Documents:\n" + documents.stringDocs;
    const instruction = "\n\n#Instructions:\n" + 
    "##Répondre:\nVous devez uniquement vous baser sur les documents pour formuler votre réponse. Si l'information n'est pas contenue dans les documents, répondez 'Je ne peux pas répondre.'. Soyez empathique, poli et rassurant. Ne faites pas de diagnostic. Ne prescrivez pas de médicaments. Faites une réponse courte. Corrigez l'utilisateur si il se trompe.\n\n##Vulgariser:\nLes termes médicaux doivent compréhensibles pour tous, même pour un enfant. Utilisez un language simple. Inutile de renvoyer vers un professionel de santé.";
    const prePrompt = intro + instruction;

    console.log(prePrompt)
    
    const messages = [{ role: "system", content: prePrompt }];

    for(let userQueryIndex=0 ; userQueryIndex<userQuery.length ; userQueryIndex++ ){
      messages.push(userQuery[userQueryIndex]);
    }
     
    const chatStreamResponse = await client.chatStream({
      model: "open-mixtral-8x7b",
      temperature: 0.001,
      topP: 0.1,
      safePrompt: false,
      maxTokens: 1024,
      randomSeed: 1337,
      messages: messages
    });
  
    return chatStreamResponse;
  };