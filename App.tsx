
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Graph3D } from './components/Graph3D';
import { EonEditor } from './components/EonEditor';
import { Sidebar } from './components/Sidebar';
import { GraphData, GraphNode, OrbitPath } from './types';
import { analyzeImageToGraph } from './services/geminiService';

const INITIAL_EON = `// EON TOPOLOGY V3 - AXIAL SYSTEM
// .CORE nodes are anchors in the vertical axis (X=0, Z=0)

node "APPS.CORE" {
  pos: [0, 18, 0];
  size: 2.8;
  color: "#ffffff";
  desc: "Centro de Execução de Aplicações";
}

orbit "SOFTWARE_LAYER" {
  parent: "APPS.CORE";
  radius: 8.5;
  rot: [0.3, 0.5, 0];
  color: "#34d399";
  nodes: ["calculadora", "terminal", "editor", "finder"];
}

node "SYSTEM.CORE" {
  pos: [0, 4, 0];
  size: 2.0;
  color: "#f8fafc";
  desc: "Núcleo de Baixo Nível e Drivers";
}

orbit "KERNEL_SERVICES" {
  parent: "SYSTEM.CORE";
  radius: 6.0;
  rot: [-0.2, 0.8, 0.1];
  color: "#60a5fa";
  nodes: ["scheduler", "memory_mgr", "io_bus"];
}
`;

const INITIAL_DATA: GraphData = {
  title: "EON Axial Visualizer",
  analysis: "Aguardando interação do sistema.",
  eonCode: INITIAL_EON,
  centralNodes: [],
  orbits: []
};

