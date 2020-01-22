'use strict';
'require fs';
'require ui';
'require uci';

return L.view.extend({
	handleCommand: function(ev, exec, args) {
		var button = ev.currentTarget;
		var out = button.parentNode.parentNode.parentNode.querySelector('.command-output');

		button.setAttribute('disabled', 'true');

		return fs.exec(exec, args).then(function(res) {
			out.style.display = '';

			L.dom.content(out, [ res.stdout || '', res.stderr || '' ]);
		}).catch(function(err) {
			ui.addNotification(null, E('p', [ err ]))
		}).finally(function() {
			button.removeAttribute('disabled');
		});
	},

	handlePing: function(ev, cmd) {
		var exec = cmd || 'ping',
		    addr = ev.currentTarget.parentNode.parentNode.parentNode.querySelector("#address").value,
		    args = (exec == 'ping') ? [ '-c', '5', '-W', '1', addr ] : [ '-c', '5', addr ];

		return this.handleCommand(ev, exec, args);
	},

	handleTraceroute: function(ev, cmd) {
		var exec = cmd || 'traceroute',
		    addr = ev.currentTarget.parentNode.parentNode.parentNode.querySelector("#address").value,
		    args = (exec == 'traceroute') ? [ '-q', '1', '-w', '1', '-n', addr ] : [ '-q', '1', '-w', '2', '-n', addr ];

		return this.handleCommand(ev, exec, args);
	},

	handleNslookup: function(ev, cmd) {
		var addr = addr = ev.currentTarget.parentNode.parentNode.parentNode.querySelector("#address").value;

		return this.handleCommand(ev, 'nslookup', [ addr ]);
	},

	load: function() {
		return Promise.all([
			L.resolveDefault(fs.stat('/bin/ping6'), {}),
			L.resolveDefault(fs.stat('/usr/bin/ping6'), {}),
			L.resolveDefault(fs.stat('/bin/traceroute6'), {}),
			L.resolveDefault(fs.stat('/usr/bin/traceroute6'), {}),
			uci.load('luci')
		]);
	},

	render: function(res) {
		var has_ping6 = res[0].path || res[1].path,
		    has_traceroute6 = res[2].path || res[3].path,
			dns_host = uci.get('luci', 'diag', 'dns') || 'openwrt.org',
			ping_host = uci.get('luci', 'diag', 'ping') || 'openwrt.org',
			route_host = uci.get('luci', 'diag', 'route') || 'openwrt.org';

		return E([], [
			E('h2', {}, [ _('Network Utilities') ]),
			E('div', { 'class': 'cbi-section' }, [
				E('legend', {}, _('Ping')),
				E('div', { 'class': 'cbi-section-node' }, [
					E('div', { 'class': 'cbi-value' }, [
						E('label', { 'class': 'cbi-value-title' }, _('Hostname')),
						E('div', { 'class': 'cbi-value-field' }, [
							E('input', { 'class': 'cbi-input-text', 'type': 'text', 'value': ping_host, 'id': 'address' })
						])
					]),
					E('div', { 'class': 'cbi-value' }, [
						E('label', { 'class': 'cbi-value-title' }, ''),
						E('div', { 'class': 'cbi-value-field' }, [
							has_ping6 ? new ui.ComboButton('ping', {
								'ping': '%s %s'.format(_('IPv4'), _('Ping')),
								'ping6': '%s %s'.format(_('IPv6'), _('Ping')),
							}, {
								'click': ui.createHandlerFn(this, 'handlePing'),
								'classes': {
									'ping': 'cbi-button cbi-button-action',
									'ping6': 'cbi-button cbi-button-action'
								}
							}).render() : E('button', {
								'class': 'cbi-button cbi-button-action',
								'click': ui.createHandlerFn(this, 'handlePing')
							}, [ _('Ping') ])
						])
					]),
					E('div', { 'class': 'cbi-value' }, [
						E('label', { 'class': 'cbi-value-title' }, ''),
						E('div', { 'class': 'cbi-value-field' }, [
							E('div', { 'id': '' }, [
								E('pre', { 'class': 'net-diag-output command-output', 'style': 'display:none' })
							])
						])
					])
				])
			]),
			E('div', { 'class': 'cbi-section' }, [
				E('legend', {}, _('Traceroute')),
				E('div', { 'class': 'cbi-section-node' }, [
					E('div', { 'class': 'cbi-value' }, [
						E('label', { 'class': 'cbi-value-title' }, _('Hostname')),
						E('div', { 'class': 'cbi-value-field' }, [
							E('input', { 'class': 'cbi-input-text', 'type': 'text', 'value': route_host, 'id': 'address' })
						])
					]),
					E('div', { 'class': 'cbi-value' }, [
						E('label', { 'class': 'cbi-value-title' }, ''),
						E('div', { 'class': 'cbi-value-field' }, [
							has_traceroute6 ? new ui.ComboButton('traceroute', {
								'traceroute': '%s %s'.format(_('IPv4'), _('Traceroute')),
								'traceroute6': '%s %s'.format(_('IPv6'), _('Traceroute')),
							}, {
								'click': ui.createHandlerFn(this, 'handleTraceroute'),
								'classes': {
									'traceroute': 'cbi-button cbi-button-action',
									'traceroute6': 'cbi-button cbi-button-action'
								}
							}).render() : E('button', {
								'class': 'cbi-button cbi-button-action',
								'click': ui.createHandlerFn(this, 'handleTraceroute')
							}, [ _('Traceroute') ])
						])
					]),
					E('div', { 'class': 'cbi-value' }, [
						E('label', { 'class': 'cbi-value-title' }, ''),
						E('div', { 'class': 'cbi-value-field' }, [
							E('div', { 'id': '' }, [
								E('pre', { 'class': 'net-diag-output command-output', 'style': 'display:none' })
							])
						])
					])
				])
			]),
			E('div', { 'class': 'cbi-section' }, [
				E('legend', {}, _('Nslookup')),
				E('div', { 'class': 'cbi-section-node' }, [
					E('div', { 'class': 'cbi-value' }, [
						E('label', { 'class': 'cbi-value-title' }, _('Hostname')),
						E('div', { 'class': 'cbi-value-field' }, [
							E('input', { 'class': 'cbi-input-text', 'type': 'text', 'value': dns_host, 'id': 'address' })
						])
					]),
					E('div', { 'class': 'cbi-value' }, [
						E('label', { 'class': 'cbi-value-title' }, ''),
						E('div', { 'class': 'cbi-value-field' }, [
							E('button', {
								'class': 'cbi-button cbi-button-action',
								'click': ui.createHandlerFn(this, 'handleNslookup')
							}, [ _('Nslookup') ])
						])
					]),
					E('div', { 'class': 'cbi-value' }, [
						E('label', { 'class': 'cbi-value-title' }, ''),
						E('div', { 'class': 'cbi-value-field' }, [
							E('div', { 'id': '' }, [
								E('pre', { 'class': 'net-diag-output command-output', 'style': 'display:none' })
							])
						])
					])
				])
			])
		]);
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
