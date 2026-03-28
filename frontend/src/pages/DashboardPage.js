import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { listProjects, createProject, deleteProject } from '../services/authApi';
import { Plus, Trash2, Github, Clock, Layers, LogOut, Settings } from 'lucide-react';

const LOGO_URL =
  'https://static.prod-images.emergentagent.com/jobs/a95524e6-8d57-4a33-859d-6152ef3b48ac/images/2070b10d51be382b528c9736b63433b9f2d0fde90572e8b86fdc5a1b96d57c17.png';

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function ModeTag({ mode }) {
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full border ${
        mode === 'extend'
          ? 'bg-[#1a2a1a] border-[#2a4a2a] text-[#4ade80]'
          : 'bg-[#1a1a2a] border-[#2a2a4a] text-[#818cf8]'
      }`}
    >
      {mode === 'extend' ? 'Extend' : 'Create'}
    </span>
  );
}

function NewProjectModal({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [mode, setMode] = useState('create');
  const [githubRepo, setGithubRepo] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await onCreate({ name: name.trim(), mode, github_repo: githubRepo.trim() || undefined });
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#111115] border border-[#22222A] rounded-xl w-full max-w-md p-6">
        <h2 className="text-[#EDEDED] text-lg font-semibold mb-4">Novo Projeto</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-[#888] text-xs mb-1 block">Nome do projeto *</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Meu App MVP"
              className="w-full bg-[#1a1a22] border border-[#22222A] rounded-lg px-3 py-2 text-[#EDEDED] text-sm placeholder-[#555] focus:outline-none focus:border-[#19AFFF]"
            />
          </div>

          <div>
            <label className="text-[#888] text-xs mb-1 block">Modo</label>
            <div className="flex gap-2">
              {['create', 'extend'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                    mode === m
                      ? 'bg-[#19AFFF]/10 border-[#19AFFF] text-[#19AFFF]'
                      : 'bg-[#1a1a22] border-[#22222A] text-[#888]'
                  }`}
                >
                  {m === 'create' ? 'Criar do Zero' : 'Estender Repo'}
                </button>
              ))}
            </div>
          </div>

          {mode === 'extend' && (
            <div>
              <label className="text-[#888] text-xs mb-1 block">URL do repo GitHub</label>
              <input
                value={githubRepo}
                onChange={(e) => setGithubRepo(e.target.value)}
                placeholder="https://github.com/user/repo"
                className="w-full bg-[#1a1a22] border border-[#22222A] rounded-lg px-3 py-2 text-[#EDEDED] text-sm placeholder-[#555] focus:outline-none focus:border-[#19AFFF]"
              />
            </div>
          )}

          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-[#22222A] text-[#888] text-sm hover:bg-[#1a1a22] transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 py-2 rounded-lg bg-[#19AFFF] text-white text-sm font-medium hover:bg-[#0f9ae8] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Criando...' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const load = useCallback(async () => {
    try {
      const list = await listProjects(token);
      setProjects(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(body) {
    const project = await createProject(token, body);
    setProjects((prev) => [project, ...prev]);
    // Navigate to lean canvas or studio
    if (body.mode === 'create') {
      navigate('/', { state: { projectId: project.id } });
    } else {
      navigate('/studio', { state: { projectId: project.id } });
    }
  }

  async function handleDelete(id, e) {
    e.stopPropagation();
    if (!window.confirm('Remover este projeto?')) return;
    setDeletingId(id);
    try {
      await deleteProject(token, id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  function openProject(project) {
    if (project.preview_html || project.preview_css || project.preview_js) {
      navigate('/studio', { state: { projectId: project.id } });
    } else {
      navigate('/', { state: { projectId: project.id } });
    }
  }

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const displayName = user?.name || user?.login || user?.email || 'Usuário';
  const avatarUrl = user?.avatar_url || user?.picture;

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Top nav */}
      <header className="h-14 fixed top-0 left-0 right-0 border-b border-[#22222A] bg-[#0A0A0A] flex items-center justify-between px-6 z-50">
        <div className="flex items-center gap-3">
          <img src={LOGO_URL} alt="Cartola Lab" className="h-7" />
          <span className="text-[#EDEDED] font-semibold text-sm">Studio</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/settings')}
            className="p-2 text-[#888] hover:text-[#EDEDED] rounded-lg hover:bg-[#1a1a22] transition-all"
            title="Configurações"
          >
            <Settings size={16} />
          </button>
          {avatarUrl && (
            <img src={avatarUrl} alt={displayName} className="w-7 h-7 rounded-full border border-[#22222A]" />
          )}
          <span className="text-[#888] text-sm hidden sm:block">{displayName}</span>
          <button
            onClick={logout}
            className="p-2 text-[#888] hover:text-[#EDEDED] rounded-lg hover:bg-[#1a1a22] transition-all"
            title="Sair"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="pt-14 px-6 py-8 max-w-6xl mx-auto">
        {/* Header row */}
        <div className="flex items-center justify-between mb-6 mt-2">
          <div>
            <h1 className="text-[#EDEDED] text-xl font-bold">Meus Projetos</h1>
            <p className="text-[#555] text-sm mt-0.5">{projects.length} projeto{projects.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#19AFFF] text-white text-sm font-medium rounded-lg hover:bg-[#0f9ae8] transition-all"
          >
            <Plus size={16} />
            Novo Projeto
          </button>
        </div>

        {/* Search */}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar projetos..."
          className="w-full bg-[#111115] border border-[#22222A] rounded-lg px-4 py-2.5 text-[#EDEDED] text-sm placeholder-[#555] focus:outline-none focus:border-[#333] mb-6"
        />

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-[#111115] border border-[#22222A] rounded-xl h-40 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Layers size={40} className="text-[#333] mb-4" />
            <p className="text-[#555] text-sm">
              {search ? 'Nenhum projeto encontrado.' : 'Nenhum projeto ainda. Crie o seu primeiro!'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((project) => (
              <div
                key={project.id}
                onClick={() => openProject(project)}
                className="group relative bg-[#111115] border border-[#22222A] rounded-xl p-5 cursor-pointer hover:border-[#333] hover:bg-[#141418] transition-all"
              >
                {/* Preview thumbnail placeholder */}
                <div className="w-full h-24 rounded-lg bg-[#1a1a22] mb-3 overflow-hidden flex items-center justify-center">
                  {project.preview_html ? (
                    <iframe
                      srcDoc={`<style>body{margin:0;overflow:hidden;transform:scale(0.3);transform-origin:top left;width:333%;height:333%}${project.preview_css || ''}</style>${project.preview_html}<script>${project.preview_js || ''}</script>`}
                      className="w-full h-full"
                      sandbox="allow-scripts"
                      title={project.name}
                    />
                  ) : (
                    <span className="text-[#333] text-xs">Sem preview</span>
                  )}
                </div>

                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-[#EDEDED] text-sm font-medium truncate">{project.name}</h3>
                    {project.description && (
                      <p className="text-[#666] text-xs mt-0.5 truncate">{project.description}</p>
                    )}
                  </div>
                  <button
                    onClick={(e) => handleDelete(project.id, e)}
                    disabled={deletingId === project.id}
                    className="opacity-0 group-hover:opacity-100 p-1 text-[#555] hover:text-red-400 rounded transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="flex items-center gap-2 mt-3">
                  <ModeTag mode={project.mode} />
                  {project.github_repo && (
                    <span className="flex items-center gap-1 text-[#555] text-xs">
                      <Github size={10} />
                      <span className="truncate max-w-[80px]">
                        {project.github_repo.replace('https://github.com/', '')}
                      </span>
                    </span>
                  )}
                  <span className="ml-auto flex items-center gap-1 text-[#444] text-xs">
                    <Clock size={10} />
                    {formatDate(project.updated_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showNew && (
        <NewProjectModal onClose={() => setShowNew(false)} onCreate={handleCreate} />
      )}
    </div>
  );
}
