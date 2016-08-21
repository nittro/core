var _context = (function() {
    var t = {},
        api,
        loaded = [],
        loading = {},
        REQ_TIMEOUT = 30000,
        undefined,
        doc = document,
        elem = function(n) { return doc.createElement(n); },
        win = window,
        loc = win.history.location || win.location, // support for HTML5 history polyfill
        setTimeout = function(c, t) { return win.setTimeout(c, t); },
        clearTimeout = function(t) { return win.clearTimeout(t); },
        promise = Promise,
        resolver = null,
        nsStack = [],
        map = {
            names: [],
            classes: []
        };

    function resolveUrl(u) {
        resolver || (resolver = elem('a'));
        resolver.href = u;
        return resolver.href;
    }


    function isRelative(u) {
        try {
            var len = /^https?:\/\/.+?(\/|$)/i.exec(loc.href)[0].length;
            return u.substr(0, len) === loc.href.substr(0, len);

        } catch (err) {
            return false;

        }
    }

    var xhrFactory = (function(o, f) {
        while(o.length) {
            try {
                f = o.shift();
                f();

                return f;

            } catch (e) {}
        }

        return function() { throw new Error(); };

    })([
        function() { return new XMLHttpRequest(); },
        function() { return new ActiveXObject('Msxml2.XMLHTTP'); },
        function() { return new ActiveXObject('Msxml3.XMLHTTP'); },
        function() { return new ActiveXObject('Microsoft.XMLHTTP'); }
    ]);

    var xdrFactory = (function() {
        try {
            if ('withCredentials' in new XMLHttpRequest()) {
                return function() { return new XMLHttpRequest(); };

            } else if (win.XDomainRequest !== undefined) {
                return function() { return new win.XDomainRequest(); };

            }

        } catch (err) { }

        return function() { throw new Error(); };

    })();

    function xhr(u) {
        return new promise(function(fulfill, reject) {
            var req,
                m;

            if (isRelative(u)) {
                req = xhrFactory();

            } else {
                req = xdrFactory();

            }

            req.open('GET', u, true);

            var f = function () {
                m && clearTimeout(m);
                fulfill(req);
            };

            var r = function () {
                m && clearTimeout(m);
                reject(req);
            };

            if ('onsuccess' in req) {
                req.onsuccess = f;
                req.onerror = r;

            } else if (win.XDomainRequest !== undefined && req instanceof win.XDomainRequest) {
                req.onload = f;
                req.onerror = r;

            } else {
                req.onreadystatechange = function() {
                    if (req.readyState !== 4) {
                        return;

                    }

                    if (req.status === 200) {
                        f();

                    } else {
                        r();

                    }
                };
            }

            req.send();

            m = setTimeout(function() {
                if (req.readyState && req.readyState < 4) try {
                    req.abort();

                } catch (err) { }

                m = null;
                r();

            }, REQ_TIMEOUT);

        });
    }

    function exec(s, t, u) {
        var e;

        if (!t) {
            if (u.match(/\.(?:less|css)/i)) {
                t = 'text/css';

            } else  {
                t = 'text/javascript';

            }
        } else {
            t = t.replace(/\s*;.*$/, '').toLowerCase();

        }

        if (t === 'text/css') {
            e = elem('style');
            e.type = t;

            u = u.replace(/[^\/]+$/, '');
            s = s.replace(/url\s*\(('|")?(?:\.\/)?(.+?)\1\)/, function (m, q, n) {
                q || (q = '"');

                if (n.match(/^(?:(?:https?:)?\/)?\//)) {
                    return 'url(' + q + n + q + ')';

                } else {
                    return 'url(' + q + resolveUrl(u + n) + q + ')';

                }
            });

            if (e.styleSheet) {
                e.styleSheet.cssText = s;

            } else {
                e.appendChild(doc.createTextNode(s));

            }

            doc.head.appendChild(e);

        } else {
            e = elem('script');
            e.type = 'text/javascript';
            e.text = s;
            doc.head.appendChild(e).parentNode.removeChild(e);

        }
    }

    function lookup(s, c) {
        var i = map.names.indexOf(s);

        if (i > -1) {
            return map.classes[i];

        }

        var r = t,
            p = s.split('.'),
            n;

        while (p.length) {
            n = p.shift();
            if (r[n] === undefined) {
                if (c) {
                    r[n] = {};

                } else {
                    throw new Error(s + ' not found in context');

                }
            }

            r = r[n];

        }

        map.names.push(s);
        map.classes.push(r);

        return r;

    }

    function lookupClass(o) {
        if (typeof o === 'object' && o.constructor !== Object) {
            o = o.constructor;

        }

        if (typeof o !== 'function' && typeof o !== 'object') {
            throw new Error('Cannot lookup class name of non-object');

        }

        var i = map.classes.indexOf(o);

        return i === -1 ? false : map.names[i];

    }

    function load() {
        var u, a, p = promise.resolve(true);

        for (a = 0; a < arguments.length; a++) {
            if (typeof arguments[a] === 'function') {
                p = p.then(function(f) {
                    return function () {
                        return invoke(f);

                    };
                }(arguments[a]));

            } else if (typeof arguments[a] === 'string') {
                u = resolveUrl(arguments[a]);

                if (loaded.indexOf(u) === -1) {
                    if (loading[u]) {
                        p = p.then(function (p) {
                            return function () {
                                return p;

                            };
                        }(loading[u]));
                    } else {
                        p = loading[u] = function (p, u) {
                            return new promise(function (f, r) {
                                xhr(u).then(function (xhr) {
                                    p.then(function () {
                                        exec(xhr.responseText, xhr.getResponseHeader('Content-Type'), u);
                                        delete loading[u];
                                        loaded.push(u);
                                        f();

                                    }, r);
                                });
                            });

                        }(p, u);
                    }
                }
            }
        }

        return a = {
            then: function (fulfilled, rejected) {
                p.then(function () {
                    fulfilled && invoke(fulfilled);
                }, function () {
                    rejected && invoke(rejected);
                });

                return a;

            }
        };
    }


    function invoke(ns, f, i) {
        if (i === undefined && typeof ns === 'function') {
            i = f;
            f = ns;
            ns = null;

        }

        if (ns) {
            nsStack.unshift(ns, ns = lookup(ns, true));

        } else {
            ns = t;
            nsStack.unshift(null, ns);

        }

        var params = f.length ? f.toString().match(/^function\s*\((.*?)\)/i)[1].split(/\s*,\s*/) : [],
            args = [],
            p, c, r;

        for (p = 0; p < params.length; p++) {
            if (params[p] === 'context') {
                args.push(api);

            } else if (params[p] === '_NS_') {
                args.push(ns);

            } else if (params[p] === 'undefined') {
                args.push(undefined);

            } else if (i !== undefined && params[p] in i) {
                c = i[params[p]];

                if (typeof c === 'string') {
                    c = lookup(c);

                }

                args.push(c);

            } else if (ns[params[p]] !== undefined) {
                args.push(ns[params[p]]);

            } else if (t[params[p]] !== undefined) {
                args.push(t[params[p]]);

            } else {
                throw new Error('"' + params[p] + '" not found in context');

            }
        }

        r = f.apply(ns, args);

        nsStack.shift();
        nsStack.shift();
        return r;

    }

    function register(constructor, name) {
        var ns = name.split(/\./g),
            key = ns.pop();

        if (ns.length) {
            ns = lookup(ns.join('.'), true);

        } else {
            if (nsStack.length && nsStack[0] !== null) {
                name = nsStack[0] + '.' + name;
                ns = nsStack[1];

            } else {
                ns = t;

            }
        }

        ns[key] = constructor;

        map.names.push(name);
        map.classes.push(constructor);
        return api;

    }

    function __ns() {
        if (arguments.length) {
            nsStack.unshift(arguments[0], arguments[1]);

        } else {
            nsStack.shift();
            nsStack.shift();
        }
    }

    function extend(parent, constructor, proto) {
        if (!proto) {
            proto = constructor;
            constructor = parent;
            parent = null;

        }

        if (!parent) {
            parent = Object;

        } else if (typeof parent === 'string') {
            parent = lookup(parent);

        }

        var tmp = function () {};
        tmp.prototype = parent.prototype;
        constructor.prototype = new tmp();
        constructor.prototype.constructor = constructor;
        constructor.Super = parent;

        if (proto) {
            if (proto.hasOwnProperty('STATIC') && proto.STATIC) {
                copyProps(constructor, proto.STATIC);

            }

            copyProps(constructor.prototype, proto);

        }

        return constructor;

    }

    function mixin(target, source, map) {
        if (typeof target === 'string') {
            target = lookup(target);

        }

        if (typeof source === 'string') {
            source = lookup(source);

        }

        if (source.hasOwnProperty('STATIC') && source.STATIC) {
            merge(target, source.STATIC);
            
        }

        copyProps(target.prototype, source, map);
        return target;

    }

    function copyProps(target, source, map) {
        var key;

        for (key in source) {
            if (source.hasOwnProperty(key) && key !== 'STATIC') {
                target[map && key in map ? map[key] : key] = source[key];

            }
        }
    }

    function merge(a, b) {
        for (var key in b) {
            if (b.hasOwnProperty(key)) {
                if (!a.hasOwnProperty(key)) {
                    a[key] = b[key];

                } else if (typeof a[key] === 'object' && typeof b[key] === 'object') {
                    if (!a[key]) {
                        a[key] = b[key];

                    } else if (b[key]) {
                        merge(a[key], b[key]);

                    }
                } else {
                    a[key] = b[key];

                }
            }
        }
    }

    return api = {
        lookup: lookup,
        lookupClass: lookupClass,
        invoke: invoke,
        load: load,
        extend: extend,
        mixin: mixin,
        register: register,
        __ns: __ns
    };

})();
