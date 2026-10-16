/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import { IServerChannel } from '../../../../base/parts/ipc/common/ipc.js';
import { Emitter, Event } from '../../../../base/common/event.js';

const execAsync = promisify(exec);

export type HardwareInfo = {
	totalRamGB: number;
	freeRamGB: number;
	gpuName: string;
	recommendedModel: string;
	modelDescription: string;
};

export type OllamaStatus = {
	installed: boolean;
	running: boolean;
	models: string[];
};

export type PullProgressEvent = {
	status: string;
	completed?: number;
	total?: number;
	percent?: number;
	error?: string;
	done?: boolean;
};

export class DarkOSAiPrepChannel implements IServerChannel {

	private readonly _onPullProgress = new Emitter<PullProgressEvent>();
	readonly onPullProgress: Event<PullProgressEvent> = this._onPullProgress.event;

	private _abortController: AbortController | null = null;
	private _isPaused: boolean = false;

	listen<T>(_: unknown, event: string): Event<T> {
		if (event === 'onPullProgress') {
			return this.onPullProgress as unknown as Event<T>;
		}
		throw new Error(`Event not found: ${event}`);
	}

	async call(_: unknown, command: string, args?: any): Promise<any> {
		switch (command) {
			case 'detectHardware':
				return this.detectHardware();
			case 'checkOllama':
				return this.checkOllama();
			case 'installOllama':
				return this.installOllama();
			case 'startOllama':
				return this.startOllama();
			case 'pullModel':
				return this.pullModel(args?.modelName);
			case 'pausePull':
				return this.pausePull();
			case 'resumePull':
				return this.resumePull(args?.modelName);
			default:
				throw new Error(`Command not found: ${command}`);
		}
	}

	async detectHardware(): Promise<HardwareInfo> {
		const totalRamGB = Math.round((os.totalmem() / (1024 ** 3)) * 10) / 10;
		const freeRamGB = Math.round((os.freemem() / (1024 ** 3)) * 10) / 10;

		let gpuName = 'Processador / Gráficos Integrados';
		try {
			if (process.platform === 'win32') {
				const { stdout } = await execAsync('powershell -NoProfile -Command "(Get-CimInstance Win32_VideoController | Select-Object -ExpandProperty Name)"');
				const lines = stdout.trim().split(/\r?\n/).map(l => l.trim()).filter(Boolean);
				// Prefer dedicated GPU if multiple
				const dedicated = lines.find(l => /nvidia|geforce|rtx|gtx|radeon|rx/i.test(l));
				if (dedicated) {
					gpuName = dedicated;
				} else if (lines.length > 0) {
					gpuName = lines[0];
				}
			} else if (process.platform === 'darwin') {
				const { stdout } = await execAsync('system_profiler SPDisplaysDataType');
				const m = stdout.match(/Chipset Model:\s*(.*)/i);
				if (m && m[1]) gpuName = m[1].trim();
			} else {
				const { stdout } = await execAsync('lspci | grep -i vga');
				if (stdout) gpuName = stdout.trim();
			}
		} catch {
			// fallback
		}

		const isDedicatedGpu = /nvidia|rtx|gtx|radeon/i.test(gpuName);
		let recommendedModel = 'qwen2.5-coder:1.5b';
		let modelDescription = 'Modelo leve e veloz para autocompletar e chat local sem travamentos.';

		if (totalRamGB >= 16 && isDedicatedGpu) {
			recommendedModel = 'qwen2.5-coder:7b';
			modelDescription = 'Modelo completo de alto desempenho para geração e refatoração de código com aceleração por GPU.';
		} else if (totalRamGB >= 12) {
			recommendedModel = 'qwen2.5-coder:3b';
			modelDescription = 'Equilíbrio ideal entre inteligência e velocidade para edição e raciocínio de código.';
		}

		return {
			totalRamGB,
			freeRamGB,
			gpuName,
			recommendedModel,
			modelDescription,
		};
	}

	async checkOllama(): Promise<OllamaStatus> {
		try {
			const res = await fetch('http://127.0.0.1:11434/api/tags');
			if (res.ok) {
				const data = (await res.json()) as { models?: Array<{ name: string }> };
				const models = (data.models || []).map(m => m.name);
				return { installed: true, running: true, models };
			}
		} catch {
			// not running or not installed
		}

		const localExe = this._getOllamaExePath();
		const installed = localExe !== null;

		return { installed, running: false, models: [] };
	}

