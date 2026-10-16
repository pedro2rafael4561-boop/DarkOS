/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAccessor, useIsDark, useSettingsState } from '../util/services.js';
import {
	Check,
	ChevronRight,
	AlertTriangle,
	ShieldCheck,
	Cpu,
	HardDrive,
	Play,
	Pause,
	RotateCcw,
	Sparkles,
	Lock,
	ArrowRight,
	Loader2,
} from 'lucide-react';
import { SettingsForProvider } from '../darkos-settings-tsx/Settings.js';
import ErrorBoundary from '../sidebar-tsx/ErrorBoundary.js';
import { HardwareInfo, OllamaStatus, PullProgressEvent } from '../../electron-main/darkosAiPrepChannel.js';

const OVERRIDE_VALUE = false;

export const DarkOSOnboarding = () => {
	const voidSettingsState = useSettingsState();
	const isOnboardingComplete = voidSettingsState.globalSettings.isOnboardingComplete || OVERRIDE_VALUE;
	const isDark = useIsDark();

	return (
		<div className={`@@void-scope ${isDark ? 'dark' : ''}`}>
			<div
				className={`
					bg-[#0a0612] text-zinc-100 fixed top-0 right-0 bottom-0 left-0 width-full z-[99999]
					transition-all duration-1000 ${isOnboardingComplete ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'}
				`}
				style={{
					height: '100vh',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					background: 'radial-gradient(ellipse at 50% 20%, #1c0e35 0%, #0a0612 70%)',
				}}
			>
				<ErrorBoundary>
					<DarkOSOnboardingContent />
				</ErrorBoundary>
			</div>
		</div>
	);
};

const DarkOSLogoIcon = () => (
	<div className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-violet-950/40 border border-purple-500/30 shadow-[0_0_25px_rgba(157,78,221,0.35)] p-1.5">
		<div className="w-full h-full darkos-logo-image filter drop-shadow-[0_0_10px_rgba(199,125,255,0.5)]" />
	</div>
);

type ModelOptionInfo = {
	id: string;
	title: string;
	ramRequired: string;
	desc: string;
	badge?: string;
};

const AVAILABLE_LOCAL_MODELS: ModelOptionInfo[] = [
	{
		id: 'qwen2.5-coder:1.5b',
		title: 'Qwen 2.5 Coder (1.5B)',
		ramRequired: '~1.2 GB RAM / VRAM',
		desc: 'Ultrarrápido e super leve. Recomendado para computadores com placa de vídeo integrada ou até 12GB de RAM.',
		badge: 'Mais Rápido & Leve',
	},
	{
		id: 'qwen2.5-coder:3b',
		title: 'Qwen 2.5 Coder (3B)',
		ramRequired: '~2.2 GB RAM / VRAM',
		desc: 'Equilíbrio excelente entre velocidade e inteligência para escrita e edição de código.',
		badge: 'Equilibrado',
	},
	{
		id: 'qwen2.5-coder:7b',
		title: 'Qwen 2.5 Coder (7B)',
		ramRequired: '~4.7 GB RAM / VRAM',
		desc: 'Máxima capacidade de raciocínio e refatoração profunda. Recomendado para 16GB+ de RAM ou GPU dedicada.',
		badge: 'Maior Inteligência',
	},
];

