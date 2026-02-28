
import React, { useState } from 'react';
import { CloudConfig } from '../types';
import { cloudService } from '../services/cloudService';

interface CloudSettingsProps {
  config: CloudConfig | null;
  onSave: (config: CloudConfig) => void;
  onBack: () => void;
}

const CloudSettings: React.FC<CloudSettingsProps> = ({ config, onSave, onBack }) => {
  const [url, setUrl] = useState(config?.syncUrl || '');
  const [key, setKey] = useState(config?.apiKey || '');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{success: boolean, message: string} | null>(null);
  const [showScript, setShowScript] = useState(false);

  const handleTest = async () => {
    if (!url || !key) return;
    setIsTesting(true);
    setTestResult(null);
    const result = await cloudService.testConnection(url, key);
    setTestResult(result);
    setIsTesting(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ syncUrl: url, apiKey: key });
  };

  const copyScript = () => {
    navigator.clipboard.writeText(cloudService.getAppsScriptTemplate());
    alert('Bridge Script copied! Paste this into Google Sheets Apps Script.');
  };

  return (
    <div className="flex flex-col h-full w-full max-w-xl mx-auto p-4 sm:p-6 animate-slideInRight">
      <header className="flex justify-between items-center mb-8">
        <button onClick={onBack} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <h1 className="text-lg font-bold text-slate-900">Cloud Status</h1>
        <div className="w-10"></div>
      </header>

      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-6 space-y-6">
        <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-start gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-indigo-200">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.5 19a3.5 3.5 0 1 1-5.84-2.67 5 5 0 1 1 9.34-1.33A3 3 0 0 1 18 21V19Z"/><path d="M12 12v9"/><path d="m15 18-3 3-3-3"/></svg>
          </div>
          <div>
            <p className="text-sm font-black text-indigo-900">Cloud Sync Master</p>
            <p className="text-[10px] text-indigo-700 font-bold uppercase tracking-tight mt-0.5">Configuration is pre-set for your project</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Current Sync URL</label>
            <input
              type="url"
              readOnly
              value={url}
              className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none text-[10px] font-mono text-slate-400 italic"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Current Security Key</label>
            <input
              type="text"
              readOnly
              value={key}
              className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none font-bold text-slate-400"
            />
          </div>

          <button
            onClick={handleTest}
            disabled={isTesting}
            className={`w-full py-3 rounded-xl font-black text-[10px] uppercase tracking-widest border-2 transition-all ${
              testResult?.success ? 'border-emerald-500 text-emerald-600 bg-emerald-50' : 
              testResult ? 'border-rose-500 text-rose-600 bg-rose-50' :
              'border-slate-200 text-slate-400 bg-white hover:border-indigo-400 hover:text-indigo-600'
            }`}
          >
            {isTesting ? 'Verifying...' : testResult ? testResult.message : 'Verify Connection'}
          </button>

          <p className="text-[10px] text-slate-400 text-center font-medium leading-relaxed px-4">
            Cloud settings are hardcoded. If you experience sync issues, please verify your connection above.
          </p>
        </div>

        <div className="pt-6 border-t border-slate-100">
          <button 
            onClick={() => setShowScript(!showScript)}
            className="w-full flex justify-between items-center p-3 rounded-xl bg-slate-50 text-slate-700 text-[11px] font-bold hover:bg-slate-100"
          >
            Show Bridge Instructions
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={showScript ? 'rotate-180 transition-transform' : ''}><path d="m6 9 6 6 6-6"/></svg>
          </button>
          
          {showScript && (
            <div className="mt-3 p-4 bg-slate-900 rounded-xl text-white space-y-4 animate-fadeIn">
              <ol className="text-[10px] space-y-2 list-decimal ml-4 opacity-80 font-medium">
                <li>Open your <a href="https://docs.google.com/spreadsheets/d/1Temch-33pBSaeWuU64BxtAqPTDILX-j4m6CIZX3VgFs/edit" target="_blank" className="text-indigo-400 underline">RestoHub Sheet</a>.</li>
                <li>Go to <b>Extensions {'>'} Apps Script</b>.</li>
                <li>Copy the code below and paste it in.</li>
                <li>Click <b>Deploy {'>'} New Deployment</b>.</li>
                <li>Select <b>Web App</b>. Ensure it is set to 'Execute as: Me' and 'Access: Anyone'.</li>
              </ol>
              <button 
                onClick={copyScript}
                className="w-full py-2 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest"
              >
                Copy Bridge Code
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CloudSettings;
