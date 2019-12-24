-- Copyright 2008 Steven Barth <steven@midlink.org>
-- Copyright 2011 Jo-Philipp Wich <jow@openwrt.org>
-- Licensed to the public under the Apache License 2.0.

module("luci.controller.admin.status", package.seeall)

function index()
	local lv = require("luci.tools.logview")
	local logs = lv.get_logs()

	if #logs > 0 then
		entry({"admin", "status", "logview"}, firstchild(), _("Logs"), 99)
		for n, log in pairs(logs) do
			entry({"admin", "status", "logview", log.id },
				call("logview_render", log.id), log.name, n)
		end

		entry({"admin", "status", "logview", "get_json"}, call("logview_get_json")).leaf = true
		entry({"admin", "status", "logview", "download"}, call("logview_download")).leaf = true
	end
end

function logview_render(log_id)
	local lv = require("luci.tools.logview")
	local log = lv.get_log(log_id)

	if log == nil then
		luci.http.status(404, "No such log file")
		luci.http.prepare_content("text/plain")
	else
		luci.template.render("admin_status/logview", {
			log = log
		})
	end
end

function logview_get_json(log_id)
	if log_id then
		local lv = require("luci.tools.logview")
		local json = lv.get_log_json(log_id)
		luci.http.prepare_content("application/json")
		luci.http.write(json)
	else
		luci.http.status(404, "No such log file")
		luci.http.prepare_content("text/plain")
	end
end

function logview_download(log_name)
	local lv = require("luci.tools.logview")

	if log_name then
		local log_id
		local log_fmt

		log_id  = string.match(log_name, "(.-)%.[^\\%.]+$")
		log_fmt = string.match(log_name, "([^\\%.]+)$")

		if log_id and log_fmt then
			local log = lv.get_log(log_id)
			if log then
				luci.http.header('Content-Disposition', 'attachment; filename="%s.%s"'
					%{ log.id, log_fmt })

				if log_fmt == "txt" then
					luci.http.prepare_content("text/plain")
					luci.http.write(luci.util.exec(log.cmd.txt))
				elseif log_fmt == "csv" then
					luci.http.prepare_content("text/csv")
					luci.http.write(luci.util.exec(log.cmd.csv))
				elseif log_fmt == "json" then
					luci.http.prepare_content("application/json")
					luci.http.write(luci.util.exec(log.cmd.json))
				else
					luci.http.status(404, "Invalid format")
					luci.http.prepare_content("text/plain")
				end
				return
			end
		end
	end

	luci.http.status(404, "No such requested log file")
	luci.http.prepare_content("text/plain")
end
