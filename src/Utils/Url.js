_context.invoke('Utils', function(Strings, undefined) {

    var location = window.history.location || window.location; // support for HTML5 history polyfill

    var Url = function(s) {
        if (s === null || s === '' || s === undefined) {
            this._ = {
                protocol: location.protocol,
                hostname: location.hostname,
                port: location.port,
                path: location.pathname,
                params: Url.parseQuery(location.search),
                hash: location.hash
            };

            extractAuthInfo(location.href, this._);
        } else {
            s += '';

            var proto = Url.RE_PROTOCOL.exec(s),
                auth,
                i;

            this._ = {
                protocol: proto ? proto[1] || location.protocol : location.protocol
            };

            if (proto) {
                if (proto[2] && proto[3] || proto[4]) {
                    s = s.substr(proto[0].length);
                    auth = Url.RE_AUTHORITY.exec(s) || [''];
                    s = s.substr(auth[0].length);
                    this._.username = auth[1] || '';
                    this._.password = auth[2] || '';
                    this._.hostname = auth[3] || '';
                    this._.port = auth[4] || '';
                } else {
                    this._.username
                        = this._.password
                        = this._.hostname
                        = this._.port
                        = this._.path
                        = this._.hash
                        = '';

                    this._.params = {};
                    return;
                }
            } else {
                this._.username = '';
                this._.password = '';
                this._.hostname = location.hostname;
                this._.port = location.port;
            }

            if ((i = s.indexOf('#')) > -1) {
                this._.hash = s.substr(i);
                s = s.substr(0, i);
            } else {
                this._.hash = '';
            }

            if ((i = s.indexOf('?')) > -1) {
                this._.params = Url.parseQuery(s.substr(i + 1));
                s = s.substr(0, i);
            } else {
                this._.params = {};
            }

            this._.path = s || '/';
        }
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

    Url.prototype.getOrigin = function () {
        return this._.protocol + '//' + this._.hostname + (this._.port ? ':' + this._.port : '');
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
        if (Array.isArray(p) && (p.length && 'name' in p[0] && 'value' in p[0])) {
            p = Url.parseQuery(Url.buildQuery(p, true));
        }

        for (var k in p) {
            if (p[k] !== undefined) {
                this._.params[k] = p[k];
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
        to = Url.from(to || location.href);

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

    Url.RE_PROTOCOL = /^((?:(https?)|[a-z][a-z0-9.+-]*):)(\/\/)?|^(\/\/)/i;
    Url.RE_AUTHORITY = /^(?:([^@:]+?)(?::([^@]+))?@)?([^:\/]+)(?::(\d+))?/;

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
        return s instanceof Url ? new Url(s.toAbsolute()) : new Url(s);
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
        var q = [], n;

        function en(v) {
            return encodeURIComponent(v).replace(/%20/g, '+');
        }

        function val(v) {
            if (v === undefined) {
                return null;

            } else if (typeof v === 'boolean') {
                return v ? 1 : 0;

            } else {
                return en('' + v);

            }
        }

        function flatten(a, n) {
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

            return r.length ? r.filter(function(v) { return v !== null }).join('&') : null;

        }

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

        function dec(v) {
            return decodeURIComponent(v.replace(/\+/g,' '));
        }

        function convertType(v) {
            var c;

            if (v.match(/^(?:[1-9]\d*|0)$/) && (c = parseInt(v)) + '' === v) {
                return c;

            } else if (v.match(/^\d*\.\d+$/) && (c = parseFloat(v)) + '' === v) {
                return c;

            }

            return v;

        }

        for (i = 0; i < s.length; i++) {
            m = s[i].split('=');
            n = dec(m.shift());
            v = convertType(dec(m.join('=')));

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


    function extractAuthInfo(url, onto) {
        url = url.replace(Url.RE_PROTOCOL, '');

        var tmp = url.indexOf('@');

        if (tmp > -1) {
            tmp = url.substr(0, tmp).split(':', 2);
            onto.username = tmp[0];
            onto.password = tmp[1] || '';
        } else {
            onto.username = onto.password = '';
        }
    }

    _context.register(Url, 'Url');

});
