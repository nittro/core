describe('Utils.CSSTransitions', function () {

    var CSSTransitions, elems;

    beforeAll(function () {
        CSSTransitions = _context.lookup('Utils.CSSTransitions');

        elems = [];

        var elem;

        // element with no transition
        elem = document.createElement('div');
        elems.push(elem);

        // element with a single transition
        elem = document.createElement('div');
        elem.style.transition = 'opacity 0.5s';
        elems.push(elem);

        // element with multiple transitions
        elem = document.createElement('div');
        elem.style.transition = 'opacity 250ms, height 0.75s';
        elems.push(elem);

        elem = null;

        elems.forEach(function (elem) {
            document.body.appendChild(elem);
        });
    });

    afterAll(function () {
        if (elems) {
            elems.forEach(function (elem) {
                elem.parentNode && elem.parentNode.removeChild(elem);
            });

            elems = null;
        }
    });

    describe('support', function () {
        it('should be true in browsers supporting CSS3 Transitions', function () {
            expect(CSSTransitions.support).toBe(true);
        });
    });

    describe('getDuration()', function () {
        it('gets the maximum transition duration found in the passed elements', function () {
            expect(CSSTransitions.getDuration(elems[0])).toBe(0);
            expect(CSSTransitions.getDuration(elems[1])).toBe(500);
            expect(CSSTransitions.getDuration(elems[2])).toBe(750);
            expect(CSSTransitions.getDuration(elems)).toBe(750);
        });
    });

    describe('run()', function () {
        it('should return a Promise that is fulfilled after the transition has finished', function (done) {
            var start = Date.now();

            CSSTransitions.run(elems[1]).then(function () {
                expect(Date.now() - start).toBeGreaterThan(499);
                done();
            });
        });

        it('should apply all the specified classes in the correct moments', function (done) {
            elems[1].className = 'test-1 test-2';

            CSSTransitions.run(elems[1], {remove: 'test-2', add: 'test-3', after: 'test-4'}).then(function () {
                expect(elems[1].className).toMatch(/\btest-1\b/);
                expect(elems[1].className).not.toMatch(/\btest-2\b/);
                expect(elems[1].className).not.toMatch(/\btest-3\b/);
                expect(elems[1].className).toMatch(/\btest-4\b/);
                done();
            });

            expect(elems[1].className).toMatch(/\btest-1\b/);
            expect(elems[1].className).not.toMatch(/\btest-2\b/);
            expect(elems[1].className).toMatch(/\btest-3\b/);
        });
    });

});
