import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

type Tool = {
  id: string;
  name: string;
  category: string;
  available?: boolean;
  condition?: string;
  damaged?: boolean;
  repaired?: boolean;
  status?: 'normal' | 'broken' | 'damaged' | 'lost' | 'disposed';
  imageUrl?: string;
};

type Incident = {
  id: string;
  toolId: string;
  type: 'broken' | 'damaged' | 'lost' | 'disposed' | 'restored';
  timestamp: string;
  description?: string;
};

export default function IncidentStatus() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingIncident, setEditingIncident] = useState<Incident | null>(null);
  const [selectedTool, setSelectedTool] = useState<string>("");
  const [incidentType, setIncidentType] = useState<'broken' | 'damaged' | 'lost' | 'disposed' | 'restored'>('broken');
  const [description, setDescription] = useState("");

  useEffect(() => {
    (async () => {
      const [t, i] = await Promise.all([
        fetch("/api/tools").then(r => r.json()),
        fetch("/api/incidents").then(r => r.json()),
      ]);
      setTools(t);
      setIncidents(i);
    })();
  }, []);

  const incidentTools = tools.filter(tool => 
    (tool.damaged || tool.status === 'broken' || tool.status === 'damaged' || 
     tool.status === 'lost' || tool.status === 'disposed') && 
    tool.status !== 'normal'
  );

  const handleAddIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    const newIncident = { toolId: selectedTool, type: incidentType, description, timestamp: new Date().toISOString() };

    try {
      const response = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newIncident)
      });
      
      if (response.ok) {
        const [t, i] = await Promise.all([
          fetch("/api/tools").then(r => r.json()),
          fetch("/api/incidents").then(r => r.json()),
        ]);
        setTools(t);
        setIncidents(i);
        setShowAddForm(false);
        setSelectedTool("");
        setDescription("");
        alert("망실 현황이 등록되었습니다.");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleEditIncident = (incident: Incident) => {
    setEditingIncident(incident);
    setSelectedTool(incident.toolId);
    setIncidentType(incident.type);
    setDescription(incident.description || "");
    setShowEditForm(true);
    setShowAddForm(false);
  };

  const handleUpdateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIncident) return;
    
    const updatedIncident = {
      type: incidentType,
      description,
      timestamp: new Date().toISOString()
    };

    try {
      const response = await fetch(`/api/incidents/${editingIncident.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedIncident)
      });
      
      if (response.ok) {
        const [t, i] = await Promise.all([
          fetch("/api/tools").then(r => r.json()),
          fetch("/api/incidents").then(r => r.json()),
        ]);
        setTools(t);
        setIncidents(i);
        setShowEditForm(false);
        setEditingIncident(null);
        setSelectedTool("");
        setDescription("");
        alert("망실 현황이 수정되었습니다.");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleCancelEdit = () => {
    setShowEditForm(false);
    setEditingIncident(null);
    setSelectedTool("");
    setDescription("");
  };

  const handleRestoreTool = async (toolId: string, toolIncidents: Incident[]) => {
    if (!confirm("이 공구를 복구하시겠습니까?")) return;

    try {
      const restoreRecord = {
        toolId,
        type: "restored",
        description: `복구 완료`,
        timestamp: new Date().toISOString()
      };

      await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(restoreRecord)
      });

      const tool = tools.find(t => t.id === toolId);
      if (tool) {
        await fetch(`/api/tools/${toolId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...tool, damaged: false, status: "normal", available: true })
        });
      }

      const [t, i] = await Promise.all([
        fetch("/api/tools").then(r => r.json()),
        fetch("/api/incidents").then(r => r.json()),
      ]);
      setTools(t);
      setIncidents(i);
      alert("공구가 성공적으로 복구되었습니다.");
    } catch (error) {
      console.error(error);
    }
  };

  const getIncidentIcon = (type: string) => {
    const icons = { broken: '🔧', damaged: '💥', lost: '❓', disposed: '🗑️', restored: '✅' };
    return icons[type as keyof typeof icons] || '🚨';
  };

  const getIncidentLabel = (type: string) => {
    const labels = { broken: '고장', damaged: '파손', lost: '분실', disposed: '폐기', restored: '복원' };
    return labels[type as keyof typeof labels] || '기타';
  };

  return (
    <div className="min-h-screen app-bg text-white">
      <header className="sticky top-0 z-30 backdrop-blur bg-black/30 border-b border-white/10">
        <div className="max-w-screen-md mx-auto flex items-center gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-extrabold text-xl tracking-tight">
            <span className="text-[var(--r-500)]">🏠</span>
          </Link>
          <h1 className="font-bold text-lg">망실 현황</h1>
          <nav className="ml-auto flex gap-2">
            <Link to="/capture" className="nav-tab">📷 촬영</Link>
            <Link to="/tools" className="nav-tab">📋 목록</Link>
            <Link to="/settings" className="nav-tab">⚙️ 설정</Link>
          </nav>
        </div>
      </header>

      <div className="max-w-screen-md mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">파손분실고장 현황</h2>
          <button onClick={() => setShowAddForm(true)} className="btn-red">+ 망실 등록</button>
        </div>

        {showAddForm && (
          <div className="app-card p-4 mb-6">
            <h3 className="font-bold mb-4">망실 현황 등록</h3>
            <form onSubmit={handleAddIncident} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">공구 선택</label>
                <select value={selectedTool} onChange={(e) => setSelectedTool(e.target.value)} 
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white" required>
                  <option value="">공구를 선택하세요</option>
                  {tools.map(tool => (
                    <option key={tool.id} value={tool.id}>{tool.name} ({tool.category})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">사고 유형</label>
                <select value={incidentType} onChange={(e) => setIncidentType(e.target.value as any)}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white">
                  <option value="broken">고장</option>
                  <option value="damaged">파손</option>
                  <option value="lost">분실</option>
                  <option value="disposed">폐기</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">상세 내용</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white" rows={3} />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-red">등록</button>
                <button type="button" onClick={() => setShowAddForm(false)} className="btn-ghost">취소</button>
              </div>
            </form>
          </div>
        )}

        {showEditForm && editingIncident && (
          <div className="app-card p-4 mb-6">
            <h3 className="font-bold mb-4">망실 현황 수정</h3>
            <form onSubmit={handleUpdateIncident} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">공구 정보</label>
                <div className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-300">
                  {tools.find(t => t.id === editingIncident.toolId)?.name || `공구 ID: ${editingIncident.toolId}`}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">사고 유형</label>
                <select value={incidentType} onChange={(e) => setIncidentType(e.target.value as any)}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white">
                  <option value="broken">고장</option>
                  <option value="damaged">파손</option>
                  <option value="lost">분실</option>
                  <option value="disposed">폐기</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">상세 내용</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white" rows={3} />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-red">수정</button>
                <button type="button" onClick={handleCancelEdit} className="btn-ghost">취소</button>
              </div>
            </form>
          </div>
        )}

        <div className="space-y-4">
          {incidentTools.length === 0 ? (
            <div className="app-card p-6 text-center text-white/60">
              <div className="text-4xl mb-2">✨</div>
              <p>현재 망실된 공구가 없습니다.</p>
            </div>
          ) : (
            incidentTools.map(tool => {
              const toolIncidents = incidents.filter(inc => inc.toolId === tool.id);
              return (
                <div key={tool.id} className="app-card p-4 relative">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-16 h-16 bg-gray-700 rounded overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {tool.imageUrl ? (
                          <img src={`/tools/${tool.imageUrl.replace(/^.*[\\/]/, '')}`} alt={tool.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-red-700 to-red-800 rounded flex items-center justify-center">
                            <span className="text-red-200 text-2xl">
                              {tool.category === '전동공구' ? '🔌' : 
                               tool.category === '수공구' ? '🔧' : 
                               tool.category === '측정공구' ? '📏' : 
                               tool.category === '안전장비' ? '🛡️' : '⚒️'}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg">{tool.name}</h3>
                        <p className="text-white/70 mb-2">{tool.category}</p>
                        <div className="space-y-1">
                          {toolIncidents.length > 0 ? (
                            toolIncidents.map(incident => (
                              <div key={incident.id} className="text-sm bg-black/10 p-2 rounded">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-white/80">사고기록:</span>
                                  <span className="text-lg">{getIncidentIcon(incident.type)}</span>
                                  <span className={`px-2 py-1 rounded ${
                                    incident.type === 'restored' 
                                      ? 'bg-green-500/20 border border-green-500/30 text-green-300'
                                      : 'bg-red-500/20 border border-red-500/30 text-red-300'
                                  }`}>
                                    {getIncidentLabel(incident.type)}
                                  </span>
                                  <span className="text-white/60 text-xs">
                                    {new Date(incident.timestamp).toLocaleDateString()}
                                  </span>
                                  {incident.description && (
                                    <span className="text-white/70 text-xs">- {incident.description}</span>
                                  )}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-sm bg-black/5 p-2 rounded">
                              <span className="text-white/60">사고기록 없음</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="ml-4">
                      {toolIncidents.length > 0 ? (
                        <button onClick={() => handleEditIncident(toolIncidents[0])}
                                className="px-3 py-1 text-xs bg-blue-500/20 border border-blue-500/30 text-blue-300 rounded hover:bg-blue-500/30 transition-colors">
                          수정
                        </button>
                      ) : (
                        <button onClick={() => { setSelectedTool(tool.id); setShowAddForm(true); setShowEditForm(false); }}
                                className="px-3 py-1 text-xs bg-green-500/20 border border-green-500/30 text-green-300 rounded hover:bg-green-500/30 transition-colors">
                          추가
                        </button>
                      )}
                    </div>
                  </div>
                  {toolIncidents.length > 0 && (
                    <div className="absolute bottom-4 right-4">
                      <button onClick={() => handleRestoreTool(tool.id, toolIncidents)}
                              className="px-3 py-1 text-xs bg-green-500/20 border border-green-500/30 text-green-300 rounded hover:bg-green-500/30 transition-colors">
                        복구
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}