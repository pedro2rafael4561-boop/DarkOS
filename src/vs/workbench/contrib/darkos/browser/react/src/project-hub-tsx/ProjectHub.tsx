import React, { useState, useEffect } from 'react';
import { 
	BookOpen, 
	Network, 
	Brain, 
	Download, 
	Search, 
	Plus, 
	Save, 
	FileText, 
	AlertTriangle, 
	ExternalLink, 
	ZoomIn, 
	ZoomOut, 
	CheckCircle, 
	Calendar, 
	Clock, 
	Code, 
	Layers, 
	Sparkles,
	Tag,
	Cpu
} from 'lucide-react';
import { useDarkOSCheckpointService } from '../util/services.js';

export interface IDiaryEntry {
	id: string;
	date: string;
	time: string;
	title: string;
	summary: string;
	author: 'IA Local DarkOS' | 'Desenvolvedor';
	checkpointId?: string;
	filesImpacted: string[];
	tags: string[];
}

export interface IMapNode {
	id: string;
	name: string;
	type: 'component' | 'service' | 'config' | 'style';
	path: string;
	dependsOn: string[];
	riskLevel: 'baixo' | 'médio' | 'alto';
	description: string;
}

export interface IProjectMemory {
	projectName: string;
	styleGuide: string;
	namingConventions: string;
	colorPalette: string[];
	architectureDecisions: string[];
	aiInstructions: string;
}

