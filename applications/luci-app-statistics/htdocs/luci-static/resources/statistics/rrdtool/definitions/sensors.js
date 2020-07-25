/* Licensed to the public under the Apache License 2.0. */

'use strict';
'require baseclass';

return baseclass.extend({
	title: _('Sensors'),

	rrdargs: function(graph, host, plugin, plugin_instance, dtype) {
		var temp = {
			per_instance: false,
			title: "%H: %pi",
			vlabel: "Temperature (\xb0C)",
			number_format: "%4.1lf%s",
			y_min: "0",
			data: {
				types: [ "temperature" ],
				options: {
					temperature__value: {
						overlay: true,
						noarea: true,
						title: "Temperature (%di)"
					}
				}
			}
		};

		var voltage = {
			per_instance: true,
			title: "%H: %pi - %di",
			vlabel: "Voltage (V)",
			y_min: "0",
			number_format: "%4.1lf%s",
			data: {
				types: [ "voltage" ],
				options: {
					voltage__value: {
						color: "0000ff",
						title: "Voltage"
					}
				}
			}
		};

		var power = {
			per_instance: true,
			title: "%H: %pi - %di",
			vlabel: "Watts (W)",
			y_min: "0",
			number_format: "%4.1lf%s",
			data: {
				types: [ "power" ],
				options: {
					power__value: {
						color: "00ff00",
						title: "Power"
					}
				}
			}
		};

		var current = {
			per_instance: true,
			title: "%H: %pi - %di",
			vlabel: "Current (A)",
			y_min: "0",
			number_format: "%4.1lf%s",
			data: {
				types: [ "current" ],
				options: {
					current__value: {
						color: "00ffff",
						title: "Current"
					}
				}
			}
		};

		var fanspeed = {
			per_instance: true,
			title: "%H: %pi - %di",
			vlabel: "Revolutions per minute (RPM)",
			number_format: "%4.1lf%s",
			data: {
				types: [ "fanspeed" ],
				options: {
					fanspeed__value: {
						color: "ff5555",
						title: "RPM"
					}
				}
			}
		};

		var types = graph.dataTypes(host, plugin, plugin_instance);
		var p = [];

		for (var i = 0; i < types.length; i++) {
			switch(types[i]) {
				case 'temperature': p.push(temp); break;
				case 'voltage': p.push(voltage); break;
				case 'power': p.push(power); break;
				case 'fanspeed': p.push(fanspeed); break;
				case 'current': p.push(current); break;
				default:
					log.error('Unsupported type \'%s\'', types[i]);
					break;
			}
		}

		return p;
	}
});
