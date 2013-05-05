/*map*/

$(window).load(function(){
	var map = L.map('map').setView([48.553, 2.55], 15);

	L.tileLayer('http://{s}.tile.cloudmade.com/BC9A493B41014CAABB98F0471D759707/997/256/{z}/{x}/{y}.png', {
		maxZoom: 18
	}).addTo(map);

	var LeafIcon = L.Icon.extend({
	    options: {
			iconSize     : [33, 40], 
			shadowSize   : [0, 0],
			iconAnchor   : [17, 40],
			shadowAnchor : [0, 0],
			popupAnchor  : [0, -50]
	    }
	});
	//off
	var communauteIconOff   = new LeafIcon({iconUrl: 'images/marker-communaute-off.png'}),
		ecoleIconOff        = new LeafIcon({iconUrl: 'images/marker-ecole-off.png'}),
		entrepriseIconOff   = new LeafIcon({iconUrl: 'images/marker-entreprise-off.png'}),
		incubateurIconOff   = new LeafIcon({iconUrl: 'images/marker-incubateur-off.png'}),
		investisseurIconOff = new LeafIcon({iconUrl: 'images/marker-investisseur-off.png'}),
		prestataireIconOff  = new LeafIcon({iconUrl: 'images/marker-prestataire-off.png'}),
		publiqueIconOff     = new LeafIcon({iconUrl: 'images/marker-publique-off.png'}),
		tierslieuxIconOff   = new LeafIcon({iconUrl: 'images/marker-tierslieux-off.png'})

	//on
	var communauteIconOn   = new LeafIcon({iconUrl: 'images/marker-communaute-on.png'}),
		ecoleIconOn        = new LeafIcon({iconUrl: 'images/marker-ecole-on.png'}),
		entrepriseIconOn   = new LeafIcon({iconUrl: 'images/marker-entreprise-on.png'}),
		incubateurIconOn   = new LeafIcon({iconUrl: 'images/marker-incubateur-on.png'}),
		investisseurIconOn = new LeafIcon({iconUrl: 'images/marker-investisseur-on.png'}),
		prestataireIconOn  = new LeafIcon({iconUrl: 'images/marker-prestataire-on.png'}),
		publiqueIconOn     = new LeafIcon({iconUrl: 'images/marker-publique-on.png'}),
		tierslieuxIconOn   = new LeafIcon({iconUrl: 'images/marker-tierslieux-on.png'})

	L.marker([48.553, 2.55], {icon: tierslieuxIconOn}).addTo(map)
		.bindPopup('<strong class="title">Le camping</strong><div class="category"><a href="#">#incubateur</a></div><div class="location">42 avenue Raymond Poincaré</div><div class="url"><a href="#">http://www.lecamping.com</a></div>')
		.openPopup();
});


/*les diverses fonctionnalités de la pages*/
jQuery(document).ready(function() {

	/*----------------------------------*/
	/*------menu déroulant topbar-------*/
	/*----------------------------------*/
	jQuery('.deroulant').on('click', function(){
		var $self = jQuery(this);

		if($self.hasClass('active')){
			/*close*/
			closeDeroulant($self)
		}
		else{
			/*open*/
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
		console.log('nouveau filtrage par zone ('+jQuery(this).data("value")+')');

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
		console.log('nouveau filtrage par catégorie ('+jQuery(this).data("value")+')');


		jQuery('.category-list li').removeClass('active');
		jQuery(this).addClass('active');
		jQuery('.category-selected').text(jQuery(this).data('value'));

		if(!slideIsDisabled()){
			jQuery('.scrollable').scrollTop(0);
			slidePrev();
		}

	});

	/* functions */
	function slideIsDisabled(){
		return jQuery('.slidable-content').hasClass('disabled');
	}
	function slideTo(target){
		var nextSlide = (currentSlidable == nbSlidable) ? currentSlidable - 1 : currentSlidable + 1;
		actualSlidable = currentSlidable;
		currentSlidable = nextSlide;

		slideUpdateHeight();/*maintenant pour anticiper changement largeur due à la scrollbar*/

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
		ajout = ajout || 0;/*default 0*/
		var height = jQuery('.slidable').eq(currentSlidable - 1).height();
		jQuery('.slidable-mask').height(height + ajout);
	}
	slideUpdateHeight();

	/*---------------------------*/
	/*-----gestion des lieux-----*/
	/*---------------------------*/

	/*events*/
	jQuery('.un-lieu .title, .un-lieu .picto').on('click', function(){
		var $lieu = jQuery(this).parents('.un-lieu');
		if($lieu.hasClass('open')){
			closeLieu($lieu);
		}
		else{
			closeAllLieu();
			openLieu($lieu);
		}
	});

	/*functions*/
	function openLieu($lieu){
		$lieu.addClass('open');

		/*---open description---*/
		var $longMask = $lieu.find('.long-mask');
		var $longDescription = $longMask.find('.long');
		
		$longMask.animate({
			height: $longDescription.height()
		},250, function(){
			console.log('un lieu a été ouvert ('+$lieu.find('.title').text()+')');
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
	}
	function closeLieu($lieu){
		$lieu.removeClass('open');

		/*---close description---*/
		var $longMask = $lieu.find('.long-mask');
		$longMask.animate({
			height: 0
		},250, function(){
			console.log('un lieu a été fermé ('+$lieu.find('.title').text()+')');
			// here goes your function to update the map
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

	/*redimensionne sidebar en fonction de la taille de la fenêtre*/
	function getSidebarHeight(){
		var h = jQuery(window).height();
		jQuery('.maximized .sidebar-content').height(h-200); /*200 = topbar + "propulsé par la fonderie"*/
	}
	jQuery(window).resize(function(){
		getSidebarHeight();
	});
	getSidebarHeight();

	/* gestion du js/mediaqueries*/
	function mediaqueries(){ /*hum, ... je pense que je peux améliorer ça*/
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

	/*events*/
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

	/*functions*/
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