const DarkOSOnboardingContent = () => {
	const accessor = useAccessor();
	const darkosSettingsService = accessor.get('IVoidSettingsService');
	const mainProcessService = accessor.get('IMainProcessService');

	const channel = mainProcessService.getChannel('darkos-channel-ai-prep');

	const [step, setStep] = useState<0 | 1 | 2>(0);

	// Hardware diagnostic state
	const [hardware, setHardware] = useState<HardwareInfo | null>(null);
	const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus | null>(null);
	const [selectedModel, setSelectedModel] = useState<string>('qwen2.5-coder:1.5b');

	// Download/install progress state
	const [isInstalling, setIsInstalling] = useState<boolean>(false);
	const [isPaused, setIsPaused] = useState<boolean>(false);
	const [progressStatus, setProgressStatus] = useState<string>('Aguardando início...');
	const [progressPercent, setProgressPercent] = useState<number>(0);
	const [bytesCompleted, setBytesCompleted] = useState<number | undefined>(undefined);
	const [bytesTotal, setBytesTotal] = useState<number | undefined>(undefined);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [isReady, setIsReady] = useState<boolean>(false);

	// Cloud provider selection in step 1
	const [showCloudDetails, setShowCloudDetails] = useState<boolean>(false);

	// Detect hardware on mount
	useEffect(() => {
		let isMounted = true;

		const init = async () => {
			try {
				const hw: HardwareInfo = await channel.call('detectHardware');
				if (isMounted) {
					setHardware(hw);
					if (hw.recommendedModel) {
						setSelectedModel(hw.recommendedModel);
					}
				}

				const ollama: OllamaStatus = await channel.call('checkOllama');
				if (isMounted) {
					setOllamaStatus(ollama);
					if (ollama.models && ollama.models.includes(hw.recommendedModel)) {
						setIsReady(true);
						setProgressPercent(100);
						setProgressStatus('Modelo já baixado e disponível offline!');
					}
				}
			} catch (e: any) {
				console.error('Failed to detect hardware or Ollama status:', e);
			}
		};

		init();

		// Listen to progress events
		const disposable = channel.listen<PullProgressEvent>('onPullProgress')((event) => {
			if (!isMounted) return;

			if (event.status) setProgressStatus(event.status);
			if (typeof event.percent === 'number') setProgressPercent(event.percent);
			if (typeof event.completed === 'number') setBytesCompleted(event.completed);
			if (typeof event.total === 'number') setBytesTotal(event.total);

			if (event.error) {
				setErrorMessage(event.error);
				setIsInstalling(false);
			}

			if (event.done) {
				setIsReady(true);
				setIsInstalling(false);
				setProgressPercent(100);
				setProgressStatus('IA Local pronta para uso offline!');
			}
		});

		return () => {
			isMounted = false;
			disposable.dispose();
		};
	}, []);

	// Apply configuration to DarkOS settings once model is ready
	const applyModelToDefaults = useCallback(async (modelName: string) => {
		try {
			await darkosSettingsService.setSettingOfProvider('ollama', '_didFillInProviderSettings', true);
			darkosSettingsService.addModel('ollama', modelName);

			await darkosSettingsService.setModelSelectionOfFeature('Chat', { providerName: 'ollama', modelName });
			await darkosSettingsService.setModelSelectionOfFeature('Ctrl+K', { providerName: 'ollama', modelName });
			await darkosSettingsService.setModelSelectionOfFeature('Autocomplete', { providerName: 'ollama', modelName });
			await darkosSettingsService.setModelSelectionOfFeature('Apply', { providerName: 'ollama', modelName });
			await darkosSettingsService.setModelSelectionOfFeature('SCM', { providerName: 'ollama', modelName });
		} catch (e) {
			console.error('Failed to configure default model:', e);
		}
	}, [darkosSettingsService]);

	// Handler to start preparation
	const handleStartPreparation = async () => {
		setErrorMessage(null);
		setIsInstalling(true);
		setIsPaused(false);
		setProgressPercent(5);
		setProgressStatus('Iniciando ambiente local...');

		try {
			// 1. Check if Ollama needs installation
			const currentOllama: OllamaStatus = await channel.call('checkOllama');
			if (!currentOllama.installed) {
				setProgressStatus('Baixando e instalando motor local (silencioso)...');
				const installRes = await channel.call('installOllama');
				if (!installRes.success) {
					setErrorMessage(installRes.error || 'Não foi possível instalar o motor local.');
					setIsInstalling(false);
					return;
				}
			}

			// 2. Ensure Ollama service is running
			setProgressStatus('Iniciando serviço de IA local...');
			await channel.call('startOllama');

			// 3. Pull selected model
			setProgressStatus(`Baixando modelo ${selectedModel}...`);
			const pullSuccess = await channel.call('pullModel', { modelName: selectedModel });
			if (pullSuccess) {
				await applyModelToDefaults(selectedModel);
				setIsReady(true);
			}
		} catch (err: any) {
			setErrorMessage(err?.message || 'Ocorreu um erro na preparação. Clique em Tentar Novamente.');
		} finally {
			setIsInstalling(false);
		}
	};

	const handlePause = async () => {
		setIsPaused(true);
		setIsInstalling(false);
		await channel.call('pausePull');
		setProgressStatus('Download pausado.');
	};

	const handleResume = async () => {
		setErrorMessage(null);
		setIsPaused(false);
		setIsInstalling(true);
		setProgressStatus('Retomando download...');
		const success = await channel.call('resumePull', { modelName: selectedModel });
		if (success) {
			await applyModelToDefaults(selectedModel);
			setIsReady(true);
		}
		setIsInstalling(false);
	};

	const handleCompleteOnboarding = () => {
		darkosSettingsService.setGlobalSetting('isOnboardingComplete', true);
	};

	const formatBytes = (bytes?: number) => {
		if (!bytes) return '';
		const mb = bytes / (1024 * 1024);
		if (mb >= 1024) {
			return `${(mb / 1024).toFixed(2)} GB`;
		}
		return `${Math.round(mb)} MB`;
	};

	return (
		<div className="w-full max-w-[860px] mx-auto p-6 flex flex-col justify-between h-[90vh]">
			{/* Top Header */}
			<div className="flex items-center justify-between border-b border-purple-900/30 pb-4 mb-4">
				<div className="flex items-center gap-3">
					<DarkOSLogoIcon />
					<div>
						<h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-purple-100 to-purple-400 bg-clip-text text-transparent">
							DarkOS
						</h1>
						<p className="text-xs text-purple-300/70">Editor de Código com Inteligência Artificial Nativa e Local</p>
					</div>
				</div>

				{/* Steps Indicator */}
				<div className="flex items-center gap-2 text-xs">
					<div
						className={`flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all ${
							step === 0
								? 'bg-purple-900/50 border-purple-500/60 text-purple-200'
								: 'bg-zinc-900/50 border-zinc-800 text-zinc-400'
						}`}
					>
						<span className="w-4 h-4 rounded-full bg-purple-600/60 flex items-center justify-center text-[10px] font-bold">1</span>
						<span>IA Local</span>
					</div>

					<ChevronRight className="w-3.5 h-3.5 text-zinc-600" />

					<div
						className={`flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all ${
							step === 1
								? 'bg-purple-900/50 border-purple-500/60 text-purple-200'
								: 'bg-zinc-900/50 border-zinc-800 text-zinc-400'
						}`}
					>
						<span className="w-4 h-4 rounded-full bg-purple-600/60 flex items-center justify-center text-[10px] font-bold">2</span>
						<span>Nuvem (Opcional)</span>
					</div>

					<ChevronRight className="w-3.5 h-3.5 text-zinc-600" />

					<div
						className={`flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all ${
							step === 2
								? 'bg-purple-900/50 border-purple-500/60 text-purple-200'
								: 'bg-zinc-900/50 border-zinc-800 text-zinc-400'
						}`}
					>
						<span className="w-4 h-4 rounded-full bg-purple-600/60 flex items-center justify-center text-[10px] font-bold">3</span>
						<span>Pronto</span>
					</div>
				</div>
			</div>

			{/* Main Content Area */}
			<div className="flex-1 overflow-y-auto pr-2 custom-scrollbar flex flex-col justify-center">
				{step === 0 && (
					<div className="space-y-6">
						{/* Title */}
						<div className="text-center space-y-1">
							<h2 className="text-3xl font-extralight tracking-tight text-white">Preparando sua IA...</h2>
							<p className="text-sm text-zinc-400">
								Detectamos o seu hardware para configurar a melhor IA de código com execução 100% local e sem custos.
							</p>
						</div>

						{/* Hardware Diagnostic Card */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-purple-950/20 border border-purple-800/30 rounded-xl p-4 backdrop-blur-sm">
							<div className="flex items-center gap-3">
								<div className="p-2.5 rounded-lg bg-purple-900/30 border border-purple-700/40 text-purple-300">
									<Cpu className="w-5 h-5" />
								</div>
								<div>
									<div className="text-xs text-purple-300/80 uppercase font-medium">Placa de Vídeo / Gráficos</div>
									<div className="text-sm font-medium text-white truncate max-w-[280px]">
										{hardware ? hardware.gpuName : 'Detectando aceleração...'}
									</div>
								</div>
							</div>

							<div className="flex items-center gap-3">
								<div className="p-2.5 rounded-lg bg-purple-900/30 border border-purple-700/40 text-purple-300">
									<HardDrive className="w-5 h-5" />
								</div>
								<div>
									<div className="text-xs text-purple-300/80 uppercase font-medium">Memória RAM</div>
									<div className="text-sm font-medium text-white">
										{hardware ? `${hardware.totalRamGB} GB total (${hardware.freeRamGB} GB livres)` : 'Calculando memória...'}
									</div>
								</div>
							</div>
						</div>

						{/* Model Selection */}
						<div className="space-y-2">
							<label className="text-xs font-semibold text-purple-300 uppercase tracking-wider block">
								Escolha o tamanho do modelo para o seu computador:
							</label>

							<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
								{AVAILABLE_LOCAL_MODELS.map((model) => {
									const isSelected = selectedModel === model.id;
									const isRecommended = hardware?.recommendedModel === model.id;

									return (
										<div
											key={model.id}
											onClick={() => !isInstalling && setSelectedModel(model.id)}
											className={`relative p-3.5 rounded-xl border cursor-pointer transition-all ${
												isSelected
													? 'bg-purple-950/50 border-purple-500 shadow-[0_0_15px_rgba(157,78,221,0.25)] ring-1 ring-purple-400'
													: 'bg-zinc-900/40 border-zinc-800 hover:border-purple-800/50 hover:bg-zinc-900/70'
											} ${isInstalling ? 'opacity-60 cursor-not-allowed' : ''}`}
										>
											{isRecommended && (
												<div className="absolute -top-2.5 right-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-[10px] font-bold text-white px-2 py-0.5 rounded-full border border-purple-300/30 shadow-sm flex items-center gap-1">
													<Sparkles className="w-2.5 h-2.5" /> Recomendado
												</div>
											)}

											<div className="font-semibold text-sm text-white mb-1">{model.title}</div>
											<div className="text-[11px] text-purple-300/90 font-mono mb-2">{model.ramRequired}</div>
											<p className="text-xs text-zinc-400 leading-relaxed">{model.desc}</p>
										</div>
									);
								})}
							</div>
						</div>

						{/* Progress Bar & Status */}
						<div className="bg-zinc-900/60 border border-purple-900/30 rounded-xl p-4 space-y-3">
							<div className="flex items-center justify-between text-sm">
								<div className="flex items-center gap-2">
									{isInstalling && <Loader2 className="w-4 h-4 animate-spin text-purple-400" />}
									{isReady && <Check className="w-4 h-4 text-emerald-400" />}
									<span className={`font-medium ${isReady ? 'text-emerald-400' : 'text-zinc-200'}`}>
										{progressStatus}
									</span>
								</div>
								<div className="text-xs text-purple-300 font-mono">
									{bytesCompleted && bytesTotal ? `${formatBytes(bytesCompleted)} / ${formatBytes(bytesTotal)} ` : ''}
									({progressPercent}%)
								</div>
							</div>

							{/* Progress Bar Track */}
							<div className="w-full bg-zinc-950 rounded-full h-3 overflow-hidden border border-purple-950 p-[1px]">
								<div
									className="h-full rounded-full bg-gradient-to-r from-purple-600 via-fuchsia-500 to-purple-400 transition-all duration-300 relative shadow-[0_0_12px_rgba(157,78,221,0.6)]"
									style={{ width: `${progressPercent}%` }}
								>
									{isInstalling && (
										<div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
									)}
								</div>
							</div>

							{/* Error message banner */}
							{errorMessage && (
								<div className="flex items-center gap-2 text-rose-300 text-xs bg-rose-950/40 border border-rose-800/40 p-2.5 rounded-lg">
									<AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
									<span>{errorMessage}</span>
								</div>
							)}

							{/* Action Buttons */}
							<div className="flex items-center justify-between pt-1">
								<div className="flex items-center gap-2">
									{!isInstalling && !isReady && (
										<button
											onClick={handleStartPreparation}
											className="px-5 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white font-medium text-sm flex items-center gap-2 shadow-[0_0_20px_rgba(157,78,221,0.35)] transition-all cursor-pointer"
										>
											<Play className="w-4 h-4 fill-white" /> Iniciar Preparação da IA Local
										</button>
									)}

									{isInstalling && (
										<button
											onClick={handlePause}
											className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
										>
											<Pause className="w-3.5 h-3.5" /> Pausar
										</button>
									)}

									{isPaused && (
										<button
											onClick={handleResume}
											className="px-4 py-2 rounded-lg bg-purple-700 hover:bg-purple-600 text-white text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
										>
											<Play className="w-3.5 h-3.5 fill-white" /> Retomar Download
										</button>
									)}

									{errorMessage && (
										<button
											onClick={handleStartPreparation}
											className="px-4 py-2 rounded-lg bg-purple-700 hover:bg-purple-600 text-white text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
										>
											<RotateCcw className="w-3.5 h-3.5" /> Tentar Novamente
										</button>
									)}
								</div>

								{/* Privacy Guarantee Pill */}
								<div className="flex items-center gap-1.5 text-[11px] text-purple-300/80 bg-purple-950/30 px-3 py-1 rounded-full border border-purple-800/20">
									<Lock className="w-3 h-3 text-purple-400" />
									<span>100% Offline e Privado</span>
								</div>
							</div>
						</div>
					</div>
				)}

				{step === 1 && (
					<div className="space-y-6 max-w-xl mx-auto">
						<div className="text-center space-y-1">
							<h2 className="text-2xl font-light text-white">Conectar IA em Nuvem (Opcional)</h2>
							<p className="text-sm text-zinc-400">
								Sua IA local já está ativa. Conectar um serviço externo é inteiramente facultativo.
							</p>
						</div>

						{/* Privacy Alert Box */}
						<div className="bg-amber-950/20 border border-amber-600/40 rounded-xl p-4.5 space-y-2 text-left">
							<div className="flex items-center gap-2 text-amber-400 font-medium text-sm">
								<AlertTriangle className="w-4 h-4 shrink-0" />
								<span>Aviso de Privacidade & Saída de Dados</span>
							</div>
							<p className="text-xs text-amber-200/80 leading-relaxed">
								Ao conectar provedores comerciais em nuvem (como OpenAI, Anthropic, Gemini ou Groq), trechos de
								código-fonte, arquivos e mensagens serão transmitidos pela internet para servidores de terceiros.
							</p>
							<p className="text-xs text-amber-300 font-medium pt-1">
								Se você trabalha com projetos confidenciais ou deseja segurança total sem enviar nada para fora, recomendamos continuar utilizando exclusivamente a IA local do DarkOS.
							</p>
						</div>

						<div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 text-center space-y-3">
							<div className="text-sm font-medium text-zinc-300">Deseja adicionar uma chave de API de nuvem agora?</div>
							<div className="flex items-center justify-center gap-3">
								<button
									onClick={() => setShowCloudDetails(!showCloudDetails)}
									className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 transition-all cursor-pointer"
								>
									{showCloudDetails ? 'Ocultar Provedores em Nuvem' : 'Configurar Chave de Nuvem (Opcional)'}
								</button>
							</div>

							{showCloudDetails && (
								<div className="mt-4 pt-4 border-t border-zinc-800 text-left space-y-4">
									<div className="text-xs text-zinc-400">
										Insira a chave apenas se desejar usar modelos em nuvem. Caso contrário, mantenha em branco.
									</div>
									<div className="space-y-3">
										<SettingsForProvider providerName="gemini" showProviderTitle={true} showProviderSuggestions={true} />
										<SettingsForProvider providerName="openRouter" showProviderTitle={true} showProviderSuggestions={true} />
										<SettingsForProvider providerName="openAI" showProviderTitle={true} showProviderSuggestions={true} />
										<SettingsForProvider providerName="anthropic" showProviderTitle={true} showProviderSuggestions={true} />
									</div>
								</div>
							)}
						</div>
					</div>
				)}

				{step === 2 && (
					<div className="space-y-6 max-w-lg mx-auto text-center">
						<div className="inline-flex p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.2)]">
							<ShieldCheck className="w-10 h-10" />
						</div>

						<div className="space-y-2">
							<h2 className="text-3xl font-light text-white">Tudo Pronto para Programar!</h2>
							<p className="text-sm text-zinc-400">
								O DarkOS está configurado com motor de inteligência artificial local e pronto para uso offline.
							</p>
						</div>

						{/* Summary Card */}
						<div className="bg-purple-950/30 border border-purple-800/40 rounded-xl p-4 text-left space-y-2.5 text-xs text-zinc-300">
							<div className="flex items-center justify-between pb-1.5 border-b border-purple-900/30">
								<span className="text-zinc-400">Motor de Inteligência Artificial:</span>
								<span className="font-semibold text-purple-300">Ollama (100% Local)</span>
							</div>

							<div className="flex items-center justify-between pb-1.5 border-b border-purple-900/30">
								<span className="text-zinc-400">Modelo Padrão Ativo:</span>
								<span className="font-mono font-medium text-purple-200">{selectedModel}</span>
							</div>

							<div className="flex items-center justify-between pb-1.5 border-b border-purple-900/30">
								<span className="text-zinc-400">Recursos Integrados:</span>
								<span className="text-zinc-200">Chat, Autocompletar, Ctrl+K e Agente</span>
							</div>

							<div className="flex items-center justify-between">
								<span className="text-zinc-400">Modo de Operação:</span>
								<span className="text-emerald-400 font-medium">✓ Totalmente Offline e Gratuito</span>
							</div>
						</div>
					</div>
				)}
			</div>

			{/* Bottom Navigation */}
			<div className="flex items-center justify-between border-t border-purple-900/30 pt-4 mt-2">
				<div>
					{step > 0 && (
						<button
							onClick={() => setStep((s) => (s - 1) as any)}
							className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white transition-all cursor-pointer"
						>
							Voltar
						</button>
					)}
				</div>

				<div className="flex items-center gap-3">
					{step === 0 && (
						<button
							onClick={() => setStep(1)}
							disabled={!isReady && !ollamaStatus?.installed}
							className={`px-5 py-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
								isReady || ollamaStatus?.installed
									? 'bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_15px_rgba(157,78,221,0.4)] cursor-pointer'
									: 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
							}`}
						>
							Continuar <ArrowRight className="w-3.5 h-3.5" />
						</button>
					)}

					{step === 1 && (
						<button
							onClick={() => setStep(2)}
							className="px-5 py-2.5 rounded-lg text-xs font-medium bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_15px_rgba(157,78,221,0.4)] flex items-center gap-1.5 cursor-pointer transition-all"
						>
							Continuar <ArrowRight className="w-3.5 h-3.5" />
						</button>
					)}

					{step === 2 && (
						<button
							onClick={handleCompleteOnboarding}
							className="px-7 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-purple-600 via-fuchsia-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white shadow-[0_0_30px_rgba(157,78,221,0.5)] flex items-center gap-2 cursor-pointer transition-all scale-100 hover:scale-[1.02] active:scale-95"
						>
							<Sparkles className="w-4 h-4 fill-white" /> Entrar no DarkOS
						</button>
					)}
				</div>
			</div>
		</div>
	);
};
