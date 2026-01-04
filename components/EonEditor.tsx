
import React from 'react';

interface EonEditorProps {
  code: string;
  onChange: (newCode: string) => void;
  onApply: () => void;
  onToggle: () => void;
  error?: string | null;
}

export const EonEditor: React.FC<EonEditorProps> = ({ code, onChange, onApply, onToggle, error }) => {
  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <div className="flex items-center gap-3">
          <button onClick={onToggle} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7" /></svg>
          </button>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Topology Editor</span>
        </div>
        <button onClick={onApply} className="bg-black hover:bg-slate-800 text-white px-4 py-1.5 rounded-full text-[10px] font-black transition-all active:scale-95 shadow-lg shadow-black/10">
          Sync Graph
        </button>
      </div>

      <div className="flex-1 relative bg-slate-900">
        <textarea
          value={code}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          className="absolute inset-0 bg-transparent border-none outline-none resize-none p-6 text-slate-300 font-mono text-sm leading-relaxed w-full h-full selection:bg-white/20"
          placeholder="// Defina sua topologia..."
        />
      </div>

      {error && (
        <div className="p-4 bg-red-50 border-t border-red-100 text-red-600 text-xs font-bold animate-in slide-in-from-bottom-2">
          {error}
        </div>
      )}
      
      <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest">
        <span>EON_SYNTAX_V2</span>
        <span>Axial Enabled</span>
      </div>
    </div>
  );
};
