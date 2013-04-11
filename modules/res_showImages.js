/* siteModule format:
name: {
//Initialization method for things that cannot be performed inline. The method 
//is required to be present, but it can be empty
	go: function(){},

//Returns true/false to indicate whether the siteModule will attempt to handle the link
//the only parameter is the anchor element
	detect: function(element) {return true/false;},

//This is where links are parsed, cache checks are made, and XHR is performed.
//This method will call handleInfo unless the module is deferred in which case it will call createImageExpando
//the only parameter is the anchor element
	handleLink: function(element) {},

//This is were the embedding information is added to the link
//the first parameter is the same anchor element passed to handleLink
//the second parameter is module specific data
//if successful handleInfo should call modules['showImages'].createImageExpando(elem)
//if the module is deferred, then use revealImageDeferred
	handleInfo: function(elem, info) {}

//Optional value indication part of the process of the retrieving 
//embed information should not occur until the user clicks on the 
//expand button
	deferred: boolean,

//optional method that acts in place of the usual handleLink when the module is deferred
	deferredHandleInk: function(elem) {}
}
*/
/*
Embedding infomation:
all embedding information (except 'site') is to be attatched the 
html anchor in the handleInfo function

required type:
	'IMAGE' for single images | 'GALLERY' for image galleries | 'TEXT' html/text to be displayed
required src:
	if type is TEXT then src is HTML (be carefull what is accepted here)
	if type is IMAGE then src is an image URL string
	if type is GALLERY then src is an array of objects with the following properties:
		required src: URL of the image
		optional href: URL of the page containing the image (per image)
		optional title: string to displayed directly above the image (per image)
		optional caption: string to be displayed directly below the image (per image)
optional imageTitle:
	string to be displayed above the image (gallery level).
optional caption:
	string to be displayed below the image
optional credits:
	string to be displayed below caption
optional galleryStart:
	zero-indexed page number to open the gallery to
*/
modules['showImages'] = {
	moduleID: 'showImages',
	moduleName: 'Inline Image Viewer',
	category: 'UI',
	options: {
		maxWidth: {
			type: 'text',
			value: '640',
			description: 'Max width of image displayed onscreen'
		},
		maxHeight: {
			type: 'text',
			value: '480',
			description: 'Max height of image displayed onscreen'
		},
		openInNewWindow: {
			type: 'boolean',
			value: true,
			description: 'Open images in a new tab/window when clicked?'
		},
		hideNSFW: {
			type: 'boolean',
			value: false,
			description: 'If checked, do not show images marked NSFW.'
		},
		autoExpandSelfText: {
			type: 'boolean',
			value: true,
			description: 'When loading selftext from an Aa+ expando, auto reveal images.'
		},
		imageZoom: {
			type: 'boolean',
			value: true,
			description: 'Allow dragging to resize/zoom images.'
		},
		markVisited: {
			type: 'boolean',
			value: true,
			description: 'Mark links visited when you view images (does eat some resources).'
		},
		sfwHistory: {
			type: 'enum',
			value: 'add',
			values: [
				{name: 'Add links to history', value: 'add'},
				{name: 'Color links, but do not add to history', value: 'color'},
				{name: 'Do not add or color links.', value: 'none'}
			],
			description: 'Keeps NSFW links from being added to your browser history <span style="font-style: italic">by the markVisited feature</span>.<br/>\
				<span style="font-style: italic">If you chose the second option, then links will be blue again on refresh.</span><br/>\
				<span style="color: red">This does not change your basic browser behavior.\
				If you click on a link then it will still be added to your history normally.\
				This is not a substitute for using your browser\'s privacy mode.</span>'
		},
		ignoreDuplicates: {
			type: 'boolean',
			value: true,
			description: 'Do not create expandos for images that appear multiple times in a page.'
		},
		displayImageCaptions: {
			type: 'boolean',
			value: true,
			description: 'Retrieve image captions/attribution information.'
		},
		loadAllInAlbum: {
			type: 'boolean',
			value: false,
			description: 'Loads all images in an album'
		}
	},
	description: 'Opens images inline in your browser with the click of a button. Also has configuration options, check it out!',
	isEnabled: function() {
		return RESConsole.getModulePrefs(this.moduleID);
	},
	include: Array(
		/https?:\/\/([a-z]+).reddit.com\/[-\w\.\_\?=]*/i
	),
	exclude: Array(
		/https?:\/\/([a-z]+).reddit.com\/ads\/[-\w\.\_\?=]*/i,
		/https?:\/\/([a-z]+).reddit.com\/[-\w\.\/]*\/submit\/?$/i
	),
	isMatchURL: function() {
		return RESUtils.isMatchURL(this.moduleID);
	},
	beforeLoad: function() {
		if ((this.isEnabled()) && (this.isMatchURL())) {
			RESUtils.addCSS(".expando-button.image { vertical-align:top !important; float: left; width: 23px; height: 23px; max-width: 23px; max-height: 23px; display: inline-block; background-image: url('http://e.thumbs.redditmedia.com/r22WT2K4sio9Bvev.png'); margin-right: 6px; cursor: pointer;  padding: 0; }");
			RESUtils.addCSS(".expando-button.image.commentImg { float: none; margin-left: 4px; } ");
			RESUtils.addCSS(".expando-button.image.collapsedExpando { background-position: 0 0; } ");
			RESUtils.addCSS(".expando-button.image.collapsedExpando:hover { background-position: 0 -24px; } ");
			RESUtils.addCSS(".expando-button.image.expanded { background-position: 0 -48px; } ");
			RESUtils.addCSS(".expando-button.image.expanded:hover { background-position: 0 -72px; } ");
			RESUtils.addCSS(".expando-button.image.gallery.collapsedExpando { background-position: 0 -368px; } ");
			RESUtils.addCSS(".expando-button.image.gallery.collapsedExpando:hover { background-position: 0 -392px; } ");
			RESUtils.addCSS(".expando-button.image.gallery.expanded { background-position: 0 -416px; } ");
			RESUtils.addCSS(".expando-button.image.gallery.expanded:hover { background-position: 0 -440px; } ");
			RESUtils.addCSS(".madeVisible { clear: left; display: block; overflow: hidden; } ");
			RESUtils.addCSS(".madeVisible a { display: inline-block; overflow: hidden; } ");
			RESUtils.addCSS(".RESImage { display: block !important;  } ");
			RESUtils.addCSS(".RESImage.loaded { position: absolute;  } ");
			RESUtils.addCSS(".RESImagePlaceholder { float: left; display: block !important; } ");
			RESUtils.addCSS(".RESdupeimg { color: #000; font-size: 10px;  } ");
			RESUtils.addCSS(".RESClear { clear: both; margin-bottom: 10px;  } ");
			RESUtils.addCSS('.RESGalleryControls { }');
			RESUtils.addCSS('.RESGalleryControls a { cursor: pointer; display: inline-block; background-image: url("http://e.thumbs.redditmedia.com/r22WT2K4sio9Bvev.png"); width: 16px; height: 16px; margin: 5px; }');
			RESUtils.addCSS('.RESGalleryControls span { position: relative; top: -9px; }');
			RESUtils.addCSS('.RESGalleryControls .previous { background-position: 0 -352px; }');
			RESUtils.addCSS('.RESGalleryControls .next { background-position: 16px -352px; }');
			RESUtils.addCSS('.RESGalleryControls .end { background-position-y: -336px; }');
			RESUtils.addCSS('.RESGalleryControls .previous:hover { background-position: 0 -320px; }');
			RESUtils.addCSS('.RESGalleryControls .next:hover { background-position: 16px -320px; }');
			RESUtils.addCSS('.RESGalleryControls .end:hover { background-position-y: -304px; }');
			RESUtils.addCSS('.imgTitle { font-size: 13px; padding: 2px; }');
			RESUtils.addCSS('.imgCredits { font-size: 11px; padding: 2px; }');
			RESUtils.addCSS('.thing .title.visited { color: #551A8B; }');
//			RESUtils.addCSS('.side.hidden { width: 0; overflow-x: hidden; }');
			if (!this.options.displayImageCaptions.value) {
				RESUtils.addCSS('.imgTitle, .imgCaptions { display: none; }');
			}
		}
	},
	go: function() {
		if ((this.isEnabled()) && (this.isMatchURL())) {

			this.imageList = [];
			this.imagesRevealed = {};
			this.dupeAnchors = 0;
			this.goneWild = '';
			this.goneWildModes = {};

			if (this.options.markVisited.value) {
				// we only need this iFrame hack if we're unable to add to history directly, which Firefox addons and Chrome can do.
				if (!BrowserDetect.isChrome() && !BrowserDetect.isFirefox()) {
					this.imageTrackFrame = document.createElement('iframe');
					this.imageTrackFrame.addEventListener('load', function() {
						setTimeout(modules['showImages'].imageTrackShift, 300);
					}, false);
					this.imageTrackFrame.style.display = 'none';
					this.imageTrackFrame.style.width = '0px';
					this.imageTrackFrame.style.height = '0px';
					document.body.appendChild(this.imageTrackFrame);
				}
				this.imageTrackStack = [];
			}

			//set up all site modules
			for (var key in this.siteModules) {
				this.siteModules[key].go();
			}
			this.scanningForImages = false;

			RESUtils.watchForElement('siteTable', modules['showImages'].findAllImages);
			RESUtils.watchForElement('selfText', modules['showImages'].findAllImagesInSelfText);
			RESUtils.watchForElement('newComments', modules['showImages'].findAllImagesInSelfText);

			this.createImageButtons();
			this.findAllImages();
			document.addEventListener('dragstart', function(){return false;}, false);
		}
	},
	findAllImagesInSelfText: function(ele) {
		modules['showImages'].findAllImages(ele, true);
	},
	createImageButtons: function() {
		if ((location.href.match(/search\?\/?q\=/)) || (location.href.match(/about\/reports/)) || (location.href.match(/about\/spam/)) || (location.href.match(/about\/unmoderated/)) || (location.href.match(/modqueue/)) || (location.href.toLowerCase().match('dashboard'))) {
			var hbl = document.body.querySelector('#header-bottom-left');
			if (hbl) {
				var mainMenuUL = document.createElement('ul');
				mainMenuUL.setAttribute('class','tabmenu viewimages');
				mainMenuUL.setAttribute('style','display: inline-block');
				hbl.appendChild(mainMenuUL);
			}
		} else {
			var mainMenuUL = document.body.querySelector('#header-bottom-left ul.tabmenu');
		}
		if (mainMenuUL) {
			var li = document.createElement('li');
			var a = document.createElement('a');
			var text = document.createTextNode('scanning for images...');
			this.scanningForImages = true;

			a.href = 'javascript:void(0);';
			a.id = 'viewImagesButton';
			a.addEventListener('click', function(e) {
				e.preventDefault();
				if (!modules['showImages'].scanningForImages) {
					modules['showImages'].showImagesToggle();
				}
			}, true);
			a.appendChild(text);
			li.appendChild(a);
			mainMenuUL.appendChild(li);
			this.viewImageButton = a;
			/*
			   To enable go gonewild mode for a subreddit add [](/RESGoneWildEnable) to the markdown code for the sidebar.
			   This should not have any visible effect on the HTML.
			   When gonewild mode is enabled, by default tabs 'm' and 'f' will be displayed.
			   If the default choices are not desired, then use [](/RESGoneWildEnable-nodefault) instead.
			   If custom tabs are desired append ? to the link followed by up to 8 label/taglist pairs separated by &
			   A label/taglist pair takes the form label=taglist
			   A taglist has can contain up to 8 tags separated by ,
			   Labels and tags can be up to 32 characters long and may contain upper and lowercase letters, numbers, underscores, hyphens, and spaces.
			   Labels appear to the right of the "view images" button and are surrounded by [] brackets.
			   Post titles are searched for any place that an entry in the tag list appears surrounded by any kind of bracket <>, [], (), {}.
			   Tags are not case sensitive.

			   Example:
			   To duplicate the behavior originally used for /r/gonewild you would use:
				   [](/RESGoneWildEnable-nodefault?m=m,man,male&f=f,fem,female)
			 */
			var goneWildEnabler = document.querySelector('.side .md a[href^="/RESGoneWildEnable"]');

			//This is hardcoded until the mods of /r/gonewild add the tag 
			if (!goneWildEnabler && /gonewild/i.test(location.href)) {
				goneWildEnabler = $('<a href="/RESGoneWildEnable">')[0];
			}

			if (goneWildEnabler) {
				var switches = {};
				var switchCount = 0;
				if (!/RESGoneWildEnable-nodefault/i.test(goneWildEnabler.pathname)) {
					switches['m'] = ['m', 'man', 'male'];
					switches['f'] = ['f', 'fem', 'female'];
					switchCount = 2;
				}
				var whitelist = /^[A-Za-z0-9_ \-]{1,32}$/;
				if (goneWildEnabler.search) {
					var pairs = goneWildEnabler.search.slice(1).split('&');
					for (var i = 0; i < pairs.length && switchCount < 8; i++) {
						var pair = pairs[i].split('=');
						if (pair.length != 2) continue;
						var label = decodeURIComponent(pair[0]);
						if (!whitelist.test(label)) continue;
						var parts = pair[1].split(',');
						var acceptedParts = [];
						for (var j = 0; j < parts.length && acceptedParts.length < 8; j++) {
							var part = decodeURIComponent(parts[j]);
							if (!whitelist.test(part)) continue;
							else acceptedParts.push(part);
						}
						if (acceptedParts.length > 0) {
							if (!(label in switches)) switchCount++;
							switches[label] = acceptedParts;
						}
					}
				}
				if (switchCount > 0) {
					for (var key in switches) {
						this.goneWildModes[key] = new RegExp('[\\[\\{\\<\\(]('+switches[key].join('|')+')[\\]\\}\\>\\)]','i');
					}
				}
			}

			if (!/comments\/[-\w\.\/]/i.test(location.href)) {
				for (var mode in this.goneWildModes) {
					var li = document.createElement('li');
					var a = document.createElement('a');
					var text = document.createTextNode('['+mode+']');
					a.href = 'javascript:void(0);';
					a.addEventListener('click', (function(mode) {
						return function(e) {
							e.preventDefault();
							modules['showImages'].showImagesToggle(mode);
						};
					})(mode), true);

					a.appendChild(text);
					li.appendChild(a);
					mainMenuUL.appendChild(li);
				}
			}
		}
	},
	updateImageButtons: function(imgCount) {
		if (typeof(this.viewImageButton) != 'undefined') {
			var buttonText = (this.allImagesVisible ?'hide':'view') + ' images ';
			if (! RESUtils.currentSubreddit('dashboard')) buttonText += '(' + imgCount + ')';
			$(this.viewImageButton).text(buttonText);
		}
	},
	findImageFilter: function(image, goneWild) {
		if (goneWild in this.goneWildModes) var re = this.goneWildModes[goneWild];
		else goneWild = '';
		var titleMatch = (goneWild?re.test(image.text):false);
		image.NSFW = false;
		if (this.options.hideNSFW.value) {
			image.NSFW = /nsfw/i.test(image.text);
		}
		return (image.href && (goneWild == '' || titleMatch) && !image.NSFW && typeof(image.site) != 'undefined');
	},
	findImages: function(goneWild, showMore) {
		for (var i = 0, len = this.imageList.length; i < len; i++) {
			var image = this.imageList[i];
			this.revealImage(image, showMore && (this.findImageFilter(image.imageLink, goneWild)));
		}
	},
	showImagesToggle: function(goneWild, showMore) {
		if (!goneWild) this.goneWild = goneWild = '';
		else this.goneWild = goneWild;

		if (this.allImagesVisible && !showMore) {
			// Images are visible, and this request didn't come from never ending reddit, so hide the images...
			// (if it came from NER, we'd want to make the next batch also visible...)

			this.allImagesVisible = false;
			for (var i=0, len=this.imageList.length; i < len; i++) {
				this.revealImage(this.imageList[i], false);
			}
			this.updateImageButtons(this.imageList.length);
			return false;
		} else {
			this.allImagesVisible = true;
			this.updateImageButtons(this.imageList.length);
			this.findImages(goneWild, true);
		}
	},
	findAllImages: function(elem, isSelfText) {
		modules['showImages'].scanningForImages = true;
		if (elem == null) {
			elem = document.body;
		}
		// get elements common across all pages first...
		// if we're on a comments page, get those elements too...
		var commentsre = /comments\/[-\w\.\/]/i;
		var userre = /user\/[-\w\.\/]/i;
		modules['showImages'].scanningSelfText = false;
		var allElements = [];
		if (commentsre.test(location.href) || userre.test(location.href)) {
			allElements = elem.querySelectorAll('#siteTable a.title, .expando .usertext-body > div.md a, .content .usertext-body > div.md a');
		} else if (isSelfText) {
			// We're scanning newly opened (from an expando) selftext...
			allElements = elem.querySelectorAll('.usertext-body > div.md a');
			modules['showImages'].scanningSelfText = true;
		} else {
			allElements = elem.querySelectorAll('#siteTable A.title');
		}

		if (RESUtils.pageType() == 'comments') {
			RESUtils.forEachChunked(allElements, 15, 1000, function(element, i, array) {
				modules['showImages'].checkElementForImage(element);
				if (i >= array.length - 1) {
					modules['showImages'].scanningSelfText = false;
					modules['showImages'].scanningForImages = false;
					modules['showImages'].updateImageButtons(modules['showImages'].imageList.length);
				}
			});
		} else {
			var chunkLength = allElements.length;
			for (var i = 0; i < chunkLength; i++) {
				modules['showImages'].checkElementForImage(allElements[i]);
			}
			modules['showImages'].scanningSelfText = false;
			modules['showImages'].scanningForImages = false;
			modules['showImages'].updateImageButtons(modules['showImages'].imageList.length);
		}
	},
	checkElementForImage: function(elem) {
		if (this.options.hideNSFW.value) {
			if (elem.classList.contains('title')) {
				elem.NSFW = elem.parentNode.parentNode.parentNode.classList.contains('over18');
			}
		} else {
			elem.NSFW = false;
		}
		var href = elem.href;
		if ((!elem.classList.contains('imgScanned') && (typeof(this.imagesRevealed[href]) == 'undefined' || !this.options.ignoreDuplicates.value || (RESUtils.currentSubreddit('dashboard'))) && href !== null) || this.scanningSelfText) {
			elem.classList.add('imgScanned');
			this.dupeAnchors++;
			var siteFound = false;
			if (siteFound = this.siteModules['default'].detect(elem)) {
				elem.site = 'default';
			}
			if (!siteFound) {
				for (var site in this.siteModules) {
					if (site == 'default') continue;
					if (this.siteModules[site].detect(elem)) {
						elem.site = site;
						siteFound = true;
						break;
					}
				}
			}
			if (siteFound && !elem.NSFW) {
				this.imagesRevealed[href] = this.dupeAnchors;
				this.siteModules[elem.site].handleLink(elem);
			}
		} else if (!elem.classList.contains('imgScanned')) {
			var textFrag = document.createElement('span');
			textFrag.setAttribute('class','RESdupeimg');
			$(textFrag).html(' <a class="noKeyNav" href="#img'+escapeHTML(this.imagesRevealed[href])+'" title="click to scroll to original">[RES ignored duplicate image]</a>');
			insertAfter(elem, textFrag);
		}
	},
	createImageExpando: function(elem) {
		if (!elem) return false;
		var href = elem.href;
		if (!href) return false;
		//This should not be reached in the case of duplicates
		elem.name = 'img'+this.imagesRevealed[href];

		//expandLink aka the expando button
		var expandLink = document.createElement('a');
		expandLink.className = 'toggleImage expando-button collapsedExpando';
		if (elem.type == 'IMAGE') expandLink.className += ' image';
		if (elem.type == 'GALLERY') expandLink.className += ' image gallery';
		if (elem.type == 'TEXT') expandLink.className += ' selftext collapsed';
		$(expandLink).html('&nbsp;');
		expandLink.addEventListener('click', function(e) {
			e.preventDefault();
			modules['showImages'].revealImage(e.target, (e.target.classList.contains('collapsedExpando')));
		}, true);
		var preNode = null;
		if (elem.parentNode.classList.contains('title')) {
			preNode = elem.parentNode;
			expandLink.classList.add('linkImg');
		} else {
			preNode = elem;
			expandLink.classList.add('commentImg');
		}
		insertAfter(preNode, expandLink);
		/*
		 * save the link element for later use since some extensions
		 * like web of trust can place other elements in places that
		 * confuse the old method
		 */
		expandLink.imageLink = elem;
		this.imageList.push(expandLink);

		if (this.scanningSelfText && this.options.autoExpandSelfText.value) {
			this.revealImage(expandLink, true);
		} else if (this.allImagesVisible) {
			// this may have come from an asynchronous call, in which case it'd get missed by findAllImages, so
			// if all images are supposed to be visible, expand this link now.
			this.revealImage(expandLink, this.findImageFilter(expandLink.imageLink, this.goneWild));


		}
		if (this.scanningForImages == false) {
			// also since this may have come from an asynchronous call, we need to update the view images count.
			this.updateImageButtons(this.imageList.length);
		}
	},
	// Used when returning to the deferred call needs to go back to the reveal process
	revealImageDeferred: function(elem) {
		if (elem.parentNode.classList.contains('title')) {
			var button = elem.parentNode.nextSibling;
		} else {
			var button = elem.nextSibling;
		}
		this.revealImage(button, true);
	},
	revealImage: function(expandoButton, showHide) {
		if ((!expandoButton) || (! $(expandoButton).is(':visible'))) return false;
		// showhide = false means hide, true means show!

		var imageLink = expandoButton.imageLink;
		if (typeof(this.siteModules[imageLink.site]) == 'undefined') {
			console.log('something went wrong scanning image from site: ' + imageLink.site);
			return;
		}
		if (this.siteModules[imageLink.site].deferred && typeof(imageLink.src) == 'undefined') {
			this.siteModules[imageLink.site].deferredHandleLink(imageLink);
			return;
		}
		if (expandoButton.expandoBox && expandoButton.expandoBox.classList.contains('madeVisible')) {
			// TODO: figure out why using these settimeouts alleviates this bug:
			// http://www.reddit.com/r/RESissues/comments/13f9rm/bug_tumblr_link_repeatedly_expands_as_text_doesnt/
			if (!showHide) {
				setTimeout(function() {
					$(expandoButton).removeClass('expanded').addClass('collapsed collapsedExpando');
				}, 100);
				expandoButton.expandoBox.style.display = 'none';
			} else {
				setTimeout(function() {
					$(expandoButton).addClass('expanded').removeClass('collapsed collapsedExpando');
				}, 100);
				expandoButton.expandoBox.style.display = 'block';
			}
			this.handleSRStyleToggleVisibility();
		} else if (showHide) {
			//TODO: flash, custom
			switch (imageLink.type) {
				case 'IMAGE':
				case 'GALLERY':
					this.generateImageExpando(expandoButton);
					break;
				case 'TEXT':
					this.generateTextExpando(expandoButton);
					break;
			}
		}
	},
	generateImageExpando: function(expandoButton) {
		var imageLink = expandoButton.imageLink;
		var which = imageLink.galleryStart || 0;

		var imgDiv = document.createElement('div');
		imgDiv.classList.add('madeVisible');
		imgDiv.currentImage = which;
		imgDiv.sources = [];

		// Test for a single image or an album/array of image
		if (Object.prototype.toString.call(imageLink.src) === '[object Array]') {
			imgDiv.sources = imageLink.src;

			// Also preload images for an album
			this.preloadImages(imageLink.src);
		} else {
			// Only the image is left to display, pack it like a single-image album with no caption or title
			singleImage = {src:imageLink.src,href:imageLink.href};
			imgDiv.sources[0] = singleImage;
		}

		if ('imageTitle' in imageLink) {
			var header = document.createElement('h3');
			header.classList.add('imgTitle');
			$(header).safeHtml(imageLink.imageTitle);
			imgDiv.appendChild(header);
		}

		if ('imgCaptions' in imageLink) {
			var captions = document.createElement('div');
			captions.className = 'imgCaptions';
			$(captions).safeHtml(imageLink.caption);
			imgDiv.appendChild(captions);
		}

		if ('credits' in imageLink) {
			var credits = document.createElement('div');
			credits.className = 'imgCredits';
			$(credits).safeHtml(imageLink.credits);
			imgDiv.appendChild(credits);
		}

		switch(imageLink.type){
			case 'GALLERY':
				if (this.options.loadAllInAlbum.value) {
					if (imgDiv.sources.length > 1) {
						var albumLength = " (" + imgDiv.sources.length + " images)";
						$(header).append(albumLength);
					}
		
					for (var imgNum = 0; imgNum < imgDiv.sources.length; imgNum++) {
						addImage(imgDiv, imgNum, this);
					}
					break;
				} else {
					// If we're using the traditional album view, add the controls then fall through to add the IMAGE
					var controlWrapper = document.createElement('div');
					controlWrapper.className  = 'RESGalleryControls';

					var leftButton = document.createElement("a");
					leftButton.className = 'previous noKeyNav';
					leftButton.addEventListener('click', function(e){
						var topWrapper = e.target.parentElement.parentElement;
						if (topWrapper.currentImage == 0) {
							topWrapper.currentImage = topWrapper.sources.length-1;
						} else {
							topWrapper.currentImage -= 1;
						}
						adjustGalleryDisplay(topWrapper);
					});
					controlWrapper.appendChild(leftButton);

					var posLabel = document.createElement('span');
					posLabel.className = 'RESGalleryLabel';
					var niceLength = (imgDiv.sources.length < 10) ? '0'+imgDiv.sources.length : imgDiv.sources.length;
					var niceWhich = (which+1 < 10) ? '0'+(which+1) : (which+1);
					posLabel.textContent = niceWhich + " of " + niceLength;
					controlWrapper.appendChild(posLabel);

					var rightButton = document.createElement("a");
					rightButton.className = 'next noKeyNav';
					rightButton.addEventListener('click', function(e){
						var topWrapper = e.target.parentElement.parentElement;
						if (topWrapper.currentImage == topWrapper.sources.length-1) {
							topWrapper.currentImage = 0;
						} else {
							topWrapper.currentImage += 1;
						}
						adjustGalleryDisplay(topWrapper);
					});
					controlWrapper.appendChild(rightButton);

					imgDiv.appendChild(controlWrapper);
				}

			case 'IMAGE':
			addImage(imgDiv, which, this);
		}

		function addImage(container, sourceNumber, thisHandle) {
			var sourceImage = container.sources[sourceNumber];

			var paragraph = document.createElement('p');

			if ('title' in sourceImage) {
				var imageTitle = document.createElement('h4');
				imageTitle.className = 'imgCaptions';
				$(imageTitle).safeHtml(sourceImage.title);
				paragraph.appendChild(imageTitle);
			}

			if ('caption' in sourceImage) {
				var imageCaptions = document.createElement('div');
				imageCaptions.className = 'imgCaptions';
				$(imageCaptions).safeHtml(sourceImage.caption);
				paragraph.appendChild(imageCaptions);
			}

			var imageAnchor = document.createElement('a');
			imageAnchor.classList.add('madeVisible');
			imageAnchor.href = sourceImage.href;
			if (thisHandle.options.openInNewWindow.value) {
			imageAnchor.target ='_blank';
			}

			var image = document.createElement('img');
			image.classList.add('RESImage');
			image.id = 'RESImage-' + RESUtils.randomHash();
			image.src = sourceImage.src;
			image.title = 'drag to resize';
			image.style.maxWidth = thisHandle.options.maxWidth.value + 'px';
			image.style.maxHeight = thisHandle.options.maxHeight.value + 'px';
			imageAnchor.appendChild(image);
			modules['showImages'].setPlaceholder(image);
			thisHandle.makeImageZoomable(image);
			thisHandle.trackImageLoad(imageLink, image);
			paragraph.appendChild(imageAnchor);

			container.appendChild(paragraph);
		}

		//Adjusts the images for the gallery navigation buttons as well as the "n of m" display.
		function adjustGalleryDisplay(topLevel) {
			var source = topLevel.sources[topLevel.currentImage];
			var image = topLevel.querySelector('img.RESImage');
			var imageAnchor = image.parentElement;
			var paragraph = imageAnchor.parentElement;
			image.src = source.src;
			imageAnchor.href = source.href || imageLink.href;
			var paddedImageNumber = (topLevel.currentImage+1 < 10) ? '0'+(topLevel.currentImage+1) : topLevel.currentImage+1;
			var niceLength = (imgDiv.sources.length < 10) ? '0'+imgDiv.sources.length : imgDiv.sources.length;
			topLevel.querySelector('.RESGalleryLabel').textContent = (paddedImageNumber+" of "+niceLength);
			if (topLevel.currentImage == 0) {
				leftButton.classList.add('end');
				rightButton.classList.remove('end');
			} else if (topLevel.currentImage == topLevel.sources.length-1) {
				leftButton.classList.remove('end');
				rightButton.classList.add('end');
			} else {
				leftButton.classList.remove('end');
				rightButton.classList.remove('end');
			}

			var imageTitle = paragraph.querySelector('h4.imgCaptions');
			if (imageTitle) $(imageTitle).safeHtml(source.title);
			var imageCaptions = paragraph.querySelector('div.imgCaptions');
			if (imageCaptions) $(imageCaptions).safeHtml(source.caption);
		}

		if (expandoButton.classList.contains('commentImg')) {
			insertAfter(expandoButton, imgDiv);
		} else {
			expandoButton.parentNode.appendChild(imgDiv);
		}
		expandoButton.expandoBox = imgDiv;

		expandoButton.classList.remove('collapsedExpando');
		expandoButton.classList.add('expanded');
	},
	preloadImages: function(srcs) {
		for (var i = 0; i < srcs.length; i++) {
			var img = new Image();
			img.src = srcs[i].src;
		}
	},
	generateTextExpando: function(expandoButton) {
		var imageLink = expandoButton.imageLink;
		var wrapperDiv = document.createElement('div');
		wrapperDiv.className = 'usertext';

		var imgDiv = document.createElement('div');
		imgDiv.className = 'madeVisible usertext-body';

		var header = document.createElement('h3');
		header.className = 'imgTitle';
		$(header).safeHtml(imageLink.imageTitle);
		imgDiv.appendChild(header);

		var text = document.createElement('div');
		text.className = 'md';
		$(text).safeHtml(imageLink.src);
		imgDiv.appendChild(text);

		var captions = document.createElement('div');
		captions.className = 'imgCaptions';
		$(captions).safeHtml(imageLink.caption);
		imgDiv.appendChild(captions);

		if ('credits' in imageLink) {
			var credits = document.createElement('div');
			credits.className = 'imgCredits';
			$(credits).safeHtml(imageLink.credits);
			imgDiv.appendChild(credits);
		}

		wrapperDiv.appendChild(imgDiv);
		if (expandoButton.classList.contains('commentImg')) {
			insertAfter(expandoButton, wrapperDiv);
		} else {
			expandoButton.parentNode.appendChild(wrapperDiv);
		}
		expandoButton.expandoBox = imgDiv;

		expandoButton.classList.remove('collapsedExpando');
		expandoButton.classList.remove('collapsed');
		expandoButton.classList.add('expanded');
		
		//TODO: Decide how to handle history for this.
		//Selfposts already don't mark it, so either don't bother or add marking for selfposts.
	},
	trackImageLoad: function(link, image) {
		if (modules['showImages'].options.markVisited.value) {
			var isNSFW = $(link).closest('.thing').is('.over18');
			var sfwMode = modules['showImages'].options['sfwHistory'].value;

			if ((BrowserDetect.isChrome()) || (BrowserDetect.isFirefox())) {
				var url = link.historyURL || link.href;
				if (!isNSFW || sfwMode != 'none') link.classList.add('visited');
				if (!isNSFW || sfwMode == 'add') {
					modules['showImages'].imageTrackStack.push(url);
					if (modules['showImages'].imageTrackStack.length == 1) setTimeout(modules['showImages'].imageTrackShift, 300);
				}
			} else {
				image.addEventListener('load', function(e) {
					var url = link.historyURL || link.href;
					if (!isNSFW || sfwMode != 'none') link.classList.add('visited');
					if (!isNSFW || sfwMode == 'add') {
						modules['showImages'].imageTrackStack.push(url);
						if (modules['showImages'].imageTrackStack.length == 1) setTimeout(modules['showImages'].imageTrackShift, 300);
					}
				}, false);
			}
		}

		image.addEventListener('load', function(e) {
			modules['showImages'].handleSRStyleToggleVisibility(e.target);
		}, false);
	},
	imageTrackShift: function() {
		var url = modules['showImages'].imageTrackStack.shift();
		if (typeof(url) == 'undefined') {
			modules['showImages'].handleSRStyleToggleVisibility();
			return;
		}
		if (BrowserDetect.isChrome()) {
			if (!chrome.extension.inIncognitoContext) {
				chrome.extension.sendMessage({
					requestType: 'addURLToHistory',
					url: url
				});
			}
			modules['showImages'].imageTrackShift();
		} else if (BrowserDetect.isFirefox()) {
			// update: using XPCOM we may can add URLs to Firefox history without the iframe hack!
			var thisJSON = {
				requestType: 'addURLToHistory',
				url: url
			}
			self.postMessage(thisJSON);
			modules['showImages'].imageTrackShift();
		} else if (BrowserDetect.isOpera()) { 
			var thisJSON = {
				requestType: 'addURLToHistory',
				url: url
			}
			opera.extension.postMessage(JSON.stringify(thisJSON));
		} else if (BrowserDetect.isSafari()) {
			if (!safari.application.privateBrowsing.enabled) {
				modules['showImages'].imageTrackFrame.contentWindow.location.replace(url);
			}
		} else if (typeof(modules['showImages'].imageTrackFrame.contentWindow) != 'undefined') {
			modules['showImages'].imageTrackFrame.contentWindow.location.replace(url);
		} else {
			modules['showImages'].imageTrackFrame.location.replace(url);
		}			
	},
	dragTargetData: {
		//numbers just picked as sane initialization values
		imageWidth: 100,
		diagonal: 0, //zero to represent the state where no the mouse button is not down
		dragging: false
	},
	getDragSize: function(e){
		var rc = e.target.getBoundingClientRect();
		var p = Math.pow;
		var dragSize = p(p(e.clientX-rc.left, 2)+p(e.clientY-rc.top, 2), .5);
		return Math.round(dragSize);
	},
	handleSRStyleToggleVisibility: function(image) {
		RESUtils.debounce('handleSRStyleToggleVisibility', 50, function() {
			var toggleEle = modules['styleTweaks'].styleToggleContainer;
			var imageElems = image ? [ image ] : document.querySelectorAll('.RESImage');

			for (var i = 0 ; i < imageElems.length; i++) {
				var imageEle = imageElems[i];
				var imageID = imageEle.getAttribute('id');

				if (RESUtils.doElementsCollide(toggleEle, imageEle, 15)) {
					modules['styleTweaks'].setSRStyleToggleVisibility(false, 'imageZoom-' + imageID);
				} else {
					modules['styleTweaks'].setSRStyleToggleVisibility(true, 'imageZoom-' + imageID);
				}
			}
		});
	},
	setPlaceholder: function(imageTag) {
		if (!($(imageTag).data('imagePlaceholder'))) {
			var thisPH = createElementWithID('div','RESImagePlaceholder');
			$(thisPH).addClass('RESImagePlaceholder');
			$(imageTag).data('imagePlaceholder', thisPH);
			// Add listeners for drag to resize functionality...
			$(imageTag).parent().append($(imageTag).data('imagePlaceholder'));
		}
		$(imageTag).load(function() {
			var thisPH = $(imageTag).data('imagePlaceholder');
			$(thisPH).width($(this).width() + 'px');
			$(thisPH).height($(this).height() + 'px');
			$(this).addClass('loaded');
		});
	},
	makeImageZoomable: function(imageTag) {
		if (this.options.imageZoom.value) {

			this.setPlaceholder(imageTag);

			imageTag.addEventListener('mousedown', function(e) {
				if (e.button == 0) {
					if (!imageTag.minWidth) imageTag.minWidth = Math.max(1, Math.min(imageTag.width, 100));
					modules['showImages'].dragTargetData.imageWidth = e.target.width;
					modules['showImages'].dragTargetData.diagonal = modules['showImages'].getDragSize(e);
					modules['showImages'].dragTargetData.dragging = false;
					e.preventDefault();
				}
			}, true);
			imageTag.addEventListener('mousemove', function(e) {
				if (modules['showImages'].dragTargetData.diagonal){
					var newDiagonal = modules['showImages'].getDragSize(e);
					var oldDiagonal = modules['showImages'].dragTargetData.diagonal;
					var imageWidth = modules['showImages'].dragTargetData.imageWidth;
					e.target.style.maxWidth=e.target.style.width=Math.max(e.target.minWidth, newDiagonal/oldDiagonal*imageWidth)+'px';

					e.target.style.maxHeight='';
					e.target.style.height='auto';
					modules['showImages'].handleSRStyleToggleVisibility(e.target);

					var thisPH = $(imageTag).data('imagePlaceholder');
					$(thisPH).width($(e.target).width() + 'px');
					$(thisPH).height($(e.target).height() + 'px');					

					modules['showImages'].handleSRStyleToggleVisibility(imageTag);

					modules['showImages'].dragTargetData.dragging = true;
				}
			}, false);
			imageTag.addEventListener('mouseout', function(e) {
				modules['showImages'].dragTargetData.diagonal = 0;
			}, false);
			imageTag.addEventListener('mouseup', function(e) {
				if (modules['showImages'].dragTargetData.diagonal) {
					var newDiagonal = modules['showImages'].getDragSize(e);
					var oldDiagonal = modules['showImages'].dragTargetData.diagonal;
					var imageWidth = modules['showImages'].dragTargetData.imageWidth;
					e.target.style.maxWidth=e.target.style.width=Math.max(e.target.minWidth, newDiagonal/oldDiagonal*imageWidth)+'px';

					var thisPH = $(imageTag).data('imagePlaceholder');
					$(thisPH).width($(e.target).width() + 'px');
					$(thisPH).height($(e.target).height() + 'px');

				}

				modules['showImages'].handleSRStyleToggleVisibility(e.target);
				modules['showImages'].dragTargetData.diagonal = 0;
			}, false);
			imageTag.addEventListener('click', function(e) {
				modules['showImages'].dragTargetData.diagonal = 0;
				if (modules['showImages'].dragTargetData.dragging) {
					modules['showImages'].dragTargetData.dragging = false;
					e.preventDefault();
					return false;
				}
			}, false);
		}
	},
	// this function is only ever used by imgclean, which currently is being removed from RES, so this function is being commented out.
	scrapeHTML: function(elem, url, selector, handler) {
		GM_xmlhttpRequest({
			method:	"GET",
			url:	url,
			onload:	function(response) {
				var thisHTML = response.responseText;
				var tempDiv = document.createElement('div');
				// remove script tags for safety's sake.
				$(tempDiv).html(thisHTML.replace(/<script(.|\s)*?\/script>/g, ''));
				var scrapedImg = tempDiv.querySelector(selector);
				if (typeof(handler) == 'function') {
					scrapedImg = handler(scrapedImg);
				}
				// just in case the site (i.e. flickr) has an onload, kill it to avoid JS errors.
//				if (!scrapedImg) return;
				if (scrapedImg) {
					$(scrapedImg).removeAttr('onclick');

					modules['showImages'].siteModules[elem.site].handleInfo(elem, {
						src: scrapedImg.src
					});
				} else {
					// uh oh, scraping failed.
					console.log(tempDiv);
				}
			}
		});
	},
	siteModules: {
		'default': {
			acceptRegex: /\.(gif|jpe?g|png)(?:[?&#_].*|$)/i,
			rejectRegex: /(wikipedia\.org\/wiki|photobucket\.com|gifsound\.com)/i,
			go: function(){},
			detect: function(elem) {
				var href = elem.href;
				return (this.acceptRegex.test(href) && !this.rejectRegex.test(href));
			},
			handleLink: function(elem) {
				var href = elem.href;
				this.handleInfo(elem, {
					type: 'IMAGE',
					src: elem.href
				});
			},
			handleInfo: function(elem, info) {
				elem.type = info.type;
				elem.src = info.src;
				elem.href = info.src;
				if (RESUtils.pageType() == 'linklist') {
					$(elem).closest('.thing').find('.thumbnail').attr('href',elem.href);
				}
				modules['showImages'].createImageExpando(elem);
			}
		},
		imgur: {
			APIKey: 'fe266bc9466fe69aa1cf0904e7298eda',
			// hashRe:/^https?:\/\/(?:[i.]|[edge.]|[www.])*imgur.com\/(?:r\/[\w]+\/)?([\w]{5,}(?:[&,][\w]{5,})?)(\..+)?(?:#(\d*))?$/i,
			// the modified regex below fixes detection of "edited" imgur images, but imgur's edited images are broken right now actually, falling into
			// a redirect loop.  preserving the old one just in case.  however it also fixes detection of the extension (.jpg, for example) which
			// was too greedy a search...
			hashRe:/^https?:\/\/(?:[i.]|[edge.]|[www.])*imgur.com\/(?:r\/[\w]+\/)?([\w]{5,}(?:[&,][\w]{5,})?)(\.[\w]{3,4})?(?:#(\d*))?(?:\?(?:\d*))?$/i,
			albumHashRe: /^https?:\/\/(?:i\.)?imgur.com\/a\/([\w]+)(\..+)?(?:\/)?(?:#\d*)?$/i,
			apiPrefix: 'http://api.imgur.com/2/',
			calls: {},
			go: function(){},
			detect: function(elem) {
				return elem.href.toLowerCase().indexOf('imgur.com/') >= 0;
			},
			handleLink: function(elem) {
				var href = elem.href.split('?')[0];
				var groups = this.hashRe.exec(href);
				if (!groups) var albumGroups = this.albumHashRe.exec(href);
				if (groups && !groups[2]) {
					if (groups[1].search(/[&,]/) > -1) {
						var hashes = groups[1].split(/[&,]/);
						modules['showImages'].siteModules['imgur'].handleInfo(elem, {
							album: {images: hashes.map(function(hash) {
								return {
									image: {title: '', caption: '', hash: hash},
									links: {original: 'http://i.imgur.com/'+hash+'.jpg'}
								};
							})}
						});
					} else {
						// removed caption API calls as they don't seem to exist/matter for single images, only albums...
						//If we don't show captions, then we can skip the API call.
						modules['showImages'].siteModules['imgur'].handleInfo(elem, {image: {
							links: {
								//Imgur doesn't really care about the extension and the browsers don't seem to either.
								original: 'http://i.imgur.com/'+groups[1]+'.jpg'
							}, image: {}}
						});
					}
				} else if (albumGroups && !albumGroups[2]) {
					var apiURL = this.apiPrefix + 'album/' + albumGroups[1] + '.json';
					if (apiURL in this.calls) {
						this.handleInfo(elem, this.calls[apiURL]);
					} else {
						GM_xmlhttpRequest({
							method: 'GET',
							url: apiURL,
//							aggressiveCache: true,
							onload: function(response) {
								try {
									var json = JSON.parse(response.responseText);
								} catch (error) {
									var json = {};
								}
								modules['showImages'].siteModules['imgur'].calls[apiURL] = json;
								modules['showImages'].siteModules['imgur'].handleInfo(elem, json);
							}
						});
					}
				}
			},
			handleInfo: function(elem, info) {
				if ('image' in info) {
					this.handleSingleImage(elem, info);
				} else if ('album' in info) {
					this.handleGallery(elem, info);
				} else {
					// console.log("ERROR", info);
					// console.log(arguments.callee.caller);
				}
			},
			handleSingleImage: function(elem, info) {
				elem.src = info.image.links.original;
				elem.href = info.image.links.original;
				if (RESUtils.pageType() == 'linklist') {
					$(elem).closest('.thing').find('.thumbnail').attr('href',elem.href);
				}
				elem.type = 'IMAGE';
				if (info.image.image.caption) elem.caption = info.image.image.caption;
				modules['showImages'].createImageExpando(elem);
			},
			handleGallery: function(elem, info) {
				var base = elem.href.split('#')[0];
				elem.src = info.album.images.map(function(e, i, a) {
					return {
						title: e.image.title,
						src: e.links.original,
						href: base + '#' + e.image.hash,
						caption: e.image.caption
					};
				});
				if (elem.hash) {
					var hash = elem.hash.slice(1);
					if (isNaN(hash)) {
						for (var i = 0; i < elem.src.length; i++) {
							if (hash == info.album.images[i].image.hash) {
								elem.galleryStart = i;
								break;
							}
						}
					} else {
						elem.galleryStart = parseInt(hash, 10);
					}
				}
				elem.imageTitle = info.album.title;
				elem.caption  = info.album.description;
				elem.type = 'GALLERY';
				modules['showImages'].createImageExpando(elem);
			}
		},
		ehost: {
			hashRe: /^http:\/\/(?:i\.)?(?:\d+\.)?eho.st\/(\w+)\/?/i,
			go: function() {},
			detect: function(elem) {
				var href = elem.href.toLowerCase();
				return href.indexOf('eho.st') >= 0 && href.substring(-1) != '+';
			},
			handleLink: function(elem) {
				var groups = this.hashRe.exec(elem.href);
				if (groups) {
					this.handleInfo(elem, {
						src: 'http://i.eho.st/'+groups[1]+'.jpg'
					});
				}
			},
			handleInfo: function(elem, info) {
				elem.type = 'IMAGE';
				elem.src = info.src;
				elem.href = info.src;
				if (RESUtils.pageType() == 'linklist') {
					$(elem).closest('.thing').find('.thumbnail').attr('href',elem.href);
				}
				elem.onerror = function() {
				    if (this.src.match(/\.jpg/)) {
				        this.src = this.src.slice(0, elem.src.length - 3) + 'png';
				    } else if (this.src.match(/\.png/)) {
				        this.src = this.src.slice(0, elem.src.length - 3) + 'gif';
				    }
				}
				modules['showImages'].createImageExpando(elem);
			}
		},
		picsarus: {
			hashRe:/^https?:\/\/(?:[i.]|[edge.]|[www.])*picsarus.com\/(?:r\/[\w]+\/)?([\w]{6,})(\..+)?$/i,
			go: function() {},
			detect: function(elem) {
				var href = elem.href.toLowerCase();
				return href.indexOf('picsarus.com') >= 0 && href.substring(-1) != '+';
			},
			handleLink: function(elem) {
				var groups = this.hashRe.exec(elem.href);
				if (groups) {
					this.handleInfo(elem, {
						src: 'http://www.picsarus.com/'+groups[1]+'.jpg'
					});
				}
			},
			handleInfo: function(elem, info) {
				elem.type = 'IMAGE';
				elem.src = info.src;
				elem.href = info.src;
				if (RESUtils.pageType() == 'linklist') {
					$(elem).closest('.thing').find('.thumbnail').attr('href',elem.href);
				}
				modules['showImages'].createImageExpando(elem);
			}
		},
		snaggy: {
			go: function() {},
			detect: function(elem) {
				return elem.href.toLowerCase().indexOf('snag.gy/') >= 0;
			},
			handleLink: function(elem) {
				var href = elem.href;
				var extensions = ['.jpg','.png','.gif'];
				if (href.indexOf('i.snag') == -1) href = href.replace('snag.gy', 'i.snag.gy');
				if (extensions.indexOf(href.substr(-4)) == -1) href = href+'.jpg';
				this.handleInfo(elem, {src: href});
			},
			handleInfo: function(elem, info) {
				elem.type = 'IMAGE';
				elem.src = info.src;
				elem.href = info.src;
				if (RESUtils.pageType() == 'linklist') {
					$(elem).closest('.thing').find('.thumbnail').attr('href',elem.href);
				}
				modules['showImages'].createImageExpando(elem);
			}
		},
		picshd: {
			deferred: true,
			hashRe:/^https?:\/\/(?:[i.]|[edge.]|[www.])*picshd.com\/([\w]{5,})(\..+)?$/i,
			go: function() {},
			detect: function(elem) {
				var href = elem.href.toLowerCase();
				return href.indexOf('picshd.com/') >= 0;
			},
			handleLink: function(elem) {
				var groups = this.hashRe.exec(elem.href);
				if (groups) {
					this.handleInfo(elem, 'http://i.picshd.com/'+groups[1]+'.jpg');
				}
			},
			handleInfo: function(elem, info) {
				elem.type = 'IMAGE';
				elem.src = info;
				elem.href = info;
				if (RESUtils.pageType() == 'linklist') {
					$(elem).closest('.thing').find('.thumbnail').attr('href',elem.href);
				}
				modules['showImages'].createImageExpando(elem);
			}
		},
		minus: {
			hashRe: /^http:\/\/min.us\/([\w]+)(?:#[\d+])?$/i,
			calls: {},
			go: function() {},
			detect: function(elem) {
				var href = elem.href.toLowerCase();
				return href.indexOf('min.us') >= 0 && href.indexOf('blog.') == -1;
			},
			handleLink: function(elem) {
				var href = elem.href.split('?')[0];
				//TODO: just make default run first and remove this
				var getExt = href.split('.');
				var ext = (getExt.length > 1?getExt[getExt.length - 1].toLowerCase():'');
				if (['jpg', 'jpeg', 'png', 'gif'].indexOf(ext)) {
					var groups = this.hashRe.exec(href);
					if (groups && !groups[2]) {
						var hash = groups[1];
						if (hash.substr(0, 1) == 'm') {
							var apiURL = 'http://min.us/api/GetItems/' + hash;
							if (apiURL in this.calls) {
								this.handleInfo(elem, this.calls[apiURL]);
							} else {
								GM_xmlhttpRequest({
									method: 'GET',
									url: apiURL,
									onload: function(response) {
										try {
											var json = JSON.parse(response.responseText);
										} catch (e) {
											var json = {};
										}
										modules['showImages'].siteModules['minus'].calls[apiURL] = json;
										modules['showImages'].siteModules['minus'].handleInfo(elem, json);
									}
								});
							}
						} // if not 'm', not a gallery, we can't do anything with the API.
					}
				}
			},
			handleInfo: function(elem, info) {
				//TODO: Handle titles
				//TODO: Handle possibility of flash items
				if ('ITEMS_GALLERY' in info) {
					if (info.ITEMS_GALLERY.length > 1) {
						elem.type = 'GALLERY';
						elem.src = {
							src: info.ITEMS_GALLERY
						};
					} else {
						elem.type = 'IMAGE';
						elem.href = info.ITEMS_GALLERY[0];
						if (RESUtils.pageType() == 'linklist') {
							$(elem).closest('.thing').find('.thumbnail').attr('href',elem.href);
						}
						elem.src = info.ITEMS_GALLERY[0];
					}
					modules['showImages'].createImageExpando(elem);
				}
			}
		},
		flickr: {
			hashRe: /^http:\/\/(?:\w+).?flickr.com\/(?:.*)\/([\d]{10})\/?(?:.*)?$/i,
			go: function() {},
			deferred: true,
			detect: function(elem) {
				var href = elem.href;
				return this.hashRe.test(href);
			},
			handleLink: function(elem) {
				elem.type = 'IMAGE';
				modules['showImages'].createImageExpando(elem);
			},
			deferredHandleLink: function(elem) {
				var selector = '#allsizes-photo > IMG';
				if (elem.href.indexOf('/sizes') == -1) {
					var inPosition = elem.href.indexOf('/in/');
					var inFragment = '';
					if (inPosition != -1) {
						inFragment = elem.href.substring(inPosition);
						elem.href = elem.href.substring(0, inPosition);
					}

					elem.href += '/sizes/c' + inFragment;
				}

				elem.href = elem.href.replace('/lightbox', '');

				modules['showImages'].scrapeHTML(elem, elem.href, selector)
			},
			handleInfo: function(elem, info) {
				elem.src = info.src;
				// we don't overwrite the URL here since this is a deferred/scraped call.
				// elem.href = info.src;
				$(elem).closest('.thing').find('.thumbnail').attr('href',elem.href);
				modules['showImages'].revealImageDeferred(elem);
			}
		},
		/*
		// imgclean hasn't been used on reddit in a couple of months, removing support for now.
		imgclean: {
			deferred: true,
			go: function() {},
			detect: function(elem) {
				return (elem.href.indexOf('imgclean.com/?p=')>=0);
			},
			handleLink: function(elem) {
				//Only do this here if deferred
				modules['showImages'].createImageExpando(elem);
			},
			deferredHandleLink: function(elem) {
				modules['showImages'].scrapeHTML(elem, elem.href, '.imgclear-entry-image > IMG')
			},
			handleInfo: function(elem, info) {
				elem.type = 'IMAGE';
				// we don't overwrite the URL here since this is a deferred/scraped call.
				// elem.href = info.src;
				if (RESUtils.pageType() == 'linklist') {
					$(elem).closest('.thing').find('.thumbnail').attr('href',elem.href);
				}
				elem.src = info.src;
				modules['showImages'].revealImageDeferred(elem);
			}
		},
		*/
		steam: {
			go: function() {},
			detect: function(elem) {
				return elem.href.toLowerCase().indexOf('cloud.steampowered.com') >= 0;
			},
			handleLink: function(elem) {
				this.handleInfo(elem, elem.href);
			},
			handleInfo: function(elem, info) {
				elem.type = 'IMAGE';
				elem.src = info;
				elem.href = info;
				if (RESUtils.pageType() == 'linklist') {
					$(elem).closest('.thing').find('.thumbnail').attr('href',elem.href);
				}
				modules['showImages'].createImageExpando(elem);
			}
		},
		quickmeme: {
			hashRe: /^http:\/\/(?:(?:www.|m.)?quickmeme.com\/meme|qkme.me|i.qkme.me)\/([\w]+)\/?/i,
			go: function() {},
			detect: function(elem) {
				var href = elem.href.toLowerCase();
				return href.indexOf('qkme.me') >= 0 || href.indexOf('quickmeme.com') >= 0;
			},
			handleLink: function(elem) {
				var groups = this.hashRe.exec(elem.href);
				if (groups) {
					this.handleInfo(elem, 'http://resme.me/'+groups[1]+'.jpg');
				}
			},
			handleInfo: function(elem, info) {
				elem.type = 'IMAGE';
				elem.src = info;
				elem.href = info;
				if (RESUtils.pageType() == 'linklist') {
					$(elem).closest('.thing').find('.thumbnail').attr('href',elem.href);
				}
				modules['showImages'].createImageExpando(elem);
			}
		},
		cloudpix: {
			hashRe: /^https?:\/\/(?:cloudpix.co\/i|cldpx.co)\/(\w+)/i,
			go: function() {},
			detect: function(elem) {
				var href = elem.href.toLowerCase();
				return href.indexOf('cloudpix.co') >= 0 || href.indexOf('cldpx.co') >= 0;
			},
			handleLink: function(elem) {
				var groups = this.hashRe.exec(elem.href);
				if (groups) {
					this.handleInfo(elem, 'http://i.cldpx.co/'+groups[1]);
				}
			},
			handleInfo: function(elem, info) {
				elem.type = 'IMAGE';
				elem.src = info;
				modules['showImages'].createImageExpando(elem);
			}
		},
		deviantart: {
			calls: {},
			matchRe: /^http:\/\/(?:fav.me\/.*|(?:.+\.)?deviantart.com\/(?:art\/.*|[^#]*#\/d.*))$/i,
			go: function() {},
			detect: function(elem) {
				return this.matchRe.test(elem.href);
			},
			handleLink: function(elem) {
				var apiURL = 'http://backend.deviantart.com/oembed?url=' + encodeURIComponent(elem.href);
				if (apiURL in this.calls) {
					this.handleInfo(elem, this.calls[apiURL]);
				} else {
					GM_xmlhttpRequest({
						method: 'GET',
						url: apiURL,
						aggressiveCache: true,
						onload: function(response) {
							try {
								var json = JSON.parse(response.responseText);
							} catch(error) {
								var json = {};
							}
							modules['showImages'].siteModules['deviantart'].calls[apiURL] = json;
							modules['showImages'].siteModules['deviantart'].handleInfo(elem, json);
						}
					});
				}
			},
			handleInfo: function(elem, info) {
				if ('url' in info) {
					elem.imageTitle = info.title;
					var original_url = elem.href;
					if(['jpg', 'jpeg', 'png', 'gif'].indexOf(info.url)) {
						elem.src = info.url;
						// elem.href = info.url;
					} else {
						elem.src = info.thumbnail_url;
						// elem.href = info.thumbnail_url;
					}
					if (RESUtils.pageType() == 'linklist') {
						$(elem).closest('.thing').find('.thumbnail').attr('href',elem.href);
					}
					// elem.credits = 'Original link: <a href="'+original_url+'">'+original_url+'</a><br>Art by: <a href="'+info.author_url+'">'+info.author_name+'</a> @ DeviantArt';
					elem.credits = 'Art by: <a href="'+info.author_url+'">'+info.author_name+'</a> @ DeviantArt';
					elem.type = 'IMAGE';
					modules['showImages'].createImageExpando(elem);
				}
			}
		},
		tumblr: {
			calls: {},
			APIKey: 'WeJQquHCAasi5EzaN9jMtIZkYzGfESUtEvcYDeSMLICveo3XDq',
			matchRE: /^https?:\/\/([a-z0-9\-]+\.tumblr\.com)\/post\/(\d+)(?:\/.*)?$/i,
			go: function() { },
			detect: function(elem) {
				return this.matchRE.test(elem.href);
			},
			handleLink: function(elem) {
				var groups = this.matchRE.exec(elem.href);
				if (groups) {
					var apiURL = 'http://api.tumblr.com/v2/blog/'+groups[1]+'/posts?api_key='+this.APIKey+'&id='+groups[2] + '&filter=raw';
					if (apiURL in this.calls) {
						this.handleInfo(elem, this.calls[apiURL]);
					} else {
						GM_xmlhttpRequest({
							method:'GET',
							url: apiURL,
							aggressiveCache: true,
							onload: function(response) {
								try {
									var json = JSON.parse(response.responseText);
								} catch (error) {
									var json = {};
								}
								if ('meta' in json && json.meta.status == 200) {
									modules['showImages'].siteModules['tumblr'].calls[apiURL] = json;
									modules['showImages'].siteModules['tumblr'].handleInfo(elem, json);
								}
							}
						});
					}
				}
			},
			handleInfo: function(elem, info) {
				var original_url = elem.href;
				var post = info.response.posts[0];
				switch (post.type) {
					case 'photo':
						if (post.photos.length > 1) {
							elem.type = 'GALLERY';
							elem.src = post.photos.map(function(e) {
								return {
									src: e.original_size.url,
									caption: e.caption
								};
							});
						} else {
							elem.type = "IMAGE";
							elem.src = post.photos[0].original_size.url;
						}
						break;
					case 'text':
						elem.type = 'TEXT';
						elem.imageTitle = post.title;
						if (post.format == 'markdown') {
							elem.src = modules['commentPreview'].converter.render(post.body)
						} else if (post.format == 'html') {
							elem.src = post.body;
						}
						 break;
					default:
						return;
						break;
				}
				elem.caption = post.caption;
				if (RESUtils.pageType() == 'linklist') {
					$(elem).closest('.thing').find('.thumbnail').attr('href',elem.href);
				}
				elem.credits = 'Posted by: <a href="'+info.response.blog.url+'">'+info.response.blog.name+'</a> @ Tumblr';
				modules['showImages'].createImageExpando(elem);
			}
		},
		memecrunch: {
			hashRe: /^http:\/\/memecrunch.com\/meme\/([0-9A-Z]+)\/([\w\-]+)(\/image\.(png|jpg))?/i,
			go: function() {},
			detect: function(elem) {
				return elem.href.toLowerCase().indexOf('memecrunch.com') >= 0;
			},
			handleLink: function(elem) {
				var groups = this.hashRe.exec(elem.href);
				if (groups && typeof(groups[1]) != 'undefined') {
					this.handleInfo(elem, 'http://memecrunch.com/meme/'+groups[1]+'/'+(groups[2]||'null')+'/image.png');
				}
			},
			handleInfo: function(elem, info) {
					elem.type = 'IMAGE';
					elem.src = info;
					elem.href = info;
					if (RESUtils.pageType() == 'linklist') {
						$(elem).closest('.thing').find('.thumbnail').attr('href',elem.href);
					}
					modules['showImages'].createImageExpando(elem);
			}
		},
		livememe: {
			hashRe: /^http:\/\/(?:www.livememe.com|lvme.me)\/(?!edit)([\w]+)\/?/i,
			go: function() { },
			detect: function(elem) {
				return elem.href.toLowerCase().indexOf('livememe.com') >= 0;
			},
			handleLink: function(elem) {
				var groups = this.hashRe.exec(elem.href);
				if (groups) {
					this.handleInfo(elem, 'http://www.livememe.com/'+groups[1]+'.jpg');
				}
			},
			handleInfo: function(elem, info) {
				elem.type = 'IMAGE';
				elem.src = info;
				elem.href = info;
				if (RESUtils.pageType() == 'linklist') {
					$(elem).closest('.thing').find('.thumbnail').attr('href',elem.href);
				}
				modules['showImages'].createImageExpando(elem);
			}
		},
		memefive: {
			hashRe: /^http:\/\/(?:www.memefive.com)\/meme\/([\w]+)\/?/i,
			altHashRe: /^http:\/\/(?:www.memefive.com)\/([\w]+)\/?/i,
			go: function() {},
			detect: function(elem) {
				return elem.href.toLowerCase().indexOf('memefive.com') >= 0;
			},
			handleLink: function(elem) {
				var groups = this.hashRe.exec(elem.href);
				if (!groups) {
					groups = this.altHashRe.exec(elem.href);
				}
				if (groups) {
					this.handleInfo(elem, 'http://memefive.com/memes/'+groups[1]+'.jpg');
				}
			},
			handleInfo: function(elem, info) {
				elem.type = 'IMAGE';
				elem.src = info;
				elem.href = info;
				if (RESUtils.pageType() == 'linklist') {
					$(elem).closest('.thing').find('.thumbnail').attr('href',elem.href);
				}
				modules['showImages'].createImageExpando(elem);
			}
		}
	}
};
