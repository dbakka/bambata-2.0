'use client';

import React from 'react';
import { Disc3, Cpu, Sparkles, Radio } from 'lucide-react';

interface HeaderProps {
  currentStep: number;
}

export default function Header({ currentStep }: HeaderProps) {
  const steps = [
    { num: 1, label: 'Reference & Brain' },
    { num: 2, label: 'Track Ingestion' },
    { num: 3, label: 'GPU Stems & Previews' },
    { num: 4, label: 'Master & Discovery' },
  ];

  return (
    <header className="border-b border-studio-border bg-studio-bg/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 shadow-lg shadow-cyan-500/20">
            <Disc3 className="w-6 h-6 text-white animate-laser-spin" />
            <div className="absolute inset-0 rounded-xl ring-1 ring-white/30" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-wider text-white">
                BAMBATA <span className="text-cyan-400 font-mono text-lg">2.0</span>
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
                PRO DJ AI
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Serverless GPU Mashup & Harmonic Transposition Engine
            </p>
          </div>
        </div>

        {/* Multi-Step Wizard Indicator */}
        <nav className="hidden md:flex items-center gap-2 bg-[#12141e] border border-studio-border px-3 py-1.5 rounded-full">
          {steps.map((step) => {
            const isActive = currentStep === step.num;
            const isCompleted = currentStep > step.num;
            return (
              <div key={step.num} className="flex items-center gap-2">
                <div
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono transition-all ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm shadow-cyan-500/30 font-bold'
                      : isCompleted
                      ? 'text-slate-300 bg-white/5 font-medium'
                      : 'text-slate-500 opacity-60'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                    isActive ? 'bg-cyan-400 text-black font-bold' : isCompleted ? 'bg-emerald-500/30 text-emerald-300' : 'bg-slate-800'
                  }`}>
                    {isCompleted ? '✓' : step.num}
                  </span>
                  <span>{step.label}</span>
                </div>
                {step.num < 4 && <span className="text-slate-600 text-xs">/</span>}
              </div>
            );
          })}
        </nav>

        {/* Serverless GPU Worker Live Status Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <Cpu className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Modal GPU:</span>
            <span className="font-bold">A10G READY</span>
          </div>
        </div>

      </div>
    </header>
  );
}
