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

    jQuery('.twitter-auth').click(function() {
    	var e = $(this);
        var href = '';
        document.location = href;
 	return false;
    });

    var form = jQuery('#edit-form')
    form.parsley({
        validators : {
            unique : function(name, selector, v) {
                if (!name || name == '')
                    return false;
                name = name.toLowerCase();
                var points = dataManager.getFilteredItems(function(point) {
                    var n = point.properties.name;
                    return n && n.toLowerCase() === name;
                })
                var result = true;
                var ref = null;
                var point = points.length > 0 ? points[0] : null;
                if (point) {
                    var pointId = getItemIdFromHash();
                    if (point.properties.id != pointId) {
                        ref = '#' + point.properties.id;
                        result = false;
                    }
                }
                var e = $(selector)
                if (ref) {
                    e.bind('click', function() {
                        var location = window.location.href + '';
                        var idx = location.indexOf('#');
                        if (idx > 0) {
                            location = location.substring(0, idx);
                        }
                        location += ref;
                        window.location.href = location;
                        window.location.reload(true);
                    })
                } else {
                    e.unbind('click');
                }
                return result;
            }
        }
    })
    jQuery('input[type=submit]').click(function() {
        try {
            if (form.parsley('validate')) {
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
        jQuery('<option></option>').attr('data-category-id', categoryId).val(
                categoryId).html(name).appendTo(categorySelector);
    }

    var formFields = {};
    function fillForm(point) {
        function getFields(name, create) {
            var trackers = formFields[name];
            if (!trackers && create) {
                trackers = formFields[name] = [];
                jQuery('[data-field=' + name + ']').each(function() {
                    var e = $(this);
                    trackers.push(new ValueTracker(e));
                });
            }
            return trackers;
        }
        function getField(name, create) {
            var fields = getFields(name, create);
            return fields ? fields[0] : null;
        }
        function setField(name, value) {
            var tracker = getField(name, true);
            tracker.setValue(value, false);
        }
        function setFields(name, values) {
            var trackers = getFields(name, true);
            var len = Math.min(trackers.length, values.length);
            for ( var i = 0; i < len; i++) {
                var tracker = trackers[i];
                var value = values[i];
                tracker.setValue(value, false);
            }
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
            if (jQuery.type(value) === 'array') {
                setFields(name, value);
            } else {
                setField(name, value);
            }
        })

        // -------------------------------
        // Fixing fields

        { // Creation year
            var creationyear = properties.creationyear
                    || new Date().getFullYear();
            setField('creationyear', creationyear);
        }

        var addressStreetTracker = getField('address', true);
        var addressPostcodeTracker = getField('postcode', true);
        var addressCityTracker = getField('city', true);

        var formatAddress = function(street, postcode, city) {
            var str = (street ? trim(street) : '');
            if (str != '' && postcode) {
                str += ', ' + trim(postcode);
            }
            if (str != '' && city) {
                str += ', ' + trim(city);
            }
            return str;
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
            var onAddressChange = function() {
                refreshAddr.removeAttr('disabled');
            };
            var onAddressReset = function() {
                marker.setLatLng(coords);
                map.panTo(coords);
                var zoom = Math.max(map.getZoom(), 16);
                map.setZoom(zoom);
                refreshAddr.attr('disabled', 'disabled');
            };
            addressStreetTracker.on('changed', onAddressChange);
            addressPostcodeTracker.on('changed', onAddressChange);
            addressCityTracker.on('changed', onAddressChange);
            // onAddressReset();
            addressStreetTracker.on('reset', onAddressReset);
            addressPostcodeTracker.on('reset', onAddressReset);
            addressCityTracker.on('reset', onAddressReset);

            marker.on('dragend', function() {
                refreshAddr.removeAttr('disabled');
            })
            marker.addTo(map);
            map.setView(coords, zoom);

            var searchAction = new umx.SearchAction();
            refreshAddr.click(function(e) {
                e.preventDefault();
                var address = formatAddress(addressStreetTracker.getValue(),
                        addressPostcodeTracker.getValue(), addressCityTracker
                                .getValue());
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
                        addressStreetTracker.reset();
                        addressPostcodeTracker.reset();
                        addressCityTracker.reset();
                    },
                    onFailure : function(e) {
                        console.log(JSON.stringify(e));
                    }
                });
            });

            addressStreetTracker.reset();
            addressPostcodeTracker.reset();
            addressCityTracker.reset();
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
            var validators = formFields[key];
            for ( var i = 0; i < validators.length; i++) {
                var validator = validators[i];
                var value = validator.getValue();
                if (!validator.validate()) {
                    console.log('Field [' + key + '][' + i + ']="' + value
                            + '" is invalid!');
                } else {
                    console.log(key, validator);
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
        }

        // var category = categorySelector.find('options:selected').data(
        // 'category-id');
        // properties.category = category;
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
    
    

    function onUserId(data) {
        if (data) {
            console.log("data: ", data);
            var props = data.properties;
            console.log("Properties: ", data.properties);
            var isLogged = props.isLogged;
            if (isLogged) {
                $(":input").removeAttr("disabled");
                $("#twitter-auth-panel").css("display","none");
            }
        }
   
    }

    function onUserIdFail() {
        alert("An error occured while checking the user credentials. Please try again later. Sorry for the inconvenience.");
    }


    $.getJSON(window.appConfig.loginCheckUrl, onUserId).fail(onUserIdFail);
    
    dataManager.resetFilter();
    
});
