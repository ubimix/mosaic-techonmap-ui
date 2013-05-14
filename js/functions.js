/*map*/

/* A global DataManager and event bus used to propagate events */
var storeService = new umx.StoreService({
    loadUrl: './data/data.json',
    storeUrl: './store' // TODO: should be changed
});
var dataManager = new umx.DataManager(storeService);
var hashTracker = new umx.HashTracker();
hashTracker.start();
 
/* ------------------------------------------------------------------------ */
 // URL hash management
function getItemIdFromHash() {
    var result = null;
    var hash = hashTracker.getHash();
    if (hash && hash.match(/^#/)) {
        hash = hash.substring(1);
        result = hash;
    }
    return result;
}
function setHashFromItemId(id) {
    var hash = '#' + (id?id:''); 
    hashTracker.setHash(hash)
}
hashTracker.on('hash:changed', function() {
    var id = getItemIdFromHash();
    dataManager.selectItemById(id);
});
dataManager.on('item:select', function(e) {
    var id = dataManager.getItemId(e);
    setHashFromItemId(id);
});

/* ------------------------------------------------------------------------ */
// 'Loading...' message visualization
var loading = 0;
function showLoadingMessage() {
    if (loading == 0) {
        jQuery('#loading').show();
    }
    loading++;
}
function hideLoadingMessage() {
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

/* ------------------------------------------------------------------------ */
// Stats updates
dataManager.on('search:end', function(e){
    jQuery('#sidebar .val').html(e.result.length + '');
});
dataManager.on('load:end', function(e) {
    var data = e.data.features;
    jQuery('#sidebar .total').html(data.length);
    jQuery('[data-category-id]').each(function(){
        var e = $(this);
        var categoryId = e.attr('data-category-id');
        var list = dataManager.filterItems(function(item) {
            if (categoryId == '*') {
                return true;
            } 
            var category = item.properties.category;
            return (category.indexOf(categoryId) == 0);
        });
        var value = list.length;
        e.find('.tip.right').html(value + '');
    });
    jQuery('.zone-list [data-postcode]').each(function(){
        var e = $(this);
        var value = e.attr('data-postcode');
        var list = dataManager.filterItems(function(item) {
            if (!value || value === '*') {
                return true;
            } 
            var val = item.properties.postcode;
            return (val && val.indexOf(value) == 0);
        });
        var value = list.length;
        e.find('.tip.right').html(value + '');
    });

});

/* ------------------------------------------------------------------------ */
$(window).load(function(){

	var map = L.map('map').setView([48.872630327,
	                                2.3357025512], 12);

    var tilesUrl = 'http://{s}.tiles.mapbox.com/v3/examples.map-4l7djmvo/{z}/{x}/{y}.png';
	tilesUrl = 'http://{s}.tile.cloudmade.com/BC9A493B41014CAABB98F0471D759707/997/256/{z}/{x}/{y}.png';
	L.tileLayer(tilesUrl, {
		maxZoom: 18
	}).addTo(map);
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

    var categories = $.parseJSON($('#categories').text());
    var categoryInfo = new CategoryInfo(categories);
	 
	var list = $('.les-lieux');
	var listItemTemplate = list.html();
	list.remove('li');
	
	var popup = $('.map-popup');
	popup.remove();
	popup.show();
	var popupTemplate = popup.wrapAll('<div></div>').parent().html();
	
	function fillTemplate(point, item) {
        var props = point.properties;
        var id = dataManager.getItemId(point);
        item.attr('data-id', id);
        item.find('.title').html(props.name).on('click', function() {
            dataManager.selectItemById(id);
        });
        var categoryName = categoryInfo.getCategoryName(props.category);
        item.find('.category a').html(categoryName);
        item.find('.long-mask .long').html(props.description);
        item.find('.url a').html(props.url).attr('href', props.url);
        var pageUrl = $(location).attr('href');
        var idx = pageUrl.indexOf('#');
        if (idx >= 0) {
            pageUrl = pageUrl.substring(0, idx);
        }
        var picto = item.find('.picto');
        if (picto.get(0)) {
            categoryInfo.setPictoClass(picto, props.category);
        }
        var url =  pageUrl + '#' + id;
        item.find('.share .input-permalien').val(url)
        var tw = item.find('.twitter');
        var twitter = props.twitter;
        if (twitter) {
            tw.find('a').html('@' + twitter).attr('href', 'http://www.twitter.com/' + twitter);
        } else {
            tw.remove();
        }
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
            var c = data[i].geometry.coordinates;
            points.push({
                lat : c[0],
                lon : c[1],
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
    function showMarkers(callback) {
        hideMarkers();
        /** Returns a map icon corresponding to the specified point category */
        function newMapMarker(point) {
            var coords = point.geometry.coordinates;
            var props = point.properties;
            var marker = L.marker(coords, {
                icon: categoryInfo.getMapIcon(props.category, false)
            });
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
    function showList(callback) {
        hideList();
        if (!callback) callback = function() {}
        dataManager.fire('list-reload:begin', {});
        setTimeout(function() {
            var data = dataManager.getFilteredItems();
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
    dataManager.setNameFilter('');
});


/* les diverses fonctionnalités de la pages */
jQuery(document).ready(function() {

    dataManager.on('item:select', function(item) {
        var id = dataManager.getItemId(item);
        var e = jQuery('li[data-id="' + id + '"]');
        maximizeSidebar();
        openLieu(e);
    });
    dataManager.on('item:deselect', function(item) {
        var id = dataManager.getItemId(item);
        var e = jQuery('li[data-id="' + id + '"]');
        closeLieu(e);
    });
    
    jQuery('.picto-heatmap').click(function() {
         dataManager.fire('switchHeatmap', {});
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
		jQuery('#sidebar').removeClass('minimized').addClass('maximized');		
	}
	function minimizeSidebar(){
		jQuery('#sidebar').removeClass('maximized').addClass('minimized');	
		slideFirst();
	}
	/*----------------------------------*/
	/*----gestion des slides/filtres----*/
	/*----------------------------------*/
	var currentSlidable = 1;
	var nbSlidable      = jQuery('.slidable').size();

	/* events */

	jQuery('.go-zone').on('click', function(){
		if(jQuery('#sidebar').hasClass('minimized')){
			maximizeSidebar();
		}

		if(!slideIsDisabled()){
			jQuery('.scrollable').scrollTop(0);
			slideTo('zone');
		}
	});

	jQuery('.go-category').on('click', function(){
		if(jQuery('#sidebar').hasClass('minimized')){
			maximizeSidebar();
		}

		if(!slideIsDisabled()){
			jQuery('.scrollable').scrollTop(0);
			slideTo('category');
		}
	});

	jQuery('.zone-list-une, .category-list-une').on('click', function(){
		slideFirst();
	});

	jQuery('.zone-list li').on('click', function(){

		// functions to update the map & filtering the list go here
	    var postcode = jQuery(this).data('postcode');
	    if (postcode == '*') {
	        postcode = null;
	    }
	    dataManager.setPostcodeFilter(postcode);

		jQuery('.zone-list li').removeClass('active');
		jQuery(this).addClass('active');
		jQuery('.zone-selected').text(jQuery(this).data('value'));
		if(!slideIsDisabled()){
			jQuery('.scrollable').scrollTop(0);
			slidePrev();
		}
	});
	jQuery('.category-list li').on('click', function(){

		// functions to update the map & filtering the list go here
	    var val = jQuery(this).data('category-id');
	    if (val == '*'){
	        val = null;
	    }
	    dataManager.setCategoryFilter(val);

		jQuery('.category-list li').removeClass('active');
		jQuery(this).addClass('active');
		jQuery('.category-selected').text(jQuery(this).data('value'));

		if(!slideIsDisabled()){
			jQuery('.scrollable').scrollTop(0);
			slidePrev();
		}

	});
	var updateNameSearch = function(event) {
	    var val = jQuery('li.search .search-input').val();
	    dataManager.setNameFilter(val);
	    event.preventDefault();
	}
    jQuery('li.search .search-submit').on('click', updateNameSearch);
    jQuery('li.search .search-input').on('keypress', function(event){
        if ( event.which == 13 ) {
            updateNameSearch(event);
        }
    }).on('blur', updateNameSearch); 

	/* functions */
	function slideIsDisabled(){
		return jQuery('.slidable-content').hasClass('disabled');
	}
	function slideTo(target){
		var nextSlide = (currentSlidable == nbSlidable) ? currentSlidable - 1 : currentSlidable + 1;
		actualSlidable = currentSlidable;
		currentSlidable = nextSlide;

		slideUpdateHeight();/*
                             * maintenant pour anticiper changement largeur dut
                             * à la scrollbar
                             */

		jQuery('.'+ target +'-section')
			.insertAfter('.slidable-'+ actualSlidable +':first')
			.removeClass('slidable-2 slidable-3')
			.addClass('slidable-'+ nextSlide);
		jQuery('.slidable-content').animate({
			left : -jQuery('.slidable-mask').width() * (nextSlide-1)
		},400);
	}
	function slideFirst(){
		jQuery('.slidable-content').animate({
			left : 0 		
		},400);
		currentSlidable = 1;
		slideUpdateHeight();
	}
	function slidePrev(){
		jQuery('.slidable-content').animate({
			left : '+='+jQuery('.slidable-mask').width()
		},400);
		currentSlidable--;
		slideUpdateHeight();

	}
	function slideUpdateHeight(ajout){
		ajout = ajout || 0;/* default 0 */
		var height = jQuery('.slidable').eq(currentSlidable - 1).height();
        jQuery('.slidable').css('height', 0);
        jQuery('.slidable').eq(currentSlidable - 1).css('height', 'auto');
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

		// FIXME: replace it by a more robust re-sizeing code ??
        // NICOLAS : ive updated slideUpdateHeight() function, 
        // this 'list-reload:end' event is not needed anymore
		dataManager.on('list-reload:end', function(){
            //slideUpdateHeight();
        });
		
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
		jQuery('.maximized#sidebar').height(h-110); /* 110 = topbar + top marge */
		jQuery('.maximized .sidebar-content').height(h-210); /*
                                                                 * 210 = topbar
                                                                 * +top marge +
                                                                 * resultat +
                                                                 * "propulsé par
                                                                 * la fonderie"
                                                                 */
	}
	jQuery(window).resize(function(){
		getSidebarHeight();
	});
	getSidebarHeight();

	/* gestion du js/mediaqueries */
	function mediaqueries(){ /* hum, ... je pense que je peux améliorer ça */
		var width = jQuery(window).width();
		if(width <= 970){
			maximizeSidebar();
		}

		if(width <= 970 && width > 480){
			jQuery('.slidable-content').addClass('disabled');
		}
		else{
			jQuery('.slidable-content').removeClass('disabled');
		}
		if(width <= 480){
			currentSlidable;
			jQuery('.slidable-content').css({
				left : -(currentSlidable-1) * jQuery('.slidable-mask').width()  		
			});
		}

	}
    function mapHeight(){
        var $map = jQuery('#map');
        var wh = jQuery(window).height();
        var tbh = jQuery('#topbar').height();

        $map.height(jQuery(window).height() - tbh);   
    }

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
	jQuery('.lightbox-trigger').on('click',function(){
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
});
