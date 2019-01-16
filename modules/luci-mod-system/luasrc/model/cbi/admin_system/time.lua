-- Copyright 2008 Steven Barth <steven@midlink.org>
-- Copyright 2011 Jo-Philipp Wich <jow@openwrt.org>
-- Licensed to the public under the Apache License 2.0.

local sys   = require "luci.sys"
local zones = require "luci.sys.zoneinfo"
local fs    = require "nixio.fs"
local conf  = require "luci.config"

local m, s, o
local has_ntpd = fs.access("/usr/sbin/ntpd")

m = Map("system", translate("Time"), translate("Here you can configure the time settings."))
m:chain("luci")


s = m:section(TypedSection, "system", translate("System Time"))
s.anonymous = true
s.addremove = false

o = s:option(DummyValue, "_systime", translate("Local Time"))
o.template = "admin_system/clock_status"

o = s:option(ListValue, "zonename", translate("Timezone"))
o:value("UTC")

--[[
	Change signs for «Etc/GMT» zones.

	The special area of «Etc» is used for some administrative zones, particularly for «Etc/UTC»
	which represents Coordinated Universal Time. In order to conform with the POSIX style,
	those zone names beginning with «Etc/GMT» have their sign reversed from what most people
	expect. In this style, zones west of GMT have a positive sign and those east have
	a negative sign in their name (e.g «Etc/GMT-14» is 14 hours ahead/east of GMT.)
--]]
local TZ_replacements = {
	['Etc/GMT']    = 'GMT',
	['Etc/GMT+1']  = 'GMT-1',
	['Etc/GMT+2']  = 'GMT-2',
	['Etc/GMT+3']  = 'GMT-3',
	['Etc/GMT+4']  = 'GMT-4',
	['Etc/GMT+5']  = 'GMT-5',
	['Etc/GMT+6']  = 'GMT-6',
	['Etc/GMT+7']  = 'GMT-7',
	['Etc/GMT+8']  = 'GMT-8',
	['Etc/GMT+9']  = 'GMT-9',
	['Etc/GMT+10'] = 'GMT-10',
	['Etc/GMT+11'] = 'GMT-11',
	['Etc/GMT+12'] = 'GMT-12',
	['Etc/GMT-1']  = 'GMT+1',
	['Etc/GMT-2']  = 'GMT+2',
	['Etc/GMT-3']  = 'GMT+3',
	['Etc/GMT-4']  = 'GMT+4',
	['Etc/GMT-5']  = 'GMT+5',
	['Etc/GMT-6']  = 'GMT+6',
	['Etc/GMT-7']  = 'GMT+7',
	['Etc/GMT-8']  = 'GMT+8',
	['Etc/GMT-9']  = 'GMT+9',
	['Etc/GMT-10'] = 'GMT+10',
	['Etc/GMT-11'] = 'GMT+11',
	['Etc/GMT-12'] = 'GMT+12',
	['Etc/GMT-13'] = 'GMT+13',
	['Etc/GMT-14'] = 'GMT+14',
}

for i, zone in ipairs(zones.TZ) do
	local zone_exists = fs.access("/usr/share/zoneinfo/" .. zone[1])
	if (zone_exists) then
		local zone_name = TZ_replacements[zone[1]] or zone[1]
		o:value(zone[1], zone_name)
	end
end

function o.write(self, section, value)
	local function lookup_zone(title)
		for _, zone in ipairs(zones.TZ) do
			if zone[1] == title then return zone[2] end
		end
	end

	AbstractValue.write(self, section, value)
	local timezone = lookup_zone(value) or "GMT0"
	self.map.uci:set("system", section, "timezone", timezone)

	if fs.access("/usr/share/zoneinfo/" .. value) then
		fs.unlink("/tmp/localtime")
		fs.symlink("/usr/share/zoneinfo/" .. value, "/tmp/localtime")
	end
end


--
-- NTP
--

if has_ntpd then

	-- timeserver setup was requested, create section and reload page
	if m:formvalue("cbid.system._timeserver._enable") then
		m.uci:section("system", "timeserver", "ntp",
			{
                	server = { "0.openwrt.pool.ntp.org", "1.openwrt.pool.ntp.org", "2.openwrt.pool.ntp.org", "3.openwrt.pool.ntp.org" }
			}
		)

		m.uci:save("system")
		luci.http.redirect(luci.dispatcher.build_url("admin/system", arg[1]))
		return
	end

	local has_section = false
	m.uci:foreach("system", "timeserver", 
		function(s) 
			has_section = true 
			return false
	end)

	if not has_section then

		s = m:section(TypedSection, "timeserver", translate("Time Synchronization"))
		s.anonymous   = true
		s.cfgsections = function() return { "_timeserver" } end

		x = s:option(Button, "_enable")
		x.title      = translate("Time Synchronization is not configured yet.")
		x.inputtitle = translate("Set up Time Synchronization")
		x.inputstyle = "apply"

	else
		
		s = m:section(TypedSection, "timeserver", translate("Time Synchronization"))
		s.anonymous = true
		s.addremove = false

		o = s:option(Flag, "enable", translate("Enable NTP client"))
		o.rmempty = false

		function o.cfgvalue(self)
			return sys.init.enabled("sysntpd")
				and self.enabled or self.disabled
		end

		function o.write(self, section, value)
			if value == self.enabled then
				sys.init.enable("sysntpd")
				sys.call("env -i /etc/init.d/sysntpd start >/dev/null")
			else
				sys.call("env -i /etc/init.d/sysntpd stop >/dev/null")
				sys.init.disable("sysntpd")
			end
		end


		o = s:option(Flag, "enable_server", translate("Provide NTP server"))
		o:depends("enable", "1")


		o = s:option(DynamicList, "server", translate("NTP server candidates"))
		o.datatype = "host(0)"
		o:depends("enable", "1")

		-- retain server list even if disabled
		function o.remove() end

	end
end

return m
