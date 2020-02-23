'use strict';
'require rpc';
'require fs';
'require ui';

return L.view.extend({
	callInitList: rpc.declare({
		object: 'luci',
		method: 'getInitList',
		expect: { '': {} }
	}),

	callInitAction: rpc.declare({
		object: 'luci',
		method: 'setInitAction',
		params: [ 'name', 'action' ],
		expect: { result: false }
	}),

	load: function() {
		return Promise.all([
			L.resolveDefault(fs.read('/etc/rc.local'), ''),
			this.callInitList()
		]);
	},

	handleAction: function(name, action, ev) {
		return this.callInitAction(name, action).then(function(success) {
			if (success != true)
				throw _('Command failed');

			return true;
		}).catch(function(e) {
			ui.addNotification(null, E('p', _('Failed to execute "/etc/init.d/%s %s" action: %s').format(name, action, e)));
		});
	},

	handleAutostartEnableDisable: function(name, isEnabled, ev) {
		return this.handleAction(name, isEnabled ? 'disable' : 'enable', ev).then(L.bind(function(name, isEnabled, cell) {
			L.dom.content(cell.parentNode, this.renderAutostart({
				name: name,
				enabled: isEnabled
			}));
		}, this, name, !isEnabled, ev.currentTarget.parentNode));
	},

	handleRcLocalSave: function(ev) {
		var value = (document.querySelector('textarea').value || '').trim().replace(/\r\n/g, '\n') + '\n';

		return fs.write('/etc/rc.local', value).then(function() {
			document.querySelector('textarea').value = value;
			ui.addNotification(null, E('p', _('Contents have been saved.')), 'info');
		}).catch(function(e) {
			ui.addNotification(null, E('p', _('Unable to save contents: %s').format(e.message)));
		});
	},

	renderAutostart: function(init) {
		var checkBox = E('input', {
			'type': 'checkbox',
			'value': '1',
			'id': 'init-' + init.name,
			'click': ui.createHandlerFn(this, 'handleAutostartEnableDisable', init.name, init.enabled)
		});

		if (init.enabled)
			checkBox.setAttribute('checked', 'true');

		return E('div', { 'style': 'display: flex; align-items: center;' }, [
			checkBox,
			E('label', { 'style': 'padding-left: 4px;', 'for': 'init-' + init.name }, [
				init.enabled ? E('span', { 'class': 'label notice' }, _('Enabled', 'Autostart status')) :
				               E('span', { 'class': 'label' }, _('Disabled', 'Autostart status'))
			])
		]);
	},

	render: function(data) {
		var rcLocal = data[0],
		    initList = data[1],
		    rows = [], list = [];

		var table = E('div', { 'class': 'table' }, [
			E('div', { 'class': 'tr table-titles' }, [
				E('div', { 'class': 'th top' }, _('Start priority')),
				E('div', { 'class': 'th top' }, _('Initscript')),
				E('div', { 'class': 'th top' }, _('Autostart')),
				E('div', { 'class': 'th top cbi-section-actions' }, _('Actions'))
			])
		]);

		for (var init in initList)
			if (initList[init].index < 100)
				list.push(Object.assign({ name: init }, initList[init]));

		list.sort(function(a, b) {
			if (a.index != b.index)
				return a.index - b.index

			return a.name > b.name;
		});

		for (var i = 0; i < list.length; i++) {
			rows.push([
				'%02d'.format(list[i].index),
				list[i].name,
				this.renderAutostart(list[i]),
				E('div', {}, [
					E('button', { 'class': 'btn cbi-button-action', 'click': ui.createHandlerFn(this, 'handleAction', list[i].name, 'start')}, _('Start')),
					E('button', { 'class': 'btn cbi-button-action', 'click': ui.createHandlerFn(this, 'handleAction', list[i].name, 'restart')}, _('Restart')),
					E('button', { 'class': 'btn cbi-button-action', 'click': ui.createHandlerFn(this, 'handleAction', list[i].name, 'stop')}, _('Stop'))
				])
			]);
		}

		cbi_update_table(table, rows);

		var view = E('div', {}, [
			E('h2', _('Startup')),
			E('div', {}, [
				E('div', { 'data-tab': 'init', 'data-tab-title': _('Initscripts') }, [
					E('p', {}, _('You can enable or disable installed init scripts here. Changes will applied after a device reboot.<br /><strong>Warning: If you disable essential init scripts like "network", your device might become inaccessible!</strong>')),
					E('div', { 'class': 'table-wrapper' }, table)
				]),
				E('div', { 'data-tab': 'rc', 'data-tab-title': _('Local Startup') }, [
					E('p', {}, _('This is the content of /etc/rc.local. Insert your own commands here (in front of \'exit 0\') to execute them at the end of the boot process.')),
					E('p', {}, E('textarea', { 'style': 'width:100%', 'rows': 20 }, [ (rcLocal != null ? rcLocal : '') ])),
					E('div', { 'class': 'cbi-page-actions' }, [
						E('button', {
							'class': 'btn cbi-button-save',
							'click': ui.createHandlerFn(this, 'handleRcLocalSave')
						}, _('Save'))
					])
				])
			])
		]);

		ui.tabs.initTabGroup(view.lastElementChild.childNodes);

		return view;
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
