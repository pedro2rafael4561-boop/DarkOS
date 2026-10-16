import React, { useState } from 'react';
import { 
	Smartphone, 
	Tablet, 
	Monitor, 
	Tv, 
	RefreshCw, 
	ExternalLink, 
	ZoomIn, 
	ZoomOut, 
	Compass, 
	AlertTriangle, 
	Layers, 
	Bot,
	Cpu
} from 'lucide-react';

export type DeviceMode = 'mobile' | 'tablet' | 'desktop' | 'tv' | 'android_emulator';

interface DevicePreset {
	id: DeviceMode;
	name: string;
	width: number;
	height: number;
	icon: any;
	description: string;
}

const presets: DevicePreset[] = [
	{
		id: 'mobile',
		name: 'Celular',
		width: 375,
		height: 667,
		icon: Smartphone,
		description: 'iPhone SE / Android Compacto (375x667)',
	},
	{
		id: 'tablet',
		name: 'Tablet',
		width: 768,
		height: 1024,
		icon: Tablet,
		description: 'iPad / Tablet 10" (768x1024)',
	},
	{
		id: 'desktop',
		name: 'Desktop',
		width: 1280,
		height: 800,
		icon: Monitor,
		description: 'Notebook & Monitor Padrão (1280x800)',
	},
	{
		id: 'tv',
		name: 'Smart TV',
		width: 1920,
		height: 1080,
		icon: Tv,
		description: 'Smart TV Full HD (1920x1080)',
	},
	{
		id: 'android_emulator',
		name: 'Android AVD',
		width: 412,
		height: 915,
		icon: Bot,
		description: 'Espaço Integrado Emulador Android (Google Pixel)',
	},
];

