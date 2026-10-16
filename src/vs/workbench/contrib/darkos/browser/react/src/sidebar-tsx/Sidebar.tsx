import React, { useState } from 'react';
import { useIsDark } from '../util/services.js';
import { MessageSquare, Terminal } from 'lucide-react';
import '../styles.css';
import { SidebarChat } from './SidebarChat.js';
import { SmartTerminal } from '../smart-terminal-tsx/SmartTerminal.js';
import ErrorBoundary from './ErrorBoundary.js';

export type SidebarTab = 'chat' | 'terminal';

export const Sidebar = ({ className }: { className?: string }) => {
	const isDark = useIsDark();
	const [activeTab, setActiveTab] = useState<SidebarTab>('chat');

	return (
		<div
			className={`@@void-scope ${isDark ? 'dark' : ''} ${className || ''}`}
			style={{ width: '100%', height: '100%' }}
		>
			<div className="w-full h-full bg-[#0d0718] text-zinc-100 flex flex-col">
				{/* Top Switcher Bar */}
				<div className="flex items-center justify-around border-b border-purple-900/40 bg-[#0a0514] px-2 py-1.5 text-xs shrink-0">
					<button
						onClick={() => setActiveTab('chat')}
						className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
							activeTab === 'chat'
								? 'bg-purple-900/50 text-white border border-purple-500/40 shadow-[0_0_10px_rgba(157,78,221,0.25)]'
								: 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
						}`}
					>
						<MessageSquare className="w-3.5 h-3.5 text-purple-400" />
						<span>Chat & Agente</span>
					</button>

					<button
						onClick={() => setActiveTab('terminal')}
						className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
							activeTab === 'terminal'
								? 'bg-purple-900/50 text-white border border-purple-500/40 shadow-[0_0_10px_rgba(157,78,221,0.25)]'
								: 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
						}`}
					>
						<Terminal className="w-3.5 h-3.5 text-purple-400" />
						<span>Terminal Inteligente</span>
					</button>
				</div>

				{/* Content Pane */}
				<div className="flex-1 overflow-hidden">
					<ErrorBoundary>
						{activeTab === 'chat' && <SidebarChat />}
						{activeTab === 'terminal' && <SmartTerminal />}
					</ErrorBoundary>
				</div>
			</div>
		</div>
	);
};

