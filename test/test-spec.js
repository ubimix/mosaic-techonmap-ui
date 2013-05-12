describe('EventManager', function() {
    var eventManager = new umx.EventManager();
    it('should be able to deliver events to all listeners', function() {
        var msg = null;
        var listener = function(e) {
            msg = e.message;
        };
        eventManager.on('hello', listener);
        expect(msg).toEqual(null);
        eventManager.fire('hello', {
            message : 'Hello, world!'
        });
        expect(msg).toEqual('Hello, world!');

        msg = '123';
        expect(msg).toEqual('123');
        eventManager.off('hello', listener);
        eventManager.fire('hello', {
            message : 'Hello, world!'
        });
        expect(msg).toEqual('123');

    });
});
var TEST_DATA = {
    "type" : "FeatureCollection",
    "features" : [ {
        "type" : "Feature",
        "geometry" : {
            "type" : "Point",
            "coordinates" : [ 102.0, 0.5 ]
        },
        "properties" : {
            "id" : "1",
            "name" : "First point"
        }
    }, {
        "type" : "Feature",
        "geometry" : {
            "type" : "Point",
            "coordinates" : [ 100.0, 1.0 ]
        },
        "properties" : {
            "id" : "2",
            "name" : "Second point"
        }
    } ]
};

describe('Application Services test', function() {

    var info;
    var stored = [];
    var store;

    function clone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    var TestStore = new umx.Class();
    TestStore.extend(umx.StoreService)
    TestStore.include({
        init : function() {
            umx.StoreService.prototype.init.call(this, {
                storeUrl : 'store',
                loadUrl : 'load'
            });
        },
        _ajax : function(params, onSuccess, onFailure) {
            var result;
            if (params.url == 'store') {
                expect(params.method).toEqual('POST');
                stored[0] = params.data;
                info.features.push(params.data);
                result = {};
            } else if (params.url == 'load') {
                expect(params.method).toEqual('GET');
                result = clone(info)
            } else {
                expect('').toEqual('GET or POST');
                result = {
                    'error' : 'GET or POST methods expected'
                };
            }
            onSuccess(result);
        }
    })

    function rebuildStoreService() {
        info = clone(TEST_DATA);
        stored = [];
        store = new TestStore();
    }

    describe('umx.StoreService', function() {
        beforeEach(rebuildStoreService);
        it('should be able to load all points', function() {
            store.load(function(result) {
                expect(result).not.toEqual(null);
                expect(result).toEqual(info);
            });
        });
    })

    describe('umx.FilterService', function() {
        beforeEach(rebuildStoreService);
        var filterService;
        beforeEach(function() {
            filterService = new umx.FilterService();
            filterService.setData(clone(info));
        });
        function testPointSearch(mask, point) {
            var r = filterService.search(mask);
            if (point) {
                expect(r).not.toEqual(null);
                expect(r.length).toEqual(1);
                expect(r[0]).not.toEqual(null);
                expect(r[0]).toEqual(point);
            } else {
                expect(r).not.toEqual(null);
                expect(r.length).toEqual(0);
                expect(r[0]).toEqual(null);
            }
        }
        it('should be able to load all points using an empty filter',
                function() {
                    var result = filterService.search({});
                    expect(result).not.toEqual(null);
                    expect(result).toEqual(info.features);
                });
        it('should be able to search points by names', function() {
            var data = info.features;
            testPointSearch({
                properties : {
                    name : 'First'
                }
            }, data[0]);
            testPointSearch({
                properties : {
                    name : 'Second'
                }
            }, data[1]);
        });
        it('should be able to store new items', function() {
            var done = false;
            var newItem = {
                id : '3'
            };
            expect(stored.length).toEqual(0);
            store.store(newItem, function() {
                done = true;
            })
            expect(done).toEqual(true);
            expect(stored.length).toEqual(1);
            expect(stored[0]).toEqual(newItem);
        });

        it('should be able refresh items after saving', function() {
            var data = info.features;
            var result = filterService.search({})
            expect(result).toEqual(data);
            expect(result.length).toEqual(data.length);

            var done = false;
            var newItem = {
                type : "Feature",
                geometry : {
                    "type" : "Point",
                    "coordinates" : [ 102.0, 0.5 ]
                },
                properties : {
                    id : '3',
                    name : 'Third object'
                }
            };
            expect(stored.length).toEqual(0);
            testPointSearch({
                properties : {
                    name : 'Third'
                }
            }, null);

            store.store(newItem, function() {
                done = true;
            })
            expect(done).toEqual(true);
            expect(stored.length).toEqual(1);
            expect(stored[0]).toEqual(newItem);

            // Without reloading - old data
            var result = filterService.search({})
            expect(result.length).toEqual(data.length - 1);

            testPointSearch({
                properties : {
                    name : 'Third'
                }
            }, null);

            // "Reload" data
            filterService.setData(clone(info));

            // Now it searches data as expected
            result = filterService.search({})
            expect(result.length).toEqual(data.length);
            expect(result).toEqual(data);

            testPointSearch({
                properties : {
                    name : 'Third'
                }
            }, newItem);
        });
    });

    describe('umx.DataManager', function() {
        beforeEach(rebuildStoreService);
        var dataManager;
        beforeEach(function() {
            dataManager = new umx.DataManager(store);
        });
        it('should manage search filter', function() {
            var msg = null;
            dataManager.on('toto', function(e) {
                msg = e.msg;
            })
            expect(msg).toEqual(null);
            dataManager.fire('toto', {
                msg : 'Hello, world!'
            })
            expect(msg).toEqual('Hello, world!');
        });
        it('should automatically update search results '
                + 'when search criteria are changed', function() {
            var data = info.features;
            var nameFilter = 'First';
            var expectedFilter = {
                coordinates : {},
                properties : {
                    name : nameFilter
                }
            };
            var result = null;
            var filterUpdated = false;
            var searchBegin = false;
            var searchEnd = false;
            var loadBegin = false;
            var loadEnd = false;
            dataManager.on('load:begin', function(e) {
                loadBegin = true;
            })
            dataManager.on('load:end', function(e) {
                loadEnd = true;
            })
            dataManager.on('filter:updated', function(e) {
                expect(e.filter).toEqual(expectedFilter);
                filterUpdated = true;
            })
            dataManager.on('search:begin', function(e) {
                expect(e.filter).toEqual(expectedFilter);
                searchBegin = true;
            })
            dataManager.on('search:end', function(e) {
                expect(e.filter).toEqual(expectedFilter);
                expect(e.result).toEqual([ data[0] ]);
                result = e.result;
                searchEnd = true;
            })

            expect(filterUpdated).toEqual(false);
            expect(loadBegin).toEqual(false);
            expect(loadEnd).toEqual(false);
            expect(searchBegin).toEqual(false);
            expect(searchEnd).toEqual(false);

            dataManager.setNameFilter(nameFilter);

            expect(filterUpdated).toEqual(true);
            expect(loadBegin).toEqual(true);
            expect(loadEnd).toEqual(true);
            expect(searchBegin).toEqual(true);
            expect(searchEnd).toEqual(true);
            expect(result).toEqual([ data[0] ]);

        })
    });

});