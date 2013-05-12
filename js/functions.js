/*map*/

/* A global DataManager and event bus used to propagate events */
var storeService = new umx.StoreService();
var dataManager = new umx.DataManager(storeService);

var loading = 0;
function showLoadingMessage() {
    if (loading == 0) {
        jQuery("#loading").show();
    }
    loading++;
}
function hideLoadingMessage() {
    loading--;
    if (loading == 0) {
        jQuery("#loading").hide();
    }
}
dataManager.on('filter:updated', function(e) {
    console.log("Filter: " + JSON.stringify(e.filter))
})
dataManager.on('search:begin', function(e) {
    showLoadingMessage();
})
dataManager.on('search:end', function(e){
    hideLoadingMessage();
    jQuery("#sidebar .val").html(e.result.length + "");
});
dataManager.on('load:begin', function(e) {
    showLoadingMessage();
});
dataManager.on('load:end', function(e) {
    hideLoadingMessage();
    var data = e.data.features;
    jQuery("#sidebar .total").html(data.length);
});

dataManager.on('item:select', function(item) {
    console.log("Select item", JSON.stringify(item.properties.name));
});
dataManager.on('item:deselect', function(item) {
    console.log("De-select item", JSON.stringify(item.properties.name));
});
dataManager.on('item:activate', function(item) {
    console.log("Activate item", JSON.stringify(item.properties.name));
});
dataManager.on('item:deactivate', function(item) {
    console.log("De-activate item", JSON.stringify(item.properties.name));
});


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

	var LeafIcon = L.Icon.extend({
	    options: {
			iconSize     : [33, 40], 
			shadowSize   : [0, 0],
			iconAnchor   : [17, 40],
			shadowAnchor : [0, 0],
			popupAnchor  : [0, -50]
	    }
	});
	
	function CategoryInfo(id) {
        this.categories = $.parseJSON($("#categories").text());
        this.defaultKey = null;
        this.icons = {};
        for ( var key in this.categories) {
            if (!this.categories.hasOwnProperty(key))
                continue;
            this.defaultKey = key;
            break;
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

    var categoryInfo = new CategoryInfo('#categories');
	 
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
        item.data('id', id);
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
        var tw = item.find(".twitter");
        var twitter = props.twitter;
        if (twitter) {
            tw.find('a').html('@' + twitter).attr('href', 'http://www.twitter.com/' + twitter);
        } else {
            tw.remove();
        }
	}
	
	function calculateBounds(points) {
	      var bounds = null;
	      if (points.length > 0) {
	        for ( var i = 0; i < points.length; i++) {
	          var point = points[i];
	          if (!point || !point.geometry.coordinates)
	            continue;
	          var coordinates = point.geometry.coordinates;
	          var latLng = new L.LatLng(coordinates[0], coordinates[1]);
	          if (bounds == null) {
	            bounds = new L.LatLngBounds(latLng, latLng);
	          } else {
	            bounds.extend(latLng);
	          }
	        }
	      }
	      return bounds;
	    }
	
	/** Returns a map icon corresponding to the specified point category */
	function newMapMarker(point) {
        var coords = point.geometry.coordinates;
        var props = point.properties;
        var marker = L.marker(coords, {
            icon: categoryInfo.getMapIcon(props.category, false)
        });
        var visible = false;
        var item = null;
        marker.on('click', function() {
            var id = dataManager.getItemId(point);
            dataManager.selectItemById(id);
        });
//        marker.on('mouseout', function() {
//            marker.closePopup();
//        })
        marker.on('mouseover', function() {
            var id = dataManager.getItemId(point);
            dataManager.activateItemById(id);
            if (!item) {
                item = $(popupTemplate);
                fillTemplate(point, item);
                marker.bindPopup(item.get(0), {
                    closeButton: true,
                    autoPan : true
                });
            }
            marker.openPopup();
        });
        return marker;
	}
	var pointsLayer = null;
    dataManager.on('search:end', function(e) {
        var data = e.result;
        setTimeout(function() {
            showLoadingMessage();
            if (pointsLayer) {
                map.removeLayer(pointsLayer);
                pointsLayer = null;
            }
            pointsLayer = new L.MarkerClusterGroup({
                spiderfyOnMaxZoom : true,
                zoomToBoundsOnClick : true
            }).addTo(map);
            for ( var i = 0; i < data.length; i++) {
                var point = data[i];
                var marker = newMapMarker(point)
                marker.addTo(pointsLayer);
            }
            var bounds = calculateBounds(data);
            if (bounds) {
                map.fitBounds(bounds);
            }
            hideLoadingMessage();
        }, 100);
        
        setTimeout(function() {
            list.html("");
            showLoadingMessage();
            for (var i=0; i<data.length; i++) {
                var point = data[i];
                var item = $(listItemTemplate);
                fillTemplate(point, item);
                list.append(item);
            }
            dataManager.fire('listReloaded', {});
            hideLoadingMessage();
        }, 100);
    });
	
    dataManager.setNameFilter("");
});


/* les diverses fonctionnalités de la pages */
jQuery(document).ready(function() {

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

	jQuery('.zone-list li').on('click', function(){

		// functions to update the map & filtering the list go here
	    var code = jQuery(this).data('code');
	    dataManager.setPostcodeFilter(code);

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
                             * maintenant pour anticiper changement largeur due
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
		jQuery('.slidable-mask').height(height + ajout);
	}
	slideUpdateHeight();

	/*---------------------------*/
	/*-----gestion des lieux-----*/
	/*---------------------------*/

	/* events */
	jQuery('.un-lieu .title, .un-lieu .picto').live('click', function(){
		var $lieu = jQuery(this).parents('.un-lieu');
		if($lieu.hasClass('open')){
			closeLieu($lieu);
		}
		else{
			closeAllLieu();
			openLieu($lieu);
		}
	});

	/* functions */
	function openLieu($lieu){
		$lieu.addClass('open');

		/*---open description---*/
		var $longMask = $lieu.find('.long-mask');
		var $longDescription = $longMask.find('.long');
		
		$longMask.animate({
			height: $longDescription.height()
		},250, function(){
		    var id = $lieu.data('id')
		    dataManager.selectItemById(id);
			// here goes your function to update the map
		});	

		/*---open share---*/
		var $shareMask = $lieu.find('.share-mask');
		var $share = $shareMask.find('.share');
		
		$shareMask.animate({
			height: $share.outerHeight()
		},250);	

		/*---update slide mask---*/
		slideUpdateHeight($longDescription.height() + $share.outerHeight());
        dataManager.on('listReloaded', function(){
            slideUpdateHeight();
        });
	}
	function closeLieu($lieu){
		$lieu.removeClass('open');

		/*---close description---*/
		var $longMask = $lieu.find('.long-mask');
		$longMask.animate({
			height: 0
		},250, function(){
		    var id = $lieu.data('id')
		    console.log('TODO: De-activate an item: ' + id);
		    // dataManager.selectItemById(id);
		});		

		/*---close share---*/
		var $shareMask = $lieu.find('.share-mask');
		$shareMask.animate({
			height: 0
		},250, function(){
			/*---update slide mask---*/
			slideUpdateHeight(-$longMask.height() - $shareMask.outerHeight());
		});
	}
	function closeAllLieu(){
		jQuery('.un-lieu.open').each(function(){
			closeLieu(jQuery(this));
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
	jQuery(window).resize(function(){
		mediaqueries();
	});	
	mediaqueries();


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