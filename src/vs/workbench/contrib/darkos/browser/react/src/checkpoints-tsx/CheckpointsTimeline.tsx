/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import React, { useState, useMemo } from 'react';
import { useAccessor, useCheckpointsState } from '../util/services.js';
import {
	History,
	Pin,
	Bookmark,
	RotateCcw,
	Eye,
	CheckSquare,
	Square,
	FileCode,
	Sparkles,
	User,
	Plus,
	Trash2,
	ChevronRight,
	X,
	Check,
	Lock,
	Tag,
} from 'lucide-react';
import { IDarkOSCheckpoint, IFileChangeDiff } from '../../../../darkosCheckpointService.js';

export const CheckpointsTimeline = () => {
	const accessor = useAccessor();
	const checkpointService = accessor.IDarkOSCheckpointService;
	const checkpointsState = useCheckpointsState();

	const [filterBaseOnly, setFilterBaseOnly] = useState(false);
	const [activeDiffFile, setActiveDiffFile] = useState<{
		checkpointTitle: string;
		file: IFileChangeDiff;
	} | null>(null);

	// Map of checkpointId -> Set of selected filePaths to restore
	const [selectedFilesByCheckpoint, setSelectedFilesByCheckpoint] = useState<Record<string, Set<string>>>({});
	const [statusMessage, setStatusMessage] = useState<string | null>(null);

	const checkpoints = checkpointsState.checkpoints || [];

	const filteredCheckpoints = useMemo(() => {
		if (filterBaseOnly) {
			return checkpoints.filter((c) => c.isBase);
		}
		return checkpoints;
	}, [checkpoints, filterBaseOnly]);

	const baseCount = useMemo(() => checkpoints.filter((c) => c.isBase).length, [checkpoints]);

	// Initialize file selection when looking at a checkpoint
	const isFileSelected = (ckptId: string, filePath: string): boolean => {
		const set = selectedFilesByCheckpoint[ckptId];
		if (!set) return true; // Default: all files selected
		return set.has(filePath);
	};

	const toggleFileSelection = (ckptId: string, filePath: string, totalFiles: string[]) => {
		setSelectedFilesByCheckpoint((prev) => {
			const currentSet = prev[ckptId] ? new Set(prev[ckptId]) : new Set(totalFiles);
			if (currentSet.has(filePath)) {
				currentSet.delete(filePath);
			} else {
				currentSet.add(filePath);
			}
			return {
				...prev,
				[ckptId]: currentSet,
			};
		});
	};

	const handleCreateBaseNow = async () => {
		const ckpt = await checkpointService.createBaseCheckpointNow();
		if (ckpt) {
			setStatusMessage(`Marco Estável de Base criado com sucesso!`);
			setTimeout(() => setStatusMessage(null), 3000);
		}
	};

	const handleRestore = async (ckpt: IDarkOSCheckpoint) => {
		const allFilePaths = Object.keys(ckpt.files);
		const selectedSet = selectedFilesByCheckpoint[ckpt.id];
		const filesToRestore = selectedSet ? Array.from(selectedSet) : allFilePaths;

		if (filesToRestore.length === 0) {
			setStatusMessage('Selecione pelo menos um arquivo para restaurar.');
			setTimeout(() => setStatusMessage(null), 3000);
			return;
		}

		const success = await checkpointService.restoreCheckpoint(ckpt.id, filesToRestore);
		if (success) {
			const keptCount = allFilePaths.length - filesToRestore.length;
			setStatusMessage(
				`Restauração concluída! ${filesToRestore.length} arquivo(s) revertidos${
					keptCount > 0 ? `, ${keptCount} arquivo(s) mantidos intactos.` : '.'
				}`
			);
			setTimeout(() => setStatusMessage(null), 4000);
		}
	};

	const formatTime = (ts: number) => {
		const d = new Date(ts);
		return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
	};

	const formatDate = (ts: number) => {
		const d = new Date(ts);
		return d.toLocaleDateString('pt-BR');
	};

	return (
		<div className="flex flex-col h-full w-full bg-[#0d0718] text-zinc-100 overflow-y-auto p-4 space-y-4 custom-scrollbar">
			{/* Top Header */}
			<div className="flex items-center justify-between border-b border-purple-900/30 pb-3">
				<div className="flex items-center gap-2.5">
					<div className="p-2 rounded-xl bg-purple-950/60 border border-purple-500/40 text-purple-300 shadow-[0_0_15px_rgba(157,78,221,0.3)]">
						<History className="w-5 h-5 text-purple-300" />
					</div>
					<div>
						<h2 className="text-base font-semibold text-white tracking-tight flex items-center gap-1.5">
							Linha do Tempo <span className="text-[10px] bg-purple-900/60 text-purple-300 px-2 py-0.5 rounded-full border border-purple-700/40">Checkpoints</span>
						</h2>
						<p className="text-[11px] text-zinc-400">Micro-pontos automáticos com reversão seletiva por arquivo.</p>
					</div>
				</div>

				{/* Quick Button to Create Base Checkpoint */}
				<button
					onClick={handleCreateBaseNow}
					className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-[0_0_12px_rgba(157,78,221,0.3)] cursor-pointer transition-all shrink-0"
				>
					<Plus className="w-3.5 h-3.5" /> Criar Marco Base
				</button>
			</div>

			{/* Filters Bar */}
			<div className="flex items-center justify-between text-xs">
				<div className="flex items-center gap-2">
					<button
						onClick={() => setFilterBaseOnly(false)}
						className={`px-3 py-1 rounded-full font-medium transition-all cursor-pointer ${
							!filterBaseOnly
								? 'bg-purple-900/50 text-white border border-purple-500/50'
								: 'bg-zinc-900/50 text-zinc-400 hover:text-white'
						}`}
					>
						Todos ({checkpoints.length})
					</button>

					<button
						onClick={() => setFilterBaseOnly(true)}
						className={`flex items-center gap-1 px-3 py-1 rounded-full font-medium transition-all cursor-pointer ${
							filterBaseOnly
								? 'bg-purple-900/50 text-white border border-purple-500/50'
								: 'bg-zinc-900/50 text-zinc-400 hover:text-white'
						}`}
					>
						<Pin className="w-3 h-3 text-amber-400 fill-amber-400" /> Marcos Base ({baseCount})
					</button>
				</div>

				{statusMessage && (
					<span className="text-[11px] text-emerald-300 font-medium animate-fadeIn">{statusMessage}</span>
				)}
			</div>

			{/* Timeline Cards Stream */}
			<div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-gradient-to-b before:from-purple-500 before:via-purple-800 before:to-zinc-800">
				{filteredCheckpoints.map((ckpt) => {
					const fileKeys = Object.keys(ckpt.files);
					const hasFiles = fileKeys.length > 0;
					const selectedCount = fileKeys.filter((fp) => isFileSelected(ckpt.id, fp)).length;

					return (
						<div
							key={ckpt.id}
							className={`relative bg-zinc-900/60 border rounded-xl p-3.5 space-y-3 transition-all ${
								ckpt.isBase
									? 'border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.15)] bg-gradient-to-br from-amber-950/10 to-zinc-900/60'
									: 'border-purple-900/30 hover:border-purple-700/40'
							}`}
						>
							{/* Timeline Node Dot */}
							<div
								className={`absolute -left-[27px] top-4 w-3.5 h-3.5 rounded-full border-2 transition-all ${
									ckpt.isBase
										? 'bg-amber-400 border-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.6)]'
										: 'bg-purple-600 border-purple-400 shadow-[0_0_8px_rgba(157,78,221,0.5)]'
								}`}
							/>

							{/* Card Header */}
							<div className="flex items-start justify-between gap-2">
								<div className="space-y-0.5">
									<div className="flex items-center gap-2">
										{ckpt.isBase && (
											<span className="flex items-center gap-1 text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
												<Pin className="w-2.5 h-2.5 fill-amber-400" /> Ponto de Base
											</span>
										)}
										<span className="text-[11px] text-zinc-400 font-mono">
											{formatDate(ckpt.timestamp)} às {formatTime(ckpt.timestamp)}
										</span>
									</div>

									<h3 className="text-sm font-semibold text-white leading-snug">{ckpt.title}</h3>

									<div className="flex items-center gap-2 text-[11px] text-zinc-400">
										<span className="flex items-center gap-1">
											{ckpt.author === 'IA Local' ? (
												<Sparkles className="w-3 h-3 text-purple-400" />
											) : (
												<User className="w-3 h-3 text-zinc-400" />
											)}
											{ckpt.author}
										</span>
										<span>•</span>
										<span className="font-mono text-[10px] text-purple-400/80">{ckpt.hiddenTag}</span>
									</div>
								</div>

								{/* Toggle Base Landmark Button */}
								<button
									onClick={() => checkpointService.toggleBaseCheckpoint(ckpt.id)}
									title={ckpt.isBase ? 'Remover Ponto de Base' : 'Marcar como Ponto de Base'}
									className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
										ckpt.isBase
											? 'bg-amber-950/40 border-amber-500/50 text-amber-300'
											: 'bg-zinc-800/40 border-zinc-700/40 text-zinc-400 hover:text-white'
									}`}
								>
									<Pin className={`w-3.5 h-3.5 ${ckpt.isBase ? 'fill-amber-400' : ''}`} />
								</button>
							</div>

							{/* File Changes List with Selective Checkboxes */}
							{hasFiles && (
								<div className="space-y-1.5 pt-1 border-t border-purple-900/20">
									<div className="text-[11px] font-medium text-zinc-400 flex items-center justify-between">
										<span>Arquivos Modificados (Descarte Seletivo):</span>
										<span className="text-purple-300 font-mono text-[10px]">
											{selectedCount} de {fileKeys.length} selecionados
										</span>
									</div>

									<div className="space-y-1">
										{fileKeys.map((filePath) => {
											const fileDiff = ckpt.files[filePath];
											const selected = isFileSelected(ckpt.id, filePath);

											return (
												<div
													key={filePath}
													className="flex items-center justify-between bg-black/40 border border-zinc-800/60 rounded-lg px-2.5 py-1.5 text-xs group hover:border-purple-800/50 transition-all"
												>
													<div
														onClick={() => toggleFileSelection(ckpt.id, filePath, fileKeys)}
														className="flex items-center gap-2 cursor-pointer truncate max-w-[240px]"
													>
														{selected ? (
															<CheckSquare className="w-3.5 h-3.5 text-purple-400 shrink-0" />
														) : (
															<Square className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
														)}
														<FileCode className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
														<span
															className={`truncate ${
																selected ? 'text-zinc-200 font-medium' : 'text-zinc-500 line-through'
															}`}
														>
															{fileDiff.fileName}
														</span>
													</div>

													<div className="flex items-center gap-2">
														{/* Additions / Deletions count */}
														<div className="flex items-center gap-1 text-[10px] font-mono">
															{fileDiff.additions > 0 && (
																<span className="text-emerald-400">+{fileDiff.additions}</span>
															)}
															{fileDiff.deletions > 0 && (
																<span className="text-rose-400">-{fileDiff.deletions}</span>
															)}
														</div>

														{/* View Diff Button */}
														<button
															onClick={() => setActiveDiffFile({ checkpointTitle: ckpt.title, file: fileDiff })}
															title="Comparar Antes / Depois"
															className="p-1 rounded bg-zinc-800/80 hover:bg-purple-900/50 text-zinc-300 hover:text-purple-200 transition-all cursor-pointer"
														>
															<Eye className="w-3 h-3" />
														</button>
													</div>
												</div>
											);
										})}
									</div>
								</div>
							)}

							{/* Actions: Selective Restore & Delete */}
							<div className="flex items-center justify-between pt-1 border-t border-purple-900/20">
								{hasFiles ? (
									<button
										onClick={() => handleRestore(ckpt)}
										className="px-3 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-600 text-white font-medium text-xs flex items-center gap-1.5 shadow-[0_0_12px_rgba(157,78,221,0.3)] cursor-pointer transition-all"
									>
										<RotateCcw className="w-3 h-3" />
										<span>
											Reverter {selectedCount} arquivo{selectedCount === 1 ? '' : 's'} selecionado{selectedCount === 1 ? '' : 's'}
										</span>
									</button>
								) : (
									<span className="text-[11px] text-zinc-500 italic">Marco de referência</span>
								)}

								<button
									onClick={() => checkpointService.deleteCheckpoint(ckpt.id)}
									title="Excluir ponto"
									className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 transition-all cursor-pointer"
								>
									<Trash2 className="w-3 h-3" />
								</button>
							</div>
						</div>
					);
				})}
			</div>

			{/* Modal de Diff Antes / Depois */}
			{activeDiffFile && (
				<div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
					<div className="bg-[#0f0a1c] border border-purple-700/50 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-[0_0_50px_rgba(157,78,221,0.3)]">
						{/* Modal Header */}
						<div className="flex items-center justify-between p-4 border-b border-purple-900/40">
							<div className="space-y-0.5">
								<div className="text-xs text-purple-300 font-mono">Comparação Antes / Depois</div>
								<h3 className="text-sm font-semibold text-white">{activeDiffFile.file.fileName}</h3>
							</div>
							<button
								onClick={() => setActiveDiffFile(null)}
								className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer"
							>
								<X className="w-4 h-4" />
							</button>
						</div>

						{/* Diff Side-by-Side Content */}
						<div className="flex-1 overflow-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
							{/* Original (Before) */}
							<div className="space-y-1.5">
								<div className="text-[11px] font-semibold text-rose-400 flex items-center gap-1 bg-rose-950/30 px-2 py-1 rounded border border-rose-800/40">
									<span>🔴 Antes (Original)</span>
								</div>
								<pre className="p-3 bg-zinc-950 rounded-xl border border-zinc-900 text-rose-200/90 whitespace-pre-wrap overflow-auto max-h-[50vh] text-[11px]">
									{activeDiffFile.file.originalContent || '(arquivo vazio)'}
								</pre>
							</div>

							{/* Modified (After) */}
							<div className="space-y-1.5">
								<div className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1 bg-emerald-950/30 px-2 py-1 rounded border border-emerald-800/40">
									<span>🟢 Depois (Modificado por IA)</span>
								</div>
								<pre className="p-3 bg-zinc-950 rounded-xl border border-zinc-900 text-emerald-200/90 whitespace-pre-wrap overflow-auto max-h-[50vh] text-[11px]">
									{activeDiffFile.file.modifiedContent || '(arquivo vazio)'}
								</pre>
							</div>
						</div>

						{/* Modal Footer */}
						<div className="flex items-center justify-between p-3.5 border-t border-purple-900/40 bg-purple-950/20">
							<span className="text-[11px] text-zinc-400">
								Linhas alteradas: +{activeDiffFile.file.additions} / -{activeDiffFile.file.deletions}
							</span>
							<button
								onClick={() => setActiveDiffFile(null)}
								className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-white transition-all cursor-pointer"
							>
								Fechar
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
