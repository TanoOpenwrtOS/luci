'use strict';

return L.Class.extend({
	localtimeToString: function(localtime, gmtoff) {
		if (typeof localtime !== 'undefined') {
			var date = new Date(localtime * 1000);
			var timezone = '';

			if (gmtoff !== 'undefined') {
				/* Current timezone string in ISO 8601:2000 standard form (+hhmm or -hhmm) */
				var tz = Math.abs(gmtoff);
				var timezone = ' %s%04d'.format(
					(gmtoff < 0) ? '−' : '+',
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