export const LivePreview = () => {
	const [activeDevice, setActiveDevice] = useState<DeviceMode>('desktop');
	const [url, setUrl] = useState('http://localhost:3000');
	const [inputUrl, setInputUrl] = useState('http://localhost:3000');
	const [zoom, setZoom] = useState(100);
	const [key, setKey] = useState(0);

	const currentPreset = presets.find((p) => p.id === activeDevice) || presets[2];

	const handleRefresh = () => {
		setKey((prev) => prev + 1);
	};

	const handleNavigate = (e: React.FormEvent) => {
		e.preventDefault();
		setUrl(inputUrl);
	};

	return (
		<div className="h-full flex flex-col bg-[#0b0616] text-zinc-100 select-none overflow-hidden">
			{/* Top Bar / Controls */}
			<div className="flex flex-wrap items-center justify-between gap-2 p-2 border-b border-purple-900/40 bg-[#0e071c] text-xs shrink-0">
				{/* Viewport Selectors */}
				<div className="flex items-center gap-1 bg-[#150a2b] p-1 rounded-xl border border-purple-900/40">
					{presets.map((preset) => {
						const Icon = preset.icon;
						const isSelected = activeDevice === preset.id;
						return (
							<button
								key={preset.id}
								onClick={() => setActiveDevice(preset.id)}
								className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all cursor-pointer ${
									isSelected
										? 'bg-purple-600 text-white shadow-[0_0_10px_rgba(147,51,234,0.4)] font-medium'
										: 'text-zinc-400 hover:text-zinc-200 hover:bg-purple-950/40'
								}`}
								title={preset.description}
							>
								<Icon className="w-3.5 h-3.5" />
								<span className="hidden sm:inline">{preset.name}</span>
							</button>
						);
					})}
				</div>

				{/* Zoom & Refresh controls */}
				<div className="flex items-center gap-1.5">
					<div className="flex items-center bg-[#150a2b] rounded-lg border border-purple-900/40 px-1 py-0.5">
						<button
							onClick={() => setZoom((prev) => Math.max(50, prev - 15))}
							className="p-1 text-zinc-400 hover:text-zinc-200 cursor-pointer"
							title="Diminuir Zoom"
						>
							<ZoomOut className="w-3.5 h-3.5" />
						</button>
						<span className="text-[10px] font-mono px-1.5 text-purple-300 min-w-[36px] text-center">
							{zoom}%
						</span>
						<button
							onClick={() => setZoom((prev) => Math.min(150, prev + 15))}
							className="p-1 text-zinc-400 hover:text-zinc-200 cursor-pointer"
							title="Aumentar Zoom"
						>
							<ZoomIn className="w-3.5 h-3.5" />
						</button>
					</div>

					<button
						onClick={handleRefresh}
						className="p-1.5 rounded-lg bg-[#150a2b] border border-purple-900/40 text-purple-300 hover:text-purple-100 hover:bg-purple-900/40 cursor-pointer transition-all"
						title="Recarregar Preview"
					>
						<RefreshCw className="w-3.5 h-3.5" />
					</button>

					<a
						href={url}
						target="_blank"
						rel="noreferrer"
						className="p-1.5 rounded-lg bg-[#150a2b] border border-purple-900/40 text-zinc-400 hover:text-zinc-200 cursor-pointer transition-all"
						title="Abrir no Navegador Externo"
					>
						<ExternalLink className="w-3.5 h-3.5" />
					</a>
				</div>
			</div>

			{/* URL Address Bar */}
			<form
				onSubmit={handleNavigate}
				className="flex items-center gap-2 px-3 py-1.5 bg-[#0a0514] border-b border-purple-900/30 text-xs shrink-0"
			>
				<Compass className="w-3.5 h-3.5 text-purple-400 shrink-0" />
				<input
					type="text"
					value={inputUrl}
					onChange={(e) => setInputUrl(e.target.value)}
					placeholder="http://localhost:3000 ou caminho relativo"
					className="flex-1 bg-[#130b24] border border-purple-900/40 rounded-md px-2.5 py-1 text-zinc-200 focus:outline-none focus:border-purple-500 font-mono text-[11px]"
				/>
				<span className="text-[10px] text-zinc-500 font-mono">
					{currentPreset.width} x {currentPreset.height} px
				</span>
			</form>

			{/* Main Canvas Area */}
			<div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-[#07030e] relative">
				{activeDevice === 'android_emulator' ? (
					/* Android Emulator Future Hook Space */
					<div className="relative border-4 border-zinc-800 rounded-[36px] p-3 bg-black shadow-[0_0_30px_rgba(0,0,0,0.8)] flex flex-col items-center justify-center text-center max-w-[340px] h-[580px] border-purple-900/30">
						{/* Top notch */}
						<div className="w-24 h-4 bg-zinc-900 rounded-b-xl mb-auto flex items-center justify-center">
							<div className="w-3 h-3 rounded-full bg-zinc-800" />
						</div>

						<div className="my-auto px-4">
							<div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-[0_0_20px_rgba(147,51,234,0.5)]">
								<Cpu className="w-6 h-6 text-white" />
							</div>
							<h4 className="font-semibold text-zinc-100 text-sm mb-1">Módulo Emulador Android</h4>
							<p className="text-[11px] text-zinc-400 mb-3 leading-relaxed">
								Espaço dedicado e pré-configurado para integração de depuração nativa Android (ADB / AVD Bridge).
							</p>
							<div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/60 border border-purple-500/30 text-purple-300 text-[10px]">
								<span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
								<span>Canal ADB pronto para emparelhamento</span>
							</div>
						</div>

						{/* Home bar */}
						<div className="w-28 h-1 bg-zinc-700 rounded-full mt-auto mb-1" />
					</div>
				) : (
					/* Standard Multi-screen Frame */
					<div
						className="transition-all duration-300 ease-out border border-purple-900/40 rounded-xl overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.6)] bg-white"
						style={{
							width: `${currentPreset.width}px`,
							height: `${currentPreset.height}px`,
							transform: `scale(${zoom / 100})`,
							transformOrigin: 'center center',
						}}
					>
						<iframe
							key={key}
							src={url}
							title="DarkOS Live Preview"
							className="w-full h-full border-none"
							sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
						/>
					</div>
				)}
			</div>
		</div>
	);
};
