describe('Utils.DOM', function () {

    var DOM, rootElem, listeners;

    beforeAll(function () {
        DOM = _context.lookup('Utils.DOM');

        listeners = {
            click: function () {},
            custom: function() {},
            delegate: function() {}
        };
    });

    afterAll(function () {
        rootElem && document.body.removeChild(rootElem);
        rootElem = null;
    });

    describe('create()', function () {
        it('creates the specified DOM element, optionally setting attributes', function () {
            var elem = DOM.create('div');
            expect(elem).toEqual(jasmine.any(HTMLDivElement));
            expect(elem.nodeName).toBe('DIV');

            rootElem = elem;
            document.body.appendChild(rootElem);
        });
    });

    describe('setAttributes()', function () {
        it('sets the specified attributes to the given DOM element', function () {
            DOM.setAttributes(rootElem, {id: 'dom-test'});
            expect(rootElem.getAttribute('id')).toBe('dom-test');
        });
    });

    describe('createFromHtml()', function () {
        it('creates the specified DOM elements from the provided HTML string', function () {
            var elems = DOM.createFromHtml('<div class="test-class"></div> <div class="test-class"></div> <div class="test-class" id="test-div-3"></div>');
            expect(elems.length).toBe(3);

            expect(elems[0].getAttribute('class')).toBe('test-class');
            expect(elems[1].getAttribute('class')).toBe('test-class');
            expect(elems[2].getAttribute('class')).toBe('test-class');
            expect(elems[2].getAttribute('id')).toBe('test-div-3');

            elems.forEach(function(elem) {
                rootElem.appendChild(elem);
            });
        });
    });

    describe('html()', function () {
        it('sets the specified DOM element\'s innerHTML to the specified string', function () {
            DOM.html(document.getElementById('test-div-3'), '<div id="test-div-4"><span id="test-span-1"></span> <span id="test-span-2"></span></div>');
            expect(document.getElementById('test-div-3').childNodes.length).toBe(1);
            expect(document.getElementById('test-div-3').innerHTML).toBe('<div id="test-div-4"><span id="test-span-1"></span> <span id="test-span-2"></span></div>');
        });
    });

    describe('append()', function () {
        it('appends all elements to the given parent in the order specified', function () {
            var elems = DOM.createFromHtml('<span>4</span><span>5</span><span>6</span>');
            DOM.append(document.getElementById('test-span-1'), elems);
            expect(document.getElementById('test-span-1').childNodes.length).toBe(3);
            expect(document.getElementById('test-span-1').textContent).toBe('456');
        });
    });

    describe('prepend()', function () {
        it('prepends all elements to the given parent in the order specified', function () {
            var elems = DOM.createFromHtml('<span>1</span><span>2</span><span>3</span>');
            DOM.prepend(document.getElementById('test-span-1'), elems);
            expect(document.getElementById('test-span-1').childNodes.length).toBe(6);
            expect(document.getElementById('test-span-1').textContent).toBe('123456');
        });
    });

    describe('insertBefore()', function () {
        it('inserts the specified nodes before the given sibling node in the order specified', function () {
            var elems = DOM.createFromHtml('<span>a</span><span>b</span><span>c</span>');
            DOM.insertBefore(document.getElementById('test-span-1').childNodes.item(3), elems);
            expect(document.getElementById('test-span-1').childNodes.length).toBe(9);
            expect(document.getElementById('test-span-1').textContent).toBe('123abc456');
        });
    });

    describe('empty()', function () {
        it('removes all child nodes from the specified parent node', function () {
            DOM.empty(document.getElementById('test-span-1'));
            expect(document.getElementById('test-span-1').childNodes.length).toBe(0);
        });
    });

    describe('getByClassName()', function () {
        it('returns all elements which have the specified class', function () {
            expect(DOM.getByClassName('test-class').length).toBe(3);
            expect(DOM.getByClassName('nonexistent').length).toBe(0);
        });
    });

    describe('getById()', function () {
        it('returns the element with the matching ID, or null if none found', function () {
            expect(DOM.getById('test-div-3')).toBe(document.getElementById('test-div-3'));
            expect(DOM.getById('nonexistent')).toBe(null);
        });
    });

    describe('find()', function () {
        it('returns all elements matching a simple selector', function () {
            expect(DOM.find('#test-div-3, .test-class').length).toBe(4);
        });
    });

    describe('getChildren()', function () {
        it('returns non-text children of the specified element', function () {
            expect(document.getElementById('test-div-4').childNodes.length).toBe(3);
            expect(DOM.getChildren(document.getElementById('test-div-4')).length).toBe(2);
        });
    });

    describe('closest()', function () {
        it('should return the closest element with a matching node name and optionally class name', function () {
            var elem = DOM.closest(DOM.getById('test-span-1'), 'div');
            expect(elem).toEqual(jasmine.any(HTMLDivElement));
            expect(elem.getAttribute('id')).toBe('test-div-4');

            elem = DOM.closest(DOM.getById('test-span-1'), 'div', 'test-class');
            expect(elem).toEqual(jasmine.any(HTMLDivElement));
            expect(elem.getAttribute('id')).toBe('test-div-3');

            elem = DOM.closest(DOM.getById('test-span-1'), 'span');
            expect(elem).toBe(document.getElementById('test-span-1'));

            elem = DOM.closest(DOM.getById('test-span-1'), 'span', 'nonexistent');
            expect(elem).toBe(null);
        });
    });

    describe('setStyle()', function () {
        it('should set the elements\' style properties', function () {
            DOM.setStyle(rootElem, 'display', 'none');
            expect(rootElem.style.display).toBe('none');
            DOM.setStyle(rootElem, {display: ''});
            expect(rootElem.style.display).toBe('');
        });
    });

    describe('getStyle()', function () {
        it('should return the element\'s computed style', function () {
            rootElem.style.position = 'absolute';
            rootElem.style.left = '10em';
            rootElem.style.top = '10em';

            var computed = DOM.getStyle(rootElem, 'left');
            expect(computed).toEqual(jasmine.any(String));
            expect(parseFloat(computed.replace(/px$/, ''))).toBeGreaterThan(0);

            rootElem.style.left = '30px';
            rootElem.style.top = '30px';
            computed = DOM.getStyle(rootElem, 'position left top');
            expect(computed).toEqual({position: 'absolute', left: '30px', top: '30px'});

            rootElem.style.position = '';
            rootElem.style.left = '';
            rootElem.style.top = '';

        });
    });

    describe('getStyleFloat()', function () {
        it('should return the element\'s computed style with float-like values converted to floats, normalizing seconds to milliseconds', function () {
            rootElem.style.position = 'absolute';
            rootElem.style.left = '10em';
            rootElem.style.top = '10em';

            var computed = DOM.getStyleFloat(rootElem, 'left');
            expect(computed).toEqual(jasmine.any(Number));
            expect(computed).toBeGreaterThan(0);

            rootElem.style.left = '30px';
            rootElem.style.top = '30px';
            rootElem.style.webkitTransition = 'opacity 3s';
            computed = DOM.getStyleFloat(rootElem, 'position left top transitionDuration');
            expect(computed).toEqual({position: 'absolute', left: 30, top: 30, transitionDuration: 3000});

            rootElem.style.position = '';
            rootElem.style.left = '';
            rootElem.style.top = '';
            rootElem.style.transition = '';

        });
    });

    describe('contains()', function () {
        it('should return true if the second argument is a descendant of the first argument', function () {
            var elem = DOM.getById('test-span-1');
            expect(DOM.contains(rootElem, elem)).toBe(true);
            expect(DOM.contains(elem, rootElem)).toBe(false);
        });
    });

    describe('addListener()', function () {
        it('should add an event listener', function () {
            spyOn(listeners, 'click');
            DOM.addListener(rootElem, 'click', listeners.click);
            DOM.getById('test-span-1').click();
            expect(listeners.click).toHaveBeenCalled();
        });
    });

    describe('removeListener()', function () {
        it('should remove an event listener', function () {
            spyOn(listeners, 'click');
            DOM.removeListener(rootElem, 'click', listeners.click);
            DOM.getById('test-span-1').click();
            expect(listeners.click).not.toHaveBeenCalled();
        });
    });

    describe('trigger()', function () {
        it('should trigger an event', function () {
            spyOn(listeners, 'custom');
            DOM.addListener(rootElem, 'custom', listeners.custom);
            DOM.trigger('test-span-1', 'custom');
            expect(listeners.custom).toHaveBeenCalled();
        });
    });

    describe('delegate()', function () {
        it('should create a delegate event listener', function () {
            spyOn(listeners, 'delegate');

            var listener = DOM.delegate('.test-class, #test-span-1', listeners.delegate);

            DOM.addListener(rootElem, 'click', listener);
            DOM.trigger('test-span-1', 'click');
            expect(listeners.delegate).toHaveBeenCalledTimes(2);
            expect(listeners.delegate.calls.first().object).toBe(document.getElementById('test-span-1'));
            expect(listeners.delegate.calls.mostRecent().object).toBe(document.getElementById('test-div-3'));

            DOM.trigger('test-span-2', 'click');
            expect(listeners.delegate).toHaveBeenCalledTimes(3);
            expect(listeners.delegate.calls.mostRecent().object).toBe(document.getElementById('test-div-3'));

            DOM.removeListener(rootElem, 'click', listener);
        });
    });

    describe('addClass()', function () {
        it('should add a class', function () {
            DOM.addClass(rootElem, 'classList-test');
            expect(rootElem.getAttribute('class')).toBe('classList-test');
        });
    });

    describe('toggleClass()', function () {
        it('should toggle a class', function () {
            DOM.toggleClass(rootElem, 'classList-test');
            expect(rootElem.getAttribute('class')).toBe('');
        });

        it('should toggle a class to the state specified by the third argument', function () {
            DOM.toggleClass(rootElem, 'classList-test', true);
            expect(rootElem.getAttribute('class')).toBe('classList-test');
            DOM.toggleClass(rootElem, 'classList-test', true);
            expect(rootElem.getAttribute('class')).toBe('classList-test');
        });
    });

    describe('hasClass()', function () {
        it('should return true if the element has the specified class', function () {
            expect(DOM.hasClass(rootElem, 'classList-test')).toBe(true);
            expect(DOM.hasClass(rootElem, 'nonexistent')).toBe(false);
        });
    });

    describe('removeClass()', function () {
        it('should remove the specified class from the element', function () {
            DOM.removeClass(rootElem, 'classList-test');
            expect(DOM.hasClass(rootElem, 'classList-test')).toBe(false);
        });
    });

    describe('getData()', function () {
        it('should retrieve data from the element\'s dataset', function () {
            var jsonData = {foo: 2, bar: 3.4, baz: true};
            DOM.html(DOM.getById('test-span-1'), '<span id="test-span-data" data-test-int="42" data-test-float="3.4" data-test-bool="true" data-test-json="' + JSON.stringify(jsonData).replace(/"/g, '&quot;') + '"></span>');

            var elem = DOM.getById('test-span-data');
            expect(DOM.getData(elem, 'test-int')).toBe(42);
            expect(DOM.getData(elem, 'test-float')).toBe(3.4);
            expect(DOM.getData(elem, 'test-bool')).toBe(true);
            expect(DOM.getData(elem, 'test-json')).toEqual(jsonData);
            expect(DOM.getData(elem, 'test-dummy', 34)).toBe(34);

        });
    });

    describe('setData()', function () {
        it('should set data in element\'s dataset', function () {
            var elem = DOM.getById('test-span-data');
            DOM.setData(elem, 'test-int', 43);
            expect(DOM.getData(elem, 'test-int')).toBe(43);
        });
    });

});
