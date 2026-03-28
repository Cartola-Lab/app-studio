import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Check, Eye, EyeOff, Github, Chrome, User, Zap, LogOut } from 'lucide-react';

// Keys aligned with chatApi.js constants
const PROVIDERS = [
  { id: 'claude', label: 'Claude (Anthropic)', placeholder: 'sk-ant-...', storageKey: 'cartolab_claude_key', url: 'https://console.anthropic.com/settings/keys' },
  { id: 'openai', label: 'GPT-4 (OpenAI)', placeholder: 'sk-...', storageKey: 'cartolab_openai_key', url: 'https://platform.openai.com/api-keys' },
  { id: 'gemini', label: 'Gemini (Google)', placeholder: 'AIza...', storageKey: 'cartolab_gemini_key', url: 'https://aistudio.google.com/app/apikey' },
];

const PROVIDER_STORAGE = 'cartolab_ai_provider';

function loadStoredKeys() {
  const keys = {};
  for (const p of PROVIDERS) {
    keys[p.id] = localStorage.getItem(p.storageKey) || '';
  }
  return keys;
}

function saveStoredKeys(keys) {
  for (const p of PROVIDERS) {
    if (keys[p.id]) {
      localStorage.setItem(p.storageKey, keys[p.id]);
    } else {
      localStorage.removeItem(p.storageKey);
    }
  }
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, githubToken, logout } = useAuth();

  const [selectedProvider, setSelectedProvider] = useState(
    () => localStorage.getItem(PROVIDER_STORAGE) || 'claude'
  );
  const [apiKeys, setApiKeys] = useState(loadStoredKeys);
  const [showKey, setShowKey] = useState({});
  const [testStatus, setTestStatus] = useState({});
  const [saved, setSaved] = useState(false);

  function handleProviderSelect(id) {
    setSelectedProvider(id);
    localStorage.setItem(PROVIDER_STORAGE, id);
  }

  function handleKeyChange(providerId, value) {
    const updated = { ...apiKeys, [providerId]: value };
    setApiKeys(updated);
    saveStoredKeys(updated);
  }

  function toggleShowKey(providerId) {
    setShowKey((prev) => ({ ...prev, [providerId]: !prev[providerId] }));
  }

  async function handleTestConnection(providerId) {
    const key = apiKeys[providerId];
    if (!key) return;
    setTestStatus((prev) => ({ ...prev, [providerId]: 'testing' }));
    try {
      let ok = false;
      if (providerId === 'claude') {
        const res = await fetch('https://api.anthropic.com/v1/models', {
          headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
        });
        ok = res.ok;
      } else if (providerId === 'openai') {
        const res = await fetch('https://api.openai.com/v1/models', {
          headers: { Authorization: `Bearer ${key}` },
        });
        ok = res.ok;
      } else if (providerId === 'gemini') {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`
        );
        ok = res.ok;
      }
      setTestStatus((prev) => ({ ...prev, [providerId]: ok ? 'ok' : 'error' }));
    } catch {
      setTestStatus((prev) => ({ ...prev, [providerId]: 'error' }));
    }
    setTimeout(() => {
      setTestStatus((prev) => ({ ...prev, [providerId]: null }));
    }, 4000);
  }

  function handleSave() {
    saveStoredKeys(apiKeys);
    localStorage.setItem(PROVIDER_STORAGE, selectedProvider);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const GITHUB_CLIENT_ID = process.env.REACT_APP_GITHUB_CLIENT_ID;
  const githubConnected = !!githubToken;

  function connectGitHub() {
    const params = new URLSearchParams({
      client_id: GITHUB_CLIENT_ID,
      redirect_uri: `${window.location.origin}/auth/github/callback`,
      scope: 'repo user',
    });
    window.location.href = `https://github.com/login/oauth/authorize?${params}`;
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#EDEDED]">
      {/* Top bar */}
      <header className="h-14 border-b border-[#22222A] flex items-center px-4 gap-3">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-[#888] hover:text-[#EDEDED] transition-colors text-sm"
        >
          <ArrowLeft size={16} />
          Dashboard
        </button>
        <span className="text-[#333]">/</span>
        <span className="text-[#EDEDED] text-sm font-medium">Configurações</span>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10 flex flex-col gap-8">
        {/* Profile */}
        <section>
          <h2 className="text-xs text-[#666] uppercase tracking-widest mb-4 flex items-center gap-2">
            <User size={12} />
            Perfil
          </h2>
          <div className="bg-[#111115] border border-[#22222A] rounded-xl p-5 flex items-center gap-4">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.name || user.email}
                className="w-12 h-12 rounded-full border border-[#22222A]"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-[#1a1a22] border border-[#22222A] flex items-center justify-center text-[#888] text-lg">
                {(user?.name || user?.email || 'U')[0].toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[#EDEDED] font-medium truncate">
                {user?.name || user?.login || 'Usuário'}
              </p>
              <p className="text-[#666] text-sm truncate">{user?.email || ''}</p>
              <p className="text-[#444] text-xs mt-0.5">
                {user?.github_id ? 'GitHub' : user?.google_id ? 'Google' : ''} · ID {user?.id?.slice(0, 12)}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-[#888] hover:text-red-400 transition-colors text-sm whitespace-nowrap"
            >
              <LogOut size={14} />
              Sair
            </button>
          </div>
        </section>

        {/* AI Provider */}
        <section>
          <h2 className="text-xs text-[#666] uppercase tracking-widest mb-4 flex items-center gap-2">
            <Zap size={12} />
            Provedor de IA
          </h2>
          <div className="flex flex-col gap-3">
            {PROVIDERS.map((p) => {
              const isSelected = selectedProvider === p.id;
              const key = apiKeys[p.id] || '';
              const status = testStatus[p.id];

              return (
                <div
                  key={p.id}
                  className={`bg-[#111115] border rounded-xl p-4 transition-all ${
                    isSelected ? 'border-[#19AFFF]/50' : 'border-[#22222A]'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <button
                      onClick={() => handleProviderSelect(p.id)}
                      className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-all ${
                        isSelected
                          ? 'border-[#19AFFF] bg-[#19AFFF]'
                          : 'border-[#444] bg-transparent'
                      }`}
                    />
                    <span className="text-[#EDEDED] text-sm font-medium">{p.label}</span>
                    {isSelected && (
                      <span className="text-xs px-2 py-0.5 bg-[#19AFFF]/10 text-[#19AFFF] rounded-full border border-[#19AFFF]/20">
                        Ativo
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showKey[p.id] ? 'text' : 'password'}
                        value={key}
                        onChange={(e) => handleKeyChange(p.id, e.target.value)}
                        placeholder={p.placeholder}
                        className="w-full bg-[#0A0A0A] border border-[#22222A] rounded-lg px-3 py-2 text-[#EDEDED] text-sm placeholder-[#444] focus:outline-none focus:border-[#19AFFF]/50 pr-9 font-mono"
                      />
                      {key && (
                        <button
                          type="button"
                          onClick={() => toggleShowKey(p.id)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-[#555] hover:text-[#888] transition-colors"
                        >
                          {showKey[p.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => handleTestConnection(p.id)}
                      disabled={!key || status === 'testing'}
                      className={`px-3 py-2 rounded-lg text-sm border transition-all whitespace-nowrap ${
                        status === 'ok'
                          ? 'border-green-500/40 bg-green-500/10 text-green-400'
                          : status === 'error'
                          ? 'border-red-500/40 bg-red-500/10 text-red-400'
                          : 'border-[#22222A] text-[#888] hover:text-[#EDEDED] hover:border-[#444] disabled:opacity-40 disabled:cursor-not-allowed'
                      }`}
                    >
                      {status === 'testing'
                        ? 'Testando...'
                        : status === 'ok'
                        ? '✓ OK'
                        : status === 'error'
                        ? '✗ Erro'
                        : 'Testar'}
                    </button>
                  </div>
                  {!key && (
                    <p className="text-[#444] text-xs mt-2">
                      API keys ficam apenas no navegador — nunca no servidor.{' '}
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#19AFFF]/60 hover:text-[#19AFFF] transition-colors"
                      >
                        Obter chave ↗
                      </a>
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Integrations */}
        <section>
          <h2 className="text-xs text-[#666] uppercase tracking-widest mb-4 flex items-center gap-2">
            <Github size={12} />
            Integrações
          </h2>
          <div className="bg-[#111115] border border-[#22222A] rounded-xl overflow-hidden">
            <div className="p-4 flex items-center gap-3 border-b border-[#22222A]">
              <Github size={18} className="text-[#888]" />
              <div className="flex-1">
                <p className="text-[#EDEDED] text-sm font-medium">GitHub</p>
                <p className="text-[#555] text-xs">
                  {githubConnected
                    ? 'Conectado — import/export de repositórios habilitado'
                    : 'Conecte para importar e exportar repositórios'}
                </p>
              </div>
              {githubConnected ? (
                <span className="flex items-center gap-1 text-green-400 text-xs">
                  <Check size={12} />
                  Conectado
                </span>
              ) : (
                <button
                  onClick={connectGitHub}
                  className="px-3 py-1.5 rounded-lg bg-[#1a1a22] border border-[#22222A] text-[#EDEDED] text-xs hover:border-[#444] transition-all"
                >
                  Conectar
                </button>
              )}
            </div>

            <div className="p-4 flex items-center gap-3">
              <Chrome size={18} className="text-[#888]" />
              <div className="flex-1">
                <p className="text-[#EDEDED] text-sm font-medium">Google Drive</p>
                <p className="text-[#555] text-xs">Export de projetos para o Drive</p>
              </div>
              <span className="text-[#444] text-xs">Em breve</span>
            </div>
          </div>
        </section>

        {/* Save */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
              saved
                ? 'bg-green-500/10 border border-green-500/40 text-green-400'
                : 'bg-[#19AFFF] hover:bg-[#0f9ae8] text-white'
            }`}
          >
            {saved ? '✓ Salvo' : 'Salvar configurações'}
          </button>
        </div>
      </main>
    </div>
  );
}
