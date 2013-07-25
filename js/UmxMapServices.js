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
            var url = this.options.storeUrl || DEFAULT_STORE_URL;
            var data = JSON.stringify(point);
            //$.post(url, point, onSuccess).fail(onFailure);

            $.ajax({
                url: url,
                type: "POST",
                data: data,
                contentType: "application/json; charset=utf-8",
                dataType:"json",
                success: onSuccess,
                error: onFailure
            });



        },

        /**
         * Loads all data corresponding to the specified search criteria.
         */
        load : function(onSuccess, onFailure) {
            var url = this.options.loadUrl || DEFAULT_LOAD_URL;
            $.getJSON(url, onSuccess).fail(onFailure);
        }

    })

    /* ====================================================================== */
    /**
     * This class is used to search/filter list of items by specific search
     * criteria.
     */
    var FilterService = new umx.Class();
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
        /**
         * Returns an array of all items for which the specified filter method
         * returns <code>true</code>.
         * 
         * @param items
         *            an array of items to filter
         * @param filterFunc
         *            a function returning <code>true</code> for each item
         *            which should be included in the resulting list
         * @param context
         *            execution context for the filtering function ('this')
         */
        filterItems : function(items, filterFunc, context) {
            var filteredData = [];
            context = context || this;
            var len = items ? items.length : 0;
            for ( var i = 0; i < len; i++) {
                var point = items[i];
                if (filterFunc.call(context, point)) {
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
        filterByProperties : function(items, filterProperties) {
            var filteredData = this.filterItems(items, function(point) {
                var result = this._match(point, filterProperties);
                return result;
            });
            return filteredData;
        },

        /** Searches all points located in the specified bounds. */
        filterByCoordinates : function(items, filter) {
            var bounds;
            var coords = [];
            if (filter.geometry && filter.geometry.coordinates) {
                coords = filter.geometry.coordinates;
            }
            for ( var i = 0; i < coords.length; i++) {
                bounds = this._expandBoundingBox(coords[i], bounds);
            }
            var filteredData = this.filterItems(items, function(point) {
                var result = this._inBounds(point, bounds);
                return result;
            });
            return filteredData;
        },

        /**
         * Returns a bounding box around all specified points.
         * 
         * @param points
         *            a list of points
         * @param box
         *            an optional existing bounding box; this method updates and
         *            returns it
         */
        _expandBoundingBox : function(points, box) {
            box = box || [];
            var topleft = box[0] = box[0] || [];
            var bottomright = box[1] = box[1] || [];
            var len = points && points.length ? points.length : 0;
            for ( var i = 0; i < len; i++) {
                var point = points[i];
                if (i == 0) {
                    topleft[0] = bottomright[0] = point[0];
                    topleft[1] = bottomright[1] = point[1];
                } else {
                    topleft[0] = Math.min(topleft[0], point[0]);
                    bottomright[0] = Math.max(bottomright[0], point[0]);
                    topleft[1] = Math.min(topleft[1], point[1]);
                    bottomright[1] = Math.max(bottomright[1], point[1]);
                }
            }
            return box;
        },

        /**
         * This method checks that the specified point is in the given bounds
         * area.
         */
        _inBounds : function(point, bounds) {
            function inRange(value, a, b) {
                return Math.min(a, b) <= value && Math.max(a, b) >= value;
            }
            var result = true;
            var coordinates = point.geometry ? point.geometry.coordinates
                    : null;
            if (coordinates) {
                var sw = bounds[0];
                var ne = bounds[1];
                result = inRange(coordinates[0], sw[0], ne[0])
                        && inRange(coordinates[1], sw[1], ne[1]);
            }
            return result;
        },

        /**
         * This method checks and returns "true" if the given point matches with
         * the specified filter criteria. Otherwise it returns false. TODO:
         * externalize this method in a separate service (or move it on the
         * server).
         */
        _match : function(point, filterProperties) {
            if (!filterProperties)
                return true;
            if ((point.type !== 'Feature') || (!point.geometry)
                    || (point.geometry.type !== 'Point'))
                return false;
            var result = true;
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
         * This method checks that tags corresponds to the filter
         */
        _matchProperty_tags : function(filter, properties, key) {
            var tags = filter['tags'];
            if (!tags || !tags.length)
                return true;
            var list = properties['tags'];
            if (!list || !list.length)
                return false;
            var result = false;
            for ( var i = 0; !result && i < tags.length; i++) {
                for ( var j = 0; !result && j < list.length; j++) {
                    result = this._checkValue(tags[i], list[j]);
                }
            }
            return result;
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
     * @param store
     *            a StoreService instance used to load content from the server F
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
                // this.data = e.data;
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

        /** Returns the currently used search filter */
        getFilter : function() {
            return this.filter;
        },

        /** Returns the currently selected item */
        getSelectedItem : function() {
            return this.selectedItem;
        },

        /** Returns a list of filtered items */
        getFilteredItems : function(filteringFunction) {
            var list = this.filteredItems;
            if (!filteringFunction) {
                return list;
            }
            return this.filterService.filterItems(list, filteringFunction);
        },

        /** Returns all internal data */
        getData : function() {
            return this.data;
        },

        /** Returns a list of all items */
        getAllItems : function(filteringFunction) {
            var list = this.data.features;
            if (!filteringFunction) {
                return list;
            }
            return this.filterService.filterItems(list, filteringFunction);
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

        /** Updates the properties filter */
        setPropertyFilter : function(properties) {
            properties = properties || {};
            this._updateFilter({
                properties : properties
            });
        },

        /** Updates the name filter. */
        setNameFilter : function(name) {
            var properties = (this.filter ? this.filter.properties : '') || {};
            var oldValue = properties.name || '';
            if (name != oldValue) {
                this.setPropertyFilter({
                    name : name
                });
            }
        },

        /** Updates tag filter. */
        setTagFilter : function(tags) {
            tags = toArray(tags);
            this.setPropertyFilter({
                tags : tags
            });
        },

        /** Updates the category filter. */
        setCategoryFilter : function(category) {
            this.setPropertyFilter({
                category : category
            });
        },
        /** Sets the bounding box for search results */
        setBoundingBoxFilter : function(northWest, southEast) {
            var box = [ northWest, southEast ];
            this._updateFilter({
                "geometry" : {
                    "type" : "Polygon",
                    "coordinates" : [ box ]
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

        /**
         * Stores the specified data on the server using an internal
         * StoreService object
         */
        storeData : function(item, callback) {
            this.fire('store:begin', {
                item : item
            });
            var that = this;
            this.store.store(item, function(data) {
                var result = {
                    item : item,
                    result : data
                }
                that.fire('store:end', result);
                if (callback) {
                    callback.call(that, result);
                }
            }, function(error) {
                var result = {
                    item : item,
                    error : error
                };
                that.fire('store:end', result);
                if (callback) {
                    callback.call(that, result);
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
            newFilter.geometry = update(this.filter.geometry, filter.geometry,
                    replace);
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
                if (isArray(data)) {
                    data = {
                        "type" : "FeatureCollection",
                        "features" : data
                    };
                }
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
            if (!this.data) {
                return;
            }
            this.fire('search:begin', {
                filter : this.filter
            });
            var result = this.filterService.filterByProperties(
                    this.data.features, this.filter.properties);
            this.filteredData = result;
            this.fire('search:end', {
                filter : this.filter,
                result : result
            });
        }
    })

    /* ====================================================================== */
    umx.FilterService = FilterService;
    umx.StoreService = StoreService;
    umx.DataManager = DataManager;

})(this);
