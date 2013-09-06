/*map*/
dataManager.on('search:end', function(e){
    jQuery('.result .val').html(e.result.length + '');
})
/* ------------------------------------------------------------------------ */
// Stats updates
dataManager.on('load:end', function() {
    var allItems = dataManager.getAllItems();
    jQuery('.result .total').html(allItems.length);
    jQuery('[data-category-id]').each(function(){
        var e = $(this);
        var categoryId = e.attr('data-category-id');
        var list = dataManager.getAllItems(function(item) {
            if (categoryId == '*') {
                return true;
            } 
            var category = item.properties.category||'';
            return (category.indexOf(categoryId) == 0);
        });
        var value = list.length;
        e.find('.tip.right').html(value + '');
    });
    jQuery('.zone-list [data-postcode]').each(function(){
        var e = $(this);
        var value = e.attr('data-postcode');
        var list = dataManager.getAllItems(function(item) {
            if (!value || value === '*') {
                return true;
            } 
            var val = ''+(item.properties.postcode||'');
            return (val && val.indexOf(value) == 0);
        });
        var value = list.length;
        e.find('.tip.right').html(value + '');
    });
});

/* ------------------------------------------------------------------------ */
$(window).load(function(){
	
	var mapContainer = $('#map');
	var map = newMap(mapContainer);
	
// (function(){
// var popup = L.popup();
// map.on('click', function(e) {
// popup.setLatLng(e.latlng).setContent(
// '[' + e.latlng.lat + ',' + e.latlng.lng + ']')
// .openOn(map);
// });
// })();
     
	var tilesUrl = mapContainer.data('map-tiles');
    map.addControl(new umx.MinimapControl(tilesUrl, {
        maxZoom : 10,
        position : 'bottomleft',
        radius : '0px',
        zoneColor : 'red',
        style : {
            width : '100px',
            height : '100px'
        }
    }));
    
    /* ---------------------------------------------------------------------- */
	var list = $('.les-lieux');
	var listItemTemplate = getTemplate(list.find('li'));
	
	var popup = $('.map-popup');
	var popupTemplate = getTemplate(popup);
	
	function fillTemplate(point, item) {
        var props = point.properties;
        function setUrl(selector, url) {
            if (url && url != '') {
                if (!(url.match(/^http(s)?:\/\//))) {
                    url = 'http://' + url;
                }
                var label = url.replace(/^http(s)?:\/\//, '');
                item.find(selector + ' a').html(label).attr('href', url);
            } else {
                item.find(selector).remove();
            }
        }
        function formatAddress() {
            var address = props.address;
            var city = props.city;
            var postcode = props.postcode;
            var str = address||'';
            if (postcode &&  postcode != '') {
                if (str.length > 0) {
                    str += ', ';
                }
                str += postcode;
            }
            if (city &&  city != '') {
                if (str.length > 0) {
                    str += ', ';
                }
                str += city;
            }
            return str;
        }
        function formatTags(tags) {
            var str = '';
            var len = tags ? tags.length : 0;
            for (var i=0; i<len; i++) {
                var tag = tags[i];
                // str += ' <a href="#tag/' + tag + '">#' + tag + '</a>';
                str += ' <a href="javascript:void(0);">#' + tag + '</a>';
            }
            return str;
        }
        var id = dataManager.getItemId(point);
        item.attr('data-id', id);
        item.find('.title').html(props.name).on('click', function() {
            dataManager.selectItemById(id, true);
        });
        var categoryName = categoryInfo.getCategoryName(props.category);
        item.find('.category').html(categoryName);
        item.find('.description-field').html(props.description);
        if (props.creationyear) {
            item.find('.creation .red').html(props.creationyear);
        }
        setUrl('.url', props.url);
        setUrl('.facebook', props.facebook);
        setUrl('.linkedin', props.linkedin);
        setUrl('.viadeo', props.viadeo);
        
        var address = formatAddress();
        item.find('.location').html(address);
        var viewOnMapLink = $('<a/>',{
            href    : '#',
            'class' : 'view-on-map',
            text    : 'Afficher sur la carte'
        }).on('click', function(ev){
            ev.preventDefault();
            dataManager.selectItemById(id, true);   
            jQuery.scrollTo(jQuery('#map'), 400); 
            
        }).appendTo(item.find('.location'));
        
        
        var tagTmpl = item.find('.tags');
        var tags = formatTags(props.tags);
        if (tags != '') {
            tagTmpl.html(tags);
            tagTmpl.find('a').click(function() {
                var tag = $(this).html();
                tag = tag.substring(1);
                dataManager.setTagFilter([tag]);
                return false;
            });
        } else {
            tagTmpl.remove();
        }
        
        
        var pageUrl = $(location).attr('href') +  '';
        var idx = pageUrl.indexOf('#');
        if (idx >= 0) {
            pageUrl = pageUrl.substring(0, idx);
        }
        var picto = item.find('.picto');
        if (picto.get(0)) {
            categoryInfo.setPictoClass(picto, props.category);
        }
        var url =  pageUrl + '#' + id;
        item.find('.share .input-permalien').val(url)
        item.find('.share .right a[href]').each(function() {
        	var a = $(this);
        	var href = a.attr('href');
        	var str =  encodeURIComponent(url);
        	href = href.replace('URL_HERE', str);
        	a.attr('href', href);
        })
        var tw = item.find('.twitter');
        var twitter = props.twitter;
        if (twitter) {
            tw.find('a').html('@' + twitter).attr('href', 'http://www.twitter.com/' + twitter);
        } else {
            tw.remove();
        }
        idx = pageUrl.lastIndexOf('/');
        var editUrl = (idx >= 0 && idx < pageUrl.length - 1) ? pageUrl.substring(0, idx + 1) : pageUrl;
        if (editUrl.lastIndexOf('/') < editUrl.length - 1) {
            editUrl += '/';
        }
        editUrl += 'edition.html#' + id;
        item.find('.edit').attr('href', editUrl);

        item.find('.more a').on('click', function(ev) {
            ev.preventDefault();
            var itemInList = jQuery(".un-lieu[data-id='" + id + "']");
            jQuery.scrollTo(itemInList, 400);
        });
	}


	/* ---------------------------------------------------------------------- */
    var heatmapLayer = null;
    function showHeatmap() {
        hideHeatmap();
        heatmapLayer = L.TileLayer.heatMap({
            radius: 20,
            opacity: 0.8,
            gradient: {
                0.45: "rgb(0,0,255)",
                0.55: "rgb(0,255,255)",
                0.65: "rgb(0,255,0)",
                0.95: "yellow",
                1.0: "rgb(255,0,0)"
            }
        });
        var data = dataManager.getFilteredItems();
        var points = [];
        for ( var i = 0; i < data.length; i++) {
            var c = toLatLng(data[i].geometry.coordinates);
            points.push({
                lat : c.lat,
                lon : c.lng,
                value : 1
            });
        }
        heatmapLayer.addData(points);
        map.addLayer(heatmapLayer);
    }
    function hideHeatmap() {
        if (heatmapLayer) {
            map.removeLayer(heatmapLayer);
            heatmapLayer = null;
        }
    }
    
    /* ---------------------------------------------------------------------- */
    var markerLayer = null;
    var markerIndex = {};
    /** Visualize all markers on the map */
    function showMarkers(callback) {
        hideMarkers();
        /** Returns a map icon corresponding to the specified point category */
        function newMapMarker(point) {
            var coords = toLatLng(point.geometry.coordinates);
            var props = point.properties;
            var marker = L.marker(coords, {
                icon: categoryInfo.getMapIcon(props.category, false)
            });
            marker.setSelection = function(selected) {
                var icon = categoryInfo.getMapIcon(props.category, selected);
                marker.setIcon(icon);
            }
            var visible = false;
            marker.on('click', function() {
                var id = dataManager.getItemId(point);
                dataManager.selectItemById(id);
            });
    // marker.on('mouseout', function() {
    // marker.closePopup();
    // })
            marker.on('mouseover', function() {
                var id = dataManager.getItemId(point);
                dataManager.activateItemById(id);
            });
            return marker;
        }
        if (!callback) {
            callback = function() {}
        }
        dataManager.fire('map-reload:begin', {});
        setTimeout(function() {
            hideMarkers();
            markerLayer = new L.MarkerClusterGroup({
                spiderfyOnMaxZoom : true,
                zoomToBoundsOnClick : true
            }).addTo(map);
            var data = dataManager.getFilteredItems();
            for ( var i = 0; i < data.length; i++) {
                var point = data[i];
                var marker = newMapMarker(point)
                marker.addTo(markerLayer);
                var id = dataManager.getItemId(point);
                markerIndex[id] = marker;
            }
            var bounds = calculateBounds(data);
            if (bounds) {
                map.fitBounds(bounds);
                var f = function() {
                    map.off('zoomend', f);
                    dataManager.fire('map-reload:end', {}, callback);
                }
                map.on('zoomend', f);
            } else {
                dataManager.fire('map-reload:end', {}, callback);
            }
        }, 10);
    }
    function hideMarkers() {
        if (markerLayer) {
            map.removeLayer(markerLayer);
            markerLayer = null;
            markerIndex = {};
        }
    }
    /* ---------------------------------------------------------------------- */
    /** Visualize list items */
    var syncMapAndList = false;
    dataManager.on('switchMapListSyncrhonization', function() {
        syncMapAndList = !syncMapAndList;
        showListAndOpenActiveItem();
    });
    var refreshListAction = new umx.DelayedAction();
    map.on('moveend zoomend', function() {
        if (syncMapAndList) {
            refreshListAction.run(showListAndOpenActiveItem);
        }
    });
    function showListAndOpenActiveItem() {
        showList(function() {
            var itemId = getItemIdFromHash();
            if (itemId) {
                focusItemInListById(itemId);
            }
        })
    }
    function showList(callback) {
        hideList();
        if (!callback) callback = function() {}
        dataManager.fire('list-reload:begin', {});
        setTimeout(function() {
            var bounds = map.getBounds();
            var coordinatesFilter = syncMapAndList ? function(point){
                var coords = toLatLng(point.geometry.coordinates);
                return bounds.contains(coords);
            } : null;
            var data = dataManager.getFilteredItems(coordinatesFilter);
            for (var i=0; i<data.length; i++) {
                var point = data[i];
                var item = $(listItemTemplate);
                fillTemplate(point, item);
                list.append(item);
            }
            dataManager.fire('list-reload:end', {}, callback);
        }, 10);
    }
    function hideList() {
        list.html('');
    }
    
    /* ---------------------------------------------------------------------- */
    var heatmapMode = false; 
    function redrawPanels() {
        var reloadCounter = 1;
        var prevItemId = getItemIdFromHash();
        function refocusItem() {
            reloadCounter--;
            if (reloadCounter == 0 && prevItemId) {
                setTimeout(function() {
                    dataManager.selectItemById(prevItemId, true /* force */);
                },250);
            }
        }
        if (heatmapMode) {
            reloadCounter = 1;
            hideMarkers();
            showHeatmap();
            // Visualize list items
            showList(refocusItem);
        } else {
            reloadCounter = 2;
            hideHeatmap();
            // Visualize all markers on the map
            showMarkers(refocusItem);
            // Visualize list items
            showList(refocusItem);
        }
    }
    dataManager.on('switchHeatmap', function(e) {
        heatmapMode = !heatmapMode;
        redrawPanels();
    });
    dataManager.on('search:end', redrawPanels);
    
    // Zoom to the selected item.
    dataManager.on('item:deselect', function(item) {
        if (!markerLayer)
            return ;
        var id = dataManager.getItemId(item);
        var marker = markerIndex[id];
        if (marker) {
            marker.setSelection(false);
        }
    })
    dataManager.on('item:select', function(item) {
        if (!markerLayer)
            return ;
        var id = dataManager.getItemId(item); 
        var marker = markerIndex[id];
        if (marker) {
            markerLayer.zoomToShowLayer(marker, function() {
                var latLng = marker.getLatLng();
                map.panTo(latLng);
                marker.openPopup();
            });
            marker.setSelection(true);
        }
    });
    // Open a callout window (a 'lollipop') on an active item
    dataManager.on('item:activate', function(item) {
        var id = dataManager.getItemId(item); 
        var marker = markerIndex[id];
        if (marker) {
            var e = $(popupTemplate);
            fillTemplate(item, e);
            marker.bindPopup(e.get(0), {
                closeButton: true,
                autoPan : true
            });
            marker.openPopup();
        }
    });
    var searchParams = $.deparam.querystring();
    delete searchParams.mode;
    dataManager.setPropertyFilter(searchParams);
    
// });


/* les diverses fonctionnalités de la pages */
// jQuery(document).ready(function() {
    function focusItemInListById(id) {
        var e = jQuery('li[data-id="' + id + '"]');
        maximizeSidebar();
        openLieu(e);
    }

    dataManager.on('item:select', function(item) {
        var id = dataManager.getItemId(item);
        focusItemInListById(id);
    });
    dataManager.on('item:deselect', function(item) {
        var id = dataManager.getItemId(item);
        var e = jQuery('li[data-id="' + id + '"]');
        closeLieu(e);
    });
    
    jQuery('.picto-heatmap').click(function() {
        jQuery(this).toggleClass('on');
        dataManager.fire('switchHeatmap', {});
    });
     
    /*----------------------------------*/
    /*---------generate image-----------*/
    /*----------------------------------*/

    var imgCanvas = [ null ];
    jQuery('.generate-image-trigger').on(
            'click',
            function(e) {
                e.preventDefault();
                var dialog = jQuery('.lightbox-image');
                var msgPanel = dialog.find('.message');
                var imgPanel = dialog.find('.image');
                msgPanel.show();
                imgPanel.html("");
                imgPanel.hide();
                openLightbox('lightbox-image');
                setTimeout(function() {
                    var elementToSave = jQuery('.header');
// elementToSave = jQuery('#map .leaflet-map-pane');
                    elementToSave = jQuery('.les-lieux');
                    elementToSave = jQuery('#map .leaflet-map-pane');
                    elementToSave = jQuery('#map');
                    html2canvas(elementToSave.get(0), {
                        onrendered : function(canvas) {
                            var url = canvas.toDataURL();
                            var img = jQuery('<img style="max-width:100%;"/>')
                                    .attr('src', url);
                            imgPanel.append(img);

// imgPanel.append(canvas)
// msgPanel.hide();
// imgPanel.show();
                            imgCanvas[0] = canvas;
                        }
                    });
                }, 100);

            });


    jQuery('.generate-embed-trigger').on('click', function() {
        function setTextareaParams(textarea, mode, width, height) {
            var params = dataManager.getFilter();
            var str = jQuery.param(params.properties);
            var pageUrl = $(location).attr('href') +  '';
            var idx;
            idx = pageUrl.indexOf('#');
            if (idx > 0) {
                pageUrl = pageUrl.substring(0, idx);
            }
            idx = pageUrl.indexOf('?');
            if (idx > 0) {
                pageUrl = pageUrl.substring(0, idx);
            }
            pageUrl += '?mode=' + mode + '&' + str;
            var fullEmbed = '<iframe width="' + width + '" height="' + height + '" src="' + pageUrl + '" frameborder="0"></iframe>'
            textarea.val(fullEmbed);
            textarea.data('embed-height', height);
            textarea.data('embed-width', width);
            textarea.data('embed-code', fullEmbed);
        }
        var block = jQuery('.lightbox-embeded .active-zone');
        var textarea = block.find('textarea');
        var initialized = block.data('initialized');
        if (!initialized) {
            block.find('.preview').click(function() {
                var h = textarea.data('embed-height');
                var w = textarea.data('embed-width');
                var code = textarea.val();
                var newwindow2=window.open('','name','height=' + (h) + ',width=' + (w));
                var tmp = newwindow2.document;
                tmp.write('<html><head><title></title>');
                tmp.write('<style>body { margin: 0; padding: 0; overflow: hidden; }</style>');
                tmp.write('</head><body>');
                tmp.write(code);
                tmp.write('</body></html>');
                tmp.close();
            })
            block.data('initialized', true);
            
            var configZone = jQuery('.lightbox-embeded .configuration-zone');
            var MIN_WIDTH = 1025;
            var MIN_HEIGHT = 800;
            var mode = 'embed-readonly';
            var widthTracker = new ValueTracker(configZone.find('.embed-width'));
            var heightTracker = new ValueTracker(configZone.find('.embed-height'));
            function updateTextarea() {
                var width = widthTracker.getValue()||MIN_WIDTH;
                var height = heightTracker.getValue()||MIN_HEIGHT;
                setTextareaParams(textarea, mode, width, height);
            }
            block[0].updateTextarea = updateTextarea;
            jQuery('div.embed-type').click(function() {
                jQuery('div.embed-type').each(function() {
                    jQuery(this).removeClass('embed-type-active');
                })
                var div = jQuery(this);
                div.addClass('embed-type-active');
                mode = div.hasClass('embed-readonly') ? 'embed-readonly' : 'embed-full';
                updateTextarea();
            });
            jQuery('div.embed-type.embed-readonly').addClass('embed-type-active');
            // Add zone parameters
            widthTracker.setValue(MIN_WIDTH);
            widthTracker.on('changed', updateTextarea);
            heightTracker.setValue(MIN_HEIGHT);
            heightTracker.on('changed', updateTextarea);
            
            jQuery('.lightbox-container.lightbox-embeded .btn-green').click(function() {
                closeLightbox();
            });
        }
        block[0].updateTextarea();
        openLightbox('lightbox-embeded');
    });
    jQuery('.save-image-trigger').on('click', function(e) {
        e.preventDefault();
        if (imgCanvas[0]) {
            Canvas2Image.saveAsPNG(imgCanvas[0]);
        }          
    });

    /*----------------------------------*/
    /*----------export data-------------*/
    /*----------------------------------*/
    jQuery('.export-data-geojson-trigger').on('click', function(e){
        e.preventDefault();
        var data = dataManager.getData();
        data = JSON.parse(JSON.stringify(data));
        var list = data.features;
        var len = list && list.length ? list.length : 0;
        // Remove all internal identifiers
        for (var i=0; i<len; i++) {
            var item = list[i];
            delete item._id;
            delete item.dirty;
        }
        var json = JSON.stringify(data, null, 2);
        jQuery('.code.export').val(json).select();
    });
    
    jQuery('.export-data-csv-trigger').on('click', function(e){
        e.preventDefault();
        function escape(str) {
            str = str ? '' + str : '';
            str = str.replace(/[\r\n\t]+/gi, ' ');
            str = str.replace(/["]/gi, "'");
            if (str.indexOf(',') > 0) {
                str = '"' + str + '"';
            }
            return str;
        }
        function serializeArray(array, delimiter) {
            delimiter = delimiter||',';
            return array.join(delimiter);
        }
        function formatCSV(data) {
            var array = [];
            var properties = data.properties||{};
            var coordinates = data.geometry&&data.geometry.coordinates||[];
            array.push(properties.id);
            array.push(properties.category);
            array.push(properties.name);
            array.push(properties.description);
            // GeoJSON -> Leaflet LatLng
            array.push(coordinates[1]);
            array.push(coordinates[0]);
            var tags = properties.tags||[];
            array.push(tags[0]);
            array.push(tags[1]);
            array.push(tags[2]);
            array.push(properties.address);
            array.push(properties.postcode);
            array.push(properties.city);
            array.push(properties.creationyear);
            array.push(properties.url);
            array.push(properties.twitter);
            array.push(properties.googleplus);
            array.push(properties.linkedin);
            array.push(properties.viadeo);
            for (var i=0; i<array.length;i++) {
                array[i] = escape(array[i]);
            }
            var str = serializeArray(array);
            return str;
        }
        var lines = [];
        var headers = [
                       'ID',
                       'Category',
                       'Nom',
                       'Description',
                       'Latitude',
                       'Longitude',
                       'Tag 1',
                       'Tag 2',
                       'Tag 3',
                       'Adresse : N° et nom de rue',
                       'Adresse : CP',
                       'Adresse : Ville',
                       'Année de création',
                       'Url site web',
                       'Nom compte Twitter',
                       'Url page Facebook',
                       'Url page Google +',
                       'Url page Linkedin',
                       'Url page Viadeo'];
        lines.push(serializeArray(headers));
        var data = dataManager.getData();
        var list = data.features||[]; 
        for (var i=0; i<list.length; i++) {
            var line = formatCSV(list[i]);
            lines.push(line);
        }
        var str = serializeArray(lines, '\n');
        jQuery('.code.export').val(str).select();
    });

    /*----------------------------------*/
    /*----------sync map/list-----------*/
    /*----------------------------------*/
    jQuery('.sync-trigger').on('click', function(e){
        e.preventDefault();
        jQuery(this).toggleClass('on');
        dataManager.fire('switchMapListSyncrhonization', {});
    });


	/*----------------------------------*/
	/*------menu déroulant topbar-------*/
	/*----------------------------------*/
	jQuery('.deroulant').on('click', function(){
		var $self = jQuery(this);

		if($self.hasClass('active')){
			/* close */
			closeDeroulant($self)
		}
		else{
			/* open */
			closeAllDeroulant();
			openDeroulant($self);
		}
	});
	function openDeroulant($self){
		var $mask = $self.find('.menu-mask');
		var $content = $self.find('.menu-content');

		jQuery('.deroulant').removeClass('active');
		$self.addClass('active');
		$mask.animate({
			height : $content.height()
		},150);
	}
	function closeDeroulant($self){
		var $mask = $self.find('.menu-mask');
		jQuery('.deroulant').removeClass('active');
		$mask.animate({
			height : 0
		},50);	
	}
	function closeAllDeroulant(){
		jQuery('.deroulant').each(function(){
			closeDeroulant(jQuery(this));
		});
	}

	/*----------------------------------*/
	/*----maximize/minimize sidebar-----*/
	/*----------------------------------*/
	jQuery('.minimize-sidebar').on('click', function(){
		minimizeSidebar();
		jQuery('.scrollable').scrollTop(0);
	});
	jQuery('.maximize-sidebar').on('click', function(){
		maximizeSidebar();
		getSidebarHeight();
	});
	function maximizeSidebar(){
		jQuery('.sidebar').removeClass('minimized').addClass('maximized');		
	}
	function minimizeSidebar(){
		jQuery('.sidebar').removeClass('maximized').addClass('minimized');	
		slideFirst();
	}
	/*----------------------------------*/
	/*----gestion des slides/filtres----*/
	/*----------------------------------*/
	var currentSlidable = 1;
	var nbSlidable      = jQuery('.slidable').size();

	/* events */

	jQuery('.go-zone').on('click', function(){
		if(jQuery('.sidebar').hasClass('minimized')){
			maximizeSidebar();
		}

		if(!slideIsDisabled()){
			jQuery('.scrollable').scrollTop(0);
			slideTo('zone');
		}
	});

	jQuery('.go-category').on('click', function(){
		if(jQuery('.sidebar').hasClass('minimized')){
			maximizeSidebar();
		}

		if(!slideIsDisabled()){
			jQuery('.scrollable').scrollTop(0);
			slideTo('category');
		}
	});
    jQuery('.go-tags .clear-tags').on('click', function(){
        if(jQuery('.sidebar').hasClass('minimized')){
            maximizeSidebar();
        }
        dataManager.setTagFilter([]);
    });

	jQuery('.zone-list-une, .category-list-une').on('click', function(){
		slideFirst();
	});

	// Reflects postcode changes in UI.
	function selectPostcode(postcode) {
	   if (!postcode)
	        postcode = '*';
       jQuery('.zone-list li').removeClass('active');
       var activeItem = jQuery('.zone-list li[data-postcode="' + postcode + '"]'); 
       activeItem.addClass('active');
       jQuery('.zone-selected').text(activeItem.data('value'));
	}
	jQuery('.zone-list li').on('click', function(){
		// functions to update the map & filtering the list go here
	    var postcode = jQuery(this).data('postcode');
	    if (postcode == '*') {
	        postcode = null;
	    }
	    dataManager.setPostcodeFilter(postcode);
	    selectPostcode(postcode);
	    if(!slideIsDisabled()){
            jQuery('.scrollable').scrollTop(0);
            slidePrev();
       }
	});
	// Reflects category changes in UI
	function selectCategory(category) {
	    jQuery('.category-list li').removeClass('active');
	    if (!category)
	        category = '*'
	    jQuery('.category-list li[data-category-id="' + category + '"]').each(function() {
	        var activeItem = $(this);
	        activeItem.addClass('active');
	        jQuery('.category-selected').text(activeItem.data('value'));
	    })
    }
	// Reflects tags changes in UI
	var tagsPlaceholder = jQuery('.tags-selected').text();
    function selectTags(tags) {
        var len = tags ? tags.length : 0;
        var str = ''
        for (var i=0; i<len; i++) {
            if (str.length)
                str += ', ';
            var tag = '#' + tags[i];
            str += tag;
        }
        if (str === '')
            str = tagsPlaceholder;
        jQuery('.tags-selected').text(str);
    }

	jQuery('.category-list li').on('click', function(){
		// functions to update the map & filtering the list go here
	    var val = jQuery(this).data('category-id');
	    if (val == '*'){
	        val = null;
	    }
	    dataManager.setCategoryFilter(val);
	    selectCategory(val);
        if(!slideIsDisabled()){
            jQuery('.scrollable').scrollTop(0);
            slidePrev();
        }
	});
	 
	// This action is required to 'trottle' search requests to avoid too
	// much search requests in a short period of time.
    var searchAction = new umx.DelayedAction();
    var searchBoxTrackers = [];
    // Add value trackers to query input boxes.
    // These trackers are used to notify about field changes.
    jQuery('.search .search-input').each(function() {
        var input = jQuery(this);
        var tracker = new ValueTracker(input);
        tracker.on('changed', function() {
            searchAction.run(function() {
                var query = tracker.getValue()||'';
                if (query != '') {
                    dataManager.setNameFilter(query);
                }
            })
        })
        searchBoxTrackers.push(tracker);
    });
    // Update UI based on changes of request parameters.
    dataManager.on('search:begin', function(e) {
        if (!e || !e.filter || !e.filter.properties)
            return; 
        var properties = e.filter.properties;
        var query = properties.name||'';
        for (var i = 0; i<searchBoxTrackers.length;i++) {
            var tracker = searchBoxTrackers[i];
            tracker.setValue(query, false);
        }
        var category = properties.category||'*';
        var postcode = properties.postcode||'*';
        var tags = properties.tags||[];
        selectCategory(category);
        selectPostcode(postcode);
        selectTags(tags);
    });

	/* functions */
	function slideIsDisabled(){
		return jQuery('.desktop .slidable-content').hasClass('disabled');
	}
	function slideTo(target){
		var nextSlide = (currentSlidable == nbSlidable) ? currentSlidable - 1 : currentSlidable + 1;
		actualSlidable = currentSlidable;
		currentSlidable = nextSlide;

		slideUpdateHeight();/*
                             * maintenant pour anticiper changement largeur dut
                             * à la scrollbar
                             */

		jQuery('.desktop .'+ target +'-section')
			.insertAfter('.desktop .slidable-'+ actualSlidable +':first')
			.removeClass('slidable-2 slidable-3')
			.addClass('slidable-'+ nextSlide);
		jQuery('.desktop .slidable-content').animate({
			left : -jQuery('.desktop .slidable-mask').width() * (nextSlide-1)
		},400);
	}
	function slideFirst(){
		jQuery('.desktop .slidable-content').animate({
			left : 0 		
		},400);
		currentSlidable = 1;
		slideUpdateHeight();
	}
	function slidePrev(){
		jQuery('.desktop .slidable-content').animate({
			left : '+='+jQuery('.desktop .slidable-mask').width()
		},400);
		currentSlidable--;
		slideUpdateHeight();

	}
	function slideUpdateHeight(ajout){
		ajout = ajout || 0;/* default 0 */
		var height = jQuery('.slidable').eq(currentSlidable - 1).height();
        jQuery('.desktop .slidable').css('height', 0);
        jQuery('.desktop .slidable').eq(currentSlidable - 1).css('height', 'auto');
	}
	slideUpdateHeight();

	/*---------------------------*/
	/*-----gestion des lieux-----*/
	/*---------------------------*/

	/* events */
	jQuery('.un-lieu .title, .un-lieu .picto').live('click', function(){
		var $lieu = jQuery(this).parents('.un-lieu');
		if($lieu.hasClass('open')){
		    // The opened item is closed automatically by the dataManager
		    // see the item:deactivate
		} else{
          var id = $lieu.data('id');
          dataManager.selectItemById(id);
		}
	});

	/* functions */
	function openLieu($lieu){
        jQuery('.un-lieu.open').each(function(){
            closeLieu(jQuery(this));
        });
	    
		$lieu.addClass('open');
		/*---open share---*/        
        setTimeout(function() {
            /*---open description---*/
            var $longMask = $lieu.find('.long-mask');
            var $longDescription = $longMask.find('.long');
            
            $longMask.animate({
                height: $longDescription.outerHeight()
            },250, function(){
            	// Scroll the opened item into the view.
        		scrollIntoView($lieu, jQuery('.scrollable'), 0,200);
            }); 
            var $shareMask = $lieu.find('.share-mask');
            var $share = $shareMask.find('.share');
            $shareMask.animate({
                height: $share.outerHeight()
            }, 250); 
        }, 200);

		/*---update slide mask---*/
		
	}
	function closeLieu($lieu){
		$lieu.removeClass('open');

		/*---close description---*/
		var $longMask = $lieu.find('.long-mask');
		$longMask.animate({
			height: 0
		},250, function(){
		});		

		/*---close share---*/
		var $shareMask = $lieu.find('.share-mask');
		$shareMask.animate({
			height: 0
		},250, function(){
		});
	}

	/*---------------------------*/
	/*-----gestion interface-----*/
	/*---------------------------*/

	/* redimensionne sidebar en fonction de la taille de la fenêtre */
	function getSidebarHeight(){
		var h = jQuery(window).height();
		
		/* 110 = topbar + top marge */
		jQuery('.maximized.desktop.sidebar').height(h-110); 
		
		/* 210 = topbar+top marge + resultat + "propulsé par la fonderie" */
		jQuery('.maximized.desktop .sidebar-content').height(h-210); 
	}
	jQuery(window).resize(function(){
		getSidebarHeight();
	});
	getSidebarHeight();

	/* gestion du js/mediaqueries */
	function mediaqueries(){
		var width = jQuery(window).width();
		if(width <= 960){
            if(!jQuery('html').hasClass('mobile-view')){
                jQuery.scrollTo('#map', 200 );
                jQuery('html').addClass('mobile-view');
            }
            maximizeSidebar();
			currentSlidable;
			jQuery('.slidable-content').css({
				left : -(currentSlidable-1) * jQuery('.slidable-mask').width()  		
			});
		}
        else{
            jQuery('html').removeClass('mobile-view');  
        }

	}
    function mapHeight(){
        var $map = jQuery('#map');
        var wh = jQuery(window).height();
        var embedded = jQuery('body').hasClass('mode-embed-readonly');
        var mobileView = jQuery('html').hasClass('mobile-view');
        var tbh = embedded || mobileView ? 0 : jQuery('#topbar').height();
        $map.height(jQuery(window).height() - tbh);   
    }

    /*gestion mobile view tabs (scroll to menu or list)*/
    jQuery('.tab-to-list').on('click', function(){
        jQuery.scrollTo('.sidebar', 200);
    });
    jQuery('.tab-to-menu').on('click', function(){
        jQuery.scrollTo('#topbar', 200);
    });

	jQuery(window).resize(function(){
		mediaqueries();
        mapHeight();

	});	
	mediaqueries();
    mapHeight();
    


	/*---------------------------*/
	/*----------lightbox---------*/
	/*---------------------------*/

	/* events */
	jQuery('.lightbox-trigger').on('click',function(e){
        e.preventDefault();
		openLightbox(jQuery(this).attr('id'));
	});
	jQuery('.lightbox, .lightbox-close').on('click',function(e){
		if(e.target != this) return; /* http://tinyurl.com/c6re4ck */
		closeLightbox();
	});
	jQuery(window).resize(function(){
		placeLightbox();
	});
	placeLightbox();

	/* functions */
	function placeLightbox(){
		var $window = jQuery(window);
		var $container = jQuery('.lightbox-container:visible');

		var ww = $window.width();
		var wh = $window.height();

		var cw = $container.width();
		var ch = $container.height();

		var l = (ww - cw)/2;
		if(l < 0 ){ var l = 0; }

		var t = (wh - ch)/2;
		if(t < 0 ){ var t = 0; }

		$container.css({
			'margin-top'  : t,
			'margin-left' : l
		});
	}
	function openLightbox(className){
		jQuery('.lightbox').fadeIn();
		jQuery('body').addClass('lightbox-open');
		jQuery('.lightbox .'+className).css('display', 'block');
		placeLightbox();
	}
	function closeLightbox(){
		jQuery('.lightbox').fadeOut();
		jQuery('body').removeClass('lightbox-open');
		jQuery('.lightbox-container').css('display', 'none');
	}


	/*---------------------------*/
	/*------lightbox > FAQ-------*/
	/*---------------------------*/
	jQuery('.faq-trigger').on('click', function(){
		jQuery(this).parent('li').toggleClass('active');
		jQuery('.une-faq').not($(this).parent('li')).removeClass('active');
	});

    /*---------------------------*/
    /*------topbar>TWITTER-------*/
    /*---------------------------*/
    // $.getJSON(window.appConfig.loginCheckUrl(),
    // onLoginCheckSuccess).fail(onLoginCheckFailure);


    function loadLastTweet() {
	$.getJSON(window.appConfig.lastTweetUrl(), function(data) {
		showTwitter(data);	
	}).fail( function(error) {console.log("Error:" +error);});

    }
    loadLastTweet();

    function showTwitter(data){
        var tweet = data[0];
        if (!tweet) {
            jQuery('.social .left').html('&nbsp;').removeClass('left');
            return ;
        }
        var status = linkifyStatus(tweet.text);
        var date = parseTwitterDate(tweet.created_at);
        var user = tweet.user?tweet.user.screen_name:'';
        var id = tweet.id_str;

        jQuery('.social .left .lastTweet').html(status);
        jQuery('.social .left .lastTweetDate').html(date).attr('href', 'https://twitter.com/' + user + '/status/' + id);
        jQuery('.social .left .lastTweetAuthor').html('@'+user).attr('href', 'https://twitter.com/'+user);
    }
    function linkifyStatus(text) {
        text = text.replace(/(https?:\/\/\S+)/gi, function (s) {
            return '<a href="' + s + '">' + s + '</a>';
        });
        text = text.replace(/(^|)@(\w+)/gi, function (s) {
            return '<a href="https://twitter.com/' + s + '">' + s + '</a>';
        });
        text = text.replace(/(^|)#(\w+)/gi, function (s) {
            return '<a href="https://twitter.com/search?q=' + s.replace(/#/,'%23') + '">' + s + '</a>';
         });
        return text;
    }
    function parseTwitterDate($stamp)
    {       
        var date = new Date(Date.parse($stamp)).toLocaleString();
        date = date.slice(0, -8)// remove 8 ends caracters, the hour
        return date;
    }
});
