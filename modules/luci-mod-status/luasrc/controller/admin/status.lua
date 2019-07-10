-- Copyright 2008 Steven Barth <steven@midlink.org>
-- Copyright 2011 Jo-Philipp Wich <jow@openwrt.org>
-- Licensed to the public under the Apache License 2.0.

module("luci.controller.admin.status", package.seeall)

function index()
	entry({"admin", "status", "overview"}, template("admin_status/index"), _("Overview"), 1)

	entry({"admin", "status", "iptables"}, template("admin_status/iptables"), _("Firewall"), 2).leaf = true
	entry({"admin", "status", "iptables_dump"}, call("dump_iptables")).leaf = true
	entry({"admin", "status", "iptables_action"}, post("action_iptables")).leaf = true

	entry({"admin", "status", "routes"}, template("admin_status/routes"), _("Routes"), 3)

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

	entry({"admin", "status", "processes"}, form("admin_status/processes"), _("Processes"), 6)

	entry({"admin", "status", "realtime"}, alias("admin", "status", "realtime", "load"), _("Realtime Graphs"), 7)

	entry({"admin", "status", "realtime", "load"}, template("admin_status/load"), _("Load"), 1).leaf = true
	entry({"admin", "status", "realtime", "load_status"}, call("action_load")).leaf = true

	entry({"admin", "status", "realtime", "bandwidth"}, template("admin_status/bandwidth"), _("Traffic"), 2).leaf = true
	entry({"admin", "status", "realtime", "bandwidth_status"}, call("action_bandwidth")).leaf = true

	if (nixio.fs.stat("/etc/config/wireless", "size") or 0) > 0 then
		entry({"admin", "status", "realtime", "wireless"}, template("admin_status/wireless"), _("Wireless"), 3).leaf = true
		entry({"admin", "status", "realtime", "wireless_status"}, call("action_wireless")).leaf = true
	end

	entry({"admin", "status", "realtime", "connections"}, template("admin_status/connections"), _("Connections"), 4).leaf = true
	entry({"admin", "status", "realtime", "connections_status"}, call("action_connections")).leaf = true

	entry({"admin", "status", "nameinfo"}, call("action_nameinfo")).leaf = true
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

function dump_iptables(family, table)
	local prefix = (family == "6") and "ip6" or "ip"
	local ok, lines = pcall(io.lines, "/proc/net/%s_tables_names" % prefix)
	if ok and lines then
		local s
		for s in lines do
			if s == table then
				luci.http.prepare_content("text/plain")
				luci.sys.process.exec({
					"/usr/sbin/%stables" % prefix, "-w", "-t", table,
					"--line-numbers", "-nxvL"
				}, luci.http.write)
				return
			end
		end
	end

	luci.http.status(404, "No such table")
	luci.http.prepare_content("text/plain")
end

function action_iptables()
	if luci.http.formvalue("zero") then
		if luci.http.formvalue("family") == "6" then
			luci.util.exec("/usr/sbin/ip6tables -Z")
		else
			luci.util.exec("/usr/sbin/iptables -Z")
		end
	elseif luci.http.formvalue("restart") then
		luci.util.exec("/etc/init.d/firewall restart")
	end

	luci.http.redirect(luci.dispatcher.build_url("admin/status/iptables"))
end

function action_bandwidth(iface)
	luci.http.prepare_content("application/json")

	local bwc = io.popen("luci-bwc -i %s 2>/dev/null"
		% luci.util.shellquote(iface))

	if bwc then
		luci.http.write("[")

		while true do
			local ln = bwc:read("*l")
			if not ln then break end
			luci.http.write(ln)
		end

		luci.http.write("]")
		bwc:close()
	end
end

function action_wireless(iface)
	luci.http.prepare_content("application/json")

	local bwc = io.popen("luci-bwc -r %s 2>/dev/null"
		% luci.util.shellquote(iface))

	if bwc then
		luci.http.write("[")

		while true do
			local ln = bwc:read("*l")
			if not ln then break end
			luci.http.write(ln)
		end

		luci.http.write("]")
		bwc:close()
	end
end

function action_load()
	luci.http.prepare_content("application/json")

	local bwc = io.popen("luci-bwc -l 2>/dev/null")
	if bwc then
		luci.http.write("[")

		while true do
			local ln = bwc:read("*l")
			if not ln then break end
			luci.http.write(ln)
		end

		luci.http.write("]")
		bwc:close()
	end
end

function action_connections()
	local sys = require "luci.sys"

	luci.http.prepare_content("application/json")

	luci.http.write('{ "connections": ')
	luci.http.write_json(sys.net.conntrack())

	local bwc = io.popen("luci-bwc -c 2>/dev/null")
	if bwc then
		luci.http.write(', "statistics": [')

		while true do
			local ln = bwc:read("*l")
			if not ln then break end
			luci.http.write(ln)
		end

		luci.http.write("]")
		bwc:close()
	end

	luci.http.write(" }")
end

function action_nameinfo(...)
	local util = require "luci.util"

	luci.http.prepare_content("application/json")
	luci.http.write_json(util.ubus("network.rrdns", "lookup", {
		addrs = { ... },
		timeout = 5000,
		limit = 1000
	}) or { })
end
