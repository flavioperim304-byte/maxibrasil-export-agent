import React, { useState, useEffect } from 'react';
import {
Search,
Globe,
Mail,
CheckCircle2,
XCircle,
AlertCircle,
TrendingUp,
Building2,
ChevronRight,
Loader2,
ExternalLink,
Copy,
Check,
Filter,
MessageCircle,
Flame,
Thermometer,
Snowflake,
Clock,
Calendar,
UserCheck,
UserX,
ShoppingBag,
Trash2,
ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";

// Types
interface SearchSession {
id: string;
timestamp: string;
country: string;
region: string;
isAlibaba: boolean;
}

interface Lead {
id: string;
company: string;
country: string;
website: string;
email: string | null;
isVerified: boolean;
whatsapp: string | null;
isWhatsappVerified: boolean;
score: number;
status: 'QUENTE' | 'MORNO' | 'FRIO' | 'DESQUALIFICADO' | 'PENDENTE';
reason: string;
emailGenerated: boolean;
generatedEmailContent?: string;
whatsappGenerated: boolean;
generatedWhatsappContent?: string;
generatedWhatsappFollowupContent?: string;
generatedWhatsappInterestContent?: string;
generatedWhatsappCallContent?: string;
internalLog?: string;
contactedAt?: string;
responseStatus?: 'RESPONDED' | 'NO_RESPONSE';
respondedAt?: string;
tradeActivity?: string;
sessionId: string;
}

type StatusFilter = 'TODOS' | 'QUENTE' | 'MORNO' | 'FRIO' | 'PENDENTE' | 'DESQUALIFICADO';

const AGENT_SYSTEM_INSTRUCTION = `
Você é o Agente de Exportação Maxibrasil, especializado em prospecção B2B internacional de produtos capilares profissionais da Maxibrasil.
Fabricante brasileiro com linha completa (exceto coloração). Diferencial: ingredientes premium e customização.

MISSÃO: Encontrar, qualificar e abordar distribuidores e importadores na América Latina e Europa.

REGRA ABSOLUTA — E-MAILS E WHATSAPP:
NUNCA infira e-mails ou números de telefone. Inclua SOMENTE se encontrado explicitamente no site, LinkedIn (perfil do gerente de compras/comprador) ou diretório verificado.
Se não encontrar: email = null, is_verified = false, whatsapp = null, is_whatsapp_verified = false.

PERFIL IDEAL DE CLIENTE (ICP):
APROVAR leads que tenham TODOS os critérios:
✅ Distribuidora ou importadora (nunca salão, fabricante ou marketplace)
✅ Site próprio ativo e profissional
✅ Portfólio com múltiplas marcas capilares
✅ Estrutura comercial visível
✅ Atuação confirmada na América Latina ou Europa
✅ Identificação do Gerente de Compras ou Comprador (Desejável)

REPROVAR imediatamente se:
❌ Salão, barbearia ou profissional autônomo
❌ Fabricante ou indústria
❌ Marketplace (Amazon, etc.)
❌ Sem site próprio
❌ Sem e-mail localizável

SCORING (1 a 10):
+3 pontos: E-mail verificado na fonte oficial
+2 pontos: WhatsApp do Gerente de Compras/Comprador verificado
+1 ponto: Representa marcas internacionais no portfólio
+1 ponto: Tem estrutura logística própria
+2 pontos: Atuação confirmada no mercado prioritário
+1 ponto: LinkedIn ativo

PRIORIDADE DE CONTATO E STATUS:
1º WhatsApp verificado → gerar mensagem WhatsApp (usar templates abaixo)
2º E-mail verificado → gerar e-mail
3º Ambos → gerar os dois
4º Nenhum → status = PENDENTE

Score 7-10 → status = QUENTE
Score 4-6 → status = MORNO
Score 1-3 → status = FRIO
Se (email == null E whatsapp == null) → status = PENDENTE (independente do score)

CASO ESPECIAL: Se tiver WhatsApp verificado e NÃO tiver e-mail:
- Gerar MENSAGEM 1 personalizada
- Status = QUENTE
- internalLog = "WhatsApp gerado — aguarda envio manual"

TEMPLATE WHATSAPP — Distribuidores LATAM (Espanhol):
Hola [Nombre], buenos días.
Le escribo desde Maxibrasil, fabricante brasileño especializado en líneas capilares profesionales premium — shampoos, acondicionadores, máscaras, tratamientos y finalizadores con ingredientes exclusivos y personalização de fórmulas.

Encontré [Nombre Empresa] y me impresionó su trayectoria distribuyendo marcas líderes en [País].

¿Tendría 10 minutos esta semana para explorar una posible alianza comercial?

📎 Catálogo completo: https://drive.google.com/file/d/1QkeJRiXhRNQ3TNW2PKzybb8eYfiZ5lyV/view?usp=drivesdk

Saludos,
[Seu Nome] | Maxibrasil

Retorne os dados em formato JSON estruturado conforme o esquema fornecido.
`;

const STATUS_CONFIG = {
QUENTE: { label: 'QUENTE', color: 'bg-orange-100 text-orange-700', icon: Flame, bar: 'bg-orange-500' },
MORNO: { label: 'MORNO', color: 'bg-blue-100 text-blue-700', icon: Thermometer, bar: 'bg-blue-500' },
FRIO: { label: 'FRIO', color: 'bg-cyan-100 text-cyan-700', icon: Snowflake, bar: 'bg-cyan-500' },
PENDENTE: { label: 'PENDENTE', color: 'bg-yellow-100 text-yellow-700', icon: Clock, bar: 'bg-yellow-500' },
DESQUALIFICADO:{ label: 'DESQUALIF.', color: 'bg-zinc-100 text-zinc-500', icon: AlertCircle, bar: 'bg-zinc-400' },
};

interface LeadCardProps {
  key?: string | number;
  lead: Lead;
  selectedLead: Lead | null;
  setSelectedLead: (lead: Lead | null) => void;
  STATUS_CONFIG: any;
  copyToClipboard: (text: string, id: string) => void;
  copiedId: string | null;
  handleUpdateLeadContact: (id: string, updates: Partial<Lead>) => void;
}

const LeadCard = ({ 
  lead, 
  selectedLead, 
  setSelectedLead, 
  STATUS_CONFIG, 
  copyToClipboard, 
  copiedId, 
  handleUpdateLeadContact 
}: LeadCardProps) => {
return (
<motion.div
layout
initial={{ opacity: 0, x: -20 }}
animate={{ opacity: 1, x: 0 }}
exit={{ opacity: 0, scale: 0.95 }}
onClick={() => setSelectedLead(selectedLead?.id === lead.id ? null : lead)}
className={`group bg-white border rounded-2xl p-5 cursor-pointer transition-all hover:shadow-md ${selectedLead?.id === lead.id ? 'border-emerald-500 ring-4 ring-emerald-500/5' : 'border-zinc-200'}`}
>
<div className="flex flex-col sm:flex-row items-start justify-between gap-4">
<div className="flex-1 w-full">
<div className="flex flex-wrap items-center gap-2 mb-2">
<h3 className="font-bold text-zinc-900 group-hover:text-emerald-600 transition-colors text-base sm:text-lg">{lead.company}</h3>
<div className="flex items-center gap-2">
{lead.tradeActivity && <ShoppingBag size={14} className="text-orange-500" title="Lead do Alibaba" />}
<span className={`text-[10px] font-bold px-2 py-1 rounded-full ${STATUS_CONFIG[lead.status]?.color || 'bg-zinc-100 text-zinc-600'}`}>
{lead.status}
</span>
</div>
</div>
<div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-500">
<span className="flex items-center gap-1.5 bg-zinc-50 px-2 py-1 rounded-md border border-zinc-100"><Globe size={14} /> {lead.country}</span>
<span className="flex items-center gap-1.5 bg-zinc-50 px-2 py-1 rounded-md border border-zinc-100"><Mail size={14} /> {lead.email || 'N/A'}</span>
<span className="flex items-center gap-1.5 bg-zinc-50 px-2 py-1 rounded-md border border-zinc-100"><MessageCircle size={14} /> {lead.whatsapp || 'N/A'}</span>
{lead.contactedAt && (
<span className="flex items-center gap-1.5 text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
<Calendar size={14} /> {new Date(lead.contactedAt).toLocaleDateString('pt-BR')}
</span>
)}
</div>
</div>
<div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-3 pt-3 sm:pt-0 border-t sm:border-0 border-zinc-100">
<div className="flex items-center gap-2">
<span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">SCORE</span>
<span className={`text-xl font-mono font-black ${lead.score >= 7 ? 'text-emerald-600' : 'text-zinc-400'}`}>
{lead.score}/10
</span>
</div>
<ChevronRight className={`text-zinc-300 group-hover:text-emerald-500 transition-all ${selectedLead?.id === lead.id ? 'rotate-90' : ''}`} size={24} />
</div>
</div>

{selectedLead?.id === lead.id && (
<motion.div
initial={{ height: 0, opacity: 0 }}
animate={{ height: 'auto', opacity: 1 }}
className="mt-6 pt-6 border-t border-zinc-100 overflow-hidden"
>
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
<div className="space-y-4">
<div>
<h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Análise do ICP</h4>
<div className="bg-zinc-50 rounded-xl p-4 border border-zinc-100">
<p className="text-sm text-zinc-700 leading-relaxed italic">"{lead.reason}"</p>
{lead.tradeActivity && (
<div className="mt-3 pt-3 border-t border-zinc-200">
<h5 className="text-[9px] font-bold text-orange-600 uppercase tracking-widest mb-1 flex items-center gap-1">
<ShoppingBag size={10} /> Atividade Comercial (Alibaba)
</h5>
<p className="text-xs text-zinc-600 leading-relaxed">{lead.tradeActivity}</p>
</div>
)}
{lead.internalLog && (
<div className="mt-2 pt-2 border-t border-zinc-200 flex items-center gap-2 text-[10px] font-bold text-emerald-600 uppercase tracking-tight">
<CheckCircle2 size={12} /> {lead.internalLog}
</div>
)}
</div>
</div>
<div className="flex flex-col gap-4">
<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
<a href={lead.website} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 px-4 py-3 bg-zinc-100 text-zinc-700 text-sm font-bold rounded-xl hover:bg-zinc-200 transition-all" onClick={e => e.stopPropagation()}>
<ExternalLink size={18} /> VISITAR SITE
</a>
{lead.whatsapp && (
<a href={`https://wa.me/${lead.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all" onClick={e => e.stopPropagation()}>
<MessageCircle size={18} /> ENVIAR WHATSAPP
</a>
)}
</div>

<div className="pt-4 border-t border-zinc-100 space-y-3">
<h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Controle de Contato</h4>
<div className="grid grid-cols-1 sm:flex sm:flex-wrap gap-3">
{!lead.contactedAt ? (
<button
onClick={(e) => {
e.stopPropagation();
handleUpdateLeadContact(lead.id, { contactedAt: new Date().toISOString() });
}}
className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-all"
>
<Calendar size={18} /> MARCAR COMO CONTATADO
</button>
) : (
<>
<button
onClick={(e) => {
e.stopPropagation();
handleUpdateLeadContact(lead.id, { responseStatus: 'RESPONDED', respondedAt: new Date().toISOString() });
}}
className={`flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold rounded-xl transition-all border ${lead.responseStatus === 'RESPONDED' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'}`}
>
<UserCheck size={18} /> RESPONDEU
</button>
<button
onClick={(e) => {
e.stopPropagation();
handleUpdateLeadContact(lead.id, { responseStatus: 'NO_RESPONSE' });
}}
className={`flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold rounded-xl transition-all border ${lead.responseStatus === 'NO_RESPONSE' ? 'bg-red-500 text-white border-red-500' : 'bg-white text-red-500 border-red-200 hover:bg-red-50'}`}
>
<UserX size={18} /> NÃO RESPONDEU
</button>
<button
onClick={(e) => {
e.stopPropagation();
handleUpdateLeadContact(lead.id, { contactedAt: undefined, responseStatus: undefined, respondedAt: undefined });
}}
className="flex items-center justify-center gap-2 px-4 py-3 bg-zinc-100 text-zinc-500 text-sm font-bold rounded-xl hover:bg-zinc-200 transition-all"
>
REINICIAR
</button>
</>
)}
</div>
</div>
</div>
</div>

<div className="space-y-6">
{/* WhatsApp Section */}
{lead.whatsapp && (
<div className="space-y-3">
<div className="flex items-center justify-between">
<h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Mensagem WhatsApp</h4>
<button
onClick={(e) => {
e.stopPropagation();
const content = lead.generatedWhatsappContent || `Hola, buenos días.
Le escribo desde Maxibrasil, fabricante brasileño especializado en líneas capilares profissionais premium.

Encontré ${lead.company} y me impresionó su trajetória en ${lead.country}.

¿Tendría 10 minutos esta semana para explorar una posible alianza comercial?

📎 Catálogo completo: https://drive.google.com/file/d/1QkeJRiXhRNQ3TNW2PKzybb8eYfiZ5lyV/view?usp=drivesdk

Saludos,
Maxibrasil Export`;
copyToClipboard(content, lead.id + '-wa');
}}
className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-4 py-3 rounded-xl transition-all"
>
{copiedId === lead.id + '-wa' ? <Check size={16} /> : <Copy size={16} />}
{copiedId === lead.id + '-wa' ? 'COPIADO' : 'COPIAR MENSAGEM'}
</button>
</div>
<div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 text-[13px] text-zinc-800 font-serif leading-relaxed whitespace-pre-wrap shadow-inner">
{lead.generatedWhatsappContent || `Hola, buenos días.
Le escribo desde Maxibrasil, fabricante brasileño especializado en líneas capilares profissionais premium.

Encontré ${lead.company} e me impresionó su trajetória en ${lead.country}.

¿Tendría 10 minutos esta semana para explorar una posible alianza comercial?

📎 Catálogo completo: https://drive.google.com/file/d/1QkeJRiXhRNQ3TNW2PKzybb8eYfiZ5lyV/view?usp=drivesdk

Saludos,
Maxibrasil Export`}
</div>
</div>
)}

{/* Email Section */}
{lead.emailGenerated && lead.generatedEmailContent && (
<div className="space-y-3">
<div className="flex items-center justify-between">
<h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">E-mail Personalizado</h4>
<button
onClick={(e) => {
e.stopPropagation();
copyToClipboard(lead.generatedEmailContent!, lead.id + '-email');
}}
className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-4 py-2.5 rounded-xl transition-all"
>
{copiedId === lead.id + '-email' ? <Check size={16} /> : <Copy size={16} />}
{copiedId === lead.id + '-email' ? 'COPIADO' : 'COPIAR E-MAIL'}
</button>
</div>
<div className="bg-zinc-50 border border-zinc-100 rounded-xl p-4 text-[13px] text-zinc-800 font-serif leading-relaxed whitespace-pre-wrap">
{lead.generatedEmailContent}
</div>
</div>
)}
</div>
</div>
</motion.div>
)}
</motion.div>
);
};

export default function App() {
const [searchQuery, setSearchQuery] = useState('');
const [keywords, setKeywords] = useState('');
const [ncmCode, setNcmCode] = useState('');
const [productDescription, setProductDescription] = useState('');
const [region, setRegion] = useState('Europa');
const [leads, setLeads] = useState<Lead[]>([]);
const [sessions, setSessions] = useState<SearchSession[]>([]);
const [collapsedSessions, setCollapsedSessions] = useState<Record<string, boolean>>({});
const [isSearching, setIsSearching] = useState(false);
const [isLoadingInitial, setIsLoadingInitial] = useState(true);
const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
const [copiedId, setCopiedId] = useState<string | null>(null);
const [isSaving, setIsSaving] = useState(false);
const [activeFilter, setActiveFilter] = useState<StatusFilter>('TODOS');
const [isAlibabaMode, setIsAlibabaMode] = useState(false);

// Load leads on startup
useEffect(() => {
const loadData = async () => {
setIsLoadingInitial(true);
try {
const [leadsRes, sessionsRes] = await Promise.all([
fetch('/api/leads'),
fetch('/api/sessions')
]);

if (leadsRes.ok) {
const data = await leadsRes.json();
if (Array.isArray(data)) setLeads(data);
}

if (sessionsRes.ok) {
const data = await sessionsRes.json();
if (Array.isArray(data)) setSessions(data);
}
} catch (error) {
console.error("Error loading data:", error);
} finally {
setIsLoadingInitial(false);
}
};
loadData();
}, []);

// Save leads to server
const saveLeadsToServer = async (leadsToSave: Lead[]) => {
if (isLoadingInitial) return;
setIsSaving(true);
try {
const res = await fetch('/api/leads', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify(leadsToSave),
});
if (!res.ok) throw new Error('Falha ao salvar leads');
} catch (error) {
console.error("Error saving leads:", error);
alert("Erro ao salvar leads no servidor.");
} finally {
setIsSaving(false);
}
};

const saveSessionsToServer = async (sessionsToSave: SearchSession[]) => {
if (isLoadingInitial) return;
try {
const res = await fetch('/api/sessions', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify(sessionsToSave),
});
if (!res.ok) throw new Error('Falha ao salvar sessões');
} catch (error) {
console.error("Error saving sessions:", error);
alert("Erro ao salvar sessões no servidor.");
}
};

const handleSearch = async () => {
if (!searchQuery) return;
setIsSearching(true);
try {
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const sessionId = Math.random().toString(36).substr(2, 9);
const newSession: SearchSession = {
id: sessionId,
timestamp: new Date().toISOString(),
country: searchQuery,
region: region,
isAlibaba: isAlibabaMode
};

const alibabaPrompt = isAlibabaMode 
? `PESQUISA ESPECÍFICA NO ALIBABA.COM:
Encontre 3 compradores verificados (Verified Buyers) e importadores listados no Alibaba.com que buscam produtos capilares profissionais em ${searchQuery} (${region}).
Extraia especificamente: Nome da empresa, País, E-mail de contato (se disponível no perfil/trade activity) e descreva a atividade comercial (Trade Activity) no campo 'tradeActivity'.`
: `Encontre 3 potenciais distribuidores de produtos capilares profissionais em ${searchQuery} (${region}).`;

const response = await ai.models.generateContent({
model: "gemini-3-flash-preview",
contents: `${alibabaPrompt}
Contexto Adicional:
- Keywords: ${keywords || 'Não especificado'}
- Código NCM: ${ncmCode || 'Não especificado'}
- Descrição do Produto: ${productDescription || 'Não especificado'}
Siga rigorosamente as regras do Agente de Exportação Maxibrasil para qualificação e scoring.
Retorne uma lista de objetos JSON.`,
config: {
systemInstruction: AGENT_SYSTEM_INSTRUCTION,
tools: [{ googleSearch: {} }],
responseMimeType: "application/json",
responseSchema: {
type: Type.ARRAY,
items: {
type: Type.OBJECT,
properties: {
company: { type: Type.STRING },
country: { type: Type.STRING },
website: { type: Type.STRING },
email: { type: Type.STRING, nullable: true },
isVerified: { type: Type.BOOLEAN },
whatsapp: { type: Type.STRING, nullable: true },
isWhatsappVerified: { type: Type.BOOLEAN },
score: { type: Type.NUMBER },
status: { type: Type.STRING },
reason: { type: Type.STRING },
tradeActivity: { type: Type.STRING, nullable: true },
emailGenerated: { type: Type.BOOLEAN },
generatedEmailContent: { type: Type.STRING },
whatsappGenerated: { type: Type.BOOLEAN },
generatedWhatsappContent: { type: Type.STRING },
generatedWhatsappFollowupContent: { type: Type.STRING },
generatedWhatsappInterestContent: { type: Type.STRING },
generatedWhatsappCallContent: { type: Type.STRING },
internalLog: { type: Type.STRING }
},
required: ["company", "country", "website", "score", "status", "reason"]
}
}
}
});

let rawText = response.text || '[]';
if (rawText.includes('```json')) {
  rawText = rawText.split('```json')[1].split('```')[0];
} else if (rawText.includes('```')) {
  rawText = rawText.split('```')[1].split('```')[0];
}

const parsedLeads = JSON.parse(rawText.trim());
const newLeads = (Array.isArray(parsedLeads) ? parsedLeads : []).map((l: any) => ({
...l,
id: Math.random().toString(36).substr(2, 9),
sessionId: sessionId
}));

setLeads(prev => {
  const updated = [...newLeads, ...prev];
  saveLeadsToServer(updated);
  return updated;
});

setSessions(prev => {
  const updated = [newSession, ...prev];
  saveSessionsToServer(updated);
  return updated;
});

} catch (error) {
console.error("Search error:", error);
alert("Erro na busca. Verifique o console ou tente novamente.");
} finally {
setIsSearching(false);
}
};

const copyToClipboard = (text: string, id: string) => {
navigator.clipboard.writeText(text);
setCopiedId(id);
setTimeout(() => setCopiedId(null), 2000);
};

// Stats per status
const statusCounts = (Object.keys(STATUS_CONFIG) as Array<keyof typeof STATUS_CONFIG>).map(status => ({
status,
count: leads.filter(l => l.status === status).length,
config: STATUS_CONFIG[status],
}));

// Filtered leads
const filteredLeads = activeFilter === 'TODOS' ? leads : leads.filter(l => l.status === activeFilter);

// Grouped leads by session
const groupedLeads = sessions
.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
.map(session => ({
session,
leads: filteredLeads.filter(l => l.id && l.sessionId === session.id)
}))
.filter(group => group.leads.length > 0);

const legacyLeads = filteredLeads.filter(l => !l.sessionId || !sessions.find(s => s.id === l.sessionId));

const handleClearAll = async () => {
if (window.confirm('Tem certeza que deseja apagar todos os leads e sessões? Esta ação não pode ser desfeita.')) {
setLeads([]);
setSessions([]);
setCollapsedSessions({});
saveLeadsToServer([]);
saveSessionsToServer([]);
}
};

const handleDeleteSession = async (sessionId: string) => {
if (window.confirm('Tem certeza que deseja apagar esta sessão e todos os seus leads?')) {
setLeads(prev => {
  const updated = prev.filter(l => l.sessionId !== sessionId);
  saveLeadsToServer(updated);
  return updated;
});
setSessions(prev => {
  const updated = prev.filter(s => s.id !== sessionId);
  saveSessionsToServer(updated);
  return updated;
});
}
};

const toggleSessionCollapse = (sessionId: string) => {
setCollapsedSessions(prev => ({
...prev,
[sessionId]: !prev[sessionId]
}));
};

const handleRefresh = async () => {
setIsLoadingInitial(true);
try {
const [leadsRes, sessionsRes] = await Promise.all([
fetch('/api/leads'),
fetch('/api/sessions')
]);

if (leadsRes.ok) {
const data = await leadsRes.json();
if (Array.isArray(data)) setLeads(data);
}

if (sessionsRes.ok) {
const data = await sessionsRes.json();
if (Array.isArray(data)) setSessions(data);
}
} catch (error) {
console.error("Error refreshing data:", error);
} finally {
setIsLoadingInitial(false);
}
};

const handleUpdateLeadContact = async (leadId: string, updates: Partial<Lead>) => {
setLeads(prev => {
  const updated = prev.map(l => l.id === leadId ? { ...l, ...updates } : l);
  saveLeadsToServer(updated);
  return updated;
});
if (selectedLead?.id === leadId) {
setSelectedLead(prev => prev ? { ...prev, ...updates } : null);
}
};

return (
<div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans selection:bg-emerald-100 selection:text-emerald-900">
{/* Header */}
<header className="bg-white border-b border-zinc-200 sticky top-0 z-50">
<div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
<div className="flex items-center gap-3">
<div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200 shrink-0">
<TrendingUp size={24} />
</div>
<div>
<h1 className="font-bold text-base sm:text-lg tracking-tight">Maxibrasil Export Agent</h1>
<p className="text-[9px] sm:text-[10px] uppercase tracking-widest text-zinc-400 font-semibold">Inteligência Comercial Internacional</p>
</div>
</div>
<div className="flex items-center gap-4">
<div className="flex items-center gap-2 px-3 py-2 bg-zinc-100 rounded-full text-xs font-bold text-zinc-600 border border-zinc-200 w-full sm:w-auto justify-center">
<Globe size={14} />
<span>{region}</span>
</div>
</div>
</div>
</header>

<main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
{/* Search Panel */}
<div className="lg:col-span-4 space-y-6">
<div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-sm">
<h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-4">Prospecção</h2>
<div className="space-y-4">
<div>
<label className="block text-xs font-semibold text-zinc-500 mb-1.5 uppercase tracking-wide">Região Prioritária</label>
<div className="grid grid-cols-2 gap-2">
{['Europa', 'América Latina', 'América Central', 'América do Norte', 'Ásia', 'África', 'Oriente Médio'].map(r => (
<button
key={r}
onClick={() => setRegion(r)}
className={`px-4 py-3 rounded-xl text-sm font-bold transition-all border ${region === r ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300'}`}
>
{r}
</button>
))}
</div>
</div>
<div>
<label className="block text-xs font-semibold text-zinc-500 mb-1.5 uppercase tracking-wide">País ou Cidade</label>
<div className="relative">
<input
type="text"
placeholder="Ex: Espanha, México, Berlim..."
value={searchQuery}
onChange={(e) => setSearchQuery(e.target.value)}
onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
/>
<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
</div>
</div>
<div>
<label className="block text-xs font-semibold text-zinc-500 mb-1.5 uppercase tracking-wide">Keywords</label>
<input
type="text"
placeholder="Ex: vegan, organic, professional"
value={keywords}
onChange={(e) => setKeywords(e.target.value)}
className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
/>
</div>
<div>
<label className="block text-xs font-semibold text-zinc-500 mb-1.5 uppercase tracking-wide">Código NCM</label>
<input
type="text"
placeholder="Ex: 3305.10.00"
value={ncmCode}
onChange={(e) => setNcmCode(e.target.value)}
className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
/>
</div>
<div>
<label className="block text-xs font-semibold text-zinc-500 mb-1.5 uppercase tracking-wide">Descrição do Produto</label>
<textarea
placeholder="Descreva o produto para melhor correspondência..."
value={productDescription}
onChange={(e) => setProductDescription(e.target.value)}
rows={3}
className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
/>
</div>

<div className="pt-2">
<button
onClick={() => setIsAlibabaMode(!isAlibabaMode)}
className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${isAlibabaMode ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300'}`}
>
<div className="flex items-center gap-2">
<ShoppingBag size={18} className={isAlibabaMode ? 'text-orange-500' : 'text-zinc-400'} />
<span className="text-sm font-bold">Modo Alibaba</span>
</div>
<div className={`w-10 h-5 rounded-full relative transition-all ${isAlibabaMode ? 'bg-orange-500' : 'bg-zinc-200'}`}>
<div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isAlibabaMode ? 'left-6' : 'left-1'}`} />
</div>
</button>
<p className="text-[10px] text-zinc-400 mt-2 px-1 leading-tight">
{isAlibabaMode 
? 'Busca focada em compradores verificados e importadores ativos no Alibaba.com.' 
: 'Busca geral por distribuidores e importadores na web.'}
</p>
</div>

<button
onClick={handleSearch}
disabled={isSearching || !searchQuery || isLoadingInitial}
className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 disabled:opacity-50 disabled:shadow-none text-base"
>
{isSearching ? <Loader2 className="animate-spin" /> : <Search size={20} />}
{isSearching ? 'Buscando Leads...' : 'Iniciar Busca'}
</button>
</div>
</div>

{/* Stats Panel */}
<div className="bg-zinc-900 rounded-2xl p-6 text-white shadow-xl">
<h3 className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-4">Painel de Status</h3>
<div className="space-y-3 mb-4">
{statusCounts.map(({ status, count, config }) => {
const Icon = config.icon;
const pct = leads.length > 0 ? (count / leads.length) * 100 : 0;
return (
<div key={status}>
<div className="flex items-center justify-between mb-1">
<div className="flex items-center gap-1.5 text-xs text-zinc-400">
<Icon size={12} />
<span>{config.label}</span>
</div>
<span className="text-xs font-mono font-bold text-white">{count}</span>
</div>
<div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
<motion.div
className={`h-full ${config.bar}`}
initial={{ width: 0 }}
animate={{ width: `${pct}%` }}
transition={{ duration: 0.6, ease: 'easeOut' }}
/>
</div>
</div>
);
})}
</div>
<div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
<span className="text-xs text-zinc-400">Total de Leads</span>
<span className="text-lg font-mono font-bold">{leads.length}</span>
</div>
</div>
</div>

{/* Results Panel */}
<div className="lg:col-span-8">
<div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
<h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
Leads Identificados
<span className="text-xs bg-zinc-100 text-zinc-500 px-2.5 py-1 rounded-full font-bold">{filteredLeads.length}</span>
</h2>
<div className="flex items-center gap-2">
<button
onClick={handleRefresh}
disabled={isLoadingInitial || isSaving}
className="p-3 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all border border-zinc-100 sm:border-0"
title="Recarregar do Servidor"
>
<Loader2 className={isLoadingInitial ? "animate-spin" : ""} size={20} />
</button>
<button
onClick={handleClearAll}
disabled={leads.length === 0 || isSaving}
className="p-3 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all border border-zinc-100 sm:border-0"
title="Limpar Tudo"
>
<XCircle size={20} />
</button>
<button
onClick={() => saveLeadsToServer(leads)}
disabled={isSaving || isLoadingInitial}
className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-50 transition-all disabled:opacity-50"
>
{isSaving ? <Loader2 className="animate-spin" size={14} /> : <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />}
{isSaving ? 'Salvando...' : 'Salvar Resultados'}
</button>
</div>
</div>

{/* Filter Bar */}
<div className="flex items-center gap-2 mb-8 flex-wrap">
<Filter size={16} className="text-zinc-400 shrink-0" />
{(['TODOS', 'QUENTE', 'MORNO', 'FRIO', 'PENDENTE', 'DESQUALIFICADO'] as StatusFilter[]).map(f => (
<button
key={f}
onClick={() => setActiveFilter(f)}
className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${
activeFilter === f
? 'bg-emerald-600 text-white border-emerald-600'
: 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300'
}`}
>
{f === 'TODOS' ? `TODOS (${leads.length})` : `${f} (${leads.filter(l => l.status === f).length})`}
</button>
))}
</div>

