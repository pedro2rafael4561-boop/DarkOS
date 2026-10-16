/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import Severity from '../../../../base/common/severity.js';
import { ServicesAccessor } from '../../../../editor/browser/editorExtensions.js';
import { localize2 } from '../../../../nls.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { INotificationActions, INotificationHandle, INotificationService } from '../../../../platform/notification/common/notification.js';
import { IMetricsService } from '../common/metricsService.js';
import { IVoidUpdateService } from '../common/darkosUpdateService.js';
import { IWorkbenchContribution, registerWorkbenchContribution2, WorkbenchPhase } from '../../../common/contributions.js';
import * as dom from '../../../../base/browser/dom.js';
import { IUpdateService } from '../../../../platform/update/common/update.js';
import { VoidCheckUpdateRespose } from '../common/darkosUpdateServiceTypes.js';
import { IAction } from '../../../../base/common/actions.js';




const notifyUpdate = (res: VoidCheckUpdateRespose & { message: string }, notifService: INotificationService, updateService: IUpdateService): INotificationHandle => {
	const message = res?.message || 'Uma atualização do DarkOS está pronta para ser baixada ou aplicada!'

	let actions: INotificationActions | undefined

	if (res?.action) {
		const primary: IAction[] = []

		if (res.action === 'reinstall') {
			primary.push({
				label: `Baixar Atualização`,
				id: 'darkos.updater.reinstall',
				enabled: true,
				tooltip: '',
				class: undefined,
				run: () => {
					const { window } = dom.getActiveWindow()
					window.open('https://github.com/pedro2rafael4561-boop/DarkOS-binaries/releases')
				}
			})
		}

		if (res.action === 'download') {
			primary.push({
				label: `Baixar`,
				id: 'darkos.updater.download',
				enabled: true,
				tooltip: '',
				class: undefined,
				run: () => {
					updateService.downloadUpdate()
				}
			})
		}


		if (res.action === 'apply') {
			primary.push({
				label: `Aplicar`,
				id: 'darkos.updater.apply',
				enabled: true,
				tooltip: '',
				class: undefined,
				run: () => {
					updateService.applyUpdate()
				}
			})
		}

		if (res.action === 'restart') {
			primary.push({
				label: `Reiniciar`,
				id: 'darkos.updater.restart',
				enabled: true,
				tooltip: '',
				class: undefined,
				run: () => {
					updateService.quitAndInstall()
				}
			})
		}

		primary.push({
			id: 'darkos.updater.site',
			enabled: true,
			label: `Página do DarkOS`,
			tooltip: '',
			class: undefined,
			run: () => {
				const { window } = dom.getActiveWindow()
				window.open('https://github.com/pedro2rafael4561-boop/DarkOS')
			}
		})

		actions = {
			primary: primary,
			secondary: [{
				id: 'darkos.updater.close',
				enabled: true,
				label: `Manter versão atual`,
				tooltip: '',
				class: undefined,
				run: () => {
					notifController.close()
				}
			}]
		}
	}
	else {
		actions = undefined
	}

	const notifController = notifService.notify({
		severity: Severity.Info,
		message: message,
		sticky: true,
		progress: actions ? { worked: 0, total: 100 } : undefined,
		actions: actions,
	})

	return notifController
}
const notifyErrChecking = (notifService: INotificationService): INotificationHandle => {
	const message = `DarkOS: Ocorreu um erro ao verificar novas atualizações. Tente novamente mais tarde ou acesse as versões [aqui](https://github.com/pedro2rafael4561-boop/DarkOS-binaries/releases).`
	const notifController = notifService.notify({
		severity: Severity.Info,
		message: message,
		sticky: true,
	})
	return notifController
}


const performVoidCheck = async (
	explicit: boolean,
	notifService: INotificationService,
	darkosUpdateService: IVoidUpdateService,
	metricsService: IMetricsService,
	updateService: IUpdateService,
): Promise<INotificationHandle | null> => {

	const metricsTag = explicit ? 'Manual' : 'Auto'

	metricsService.capture(`DarkOS Update ${metricsTag}: Checking...`, {})
	const res = await darkosUpdateService.check(explicit)
	if (!res) {
		const notifController = notifyErrChecking(notifService);
		metricsService.capture(`DarkOS Update ${metricsTag}: Error`, { res })
		return notifController
	}
	else {
		if (res.message) {
			const notifController = notifyUpdate(res, notifService, updateService)
			metricsService.capture(`DarkOS Update ${metricsTag}: Yes`, { res })
			return notifController
		}
		else {
			metricsService.capture(`DarkOS Update ${metricsTag}: No`, { res })
			return null
		}
	}
}


// Action
let lastNotifController: INotificationHandle | null = null


registerAction2(class extends Action2 {
	constructor() {
		super({
			f1: true,
			id: 'darkos.checkUpdate',
			title: localize2('darkosCheckUpdate', 'DarkOS: Verificar Atualizações'),
		});
	}
	async run(accessor: ServicesAccessor): Promise<void> {
		const darkosUpdateService = accessor.get(IVoidUpdateService)
		const notifService = accessor.get(INotificationService)
		const metricsService = accessor.get(IMetricsService)
		const updateService = accessor.get(IUpdateService)

		const currNotifController = lastNotifController

		const newController = await performVoidCheck(true, notifService, darkosUpdateService, metricsService, updateService)

		if (newController) {
			currNotifController?.close()
			lastNotifController = newController
		}
	}
})

// on mount
class VoidUpdateWorkbenchContribution extends Disposable implements IWorkbenchContribution {
	static readonly ID = 'workbench.contrib.void.voidUpdate'
	constructor(
		@IVoidUpdateService darkosUpdateService: IVoidUpdateService,
		@IMetricsService metricsService: IMetricsService,
		@INotificationService notifService: INotificationService,
		@IUpdateService updateService: IUpdateService,
	) {
		super()

		const autoCheck = () => {
			performVoidCheck(false, notifService, darkosUpdateService, metricsService, updateService)
		}

		// check once 5 seconds after mount
		// check every 3 hours
		const { window } = dom.getActiveWindow()

		const initId = window.setTimeout(() => autoCheck(), 5 * 1000)
		this._register({ dispose: () => window.clearTimeout(initId) })


		const intervalId = window.setInterval(() => autoCheck(), 3 * 60 * 60 * 1000) // every 3 hrs
		this._register({ dispose: () => window.clearInterval(intervalId) })

	}
}
registerWorkbenchContribution2(VoidUpdateWorkbenchContribution.ID, VoidUpdateWorkbenchContribution, WorkbenchPhase.BlockRestore);
