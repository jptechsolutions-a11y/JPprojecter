
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";

// Fix: Always initialize GoogleGenAI strictly using process.env.API_KEY as per instructions.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Helper: Get Current Date Context ---
const getDateContext = () => {
    const now = new Date();
    // Force specific formatting to ensure model understands
    return `HOJE É: ${now.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}. HORA ATUAL: ${now.toLocaleTimeString('pt-BR')}.`;
};

// --- Tool Definitions ---
const imageGenerationTool: FunctionDeclaration = {
    name: "generate_image",
    description: "Gera uma imagem ou ilustração baseada em uma descrição detalhada (prompt). Use esta ferramenta quando o usuário pedir explicitamente para criar, desenhar, imaginar ou gerar uma imagem, foto ou cena.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            prompt: {
                type: Type.STRING,
                description: "A descrição detalhada da imagem a ser gerada, em inglês ou português."
            }
        },
        required: ["prompt"]
    }
};

// --- Helper Functions ---

export const generateTaskDescription = async (taskTitle: string): Promise<string> => {
  try {
    // Basic Text Task: Use gemini-3-flash-preview
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Escreva uma descrição profissional e detalhada para uma tarefa de gerenciamento de projeto com o título: "${taskTitle}". Mantenha conciso, cerca de 2-3 parágrafos.`,
      config: { temperature: 0.7 }
    });
    return response.text || "Não foi possível gerar a descrição.";
  } catch (error) {
    console.error("Erro ao gerar descrição:", error);
    return "Erro ao conectar com a IA (Verifique sua API Key).";
  }
};

export const generateSubtasks = async (taskTitle: string, taskDescription: string): Promise<string[]> => {
  try {
    // Basic Text Task: Use gemini-3-flash-preview
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Crie uma lista de checklist de 3 a 5 sub-tarefas acionáveis para completar a tarefa: "${taskTitle}". Contexto: ${taskDescription}.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    
    const jsonStr = response.text;
    if (!jsonStr) return [];
    try {
        return JSON.parse(jsonStr) as string[];
    } catch (e) {
        return [];
    }
  } catch (error) {
    console.error("Erro ao gerar sub-tarefas:", error);
    return ["Erro na IA - Adicione itens manualmente"];
  }
};

export const assistCode = async (currentCode: string, instruction: string, language: string): Promise<string> => {
    try {
        // Coding Task: Upgrade to gemini-3-pro-preview for complex reasoning
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `Você é um assistente de codificação especialista. 
            Linguagem: ${language}.
            Código atual:
            ${currentCode}
            
            Instrução do usuário: ${instruction}
            
            Retorne APENAS o código corrigido ou gerado, sem explicações em markdown.`,
        });
        return response.text || currentCode;
    } catch (error) {
        console.error("Erro na assistência de código:", error);
        return currentCode;
    }
}

export const fixCodeError = async (code: string, error: string, language: string): Promise<string> => {
    try {
        // Coding Task: Upgrade to gemini-3-pro-preview for complex reasoning
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `Você é um especialista em debugging.
            Linguagem: ${language}
            Erro encontrado: ${error}
            
            Código com erro:
            ${code}
            
            Retorne APENAS o código corrigido completo. Sem explicações ou markdown.`,
        });
        return response.text || code;
    } catch (err) {
        console.error("Erro ao corrigir código:", err);
        return code;
    }
};

export const generateFullProject = async (prompt: string): Promise<{name: string, language: string, content: string}[]> => {
    try {
        // Coding Task: Upgrade to gemini-3-pro-preview for complex reasoning
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `Crie um projeto web simples (HTML, CSS, JS) baseado neste pedido: ${prompt}. 
            Retorne os arquivos necessários para rodar a aplicação.
            O arquivo HTML deve referenciar o CSS e o JS corretamente.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING, description: "Nome do arquivo com extensão (ex: index.html)" },
                            language: { type: Type.STRING, description: "Linguagem do arquivo (html, css, javascript)" },
                            content: { type: Type.STRING, description: "Conteúdo completo do arquivo" }
                        },
                        required: ["name", "language", "content"]
                    }
                }
            }
        });

        const jsonStr = response.text;
        if (!jsonStr) return [];
        try {
            return JSON.parse(jsonStr);
        } catch (e) {
            return [];
        }
    } catch (error) {
        console.error("Erro ao gerar projeto:", error);
        return [];
    }
};

const executeImageGeneration = async (prompt: string): Promise<{ text: string, imageUrl?: string }> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [{ text: prompt }]
            },
            config: {
                imageConfig: {
                    aspectRatio: "1:1"
                }
            }
        });
        
        let imageUrl: string | undefined;
        let text = "";

        // Fix: Correctly iterate through candidate parts to find the image as per guidelines.
        if (response.candidates && response.candidates[0].content && response.candidates[0].content.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    const base64EncodeString = part.inlineData.data;
                    imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${base64EncodeString}`;
                } else if (part.text) {
                    text += part.text;
                }
            }
        }

        if (imageUrl) {
            return { text: text || `Imagem gerada para: "${prompt}"`, imageUrl };
        } else {
             return { text: text || "Não foi possível gerar a imagem. Tente novamente." };
        }
    } catch (imgError: any) {
        console.error("Erro na geração de imagem (Tool):", imgError);
        
        const isRateLimit = imgError.message?.includes('429') || 
                           imgError.status === 429 || 
                           (imgError.error && imgError.error.code === 429);

        if (isRateLimit) {
            const safePrompt = prompt ? prompt.substring(0, 50) : "Imagem";
            return { 
                text: "⚠️ **Limite de Cota de Imagem Atingido**\n\nO limite gratuito da API Gemini para geração de imagens foi excedido temporariamente. \n\nAbaixo está um **Exemplo Visual (Placeholder)** para não interromper seu fluxo:", 
                imageUrl: `https://placehold.co/600x600/1e293b/white?text=${encodeURIComponent(safePrompt + '...')}`
            };
        }

        return { text: `Erro ao gerar imagem: ${imgError.message || 'Erro desconhecido'}` };
    }
};

