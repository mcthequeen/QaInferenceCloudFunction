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
    
    const history = "#Historique:\n" + userQuery.history;

    const intro = "Vous êtes un assistant en santé. Votre tâche est d'apporter de l'information." + 
    "En vous basant sur les documents, répondez à l'utilisateur de manière vulgarisée."+
    "\n\n#Documents:\n" + documents.stringDocs;
    const instruction = "\n\n#Instructions:\n" + 
    "##Répondre:\nVous devez uniquement vous baser sur les documents pour formuler votre réponse. Si l'information n'est pas contenue dans les documents, répondez 'Je ne peux pas répondre.'. Soyez naturel, poli et rassurant. Ne faites pas de diagnostic.\n\n##Vulgariser:\nLes termes médicaux doivent compréhensibles pour tous. Adaptez votre discours avec des mots simples.";
  



    let prePrompt = "";
    if (userQuery.history.length > 1){
        prePrompt = history + intro + instruction;
    }else{
        prePrompt = intro + instruction;
    }  

    console.log(prePrompt);
     
    const chatStreamResponse = await client.chatStream({
      model: "open-mixtral-8x7b",
      temperature: 0.1,
      topP: 1,
      maxTokens: 1024,
      randomSeed: 42,
      messages: [
        { role: "system", content: prePrompt },
        { role: "user", content: userQuery.query},
      ],
    });
  
    return chatStreamResponse;
  };