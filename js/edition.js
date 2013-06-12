jQuery(window).ready(function() {
})

jQuery(function() {
    var map = newMap('.map');
    var marker = null;
    function trim(str) {
        return str ? str.replace(/^\s+|\s+$/g, '') : '';
    }
    /* counting characters length */
    function checkDescriptionLength() {
        var max = 250;
        var val = jQuery('[data-field=description]').val();
        var len = val ? val.length : 0;
        jQuery('.carac-count').text(len);
        if (len > max) {
            jQuery('.carac-count').addClass('red');
        } else {
            jQuery('.carac-count').removeClass('red');
        }
    }
    function redirectToMainPage() {
        var pageUrl = jQuery(location).attr('href') + '';
        var idx = pageUrl.indexOf('#');
        if (idx >= 0) {
            pageUrl = pageUrl.substring(0, idx);
        }
        idx = pageUrl.lastIndexOf('/');
        if (idx >= 0) {
            pageUrl = pageUrl.substring(0, idx);
        }
        pageUrl += '/index.html';
        window.location = pageUrl;
    }
    jQuery('.count-field').keyup(checkDescriptionLength);
    jQuery('.cancel').click(function() {
        var e = $(this);
        var question = e.data('confirmation-question');
        question = null; // FIXME:
        var redirect = !question || confirm(question);
        if (redirect) {
            redirectToMainPage();
        }
        return false;
    });
    jQuery('input[type=submit]').click(function() {
        try {
            if (jQuery('#edit-form').parsley('validate')) {
                var result = getDataFromForm();
                var elm = $(this);
                dataManager.storeData(result, function(e) {
                    if (e.error) {
                        var errorMsg = elm.data('error-message');
                        if (errorMsg) {
                            alert(errorMsg);
                        }
                        console.log('Store error: ', e.error);
                    } else {
                        var confirmMsg = elm.data('confirmation-message');
                        if (confirmMsg) {
                            alert(confirmMsg);
                        }
                        redirectToMainPage();
                    }
                });
            }
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

    var formFields = {};
    function fillForm(point) {
        function getField(name, create) {
            var tracker = formFields[name];
            if (!tracker && create) {
                var e = jQuery('[data-field=' + name + ']');
                tracker = formFields[name] = new ValueTracker(e);
            }
            return tracker;
        }
        function setField(name, value) {
            var tracker = getField(name, true);
            tracker.setValue(value, false);
        }

        // -------------------------------
        // Set fields required by the form
        var properties = point.properties;
        if (!properties) {
            properties = point.properties = {};
        }
        jQuery('[data-field]').each(function() {
            var name = jQuery(this).attr('data-field');
            var value = properties[name];
            setField(name, value);
        })

        // -------------------------------
        // Fixing fields

        { // Creation year
            var creationyear = properties.creationyear
                    || new Date().getFullYear();
            setField('creationyear', creationyear);
        }

        var addressTracker = getField('address', true);
        if (addressTracker) { // Address
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
            addressTracker.setValue(str, false);
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
            addressTracker.on('changed', function() {
                refreshAddr.removeAttr('disabled');
            })
            addressTracker.on('reset', function() {
                marker.setLatLng(coords);
                map.panTo(coords);
                var zoom = Math.max(map.getZoom(), 16);
                map.setZoom(zoom);
                refreshAddr.attr('disabled', 'disabled');
            })
            marker.on('dragend', function() {
                refreshAddr.removeAttr('disabled');
            })
            marker.addTo(map);
            map.setView(coords, zoom);

            var searchAction = new umx.SearchAction();
            refreshAddr.click(function(e) {
                e.preventDefault();
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
            var categoryTracker = getField('category', true);
            // categoryTracker.validate();
        }
        checkDescriptionLength();
    }

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
        for ( var key in formFields) {
            if (!(formFields.hasOwnProperty(key)))
                continue;
            var validator = formFields[key];
            if (!validator.validate()) {
                console.log("Field [" + key + "] is invalid!");
            } else {
                var value = validator.getValue();
                if (value != '') {
                    if (properties[key]) {
                        var array = properties[key];
                        if (jQuery.type(array) !== 'array') {
                            array = [ array ];
                            properties[key] = array;
                        }
                        array.push(value);
                    } else {
                        properties[key] = value;
                    }
                }
            }
        }

        // var category = categorySelector.find('options:selected').data(
        // 'category-id');
        // properties.category = category;

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