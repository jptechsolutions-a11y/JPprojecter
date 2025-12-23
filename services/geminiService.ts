import { GoogleGenAI, Type } from "@google/genai";

// Helper for safe environment access in Browser/Vite
const getEnv = (key: string) => {
    try {
        if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env[key]) {
            return (import.meta as any).env[key];
        }
    } catch(e) {}
    
    try {
        if (typeof process !== 'undefined' && process.env) {
            return process.env[key];
        }
    } catch(e) {}

    return '';
};

// Robust Key Retrieval
const rawApiKey = getEnv('VITE_GOOGLE_API_KEY') || getEnv('GOOGLE_API_KEY') || getEnv('API_KEY');
const apiKey = (rawApiKey && rawApiKey.trim() !== '' && rawApiKey !== 'undefined' && rawApiKey !== 'null') ? rawApiKey : null;

let ai: GoogleGenAI | null = null;

if (apiKey) {
    try {
        ai = new GoogleGenAI({ apiKey: apiKey });
    } catch (e) {
        console.warn("Failed to initialize GoogleGenAI. Falling back to Mock Mode.", e);
    }
} else {
    console.warn("Google API Key is missing. Running in Mock Mode (Simulated AI).");
}

// --- Helper: Mock Delay ---
const simulateDelay = (ms = 1000) => new Promise(resolve => setTimeout(resolve, ms));

// --- Helper Functions ---

export const generateTaskDescription = async (taskTitle: string): Promise<string> => {
  if (!ai) {
      await simulateDelay();
      return `[IA Demo] Esta é uma descrição gerada automaticamente para a tarefa "${taskTitle}". \n\nO objetivo principal é garantir que todos os requisitos sejam atendidos com qualidade e dentro do prazo estipulado. Recomendamos dividir esta atividade em etapas menores para melhor acompanhamento.`;
  }
  
  try {
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
  if (!ai) {
      await simulateDelay();
      return [
          "Analisar requisitos iniciais",
          "Criar documentação técnica",
          "Desenvolver protótipo funcional",
          "Realizar testes de validação",
          "Aprovar com stakeholders"
      ];
  }

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
    return ["Erro na IA - Adicione itens manualmente"];
  }
};

export const assistCode = async (currentCode: string, instruction: string, language: string): Promise<string> => {
    if (!ai) {
        await simulateDelay();
        return `${currentCode}\n\n// [IA Demo] Código otimizado conforme: "${instruction}"\n// (Adicione uma API Key válida para geração real)`;
    }

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
    if (!ai) {
        await simulateDelay();
        return code + "\n// [IA Demo] Correção simulada aplicada.";
    }

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
    if (!ai) {
        await simulateDelay(2000);
        return [
            { name: "index.html", language: "html", content: "<!-- Demo Project -->\n<h1>Projeto Gerado (Demo)</h1>\n<p>Adicione uma API Key para gerar projetos reais.</p>" },
            { name: "style.css", language: "css", content: "body { background: #f0f0f0; font-family: sans-serif; text-align: center; padding: 50px; }" },
            { name: "script.js", language: "javascript", content: "console.log('Demo running...');" }
        ];
    }

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
    
    // --- Mock Response for Demo ---
    if (!ai) {
        await simulateDelay(1500);
        
        if (generateImage) {
            return { 
                text: "Como estou no modo de demonstração (sem API Key), gerei esta imagem simulada baseada em: " + message,
                imageUrl: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=1000&auto=format&fit=crop" 
            };
        }

        if (message.toLowerCase().includes("código") || message.toLowerCase().includes("html") || message.toLowerCase().includes("script")) {
            return {
                text: "Aqui está um exemplo de código gerado no modo demonstração:",
                code: {
                    lang: 'html',
                    content: '<div class="demo-card">\n  <h2>Código Gerado (Demo)</h2>\n  <p>Adicione uma API Key para IA real.</p>\n  <button>Clique</button>\n</div>'
                }
            };
        }
        
        if (attachments && attachments.length > 0) {
             return {
                 text: `Recebi seus arquivos (${attachments.map(a => a.name).join(', ')}). No modo demo, finjo que analisei e digo: O código parece limpo, mas faltam testes unitários.`
             };
        }

        return { text: "Estou operando em Modo Demonstração. Adicione a `VITE_GOOGLE_API_KEY` para ativar:\n- Geração real de imagens (Imagen 3)\n- Análise de arquivos e código\n- Respostas inteligentes completas" };
    }
    
    // --- Real AI Call ---
    try {
        // 1. Image Generation (Uses Imagen Model)
        if (generateImage) {
            try {
                const response = await ai.models.generateImages({
                    model: 'imagen-3.0-generate-001',
                    prompt: message,
                    config: {
                        numberOfImages: 1,
                        aspectRatio: '1:1', // Default square
                    }
                });
                
                if (response.generatedImages && response.generatedImages.length > 0) {
                    const base64Image = response.generatedImages[0].image.imageBytes;
                    const imageUrl = `data:image/png;base64,${base64Image}`;
                    return { text: `Aqui está a imagem gerada para: "${message}"`, imageUrl };
                } else {
                     return { text: "Não foi possível gerar a imagem. O modelo não retornou dados." };
                }
            } catch (imgError) {
                console.error("Erro na geração de imagem:", imgError);
                return { text: "Erro ao gerar imagem. Verifique se sua chave de API tem acesso ao modelo Imagen 3." };
            }
        } 
        
        // 2. Text/Code/Multimodal Generation (Uses Gemini 3 Flash)
        else {
            const parts: any[] = [];
            let textContext = "";

            // Handle Attachments (Code files or Images/Audio for analysis)
            if(attachments && attachments.length > 0) {
                attachments.forEach(att => {
                    if (att.mimeType && (att.mimeType.startsWith('image/') || att.mimeType.startsWith('audio/'))) {
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
                        // Text/Code file context
                        textContext += `\n--- ARQUIVO ANEXADO: ${att.name} ---\n${att.content}\n--- FIM DO ARQUIVO ---\n`;
                    }
                });
            }

            if (textContext) {
                 textContext += "\nAnalise os arquivos acima conforme solicitado na mensagem abaixo.\n";
            }
            
            parts.push({ text: textContext + message });

            const model = 'gemini-3-flash-preview'; 
            
            // Format history for API
            const chatHistory = history.map(h => ({
                role: h.role,
                parts: [{ text: h.content }]
            }));

            const chat = ai.chats.create({
                model: model,
                history: chatHistory,
                config: {
                    systemInstruction: "Você é o assistente JP Projects, um especialista Full Stack e Gerente de Projetos. \n1. Se o usuário pedir código, forneça-o COMPLETO e FUNCIONAL dentro de blocos Markdown. \n2. Se o usuário anexar arquivos, analise-os detalhadamente (bugs, melhorias, explicações). \n3. Se o usuário pedir para gerar uma imagem, diga que tentará fazer isso.",
                }
            });

            const result = await chat.sendMessage({ message: parts });
            const responseText = result.text;
            
            // Extract code block if present
            const codeBlockRegex = /```(html|css|javascript|js|ts|typescript|json)?\n([\s\S]*?)```/;
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
    } catch (error: any) {
        console.error("Erro no chat IA:", error);
        
        if (error.message && error.message.includes('API key')) {
             return { text: "⚠️ Erro de Configuração: Sua chave de API do Google parece inválida ou vazia." };
        }

        return { text: "Desculpe, ocorreu um erro na comunicação com a IA. Tente reformular sua solicitação." };
    }
};