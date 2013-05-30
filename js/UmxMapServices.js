'use strict';
(function(context) {
    var umx = context.umx = context.umx || {};

    /* ====================================================================== */
    var DEFAULT_STORE_URL = '../data/save';
    var DEFAULT_LOAD_URL = '../data/data.json';

    /**
     * Store/load content on the server
     * 
     * @param options.loadUrl
     *            URL of the server endpoint providing access to all data
     * @param options.storeUrl
     *            URL of the service to call where the content should be store
     */
    var StoreService = new umx.Class();
    StoreService.include({

        /** Initialization */
        init : function(options) {
            this.setOptions(options);
        },

        /**
         * This method is used to store the specified point.
         */
        store : function(point, onSuccess, onFailure) {
            this._ajax({
                url : this.options.storeUrl || DEFAULT_STORE_URL,
                method : 'POST',
                data : point
            }, onSuccess, onFailure);
        },

        /**
         * Loads all data corresponding to the specified search criteria.
         */
        load : function(onSuccess, onFailure) {
            this._ajax({
                url : this.options.loadUrl || DEFAULT_LOAD_URL,
                method : 'GET'
            }, onSuccess, onFailure);
        },

        /**
         * This is an internal method performing the real AJAX call to the
         * server
         */
        _ajax : function(params, onSuccess, onFailure) {
            params.dataType = 'json';
            params.success = onSuccess;
            params.error = function(jqXHR, status, error) {
                if (onFailure) {
                    onFailure.apply(this, arguments);
                } else {
                    console.log(jqXHR, status, error);
                }
            }
            $.ajax(params);
        }

    })

    /* ====================================================================== */
    /**
     * This class is used to search external data.
     * 
     * @param store
     *            a StoreService instance used to load content from the server
     */
    var FilterService = new umx.Class();
    function inRange(value, min, max) {
        return min <= value && max >= value;
    }
    function search(str, mask) {
        if (mask.length < 3)
            return true;
        str = str ? str.toLowerCase() : '';
        var idx = str.indexOf(mask);
        return idx >= 0;
    }
    function isArray(obj) {
        return (Object.prototype.toString.call(obj) === '[object Array]');
    }
    function toArray(obj) {
        if (!obj)
            return [];
        if (isArray(obj)) {
            return obj;
        } else {
            return [ obj ];
        }
    }
    FilterService.include({

        init : function() {
            this.setData({
                type : 'FeatureCollection',
                'features' : []
            });
        },

        /** Sets new data to filter */
        setData : function(data) {
            this.data = data;
        },

        /** Returns all data */
        getData : function() {
            return this.data;
        },

        /** Returns an array of all items corresponding to the specified filter */
        filterItems : function(filterFunc) {
            var filteredData = [];
            var features = this.data ? this.data.features : [];
            var len = features ? features.length : 0;
            for ( var i = 0; i < len; i++) {
                var point = features[i];
                if (filterFunc(point)) {
                    filteredData.push(point);
                }
            }
            filteredData.sort(function(a, b) {
                var aName = a.properties ? (a.properties.name + '')
                        .toLowerCase() : '';
                var bName = b.properties ? (b.properties.name + '')
                        .toLowerCase() : '';
                return aName > bName ? 1 : aName < bName ? -1 : 0;
            })
            return filteredData;
        },

        /**
         * Searches all points corresponding to the specified filter. This
         * method internally uses the <code>filterItems</code> method.
         */
        search : function(filter) {
            var that = this
            var filteredData = that.filterItems(function(point) {
                return that._match(point, filter);
            });
            return filteredData;
        },

        /**
         * This method checks and returns "true" if the given point matches with
         * the specified filter criteria. Otherwise it returns false. TODO:
         * externalize this method in a separate service (or move it on the
         * server).
         */
        _match : function(point, filter) {
            if (!filter || (point.type !== 'Feature') || (!point.geometry)
                    || (point.geometry.type !== 'Point'))
                return false;
            var result = true;
            if (result && filter.geometry && filter.geometry.coordinates
                    && filter.geometry.type == 'Polygon') {
                var coordinates = point.geometry.coordinates;
                var southWest = filter.geometry.coordinates[0];
                var northEast = filter.geometry.coordinates[1];
                result = inRange(coordinates[0], southWest[0], northEast[0])
                        && inRange(coordinates[0], southWest[1], northEast[1]);
            }

            var filterProperties = filter.properties;
            if (filterProperties) {
                var properties = point.properties;
                result = properties ? true : false;
                for ( var key in filterProperties) {
                    if (!result)
                        break;
                    if (!filterProperties.hasOwnProperty(key))
                        continue;
                    if (!properties.hasOwnProperty(key)) {
                        result = false;
                        continue;
                    }
                    var mask = filterProperties[key];
                    if (mask === '')
                        continue;
                    if (!mask)
                        continue;
                    var funcName = '_matchProperty_' + key.toLowerCase();
                    if (typeof this[funcName] === 'function') {
                        result = this[funcName].call(this, filterProperties,
                                properties, key);
                    } else {
                        result = this._checkValue(mask, properties[key]);
                    }
                }
            }
            return result;
        },

        /**
         * This method is called to check that the 'name' field of the filter
         * matches to point properties. This method is called automatically by
         * the '_match' method.
         */
        _matchProperty_name : function(filter, properties, key) {
            var mask = filter['name'];
            return this._checkValue(mask, properties['name'])
                    || this._checkValue(mask, properties['description']);
        },

        /**
         * Checks that the specified value matches with the given filter mask.
         * This an internal utility method used by the '_match*' methods.
         */
        _checkValue : function(filter, value) {
            var result = false;
            if ((typeof filter === 'string') && (value)) {
                filter = filter.toLowerCase();
                value = value.toLowerCase();
                result = value.indexOf(filter) >= 0;
            } else {
                result = filter == value;
            }
            return result;
        }

    });

    /* ====================================================================== */
    /**
     * DataManager is used to manage search criteria, perform search operations
     * and notify about all modifications.
     * 
     * @param filterService
     *            an instance of the <code>FilterService</code> class used to
     *            perform search operations.
     */
    var DataManager = new umx.Class();
    DataManager.extend(umx.EventManager);
    DataManager.include({
        /** Initializes this class. */
        init : function(store) {
            umx.EventManager.prototype.init.call(this);
            this.store = store;
            this.filterService = new umx.FilterService();
            this.filter = {};
            this.filteredItemsIndex = {};
            this.on('load:end', function(e) {
                this.filterService.setData(e.data);
                this._doSearch();
            }, this);
            this.on('filter:updated', function(e) {
                if (!this.data) {
                    this._doLoad();
                } else {
                    this._doSearch();
                }
            }, this);
            this.on('search:end', function(e) {
                var list = e.result;
                this.filteredItems = list;
                this.filteredItemsIndex = {};
                var len = list ? list.length : 0;
                for ( var i = 0; i < len; i++) {
                    var item = list[i];
                    var id = this.getItemId(item);
                    this.filteredItemsIndex[id] = item;
                }
            }, this);
        },

        /** Returns an identifier of the specified item */
        getItemId : function(point) {
            return point && point.properties ? point.properties.id : null;
        },

        /** Returns item corresponding to the specified identifier */
        getItemById : function(id) {
            return this.filteredItemsIndex[id];
        },

        /** Returns the currently selected item */
        getSelectedItem : function() {
            return this.selectedItem;
        },

        /** Returns all items corresponding to the specified filter function */
        filterItems : function(filterFunc) {
            return this.filterService.filterItems(filterFunc);
        },

        /** Returns a list of all filtered items */
        getFilteredItems : function() {
            return this.filteredItems;
        },

        /** Selects an item with the specified identifier */
        selectItemById : function(id, force) {
            this._switchItem(id, 'selectedItem', 'item:select',
                    'item:deselect', force);
            this.activateItemById(id, force);
        },

        /** Activates an item with the specified identifier */
        activateItemById : function(id, force) {
            this._switchItem(id, 'activeItem', 'item:activate',
                    'item:deactivate', force);
        },

        /** Updates the name filter. */
        setNameFilter : function(name) {
            this._updateFilter({
                properties : {
                    name : name
                }
            });
        },
        /** Updates the category filter. */
        setCategoryFilter : function(category) {
            this._updateFilter({
                properties : {
                    category : category
                }
            });
        },

        /** Removes all filter criteria and loads all points */
        resetFilter : function() {
            this._updateFilter({}, true);
        },

        /** Updates the postcode filter. */
        setPostcodeFilter : function(postcode) {
            postcode = postcode ? '' + postcode : null;
            this._updateFilter({
                properties : {
                    postcode : postcode
                }
            });
        },

        /* ------------------------------------------------------------------ */
        /* Private methods */

        /**
         * An internal method used to remove an item corresponding to the
         * specified key and set a new item defined by its ID.
         * 
         * @param id
         *            identifier of a new item
         * @param key
         *            property name associated with the item
         * @param on
         *            the name of the activation event fired by this method
         * @param off
         *            the name of the de-activation event fired by this method
         * @param force
         *            if this flag is true then the change event is fired even
         *            if the previously active element is the same as the new
         *            one
         */
        _switchItem : function(id, key, on, off, force) {
            var prevValue = this[key];
            if (this[key]) {
                if (this.getItemId(this[key]) === id) {
                    if (!force) {
                        return;
                    }
                } else {
                    this.fire(off, this[key]);
                }
                delete this[key];
            }
            this[key] = this.getItemById(id);
            if (this[key]) {
                this.fire(on, this[key]);
            }
        },

        /**
         * Updates the internal filter and fires a new event to notify that the
         * filter was changed.
         */
        _updateFilter : function(filter, replace) {
            function update(oldObj, obj, replace) {
                var newObj = {};
                if (!replace) {
                    for ( var key in oldObj) {
                        var value = oldObj[key];
                        newObj[key] = value;
                    }
                }
                if (obj) {
                    for ( var key in obj) {
                        var value = obj[key];
                        if ((value === undefined) || (value === null)) {
                            delete newObj[key];
                        } else {
                            newObj[key] = value;
                        }
                    }
                }
                return newObj;
            }
            function equal(a, b) {
                return JSON.stringify(a) == JSON.stringify(b);
            }

            var newFilter = {};
            newFilter.coordinates = update(this.filter.coordinates,
                    filter.coordinates, replace);
            newFilter.properties = update(this.filter.properties,
                    filter.properties, replace);
            if (!equal(this.filter, newFilter)) {
                this.filter = newFilter;
                this.fire('filter:updated', {
                    filter : this.filter
                });
            }
        },

        /** Loads data from the server */
        _doLoad : function() {
            var that = this;
            that.fire('load:begin', {});
            that.store.load(function(result) {
                var data = result;
                that.data = data;
                that.fire('load:end', {
                    data : data
                });
            }, function(error) {
                that.data = [];
                that.fire('load:end', {
                    data : {},
                    error : arguments[0]
                });
            });
        },

        /** Performs the search operation using the internal filter field */
        _doSearch : function() {
            var that = this;
            if (!that.data) {
                return;
            }
            that.fire('search:begin', {
                filter : that.filter
            });
            var result = this.filterService.search(that.filter);
            that.filteredData = result;
            that.fire('search:end', {
                filter : that.filter,
                result : result
            });
        }
    })

    /* ====================================================================== */
    umx.FilterService = FilterService;
    umx.StoreService = StoreService;
    umx.DataManager = DataManager;

})(this);