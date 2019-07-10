--
-- Copyright (c) 2019, Tano Systems. All Rights Reserved.
-- Authors: Anton Kikin <a.kikin@tano-systems.com>
--

module("luci.tools.logview", package.seeall)

local i18n = require("luci.i18n")
local translate = i18n.translate

local logs = {
	{
		id = "syslog",
		name = translate('System Log'),
		cmd = {
			json = '/usr/sbin/logread | /usr/bin/syslog_fc -f json -s',
			csv  = '/usr/sbin/logread | /usr/bin/syslog_fc -f csv -s',
			txt  = '/usr/sbin/logread ',
		},
	},
	{
		id = "dmesg",
		name = translate('Kernel Log'),
		cmd = {
			json = '/bin/dmesg | /usr/bin/syslog_fc -e "[%K] %M" -f json -s',
			csv  = '/bin/dmesg | /usr/bin/syslog_fc -e "[%K] %M" -f csv -s',
			txt  = '/bin/dmesg',
		},
	},
}

function get_logs()
	return logs
end

function get_log(log_id)
	for n, log in pairs(logs) do
		if log.id == log_id then
			return log
		end
	end

	return nil
end

function get_log_json(log_id)
	local log = get_log(log_id)
	if log == nil then return "[]" end
	return luci.util.exec(log.cmd.json)
end
