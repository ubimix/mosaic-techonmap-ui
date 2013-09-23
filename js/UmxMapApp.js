(function(context) {
    context.LeafIcon = L.Icon.extend({
        options : {
            iconSize : [ 33, 40 ],
            shadowSize : [ 0, 0 ],
            iconAnchor : [ 17, 40 ],
            shadowAnchor : [ 0, 0 ],
            popupAnchor : [ 0, -50 ]
        }
    });
    context.scrollIntoView = scrollIntoView;
    context.calculateBounds = calculateBounds;
    context.getURLParameter = getURLParameter;
    context.getTemplate = getTemplate;
    context.toLatLng = toLatLng;
    context.newMap = newMap;

    /*
     * ----------------------------------------------------------------------
     */
    /** Transforms the given GeoJSON value to Leaflet's L.LatLng. */
    function toLatLng(val) {
        if (!val)
            return null;
        var lat = 0;
        var lng = 0;
        if (jQuery.type(val) === 'string') {
            val = val.split(/[,;]/);
        }
        if (jQuery.type(val) === 'array') {
            lng = val[0];
            lat = val[1];
        } else if (jQuery.type(val) === 'object') {
            lng = val.lng;
            lat = val.lat;
        }
        lng = lng || 0;
        lat = lat || 0;
        return L.latLng(lat, lng);
    }

    /** Transforms the specified string to the L.LatLngBounds instance */
    function toLatLngBounds(val) {
        if (!val)
            return null;
        return L.latLngBounds(toLatLng(val[0]), toLatLng(val[1]));
    }
    /**
     * Creates a new L.Map instance associated with the specified container
     */
    function newMap(container) {
        container = $(container);
        var center = container.data('map-center') || [ 2.3357025512, 48.872630327 ];
        var mapZoom = container.data('map-zoom') || 10;
        var mapCenter = toLatLng(center);
        var boundingBox = container.data('map-bounding-box');
        boundingBox = toLatLngBounds(boundingBox);
        var tilesUrl = container.data('map-tiles');
        var maxZoom = container.data('map-max-zoom') || 18;
        var minZoom = container.data('map-min-zoom') || 2;

        var options = {
            tilesUrl : tilesUrl,
            maxZoom : maxZoom,
            minZoom : minZoom,
            attributionControl : false
        }
        var map = L.map(container[0], options);
        if (boundingBox) {
            map.setMaxBounds(boundingBox);
        }
        map.setView(mapCenter, mapZoom);
        L.tileLayer(tilesUrl, options).addTo(map);
        var attribution = 'Carte motorisée par <a href="http://leafletjs.com">Leaflet</a>,'
                + ' tuilée à partir de <a href="http://www.mapbox.com/">MapBox</a>'
                + ' et composée avec les données d\'<a href="http://www.openstreetmap.org">OpenStreetMap</a>';
        L.control.attribution({
            position : 'bottomleft',
            prefix : null
        }).addAttribution(attribution).addTo(map);
        return map;
    }

    /*
     * ----------------------------------------------------------------------
     */
    /**
     * This method is used to move the specified element in view in a scrollable
     * container.
     * 
     * @see http://stackoverflow.com/questions/1805808/how-do-i-scroll-a-row-of-a-table-into-view-element-scrollintoview-using-jquery
     */
    function scrollIntoView($element, $scroller, delta, duration) {
        delta = delta || 0;
        duration = duration || 0;
        if (duration) {
            $scroller.animate({
                'scrollTop' : $element.position().top - delta
            });
        } else {
            $scroller.scrollTop($element.position().top - delta);
        }
    }

    /** This method returns named request parameters of the current page */
    function getURLParameter(name) {
        return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search) || [ , "" ])[1]
                .replace(/\+/g, '%20'))
                || null;
    }

    /**
     * This method transforms an element corresponding selector to a template
     * string
     */
    function getTemplate(selector) {
        var template = $(selector);
        template.remove();
        template.show();
        var html = template.first().wrap('<div></div>').parent().html();
        return html;
    }

    /**
     * Calculates and returns geographical bounds of the specified set of points
     */
    function calculateBounds(points) {
        var bounds = null;
        if (points.length > 0) {
            for ( var i = 0; i < points.length; i++) {
                var point = points[i];
                if (!point || !point.geometry.coordinates)
                    continue;
                var coordinates = point.geometry.coordinates;
                var latLng = toLatLng(coordinates);
                if (bounds == null) {
                    bounds = new L.LatLngBounds(latLng, latLng);
                } else {
                    bounds.extend(latLng);
                }
            }
        }
        return bounds;
    }

    /*
     * ----------------------------------------------------------------------
     */
    /**
     * This calss is used to manage point categories - their names, keys and
     * associated visual attributes (like icons) etc
     */
    function CategoryInfo(categories) {
        this.icons = {};
        this.setCategories(categories);
    }
    CategoryInfo.prototype.setCategories = function(categories) {
        this.categories = categories;
        this.defaultKey = null;
        if (this.categories) {
            for ( var key in this.categories) {
                if (!this.categories.hasOwnProperty(key))
                    continue;
                this.defaultKey = key;
                break;
            }
        }
    }
    CategoryInfo.prototype.getCategoryInfo = function(category) {
        var t = this.categories[category];
        if (!t) {
            t = this.categories[this.defaultKey];
        }
        return t;
    }
    CategoryInfo.prototype.getPicto = function(category) {
        var categoryInfo = this.getCategoryInfo(category);
        return categoryInfo.pictoClass;
    }
    CategoryInfo.prototype.setPictoClass = function(element, category) {
        if (!this.pictoList) {
            this.pictoList = [];
            for ( var key in this.categories) {
                var categoryInfo = this.categories[key];
                var picto = categoryInfo.pictoClass;
                this.pictoList.push(picto);
            }
        }
        element = $(element);
        for ( var i = 0; i < this.pictoList.length; i++) {
            var picto = this.pictoList[i];
            element.removeClass(picto);
        }
        var categoryInfo = this.getCategoryInfo(category);
        var picto = categoryInfo.pictoClass;
        element.addClass(picto);
    }
    CategoryInfo.prototype.getMapIcon = function(category, on) {
        var info = this.getCategoryInfo(category);
        var key = (on ? 'iconOn' : 'iconOff');
        var iconKey = category + "_" + key;
        var icon = this.icons[iconKey];
        if (!icon) {
            icon = this.icons[iconKey] = new LeafIcon({
                iconUrl : info[key]
            })
        }
        return icon;
    }
    CategoryInfo.prototype.getCategoryName = function(category) {
        var info = this.getCategoryInfo(category);
        return info.name;
    }
    CategoryInfo.prototype.getCategories = function() {
        return this.categories;
    }

    /*
     * ----------------------------------------------------------------------
     */
    /* Global variables initialization */

    context.categoryInfo = new CategoryInfo();
    $(function() {
        var categories = $.parseJSON($('#categories').text());
        context.categoryInfo.setCategories(categories)
    })

    /* A global DataManager and event bus used to propagate events */
    var storeService = context.storeService = new umx.StoreService(appConfig);
    var dataManager = context.dataManager = new umx.DataManager(storeService);

    // URL hash management
    var hashTracker = context.hashTracker = new umx.HashTracker();
    var getTagFromHash = context.getTagFromHash = function() {
        var result = null;
        var hash = hashTracker.getHash();
        if (hash && hash.match(/^#tag\//)) {
            result = hash.substring('#tag/'.length);
        }
        return result;
    }
    var getItemIdFromHash = context.getItemIdFromHash = function() {
        var result = null;
        var hash = hashTracker.getHash();
        if (hash && hash.match(/^#/)) {
            result = (hash.indexOf('/') < 0) ? hash.substring(1) : null;
        }
        return result;
    }
    var setHashFromItemId = context.setHashFromItemId = function(id) {
        var hash = '#' + (id ? id : '');
        hashTracker.setHash(hash)
    }
    hashTracker.start();

    hashTracker.on('hash:changed', function() {
        var tag = getTagFromHash();
        if (tag) {
            dataManager.setTagFilter([ tag ]);
        } else {
            var id = getItemIdFromHash();
            dataManager.selectItemById(id);
        }
    });
    dataManager.on('item:select', function(e) {
        var id = dataManager.getItemId(e);
        setHashFromItemId(id);
    });

    /*
     * ----------------------------------------------------------------------
     */
    // 'Loading...' message visualization
    var loading = 0;
    function showLoadingMessage() {
        if (loading == 0) {
            jQuery('#loading').show();
        }
        loading++;
        // console.log('loading (show):', loading, new Error().stack);
    }
    function hideLoadingMessage() {
        // console.log('loading (hide):', loading, new Error().stack);
        loading--;
        if (loading == 0) {
            jQuery('#loading').hide();
        }
    }
    dataManager.on('search:begin', showLoadingMessage)
    dataManager.on('search:end', hideLoadingMessage);
    dataManager.on('load:begin', showLoadingMessage);
    dataManager.on('load:end', hideLoadingMessage);
    dataManager.on('map-reload:begin', showLoadingMessage);
    dataManager.on('map-reload:end', hideLoadingMessage);
    dataManager.on('list-reload:begin', showLoadingMessage);
    dataManager.on('list-reload:end', hideLoadingMessage);

})(this);
