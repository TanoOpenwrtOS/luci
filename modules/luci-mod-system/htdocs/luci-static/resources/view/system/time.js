'use strict';
'require uci';
'require rpc';
'require form';

var callInitList, callInitAction, callSetLocaltime, callLocaltime, callTimezone, CBILocalTime;

callInitList = rpc.declare({
	object: 'luci',
	method: 'initList',
	params: [ 'name' ],
	expect: { result: {} },
	filter: function(res) {
		for (var k in res)
			return +res[k].enabled;
		return null;
	}
});

callInitAction = rpc.declare({
	object: 'luci',
	method: 'initCall',
	params: [ 'name', 'action' ],
	expect: { result: false }
});

callLocaltime = rpc.declare({
	object: 'luci',
	method: 'localtime',
	expect: { localtime: 0 }
});

callSetLocaltime = rpc.declare({
	object: 'luci',
	params: [ 'localtime' ],
	method: 'localtime',
	expect: { localtime: 0 }
});

callTimezone = rpc.declare({
	object: 'luci',
	method: 'timezone',
	expect: { result: {} }
});

CBILocalTime = form.DummyValue.extend({
	renderWidget: function(section_id, option_id, cfgvalue) {
		return E([], [
			E('span', { 'id': 'localtime' },
				new Date(cfgvalue * 1000).toLocaleString()),
			' ',
			E('button', {
				'class': 'cbi-button cbi-button-apply',
				'click': function() {
					this.blur();
					this.classList.add('spinning');
					this.disabled = true;
					callLocaltime(Math.floor(Date.now() / 1000)).then(L.bind(function() {
						this.classList.remove('spinning');
						this.disabled = false;
					}, this));
				}
			}, _('Sync with browser')),
			' ',
			this.ntpd_support ? E('button', {
				'class': 'cbi-button cbi-button-apply',
				'click': function() {
					this.blur();
					this.classList.add('spinning');
					this.disabled = true;
					callInitAction('sysntpd', 'restart').then(L.bind(function() {
						this.classList.remove('spinning');
						this.disabled = false;
					}, this));
				}
			}, _('Sync with NTP-Server')) : ''
		]);
	},
});

return L.view.extend({
	load: function() {
		return Promise.all([
			callInitList('sysntpd'),
			callTimezone(),
			callLocaltime(),
			uci.load('luci'),
			uci.load('system')
		]);
	},

	render: function(rpc_replies) {
		var ntpd_support = rpc_replies[0],
		    timezones = rpc_replies[1],
		    localtime = rpc_replies[2],
		    ntp_setup, ntp_enabled, m, s, o;

		m = new form.Map('system',
			_('Time'),
			_('Here you can configure the time settings.'));

		m.chain('luci');
		m.tabbed = false;

		s = m.section(form.TypedSection, 'system', _('System Time'));
		s.anonymous = true;
		s.addremove = false;

		/*
		 * Time
		 */

		o = s.option(CBILocalTime, '_systime', _('Local Time'));
		o.cfgvalue = function() { return localtime };
		o.ntpd_support = ntpd_support;

		o = s.option(form.ListValue, 'zonename', _('Timezone'));
		o.value('UTC');

		var zones = Object.keys(timezones || {}).sort();
		for (var i = 0; i < zones.length; i++)
			o.value(zones[i], timezones[zones[i]].name);

		o.write = function(section_id, formvalue) {
			var tz = timezones[formvalue] ? timezones[formvalue].tzstring : null;
			uci.set('system', section_id, 'zonename', formvalue);
			uci.set('system', section_id, 'timezone', tz);
		};

		/*
		 * NTP
		 */

		if (ntpd_support != null) {
			var default_servers = [
				'0.openwrt.pool.ntp.org', '1.openwrt.pool.ntp.org',
				'2.openwrt.pool.ntp.org', '3.openwrt.pool.ntp.org'
			];

			s = m.section(form.TypedSection, 'timeserver', _("Time Synchronization"))
			s.anonymous = true;
			s.addremove = false;

			o = s.option(form.Flag, 'enabled', _('Enable NTP client'));
			o.rmempty = false;
			o.ucisection = 'ntp';
			o.default = o.disabled;
			o.write = function(section_id, value) {
				ntpd_support = +value;

				if (ntpd_support && !uci.get('system', 'ntp')) {
					uci.add('system', 'timeserver', 'ntp');
					uci.set('system', 'ntp', 'server', default_servers);
				}

				if (!ntpd_support)
					uci.set('system', 'ntp', 'enabled', 0);
				else
					uci.unset('system', 'ntp', 'enabled');

				return callInitAction('sysntpd', 'enable');
			};
			o.load = function(section_id) {
				return (ntpd_support == 1 &&
				        uci.get('system', 'ntp') != null &&
				        uci.get('system', 'ntp', 'enabled') != 0) ? '1' : '0';
			};

			o = s.option(form.Flag, 'enable_server', _('Provide NTP server'));
			o.ucisection = 'ntp';
			o.depends('enabled', '1');

			o = s.option(form.DynamicList, 'server', _('NTP server candidates'));
			o.datatype = 'host(0)';
			o.ucisection = 'ntp';
			o.depends('enabled', '1');
			o.remove = function() {}; // retain server list even if disabled
			o.load = function(section_id) {
				return uci.get('system', 'ntp')
					? uci.get('system', 'ntp', 'server')
					: default_servers;
			};
		}

		return m.render().then(function(mapEl) {
			L.Poll.add(function() {
				return callLocaltime().then(function(t) {
					mapEl.querySelector('#localtime').innerHTML = new Date(t * 1000).toLocaleString();
				});
			});

			return mapEl;
		});
	}
});
