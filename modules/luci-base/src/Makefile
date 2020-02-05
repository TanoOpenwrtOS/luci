%.o: %.c
	$(CC) $(CPPFLAGS) $(CFLAGS) $(FPIC) -DNDEBUG -c -o $@ $<

plural_formula.c: plural_formula.y
	lemon -T$(CURDIR)/contrib/lempar.c -q $<

template_lmo.c: plural_formula.c

clean:
	rm -f po2lmo parser.so version.lua plural_formula.c plural_formula.h *.o

jsmin: jsmin.o
	$(CC) $(LDFLAGS) -o $@ $^

po2lmo: po2lmo.o template_lmo.o plural_formula.o
	$(CC) $(LDFLAGS) -o $@ $^

parser.so: template_parser.o template_utils.o template_lmo.o template_lualib.o plural_formula.o
	$(CC) $(LDFLAGS) -shared -o $@ $^

version.lua:
	./mkversion.sh $@ $(LUCI_VERSION) "$(LUCI_GITBRANCH)"

compile: parser.so version.lua

install: compile
	mkdir -p $(DESTDIR)/usr/lib/lua/luci/template
	cp parser.so $(DESTDIR)/usr/lib/lua/luci/template/parser.so
	cp version.lua $(DESTDIR)/usr/lib/lua/luci/version.lua
