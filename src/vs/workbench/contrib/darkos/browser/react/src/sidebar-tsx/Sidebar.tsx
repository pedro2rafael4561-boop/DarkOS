import React, { useState } from 'react';
import { useIsDark, useDarkOSCheckpointService } from '../util/services.js';
import { 
	MessageSquare, 
	Terminal, 
	History, 
	Activity, 
	Monitor, 
	Compass, 
	RotateCcw, 
	LifeBuoy,
	Check
} from 'lucide-react';
import '../styles.css';
import { SidebarChat } from './SidebarChat.js';
import { SmartTerminal } from '../smart-terminal-tsx/SmartTerminal.js';
import { CheckpointsTimeline } from '../checkpoints-tsx/CheckpointsTimeline.js';
import { AutoTester } from '../tester-tsx/AutoTester.js';
import { LivePreview } from '../preview-tsx/LivePreview.js';
import { ProjectHub } from '../project-hub-tsx/ProjectHub.js';
import ErrorBoundary from './ErrorBoundary.js';

export type SidebarTab = 'chat' | 'terminal' | 'checkpoints' | 'tester' | 'preview' | 'hub';

export const Sidebar = ({ className }: { className?: string }) => {
	const isDark = useIsDark();
	const [activeTab, setActiveTab] = useState<SidebarTab>('chat');
	const checkpointService = useDarkOSCheckpointService();
	const [sosFeedback, setSosFeedback] = useState<string | null>(null);

	const handleGlobalSos = async () => {
		if (!checkpointService) return;
		try {
			// Find most recent base checkpoint or initial landmark
			const baseCheckpoint = checkpointService.state.checkpoints.find((c) => c.isBase);
			if (baseCheckpoint) {
				await checkpointService.restoreCheckpoint(baseCheckpoint.id);
				setSosFeedback(`Projeto restaurado para: "${baseCheckpoint.title}"!`);
			} else if (checkpointService.state.checkpoints.length > 0) {
				const oldest = checkpointService.state.checkpoints[checkpointService.state.checkpoints.length - 1];
				await checkpointService.restoreCheckpoint(oldest.id);
				setSosFeedback(`Projeto restaurado para o marco inicial: "${oldest.title}".`);
			}
			setTimeout(() => setSosFeedback(null), 3500);
		} catch (err) {
			console.error('Falha ao restaurar via SOS:', err);
		}
	};

	return (
		<div
			className={`@@void-scope ${isDark ? 'dark' : ''} ${className || ''}`}
			style={{ width: '100%', height: '100%' }}
		>
			<div className="w-full h-full bg-[#0d0718] text-zinc-100 flex flex-col">
				{/* Top Switcher Bar with SOS Emergency Button */}
				<div className="flex items-center justify-between border-b border-purple-900/40 bg-[#0a0514] px-1.5 py-1 text-xs shrink-0 gap-1 overflow-x-auto">
					<div className="flex items-center gap-1">
						<button
							onClick={() => setActiveTab('chat')}
							className={`flex items-center gap-1 px-2 py-1 rounded-lg font-medium transition-all cursor-pointer ${
								activeTab === 'chat'
									? 'bg-purple-900/50 text-white border border-purple-500/40 shadow-[0_0_10px_rgba(157,78,221,0.25)]'
									: 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
							}`}
							title="Chat com a IA e Agente DarkOS"
						>
							<MessageSquare className="w-3.5 h-3.5 text-purple-400" />
							<span>Chat</span>
						</button>

						<button
							onClick={() => setActiveTab('terminal')}
							className={`flex items-center gap-1 px-2 py-1 rounded-lg font-medium transition-all cursor-pointer ${
								activeTab === 'terminal'
									? 'bg-purple-900/50 text-white border border-purple-500/40 shadow-[0_0_10px_rgba(157,78,221,0.25)]'
									: 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
							}`}
							title="Terminal Inteligente em linguagem natural"
						>
							<Terminal className="w-3.5 h-3.5 text-purple-400" />
							<span>Terminal</span>
						</button>

						<button
							onClick={() => setActiveTab('checkpoints')}
							className={`flex items-center gap-1 px-2 py-1 rounded-lg font-medium transition-all cursor-pointer ${
								activeTab === 'checkpoints'
									? 'bg-purple-900/50 text-white border border-purple-500/40 shadow-[0_0_10px_rgba(157,78,221,0.25)]'
									: 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
							}`}
							title="Histórico e Linha do Tempo"
						>
							<History className="w-3.5 h-3.5 text-purple-400" />
							<span>Histórico</span>
						</button>

						<button
							onClick={() => setActiveTab('tester')}
							className={`flex items-center gap-1 px-2 py-1 rounded-lg font-medium transition-all cursor-pointer ${
								activeTab === 'tester'
									? 'bg-purple-900/50 text-white border border-purple-500/40 shadow-[0_0_10px_rgba(157,78,221,0.25)]'
									: 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
							}`}
							title="Testador Automático com IA"
						>
							<Activity className="w-3.5 h-3.5 text-purple-400" />
							<span>Testes</span>
						</button>

						<button
							onClick={() => setActiveTab('preview')}
							className={`flex items-center gap-1 px-2 py-1 rounded-lg font-medium transition-all cursor-pointer ${
								activeTab === 'preview'
									? 'bg-purple-900/50 text-white border border-purple-500/40 shadow-[0_0_10px_rgba(157,78,221,0.25)]'
									: 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
							}`}
							title="Preview em Tempo Real Multi-Telas"
						>
							<Monitor className="w-3.5 h-3.5 text-purple-400" />
							<span>Preview</span>
						</button>

						<button
							onClick={() => setActiveTab('hub')}
							className={`flex items-center gap-1 px-2 py-1 rounded-lg font-medium transition-all cursor-pointer ${
								activeTab === 'hub'
									? 'bg-purple-900/50 text-white border border-purple-500/40 shadow-[0_0_10px_rgba(157,78,221,0.25)]'
									: 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
							}`}
							title="Diário, Mapa e Memória do Projeto"
						>
							<Compass className="w-3.5 h-3.5 text-purple-400" />
							<span>Projeto</span>
						</button>
					</div>

					{/* Botão SOS Global */}
					<button
						onClick={handleGlobalSos}
						className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold text-[10px] shadow-[0_0_10px_rgba(239,68,68,0.4)] cursor-pointer transition-all shrink-0 ml-1"
						title="Botão SOS: Reverte instantaneamente para o último marco testado e funcionando"
					>
						<LifeBuoy className="w-3 h-3 text-white" />
						<span>SOS</span>
					</button>
				</div>

				{/* Floating SOS Notice */}
				{sosFeedback && (
					<div className="bg-emerald-950/80 border-b border-emerald-500/40 text-emerald-300 text-[11px] px-3 py-1.5 flex items-center gap-1.5 animate-fadeIn">
						<Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
						<span>{sosFeedback}</span>
					</div>
				)}

				{/* Content Pane */}
				<div className="flex-1 overflow-hidden">
					<ErrorBoundary>
						{activeTab === 'chat' && <SidebarChat />}
						{activeTab === 'terminal' && <SmartTerminal />}
						{activeTab === 'checkpoints' && <CheckpointsTimeline />}
						{activeTab === 'tester' && <AutoTester />}
						{activeTab === 'preview' && <LivePreview />}
						{activeTab === 'hub' && <ProjectHub />}
					</ErrorBoundary>
				</div>
			</div>
		</div>
	);
};
