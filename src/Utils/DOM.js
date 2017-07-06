_context.invoke('Utils', function (Arrays, Strings, undefined) {

    /****** Utilities *******/

    function map(args, callback) {
        args = Arrays.createFrom(args);

        if (Array.isArray(args[0])) {
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
    }

    function getElem(elem) {
        if (Array.isArray(elem) || elem instanceof HTMLCollection || elem instanceof NodeList) {
            elem = elem[0];

        }

        return typeof elem === 'string' ? DOM.getById(elem) : elem;

    }

    function getPrefixed(elem, prop) {
        elem = getElem(elem);

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

    }

    function parseData(value) {
        if (!value) return null;

        try {
            return JSON.parse(value);

        } catch (e) {
            return value;

        }
    }




    /******* CustomEvent support in IE9+ ******/

    if (typeof window.CustomEvent !== 'function') {
        window.CustomEvent = function(event, params) {
            params = params || { bubbles: false, cancelable: false, detail: undefined };
            var evt = document.createEvent('CustomEvent');
            evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
            return evt;
        };

        window.CustomEvent.prototype = window.Event.prototype;

    }

    var knownEventModules = {
        MouseEvent: {
            create: function(type, params) {
                params.view || (params.view = window);
                return new MouseEvent(type, params);
            },
            init: function(event, type, params) {
                event.initMouseEvent(
                    type,
                    params.bubbles,
                    params.cancelable,
                    params.view || window,
                    params.detail || 1,
                    params.screenX || 0,
                    params.screenY || 0,
                    params.clientX || 0,
                    params.clientY || 0,
                    params.ctrlKey || false,
                    params.altKey || false,
                    params.shiftKey || false,
                    params.metaKey || false,
                    params.button || 1,
                    params.relatedTarget
                );
            }
        },
        KeyboardEvent: {
            create: function(type, params) { return new KeyboardEvent(type, params); },
            init: function(event, type, params) {
                var modifiers = [];
                params.ctrlKey && modifiers.push('Control');
                params.shiftKey && modifiers.push('Shift');
                params.altKey && modifiers.push('Alt');
                params.metaKey && modifiers.push('Meta');
                event.initKeyboardEvent(type, params.bubbles, params.cancelable, params.view || window, params.key || '', params.location || 0, modifiers.join(' '));
            }
        },
        FocusEvent: {
            create: function(type, params) { return new FocusEvent(type, params); },
            init: function(event, type, params) {
                event.initUIEvent(type, params.bubbles, params.cancelable, params.view || window, params.detail || 0);
            },
            name: 'UIEvent'
        },
        HTMLEvents: {
            create: function(type, params) { return new Event(type, params); },
            init: function(event, type, params) {
                event.initEvent(type, params.bubbles, params.cancelable);
            }
        },
        CustomEvent: {
            create: function(type, params) { return new CustomEvent(type, params); },
            init: function(event, type, params) {
                event.initCustomEvent(type, params.bubbles, params.cancelable, params.detail);
            }
        }
    };

    var knownEvents = {
        click: 'MouseEvent',
        dblclick: 'MouseEvent',
        mousedown: 'MouseEvent',
        mouseenter: 'MouseEvent',
        mouseleave: 'MouseEvent',
        mousemove: 'MouseEvent',
        mouseout: 'MouseEvent',
        mouseover: 'MouseEvent',
        mouseup: 'MouseEvent',
        contextmenu: 'MouseEvent',
        keydown: 'KeyboardEvent',
        keypress: 'KeyboardEvent',
        keyup: 'KeyboardEvent',
        focus: 'FocusEvent',
        blur: 'FocusEvent',
        change: 'HTMLEvents',
        submit: 'HTMLEvents',
        reset: 'HTMLEvents'
    };

    var containers = {
        caption: 'table',
        colgroup: 'table',
        col: 'colgroup',
        thead: 'table',
        tbody: 'table',
        tfoot: 'table',
        tr: 'table',
        th: 'tr',
        td: 'tr',
        li: 'ul',
        optgroup: 'select',
        option: 'select'
    };



    /******* Public interface *******/

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
                var m = s.match(/^#([^\s\[>+:.]+)\s+\.([^\s\[>+:]+)$/);

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
            var container,
                elems;

            if (container = html.match(/^\s*<(caption|colgroup|col|thead|tbody|tfoot|tr|th|td|li|optgroup|option)[\s>]/i)) {
                container = containers[container[1].toLowerCase()];
            }

            container = DOM.create(container || 'div');
            DOM.html(container, html);
            elems = DOM.getChildren(container);

            elems.forEach(function (e) {
                container.removeChild(e);
            });

            container = null;

            return elems.length > 1 ? elems : elems[0];

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

        getStyle: function(elem, props, prefix) {
            if (!Array.isArray(props)) {
                props = props.split(/\s+/g);
            }

            var prefixed = props;

            if (prefix !== false) {
                prefixed = props.map(function(prop) {
                    return getPrefixed(elem, prop);
                });
            }

            return map([elem], function(elem) {
                var style = window.getComputedStyle(elem);

                if (props.length === 1) {
                    return style[prefixed[0]];

                } else {
                    var res = {};

                    props.forEach(function(prop, i) {
                        res[prop] = style[prefixed[i]];

                    });

                    return res;

                }
            });
        },

        getStyleFloat: function(elem, props, prefix) {
            if (!Array.isArray(props)) {
                props = props.split(/\s+/g);
            }

            var style = DOM.getStyle(elem, props, prefix),
                refloat = /^(\d+|\d*\.\d+)(px|m?s)?$/;

            function normalizeValue(v) {
                var m = refloat.exec(v);

                if (m) {
                    v = parseFloat(m[1]);

                    if (m[2] === 's') {
                        v *= 1000;

                    }
                }

                return v;

            }

            function stylePropsToFloat(style) {
                if (props.length === 1) {
                    return normalizeValue(style);

                } else {
                    props.forEach(function(prop) {
                        style[prop] = normalizeValue(style[prop]);

                    });

                    return style;

                }
            }

            if (Array.isArray(style)) {
                return style.map(stylePropsToFloat);

            } else {
                return stylePropsToFloat(style);

            }
        },

        html: function (elem, html) {
            return map([elem], function (elem) {
                elem.innerHTML = html;

                Arrays.createFrom(elem.getElementsByTagName('script')).forEach(function (elem) {
                    var type = elem.type ? elem.type.toLowerCase() : null;

                    if (!type || type === 'text/javascript' || type === 'application/javascript') {
                        var load = elem.hasAttribute('src'),
                            src = load ? elem.src : (elem.text || elem.textContent || elem.innerHTML || ''),
                            attrs = {}, i,
                            script;

                        for (i = 0; i < elem.attributes.length; i++) {
                            if (elem.attributes.item(i).name !== 'src') {
                                attrs[elem.attributes.item(i).name] = elem.attributes.item(i).value;
                            }
                        }

                        script = DOM.create('script', attrs);

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

        empty: function(elem) {
            return map(arguments, function (elem) {
                while (elem.firstChild) {
                    elem.removeChild(elem.firstChild);
                }
            });
        },

        append: function (elem, children) {
            elem = getElem(elem);
            children = Array.isArray(children) ? children : Arrays.createFrom(arguments, 1);

            children.forEach(function(child) {
                elem.appendChild(child);
            });

            return elem;

        },

        prepend: function (elem, children) {
            elem = getElem(elem);
            children = Array.isArray(children) ? children : Arrays.createFrom(arguments, 1);

            var first = elem.firstChild;

            children.forEach(function(child) {
                elem.insertBefore(child, first);
            });

            return elem;

        },

        insertBefore: function(before, elem) {
            var elems = Array.isArray(elem) ? elem : Arrays.createFrom(arguments, 1),
                parent;

            before = getElem(before);
            parent = before.parentNode;

            elems.forEach(function(elem) {
                parent.insertBefore(elem, before);
            });

            return before;

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

        addListener: function (elem, evt, listener, capture) {
            return map(arguments, function (elem, evt, listener, capture) {
                elem.addEventListener(evt, listener, !!capture);
                return elem;

            });
        },
        removeListener: function (elem, evt, listener, capture) {
            return map(arguments, function (elem, evt, listener, capture) {
                elem.removeEventListener(evt, listener, !!capture);
                return elem;

            });
        },

        trigger: function (elem, evt, params) {
            var module = knownEvents[evt] || 'CustomEvent',
                event;

            params || (params = {});
            'bubbles' in params || (params.bubbles = true);
            'cancelable' in params || (params.cancelable = true);

            try {
                event = knownEventModules[module].create(evt, params);

            } catch (e) {
                event = document.createEvent(knownEventModules[module].name || module);
                knownEventModules[module].init(event, evt, params);

            }

            return getElem(elem).dispatchEvent(event);

        },

        delegate: function(sel, handler) {
            sel = sel
                .trim()
                .split(/\s*,\s*/g)
                .map(function(s) {
                    var m = s.match(/^(?:(?:#([^\s\[>+:.]+)\s+)?\.([^\s\[>+:]+)|#([^\s\[>+:.]+))$/);
                    return [m[1] || m[3], m[2]];
                });

            return function(evt) {
                if (!evt.target) {
                    return;
                }

                var elems = [],
                    ids = [],
                    classes = [],
                    found = [],
                    elem = evt.target,
                    i, j;

                do {
                    elems.push(elem);
                    ids.push(elem.id);
                    classes.push(((elem.className || '') + '').trim().split(/\s+/g));
                } while (elem = elem.parentNode);

                for (i = 0; i < elems.length; i++) {
                    for (j = 0; j < sel.length; j++) {
                        if ((!sel[j][1] || classes[i].indexOf(sel[j][1]) > -1) && (!sel[j][0] || (!sel[j][1] ? ids[i] === sel[j][0] : ids.indexOf(sel[j][0]) > i))) {
                            found.push(elems[i]);
                        }
                    }
                }

                for (i = 0; i < found.length; i++) {
                    handler.call(found[i], evt, found[i]);
                }
            };
        },

        getData: function (elem, key, def) {
            elem = getElem(elem);
            key = 'data-' + key;

            if (!elem.hasAttribute(key)) {
                return def;
            }

            return parseData(elem.getAttribute(key));

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
