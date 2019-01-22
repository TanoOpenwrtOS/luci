-- Copyright 2008 Steven Barth <steven@midlink.org>
-- Copyright 2011 Jo-Philipp Wich <jow@openwrt.org>
-- Licensed to the public under the Apache License 2.0.

local sys   = require "luci.sys"
local fs    = require "nixio.fs"
local conf  = require "luci.config"

local m, s, o
local has_zram = fs.access("/etc/init.d/zram")

m = Map("system", translate("General System Settings"), translate("Here you can configure the basic aspects of your device like its hostname or the logging."))
m:chain("luci")


s = m:section(TypedSection, "system")
s.anonymous = true
s.addremove = false

s:tab("host",  translate("Host"))
s:tab("logging",  translate("Logging"))
s:tab("language", translate("Language and Style"))
s:tab("advanced", translate("Advanced"))
if has_zram then s:tab("zram", translate("ZRam Settings")) end

--
-- System Properties
--

o = s:taboption("host", Value, "hostname", translate("Hostname"))
o.datatype = "hostname"

function o.write(self, section, value)
	Value.write(self, section, value)
	sys.hostname(value)
end

--
-- Logging
--

o = s:taboption("logging", Value, "log_size", translate("System log buffer size"), translate("KiB"))
o.optional    = true
o.placeholder = 16
o.datatype    = "uinteger"

o = s:taboption("logging", Value, "log_ip", translate("External system log server"))
o.optional    = true
o.placeholder = "0.0.0.0"
o.datatype    = "ip4addr"

o = s:taboption("logging", Value, "log_port", translate("External system log server port"))
o.optional    = true
o.placeholder = 514
o.datatype    = "port"

o = s:taboption("logging", ListValue, "log_proto", translate("External system log server protocol"))
o:value("udp", "UDP")
o:value("tcp", "TCP")

o = s:taboption("logging", Value, "log_file", translate("Write system log to file"))
o.optional    = true
o.placeholder = "/tmp/system.log"

o = s:taboption("logging", ListValue, "conloglevel", translate("Log output level"))
o:value(8, translate("Debug"))
o:value(7, translate("Info"))
o:value(6, translate("Notice"))
o:value(5, translate("Warning"))
o:value(4, translate("Error"))
o:value(3, translate("Critical"))
o:value(2, translate("Alert"))
o:value(1, translate("Emergency"))

o = s:taboption("logging", ListValue, "cronloglevel", translate("Cron Log Level"))
o.default = 8
o:value(5, translate("Debug"))
o:value(8, translate("Normal"))
o:value(9, translate("Warning"))


--
-- Zram Properties
--
if has_zram then
	o = s:taboption("zram", Value, "zram_size_mb", translate("ZRam Size"), translate("Size of the ZRam device in megabytes"))
	o.optional    = true
	o.placeholder = 16
	o.datatype    = "uinteger"
	
	o = s:taboption("zram", ListValue, "zram_comp_algo", translate("ZRam Compression Algorithm"))
	o.optional    = true
	o.placeholder = lzo
	o:value("lzo", "lzo")
	o:value("lz4", "lz4")
	o:value("deflate", "deflate")
	
	o = s:taboption("zram", Value, "zram_comp_streams", translate("ZRam Compression Streams"), translate("Number of parallel threads used for compression"))
	o.optional    = true
	o.placeholder = 1
	o.datatype    = "uinteger"
end


--
-- Language & Style
--

o = s:taboption("language", ListValue, "_lang", translate("Language"))
o:value("auto")

local i18ndir = luci.i18n.i18ndir .. "base."
for k, v in luci.util.kspairs(conf.languages) do
	local file = i18ndir .. k:gsub("_", "-")
	if k:sub(1, 1) ~= "." and fs.access(file .. ".lmo") then
		o:value(k, v)
	end
end

function o.cfgvalue(...)
	return m.uci:get("luci", "main", "lang")
end

function o.write(self, section, value)
	m.uci:set("luci", "main", "lang", value)
end


o = s:taboption("language", ListValue, "_mediaurlbase", translate("Theme"))
for k, v in pairs(conf.themes) do
	if k:sub(1, 1) ~= "." then
		o:value(v, k)
	end
end

function o.cfgvalue(...)
	return m.uci:get("luci", "main", "mediaurlbase")
end

function o.write(self, section, value)
	m.uci:set("luci", "main", "mediaurlbase", value)
end

--
-- Advanced
--

o = s:taboption("advanced", Value, "_pollinterval",
	translate("Polling interval"),
	translate("Polling interval for status queries in seconds"))
o.datatype = "range(3, 20)"
o.default = 5
o:value("3")
o:value("5")
o:value("10")

function o.cfgvalue(...)
	return m.uci:get("luci", "main", "pollinterval")
end

function o.write(self, section, value)
	m.uci:set("luci", "main", "pollinterval", value)
end

return m
