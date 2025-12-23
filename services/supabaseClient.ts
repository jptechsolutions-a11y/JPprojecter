import { createClient } from '@supabase/supabase-js';

// Função auxiliar para ler variáveis de ambiente de forma segura em diferentes ambientes (Vite, CRA, Node)
const getEnvVar = (key: string) => {
  // Tenta ler do Vite (import.meta.env)
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env[key]) {
      return (import.meta as any).env[key];
    }
  } catch (e) {
    // Ignora erro se import.meta não existir
  }

  // Tenta ler do process.env (Node/Webpack/CRA)
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
  } catch (e) {
    // Ignora erro se process não estiver definido
  }

  return '';
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase URL ou Key não encontradas. Verifique suas variáveis de ambiente no Vercel ou .env.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder'
);