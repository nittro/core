var _context = (function() {
    var t = {},
        api,
        loaded = [],
        loading = {},
        indexOf = Array.prototype.indexOf,
        REQ_TIMEOUT = 30000,
        undefined,
        doc = document,
        loc = doc.location,
        elem = function(n) { return doc.createElement(n); },
        win = window,
        setTimeout = function(c, t) { return win.setTimeout(c, t); },
        clearTimeout = function(t) { return win.clearTimeout(t); },
        promise = Promise;

    if (typeof indexOf !== 'function') {
        indexOf = function(e) {
            for (var i = 0; i < this.length; i++) {
                if (this[i] === e) {
                    return i;
                }
            }

            return -1;

        }
    }

    var resolver = null;

    var resolveUrl = function(u) {
        resolver || (resolver = elem('a'));
        resolver.href = u;
        return resolver.href;
    };


    var isRelative = function(u) {
        try {
            var len = /^https?:\/\/.+?(\/|$)/i.exec(loc.href)[0].length;
            return u.substr(0, len) === loc.href.substr(0, len);

        } catch (err) {
            return false;

        }
    };

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

    var xhr = function(u) {
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
    };

    var exec = function(s, t, u) {
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

    };

    var map = {
        names: [],
        classes: []
    };

    var lookup = function(s, c) {
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

    };

    var lookupClass = function (o) {
        if (typeof o === 'object' && o.constructor !== Object) {
            o = o.constructor;

        }

        if (typeof o !== 'function' && typeof o !== 'object') {
            throw new Error('Cannot lookup class name of non-object');

        }

        var i = map.classes.indexOf(o);

        return i === -1 ? false : map.names[i];

    };



    var load = function () {
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

                if (indexOf.call(loaded, u) === -1) {
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
    };


    var nsStack = [];


    var invoke = function(ns, f, i) {
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

    };

    var register = function (constructor, name) {
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

    };

    var __ns = function () {
        if (arguments.length) {
            nsStack.unshift(arguments[0], arguments[1]);

        } else {
            nsStack.shift();
            nsStack.shift();
        }
    };

    var extend = function (parent, constructor, proto) {
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

    };

    var mixin = function (target, source, map) {
        if (typeof source === 'string') {
            source = lookup(source);

        }

        copyProps(target.prototype, source, map);
        return target;

    };

    var copyProps = function (target, source, map) {
        var key;

        for (key in source) {
            if (source.hasOwnProperty(key) && key !== 'STATIC') {
                target[map && key in map ? map[key] : key] = source[key];

            }
        }
    };

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
;
_context.invoke('Utils', function(undefined) {

    var Strings = {
        applyModifiers: function(s) {
            var f = Array.prototype.slice.call(arguments, 1),
                i = 0,
                a, m;

            for (; i < f.length; i++) {
                a = f[i].split(':');
                m = a.shift();
                a.unshift(s);
                s = Strings[m].apply(Strings, a);

            }

            return s;

        },

        toString: function(s) {
            return s === undefined ? 'undefined' : (typeof s === 'string' ? s : (s.toString !== undefined ? s.toString() : Object.prototype.toString.call(s)));

        },

        sprintf: function(s) {
            return Strings.vsprintf(s, Array.prototype.slice.call(arguments, 1));

        },

        vsprintf: function(s, args) {
            var n = 0;

            return s.replace(/%(?:(\d+)\$)?(\.\d+|\[.*?:.*?\])?([idsfa%])/g, function(m, a, p, f) {
                if (f === '%') {
                    return f;

                }

                a = a ? parseInt(a) - 1 : n++;

                if (args[a] === undefined) {
                    throw new Error('Missing parameter #' + (a + 1));

                }

                a = args[a];

                switch (f) {
                    case 's':
                        return Strings.toString(a);

                    case 'i':
                    case 'd':
                        return parseInt(a);

                    case 'f':
                        a = parseFloat(a);

                        if (p && p.match(/^\.\d+$/)) {
                            a = a.toFixed(parseInt(p.substr(1)));

                        }

                        return a;

                    case 'a':
                        p = p && p.match(/^\[.*:.*\]$/) ? p.substr(1, p.length - 2).split(':') : [', ', ', '];
                        return a.length === 0 ? '' : a.slice(0, -1).join(p[0]) + (a.length > 1 ? p[1] : '') + a[a.length - 1];

                }

                return m;

            });
        },

        webalize: function(s, chars, ws) {
            if (ws) {
                s = s.replace(/\s+/g, '_');

            }

            s = s.replace(new RegExp('[^_A-Za-z\u00C0-\u017F' + Strings.escapeRegex(chars || '').replace(/\\-/g, '-') + ']+', 'g'), '-');

            return Strings.trim(s, '_-');

        },

        escapeRegex: function(s) {
            return s.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");

        },

        split: function(s, re, offsetCapture, noEmpty, delimCapture) {
            if (re instanceof RegExp) {
                re = new RegExp(re.source, [re.ignoreCase ? 'i' : '', re.multiline ? 'm' : '', 'g'].filter(function(v) { return !!v; }).join(''))

            } else {
                re = new RegExp(re, 'g');

            }

            var r = [],
                len = 0;

            s = s.replace(re, function(m, p, ofs) {
                ofs = arguments[arguments.length - 2];
                p = s.substring(len, ofs);

                if (p.length && !p.match(/^[\t ]+$/) || !noEmpty) {
                    r.push(offsetCapture ? [p, len] : s.substring(len, ofs));

                }

                if (delimCapture && (m.length && !m.match(/^[\t ]+$/) || !noEmpty)) {
                    r.push(offsetCapture ? [m, ofs] : m);

                }

                len = ofs + m.length;

                return m;

            });

            if (len < s.length || !noEmpty) {
                s = s.substring(len);
                (!noEmpty || (s.length && !s.match(/^[\t ]+$/))) && r.push(offsetCapture ? [s, len] : s);

            }

            return r;

        },

        trim: function(s, c) {
            return Strings._trim(s, c, true, true);

        },

        trimLeft: function(s, c) {
            return Strings._trim(s, c, true, false);

        },

        trimRight: function(s, c) {
            return Strings._trim(s, c, false, true);

        },

        _trim: function (s, c, l, r) {
            if (!c) {
                c = " \t\n\r\0\x0B\xC2\xA0";

            }

            var re = [];
            c = '[' + Strings.escapeRegex(c) + ']+';
            l && re.push('^', c);
            l && r && re.push('|');
            r && re.push(c, '$');

            return s.replace(new RegExp(re.join(''), 'ig'), '');

        },

        firstUpper: function(s) {
            return s.substr(0, 1).toUpperCase() + s.substr(1);

        },

        compare: function(a, b, len) {
            if (typeof a !== "string" || typeof b !== 'string') {
                return false;

            }

            if (!len) {
                len = Math.min(a.length, b.length);

            }

            return a.substr(0, len).toLowerCase() === b.substr(0, len).toLowerCase();

        },

        contains: function(h, n) {
            return h.indexOf(n) !== -1;

        },

        isNumeric: function(s) {
            return Object.prototype.toString.call(s) !== '[object Array]' && (s - parseFloat(s) + 1) >= 0;

        },

        escapeHtml: function(s) {
            return s
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');

        },

        nl2br: function(s, collapse) {
            return s.replace(collapse ? /\n+/g : /\n/g, '<br />');

        },

        random: function(len, chars) {
            chars = (chars || 'a-z0-9').replace(/.-./g, function(m, a, b) {
                a = m.charCodeAt(0);
                b = m.charCodeAt(2);
                var n = Math.abs(b - a),
                    c = new Array(n),
                    o = Math.min(a, b),
                    i = 0;

                for (; i <= n; i++) {
                    c[i] = o + i;
                }

                return String.fromCharCode.apply(null, c);

            });

            len || (len = 8);

            var s = new Array(len),
                n = chars.length - 1,
                i;

            for (i = 0; i < len; i++) {
                s[i] = chars[Math.round(Math.random() * n)];

            }

            return s.join('');

        }
    };

    _context.register(Strings, 'Strings');

});
;
_context.invoke('Utils', function(undefined) {

    var Arrays = {
        isArray: function(a) {
            return a && a.constructor === Array;

        },

        isArrayLike: function(a) {
            return typeof a === 'object' && a.length !== undefined;

        },

        shuffle: function (a) {
            var c = a.length, t, i;

            // While there are elements in the array
            while (c--) {
                // Pick a random index
                i = (Math.random() * c) | 0;

                // And swap the last element with it
                t = a[c];
                a[c] = a[i];
                a[i] = t;
            }

            return a;

        },

        createFrom: function(a, s, e) {
            if (a.length === undefined) {
                throw new Error('Invalid argument, only array-like objects can be supplied');

            }

            return Array.prototype.slice.call(a, s || 0, e || a.length);

        },

        getKeys: function(a) {
            var keys = [], k;

            if (Arrays.isArray(a)) {
                for (k = 0; k < a.length; k++) {
                    keys.push(k);

                }
            } else {
                for (k in a) {
                    keys.push(k);

                }
            }

            return keys;

        },

        filterKeys: function() {
            var args = Arrays.createFrom(arguments),
                t = args.shift(),
                a, i, r = {}, rem;

            rem = function(k) {
                if (r[k] === undefined) {
                    r[k] = t[k];
                    delete t[k];

                }
            };

            while (args.length) {
                a = args.shift();

                if (typeof a === 'object') {
                    if (a instanceof Array) {
                        for (i = 0; i < a.length; i++) {
                            rem(a[i]);

                        }
                    } else {
                        for (i in a) {
                            rem(i);

                        }
                    }
                } else {
                    rem(a);

                }
            }
        },

        getValues: function(a) {
            var arr = [], k;

            for (k in a) {
                arr.push(a[k]);

            }

            return arr;

        },

        merge: function() {
            var args = Arrays.createFrom(arguments),
                a = args.shift(),
                r = false,
                b, i;

            if (typeof a === 'boolean') {
                r = a;
                a = args.shift();

            }

            if (!a) {
                a = [];
            }

            while (args.length) {
                b = args.shift();
                if (b instanceof Array) {
                    for (i = 0; i < b.length; i++) {
                        if (r && typeof b[i] === 'object' && Object.prototype.toString.call(b[i]) === '[object Object]') {
                            a.push(Arrays.mergeTree(r, {}, b[i]));

                        } else {
                            a.push(b[i]);

                        }
                    }
                }
            }

            return a;

        },

        mergeTree: function() {
            var r = false,
                args = Arrays.createFrom(arguments),
                ofs = 1,
                t = args.shift(),
                props = [];

            if (typeof t === 'boolean') {
                r = t;
                t = args.shift();
                ofs = 2;

            }

            while (args.length) {
                var o = args.pop(),
                    p, a, i;

                if (typeof o !== 'object' || o === null) {
                    continue;

                }

                if (!t) {
                    t = {};

                }

                for (p in o) {
                    if (!o.hasOwnProperty(p) || props.indexOf(p) !== -1) {
                        continue;

                    }

                    if (typeof o[p] === 'object') {
                        if (r) {
                            if (o[p] instanceof Array) {
                                a = [r, t[p] || null];

                                for (i = ofs; i < arguments.length; i++) {
                                    a.push(arguments[i][p] || null);

                                }

                                t[p] = Arrays.merge.apply(this, a);

                            } else {
                                a = [r, null];

                                for (i = ofs; i < arguments.length; i++) {
                                    a.push(arguments[i] ? arguments[i][p] || null : null);

                                }

                                t[p] = Arrays.mergeTree.apply(this, a) || t[p];

                            }

                        } else {
                            t[p] = t[p] === undefined ? o[p] : (o[p] === null ? t[p] : o[p]);

                        }
                    } else {
                        t[p] = o[p];

                    }

                    props.push(p);

                }
            }

            return t;

        },

        walk: function(r, a, f) {
            if (typeof r !== "boolean") {
                f = a;
                a = r;
                r = false;
            }

            var i,
                p = function(k, v) {
                    if (r && (v instanceof Array || v instanceof Object)) {
                        Arrays.walk(r, v, f);

                    } else {
                        f.call(v, k, v);

                    }
                };

            if (a instanceof Array) {
                for (i = 0; i < a.length; i++) {
                    p(i, a[i]);

                }
            } else if (a instanceof Object) {
                for (i in a) {
                    p(i, a[i]);

                }
            } else {
                p(null, a);

            }
        }
    };

    _context.register(Arrays, 'Arrays');

});
;
_context.invoke('Utils', function (Arrays, undefined) {

    var HashMap = _context.extend(function (src) {
        this._ = {
            keys: [],
            values: [],
            nonNumeric: 0,
            nextNumeric: 0
        };

        if (src) {
            this.merge(src);

        }
    }, {
        STATIC: {
            from: function (data, keys) {
                if (!keys) {
                    return data instanceof HashMap ? data.clone() : new HashMap(data);

                } else if (!Arrays.isArray(keys)) {
                    throw new Error('Invalid argument supplied to HashMap.from(): the second argument must be an array');

                }

                var map = new HashMap(),
                    i, n = keys.length,
                    k,
                    arr = Arrays.isArray(data);

                for (i = 0; i < n; i++) {
                    k = arr ? i : keys[i];

                    if (data[k] !== undefined) {
                        map.set(keys[i], data[k]);

                    }
                }

                return map;

            }
        },

        length: 0,

        isList: function () {
            return this._.nonNumeric === 0;

        },

        clone: function (deep) {
            var o = new HashMap();
            o._.keys = this._.keys.slice();
            o._.nextNumeric = this._.nextNumeric;
            o.length = this.length;

            if (deep) {
                o._.values = this._.values.map(function (v) {
                    return v instanceof HashMap ? v.clone(deep) : v;
                });
            } else {
                o._.values = this._.values.slice();

            }

            return o;

        },

        merge: function (src) {
            if (src instanceof HashMap || Arrays.isArray(src)) {
                src.forEach(function(value, key) { this.set(key, value); }, this);

            } else if (typeof src === 'object' && src !== null) {
                for (var k in src) {
                    if (src.hasOwnProperty(k)) {
                        this.set(k, src[k]);

                    }
                }
            } else {
                throw new TypeError('HashMap.merge() expects the first argument to be an array or an object, ' + (typeof src) + ' given');

            }

            return this;

        },

        append: function (src) {
            if (src instanceof HashMap || Arrays.isArray(src)) {
                src.forEach(function (value, key) {
                    if (typeof key === 'number') {
                        this.push(value);

                    } else {
                        this.set(key, value);

                    }
                }, this);
            } else {
                this.merge(src);

            }

            return this;

        },

        push: function (value) {
            for (var i = 0; i < arguments.length; i++) {
                this._.keys.push(this._.nextNumeric);
                this._.values.push(arguments[i]);
                this._.nextNumeric++;
                this.length++;

            }

            return this;

        },

        pop: function () {
            if (!this.length) {
                return null;

            }

            var k = this._.keys.pop();

            if (typeof k === 'number') {
                if (k + 1 === this._.nextNumeric) {
                    this._.nextNumeric--;

                }
            } else {
                this._.nonNumeric--;

            }

            this.length--;
            return this._.values.pop();

        },

        shift: function () {
            if (!this.length) {
                return null;

            }

            if (typeof this._.keys[0] === 'number') {
                this._.nextNumeric--;
                this._shiftKeys(1, this.length, -1);

            } else {
                this._.nonNumeric--;

            }

            this.length--;
            this._.keys.shift();
            return this._.values.shift();

        },

        unshift: function (value) {
            var values = Arrays.createFrom(arguments),
                n = values.length,
                i = 0,
                keys = new Array(n);

            while (i < n) {
                keys[i] = i++;
            }

            keys.unshift(0, 0);
            values.unshift(0, 0);

            this._shiftKeys(0, this.length, n);
            this._.keys.splice.apply(this._.keys, keys);
            this._.values.splice.apply(this._.values, values);
            this._.nextNumeric += n;
            this.length += n;
            return this;

        },

        slice: function (from, to) {
            (from === undefined) && (from = 0);
            (from < 0) && (from += this.length);
            (to === undefined) && (to = this.length);
            (to < 0) && (to += this.length);

            var o = new HashMap();

            o._.keys = this._.keys.slice(from, to).map(function(k) {
                if (typeof k === 'number') {
                    k = o._.nextNumeric;
                    o._.nextNumeric++;
                    return k;

                } else {
                    o._.nonNumeric++;
                    return k;

                }
            });

            o._.values = this._.values.slice(from, to);
            o.length = o._.keys.length;

            return o;

        },

        splice: function (from, remove) {
            var values = Arrays.createFrom(arguments),
                keys = values.slice().map(function() { return -1; }),
                removed, i;

            keys[0] = values[0];
            keys[1] = values[1];

            this._.keys.splice.apply(this._.keys, keys);
            removed = this._.values.splice.apply(this._.values, values);

            this.length = this._.keys.length;
            this._.nextNumeric = 0;
            this._.nonNumeric = 0;

            for (i = 0; i < this.length; i++) {
                if (typeof this._.keys[i] === 'number') {
                    this._.keys[i] = this._.nextNumeric;
                    this._.nextNumeric++;

                } else {
                    this._.nonNumeric++;

                }
            }

            return removed;

        },

        'set': function (key, value) {
            var i = this._.keys.indexOf(key);

            if (i === -1) {
                this._.keys.push(key);
                this._.values.push(value);
                this.length++;

                if (typeof key === 'number') {
                    if (key >= this._.nextNumeric) {
                        this._.nextNumeric = key + 1;

                    }
                } else {
                    this._.nonNumeric++;

                }
            } else {
                this._.values[i] = value;

            }

            return this;

        },

        'get': function (key, need) {
            var i = this._.keys.indexOf(key);

            if (i > -1) {
                return this._.values[i];

            } else if (need) {
                throw new RangeError('Key ' + key + ' not present in HashMap');

            }

            return null;

        },

        has: function (key) {
            var index = this._.keys.indexOf(key);
            return index > -1 && this._.values[index] !== undefined;

        },

        forEach: function (callback, thisArg) {
            for (var i = 0; i < this.length; i++) {
                callback.call(thisArg || null, this._.values[i], this._.keys[i], this);

            }

            return this;

        },

        map: function (callback, recursive, thisArg) {
            return this.clone(recursive).walk(callback, recursive, thisArg);

        },

        walk: function (callback, recursive, thisArg) {
            for (var i = 0; i < this.length; i++) {
                if (recursive && this._.values[i] instanceof HashMap) {
                    this._.values[i].walk(callback, recursive, thisArg);

                } else {
                    this._.values[i] = callback.call(thisArg || null, this._.values[i], this._.keys[i], this);

                }
            }

            return this;

        },

        find: function (predicate, thisArg) {
            var i = this._find(predicate, thisArg, true);
            return i === false ? null : this._.values[i];

        },

        findKey: function (predicate, thisArg) {
            var i = this._find(predicate, thisArg, true);
            return i === false ? null : this._.keys[i];

        },

        some: function (predicate, thisArg) {
            return this._find(predicate, thisArg, true) !== false;

        },

        all: function (predicate, thisArg) {
            return this._find(predicate, thisArg, false) === false;

        },

        filter: function (predicate, thisArg) {
            var o = new HashMap(),
                i;

            for (i = 0; i < this.length; i++) {
                if (predicate.call(thisArg || null, this._.values[i], this._.keys[i], this)) {
                    if (typeof this._.keys[i] === 'number') {
                        o.push(this._.values[i]);

                    } else {
                        o.set(this._.keys[i], this._.values[i]);

                    }
                }
            }

            return o;

        },

        exportData: function () {
            if (this.isList()) {
                return this.getValues().map(function(v) {
                    return v instanceof HashMap ? v.exportData() : v;

                });
            }

            for (var i = 0, r = {}; i < this.length; i++) {
                if (this._.values[i] instanceof HashMap) {
                    r[this._.keys[i]] = this._.values[i].exportData();

                } else {
                    r[this._.keys[i]] = this._.values[i];

                }
            }

            return r;

        },

        getKeys: function () {
            return this._.keys.slice();

        },

        getValues: function () {
            return this._.values.slice();

        },

        _shiftKeys: function (from, to, diff) {
            while (from < to) {
                if (typeof this._.keys[from] === 'number') {
                    this._.keys[from] += diff;

                }

                from++;

            }
        },

        _find: function (predicate, thisArg, expect) {
            for (var i = 0; i < this.length; i++) {
                if (predicate.call(thisArg || null, this._.values[i], this._.keys[i], this) === expect) {
                    return i;

                }
            }

            return false;

        }
    });

    _context.register(HashMap, 'HashMap');

});
;
_context.invoke('Utils', function(Strings, undefined) {

    var Url = function(s) {
        var cur = document.location.href.match(Url.PARSER_REGEXP),
			src = s === null || s === '' || s === undefined ? cur : s.match(Url.PARSER_REGEXP),
            noHost = !src[4],
            path = src[6] || '';

        if (noHost && path.charAt(0) !== '/') {
            if (path.length) {
                path = Url.getDirName(cur[6] || '') + '/' + path.replace(/^\.\//, '');

            } else {
                path = cur[6];

            }
        }

        this._ = {
            protocol: src[1] || cur[1] || '',
            username: (noHost ? src[2] || cur[2] : src[2]) || '',
            password: (noHost ? src[3] || cur[3] : src[3]) || '',
            hostname: src[4] || cur[4] || '',
            port: (noHost ? src[5] || cur[5] : src[5]) || '',
            path: path,
            params: Url.parseQuery((noHost && !src[6] ? src[7] || cur[7] : src[7]) || ''),
            hash: (noHost && !src[6] && !src[7] ? src[8] || cur[8] : src[8]) || ''
        };
    };

    Url.prototype.getProtocol = function() {
        return this._.protocol;

    };

    Url.prototype.getUsername = function() {
        return this._.username;

    };

    Url.prototype.getPassword = function() {
        return this._.password;

    };

    Url.prototype.getHostname = function() {
        return this._.hostname;

    };

    Url.prototype.getPort = function() {
        return this._.port;

    };

    Url.prototype.getAuthority = function() {
        var a = '';

        if (this._.username) {
            if (this._.password) {
                a += this._.username + ':' + this._.password + '@';

            } else {
                a += this._.username + '@';

            }
        }

        a += this._.hostname;

        if (this._.port) {
            a += ':' + this._.port;

        }

        return a;

    };

    Url.prototype.getPath = function() {
        return this._.path;

    };

    Url.prototype.getQuery = function() {
        var q = Url.buildQuery(this._.params);
        return q.length ? '?' + q : '';

    };

    Url.prototype.getParam = function(n) {
        return this._.params[n];

    };

    Url.prototype.hasParam = function(n) {
        return this._.params[n] !== undefined;

    };

    Url.prototype.getParams = function() {
        return this._.params;

    };

    Url.prototype.getHash = function() {
        return this._.hash;

    };


    Url.prototype.setProtocol = function(protocol) {
        this._.protocol = protocol ? Strings.trimRight(protocol, ':') + ':' : '';
        return this;

    };

    Url.prototype.setUsername = function(username) {
        this._.username = username;
        return this;

    };

    Url.prototype.setPassword = function(password) {
        this._.password = password;
        return this;

    };

    Url.prototype.setHostname = function(hostname) {
        this._.hostname = hostname;
        return this;

    };

    Url.prototype.setPort = function(port) {
        this._.port = port;
        return this;

    };

    Url.prototype.setPath = function(path) {
        this._.path = path ? '/' + Strings.trimLeft(path, '/') : '';
        return this;

    };

    Url.prototype.setQuery = function(query) {
        this._.params = Url.parseQuery(query);
        return this;

    };

    Url.prototype.setParam = function(n, v) {
        this._.params[n] = v;
        return this;

    };

    Url.prototype.addParams = function(p) {
        if (p instanceof Array && (p.length < 1 || 'name' in p[0])) {
            for (var i = 0; i < p.length; i++) {
                this._.params[p[i].name] = p[i].value;

            }
        } else {
            for (var k in p) {
                if (p[k] !== undefined) {
                    this._.params[k] = p[k];

                }
            }
        }

        return this;

    };

    Url.prototype.getParams = function () {
        return this._.params;

    };

    Url.prototype.setParams = function(p) {
        this._.params = {};
        this.addParams(p);
        return this;

    };

    Url.prototype.removeParam = function(n) {
        delete this._.params[n];
        return this;

    };

    Url.prototype.setHash = function(hash) {
        this._.hash = hash ? '#' + Strings.trimLeft(hash, '#') : '';
        return this;

    };


    Url.prototype.toAbsolute = function() {
        return this._.protocol + '//' + this.getAuthority() + this._.path + this.getQuery() + this._.hash;

    };

    Url.prototype.toLocal = function () {
        return this._.path + this.getQuery() + this._.hash;

    };

    Url.prototype.toRelative = function(to) {
        to = Url.from(to || document.location.href);

        if (to.getProtocol() !== this.getProtocol()) {
            return this.toAbsolute();

        }

        if (to.getAuthority() !== this.getAuthority()) {
            return '//' + this.getAuthority() + this.getPath() + this.getQuery() + this.getHash();

        }

        if (to.getPath() !== this.getPath()) {
            return Url.getRelativePath(to.getPath(), this.getPath()) + this.getQuery() + this.getHash();

        }

        var qto = to.getQuery(), qthis = this.getQuery();
        if (qto !== qthis) {
            return qthis + this.getHash();

        }

        return to.getHash() === this.getHash() ? '' : this.getHash();

    };

    Url.prototype.toString = function() {
        return this.toAbsolute();

    };

    Url.prototype.isLocal = function() {
        return this.compare(Url.fromCurrent()) < Url.PART.PORT;

    };

    Url.prototype.compare = function(to) {
        if (!(to instanceof Url)) {
            to = Url.from(to);

        }

        var r = 0;

        this.getProtocol() !== to.getProtocol() && (r |= Url.PART.PROTOCOL);
        this.getUsername() !== to.getUsername() && (r |= Url.PART.USERNAME);
        this.getPassword() !== to.getPassword() && (r |= Url.PART.PASSWORD);
        this.getHostname() !== to.getHostname() && (r |= Url.PART.HOSTNAME);
        this.getPort() !== to.getPort() && (r |= Url.PART.PORT);
        this.getPath() !== to.getPath() && (r |= Url.PART.PATH);
        this.getQuery() !== to.getQuery() && (r |= Url.PART.QUERY);
        this.getHash() !== to.getHash() && (r |= Url.PART.HASH);

        return r;

    };

    /**
     * 1: protocol
     * 2: user
     * 3: pass
     * 4: host
     * 5: port
     * 6: path
     * 7: query
     * 8: hash
     * @type {RegExp}
     */
    Url.PARSER_REGEXP = /^(?:([^:/]+:)?\/\/(?:([^\/@]+?)(?::([^\/@]+))?@)?(?:([^/]+?)(?::(\d+))?(?=\/|$))?)?(.*?)(\?.*?)?(#.*)?$/;
    Url.PART = {
        PROTOCOL: 128,
        USERNAME: 64,
        PASSWORD: 32,
        HOSTNAME: 16,
        PORT: 8,
        PATH: 4,
        QUERY: 2,
        HASH: 1
    };

    Url.from = function(s) {
        return s instanceof Url ? new Url(s.toAbsolute()) : new Url(typeof s === 'string' || s === null || s === undefined ? s : Strings.toString(s));

    };

    Url.fromCurrent = function() {
        return new Url();

    };

    Url.getDirName = function (path) {
        return path.replace(/(^|\/)[^\/]*$/, '');

    };

    Url.getRelativePath = function(from, to) {
        from = Strings.trimLeft(from, '/').split('/');
        from.pop(); // last element is either a file or empty because the previous element is a directory

        if (!to.match(/^\//)) {
            return to.replace(/^\.\//, '');

        }

        to = Strings.trimLeft(to, '/').split('/');

        var e = 0,
            f,
            t,
            o = [],
            n = Math.min(from.length, to.length);

        for (; e < n; e++) {
            if (from[e] !== to[e]) {
                break;

            }
        }

        for (f = e; f < from.length; f++) {
            o.push('..');

        }

        for (t = e; t < to.length; t++) {
            o.push(to[t]);

        }

        return o.join('/');

    };

    Url.buildQuery = function(data, pairs) {
        var q = [], n, en = encodeURIComponent;

        var val = function (v) {
            if (v === undefined) {
                return null;

            } else if (typeof v === 'boolean') {
                return v ? 1 : 0;

            } else {
                return en('' + v);

            }
        };

        var flatten = function(a, n) {
            var r = [], i;

            if (Array.isArray(a)) {
                for (i = 0; i < a.length; i++) {
                    r.push(en(n + '[]') + '=' + val(a[i]));

                }
            } else {
                for (i in a) {
                    if (typeof a[i] === 'object') {
                        r.push(flatten(a[i], n + '[' + i + ']'));

                    } else {
                        r.push(en(n + '[' + i + ']') + '=' + val(a[i]));

                    }
                }
            }

            return r.filter(function(v) { return v !== null }).join('&');

        };

        for (n in data) {
            if (data[n] === null || data[n] === undefined) {
                continue;

            } else if (pairs) {
                q.push(en(data[n].name) + '=' + val(data[n].value));

            } else if (typeof data[n] === 'object') {
                q.push(flatten(data[n], n));

            } else {
                q.push(en(n) + '=' + val(data[n]));

            }
        }

        return q.filter(function(v) { return v !== null; }).join('&');

    };

    Url.parseQuery = function(s) {
        if (s.match(/^\??$/)) {
            return {};

        }

        s = Strings.trimLeft(s, '?').split('&');

        var p = {}, a = false, c, d, k, i, m, n, v;

        var convertType = function(v) {
            if (v.match(/^\d+$/)) {
                return parseInt(v);

            } else if (v.match(/^\d*\.\d+$/)) {
                return parseFloat(v);

            }

            return v;

        };

        for (i = 0; i < s.length; i++) {
            m = s[i].split('=');
            n = decodeURIComponent(m.shift());
            v = convertType(decodeURIComponent(m.join('=')));

            if (n.indexOf('[') !== -1) {
                n = n.replace(/\]/g, '');
                d = n.split('[');
                c = p;
                a = false;

                if (n.match(/\[$/)) {
                    d.pop();
                    a = true;

                }

                n = d.pop();

                while (d.length) {
                    k = d.shift();

                    if (c[k] === undefined) {
                        c[k] = {};

                    }

                    c = c[k];

                }

                if (a) {
                    if (c[n] === undefined) {
                        c[n] = [v];

                    } else {
                        c[n].push(v);

                    }
                } else {
                    c[n] = v;

                }
            } else {
                p[n] = v;

            }
        }

        return p;

    };

    _context.register(Url, 'Url');

});
;
_context.invoke('Utils', function (Arrays, Strings, undefined) {

    var map = function (args, callback) {
        args = Arrays.createFrom(args);

        if (Arrays.isArray(args[0])) {
            for (var i = 0, elems = args[0], ret = []; i < elems.length; i++) {
                args[0] = getElem(elems[i]);

                if (args[0]) {
                    ret.push(callback.apply(null, args));

                } else {
                    ret.push(args[0]);

                }
            }

            return ret;

        } else {
            args[0] = getElem(args[0]);

            if (args[0]) {
                return callback.apply(null, args);

            } else {
                return args[0];

            }
        }
    };

    var getElem = function (elem) {
        Arrays.isArrayLike(elem) && elem !== window && (elem = elem[0]);
        return typeof elem === 'string' ? DOM.getById(elem) : elem;

    };

    var getPrefixed = function (elem, prop) {
        if (Arrays.isArray(elem)) {
            elem = elem[0];

        }

        if (prop in elem.style) {
            return prop;

        }


        var p = prop.charAt(0).toUpperCase() + prop.substr(1),
            variants = ['webkit' + p, 'moz' + p, 'o' + p, 'ms' + p],
            i;

        for (i = 0; i < variants.length; i++) {
            if (variants[i] in elem.style) {
                return variants[i];

            }
        }

        return prop;

    };

    var parseData = function (value) {
        if (!value) return null;

        try {
            return JSON.parse(value);

        } catch (e) {
            return value;

        }
    };

    var DOM = {
        getByClassName: function (className, context) {
            return Arrays.createFrom((context || document).getElementsByClassName(className));

        },

        getById: function (id) {
            return document.getElementById(id);

        },

        find: function (sel, context) {
            var elems = [];
            sel = sel.trim().split(/\s*,\s*/g);

            sel.forEach(function (s) {
                var m = s.match(/^#([^\s\[>+:\.]+)\s+\.([^\s\[>+:]+)$/);

                if (m) {
                    elems.push.apply(elems, DOM.getByClassName(m[2], DOM.getById(m[1])));
                    return;

                } else if (s.match(/^[^.#]|[\s\[>+:]/)) {
                    throw new TypeError('Invalid selector "' + s + '", only single-level .class and #id or "#id .class" are allowed');

                }

                if (s.charAt(0) === '#') {
                    m = DOM.getById(s.substr(1));

                    if (m) {
                        elems.push(m);

                    }
                } else {
                    m = DOM.getByClassName(s.substr(1), context);
                    elems.push.apply(elems, m);

                }
            });

            return elems;

        },

        getChildren: function (elem) {
            return Arrays.createFrom(elem.childNodes || '').filter(function (node) {
                return node.nodeType === 1;

            });
        },

        closest: function (elem, nodeName, className) {
            return map(arguments, function (elem, nodeName, className) {
                while (elem) {
                    if (elem.nodeType === 1 && (!nodeName || elem.nodeName.toLowerCase() === nodeName) && (!className || DOM.hasClass(elem, className))) {
                        return elem;

                    }

                    elem = elem.parentNode;

                }

                return null;
            });
        },

        create: function (elem, attrs) {
            elem = document.createElement(elem);

            if (attrs) {
                DOM.setAttributes(elem, attrs);

            }

            return elem;

        },

        createFromHtml: function (html) {
            var container = DOM.create('div');
            DOM.html(container, html);
            html = DOM.getChildren(container);

            html.forEach(function (e) {
                container.removeChild(e);
            });

            container = null;

            return html.length > 1 ? html : html[0];

        },

        setAttributes: function (elem, attrs) {
            return map([elem], function (elem) {
                for (var a in attrs) {
                    if (attrs.hasOwnProperty(a)) {
                        elem.setAttribute(a, attrs[a]);

                    }
                }

                return elem;

            });
        },

        setStyle: function (elem, prop, value, prefix) {
            if (prop && typeof prop === 'object') {
                prefix = value;
                value = prop;

                for (prop in value) {
                    if (value.hasOwnProperty(prop)) {
                        DOM.setStyle(elem, prop, value[prop], prefix);

                    }
                }

                return elem;

            }

            if (prefix !== false) {
                prop = getPrefixed(elem, prop);

            }

            return map([elem], function (elem) {
                elem.style[prop] = value;

            });
        },

        html: function (elem, html) {
            return map([elem], function (elem) {
                elem.innerHTML = html;

                Arrays.createFrom(elem.getElementsByTagName('script')).forEach(function (elem) {
                    if (!elem.type || elem.type.toLowerCase() === 'text/javascript') {
                        var load = elem.hasAttribute('src'),
                            src = load ? elem.src : (elem.text || elem.textContent || elem.innerHTML || ''),
                            script = DOM.create('script', {type: 'text/javascript'});

                        if (load) {
                            script.src = src;

                        } else {
                            try {
                                script.appendChild(document.createTextNode(src));

                            } catch (e) {
                                script.text = src;

                            }
                        }

                        elem.parentNode.insertBefore(script, elem);
                        elem.parentNode.removeChild(elem);

                    }
                });
            });
        },

        contains: function( a, b ) {
            var adown = a.nodeType === 9 ? a.documentElement : a,
                bup = b && b.parentNode;

            return a === bup || !!( bup && bup.nodeType === 1 && (
                    adown.contains
                        ? adown.contains( bup )
                        : a.compareDocumentPosition && a.compareDocumentPosition( bup ) & 16
                ));
        },

        addListener: function (elem, evt, listener) {
            return map(arguments, function (elem, evt, listener) {
                elem.addEventListener(evt, listener, false);
                return elem;

            });
        },
        removeListener: function (elem, evt, listener) {
            return map(arguments, function (elem, evt, listener) {
                elem.removeEventListener(evt, listener, false);
                return elem;

            });
        },

        getData: function (elem, key) {
            return parseData(getElem(elem).getAttribute('data-' + key));

        },
        setData: function (elem, key, value) {
            return map([elem], function (elem) {
                elem.setAttribute('data-' + key, JSON.stringify(value));
                return elem;

            });
        },

        addClass: null,
        removeClass: null,
        toggleClass: null,
        hasClass: null
    };


    var testElem = DOM.create('span'),
        prepare = function(args, asStr) {
            args = Arrays.createFrom(args, 1).join(' ').trim();
            return asStr ? args : args.split(/\s+/g);
        };

    if ('classList' in testElem) {
        testElem.classList.add('c1', 'c2');

        if (testElem.classList.contains('c2')) {
            DOM.addClass = function (elem, classes) {
                classes = prepare(arguments);

                return map([elem], function (elem) {
                    elem.classList.add.apply(elem.classList, classes);
                    return elem;

                });
            };

            DOM.removeClass = function (elem, classes) {
                classes = prepare(arguments);

                return map([elem], function (elem) {
                    elem.classList.remove.apply(elem.classList, classes);
                    return elem;

                });
            };
        } else {
            DOM.addClass = function (elem, classes) {
                classes = prepare(arguments);

                return map([elem], function (elem) {
                    classes.forEach(function (c) {
                        elem.classList.add(c);

                    });

                    return elem;

                });
            };

            DOM.removeClass = function (elem, classes) {
                classes = prepare(arguments);

                return map([elem], function (elem) {
                    classes.forEach(function (c) {
                        elem.classList.remove(c);

                    });

                    return elem;

                });
            };
        }

        testElem.classList.toggle('c1', true);

        if (testElem.classList.contains('c1')) {
            DOM.toggleClass = function (elem, classes, value) {
                classes = classes.trim().split(/\s+/g);

                return map([elem], function (elem) {
                    if (value === undefined) {
                        classes.forEach(function (c) {
                            elem.classList.toggle(c);

                        });
                    } else {
                        classes.forEach(function (c) {
                            elem.classList.toggle(c, !!value);

                        });
                    }

                    return elem;

                });
            };
        } else {
            DOM.toggleClass = function (elem, classes, value) {
                classes = classes.trim().split(/\s+/g);

                return map([elem], function (elem) {
                    classes.forEach(function (c) {
                        if (value === undefined || value === elem.classList.contains(c)) {
                            elem.classList.toggle(c);

                        }
                    });

                    return elem;

                });
            };
        }

        DOM.hasClass = function (elem, classes) {
            elem = getElem(elem);
            classes = prepare(arguments);

            for (var i = 0; i < classes.length; i++) {
                if (!elem.classList.contains(classes[i])) {
                    return false;

                }
            }

            return true;

        };
    } else {
        DOM.addClass = function (elem, classes) {
            classes = prepare(arguments, true);

            return map([elem], function (elem) {
                elem.className += (elem.className ? ' ' : '') + classes;
                return elem;

            });
        };

        DOM.removeClass = function (elem, classes) {
            classes = prepare(arguments).map(Strings.escapeRegex);

            return map([elem], function (elem) {
                if (!elem.className) return elem;

                elem.className = elem.className.replace(new RegExp('(?:^|\s+)(?:' + classes.join('|') + '(?:\s+|$)', 'g'), ' ').trim();
                return elem;

            });
        };

        DOM.toggleClass = function (elem, classes, value) {
            classes = classes.trim().split(/\s+/g);

            return map([elem], function (elem) {
                var current = (elem.className || '').trim().split(/\s+/g);

                classes.forEach(function (c) {
                    var i = current.indexOf(c),
                        has = i > -1;

                    if (value !== false && !has) {
                        current.push(c);

                    } else if (value !== true && has) {
                        current.splice(i, 1);

                    }
                });

                elem.className = current.join(' ');
                return elem;

            });
        };

        DOM.hasClass = function (elem, classes) {
            elem = getElem(elem);
            if (!elem.className) return false;
            classes = prepare(arguments);

            var current = elem.className.trim().split(/\s+/g);

            for (var i = 0; i < classes.length; i++) {
                if (current.indexOf(classes[i]) === -1) {
                    return false;

                }
            }

            return true;

        };
    }

    testElem = null;

    _context.register(DOM, 'DOM');

});
;
_context.invoke('Utils', function(undefined) {

    var ReflectionClass = function(c) {
        this._ = {
            reflectedClass: typeof c === "string" ? ReflectionClass.getClass(c) : c
        };
    };

    ReflectionClass.from = function(c) {
        return c instanceof ReflectionClass ? c : new ReflectionClass(c);

    };

    ReflectionClass.getClass = function(name) {
        return _context.lookup(name);

    };

    ReflectionClass.getClassName = function(obj, need) {
        var className = _context.lookupClass(obj);

        if (className === false && need) {
            throw new Error('Unknown class');

        }

        return className;

    };

    ReflectionClass.prototype.hasProperty = function(name) {
        return this._.reflectedClass.prototype[name] !== undefined && typeof this._.reflectedClass.prototype[name] !== "function";

    };

    ReflectionClass.prototype.hasMethod = function(name) {
        return this._.reflectedClass.prototype[name] !== undefined && typeof this._.reflectedClass.prototype[name] === "function";

    };

    ReflectionClass.prototype.newInstance = function() {
        return this.newInstanceArgs(arguments);

    };

    ReflectionClass.prototype.newInstanceArgs = function(args) {
        var inst, ret, tmp = function() {};
        tmp.prototype = this._.reflectedClass.prototype;
        inst = new tmp();
        ret = this._.reflectedClass.apply(inst, args);

        return Object(ret) === ret ? ret : inst;

    };

    _context.register(ReflectionClass, 'ReflectionClass');

});
;
_context.invoke('Utils', function(Arrays, undefined) {

    var ReflectionFunction = function(f) {
        this._ = {
            reflectedFunction: f,
            argsList: f.length ? f.toString().match(/^function\s*\(\s*(.*?)\s*\)/i)[1].split(/\s*,\s*/) : []
        };

    };

    ReflectionFunction.from = function(f) {
        return f instanceof ReflectionFunction ? f : new ReflectionFunction(f);

    };

    ReflectionFunction.prototype.invoke = function(context) {
        var args = Arrays.createFrom(arguments);
        args.shift();

        return this._.reflectedFunction.apply(context, args);

    };

    ReflectionFunction.prototype.getArgs = function () {
        return this._.argsList;

    };

    ReflectionFunction.prototype.invokeArgs = function(context, args) {
        var list = [];
        for (var i = 0; i < this._.argsList.length; i++) {
            if (args[this._.argsList[i]] === undefined) {
                throw new Error('Parameter "' + this._.argsList[i] + '" was not provided in argument list');

            }

            list.push(args[this._.argsList[i]]);

        }

        return this._.reflectedFunction.apply(context, list);

    };

    _context.register(ReflectionFunction, 'ReflectionFunction');

});
;
_context.invoke('Nittro', function () {

    var prepare = function (self, need) {
        if (!self._) {
            if (need === false) return false;
            self._ = {};

        }

        if (!self._.eventEmitter) {
            if (need === false) return false;

            self._.eventEmitter = {
                listeners: {},
                defaultListeners: {},
                namespaces: []
            };
        }
    };

    var prepareNamespaces = function (emitter, namespaces) {
        return namespaces.map(function (ns) {
            var i = emitter.namespaces.indexOf(ns);

            if (i > -1) return i;

            i = emitter.namespaces.length;
            emitter.namespaces.push(ns);

            return i;

        });
    };

    var hasCommonElement = function (a, b) {
        var i = 0, j = 0;

        while (i < a.length && j < b.length) {
            if (a[i] < b[j]) i++;
            else if (a[i] > b[j]) j++;
            else return true;

        }

        return false;

    };

    var process = function (emitter, evt, op, arg1, arg2) {
        evt = (evt || '').replace(/^\s+|\s+$/g, '').split(/\s+/g);

        evt.forEach(function (e) {
            var dflt = e.split(/:/),
                ns = dflt[0].split(/\./g);

            e = ns.shift();
            ns = prepareNamespaces(emitter, ns);
            ns.sort();
            op(emitter, e, ns, dflt[1] === 'default', arg1, arg2);

        });
    };

    var add = function (emitter, evt, ns, dflt, handler, mode) {
        if (!evt) {
            throw new TypeError('No event specified');

        }

        if (dflt) {
            if (mode !== 0 || ns.length) {
                throw new TypeError("Default event handlers don't support namespaces and one()/first()");

            } else if (emitter.defaultListeners.hasOwnProperty(evt)) {
                throw new TypeError("Event '" + evt + "' already has a default listener");

            }

            emitter.defaultListeners[evt] = handler;
            return;

        }

        if (mode === 2) {
            ns.unshift(emitter.namespaces.length);

        }

        emitter.listeners[evt] || (emitter.listeners[evt] = []);
        emitter.listeners[evt].push({handler: handler, namespaces: ns, mode: mode});

    };

    var remove = function (emitter, evt, ns, dflt, handler) {
        if (!evt) {
            var listeners = dflt ? emitter.defaultListeners : emitter.listeners;

            for (evt in listeners) {
                if (listeners.hasOwnProperty(evt)) {
                    remove(emitter, evt, ns, dflt, handler);

                }
            }

            return;

        }

        if (dflt) {
            if (emitter.defaultListeners.hasOwnProperty(evt) && (!handler || emitter.defaultListeners[evt] === handler)) {
                delete emitter.defaultListeners[evt];

            }

            return;

        }

        if (!emitter.listeners[evt]) return;

        if (ns.length) {
            emitter.listeners[evt] = emitter.listeners[evt].filter(function (listener) {
                if (handler && listener.handler !== handler) return true;
                return !listener.namespaces.length || !hasCommonElement(listener.namespaces, ns);

            });
        } else if (handler) {
            emitter.listeners[evt] = emitter.listeners[evt].filter(function (listener) {
                return listener.handler !== handler;

            });
        } else {
            if (emitter.listeners.hasOwnProperty(evt)) {
                delete emitter.listeners[evt];

            }

            if (emitter.defaultListeners.hasOwnProperty(evt)) {
                delete emitter.defaultListeners[evt];

            }
        }
    };

    var trigger = function (self, evt, data) {
        var e, _ = self._.eventEmitter;

        if (typeof evt !== "object") {
            e = new NittroEvent(evt, data);

        }

        if (_.listeners.hasOwnProperty(evt)) {
            _.listeners[evt].slice().forEach(function (listener) {
                if (listener.mode === 1) {
                    remove(_, evt, [], false, listener.handler);

                } else if (listener.mode === 2) {
                    remove(_, '', [listener.namespaces[0]], false);

                }

                listener.handler.call(self, e);

            });
        }

        if (!e.isDefaultPrevented() && _.defaultListeners.hasOwnProperty(evt)) {
            _.defaultListeners[evt].call(self, e);

        }

        return e;

    };

    var NittroEventEmitter = {
        on: function (evt, handler) {
            prepare(this);
            process(this._.eventEmitter, evt, add, handler, 0);
            return this;

        },

        one: function (evt, handler) {
            prepare(this);
            process(this._.eventEmitter, evt, add, handler, 1);
            return this;

        },

        first: function (evt, handler) {
            prepare(this);
            process(this._.eventEmitter, evt, add, handler, 2);
            this._.eventEmitter.namespaces.push(null);
            return this;

        },

        off: function (evt, handler) {
            if (prepare(this, false) === false) return this;
            process(this._.eventEmitter, evt, remove, handler);
            return this;

        },

        trigger: function (evt, data) {
            if (prepare(this, false) === false) return this;
            return trigger(this, evt, data);

        }
    };

    var returnTrue = function () {
        return true;
    };

    var returnFalse = function () {
        return false;
    };

    var NittroEvent = _context.extend(function (type, data) {
        this.type = type;
        this.data = data || {};

    }, {
        preventDefault: function () {
            this.isDefaultPrevented = returnTrue;

        },

        isDefaultPrevented: returnFalse

    });

    _context.register(NittroEventEmitter, 'EventEmitter');
    _context.register(NittroEvent, 'Event');

});
;
_context.invoke('Nittro', function () {

    var prepare = function (self, need) {
        if (!self._) {
            if (need === false) return false;
            self._ = {};

        }

        if (!self._.hasOwnProperty('frozen')) {
            if (need === false) return false;
            self._.frozen = false;

        }
    };

    var Freezable = {
        freeze: function () {
            prepare(this);
            this._.frozen = true;
            return this;

        },

        isFrozen: function () {
            if (prepare(this, false) === false) {
                return false;

            }

            return this._.frozen;

        },

        _updating: function (prop) {
            if (prepare(this, false) === false) {
                return this;

            }

            if (this._.frozen) {
                var className = _context.lookupClass(this) || 'object';

                if (prop) {
                    prop = ' "' + prop + '"';

                }

                throw new Error('Cannot update property' + prop + ' of a frozen ' + className);

            }

            return this;

        }
    };


    _context.register(Freezable, 'Freezable');

});
;
_context.invoke('Nittro', function () {

    var Object = _context.extend(function () {
        this._ = { };

    }, {

    });

    _context.mixin(Object, 'Nittro.EventEmitter');
    _context.register(Object, 'Object');

});
