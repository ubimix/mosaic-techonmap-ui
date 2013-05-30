jQuery(window).ready(function() {
})

jQuery(function() {
    var map = newMap('.map');
    var marker = null;
    function trim(str) {
        return str ? str.replace(/^\s+|\s+$/g, '') : '';
    }
    /* counting caracters length */
    function checkDescriptionLength() {
        var max = 250;
        var val = $('[data-field=description]').val();
        var len = val ? val.length : 0;
        $('.carac-count').text(len);
        if (len > max) {
            $('.carac-count').addClass('red');
        } else {
            $('.carac-count').removeClass('red');
        }
    }
    $('.count-field').keyup(checkDescriptionLength);
    jQuery('.cancel').click(function() {
        alert('Annulez!')
        return false;
    });
    jQuery('input[type=submit]').click(function() {
        try {
            var result = getDataFromForm();
            console.log(JSON.stringify(result));
        } catch (e) {
            console.log(e);
        }
        return false;
    });

    var categorySelector = jQuery('select[data-field=category]');
    var categories = categoryInfo.getCategories();
    for ( var categoryId in categories) {
        var category = categories[categoryId];
        var name = category.name;
        jQuery('<option></option>').attr('data-category-id', categoryId).html(
                name).appendTo(categorySelector);
    }
    // categorySelector.live('[data-category-id]').change(function() {
    // alert($(this).find('option:selected').data('category-id'))
    // });

    function getDataFromForm() {
        var coordinates = [];
        var properties = {};
        var result = {
            type : "Feature",
            geometry : {
                type : "Point",
                coordinates : coordinates
            },
            properties : properties
        };
        if (marker) {
            var latLng = marker.getLatLng();
            coordinates.push(latLng.lat);
            coordinates.push(latLng.lng);
        }
        jQuery('[data-field]').each(function() {
            var field = $(this);
            var name = trim(field.data('field'));
            var value = trim(field.val());
            if (value != '') {
                if (properties[name]) {
                    var array = properties[name];
                    if (jQuery.type(array) !== 'array') {
                        array = [ array ];
                        properties[name] = array;
                    }
                    array.push(value);
                } else {
                    properties[name] = value;
                }
            }
        });

        var category = categorySelector.find('options:selected').data(
                'category-id');
        properties.category = category;

        var address = properties.address;
        if (address) {
            var array = address.split(/,/);
            var i = 0;
            properties.address = trim(array[i++]);
            properties.postcode = trim(array[i++]);
            properties.city = trim(array[i++]);
        }
        return result;
    }

    var ValueTracker = new umx.Class();
    ValueTracker.extend(umx.EventManager);
    ValueTracker.include({
        init : function(e) {
            umx.EventManager.prototype.init.call(this);
            this.element = jQuery(e);
            var that = this;
            this.on('reset', function(e) {
                that.prevValue = e.value;
            }, that);
            var validateValue = function() {
                that._notifyChanges();
            }
            this.element.focus(validateValue).blur(validateValue).keypress(
                    validateValue).keyup(validateValue);
            this.reset();
        },
        _notifyChanges : function() {
            var newValue = this.getValue();
            if (newValue != this.prevValue && newValue != this.prevNotified) {
                this.fire('changed', {
                    oldValue : this.prevValue,
                    value : newValue
                });
                this.prevNotified = newValue;
            }
        },
        getValue : function() {
            return trim(this.element.val());
        },
        setValue : function(value, notify) {
            value = trim(value);
            this.element.val(value);
            if (notify) {
                this._notifyChanges();
            }
        },
        reset : function() {
            this.prevValue = this.getValue();
            delete this.prevNotified;
            this.fire('reset', {
                value : this.prevValue
            });
        }
    });

    function fillForm(point) {
        function setField(name, value) {
            jQuery('[data-field=' + name + ']').val(value);
        }

        var properties = point.properties;
        if (!properties) {
            properties = point.properties = {};
        }
        for ( var key in properties) {
            var value = properties[key];
            setField(key, value);
        }
        { // Creation year
            var creationyear = properties.creationyear
                    || new Date().getFullYear();
            setField('creationyear', creationyear);
        }

        var addressField = jQuery('[data-field=address]');
        var addressTracker = new ValueTracker(addressField);
        { // Address
            var address = properties.address;
            var postcode = properties.postcode;
            var city = properties.city;
            var str = (address ? trim(address) : '');
            if (str != '' && postcode) {
                str += ', ' + trim(postcode);
            }
            if (str != '' && city) {
                str += ', ' + trim(city);
            }
            // setField('address', str);
            addressTracker.setValue(str);
        }
        {
            var coords = point.geometry ? point.geometry.coordinates : null;
            var zoom = 12;
            if (coords) {
                coords = L.latLng(coords);
                zoom = 17;
            } else {
                coords = map.getCenter();
            }
            if (marker) {
                map.removeLayer(marker);
                marker = null;
            }
            marker = L.marker(coords, {
                draggable : true
            });

            var refreshAddr = jQuery('#referesh-marker');
            addressTracker.on('changed', function(e) {
                refreshAddr.removeAttr('disabled');
            })
            addressTracker.on('reset', function() {
                marker.setLatLng(coords);
                map.panTo(coords);
                refreshAddr.attr('disabled', 'disabled');
            })
            marker.on('dragend', function() {
                refreshAddr.removeAttr('disabled');
            })
            marker.addTo(map);
            map.setView(coords, zoom);

            var searchAction = new umx.SearchAction();
            refreshAddr.click(function() {
                var address = addressTracker.getValue();
                searchAction.search({
                    address : address,
                    onSuccess : function(suggestions) {
                        var len = suggestions ? suggestions.length : 0;
                        if (len > 0) {
                            var point = suggestions[0];
                            if (point.lat && point.lng) {
                                coords = L.latLng(point.lat, point.lng);
                            }
                        }
                        addressTracker.reset();
                    },
                    onFailure : function(e) {
                        console.log(JSON.stringify(e));
                    }
                });
            });

            addressTracker.reset();
        }
        {// Categories
            var category = properties.category;
            var option = categorySelector.find('option[data-category-id='
                    + category + ']');
            option.prop('selected', true);
        }
        checkDescriptionLength();
    }

    dataManager.on('search:end', function(e) {
        var pointId = getItemIdFromHash();
        var point = null;
        if (pointId) {
            point = dataManager.getItemById(pointId);
        }
        if (!point) {
            point = {};
        }
        fillForm(point);
    });
    dataManager.resetFilter();

});