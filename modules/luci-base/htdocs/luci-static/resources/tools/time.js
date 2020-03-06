'use strict';

return L.Class.extend({
	localtimeToString: function(t) {
		if (t.localtime) {
			var date = new Date(t.localtime * 1000);
			var timezone = '';

			if (t.hasOwnProperty('localtime_gmtoff')) {
				/* Current timezone string in ISO 8601:2000 standard form (+hhmm or -hhmm) */
				var tz = Math.abs(t.localtime_gmtoff);
				var timezone = ' %s%04d'.format(
					(t.localtime_gmtoff < 0) ? '−' : '+',
					Math.floor(tz / 3600) * 100 + (tz % 3600) * 60);
			}

			return '%04d-%02d-%02d %02d:%02d:%02d%s'.format(
				date.getUTCFullYear(),
				date.getUTCMonth() + 1,
				date.getUTCDate(),
				date.getUTCHours(),
				date.getUTCMinutes(),
				date.getUTCSeconds(),
				timezone
			);
		}

		return null;
	}
});

