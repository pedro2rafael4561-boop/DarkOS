/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import React, { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { useAccessor, useSettingsState } from '../util/services.js';
import {
	Terminal as TerminalIcon,
	ShieldAlert,
	ShieldCheck,
	AlertTriangle,
	Play,
	Copy,
	Check,
	RotateCcw,
	Sparkles,
	Lock,
	CornerDownLeft,
	HelpCircle,
	Trash2,
	ChevronRight,
	Loader2,
} from 'lucide-react';

export type CommandRisk = 'safe' | 'moderate' | 'dangerous';

export type TranslationResult = {
	naturalPrompt: string;
	command: string;
	explanation: string;
	risk: CommandRisk;
	riskReason?: string;
	timestamp: Date;
};

// Deterministic safety patterns to guarantee protection even if LLM misclassifies
const DANGEROUS_PATTERNS = [
	/\b(rm\s+-rf|rm\s+-r|rmdir\s+\/s|del\s+\/f|\bdel\s+\/s)\b/i,
	/\b(Remove-Item\b.*(-Recurse|-Force))/i,
	/\b(format\s+[a-z]:)\b/i,
	/\b(drop\s+(database|table|schema))\b/i,
	/\b(git\s+reset\s+--hard|git\s+clean\s+-[a-z]*f)/i,
	/\b(kill\s+-9|taskkill\s+\/f)\b/i,
	/\b(dd\s+if=|mkfs)\b/i,
	/\b(chmod\s+-R\s+777|chown\s+-R)\b/i,
	/\b(truncate\s+table)\b/i,
];

const MODERATE_PATTERNS = [
	/\b(mkdir|New-Item|touch)\b/i,
	/\b(npm\s+(install|i|update|uninstall)|yarn\s+(add|remove)|pnpm\s+(add|remove)|pip\s+install)\b/i,
	/\b(git\s+(commit|push|rebase|merge|checkout\s+-b|switch\s+-c))\b/i,
	/\b(mv|Move-Item|cp|Copy-Item)\b/i,
	/\b(npm\s+run\s+build|cargo\s+build|go\s+build)\b/i,
];

export const classifyCommandRisk = (cmd: string): { risk: CommandRisk; reason?: string } => {
	for (const pattern of DANGEROUS_PATTERNS) {
		if (pattern.test(cmd)) {
			return {
				risk: 'dangerous',
				reason: 'Este comando remove arquivos permanentemente, sobrescreve histórico ou finaliza processos críticos sem retorno.',
			};
		}
	}

	for (const pattern of MODERATE_PATTERNS) {
		if (pattern.test(cmd)) {
			return {
				risk: 'moderate',
				reason: 'Este comando adiciona pacotes, cria diretórios ou altera o estado de repositório/build.',
			};
		}
	}

	return {
		risk: 'safe',
		reason: 'Comando de leitura, navegação ou verificação inofensivo.',
	};
};

export const SmartTerminal = () => {
	const accessor = useAccessor();
	const settingsState = useSettingsState();
	const terminalService = accessor.get('ITerminalService');

	const [promptInput, setPromptInput] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [currentResult, setCurrentResult] = useState<TranslationResult | null>(null);
	const [confirmedDangerous, setConfirmedDangerous] = useState(false);
	const [history, setHistory] = useState<TranslationResult[]>([]);
	const [copied, setCopied] = useState(false);
	const [executionStatus, setExecutionStatus] = useState<string | null>(null);

	const isWindows = typeof navigator !== 'undefined' ? navigator.userAgent.includes('Windows') : true;

	// Heuristic local translation fallback in case Ollama is starting
	const translateHeuristically = (prompt: string): { command: string; explanation: string } => {
		const p = prompt.toLowerCase().trim();

		if (p.includes('criar pasta') || p.includes('crie uma pasta') || p.includes('nova pasta')) {
			const folder = prompt.split(/pasta\s+/i)[1]?.trim().split(' ')[0] || 'nova-pasta';
			return {
				command: isWindows ? `New-Item -ItemType Directory -Path "${folder}" -Force` : `mkdir -p "${folder}"`,
				explanation: `Cria o diretório "${folder}" no caminho atual.`,
			};
		}
		if (p.includes('apagar pasta') || p.includes('remover pasta') || p.includes('delete a pasta') || p.includes('excluir pasta')) {
			const folder = prompt.split(/pasta\s+/i)[1]?.trim().split(' ')[0] || 'pasta';
			return {
				command: isWindows ? `Remove-Item -Recurse -Force -Path "${folder}"` : `rm -rf "${folder}"`,
				explanation: `Exclui permanentemente a pasta "${folder}" e todo o seu conteúdo.`,
			};
		}
		if (p.includes('iniciar') || p.includes('rodar o projeto') || p.includes('iniciar o projeto') || p.includes('dev')) {
			return {
				command: `npm run dev`,
				explanation: `Executa o servidor de desenvolvimento do projeto configurado no package.json.`,
			};
		}
		if (p.includes('instalar dependências') || p.includes('instalar os pacotes') || p.includes('instale as dependencias')) {
			return {
				command: `npm install`,
				explanation: `Baixa e instala todas as dependências declaradas para o projeto.`,
			};
		}
		if (p.includes('listar arquivos') || p.includes('ver arquivos') || p.includes('mostrar arquivos') || p.includes('listar')) {
			return {
				command: isWindows ? `Get-ChildItem` : `ls -la`,
				explanation: `Lista todos os arquivos e pastas no diretório atual.`,
			};
		}
		if (p.includes('status git') || p.includes('ver git') || p.includes('como ta o git')) {
			return {
				command: `git status`,
				explanation: `Mostra o estado atual das alterações e arquivos rastreados no Git.`,
			};
		}
		if (p.includes('commitar') || p.includes('salvar no git') || p.includes('fazer commit')) {
			return {
				command: `git add -A && git commit -m "update"`,
				explanation: `Adiciona todos os arquivos alterados e cria um novo commit no Git.`,
			};
		}
		if (p.includes('limpar terminal') || p.includes('limpar tela')) {
			return {
				command: isWindows ? `Clear-Host` : `clear`,
				explanation: `Limpa a tela e o histórico visual do terminal.`,
			};
		}

		// Generic fallback
		return {
			command: isWindows ? `echo "${prompt}"` : `echo "${prompt}"`,
			explanation: `Comando sugerido para: "${prompt}".`,
		};
	};

	// Main translation routine
	const handleTranslate = async (textToTranslate?: string) => {
		const text = textToTranslate || promptInput;
		if (!text.trim() || isLoading) return;

		setIsLoading(true);
		setConfirmedDangerous(false);
		setExecutionStatus(null);

		const activeModel = settingsState.modelSelectionOfFeature['Chat']?.modelName || 'qwen2.5-coder:1.5b';
		const shellName = isWindows ? 'PowerShell (Windows)' : 'Bash (Linux/Mac)';

		try {
			// Try querying Ollama local API with 3.5s timeout
			const controller = new AbortController();
			const timer = setTimeout(() => controller.abort(), 4000);

			const systemPrompt = `Você é o tradutor oficial do Terminal Inteligente do DarkOS.
O usuário programa em: ${shellName}.
Traduza o pedido em português do usuário para o comando de terminal exato correspondente.
Responda EXCLUSIVAMENTE em formato JSON com esta estrutura:
{
  "command": "comando aqui",
  "explanation": "explicação curta em português simples do que o comando fará"
}`;

			const res = await fetch('http://127.0.0.1:11434/api/generate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					model: activeModel,
					prompt: `${systemPrompt}\n\nPedido do usuário: "${text}"`,
					stream: false,
					format: 'json',
				}),
				signal: controller.signal,
			});
			clearTimeout(timer);

			if (res.ok) {
				const json = await res.json();
				const parsed = JSON.parse(json.response);
				if (parsed.command) {
					const { risk, reason } = classifyCommandRisk(parsed.command);
					const result: TranslationResult = {
						naturalPrompt: text,
						command: parsed.command.trim(),
						explanation: parsed.explanation || 'Comando pronto para execução.',
						risk,
						riskReason: reason,
						timestamp: new Date(),
					};
					setCurrentResult(result);
					setIsLoading(false);
					return;
				}
			}
		} catch (e) {
			// Fallback to local deterministic pattern matcher
		}

		// Heuristic fallback
		const fallback = translateHeuristically(text);
		const { risk, reason } = classifyCommandRisk(fallback.command);
		const result: TranslationResult = {
			naturalPrompt: text,
			command: fallback.command,
			explanation: fallback.explanation,
			risk,
			riskReason: reason,
			timestamp: new Date(),
		};
		setCurrentResult(result);
		setIsLoading(false);
	};

	// Execute command into user's terminal
	const handleExecute = async () => {
		if (!currentResult) return;

		try {
			let instance = terminalService.activeInstance;
			if (!instance) {
				instance = await terminalService.createTerminal({ name: 'DarkOS Terminal' });
			}

			if (instance) {
				terminalService.setActiveInstance(instance);
				terminalService.focusActiveInstance();
				await instance.sendText(currentResult.command, true);

				setExecutionStatus('Comando enviado e executado no terminal!');
				setHistory((prev) => [currentResult, ...prev.slice(0, 9)]);
			} else {
				setExecutionStatus('Erro: Terminal integrado não disponível no momento.');
			}
		} catch (err: any) {
			setExecutionStatus(`Falha ao executar: ${err?.message || String(err)}`);
		}
	};

	const handleCopy = () => {
		if (!currentResult) return;
		navigator.clipboard.writeText(currentResult.command);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			handleTranslate();
		}
	};

	const QUICK_EXAMPLES = [
		'crie uma pasta chamada components',
		'inicie o projeto com npm run dev',
		'veja o status do git',
		'apague a pasta temp e limpe o cache',
		'liste os arquivos detalhados',
	];

	return (
		<div className="flex flex-col h-full w-full bg-[#0d0718] text-zinc-100 overflow-y-auto p-4 space-y-4 custom-scrollbar">
			{/* Top Header */}
			<div className="flex items-center justify-between border-b border-purple-900/30 pb-3">
				<div className="flex items-center gap-2.5">
					<div className="p-2 rounded-xl bg-purple-950/60 border border-purple-500/40 text-purple-300 shadow-[0_0_15px_rgba(157,78,221,0.3)]">
						<TerminalIcon className="w-5 h-5 text-purple-300" />
					</div>
					<div>
						<h2 className="text-base font-semibold text-white tracking-tight flex items-center gap-1.5">
							Terminal Inteligente <span className="text-[10px] bg-purple-900/60 text-purple-300 px-2 py-0.5 rounded-full border border-purple-700/40">DarkOS</span>
						</h2>
						<p className="text-[11px] text-zinc-400">Digite em português o que precisa e a IA traduz com proteção ativa.</p>
					</div>
				</div>
			</div>

			{/* Natural Language Input Box */}
			<div className="space-y-2">
				<div className="relative flex items-center">
					<input
						type="text"
						value={promptInput}
						onChange={(e) => setPromptInput(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="Ex: crie uma pasta imagens e copie as fotos para ela..."
						className="w-full bg-purple-950/20 border border-purple-800/40 focus:border-purple-500 rounded-xl px-4 py-3 pr-24 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-purple-400/50 shadow-inner transition-all"
					/>
					<button
						onClick={() => handleTranslate()}
						disabled={isLoading || !promptInput.trim()}
						className={`absolute right-1.5 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
							isLoading || !promptInput.trim()
								? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
								: 'bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_12px_rgba(157,78,221,0.4)] cursor-pointer'
						}`}
					>
						{isLoading ? (
							<>
								<Loader2 className="w-3.5 h-3.5 animate-spin" /> Traduzindo...
							</>
						) : (
							<>
								<Sparkles className="w-3.5 h-3.5" /> Traduzir
							</>
						)}
					</button>
				</div>

				{/* Quick Suggestions Chips */}
				<div className="flex flex-wrap gap-1.5 pt-1">
					{QUICK_EXAMPLES.map((ex, i) => (
						<button
							key={i}
							onClick={() => {
								setPromptInput(ex);
								handleTranslate(ex);
							}}
							className="text-[11px] bg-zinc-900/60 hover:bg-purple-950/40 hover:text-purple-200 border border-zinc-800 hover:border-purple-800/50 text-zinc-400 px-2.5 py-1 rounded-md transition-all cursor-pointer truncate max-w-full"
						>
							{ex}
						</button>
					))}
				</div>
			</div>

			{/* Translation Result & Safety Card */}
			{currentResult && (
				<div className="bg-zinc-900/60 border border-purple-900/40 rounded-xl p-4 space-y-3.5 animate-fadeIn backdrop-blur-sm">
					{/* Status & Risk Badge */}
					<div className="flex items-center justify-between">
						<div className="text-xs text-zinc-400 flex items-center gap-1">
							<span>Intenção:</span>
							<span className="text-zinc-200 font-medium italic truncate max-w-[220px]">
								"{currentResult.naturalPrompt}"
							</span>
						</div>

						{/* Risk Badge */}
						{currentResult.risk === 'safe' && (
							<div className="flex items-center gap-1 text-[11px] font-medium bg-emerald-950/40 text-emerald-400 border border-emerald-500/40 px-2.5 py-0.5 rounded-full">
								<ShieldCheck className="w-3 h-3" /> Seguro
							</div>
						)}

						{currentResult.risk === 'moderate' && (
							<div className="flex items-center gap-1 text-[11px] font-medium bg-amber-950/40 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded-full">
								<AlertTriangle className="w-3 h-3" /> Requer Atenção
							</div>
						)}

						{currentResult.risk === 'dangerous' && (
							<div className="flex items-center gap-1 text-[11px] font-bold bg-rose-950/60 text-rose-300 border border-rose-500/60 px-2.5 py-0.5 rounded-full animate-pulse">
								<ShieldAlert className="w-3.5 h-3.5 text-rose-400" /> Ação Destrutiva / Perigosa
							</div>
						)}
					</div>

					{/* Command Box */}
					<div className="relative group bg-black/60 border border-purple-950 rounded-lg p-3 font-mono text-xs text-purple-200 overflow-x-auto flex items-center justify-between">
						<code className="select-all">{currentResult.command}</code>
						<button
							onClick={handleCopy}
							title="Copiar comando"
							className="ml-2 p-1.5 rounded bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 transition-all cursor-pointer"
						>
							{copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
						</button>
					</div>

					{/* Explanation */}
					<div className="text-xs text-zinc-300 leading-relaxed bg-purple-950/20 p-2.5 rounded-lg border border-purple-900/20">
						<span className="font-semibold text-purple-300">Explicação: </span>
						{currentResult.explanation}
					</div>

					{/* Dangerous Warning & Confirmation Check */}
					{currentResult.risk === 'dangerous' && (
						<div className="bg-rose-950/30 border border-rose-800/50 rounded-lg p-3 space-y-2 text-xs text-rose-200">
							<div className="flex items-center gap-1.5 font-semibold text-rose-300">
								<ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
								<span>Aviso de Segurança: Comando Crítico</span>
							</div>
							<p className="text-[11px] text-rose-200/90 leading-relaxed">
								{currentResult.riskReason || 'Este comando alterará permanentemente o sistema de arquivos ou finalizará processos.'}
							</p>
							<label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
								<input
									type="checkbox"
									checked={confirmedDangerous}
									onChange={(e) => setConfirmedDangerous(e.target.checked)}
									className="rounded border-rose-600 text-rose-600 focus:ring-rose-500"
								/>
								<span className="font-medium text-rose-200 text-[11px]">
									Estou ciente do risco e confirmo a execução
								</span>
							</label>
						</div>
					)}

					{/* Execution Buttons */}
					<div className="flex items-center justify-between pt-1">
						{currentResult.risk !== 'dangerous' ? (
							<button
								onClick={handleExecute}
								className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white font-medium text-xs flex items-center gap-2 shadow-[0_0_15px_rgba(157,78,221,0.3)] cursor-pointer transition-all"
							>
								<Play className="w-3.5 h-3.5 fill-white" /> Executar no Terminal Integrado
							</button>
						) : (
							<button
								onClick={handleExecute}
								disabled={!confirmedDangerous}
								className={`px-4 py-2 rounded-lg font-medium text-xs flex items-center gap-2 transition-all ${
									confirmedDangerous
										? 'bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_20px_rgba(225,29,72,0.4)] cursor-pointer'
										: 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
								}`}
							>
								<ShieldAlert className="w-3.5 h-3.5" /> Executar Comando Perigoso
							</button>
						)}

						{executionStatus && (
							<span className="text-[11px] text-purple-300 animate-fadeIn">
								{executionStatus}
							</span>
						)}
					</div>
				</div>
			)}

			{/* Execution History */}
			{history.length > 0 && (
				<div className="space-y-2 pt-2 border-t border-purple-900/20">
					<div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
						<span>Comandos Recentes</span>
						<button
							onClick={() => setHistory([])}
							className="text-[10px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1 cursor-pointer"
						>
							<Trash2 className="w-3 h-3" /> Limpar
						</button>
					</div>

					<div className="space-y-1.5">
						{history.map((item, idx) => (
							<div
								key={idx}
								onClick={() => setCurrentResult(item)}
								className="p-2 rounded-lg bg-zinc-900/40 hover:bg-purple-950/30 border border-zinc-800/80 hover:border-purple-800/40 text-xs cursor-pointer transition-all flex items-center justify-between group"
							>
								<div className="truncate pr-2">
									<div className="text-zinc-300 font-medium truncate">{item.naturalPrompt}</div>
									<div className="text-[11px] font-mono text-purple-300/80 truncate">{item.command}</div>
								</div>
								<ChevronRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-purple-300 transition-all shrink-0" />
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
};
