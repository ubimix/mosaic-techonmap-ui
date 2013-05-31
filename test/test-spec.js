describe('EventManager', function() {
    var eventManager;
    beforeEach(function() {
        eventManager = new umx.EventManager();
    });
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
    it('should be able to deliver events to all listeners in order',
            function() {
                var result = [];
                var aCounter = 1;
                var aListener = function(e) {
                    result.push('A-' + e + '-' + (aCounter++));
                    eventManager.fire('eventB', e);
                }
                var bCounter = 1;
                var bListener = function(e) {
                    result.push('B-' + e + '-' + (bCounter++));
                }
                eventManager.on('eventA', aListener);
                eventManager.on('eventA', aListener);
                eventManager.on('eventA', aListener);
                eventManager.on('eventB', bListener);

                eventManager.fire('eventA', 'x');
                expect(result)
                        .toEqual(
                                [ 'A-x-1', 'A-x-2', 'A-x-3', 'B-x-1', 'B-x-2',
                                        'B-x-3' ]);

            });
    it('should be able to deliver events to all listeners '
            + 'and to the callback function', function() {
        var result = [];
        eventManager.on('eventA', function(e) {
            result.push('A' + e);
        });
        eventManager.on('eventA', function(e) {
            result.push('B' + e);
        });
        eventManager.on('eventA', function(e) {
            result.push('C' + e);
            eventManager.fire('toto', e);
        });
        eventManager.on('toto', function(e) {
            result.push('Toto' + e);
        });
        var context = {
            x : 'Y'
        };

        expect(context).toEqual({
            x : 'Y'
        });
        eventManager.fire('eventA', '1', function(e) {
            result.push('Callback' + e);
            expect(this).toEqual(context);
            this.y = 'X';
        }, context);
        expect(result).toEqual([ 'A1', 'B1', 'C1', 'Callback1', 'Toto1' ]);
        // Context should be changed in the callback function
        expect(context).toEqual({
            x : 'Y',
            y : 'X'
        });
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
        });
        function testPointSearch(mask, point) {
            var data = clone(info).features;
            var r = filterService.filterByProperties(data, mask);
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
                    var data = clone(info).features;
                    var result = filterService.filterByProperties(data, {});
                    expect(result).not.toEqual(null);
                    expect(result).toEqual(info.features);
                });
        it('should be able to search points by names', function() {
            var data = clone(info).features;
            var result = filterService.filterByProperties(data, {});
            testPointSearch({
                name : 'First'
            }, data[0]);
            testPointSearch({
                name : 'Second'
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

        it('should be able to filter items by their geographic position',
                function() {
                    var data = clone(info).features;
                    var result = filterService.filterByCoordinates(data, {
                        geometry : {
                            coordinates : [ [ [ 101, 0.2 ], [ 103, 0.75 ] ] ]
                        }
                    });
                    expect(result).not.toEqual(null);
                    expect(result).toEqual([ info.features[0] ]);
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
                geometry : {},
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