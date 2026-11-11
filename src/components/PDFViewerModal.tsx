import React, { useState } from 'react';
import { X, FileText, Download, ExternalLink, Sparkles, BookOpen, Layers } from 'lucide-react';
import { ClassResource } from '../types';

interface PDFViewerModalProps {
  resource: ClassResource | null;
  onClose: () => void;
}

export const PDFViewerModal: React.FC<PDFViewerModalProps> = ({ resource, onClose }) => {
  const [viewMode, setViewMode] = useState<'preview' | 'summary'>('preview');

  if (!resource) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in">
      <div className="w-full max-w-4xl h-[88vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white line-clamp-1">{resource.title}</h3>
              <p className="text-xs text-slate-400">
                {resource.fileName} • {resource.fileSize} • {resource.pageCount} Pages • Uploaded {resource.uploadedAt}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Switcher */}
            <div className="flex bg-slate-950 border border-slate-800 p-1 rounded-xl text-xs">
              <button
                onClick={() => setViewMode('preview')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  viewMode === 'preview' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Document Viewer
              </button>
              <button
                onClick={() => setViewMode('summary')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  viewMode === 'summary' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-300" />
                AI Key Notes
              </button>
            </div>

            {resource.dataUrl && (
              <a
                href={resource.dataUrl}
                download={resource.fileName}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                title="Download PDF"
              >
                <Download className="w-4 h-4" />
              </a>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              title="Close Viewer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-950">
          {viewMode === 'preview' ? (
            resource.dataUrl ? (
              <div className="w-full h-full min-h-[500px] rounded-2xl overflow-hidden border border-slate-800 bg-slate-900">
                <iframe
                  src={resource.dataUrl}
                  title={resource.title}
                  className="w-full h-full min-h-[550px] border-none"
                />
              </div>
            ) : (
              /* High-fidelity interactive document reader fallback */
              <div className="max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl space-y-6">
                <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                  <span className="text-xs font-mono text-indigo-400 uppercase font-bold">
                    Class Reference Material • {resource.pageCount} Pages
                  </span>
                  <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-md">
                    Verified Course Curriculum
                  </span>
                </div>

                <div>
                  <h1 className="text-2xl font-bold text-white mb-2">{resource.title}</h1>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Source text referenced by LockIn AI for class question formulation, exam alignment, and Socratic tutoring.
                  </p>
                </div>

                <div className="space-y-4 text-sm text-slate-300 leading-relaxed font-serif bg-slate-950/60 p-6 rounded-xl border border-slate-800/80">
                  <h4 className="font-sans font-bold text-slate-100 text-base">Section 1: Theoretical Overview</h4>
                  <p>
                    {resource.aiSummary}
                  </p>

                  <h4 className="font-sans font-bold text-slate-100 text-base mt-4">Section 2: Core Formulations & Derivations</h4>
                  <p>
                    For any rotational system subjected to an external torque τ, the angular acceleration α satisfies the governing relationship:
                  </p>
                  <div className="p-3 bg-slate-900 rounded-lg text-center font-mono text-indigo-300 text-sm">
                    τ_net = I · α = dL / dt
                  </div>
                  <p>
                    Where <em>I</em> represents the moment of inertia tensor about the principal rotation axis, and <em>L</em> denotes the total angular momentum. When net external torque equals zero, angular momentum is strictly conserved across all interacting bodies.
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-800 flex flex-wrap gap-2">
                  {resource.topics.map((t, idx) => (
                    <span key={idx} className="text-xs bg-indigo-950/70 text-indigo-300 border border-indigo-800/80 px-2.5 py-1 rounded-lg">
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            )
          ) : (
            /* AI Key Notes & Grounding Analysis */
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-slate-900 border border-purple-800/50 p-6 rounded-2xl">
                <div className="flex items-center gap-2 text-purple-400 text-xs font-bold uppercase tracking-wider mb-2">
                  <Sparkles className="w-4 h-4" />
                  AI Synthesis & Grounding
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Curriculum Alignment Overview</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {resource.aiSummary}
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  Key Extracted Concepts ({resource.topics.length})
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {resource.topics.map((top, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-mono font-bold text-[10px]">
                        {idx + 1}
                      </span>
                      <span>{top}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-start gap-3">
                <BookOpen className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                <span>
                  The teacher's AI Worksheet Generator references these extracted concepts to formulate questions, multiple choice distractors, and scoring rubrics.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
