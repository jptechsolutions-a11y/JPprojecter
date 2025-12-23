import React, { useState, useEffect, useRef } from 'react';
import { Play, Code, Wand2, Save, Terminal, Layout, FolderPlus, FilePlus, Trash2, ChevronRight, ChevronDown, Folder, Settings, RefreshCw, Hammer, Sparkles, AlertTriangle } from 'lucide-react';
import { assistCode, generateFullProject, fixCodeError } from '../services/geminiService';
import { CodeFile, DevProject } from '../types';

// Simple Prism-like syntax highlighting logic for the overlay
const highlightCode = (code: string, lang: string) => {
  let highlighted = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  if (lang === 'html') {
    highlighted = highlighted
      .replace(/(&lt;\/?)(\w+)(.*?)(&gt;)/g, '<span class="text-blue-400">$1</span><span class="text-pink-400">$2</span>$3<span class="text-blue-400">$4</span>')
      .replace(/([a-z-]+)=(".*?")/g, '<span class="text-green-300">$1</span>=<span class="text-yellow-300">$2</span>');
  } else if (lang === 'css') {
    highlighted = highlighted
      .replace(/([a-z-]+)(:)/g, '<span class="text-blue-300">$1</span>$2')
      .replace(/({|})/g, '<span class="text-yellow-400">$1</span>')
      .replace(/(#[\w]+)/g, '<span class="text-orange-300">$1</span>');
  } else if (lang === 'javascript' || lang === 'typescript') {
    highlighted = highlighted
      .replace(/\b(const|let|var|function|return|if|else|for|while|import|from|export|async|await)\b/g, '<span class="text-pink-400">$1</span>')
      .replace(/\b(console|document|window|Math|JSON)\b/g, '<span class="text-green-400">$1</span>')
      .replace(/(".*?"|'.*?'|`.*?`)/g, '<span class="text-yellow-300">$1</span>')
      .replace(/(\/\/.*)/g, '<span class="text-gray-500 italic">$1</span>')
      .replace(/\b(\d+)\b/g, '<span class="text-purple-300">$1</span>');
  }
  return highlighted;
};

export const DevEnvironment: React.FC = () => {
  // Mock Projects
  const [projects, setProjects] = useState<DevProject[]>([
    { id: 'p1', name: 'Website Institucional', description: 'Landing page da empresa', createdAt: new Date().toISOString() },
    { id: 'p2', name: 'Calculadora React', description: 'App de utilidade', createdAt: new Date().toISOString() }
  ]);
  
  // Mock Files
  const [files, setFiles] = useState<CodeFile[]>([
    { id: '1', projectId: 'p1', name: 'index.html', language: 'html', content: '<div class="container">\n  <h1>Bem-vindo ao JP Dev</h1>\n  <p>Edite os arquivos ao lado para ver a mágica!</p>\n  <button id="btn">Clique Aqui</button>\n</div>' },
    { id: '2', projectId: 'p1', name: 'style.css', language: 'css', content: 'body { background: #f0f2f5; font-family: sans-serif; }\n.container { text-align: center; margin-top: 50px; }\nh1 { color: #00b4d8; }\nbutton { padding: 10px 20px; background: #0077b6; color: white; border: none; border-radius: 4px; cursor: pointer; }\nbutton:hover { background: #023e8a; }' },
    { id: '3', projectId: 'p1', name: 'script.js', language: 'javascript', content: 'document.getElementById("btn").addEventListener("click", () => {\n  alert("Sistema rodando perfeitamente!");\n  console.log("Evento disparado");\n});' },
    { id: '4', projectId: 'p2', name: 'App.js', language: 'javascript', content: '// Projeto Calculadora\nconsole.log("Iniciando...");' }
  ]);

  const [activeProjectId, setActiveProjectId] = useState<string>('p1');
  const [activeFileId, setActiveFileId] = useState<string>('1');
  const [outputSrc, setOutputSrc] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  
  const [isNewFileModalOpen, setIsNewFileModalOpen] = useState(false);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isGenProjectModalOpen, setIsGenProjectModalOpen] = useState(false); // Generate full project modal

  const activeProject = projects.find(p => p.id === activeProjectId);
  const projectFiles = files.filter(f => f.projectId === activeProjectId);
  const activeFile = files.find(f => f.id === activeFileId) || projectFiles[0];

  // Editor Refs for syncing scroll
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  const handleScroll = () => {
    if (textareaRef.current && preRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  const runCode = () => {
    setConsoleLogs(['> Building project...', '> Starting server...']);
    
    // Find entry points or concatenate all
    const htmlFile = projectFiles.find(f => f.language === 'html' && f.name.includes('index')) || projectFiles.find(f => f.language === 'html');
    const cssFiles = projectFiles.filter(f => f.language === 'css');
    const jsFiles = projectFiles.filter(f => f.language === 'javascript');

    const cssContent = cssFiles.map(f => f.content).join('\n');
    const jsContent = jsFiles.map(f => f.content).join('\n');
    const htmlContent = htmlFile ? htmlFile.content : '<div style="padding:20px; color: #666;">No HTML file found. Create an index.html</div>';

    // Override console.log in the iframe to capture output
    const consoleOverride = `
      <script>
        const originalLog = console.log;
        console.log = function(...args) {
          window.parent.postMessage({type: 'console', message: args.join(' ')}, '*');
          originalLog.apply(console, args);
        };
        const originalError = console.error;
        console.error = function(...args) {
             window.parent.postMessage({type: 'error', message: args.join(' ')}, '*');
             originalError.apply(console, args);
        }
        window.onerror = function(message, source, lineno, colno, error) {
            window.parent.postMessage({type: 'error', message: message + ' at line ' + lineno}, '*');
        };
      </script>
    `;

    const src = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>${cssContent}</style>
        </head>
        <body>
          ${htmlContent}
          ${consoleOverride}
          <script>
            try {
              ${jsContent}
            } catch(e) {
              console.error(e);
            }
          </script>
        </body>
      </html>
    `;
    setOutputSrc(src);
  };

  // Listen for iframe messages
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data.type === 'console') {
        setConsoleLogs(prev => [...prev, `[LOG] ${e.data.message}`]);
      } else if (e.data.type === 'error') {
        setConsoleLogs(prev => [...prev, `[ERR] ${e.data.message}`]);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const handleAiAssist = async () => {
    if (!aiPrompt.trim() || !activeFile) return;
    setIsAiProcessing(true);
    const newContent = await assistCode(activeFile.content, aiPrompt, activeFile.language);
    setFiles(prev => prev.map(f => f.id === activeFile.id ? { ...f, content: newContent } : f));
    setAiPrompt('');
    setIsAiProcessing(false);
  };

  const handleGenerateFullProject = async (prompt: string) => {
      setIsAiProcessing(true);
      // Create new project
      const newProjId = crypto.randomUUID();
      const newProj: DevProject = { 
          id: newProjId, 
          name: prompt.substring(0, 20) + '...', 
          description: prompt, 
          createdAt: new Date().toISOString() 
      };
      
      const generatedFiles = await generateFullProject(prompt);
      
      if (generatedFiles.length > 0) {
          const newCodeFiles: CodeFile[] = generatedFiles.map(f => ({
              id: crypto.randomUUID(),
              projectId: newProjId,
              name: f.name,
              language: f.language as any,
              content: f.content
          }));
          
          setProjects([...projects, newProj]);
          setFiles([...files, ...newCodeFiles]);
          setActiveProjectId(newProjId);
          setActiveFileId(newCodeFiles[0].id);
      }
      
      setIsAiProcessing(false);
      setIsGenProjectModalOpen(false);
  };

  const handleFixError = async (errorMessage: string) => {
      if (!activeFile) return;
      setIsAiProcessing(true);
      const fixedCode = await fixCodeError(activeFile.content, errorMessage, activeFile.language);
      setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, content: fixedCode } : f));
      setIsAiProcessing(false);
      
      // Auto run after fix
      setTimeout(runCode, 500);
  };

  const handleCreateProject = (name: string) => {
      const newProj: DevProject = { id: crypto.randomUUID(), name, description: 'Novo projeto', createdAt: new Date().toISOString() };
      setProjects([...projects, newProj]);
      setActiveProjectId(newProj.id);
      setIsNewProjectModalOpen(false);
  };

  const handleCreateFile = (name: string, lang: CodeFile['language']) => {
      const newFile: CodeFile = { 
          id: crypto.randomUUID(), 
          projectId: activeProjectId, 
          name, 
          language: lang, 
          content: lang === 'html' ? '<!-- New File -->' : '// Code here' 
      };
      setFiles([...files, newFile]);
      setActiveFileId(newFile.id);
      setIsNewFileModalOpen(false);
  };

  const handleDeleteFile = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (confirm('Tem certeza?')) {
          setFiles(prev => prev.filter(f => f.id !== id));
          if (activeFileId === id) setActiveFileId('');
      }
  };

  return (
    <div className="flex h-full bg-[#1e1e1e] text-gray-300 font-mono overflow-hidden rounded-lg shadow-xl border border-gray-700">
      
      {/* Activity Bar (Projects) */}
      <div className="w-12 bg-[#333333] flex flex-col items-center py-4 border-r border-[#252526] gap-4">
          {projects.map(p => (
              <button 
                key={p.id}
                onClick={() => setActiveProjectId(p.id)}
                title={p.name}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${activeProjectId === p.id ? 'bg-[#00b4d8] text-white' : 'bg-[#444] hover:bg-[#555]'}`}
              >
                  <Folder size={16} />
              </button>
          ))}
          <div className="h-[1px] w-8 bg-gray-600 my-1"></div>
          <button 
             onClick={() => setIsNewProjectModalOpen(true)}
             className="w-8 h-8 rounded-lg border border-dashed border-gray-500 flex items-center justify-center hover:border-[#00b4d8] hover:text-[#00b4d8]"
             title="Novo Projeto Manual"
          >
              <PlusIcon size={16} />
          </button>
          <button 
             onClick={() => setIsGenProjectModalOpen(true)}
             className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 text-white flex items-center justify-center hover:shadow-lg hover:scale-105 transition-all"
             title="Gerar Projeto com IA"
          >
              <Sparkles size={16} />
          </button>
      </div>

      {/* Sidebar - Files */}
      <div className="w-56 bg-[#252526] border-r border-[#1e1e1e] flex flex-col">
        <div className="p-3 text-xs font-bold uppercase tracking-wider text-gray-500 flex justify-between items-center">
            <span>Explorador</span>
            <button onClick={() => setIsNewFileModalOpen(true)} className="hover:text-white"><FilePlus size={14} /></button>
        </div>
        <div className="px-2 py-1 text-sm font-bold text-[#00b4d8] mb-2 truncate">
            {activeProject?.name}
        </div>
        
        <div className="flex-1 overflow-y-auto">
            {projectFiles.map(file => (
                <button
                    key={file.id}
                    onClick={() => setActiveFileId(file.id)}
                    className={`w-full flex items-center justify-between px-3 py-1.5 text-sm hover:bg-[#2a2d2e] group ${activeFileId === file.id ? 'bg-[#37373d] text-white' : 'text-gray-400'}`}
                >
                    <div className="flex items-center gap-2 truncate">
                        <Code size={14} className={file.language === 'html' ? 'text-orange-500' : file.language === 'css' ? 'text-blue-400' : 'text-yellow-400'} />
                        <span className="truncate">{file.name}</span>
                    </div>
                    <span onClick={(e) => handleDeleteFile(e, file.id)} className="opacity-0 group-hover:opacity-100 hover:text-red-400">
                        <Trash2 size={12} />
                    </span>
                </button>
            ))}
            {projectFiles.length === 0 && (
                <div className="p-4 text-xs text-gray-600 text-center italic">
                    Nenhum arquivo. Crie um novo.
                </div>
            )}
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#1e1e1e]">
        {activeFile ? (
        <>
            {/* Toolbar */}
            <div className="h-10 bg-[#2d2d2d] flex items-center justify-between px-4 border-b border-[#1e1e1e]">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                    <span className="text-[#00b4d8]">{activeFile.name}</span>
                    <span className="text-xs bg-[#333] px-2 rounded text-gray-500">{activeFile.language}</span>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={runCode} className="flex items-center gap-1 text-green-400 hover:text-green-300 text-xs px-3 py-1 bg-[#333] hover:bg-[#444] rounded transition-colors border border-green-900">
                        <Play size={12} /> Run
                    </button>
                </div>
            </div>

            {/* Editor Container */}
            <div className="flex-1 relative font-mono text-sm group">
                {/* Line Numbers */}
                <div className="absolute left-0 top-0 bottom-0 w-10 bg-[#1e1e1e] border-r border-[#333] text-gray-600 text-right pr-2 pt-4 select-none z-20 pointer-events-none text-xs leading-6">
                    {activeFile.content.split('\n').map((_, i) => (
                        <div key={i}>{i + 1}</div>
                    ))}
                </div>

                {/* Code Overlay (Syntax Highlighting) */}
                <pre 
                    ref={preRef}
                    className="absolute inset-0 left-10 pl-2 pt-4 m-0 overflow-hidden pointer-events-none bg-[#1e1e1e] whitespace-pre text-gray-300 leading-6"
                    aria-hidden="true"
                >
                    <code dangerouslySetInnerHTML={{ __html: highlightCode(activeFile.content, activeFile.language) }} />
                </pre>

                {/* Actual Textarea (Transparent) */}
                <textarea
                    ref={textareaRef}
                    value={activeFile.content}
                    onChange={(e) => {
                        setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, content: e.target.value } : f));
                    }}
                    onScroll={handleScroll}
                    className="absolute inset-0 left-10 pl-2 pt-4 w-[calc(100%-2.5rem)] h-full bg-transparent text-transparent caret-white outline-none resize-none leading-6 z-10"
                    spellCheck={false}
                    autoCapitalize="off"
                    autoComplete="off"
                />
            </div>
            
            {/* AI Assistant Bar */}
            <div className="bg-[#252526] p-2 border-t border-[#333] flex gap-2 items-center">
                <Wand2 size={16} className="text-purple-400" />
                <input 
                    type="text" 
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAiAssist()}
                    placeholder="Ex: Crie um botão azul centralizado..."
                    className="flex-1 bg-[#3c3c3c] text-white text-xs p-2 rounded border border-[#444] outline-none focus:border-purple-500 placeholder-gray-500"
                />
                <button 
                    onClick={handleAiAssist}
                    disabled={isAiProcessing}
                    className="text-xs bg-purple-600 text-white px-3 py-2 rounded hover:bg-purple-700 disabled:opacity-50 transition-colors"
                >
                    {isAiProcessing ? '...' : 'Gerar'}
                </button>
            </div>
        </>
        ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-600">
                <Code size={48} className="mb-4 opacity-50" />
                <p>Selecione ou crie um arquivo para começar.</p>
            </div>
        )}
      </div>

      {/* Preview Pane */}
      <div className="w-1/3 bg-white border-l border-[#333] flex flex-col">
        <div className="h-10 bg-[#f0f0f0] flex items-center justify-between px-4 text-xs font-bold text-gray-500 border-b border-gray-200 gap-2">
            <div className="flex items-center gap-2"><Layout size={14} /> Preview</div>
            <button onClick={runCode} className="hover:text-blue-500"><RefreshCw size={12}/></button>
        </div>
        <div className="flex-1 bg-white relative">
            <iframe 
                srcDoc={outputSrc}
                title="Preview"
                className="w-full h-full border-none"
                sandbox="allow-scripts allow-modals"
            />
        </div>
        <div className="h-32 bg-[#1e1e1e] border-t border-[#333] flex flex-col">
            <div className="h-6 bg-[#252526] px-2 flex items-center text-[10px] text-gray-400 uppercase tracking-wide border-b border-[#333]">
                <Terminal size={10} className="mr-1" /> Terminal
            </div>
            <div className="flex-1 p-2 text-xs font-mono text-green-400 overflow-y-auto font-normal space-y-1">
                {consoleLogs.map((log, i) => (
                    <div key={i} className={`flex items-start gap-2 ${log.includes('[ERR]') ? 'text-red-400' : 'text-green-400'}`}>
                        <span>{log}</span>
                        {log.includes('[ERR]') && (
                            <button 
                                onClick={() => handleFixError(log)}
                                className="text-[10px] bg-red-900/50 hover:bg-red-800 text-red-200 px-1.5 py-0.5 rounded flex items-center gap-1 border border-red-800 ml-auto"
                            >
                                <Hammer size={10} /> Corrigir
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
      </div>

      {/* Modals */}
      {isNewFileModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="bg-[#252526] p-6 rounded-lg w-80 shadow-2xl border border-[#444] animate-fade-in-up">
                  <h3 className="text-white font-bold mb-4">Novo Arquivo</h3>
                  <form onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      handleCreateFile(formData.get('name') as string, formData.get('lang') as any);
                  }}>
                      <input name="name" autoFocus className="w-full bg-[#333] text-white p-2 rounded mb-3 border border-[#444]" placeholder="Nome (ex: app.js)" required />
                      <select name="lang" className="w-full bg-[#333] text-white p-2 rounded mb-4 border border-[#444]">
                          <option value="html">HTML</option>
                          <option value="css">CSS</option>
                          <option value="javascript">JavaScript</option>
                          <option value="json">JSON</option>
                      </select>
                      <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => setIsNewFileModalOpen(false)} className="text-gray-400 hover:text-white text-xs">Cancelar</button>
                          <button type="submit" className="bg-[#00b4d8] text-white px-3 py-1 rounded text-xs">Criar</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
      
       {isNewProjectModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="bg-[#252526] p-6 rounded-lg w-80 shadow-2xl border border-[#444] animate-fade-in-up">
                  <h3 className="text-white font-bold mb-4">Novo Projeto</h3>
                  <form onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      handleCreateProject(formData.get('name') as string);
                  }}>
                      <input name="name" autoFocus className="w-full bg-[#333] text-white p-2 rounded mb-4 border border-[#444]" placeholder="Nome do Projeto" required />
                      <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => setIsNewProjectModalOpen(false)} className="text-gray-400 hover:text-white text-xs">Cancelar</button>
                          <button type="submit" className="bg-[#00b4d8] text-white px-3 py-1 rounded text-xs">Criar</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {isGenProjectModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="bg-[#252526] p-6 rounded-lg w-96 shadow-2xl border border-[#444] animate-fade-in-up">
                  <div className="flex items-center gap-2 mb-4 text-purple-400">
                      <Sparkles size={20} />
                      <h3 className="text-white font-bold">Gerar Projeto com IA</h3>
                  </div>
                  <p className="text-gray-400 text-xs mb-4">Descreva o que você quer construir e a IA gerará todos os arquivos necessários.</p>
                  <form onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      handleGenerateFullProject(formData.get('prompt') as string);
                  }}>
                      <textarea 
                        name="prompt" 
                        autoFocus 
                        rows={4}
                        className="w-full bg-[#333] text-white p-3 rounded mb-4 border border-[#444] text-sm" 
                        placeholder="Ex: Crie uma landing page de cafeteria com cores marrom e creme, um menu de navegação e uma seção de produtos." 
                        required 
                      />
                      <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => setIsGenProjectModalOpen(false)} className="text-gray-400 hover:text-white text-xs">Cancelar</button>
                          <button 
                            type="submit" 
                            disabled={isAiProcessing}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-xs font-bold flex items-center gap-2 disabled:opacity-50"
                          >
                             {isAiProcessing ? 'Gerando...' : 'Gerar Código'}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

    </div>
  );
};

// Helper icon
const PlusIcon = ({size}: {size:number}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
);