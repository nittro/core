describe('Nittro.EventEmitter', function () {

    var NittroEventEmitter,
        NittroEvent,
        TestObject,
        testInstance,
        listeners;

    beforeAll(function () {
        NittroEventEmitter = _context.lookup('Nittro.EventEmitter');
        NittroEvent = _context.lookup('Nittro.Event');

        TestObject = function() {};
        _context.mixin(TestObject, NittroEventEmitter);
        testInstance = new TestObject();

        listeners = {
            all: function() {},
            one: function() {},
            first: function() {},
            prevent: function(evt) { evt.preventDefault() },
            def: function() {},
            ns: function() {},
            data: function(evt) {},
            async: function(evt) { evt.waitFor(new Promise(function(fulfill) { window.setTimeout(fulfill, 100); })); },
            asyncDef: function () {}
        };

        spyOn(listeners, 'all');
        spyOn(listeners, 'one');
        spyOn(listeners, 'first');
        spyOn(listeners, 'prevent').and.callThrough();
        spyOn(listeners, 'def');
        spyOn(listeners, 'ns');
        spyOn(listeners, 'data');
        spyOn(listeners, 'async').and.callThrough();
        spyOn(listeners, 'asyncDef');

    });

    describe('mixin', function () {
        it('should define the on(), one(), first(), off() and trigger() methods', function () {
            expect(NittroEventEmitter).toEqual({
                on: jasmine.any(Function),
                one: jasmine.any(Function),
                first: jasmine.any(Function),
                off: jasmine.any(Function),
                trigger: jasmine.any(Function)
            });
        });
    });



    describe('on()', function () {
        it('should bind an event listener and return this', function () {
            expect(testInstance.on('event1 event2', listeners.all)).toBe(testInstance);
            expect(testInstance.on('event2.testns', listeners.ns)).toBe(testInstance);
        });

        it('should support binding a default listener', function () {
            expect(testInstance.on('event1:default', listeners.def)).toBe(testInstance);
        });
    });


    describe('one()', function () {
        it('should bind a listener for the first occurrence of each of the specified events', function () {
            expect(testInstance.one('event1 event2', listeners.one)).toBe(testInstance);
        });
    });


    describe('first()', function () {
        it('should bind a listener to the first occurrence of any of the specified event', function () {
            expect(testInstance.first('event1 event2', listeners.first)).toBe(testInstance);
        });
    });


    describe('trigger()', function () {
        it('should trigger the specified event', function () {
            testInstance.trigger('event1');
            testInstance.trigger('event1');
            testInstance.trigger('event2');
            expect(listeners.all).toHaveBeenCalledTimes(3);
            expect(listeners.one).toHaveBeenCalledTimes(2);
            expect(listeners.first).toHaveBeenCalledTimes(1);
            expect(listeners.def).toHaveBeenCalledTimes(2);
            expect(listeners.ns).toHaveBeenCalledTimes(1);
        });

        it('shouldn\'t invoke the default handler if evt.preventDefault() has been called', function () {
            testInstance.on('event1', listeners.prevent);
            testInstance.trigger('event1');
            expect(listeners.all).toHaveBeenCalledTimes(4);
            expect(listeners.prevent).toHaveBeenCalledTimes(1);
            expect(listeners.def).toHaveBeenCalledTimes(2);
        });

        it('should pass data to the event handlers', function () {
            testInstance.on('event3', listeners.data);

            var data = { foo: 1, bar: 2, baz: 3 };
            testInstance.trigger('event3', data);

            expect(listeners.data.calls.mostRecent()).toEqual(jasmine.objectContaining({
                object: testInstance,
                args: [ new NittroEvent(testInstance, 'event3', data) ]
            }));
        });
    });

    describe('off()', function () {
        it('should remove the specified listeners', function () {
            testInstance.off(null, listeners.all);
            testInstance.trigger('event1');
            expect(listeners.all).toHaveBeenCalledTimes(4);

            testInstance.off('.testns');
            testInstance.trigger('event2');
            expect(listeners.ns).toHaveBeenCalledTimes(1);
        });
    });

    describe('async events', function () {
        it('should provide Promise interface', function (done) {
            testInstance.on('asyncEvent', listeners.async);
            testInstance.on('asyncEvent:default', listeners.asyncDef);
            var e = testInstance.trigger('asyncEvent');

            expect(e.isAsync()).toBe(true);
            expect(e.then).toEqual(jasmine.any(Function));
            expect(listeners.async).toHaveBeenCalledTimes(1);
            expect(listeners.asyncDef).not.toHaveBeenCalled();

            e.then(function () {
                expect(listeners.asyncDef).toHaveBeenCalledTimes(1);
                done();
            }, function () {
                done.fail('Promise had been rejected');
            });
        });
    });

});
