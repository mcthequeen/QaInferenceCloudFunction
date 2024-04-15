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


export const getLLmResponse = async (userQuery: UserQueryType[], documents: DocumentsOutputType) => {
    const apiKey = Deno.env.MISTRAL_API_KEY!;
  
    const client = new MistralClient(apiKey);

    const intro = "Vous êtes un assistant en santé. Votre tâche est d'apporter de l'information." + 
    "En vous basant sur les documents, répondez à l'utilisateur de manière vulgarisée."+
    "\n\n#Documents:\n" + documents.documentsAsString;
    const instruction = "\n\n#Instructions:\n" + 
    "##Répondre:\nVous devez uniquement vous baser sur les documents pour formuler votre réponse. Si l'information n'est pas contenue dans les documents, répondez 'Je ne peux pas répondre.'. Soyez empathique, poli et rassurant. Ne faites pas de diagnostic. Ne prescrivez pas de médicaments. Faites une réponse courte. Corrigez l'utilisateur s'il se trompe.\n\n##Vulgariser:\nLes termes médicaux doivent compréhensibles pour tous, même pour un enfant. Utilisez un language simple. Inutile de renvoyer vers un professionel de santé.";
    const prePrompt = intro + instruction.toLowerCase().replace("'", " ");

    console.log(prePrompt);
    
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