<div className="space-y-8">
<AnimatePresence mode="popLayout">
{groupedLeads.length === 0 && legacyLeads.length === 0 && !isSearching && (
<motion.div
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
className="bg-white border-2 border-dashed border-zinc-200 rounded-3xl p-12 flex flex-col items-center justify-center text-center"
>
<div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center text-zinc-300 mb-4">
<Building2 size={32} />
</div>
<h3 className="font-bold text-zinc-900">Nenhum lead encontrado</h3>
<p className="text-sm text-zinc-500 max-w-xs mt-1">
{activeFilter === 'TODOS'
? 'Use o painel lateral para buscar distribuidores e importadores na região desejada.'
: `Nenhum lead com status "${activeFilter}" encontrado.`}
</p>
</motion.div>
)}

{groupedLeads.map(({ session, leads: sessionLeads }) => (
<div key={session.id} className="space-y-4">
{/* Session Header */}
<div className="flex items-center justify-between bg-white border border-zinc-200 p-4 rounded-2xl shadow-sm">
<div className="flex items-center gap-4">
<button 
onClick={() => toggleSessionCollapse(session.id)}
className="p-1 hover:bg-zinc-100 rounded-lg transition-all"
>
<ChevronDown 
size={20} 
className={`text-zinc-400 transition-transform ${collapsedSessions[session.id] ? '-rotate-90' : ''}`} 
/>
</button>
<div>
<div className="flex items-center gap-2">
<h3 className="text-sm font-bold text-zinc-900">
{session.country} ({session.region})
</h3>
{session.isAlibaba && (
<span className="text-[9px] font-bold bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded flex items-center gap-1">
<ShoppingBag size={10} /> ALIBABA
</span>
)}
</div>
<p className="text-[10px] text-zinc-400 font-medium">
{new Date(session.timestamp).toLocaleString('pt-BR')} • {sessionLeads.length} leads identificados
</p>
</div>
</div>
<button
onClick={() => handleDeleteSession(session.id)}
className="p-2 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
title="Apagar Sessão"
>
<Trash2 size={18} />
</button>
</div>

{!collapsedSessions[session.id] && (
<div className="space-y-4 pl-4 border-l-2 border-zinc-100 ml-6">
{sessionLeads.map((lead) => (
<LeadCard 
key={lead.id} 
lead={lead} 
selectedLead={selectedLead} 
setSelectedLead={setSelectedLead}
STATUS_CONFIG={STATUS_CONFIG}
copyToClipboard={copyToClipboard}
copiedId={copiedId}
handleUpdateLeadContact={handleUpdateLeadContact}
/>
))}
</div>
)}
</div>
))}

{legacyLeads.length > 0 && (
<div className="space-y-4">
<div className="flex items-center gap-2 px-4 py-2 bg-zinc-50 rounded-xl border border-zinc-200">
<h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Leads Anteriores</h3>
<span className="text-[10px] bg-zinc-200 text-zinc-600 px-1.5 py-0.5 rounded-full font-bold">{legacyLeads.length}</span>
</div>
<div className="space-y-4">
{legacyLeads.map((lead) => (
<LeadCard 
key={lead.id} 
lead={lead} 
selectedLead={selectedLead} 
setSelectedLead={setSelectedLead}
STATUS_CONFIG={STATUS_CONFIG}
copyToClipboard={copyToClipboard}
copiedId={copiedId}
handleUpdateLeadContact={handleUpdateLeadContact}
/>
))}
</div>
</div>
)}
</AnimatePresence>
</div>
</div>
</main>
</div>
);
}
