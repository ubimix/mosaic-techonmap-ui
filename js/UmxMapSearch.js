(function(context) {
    var umx = context.umx = context.umx || {};
    umx.SearchAction = SearchAction;
    umx.SearchServiceAdapter = SearchServiceAdapter;
    umx.ArcgisSearchServiceAdapter = ArcgisSearchServiceAdapter;

    /* ---------------------------------------------------------------------- */

    /**
     * An "abstract" adapter for remote service services. Instances of this
     * class are used by the SearchAction class. It contains service-specific
     * code.
     */
    function SearchServiceAdapter(config) {
    }
    $.extend(SearchServiceAdapter.prototype, {

        /** Formats and returns an URL used to retrieve found addresses. */
        getServiceUrl : function(params) {
            throw new Error("This method should be re-defined");
        },

        /**
         * This method should transform the service-specific datastructures
         * returned by the used external service into a list of "standardized"
         * points with the following fields : 1) "address" - building number +
         * street name 2) "city" - the name of the city 3) "lat"/"lng" -
         * latitude and longitude of the found point 4) "postcode" - the post
         * code of the found point.
         */
        extractSuggestions : function(data) {
            throw new Error("This method should be re-defined");
        }
    })

    /**
     * Search adapter for the http://geocode.arcgis.com.
     */
    function ArcgisSearchServiceAdapter(config) {
    }
    $.extend(ArcgisSearchServiceAdapter.prototype,
            SearchServiceAdapter.prototype);
    $
            .extend(
                    ArcgisSearchServiceAdapter.prototype,
                    {
                        /** Base search URL */
                        _baseUrl : "http://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/find",

                        /**
                         * This utility method transforms the address name in a
                         * 'standardized' point representation ("address" +
                         * "city" + "lng" + "lat" + "postcode").
                         */
                        _parseStreetAddress : function(name) {
                            var result = null;
                            try {
                                if (name && "" != name) {
                                    result = {};
                                    var array = name.split(",");
                                    result.address = trim(array[0]);
                                    if (array.length > 1) {
                                        result.postcode = parseInt(trim(array[1]));
                                        result.city = trim(array[array.length - 1]);
                                    }
                                }
                            } catch (e) {
                            }
                            return result;
                        },

                        /**
                         * Checks if the specified location could be used as an
                         * address.
                         */
                        _isAcceptedType : function(location) {
                            var result = false;
                            if (location && location.feature
                                    && location.feature.attributes) {
                                var type = location.feature.attributes.Addr_Type;
                                result = ("PointAddress" == type
                                        || "StreetAddress" == type || "StreetName" == type);
                            }
                            return result;
                        },

                        /**
                         * Returns the full service url corresponding to the
                         * requested address
                         */
                        getServiceUrl : function(params) {
                            var url = this._baseUrl + L.Util.getParamString({
                                text : params.address + "",
                                f : 'pjson'
                            });
                            return url;
                        },
                        /**
                         * Transforms data returned by the server into a list of
                         * standardized points
                         */
                        extractSuggestions : function(data) {
                            var result = [];
                            var locations = data.locations;
                            var len = locations ? locations.length : 0;
                            for ( var i = 0; i < len; i++) {
                                var location = locations[i];
                                if (!location)
                                    continue;
                                var type = null;
                                if (!this._isAcceptedType(location)) {
                                    continue;
                                }

                                var point = this
                                        ._parseStreetAddress(location.name);
                                if (!point)
                                    continue;
                                point.lat = null;
                                point.lng = null;
                                if (location.feature
                                        && location.feature.geometry) {
                                    point.lat = location.feature.geometry.y;
                                    point.lng = location.feature.geometry.x;
                                }
                                result.push(point);
                            }
                            return result;
                        }
                    })

    /**
     * Search runner allowing to retrieve address suggestions.
     */
    function SearchAction(config) {
        this.init(config || {});
    }
    $.extend(SearchAction.prototype, {
        /**
         * Initializes the search service and check configuration validity. The
         * specified configuration has to have an "adapter" field defining an
         * instance of a search service adapter. If this field is not defined
         * then this method creates a new instance of the
         * {@link ArcgisSearchServiceAdapter} class.
         */
        init : function(config) {
            this.config = config || {};
            this.timerId = null;
            if (!this.config.timeout) {
                this.config.timeout = 100;
            }
            if (!this.config.adapter) {
                this.config.adapter = new ArcgisSearchServiceAdapter();
            }
        },
        /** This function stops the currently running search */
        stop : function() {
            if (this.timerId) {
                clearTimeout(this.timerId);
                this.timerId = null;
            }
        },
        /**
         * Starts an asynchroneous search operation using a search service
         * adapter defined in the configuration
         */
        search : function(params) {
            this.stop();

            var that = this;
            var thisId = [ null ];
            var cleanUp = function() {
                if (thisId[0]) {
                    clearTimeout(thisId[0]);
                    if (that.timerId == thisId[0]) {
                        that.stop();
                    }
                }
            }
            this.timerId = thisId[0] = setTimeout(function() {
                var adapter = that.config.adapter;
                var url = adapter.getServiceUrl(params);
                $.getJSON(url, function(data) {
                    try {
                        var suggestions = adapter.extractSuggestions(data);
                        params.onSuccess.call(that, suggestions);
                    } finally {
                        cleanUp();
                    }
                }, function() {
                    try {
                        if (params.onFailure) {
                            params.onFailure.call(that, arguments);
                        }
                    } finally {
                        cleanUp();
                    }
                });
            });
        }
    });

})(this);