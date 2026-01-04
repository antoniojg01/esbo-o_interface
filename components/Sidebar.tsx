
import React, { useState } from 'react';
import { GraphData, GraphNode } from '../types';

interface SidebarProps {
  data: GraphData;
  onSelectNode: (node: GraphNode) => void;
  isOpen: boolean;
  onToggle: () => void;
  searchQuery?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ data, onSelectNode, isOpen, onToggle, searchQuery = '' }) => {
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const matchesSearch = (node: GraphNode) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      node.label.toLowerCase().includes(query) ||
      node.description.toLowerCase().includes(query)
    );
  };

  if (!isOpen) {
    return (
      <div className="w-16 bg-white flex flex-col items-center py-8 border-r border-slate-100 transition-all">
        <button onClick={onToggle} className="p-3 text-slate-300 hover:text-black transition-all hover:scale-110">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h12" /></svg>
        </button>
      </div>
    );
  }

  return (
    <div className="w-80 bg-white text-slate-600 flex flex-col h-full border-r border-slate-100 transition-all duration-500 ease-in-out">
      <div className="p-8 border-b border-slate-50 flex justify-between items-center">
        <div>
          <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Explorer</h2>
          <p className="text-[9px] font-bold text-slate-300 uppercase mt-1">Topology Map</p>
        </div>
        <button onClick={onToggle} className="text-slate-200 hover:text-slate-500 p-2 transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M11 19l-7-7 7-7" /></svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-6">
        {data.centralNodes.map((folder) => {
          const folderOrbits = data.orbits.filter(o => o.parentIds?.includes(folder.id));
          const filteredNodes = folderOrbits.flatMap(o => o.nodes).filter(matchesSearch);
          
          // Show folder if it matches or if any of its children match
          const folderMatches = matchesSearch(folder);
          const hasMatchingChildren = filteredNodes.length > 0;
          
          if (!folderMatches && !hasMatchingChildren) return null;

          const isExpanded = expandedFolders[folder.id] || (searchQuery.length > 0 && hasMatchingChildren);

          return (
            <div key={folder.id} className="mb-2">
              <div 
                className={`flex items-center gap-4 px-8 py-3 cursor-pointer hover:bg-slate-50 transition-all ${isExpanded ? 'bg-slate-50/50' : ''}`}
                onClick={() => { toggleFolder(folder.id); onSelectNode(folder); }}
              >
                <span className={`transform transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`}>
                  <svg className="w-4 h-4 text-slate-300" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                </span>
                <span className={`text-[13px] font-black truncate tracking-tight transition-colors ${folderMatches ? 'text-black' : 'text-slate-400'}`}>
                  {folder.label}
                </span>
              </div>

              {isExpanded && (
                <div className="ml-10 border-l-2 border-slate-50 mt-1">
                  {folderOrbits.map(orbit => {
                    const orbitNodes = orbit.nodes.filter(matchesSearch);
                    if (orbitNodes.length === 0) return null;

                    return (
                      <div key={orbit.id} className="mb-4">
                        <div className="px-6 py-2 text-[9px] font-black text-slate-200 uppercase tracking-widest">{orbit.id}</div>
                        {orbitNodes.map(node => (
                          <div 
                            key={node.id}
                            className="px-6 py-2 cursor-pointer hover:text-black group transition-all flex items-center gap-3"
                            onClick={() => onSelectNode(node)}
                          >
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-100 group-hover:bg-black group-hover:scale-150 transition-all" />
                            <span className="text-[12px] font-bold text-slate-500 group-hover:text-black transition-colors">{node.label}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