export const sendGeneralAiMessage = async (
    message: string, 
    history: any[], 
    isExplicitImageRequest = false, 
    attachments?: {name: string, content: string, mimeType?: string}[]
): Promise<{text: string, imageUrl?: string, code?: { lang: string, content: string }, sources?: { title: string, uri: string }[]}> => {
    
    try {
        if (isExplicitImageRequest) {
            return await executeImageGeneration(message);
        } 
        
        // Standard Chat Path with Tools
        else {
            const parts: any[] = [];
            let textContext = "";

            if(attachments && attachments.length > 0) {
                attachments.forEach(att => {
                    if (att.mimeType && (att.mimeType.startsWith('image/') || att.mimeType.startsWith('audio/'))) {
                         const base64Data = att.content.includes('base64,') ? att.content.split('base64,')[1] : att.content;
                         parts.push({ inlineData: { mimeType: att.mimeType, data: base64Data } });
                    } else {
                        textContext += `\n--- ARQUIVO ANEXADO: ${att.name} ---\n${att.content}\n--- FIM DO ARQUIVO ---\n`;
                    }
                });
            }

            if (textContext) parts.push({ text: textContext + "\n" + message });
            else parts.push({ text: message });

            const model = 'gemini-3-flash-preview'; 
            
            const chatHistory = history.map(h => ({
                role: h.role,
                parts: [{ text: h.content }]
            }));

            const systemInstruction = `Você é o assistente JP Projects.
            
            IMPORTANTE:
            ${getDateContext()}
            Use esta data para todos os cálculos temporais. Se o usuário mencionar uma data diferente, corrija gentilmente com base na data de hoje.
            
            Regras:
            1. Se o usuário pedir código, forneça-o em blocos Markdown.
            2. Se o usuário pedir uma imagem/desenho/foto, USE A FERRAMENTA 'generate_image'.
            3. Use o Google Search apenas para informações factuais recentes ou desconhecidas.
            4. Responda de forma prestativa e profissional.`;

            // Fix: Compliance with "Only tools: googleSearch is permitted. Do not use it with other tools."
            // We use conditional logic to decide which tool to provide based on search intent detection.
            const useSearch = /(notícias|olimpíadas|paris 2024|clima|hoje|agora|atualmente|quem é|quem foi|fato)/i.test(message);

            const chat = ai.chats.create({
                model: model,
                history: chatHistory,
                config: {
                    tools: useSearch ? [{ googleSearch: {} }] : [{ functionDeclarations: [imageGenerationTool] }],
                    systemInstruction: systemInstruction,
                }
            });

            const result = await chat.sendMessage({ message: parts });
            
            const functionCalls = result.functionCalls;
            if (functionCalls && functionCalls.length > 0) {
                const call = functionCalls[0];
                if (call.name === 'generate_image') {
                    const prompt = (call.args as any).prompt;
                    return await executeImageGeneration(prompt);
                }
            }

            const responseText = result.text;
            const codeBlockRegex = /```(html|css|javascript|js|ts|typescript|json)?\n([\s\S]*?)```/;
            const match = responseText.match(codeBlockRegex);
            
            let codeData = undefined;
            if (match) {
                codeData = { lang: match[1] || 'html', content: match[2] };
            }

            // Extract Search Grounding Sources
            let sources: { title: string, uri: string }[] = [];
            
            if (result.candidates && result.candidates[0].groundingMetadata?.groundingChunks) {
                result.candidates[0].groundingMetadata.groundingChunks.forEach((chunk: any) => {
                    if (chunk.web && chunk.web.uri) {
                        sources.push({
                            title: chunk.web.title || new URL(chunk.web.uri).hostname,
                            uri: chunk.web.uri
                        });
                    }
                });
                // Remove duplicates
                sources = sources.filter((v,i,a)=>a.findIndex(v2=>(v2.uri===v.uri))===i);
            }

            return { text: responseText, code: codeData, sources: sources };
        }
    } catch (error: any) {
        console.error("Erro no chat IA:", error);
        
        const isRateLimit = error.message?.includes('429') || error.status === 429;
        if (isRateLimit) {
             return { text: "⚠️ **Muitas Requisições**\nEstamos recebendo muitas solicitações no momento. Por favor, aguarde alguns segundos e tente novamente." };
        }

        if (error.message && error.message.includes('API key')) {
             return { text: "⚠️ Erro de Configuração: Sua chave de API do Google parece inválida ou vazia." };
        }
        return { text: "Desculpe, ocorreu um erro na comunicação com a IA." };
    }
};
