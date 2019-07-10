-- Copyright 2008 Steven Barth <steven@midlink.org>
-- Copyright 2008 Jo-Philipp Wich <jow@openwrt.org>
-- Copyright 2019 Anton Kikin <a.kikin@tano-systems.com>
-- Licensed to the public under the Apache License 2.0.

f = SimpleForm("processes", translate("Processes"), translate("This list gives an overview over currently running system processes and their status."))
f.reset = false
f.submit = false

t = f:section(Table, luci.sys.process.list())
t:option(DummyValue, "PID", translate("PID"))
t:option(DummyValue, "USER", translate("Owner"))
t:option(DummyValue, "COMMAND", translate("Command"))
t:option(DummyValue, "%CPU", translate("CPU usage (%)"))
t:option(DummyValue, "%MEM", translate("Memory usage (%)"))

local hup_value = translate("Hang Up")
local term_value = translate("Terminate")
local kill_value = translate("Kill")

controls = t:option(Button, "_controls", translate("Controls"))
controls.rawhtml = true
controls.template = "cbi/dvalue"
controls.cfgvalue = function(self, section)
	local cbid = self:cbid(section)
	local html =
		-- nowrap class is needed for correct rendering in Bootstrap theme
		'<div class="cbi-section-actions nowrap"><div>' ..
		'<input class="cbi-button cbi-button-reload" type="submit" name="' .. cbid .. '" id="' .. cbid .. '" value="' .. hup_value .. '"> ' ..
		'<input class="cbi-button cbi-button-remove" type="submit" name="' .. cbid .. '" id="' .. cbid .. '" value="' .. term_value .. '"> ' ..
		'<input class="cbi-button cbi-button-remove" type="submit" name="' .. cbid .. '" id="' .. cbid .. '" value="' .. kill_value .. '">' ..
		'</div></div>'

	return html
end

function controls.write(self, section)
	local http = require "luci.http"

	local cbid = self:cbid(section)
	local formvalue = http.formvalue(cbid)

	if formvalue == hup_value then
		null, self.tag_error[section] = luci.sys.process.signal(section, 1)
	elseif formvalue == term_value then
		null, self.tag_error[section] = luci.sys.process.signal(section, 15)
	elseif formvalue == kill_value then
		null, self.tag_error[section] = luci.sys.process.signal(section, 9)
	end
end

return f