	private _getOllamaExePath(): string | null {
		if (process.platform === 'win32') {
			const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
			const standardPath = path.join(localAppData, 'Programs', 'Ollama', 'ollama.exe');
			if (fs.existsSync(standardPath)) return standardPath;
		}
		return null;
	}

	async startOllama(): Promise<boolean> {
		const exePath = this._getOllamaExePath();
		if (!exePath) return false;

		try {
			const child = spawn(exePath, ['serve'], {
				detached: true,
				stdio: 'ignore',
			});
			child.unref();

			// Wait up to 5 seconds for Ollama API to respond
			for (let i = 0; i < 10; i++) {
				await new Promise(r => setTimeout(r, 500));
				try {
					const res = await fetch('http://127.0.0.1:11434/api/tags');
					if (res.ok) return true;
				} catch {}
			}
		} catch {}
		return false;
	}

	async installOllama(): Promise<{ success: boolean; error?: string }> {
		if (process.platform !== 'win32') {
			return { success: false, error: 'Instalação automática no momento configurada para Windows.' };
		}

		try {
			const installerUrl = 'https://ollama.com/download/OllamaSetup.exe';
			const tempDir = os.tmpdir();
			const installerPath = path.join(tempDir, 'OllamaSetup.exe');

			this._onPullProgress.fire({
				status: 'Baixando instalador do motor de IA local...',
				percent: 10,
			});

			const response = await fetch(installerUrl);
			if (!response.ok) {
				return { success: false, error: `Falha ao baixar instalador: status ${response.status}` };
			}

			const buffer = await response.arrayBuffer();
			await fs.promises.writeFile(installerPath, Buffer.from(buffer));

			this._onPullProgress.fire({
				status: 'Instalando motor de IA local silenciosamente...',
				percent: 40,
			});

			await execAsync(`"${installerPath}" /silent`);

			this._onPullProgress.fire({
				status: 'Iniciando serviço local...',
				percent: 70,
			});

			await this.startOllama();

			this._onPullProgress.fire({
				status: 'Motor de IA pronto!',
				percent: 100,
			});

			return { success: true };
		} catch (err: any) {
			return { success: false, error: err?.message || String(err) };
		}
	}

	async pullModel(modelName: string): Promise<boolean> {
		this._isPaused = false;
		this._abortController = new AbortController();

		try {
			const res = await fetch('http://127.0.0.1:11434/api/pull', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: modelName, stream: true }),
				signal: this._abortController.signal,
			});

			if (!res.ok || !res.body) {
				this._onPullProgress.fire({
					status: 'Erro',
					error: `Não foi possível iniciar o download do modelo (${res.statusText}). Verifique sua conexão.`,
				});
				return false;
			}

			const reader = (res.body as any).getReader();
			const decoder = new TextDecoder('utf-8');
			let buffer = '';

			while (true) {
				if (this._isPaused) {
					this._onPullProgress.fire({ status: 'Pausado' });
					return false;
				}

				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split('\n');
				buffer = lines.pop() || '';

				for (const line of lines) {
					const trimmed = line.trim();
					if (!trimmed) continue;
					try {
						const json = JSON.parse(trimmed);
						let percent = 0;
						if (json.total && json.completed) {
							percent = Math.round((json.completed / json.total) * 100);
						}

						this._onPullProgress.fire({
							status: json.status || 'Baixando...',
							completed: json.completed,
							total: json.total,
							percent,
							done: json.status === 'success',
						});

						if (json.status === 'success') {
							return true;
						}
					} catch {}
				}
			}

			this._onPullProgress.fire({ status: 'Modelo instalado com sucesso!', done: true, percent: 100 });
			return true;
		} catch (err: any) {
			if (this._isPaused) {
				this._onPullProgress.fire({ status: 'Pausado' });
				return false;
			}
			this._onPullProgress.fire({
				status: 'Erro no download',
				error: 'Ocorreu uma falha no download. Clique em Tentar Novamente para continuar.',
			});
			return false;
		}
	}

	pausePull(): void {
		this._isPaused = true;
		if (this._abortController) {
			this._abortController.abort();
			this._abortController = null;
		}
	}

	async resumePull(modelName: string): Promise<boolean> {
		return this.pullModel(modelName);
	}
}