export const ProjectHub = () => {
	const checkpointService = useDarkOSCheckpointService();
	const [activeSubTab, setActiveSubTab] = useState<'diary' | 'map' | 'memory'>('diary');

	// --- 1. Diário do Projeto State ---
	const [diaryEntries, setDiaryEntries] = useState<IDiaryEntry[]>([
		{
			id: 'd-1',
			date: '16 de Outubro de 2026',
			time: '07:45',
			title: 'Módulo de Auto-Testes e Botão SOS Integrados',
			summary: 'Implementado o motor de testes automatizados com simulação de interações e o mecanismo de reversão instantânea de emergência SOS.',
			author: 'IA Local DarkOS',
			checkpointId: 'ckpt-init-baseline',
			filesImpacted: ['AutoTester.tsx', 'LivePreview.tsx', 'Sidebar.tsx'],
			tags: ['Testes', 'Segurança', 'SOS'],
		},
		{
			id: 'd-2',
			date: '16 de Outubro de 2026',
			time: '00:54',
			title: 'Sistema de Checkpoints e Linha do Tempo Modular',
			summary: 'Criação do serviço de checkpoints com gravação de diffs por arquivo, restauração seletiva e salvamento automático local.',
			author: 'IA Local DarkOS',
			checkpointId: 'ckpt-17290000',
			filesImpacted: ['darkosCheckpointService.ts', 'CheckpointsTimeline.tsx'],
			tags: ['Checkpoints', 'Histórico', 'Diffs'],
		},
		{
			id: 'd-3',
			date: '15 de Outubro de 2026',
			time: '23:55',
			title: 'Terminal Inteligente em Linguagem Natural pt-BR',
			summary: 'Tradução de comandos em linguagem humana para comandos de shell reais com análise heurística de risco de comandos destrutivos.',
			author: 'IA Local DarkOS',
			checkpointId: 'ckpt-term-init',
			filesImpacted: ['SmartTerminal.tsx', 'terminalToolService.ts'],
			tags: ['Terminal', 'Linguagem Natural', 'Segurança'],
		},
	]);

	const [exportSuccess, setExportSuccess] = useState(false);

	const handleExportDiary = () => {
		const diaryText = diaryEntries.map((e) => `
# ${e.title}
Data: ${e.date} às ${e.time} | Autor: ${e.author}
Tags: ${e.tags.join(', ')}
Arquivos Modificados: ${e.filesImpacted.join(', ')}

${e.summary}
---
`).join('\n');

		const blob = new Blob([`# DIÁRIO OFICIAL DO PROJETO DARKOS\n${diaryText}`], { type: 'text/markdown;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `diario-do-projeto-${new Date().toISOString().split('T')[0]}.md`;
		link.click();
		URL.revokeObjectURL(url);

		setExportSuccess(true);
		setTimeout(() => setExportSuccess(false), 4000);
	};

	// --- 2. Mapa do Projeto State ---
	const [mapNodes, setMapNodes] = useState<IMapNode[]>([
		{
			id: 'sidebar',
			name: 'Sidebar.tsx',
			type: 'component',
			path: 'browser/react/src/sidebar-tsx/Sidebar.tsx',
			dependsOn: ['terminal', 'checkpoints', 'tester', 'hub'],
			riskLevel: 'alto',
			description: 'Barra lateral principal e ponto de entrada da interface do usuário.',
		},
		{
			id: 'checkpoints',
			name: 'CheckpointsTimeline.tsx',
			type: 'component',
			path: 'browser/react/src/checkpoints-tsx/CheckpointsTimeline.tsx',
			dependsOn: ['ckpt_service'],
			riskLevel: 'médio',
			description: 'Interface da linha do tempo e reversão modular de arquivos.',
		},
		{
			id: 'ckpt_service',
			name: 'darkosCheckpointService.ts',
			type: 'service',
			path: 'browser/darkosCheckpointService.ts',
			dependsOn: [],
			riskLevel: 'alto',
			description: 'Serviço central de histórico de snapshots e restauração de arquivos no disco.',
		},
		{
			id: 'tester',
			name: 'AutoTester.tsx',
			type: 'component',
			path: 'browser/react/src/tester-tsx/AutoTester.tsx',
			dependsOn: ['ckpt_service'],
			riskLevel: 'baixo',
			description: 'Módulo autônomo de testes de cliques, responsividade e botão SOS.',
		},
		{
			id: 'terminal',
			name: 'SmartTerminal.tsx',
			type: 'component',
			path: 'browser/react/src/smart-terminal-tsx/SmartTerminal.tsx',
			dependsOn: ['terminal_service'],
			riskLevel: 'médio',
			description: 'Terminal em linguagem natural com detecção de riscos.',
		},
		{
			id: 'terminal_service',
			name: 'terminalToolService.ts',
			type: 'service',
			path: 'browser/terminalToolService.ts',
			dependsOn: [],
			riskLevel: 'alto',
			description: 'Execução segura de comandos e comunicação com o shell.',
		},
	]);

	const [selectedNode, setSelectedNode] = useState<IMapNode | null>(mapNodes[0]);
	const [searchMap, setSearchMap] = useState('');
	const [mapZoom, setMapZoom] = useState(100);

	// --- 3. Memória do Projeto State ---
	const [memory, setMemory] = useState<IProjectMemory>({
		projectName: 'DarkOS',
		styleGuide: 'Tema escuro cristalino com gradientes roxos (violet-900 a purple-600), fonte Inter, cantos arredondados (rounded-xl) e sombras suaves em vidro fosco.',
		namingConventions: 'Componentes em PascalCase, interfaces prefixadas com "I", serviços como singletons registrados no InstantiationService.',
		colorPalette: ['#0d0718', '#7b2cbf', '#9d4edd', '#c77dff', '#e0aaff', '#10b981'],
		architectureDecisions: [
			'Execução de IA 100% local com Ollama prioritário para privacidade.',
			'Checkpoints granulares gravados no disco local para independência de nuvem.',
			'Suporte a múltiplos viewports (Celular, Tablet, Desktop, TV) e espaço para emulador Android.',
		],
		aiInstructions: 'Sempre responda em Português do Brasil com tom amigável e técnico. Nunca execute comandos perigosos sem pedir confirmação prévia.',
	});

	const [savedMemoryNotice, setSavedMemoryNotice] = useState(false);

	const handleSaveMemory = () => {
		// Saves local memory object to simulated local storage / file
		setSavedMemoryNotice(true);
		setTimeout(() => setSavedMemoryNotice(false), 3000);
	};

	return (
		<div className="h-full flex flex-col bg-[#0d0718] text-zinc-100 overflow-hidden select-none text-xs">
			{/* Top Hub Nav */}
			<div className="flex items-center justify-around border-b border-purple-900/40 bg-[#0a0514] px-2 py-1.5 shrink-0">
				<button
					onClick={() => setActiveSubTab('diary')}
					className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
						activeSubTab === 'diary'
							? 'bg-purple-900/50 text-white border border-purple-500/40 shadow-[0_0_10px_rgba(157,78,221,0.25)]'
							: 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
					}`}
				>
					<BookOpen className="w-3.5 h-3.5 text-purple-400" />
					<span>Diário</span>
				</button>

				<button
					onClick={() => setActiveSubTab('map')}
					className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
						activeSubTab === 'map'
							? 'bg-purple-900/50 text-white border border-purple-500/40 shadow-[0_0_10px_rgba(157,78,221,0.25)]'
							: 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
					}`}
				>
					<Network className="w-3.5 h-3.5 text-purple-400" />
					<span>Mapa</span>
				</button>

				<button
					onClick={() => setActiveSubTab('memory')}
					className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
						activeSubTab === 'memory'
							? 'bg-purple-900/50 text-white border border-purple-500/40 shadow-[0_0_10px_rgba(157,78,221,0.25)]'
							: 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
					}`}
				>
					<Brain className="w-3.5 h-3.5 text-purple-400" />
					<span>Memória</span>
				</button>
			</div>

			{/* Subtab 1: Diário do Projeto */}
			{activeSubTab === 'diary' && (
				<div className="flex-1 overflow-y-auto p-3 space-y-3">
					<div className="flex items-center justify-between pb-2 border-b border-purple-900/30">
						<div>
							<h3 className="font-semibold text-zinc-100 text-sm">Diário Profissional do Projeto</h3>
							<p className="text-[10px] text-zinc-400">Atualizado pela IA a cada etapa e vinculado aos checkpoints</p>
						</div>

						<button
							onClick={handleExportDiary}
							className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-950/70 hover:bg-purple-900 border border-purple-600/40 text-purple-200 text-xs transition-all cursor-pointer"
							title="Exportar Diário completo em PDF ou Markdown"
						>
							<Download className="w-3.5 h-3.5 text-purple-400" />
							<span>Exportar Diário</span>
						</button>
					</div>

					{exportSuccess && (
						<div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-[11px] flex items-center gap-1.5">
							<CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
							<span>Diário exportado e pronto para impressão/PDF!</span>
						</div>
					)}

					<div className="space-y-2.5">
						{diaryEntries.map((entry) => (
							<div
								key={entry.id}
								className="bg-[#120a22] border border-purple-900/30 rounded-xl p-3 space-y-2 hover:border-purple-600/40 transition-all"
							>
								<div className="flex items-start justify-between gap-2">
									<div className="font-semibold text-zinc-100 text-xs">{entry.title}</div>
									<div className="flex items-center gap-1 text-[10px] text-zinc-500 shrink-0">
										<Calendar className="w-3 h-3 text-purple-400" />
										<span>{entry.date}</span>
										<Clock className="w-3 h-3 text-purple-400 ml-1" />
										<span>{entry.time}</span>
									</div>
								</div>

								<p className="text-[11px] text-zinc-300 leading-relaxed">{entry.summary}</p>

								<div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-purple-900/20 text-[10px]">
									<div className="flex flex-wrap items-center gap-1">
										{entry.tags.map((tag) => (
											<span
												key={tag}
												className="px-1.5 py-0.5 rounded bg-purple-950/50 text-purple-300 border border-purple-800/30 flex items-center gap-0.5"
											>
												<Tag className="w-2.5 h-2.5" />
												{tag}
											</span>
										))}
									</div>

									<div className="text-zinc-500">
										{entry.filesImpacted.length} arquivo(s) modificado(s)
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Subtab 2: Mapa do Projeto */}
			{activeSubTab === 'map' && (
				<div className="flex-1 flex flex-col overflow-hidden">
					<div className="p-2 border-b border-purple-900/30 bg-[#0a0514] flex items-center justify-between gap-2">
						<div className="flex items-center gap-2 flex-1">
							<Search className="w-3.5 h-3.5 text-zinc-400" />
							<input
								type="text"
								value={searchMap}
								onChange={(e) => setSearchMap(e.target.value)}
								placeholder="Filtrar arquivos ou funções do mapa..."
								className="bg-transparent border-none focus:outline-none text-zinc-200 text-xs w-full"
							/>
						</div>

						<div className="flex items-center gap-1">
							<button
								onClick={() => setMapZoom((prev) => Math.max(60, prev - 10))}
								className="p-1 rounded text-zinc-400 hover:text-zinc-200 cursor-pointer"
								title="Diminuir Zoom"
							>
								<ZoomOut className="w-3.5 h-3.5" />
							</button>
							<span className="text-[10px] font-mono text-purple-300">{mapZoom}%</span>
							<button
								onClick={() => setMapZoom((prev) => Math.min(140, prev + 10))}
								className="p-1 rounded text-zinc-400 hover:text-zinc-200 cursor-pointer"
								title="Aumentar Zoom"
							>
								<ZoomIn className="w-3.5 h-3.5" />
							</button>
						</div>
					</div>

					<div className="flex-1 flex overflow-hidden">
						{/* Visual Network Nodes Grid */}
						<div
							className="flex-1 p-3 overflow-auto bg-[#07030e] space-y-2"
							style={{ transform: `scale(${mapZoom / 100})`, transformOrigin: 'top left' }}
						>
							{mapNodes
								.filter((n) => n.name.toLowerCase().includes(searchMap.toLowerCase()))
								.map((node) => (
									<div
										key={node.id}
										onClick={() => setSelectedNode(node)}
										className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
											selectedNode?.id === node.id
												? 'bg-purple-900/40 border-purple-500 shadow-[0_0_12px_rgba(147,51,234,0.3)]'
												: 'bg-[#120a22] border-purple-900/30 hover:border-purple-700/50'
										}`}
									>
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-2">
												<Code className="w-3.5 h-3.5 text-purple-400" />
												<span className="font-semibold text-zinc-200">{node.name}</span>
											</div>

											<span
												className={`px-1.5 py-0.5 rounded text-[9px] font-medium uppercase ${
													node.riskLevel === 'alto'
														? 'bg-red-950/60 text-red-300 border border-red-500/30'
														: node.riskLevel === 'médio'
														? 'bg-amber-950/60 text-amber-300 border border-amber-500/30'
														: 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
												}`}
											>
												Risco {node.riskLevel}
											</span>
										</div>

										<div className="text-[10px] text-zinc-400 mt-1">{node.description}</div>

										{node.dependsOn.length > 0 && (
											<div className="mt-2 text-[10px] text-zinc-500 flex items-center gap-1">
												<span>Depende de:</span>
												<span className="text-purple-300 font-mono">
													{node.dependsOn.join(', ')}
												</span>
											</div>
										)}
									</div>
								))}
						</div>

						{/* Detail Inspector Pane */}
						{selectedNode && (
							<div className="w-56 border-l border-purple-900/30 bg-[#0e071c] p-3 space-y-3 overflow-y-auto shrink-0">
								<div>
									<span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider">
										Arquivo Selecionado
									</span>
									<h4 className="font-semibold text-zinc-100 text-xs mt-0.5">{selectedNode.name}</h4>
									<p className="text-[10px] text-zinc-400 break-all font-mono mt-0.5">
										{selectedNode.path}
									</p>
								</div>

								{selectedNode.riskLevel === 'alto' && (
									<div className="p-2 rounded-lg bg-red-950/40 border border-red-500/30 text-red-300 text-[10px] space-y-1">
										<div className="flex items-center gap-1 font-bold">
											<AlertTriangle className="w-3 h-3 text-red-400" />
											<span>Alto Impacto</span>
										</div>
										<p>Se este componente for alterado, outros módulos podem quebrar se a interface for modificada.</p>
									</div>
								)}

								<div>
									<span className="text-[10px] font-medium text-zinc-300">Conexões no Grafo:</span>
									<div className="mt-1 space-y-1">
										{selectedNode.dependsOn.length === 0 ? (
											<span className="text-[10px] text-zinc-500 italic">Módulo raiz independente</span>
										) : (
											selectedNode.dependsOn.map((dep) => (
												<div
													key={dep}
													className="px-2 py-1 rounded bg-[#180d30] border border-purple-900/30 text-purple-300 text-[10px]"
												>
													→ {dep}
												</div>
											))
										)}
									</div>
								</div>
							</div>
						)}
					</div>
				</div>
			)}

			{/* Subtab 3: Memória do Projeto */}
			{activeSubTab === 'memory' && (
				<div className="flex-1 overflow-y-auto p-3 space-y-3">
					<div className="flex items-center justify-between pb-2 border-b border-purple-900/30">
						<div>
							<h3 className="font-semibold text-zinc-100 text-sm">Memória Local do Projeto</h3>
							<p className="text-[10px] text-zinc-400">Regras locais consultadas pela IA antes de agir (.darkos/memory.json)</p>
						</div>

						<button
							onClick={handleSaveMemory}
							className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white font-medium text-xs cursor-pointer shadow-[0_0_12px_rgba(139,92,246,0.3)] transition-all"
						>
							<Save className="w-3.5 h-3.5" />
							<span>Salvar Regras</span>
						</button>
					</div>

					{savedMemoryNotice && (
						<div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-[11px] flex items-center gap-1.5">
							<CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
							<span>Regras da Memória salvas com sucesso no projeto!</span>
						</div>
					)}

					<div className="space-y-3">
						<div>
							<label className="text-[11px] font-medium text-zinc-300 block mb-1">
								Guia de Estilo & Identidade Visual
							</label>
							<textarea
								value={memory.styleGuide}
								onChange={(e) => setMemory({ ...memory, styleGuide: e.target.value })}
								rows={3}
								className="w-full bg-[#120a22] border border-purple-900/40 rounded-lg p-2 text-zinc-200 focus:outline-none focus:border-purple-500 text-xs resize-none"
							/>
						</div>

						<div>
							<label className="text-[11px] font-medium text-zinc-300 block mb-1">
								Padrões de Nomes e Convenções
							</label>
							<textarea
								value={memory.namingConventions}
								onChange={(e) => setMemory({ ...memory, namingConventions: e.target.value })}
								rows={2}
								className="w-full bg-[#120a22] border border-purple-900/40 rounded-lg p-2 text-zinc-200 focus:outline-none focus:border-purple-500 text-xs resize-none"
							/>
						</div>

						<div>
							<label className="text-[11px] font-medium text-zinc-300 block mb-1">
								Instruções Especiais para a IA
							</label>
							<textarea
								value={memory.aiInstructions}
								onChange={(e) => setMemory({ ...memory, aiInstructions: e.target.value })}
								rows={2}
								className="w-full bg-[#120a22] border border-purple-900/40 rounded-lg p-2 text-zinc-200 focus:outline-none focus:border-purple-500 text-xs resize-none"
							/>
						</div>

						<div>
							<label className="text-[11px] font-medium text-zinc-300 block mb-1.5">
								Paleta de Cores Padrão
							</label>
							<div className="flex items-center gap-2">
								{memory.colorPalette.map((color, idx) => (
									<div
										key={idx}
										className="flex flex-col items-center gap-1"
									>
										<div
											className="w-6 h-6 rounded-lg border border-white/20 shadow-sm"
											style={{ backgroundColor: color }}
										/>
										<span className="text-[9px] font-mono text-zinc-400">{color}</span>
									</div>
								))}
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