const App: React.FC = () => {
  const [data, setData] = useState<GraphData>(INITIAL_DATA);
  const [eonCode, setEonCode] = useState(INITIAL_EON);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAppOpen, setIsAppOpen] = useState(false);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [compileError, setCompileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsAppOpen(false);
  }, [selectedNode]);

  const compileEon = useCallback((codeToCompile: string = eonCode) => {
    try {
      setCompileError(null);
      const cleanCode = codeToCompile.replace(/\/\/.*/g, '');
      
      const nodesMap = new Map<string, any>();
      const centralNodes: GraphNode[] = [];
      const orbits: OrbitPath[] = [];

      // Helper to extract properties from a block string
      const getProp = (block: string, key: string) => {
        const re = new RegExp(`${key}:\\s*([^;\\n]+);?`, 'i');
        const m = block.match(re);
        if (!m) return null;
        let val = m[1].trim();
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        return val;
      };

      // Pass 1: Extract all Node definitions
      const nodeRegex = /node\s+"([^"]+)"\s*\{([\s\S]*?)\}/g;
      let nodeMatch;
      while ((nodeMatch = nodeRegex.exec(cleanCode)) !== null) {
        const id = nodeMatch[1];
        const content = nodeMatch[2];
        const isCore = id.toUpperCase().endsWith('.CORE');
        
        const posStr = getProp(content, 'pos');
        const pos: [number, number, number] = posStr 
          ? JSON.parse(posStr.replace(/'/g, '"')) 
          : [0, 0, 0];
        
        const sizeStr = getProp(content, 'size');
        const size = sizeStr ? parseFloat(sizeStr) : 1.0;
        
        const desc = getProp(content, 'desc') || "Módulo EON";
        const color = getProp(content, 'color');

        // Fix: Explicitly define the nodeData with fixed tuple types for position
        // and correct literal types for 'type' to ensure compatibility with GraphNode
        const nodeData = {
          id, 
          label: id, 
          description: desc,
          position: (isCore ? [0, pos[1], 0] : pos) as [number, number, number],
          size, 
          type: (isCore ? 'central' : 'orbit') as 'central' | 'orbit',
          color
        };
        
        nodesMap.set(id, nodeData);
        if (isCore) {
          // Fix: Use unknown cast as an intermediate step to handle the 'color' extra property
          // while preserving structural integrity for the push to centralNodes.
          centralNodes.push(nodeData as unknown as GraphNode);
        }
      }

      // Pass 2: Extract all Orbit definitions
      const orbitRegex = /orbit\s+"([^"]+)"\s*\{([\s\S]*?)\}/g;
      let orbitMatch;
      while ((orbitMatch = orbitRegex.exec(cleanCode)) !== null) {
        const id = orbitMatch[1];
        const content = orbitMatch[2];
        
        const parentId = getProp(content, 'parent');
        const radiusStr = getProp(content, 'radius');
        const radius = radiusStr ? parseFloat(radiusStr) : 5.0;
        
        const rotStr = getProp(content, 'rot');
        const rot: [number, number, number] = rotStr 
          ? JSON.parse(rotStr.replace(/'/g, '"')) 
          : [0, 0, 0];
        
        const orbitColor = getProp(content, 'color');
        const nodesListStr = getProp(content, 'nodes');
        const nodeLabels = nodesListStr 
          ? JSON.parse(nodesListStr.replace(/'/g, '"')) 
          : [];

        if (parentId) {
          const parentNode = nodesMap.get(parentId);
          const baseSize = parentNode ? parentNode.size * 0.25 : 0.4;

          orbits.push({
            id, radius, rotation: rot, parentIds: [parentId],
            color: orbitColor,
            nodes: nodeLabels.map((label: string) => {
              // Try to find if this node was globally defined to inherit metadata
              const globalDef = nodesMap.get(label);
              return {
                id: `${id}_${label}`, 
                label, 
                description: globalDef ? globalDef.description : `Instância do subsistema ${id}`,
                position: [0, 0, 0], 
                size: globalDef ? globalDef.size : baseSize, 
                type: 'orbit' as const,
                color: globalDef?.color || orbitColor
              };
            })
          });
        }
      }

      setData(prev => ({ ...prev, centralNodes, orbits, eonCode: codeToCompile }));
    } catch (e) {
      console.error("EON Sync Error:", e);
      setCompileError("EON Syntax Error: Verifique a estrutura dos blocos e os separadores.");
    }
  }, [eonCode]);

  useEffect(() => { compileEon(); }, [compileEon]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsAnalyzing(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const result = await analyzeImageToGraph(base64);
        setEonCode(result.eonCode || "");
        compileEon(result.eonCode);
        setIsAnalyzing(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Scan Error:", error);
      setIsAnalyzing(false);
    }
  };

  const handleViewMetadata = () => {
    if (!selectedNode) return;
    alert(`METADATA ANALYTICS [${selectedNode.id}]\n\nScale: ${selectedNode.size}\nType: ${selectedNode.type.toUpperCase()}\nStatus: ACTIVE\nLatency: 2ms\nThread_ID: 0x${Math.random().toString(16).slice(2, 10).toUpperCase()}`);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white font-sans selection:bg-black selection:text-white">
      <Sidebar 
        data={data} 
        onSelectNode={setSelectedNode} 
        isOpen={isSidebarOpen} 
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)} 
        searchQuery={searchQuery}
      />
      
      <div className="flex flex-1 relative overflow-hidden">
        <div 
          className="absolute left-0 top-0 h-full z-30 flex transition-all duration-700 ease-[cubic-bezier(0.85,0,0.15,1)]"
          style={{ transform: isEditorOpen ? 'translateX(0)' : 'translateX(-100%)', width: '450px' }}
        >
          <EonEditor code={eonCode} onChange={setEonCode} onApply={() => compileEon()} error={compileError} onToggle={() => setIsEditorOpen(false)} />
        </div>

        {!isEditorOpen && (
          <div className="absolute left-8 top-8 z-40 flex flex-col gap-4">
            <button 
              onClick={() => setIsEditorOpen(true)}
              className="p-5 bg-black text-white rounded-[24px] shadow-2xl hover:scale-110 hover:-rotate-3 transition-all active:scale-95 group flex items-center gap-3"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
              <span className="text-[10px] font-black uppercase tracking-[0.25em] hidden group-hover:block pr-2">Editor</span>
            </button>
          </div>
        )}

        <main className="flex-1 relative">
          <header className={`absolute top-0 left-0 right-0 p-12 z-10 flex justify-between items-center transition-opacity duration-1000 ${isAppOpen ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'}`}>
            <div className="pointer-events-auto select-none">
              <div className="bg-black/5 backdrop-blur-md px-6 py-4 rounded-[32px] border border-black/5">
                <h1 className="text-5xl font-black tracking-tighter text-black leading-[0.8]">EON</h1>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] mt-3">Orbital Topology Engine</p>
              </div>
            </div>

            <div className="flex gap-4 pointer-events-auto items-center">
              <div className="relative group">
                <input 
                  type="text"
                  placeholder="SEARCH NODES..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-white/80 backdrop-blur-lg border border-slate-100 rounded-full px-8 py-5 text-[10px] font-black uppercase tracking-widest w-64 focus:w-80 transition-all outline-none focus:ring-4 focus:ring-black/5 placeholder:text-slate-300"
                />
                <svg className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>

              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-4 px-12 py-6 bg-black text-white rounded-full shadow-[0_30px_60px_rgba(0,0,0,0.25)] hover:bg-slate-800 transition-all active:scale-95 group"
              >
                <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <span className="text-[12px] font-black uppercase tracking-[0.4em]">Scan Diagram</span>
              </button>
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
            </div>
          </header>

          {isAnalyzing && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/95 backdrop-blur-2xl animate-in fade-in duration-700">
              <div className="relative w-32 h-32 mb-12">
                <div className="absolute inset-0 border-[8px] border-slate-50 rounded-full" />
                <div className="absolute inset-0 border-[8px] border-black border-t-transparent rounded-full animate-spin" />
                <div className="absolute inset-8 border-[4px] border-slate-100 border-b-transparent rounded-full animate-spin-slow opacity-50" />
              </div>
              <p className="text-[12px] font-black uppercase tracking-[1em] text-black animate-pulse">Decompressing Geometry</p>
            </div>
          )}

          {selectedNode && (
            <div className="absolute top-12 right-12 z-20 w-[420px] bg-white border border-slate-100 p-12 rounded-[56px] shadow-[0_40px_120px_rgba(0,0,0,0.15)] animate-diagonal-in">
              <div className="flex justify-between items-start mb-10">
                <div className="max-w-[80%]">
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-2 block">Focus Unit</span>
                  <h2 className="text-4xl font-black text-black tracking-tighter leading-none break-words">{selectedNode.label}</h2>
                </div>
                <button onClick={() => { setSelectedNode(null); setIsAppOpen(false); }} className="text-slate-200 hover:text-black transition-colors p-2">
                   <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              
              <p className="text-md text-slate-500 mb-10 leading-relaxed font-semibold italic text-balance">"{selectedNode.description}"</p>
              
              <div className="grid grid-cols-2 gap-5 mb-10">
                <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100">
                  <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Mass Scale</span>
                  <span className="text-2xl font-black">{selectedNode.size.toFixed(2)}U</span>
                </div>
                <div className="p-6 bg-black rounded-[32px]">
                  <span className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Structure</span>
                  <span className="text-2xl font-black text-white uppercase tracking-tighter">{selectedNode.type === 'central' ? 'Core' : 'Unit'}</span>
                </div>
              </div>

              {selectedNode.type === 'orbit' && (
                <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                  <button 
                    onClick={() => setIsAppOpen(!isAppOpen)}
                    className={`w-full py-6 rounded-full text-[12px] font-black uppercase tracking-[0.4em] transition-all active:scale-95 flex items-center justify-center gap-3 ${isAppOpen ? 'bg-white border-2 border-black text-black' : 'bg-black text-white shadow-xl shadow-black/20 hover:scale-[1.02]'}`}
                  >
                    {isAppOpen ? (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                        Close Application
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Open App
                      </>
                    )}
                  </button>
                  <button 
                    onClick={handleViewMetadata}
                    className="w-full py-6 bg-white border-2 border-slate-100 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] hover:border-slate-300 hover:text-black transition-all flex items-center justify-center gap-3"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    View Metadata
                  </button>
                </div>
              )}
            </div>
          )}

          <Graph3D 
            data={data} 
            onNodeClick={setSelectedNode} 
            selectedNode={selectedNode} 
            searchQuery={searchQuery}
            isAppOpen={isAppOpen}
          />
          
          <div className={`absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-10 px-16 py-5 bg-white text-black rounded-full text-[12px] font-black uppercase tracking-[0.6em] shadow-[0_30px_80px_rgba(0,0,0,0.1)] border border-slate-100 transition-all duration-1000 ${isAppOpen ? 'opacity-0 translate-y-20' : 'opacity-100 translate-y-0'}`}>
            <span className="text-slate-200">AXIAL_V3</span>
            <div className="w-2 h-2 bg-black rounded-full animate-ping" />
            <span>{data.centralNodes.length} Cores</span>
            <div className="w-2 h-2 bg-slate-100 rounded-full" />
            <span>{data.orbits.reduce((acc, o) => acc + o.nodes.length, 0)} Active Units</span>
          </div>
        </main>
      </div>
      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }

        @keyframes diagonal-fly-in {
          0% {
            opacity: 0;
            transform: translate(120px, -120px) scale(0.9);
          }
          100% {
            opacity: 1;
            transform: translate(0, 0) scale(1);
          }
        }
        .animate-diagonal-in {
          animation: diagonal-fly-in 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
};

export default App;
