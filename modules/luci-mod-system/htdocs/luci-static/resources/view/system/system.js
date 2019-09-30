'use strict';
'require uci';
'require rpc';
'require form';

var callInitList;

callInitList = rpc.declare({
	object: 'luci',
	method: 'getInitList',
	params: [ 'name' ],
	expect: { '': {} },
	filter: function(res) {
		for (var k in res)
			return +res[k].enabled;
		return null;
	}
});

return L.view.extend({
	load: function() {
		return Promise.all([
			uci.load('luci'),
			uci.load('system')
		]);
	},

	render: function(rpc_replies) {
		var zram_support = rpc_replies[0],
		    ntp_setup, ntp_enabled, m, s, o;

		m = new form.Map('system',
			_('System'),
			_('Here you can configure the basic aspects of your device like its hostname or the logging.'));

		m.chain('luci');

		s = m.section(form.TypedSection, 'system');
		s.anonymous = true;
		s.addremove = false;

		s.tab('host', _('Host'));
		s.tab('logging', _('Logging'));
		s.tab('language', _('Language and Style'));
		s.tab('advanced', _('Advanced'));

		/*
		 * System Properties
		 */

		o = s.taboption('host', form.Value, 'hostname', _('Hostname'));
		o.datatype = 'hostname';

		/*
		 * Logging
		 */

		o = s.taboption('logging', form.Value, 'log_size', _('System log buffer size'), _("KiB"))
		o.optional    = true
		o.placeholder = 16
		o.datatype    = 'uinteger'

		o = s.taboption('logging', form.Value, 'log_ip', _('External system log server'))
		o.optional    = true
		o.placeholder = '0.0.0.0'
		o.datatype    = 'ipaddr'

		o = s.taboption('logging', form.Value, 'log_port', _('External system log server port'))
		o.optional    = true
		o.placeholder = 514
		o.datatype    = 'port'

		o = s.taboption('logging', form.ListValue, 'log_proto', _('External system log server protocol'))
		o.value('udp', 'UDP')
		o.value('tcp', 'TCP')

		o = s.taboption('logging', form.Value, 'log_file', _('Write system log to file'))
		o.optional    = true
		o.placeholder = '/tmp/system.log'

		o = s.taboption('logging', form.ListValue, 'conloglevel', _('Log output level'))
		o.value(8, _('Debug'))
		o.value(7, _('Info'))
		o.value(6, _('Notice'))
		o.value(5, _('Warning'))
		o.value(4, _('Error'))
		o.value(3, _('Critical'))
		o.value(2, _('Alert'))
		o.value(1, _('Emergency'))

		o = s.taboption('logging', form.ListValue, 'cronloglevel', _('Cron Log Level'))
		o.default = 8
		o.value(5, _('Debug'))
		o.value(8, _('Normal'))
		o.value(9, _('Warning'))

		/*
		 * Zram Properties
		 */

		if (L.hasSystemFeature('zram')) {
			s.tab('zram', _('ZRam Settings'));

			o = s.taboption('zram', form.Value, 'zram_size_mb', _('ZRam Size'), _('Size of the ZRam device in megabytes'));
			o.optional    = true;
			o.placeholder = 16;
			o.datatype    = 'uinteger';

			o = s.taboption('zram', form.ListValue, 'zram_comp_algo', _('ZRam Compression Algorithm'));
			o.optional    = true;
			o.placeholder = 'lzo';
			o.value('lzo', 'lzo');
			o.value('lz4', 'lz4');
			o.value('deflate', 'deflate');

			o = s.taboption('zram', form.Value, 'zram_comp_streams', _('ZRam Compression Streams'), _('Number of parallel threads used for compression'));
			o.optional    = true;
			o.placeholder = 1;
			o.datatype    = 'uinteger';
		}

		/*
		 * Language & Style
		 */

		o = s.taboption('language', form.ListValue, '_lang', _('Language'))
		o.uciconfig = 'luci';
		o.ucisection = 'main';
		o.ucioption = 'lang';
		o.value('auto');

		var k = Object.keys(uci.get('luci', 'languages') || {}).sort();
		for (var i = 0; i < k.length; i++)
			if (k[i].charAt(0) != '.')
				o.value(k[i], uci.get('luci', 'languages', k[i]));

		o = s.taboption('language', form.ListValue, '_mediaurlbase', _('Design'))
		o.uciconfig = 'luci';
		o.ucisection = 'main';
		o.ucioption = 'mediaurlbase';

		var k = Object.keys(uci.get('luci', 'themes') || {}).sort();
		for (var i = 0; i < k.length; i++)
			if (k[i].charAt(0) != '.')
				o.value(uci.get('luci', 'themes', k[i]), k[i]);

		/*
		 * Advanced
		 */
		o = s.taboption('advanced', form.Value, '_pollinterval',
			_('Polling interval'), _('Polling interval for status queries in seconds'))
		o.uciconfig = 'luci';
		o.ucisection = 'main';
		o.ucioption = 'pollinterval';
		o.value('3');
		o.value('5');
		o.value('10');
		o.datatype = 'range(3, 20)';

		return m.render().then(function(mapEl) {
			return mapEl;
		});
	}
});
