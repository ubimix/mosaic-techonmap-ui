(function(context) {
    var umx = context.umx = (context.umx || {});

    umx.MinimapControl = L.Control.extend({
        options : {
            position : 'bottomright',
            zoneColor : '#ff7800',
            shadow : '0 1px 3px rgba(34, 25, 25, 0.4)',
            // radius : '100px',
            maxZoom : 9,
            style : {
                width : '100px',
                height : '100px',
                backgroundColor : 'white',
                border : '5px solid white'
            }
        },
        initialize : function(url, options) {
            var oldStyle = this.options.style;
            var newStyle = options.style;
            options = L.setOptions(this, options);
            options.style = oldStyle;
            L.Util.extend(options.style, newStyle);
            options.style = L.setOptions(this, options);
            if (options.shadow) {
                var key = L.DomUtil.testProp([ 'boxShadow', 'WebkitBoxShadow',
                        'MozBoxShadow', 'OBoxShadow', 'msBoxShadow' ]);
                this.options.style[key] = options.shadow;
            }
            if (options.radius) {
                var key = L.DomUtil.testProp([ 'WebkitBorderRadius',
                        'MozBorderRadius', 'borderRadius' ]);
                this.options.style[key] = options.radius;
            }
            this._container = L.DomUtil.create('div');
            L.Util.extend(this._container.style, this.options.style);
            this._minimap = new L.Map(this._container, {
                dragging : false,
                boxZoom : false,
                keyboard : false,
                touchZoom : false,
                zoomControl : false,
                attributionControl : false,
                maxZoom : options.maxZoom,
                minZoom : options.minZoom
            });
            this._tiles = L.tileLayer(url, {}).addTo(this._minimap);
            var bounds = [ [ 0, 0 ], [ 0, 0 ] ];
            this._rectangle = L.rectangle(bounds, {
                color : options.zoneColor,
                weight : 1
            }).addTo(this._minimap);

        },
        onAdd : function(map) {
            this._map = map;
            this._map.on('move', this._update, this);
            var onLoad = function() {
                this._update();
                this._map.off('load', onLoad, this);
            };
            this._map.on('load', onLoad, this);
            setTimeout(function() {
                this._update();
            }.bind(this), 100)
            return this._container;
        },
        _update : function() {
            var map = this._map;
            var bounds = map.getBounds();
            this._rectangle.setBounds(bounds);
            this._minimap.invalidateSize();
            this._minimap.fitBounds(bounds);
        }
    });
})(this);
