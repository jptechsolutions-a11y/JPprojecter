import { GoogleGenAI, Type } from "@google/genai";

// Helper for safe environment access in Browser/Vite
const getEnv = (key: string) => {
    // 1. Try Vite/ESM import.meta.env
    try {
        if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env[key]) {
            return (import.meta as any).env[key];
        }
    } catch(e) {}
    
    // 2. Try global process.env
    try {
        if (typeof process !== 'undefined' && process.env) {
            return process.env[key];
        }
    } catch(e) {}

    return '';
};

// Prefer VITE_ prefixed keys if available, fallback to standard keys
const apiKey = getEnv('VITE_GOOGLE_API_KEY') || getEnv('GOOGLE_API_KEY') || getEnv('API_KEY');

const ai = new GoogleGenAI({ apiKey: apiKey });

// --- Helper Functions ---

export const generateTaskDescription = async (taskTitle: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Escreva uma descrição profissional e detalhada para uma tarefa de gerenciamento de projeto com o título: "${taskTitle}". Mantenha conciso, cerca de 2-3 parágrafos.`,
      config: { temperature: 0.7 }
    });
    return response.text || "Não foi possível gerar a descrição.";
  } catch (error) {
    console.error("Erro ao gerar descrição:", error);
    return "Erro ao conectar com a IA.";
  }
};

export const generateSubtasks = async (taskTitle: string, taskDescription: string): Promise<string[]> => {
  try {
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
    return JSON.parse(jsonStr) as string[];
  } catch (error) {
    console.error("Erro ao gerar sub-tarefas:", error);
    return [];
  }
};

export const assistCode = async (currentCode: string, instruction: string, language: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
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
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
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
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
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
        return JSON.parse(jsonStr);
    } catch (error) {
        console.error("Erro ao gerar projeto:", error);
        return [];
    }
};

export const sendGeneralAiMessage = async (
    message: string, 
    history: any[], 
    generateImage = false, 
    attachments?: {name: string, content: string, mimeType?: string}[]
): Promise<{text: string, imageUrl?: string, code?: { lang: string, content: string }}> => {
    try {
        if (generateImage) {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: message,
            });
            
            let imageUrl: string | undefined;
            let text = "";

            if (response.candidates && response.candidates[0].content && response.candidates[0].content.parts) {
                for (const part of response.candidates[0].content.parts) {
                    if (part.inlineData) {
                        imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                    } else if (part.text) {
                        text += part.text;
                    }
                }
            }
            if (!imageUrl && !text) text = "Não foi possível gerar a imagem.";
            return { text, imageUrl };

        } else {
            // Build Context with attachments
            // Separate text context from multimodal (audio/image) parts
            const parts: any[] = [];
            
            let textContext = "";

            if(attachments && attachments.length > 0) {
                attachments.forEach(att => {
                    // If it has a mimeType starting with audio or image, treat as inlineData
                    if (att.mimeType && (att.mimeType.startsWith('image/') || att.mimeType.startsWith('audio/'))) {
                         // Extract base64 if it has the data: prefix
                         const base64Data = att.content.includes('base64,') 
                            ? att.content.split('base64,')[1] 
                            : att.content;
                            
                         parts.push({
                             inlineData: {
                                 mimeType: att.mimeType,
                                 data: base64Data
                             }
                         });
                    } else {
                        // Treat as text file context
                        textContext += `--- START OF FILE ${att.name} ---\n${att.content}\n--- END OF FILE ---\n`;
                    }
                });
            }

            if (textContext) {
                 textContext += "\nResponda com base nestes arquivos se solicitado.\n";
            }
            
            // Add the user message and text context
            parts.push({ text: textContext + message });

            const model = 'gemini-3-flash-preview'; // Supports multimodal
            
            // Simple history mapping (text only for previous turns to avoid complexity in this demo)
            const chatHistory = history.map(h => ({
                role: h.role,
                parts: [{ text: h.content }]
            }));

            const chat = ai.chats.create({
                model: model,
                history: chatHistory,
                config: {
                    systemInstruction: "Você é o assistente JP Projects. Você pode gerar código HTML/CSS/JS completo, analisar imagens e ouvir áudios. Se o usuário pedir código, forneça-o em blocos Markdown.",
                }
            });

            // We use sendMessage with the parts array which can contain text and inlineData
            const result = await chat.sendMessage({ message: parts });
            const responseText = result.text;
            
            // Extract code block if present
            const codeBlockRegex = /```(html|css|javascript|js|ts|typescript)?\n([\s\S]*?)```/;
            const match = responseText.match(codeBlockRegex);
            
            let codeData = undefined;
            if (match) {
                codeData = {
                    lang: match[1] || 'html',
                    content: match[2]
                };
            }

            return { text: responseText, code: codeData };
        }
    } catch (error) {
        console.error("Erro no chat IA:", error);
        return { text: "Desculpe, ocorreu um erro ao processar sua solicitação." };
    }
};