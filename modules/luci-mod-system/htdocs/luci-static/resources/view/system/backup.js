'use strict';
'require view';
'require dom';
'require form';
'require rpc';
'require fs';
'require ui';

var isReadonlyView = !L.hasViewPermission();

var mapdata = { actions: { dl_backup: {} }, config: { showlist: {} } };

return view.extend({
	load: function() {
		var tasks = [
			fs.trimmed('/proc/sys/kernel/hostname'),
			fs.trimmed('/proc/mtd'),
			fs.trimmed('/proc/mounts'),
			fs.trimmed('/tmp/overlay_partition')
		];

		return Promise.all(tasks);
	},

	handleBackup: function(ev) {
		var form = E('form', {
			method: 'post',
			action: L.env.cgi_base + '/cgi-backup',
			enctype: 'application/x-www-form-urlencoded'
		}, E('input', { type: 'hidden', name: 'sessionid', value: rpc.getSessionID() }));

		ev.currentTarget.parentNode.appendChild(form);

		form.submit();
		form.parentNode.removeChild(form);
	},

	handleFirstboot: function(ev) {
		if (!confirm(_('Do you really want to erase all settings?')))
			return;

		ui.showModal(_('Erasing...'), [
			E('p', { 'class': 'spinning' }, _('The system is erasing the configuration partition now and will reboot itself when finished.'))
		]);

		/* Currently the sysupgrade rpc call will not return, hence no promise handling */
		fs.exec('/sbin/firstboot', [ '-r', '-y' ]);

		ui.awaitReconnect('192.168.10.1', 'tanowrt.lan');
	},

	handleRestore: function(ev) {
		return ui.uploadFile('/tmp/backup.tar.gz', ev.target)
			.then(L.bind(function(btn, res) {
				btn.firstChild.data = _('Checking archive…');
				return fs.exec('/bin/tar', [ '-tzf', '/tmp/backup.tar.gz' ]);
			}, this, ev.target))
			.then(L.bind(function(btn, res) {
				if (res.code != 0) {
					ui.addNotification(null, E('p', _('The uploaded backup archive is not readable')));
					return fs.remove('/tmp/backup.tar.gz');
				}

				ui.showModal(_('Apply backup?'), [
					E('p', _('The uploaded backup archive appears to be valid and contains the files listed below. Press "Continue" to restore the backup and reboot, or "Cancel" to abort the operation.')),
					E('pre', {}, [ res.stdout ]),
					E('div', { 'class': 'right' }, [
						E('button', {
							'class': 'btn',
							'click': ui.createHandlerFn(this, function(ev) {
								return fs.remove('/tmp/backup.tar.gz').finally(ui.hideModal);
							})
						}, [ _('Cancel') ]), ' ',
						E('button', {
							'class': 'btn cbi-button-action important',
							'click': ui.createHandlerFn(this, 'handleRestoreConfirm', btn)
						}, [ _('Continue') ])
					])
				]);
			}, this, ev.target))
			.catch(function(e) { ui.addNotification(null, E('p', e.message)) })
			.finally(L.bind(function(btn, input) {
				btn.firstChild.data = _('Upload archive...');
			}, this, ev.target));
	},

	handleRestoreConfirm: function(btn, ev) {
		return fs.exec('/sbin/sysupgrade', [ '--restore-backup', '/tmp/backup.tar.gz' ])
			.then(L.bind(function(btn, res) {
				if (res.code != 0) {
					ui.addNotification(null, [
						E('p', _('The restore command failed with code %d').format(res.code)),
						res.stderr ? E('pre', {}, [ res.stderr ]) : ''
					]);
					L.raise('Error', 'Unpack failed');
				}

				btn.firstChild.data = _('Rebooting…');
				return fs.exec('/sbin/reboot');
			}, this, ev.target))
			.then(L.bind(function(res) {
				if (res.code != 0) {
					ui.addNotification(null, E('p', _('The reboot command failed with code %d').format(res.code)));
					L.raise('Error', 'Reboot failed');
				}

				ui.showModal(_('Rebooting…'), [
					E('p', { 'class': 'spinning' }, _('The system is rebooting now. If the restored configuration changed the current LAN IP address, you might need to reconnect manually.'))
				]);

				ui.awaitReconnect(window.location.host, '192.168.10.1', 'tanowrt.lan');
			}, this))
			.catch(function(e) { ui.addNotification(null, E('p', e.message)) })
			.finally(function() { btn.firstChild.data = _('Upload archive...') });
	},

	handleBackupList: function(ev) {
		return fs.exec('/sbin/sysupgrade', [ '--list-backup' ]).then(function(res) {
			if (res.code != 0) {
				ui.addNotification(null, [
					E('p', _('The sysupgrade command failed with code %d').format(res.code)),
					res.stderr ? E('pre', {}, [ res.stderr ]) : ''
				]);
				L.raise('Error', 'Sysupgrade failed');
			}

			ui.showModal(_('Backup file list'), [
				E('p', _('Below is the determined list of files to backup. It consists of changed configuration files marked by opkg, essential base files and the user defined backup patterns.')),
				E('textarea', { 'readonly': 'true', 'rows': 16 }, res.stdout),
				E('div', { 'class': 'right' }, [
					E('button', {
						'class': 'btn',
						'click': ui.hideModal
					}, [ _('Dismiss') ])
				])
			], 'cbi-modal');
		});
	},

	handleBackupSave: function(m, ev) {
		return m.save(function() {
			return fs.write('/etc/sysupgrade.conf', mapdata.config.editlist.trim().replace(/\r\n/g, '\n') + '\n');
		}).then(function() {
			ui.addNotification(null, E('p', _('Contents have been saved.')), 'info');
		}).catch(function(e) {
			ui.addNotification(null, E('p', _('Unable to save contents: %s').format(e)));
		});
	},

	render: function(rpc_replies) {
		var hostname = rpc_replies[0],
		    procmtd = rpc_replies[1],
		    procmounts = rpc_replies[2],
		    overlay_partition = rpc_replies[3],
		    has_rootfs_data,
		    m, s, o, ss;

		if (!overlay_partition || overlay_partition == "")
			overlay_partition = "rootfs_data";

		has_rootfs_data = (procmtd.match(new RegExp('"' + overlay_partition + '"', '')) != null) || (procmounts.match("overlayfs:\/overlay \/ ") != null);

		m = new form.JSONMap(mapdata, _('Backup'));
		m.tabbed = true;
		m.readonly = isReadonlyView;

		s = m.section(form.NamedSection, 'actions', _('Actions'));
		o = s.option(form.SectionValue, 'actions', form.NamedSection, 'actions', 'actions', _('Backup'), _('Click "Generate archive" to download a tar archive of the current configuration files.'));
		ss = o.subsection;

		o = ss.option(form.Button, 'dl_backup', _('Download backup'));
		o.inputstyle = 'action important';
		o.inputtitle = _('Generate archive');
		o.onclick = this.handleBackup;

		o = s.option(form.SectionValue, 'actions', form.NamedSection, 'actions', 'actions', _('Restore'),
			_('To restore configuration files, you can upload a previously generated backup archive here. To reset the firmware to its initial state (factory reset), click "Perform reset".'));
		ss = o.subsection;

		if (has_rootfs_data) {
			o = ss.option(form.Button, 'reset', _('Reset to defaults'));
			o.inputstyle = 'negative important';
			o.inputtitle = _('Perform reset');
			o.onclick = this.handleFirstboot;
		}

		o = ss.option(form.Button, 'restore', _('Restore backup'), _('Custom files (certificates, scripts) may remain on the system. To prevent this, perform a factory-reset first.'));
		o.inputstyle = 'action important';
		o.inputtitle = _('Upload archive...');
		o.onclick = L.bind(this.handleRestore, this);

		s = m.section(form.NamedSection, 'config', 'config', _('Configuration'),
			_('This is a list of shell glob patterns for matching files and directories to include during sysupgrade. Modified files in /etc/config/ and certain other configurations are automatically preserved.'));
		s.render = L.bind(function(view /*, ... */) {
			return form.NamedSection.prototype.render.apply(this, this.varargs(arguments, 1))
				.then(L.bind(function(node) {
					node.appendChild(E('div', { 'class': 'cbi-page-actions' }, [
						E('button', {
							'class': 'cbi-button cbi-button-save',
							'click': ui.createHandlerFn(view, 'handleBackupSave', this.map),
							'disabled': isReadonlyView || null
						}, [ _('Save') ])
					]));

					return node;
				}, this));
		}, s, this);

		o = s.option(form.Button, 'showlist');
		o.inputstyle = 'action';
		o.inputtitle = _('Show the current list...');
		o.onclick = L.bind(this.handleBackupList, this);

		o = s.option(form.TextValue, 'editlist');
		o.forcewrite = true;
		o.rows = 30;
		o.load = function(section_id) {
			return L.resolveDefault(fs.read('/etc/sysupgrade.conf'), '');
		};

		return m.render();
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
