/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { registerSingleton, InstantiationType } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';

export interface IFileChangeDiff {
	filePath: string;
	fileName: string;
	originalContent: string;
	modifiedContent: string;
	additions: number;
	deletions: number;
}

export interface IDarkOSCheckpoint {
	id: string;
	hiddenTag: string; // e.g. "darkos://ckpt/1729000000000-xyz"
	title: string;
	timestamp: number;
	author: 'IA Local' | 'Desenvolvedor';
	isBase: boolean; // Ponto de Base (Marco Estável)
	files: Record<string, IFileChangeDiff>;
}

export interface CheckpointsState {
	checkpoints: IDarkOSCheckpoint[];
}

export interface IDarkOSCheckpointService {
	readonly _serviceBrand: undefined;
	readonly state: CheckpointsState;
	onDidChangeState: Event<void>;

	createCheckpoint(
		title: string,
		files: Record<string, { originalContent: string; modifiedContent: string }>,
		author?: 'IA Local' | 'Desenvolvedor',
		isBase?: boolean
	): IDarkOSCheckpoint;

	toggleBaseCheckpoint(id: string): void;
	restoreCheckpoint(id: string, filePathsToRestore?: string[]): Promise<boolean>;
	deleteCheckpoint(id: string): void;
	createBaseCheckpointNow(title?: string): Promise<IDarkOSCheckpoint | null>;
}

export const IDarkOSCheckpointService = createDecorator<IDarkOSCheckpointService>('DarkOSCheckpointService');

export class DarkOSCheckpointService extends Disposable implements IDarkOSCheckpointService {
	readonly _serviceBrand: undefined;

	private readonly _onDidChangeState = new Emitter<void>();
	readonly onDidChangeState: Event<void> = this._onDidChangeState.event;

	private _state: CheckpointsState = {
		checkpoints: [],
	};

	get state(): CheckpointsState {
		return this._state;
	}

	constructor(
		@IFileService private readonly fileService: IFileService,
		@IModelService private readonly modelService: IModelService,
		@IWorkspaceContextService private readonly workspaceContextService: IWorkspaceContextService,
	) {
		super();
		this._register(this._onDidChangeState);
		this._loadInitialCheckpoints();
	}

	private async _loadInitialCheckpoints() {
		// Provide default baseline landmark checkpoint on startup
		if (this._state.checkpoints.length === 0) {
			const initialBase: IDarkOSCheckpoint = {
				id: 'ckpt-base-init',
				hiddenTag: 'darkos://ckpt/init-baseline',
				title: 'Marco Inicial do Projeto (Ponto de Base)',
				timestamp: Date.now(),
				author: 'Desenvolvedor',
				isBase: true,
				files: {},
			};
			this._state.checkpoints.push(initialBase);
			this._onDidChangeState.fire();
		}
	}

	createCheckpoint(
		title: string,
		files: Record<string, { originalContent: string; modifiedContent: string }>,
		author: 'IA Local' | 'Desenvolvedor' = 'IA Local',
		isBase: boolean = false
	): IDarkOSCheckpoint {
		const id = `ckpt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
		const hiddenTag = `darkos://checkpoint/${id}`;

		const processedFiles: Record<string, IFileChangeDiff> = {};

		for (const [filePath, content] of Object.entries(files)) {
			const fileName = filePath.split(/[\\/]/).pop() || filePath;
			const origLines = (content.originalContent || '').split('\n').length;
			const modLines = (content.modifiedContent || '').split('\n').length;
			const diff = modLines - origLines;

			processedFiles[filePath] = {
				filePath,
				fileName,
				originalContent: content.originalContent,
				modifiedContent: content.modifiedContent,
				additions: Math.max(0, diff),
				deletions: Math.max(0, -diff),
			};
		}

		const checkpoint: IDarkOSCheckpoint = {
			id,
			hiddenTag,
			title,
			timestamp: Date.now(),
			author,
			isBase,
			files: processedFiles,
		};

		this._state = {
			checkpoints: [checkpoint, ...this._state.checkpoints],
		};

		this._onDidChangeState.fire();
		return checkpoint;
	}

	toggleBaseCheckpoint(id: string): void {
		const ckpt = this._state.checkpoints.find((c) => c.id === id);
		if (ckpt) {
			ckpt.isBase = !ckpt.isBase;
			this._state = {
				checkpoints: [...this._state.checkpoints],
			};
			this._onDidChangeState.fire();
		}
	}

	deleteCheckpoint(id: string): void {
		this._state = {
			checkpoints: this._state.checkpoints.filter((c) => c.id !== id),
		};
		this._onDidChangeState.fire();
	}

	async restoreCheckpoint(id: string, filePathsToRestore?: string[]): Promise<boolean> {
		const ckpt = this._state.checkpoints.find((c) => c.id === id);
		if (!ckpt) return false;

		const filesToProcess = filePathsToRestore && filePathsToRestore.length > 0
			? filePathsToRestore.filter((fp) => fp in ckpt.files)
			: Object.keys(ckpt.files);

		for (const filePath of filesToProcess) {
			const fileDiff = ckpt.files[filePath];
			if (!fileDiff) continue;

			try {
				const uri = filePath.startsWith('file:') ? URI.parse(filePath) : URI.file(filePath);

				// Update memory model in active editor if open
				const textModel = this.modelService.getModel(uri);
				if (textModel) {
					textModel.setValue(fileDiff.originalContent);
				}

				// Write back to filesystem
				await this.fileService.writeFile(uri, VSBuffer.fromString(fileDiff.originalContent));
			} catch (err) {
				console.error(`Failed to restore file ${filePath}:`, err);
			}
		}

		// Record a restore checkpoint tracking this manual rollback action
		const restoredCount = filesToProcess.length;
		this.createCheckpoint(
			`Restauração seletiva para: "${ckpt.title}" (${restoredCount} arquivo${restoredCount === 1 ? '' : 's'})`,
			{},
			'Desenvolvedor',
			false
		);

		return true;
	}

	async createBaseCheckpointNow(title?: string): Promise<IDarkOSCheckpoint | null> {
		const models = this.modelService.getModels();
		const files: Record<string, { originalContent: string; modifiedContent: string }> = {};

		for (const model of models) {
			if (model.uri.scheme === 'file') {
				const path = model.uri.fsPath;
				const content = model.getValue();
				files[path] = {
					originalContent: content,
					modifiedContent: content,
				};
			}
		}

		return this.createCheckpoint(
			title || `Marco Estável de Base (${new Date().toLocaleTimeString('pt-BR')})`,
			files,
			'Desenvolvedor',
			true
		);
	}
}

registerSingleton(IDarkOSCheckpointService, DarkOSCheckpointService, InstantiationType.Eager);
