module.exports = function (grunt) {

    var NittroCore = [
        'src/js/context.js',
        'src/js/Utils/Strings.js',
        'src/js/Utils/Arrays.js',
        'src/js/Utils/HashMap.js',
        'src/js/Utils/Url.js',
        'src/js/Utils/DOM.js',
        'src/js/Utils/ReflectionClass.js',
        'src/js/Utils/ReflectionFunction.js',
        'src/js/Nittro/EventEmitter.js',
        'src/js/Nittro/Freezable.js',
        'src/js/Nittro/Object.js'
    ];

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        uglify: {
            options: {
                mangle: false,
                sourceMap: false
            },
            nittro: {
                files: {
                    'dist/js/nittro-core.min.js': NittroCore
                }
            }
        },

        concat: {
            options: {
                separator: ";\n"
            },
            nittro: {
                files: {
                    'dist/js/nittro-core.js': NittroCore
                }
            }
        },

        jasmine: {
            src: NittroCore,
            options: {
                vendor: [
                    'bower_components/promiz/promiz.min.js'
                ],
                specs: 'tests/specs/**.spec.js',
                display: 'short',
                summary: true
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-jasmine');
    grunt.registerTask('default', ['uglify', 'concat']);
    grunt.registerTask('test', ['jasmine']);

};
