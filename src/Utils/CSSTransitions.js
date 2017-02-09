_context.invoke('Utils', function (DOM) {

    var CSSTransitions = {
        support: 'getComputedStyle' in window,

        getDuration: function (elements) {
            if (!Array.isArray(elements)) {
                elements = [elements];
            }

            var durations = DOM.getStyle(elements, 'animationDuration')
                .concat(DOM.getStyle(elements, 'transitionDuration'))
                .map(function(d) {
                    if (!d) {
                        return 0;
                    }

                    return Math.max.apply(null, d.split(/\s*,\s*/g).map(function(v) {
                        v = v.match(/^((?:\d*\.)?\d+)(m?s)$/);
                        return v ? parseFloat(v[1]) * (v[2] === 'ms' ? 1 : 1000) : 0;

                    }));
                });

            return durations.length ? Math.max.apply(null, durations) : 0;

        },

        run: function(elements, classes, forceLayout) {
            if (!CSSTransitions.support || (Array.isArray(elements) ? !elements.length : !elements)) {
                return Promise.resolve(elements);

            } else {
                return CSSTransitions._resolve(elements, classes, forceLayout);

            }
        },

        _resolve: function (elements, classes, forceLayout) {
            if (forceLayout) {
                var foo = window.pageXOffset; // needed to force layout and thus run asynchronously

            }

            classes && classes.add && DOM.addClass(elements, classes.add);
            classes && classes.remove && DOM.removeClass(elements, classes.remove);

            var duration = CSSTransitions.getDuration(elements);

            return new Promise(function (fulfill) {
                window.setTimeout(function () {
                    classes && classes.add && DOM.removeClass(elements, classes.add);
                    classes && classes.after && DOM.addClass(elements, classes.after);
                    fulfill(elements);

                }, duration);
            });
        }
    };

    if (CSSTransitions.support) try {
        var s = DOM.create('span').style;

        CSSTransitions.support = [
            'transition',
            'WebkitTransition',
            'MozTransition',
            'msTransition',
            'OTransition'
        ].some(function(prop) {
            return prop in s;
        });

        s = null;

    } catch (e) { }

    _context.register(CSSTransitions, 'CSSTransitions');

});
