jQuery(window).ready(function() {
})

jQuery(function() {
	var map = newMap('.map');
	var marker = null;

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
			console.log(result);
		} catch (e) {
			console.log(e);
		}
		return false;
	});

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
			var name = field.data('field');
			var value = field.val();
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
		return result;
	}

	function fillForm(point) {
		function setField(name, value) {
			jQuery('[data-field=' + name + ']').val(value);
		}
		var properties = point.properties;
		for ( var key in properties) {
			var value = properties[key];
			setField(key, value);
		}
		{ // Address
			var address = properties.address;
			var postcode = properties.postcode;
			var city = properties.city;
			var str = (address ? address + ' ' : '');
			if (str != '' && postcode) {
				str += ', ' + postcode;
			}
			if (str != '' && city) {
				str += ', ' + city;
			}
			setField('address', str);
		}
		{ // Creation year
			var creationyear = properties.creationyear
					|| new Date().getFullYear();
			setField('creationyear', creationyear);
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
			marker.addTo(map);
			map.setView(coords, zoom);
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