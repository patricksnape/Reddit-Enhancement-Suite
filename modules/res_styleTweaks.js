modules['styleTweaks'] = {
	moduleID: 'styleTweaks',
	moduleName: 'Style Tweaks',
	category: 'UI',
	description: 'Provides a number of style tweaks to the Reddit interface',
	options: { 
		navTop: {
			type: 'boolean',
			value: true,
			description: 'Moves the username navbar to the top (great on netbooks!)'
		},
		commentBoxes: {
			type: 'boolean',
			value: true,
			description: 'Highlights comment boxes for easier reading / placefinding in large threads.'
		},
		/* REMOVED for performance reasons...
		commentBoxShadows: {
			type: 'boolean',
			value: false,
			description: 'Drop shadows on comment boxes (turn off for faster performance)'
		},
		*/
		commentRounded: {
			type: 'boolean',
			value: true,
			description: 'Round corners of comment boxes'
		},
		commentHoverBorder: {
			type: 'boolean',
			value: false,
			description: 'Highlight comment box hierarchy on hover (turn off for faster performance)'
		},
		commentIndent: {
			type: 'text',
			value: 10,
			description: 'Indent comments by [x] pixels (only enter the number, no \'px\')'
		},
		continuity: {
			type: 'boolean',
			value: false,
			description: 'Show comment continuity lines'
		},
		lightSwitch: {
			type: 'boolean',
			value: true,
			description: 'Enable lightswitch (toggle between light / dark reddit)'
		},
		lightOrDark: {
			type: 'enum',
			values: [
				{ name: 'Light', value: 'light' },
				{ name: 'Dark', value: 'dark' }
			],
			value: 'light',
			description: 'Light, or dark?'
		},
		visitedStyle: {
			type: 'boolean',
			value: false,
			description: 'Reddit makes it so no links on comment pages appear as "visited" - including user profiles. This option undoes that.'
		},
		showExpandos: {
			type: 'boolean',
			value: true,
			description: 'Bring back video and text expando buttons for users with compressed link display'
		},
		colorBlindFriendly: {
			type: 'boolean',
			value: false,
			description: 'Use colorblind friendly styles when possible'
		},
		scrollSubredditDropdown: {
			type: 'boolean',
			value: true,
			description: 'Scroll the standard subreddit dropdown (useful for pinned header and disabled Subreddit Manager)'
		}
	},
	isEnabled: function() {
		return RESConsole.getModulePrefs(this.moduleID);
	},
	include: Array(
		/https?:\/\/([a-z]+).reddit.com\/[-\w\.\/]*/i
	),
	isMatchURL: function() {
		return RESUtils.isMatchURL(this.moduleID);
	},
	beforeLoad: function() {
		if ((this.isEnabled()) && (this.isMatchURL())) {
			this.styleCBName = RESUtils.randomHash();
			RESUtils.addCSS('body.res .side .spacer .titlebox div #'+this.styleCBName+':before { display: none !important;  }');
			RESUtils.addCSS('body.res .side .spacer .titlebox div #label-'+this.styleCBName+':before { display: none !important; }');
			RESUtils.addCSS('body.res .side .spacer .titlebox div #'+this.styleCBName+':after { display: none !important;  }');
			RESUtils.addCSS('body.res .side .spacer .titlebox div #label-'+this.styleCBName+':after { display: none !important; }');

			// wow, Reddit doesn't define a visited class for any links on comments pages...
			// let's put that back if users want it back.
			// If not, we still need a visited class for links in comments, like imgur photos for example, or inline image viewer can't make them look different when expanded!
			if (this.options.visitedStyle.value) {
				RESUtils.addCSS(".comment a:visited { color:#551a8b }");
			} else {
				RESUtils.addCSS(".comment .md p > a:visited { color:#551a8b }");
			}
			if (this.options.showExpandos.value) {
				RESUtils.addCSS('.compressed .expando-button { display: block !important; }');
			}
			var commentsRegex = new RegExp(/https?:\/\/([a-z]+).reddit.com\/[-\w\.\/]*comments\/[-\w\.\/]*/i);
			if ((this.options.commentBoxes.value) && (commentsRegex.test(location.href))) {
				this.commentBoxes();
			}
			this.isDark = false;
			if (this.options.lightOrDark.value == 'dark') {
				this.isDark = true;
				this.redditDark();
			}
		}
	},
	go: function() {
		if ((this.isEnabled()) && (this.isMatchURL())) {
			
			if (this.isDark) {
				document.body.classList.add('res-nightmode');
			}
			// get rid of antequated option we've removed (err, renamed) due to performance issues.
			if (typeof(this.options.commentBoxHover) != 'undefined') {
				delete this.options.commentBoxHover;
				RESStorage.setItem('RESoptions.styleTweaks', JSON.stringify(modules['styleTweaks'].options));
			}
			if (this.options.navTop.value) {
				this.navTop();
			}
			if (this.options.lightSwitch.value) {
				this.lightSwitch();
			}
			if (this.options.colorBlindFriendly.value) {
				var orangered = document.body.querySelector('#mail');
				if ((orangered) && (orangered.classList.contains('havemail'))) {
					orangered.setAttribute('style','background-image: url(http://thumbs.reddit.com/t5_2s10b_5.png); background-position: 0 0;');
				}
			}
			if (this.options.scrollSubredditDropdown.value) {
				var calcedHeight = Math.floor(window.innerHeight * 0.95);
				if( $('.drop-choices.srdrop').height() > calcedHeight ) {
					RESUtils.addCSS('.drop-choices.srdrop { \
						overflow-y:scroll; \
						height:' + calcedHeight + 'px; \
					}');
				}
			}
			if (this.options.showExpandos.value) {
				RESUtils.addCSS('.compressed .expando-button { display: block !important; }');
				var twitterLinks = document.body.querySelectorAll('.entry > p.title > a.title');
				var isTwitterLink = /twitter.com\/(?:#!\/)?([\w]+)\/(status|statuses)\/([\d]+)/i;
				for (var i=0, len = twitterLinks.length; i<len; i++) {
					var thisHref = twitterLinks[i].getAttribute('href');
					thisHref = thisHref.replace('/#!','');
					if (isTwitterLink.test(thisHref)) {
						var thisExpandoButton = document.createElement('div');
						thisExpandoButton.setAttribute('class','expando-button collapsed collapsedExpando selftext twitter');
						thisExpandoButton.addEventListener('click',modules['styleTweaks'].toggleTweetExpando,false);
						insertAfter(twitterLinks[i].parentNode, thisExpandoButton);
					}
				}
			}
			this.userbarHider();
			this.subredditStyles();
		}
	},
	toggleTweetExpando: function(e) {
		var thisExpando = e.target.nextSibling.nextSibling.nextSibling;
		if (e.target.classList.contains('collapsedExpando')) {
			$(e.target).removeClass('collapsedExpando collapsed').addClass('expanded');
			if (thisExpando.classList.contains('twitterLoaded')) {
				thisExpando.style.display = 'block';
				return;
			}
			var twitterLink = e.target.previousSibling.querySelector('.title');
			if (twitterLink) twitterLink = twitterLink.getAttribute('href').replace('/#!','');
			var match = twitterLink.match(/twitter.com\/[^\/]+\/(?:status|statuses)\/([\d]+)/i);
			if (match !== null) {
				// var jsonURL = 'http://api.twitter.com/1/statuses/show/'+match[1]+'.json';
				var jsonURL = 'http://api.twitter.com/1/statuses/oembed.json?id='+match[1];
				if (BrowserDetect.isChrome()) {
					// we've got chrome, so we need to hit up the background page to do cross domain XHR
					var thisJSON = {
						requestType: 'loadTweet',
						url: jsonURL
					};
					chrome.extension.sendMessage(thisJSON, function(response) {
						// send message to background.html 
						var tweet = response;
						$(thisExpando).html(tweet.html);
						thisExpando.style.display = 'block';
						thisExpando.classList.add('twitterLoaded');
					});
				} else if (BrowserDetect.isSafari()) {
					// we've got safari, so we need to hit up the background page to do cross domain XHR
					modules['styleTweaks'].tweetExpando = thisExpando;
					var thisJSON = {
						requestType: 'loadTweet',
						url: jsonURL
					}
					safari.self.tab.dispatchMessage("loadTweet", thisJSON);
				} else if (BrowserDetect.isOpera()) {
					// we've got opera, so we need to hit up the background page to do cross domain XHR
					modules['styleTweaks'].tweetExpando = thisExpando;
					var thisJSON = {
						requestType: 'loadTweet',
						url: jsonURL
					}
					opera.extension.postMessage(JSON.stringify(thisJSON));
				} else if (BrowserDetect.isFirefox()) {
					// we've got a jetpack extension, hit up the background page...
					modules['styleTweaks'].tweetExpando = thisExpando;
					var thisJSON = {
						requestType: 'loadTweet',
						url: jsonURL
					}
					self.postMessage(thisJSON);
				} else {
					GM_xmlhttpRequest({
						method:	"GET",
						url:	jsonURL,
						target: thisExpando,
						onload:	function(response) {
							var tweet = JSON.parse(response.responseText);
							$(thisExpando).html('<form class="usertext"><div class="usertext-body"><div class="md"><div><img style="display: block;" src="'+escapeHTML(tweet.user.profile_image_url)+'"></div>' + escapeHTML(tweet.user.screen_name) + ': ' + escapeHTML(tweet.text) + '</div></div></form>');
							thisExpando.style.display = 'block';
						}
					});
				}
			}
		} else {
			$(e.target).removeClass('expanded').addClass('collapsedExpando').addClass('collapsed');
			thisExpando.style.display = 'none';
		}
		
	},
	navTop: function() {
		RESUtils.addCSS('#header-bottom-right { top: 19px; border-radius: 0 0 0 3px; bottom: auto;  }');
		$('#header-bottom-right').addClass('res-navTop');
	},
	userbarHider: function() {
		RESUtils.addCSS("#userbarToggle { min-height: 22px; position: absolute; top: 0; left: -5px; width: 16px; padding-right: 3px; height: 100%; font-size: 15px; border-radius: 4px 0; color: #a1bcd6; display: inline-block; background-color: #dfecf9; border-right: 1px solid #cee3f8; cursor: pointer; text-align: right; line-height: 24px; }");
		RESUtils.addCSS("#userbarToggle.userbarShow { min-height: 26px; }");
		RESUtils.addCSS("#header-bottom-right .user { margin-left: 16px; }");
		// RESUtils.addCSS(".userbarHide { background-position: 0 -137px; }");
		RESUtils.addCSS("#userbarToggle.userbarShow { left: -12px; }");
		RESUtils.addCSS(".res-navTop #userbarToggle.userbarShow { top:0 }");
		this.userbar = document.getElementById('header-bottom-right');
		if (this.userbar) {
			this.userbarToggle = createElementWithID('div','userbarToggle');
			$(this.userbarToggle).html('&raquo;');
			this.userbarToggle.setAttribute('title','Toggle Userbar');
			this.userbarToggle.classList.add('userbarHide');
			this.userbarToggle.addEventListener('click', function(e) {
				modules['styleTweaks'].toggleUserBar();
			}, false);
			this.userbar.insertBefore(this.userbarToggle, this.userbar.firstChild);
			// var currHeight = $(this.userbar).height();
			// $(this.userbarToggle).css('height',currHeight+'px');
			if (RESStorage.getItem('RESmodules.styleTweaks.userbarState') == 'hidden') {
				this.toggleUserBar();
			}
		}
	},
	toggleUserBar: function() {
		var nextEle = this.userbarToggle.nextSibling;
		// hide userbar.
		if (this.userbarToggle.classList.contains('userbarHide')) {
			this.userbarToggle.classList.remove('userbarHide');
			this.userbarToggle.classList.add('userbarShow');
			$(this.userbarToggle).html('&laquo;');
			RESStorage.setItem('RESmodules.styleTweaks.userbarState', 'hidden');
			modules['accountSwitcher'].closeAccountMenu();
			while ((typeof(nextEle) != 'undefined') && (nextEle !== null)) {
				nextEle.style.display = 'none';
				nextEle = nextEle.nextSibling;
			}
		// show userbar.
		} else {
			this.userbarToggle.classList.remove('userbarShow');
			this.userbarToggle.classList.add('userbarHide');
			$(this.userbarToggle).html('&raquo;');
			RESStorage.setItem('RESmodules.styleTweaks.userbarState', 'visible');
			while ((typeof(nextEle) != 'undefined') && (nextEle !== null)) {
			if ((nextEle.className.match(/mail/)) || (nextEle.id == 'openRESPrefs')) {
				nextEle.style.display = 'inline-block';
			} else {
				nextEle.style.display = 'inline';
			}
		nextEle = nextEle.nextSibling;
			}
		}
	},
	commentBoxes: function() {
		// replaced with a less intensive method... adapted from Reddit Comment Boxes via:
		// @description	  Updated version of Tiby312's Reddit Comment Boxes script (http://userscripts.org/scripts/show/63628) 
		// @author        flatluigi
		

		RESUtils.addCSS("#parentComment { "+
			'border: 1px solid #666; background-color:#fff;'+
			'padding: 4px; width: auto;'+
			'position: absolute'+
			"} ");
		RESUtils.addCSS(".comment{");
		if (this.options.commentRounded.value) {
			RESUtils.addCSS("	border-radius:3px !important;");
		}
		RESUtils.addCSS("	margin-left:"+this.options.commentIndent.value+"px !important;"+
		"	margin-right:8px!important;"+
		"	margin-top:0!important;"+
		"	margin-bottom:8px!important;"+
		// commented out, we'll do this in the parentHover class for more CSS friendliness to custom subreddit stylesheets...
		// "	background-color:#fff !important;"+
		"	border:1px solid #e6e6e6 !important;"+
		"	padding: 5px 8px 0 5px!important;"+
		"	overflow: hidden !important;"+
		"}");
		if (this.options.continuity.value) {
			RESUtils.addCSS('.comment div.child { border-left: 1px dotted #555 !important; } ');
		} else {
			RESUtils.addCSS('.comment div.child { border-left: none !important; } ');
		}
		RESUtils.addCSS(".comment .comment{"+
		"	margin-right:0!important;"+
		"	background-color:#F7F7F8 !important;"+	
		"}"+
		".comment .comment .comment{"+
		"	background-color:#fff !important;"+	
		"}"+
		".comment .comment .comment .comment{"+
		"	background-color:#F7F7F8 !important;"+	
		"}"+
		".comment .comment .comment .comment .comment{"+
		"	background-color:#fff !important;"+	
		"}"+
		".comment .comment .comment .comment .comment .comment{"+
		"	background-color:#F7F7F8 !important;"+	
		"}"+
		".comment .comment .comment .comment .comment .comment .comment{"+
		"	background-color:#fff !important;"+	
		"}"+
		".comment .comment .comment .comment .comment .comment .comment .comment{"+
		"	background-color:#F7F7F8 !important;"+	
		"}"+
		".comment .comment .comment .comment .comment .comment .comment .comment .comment{"+
		"	background-color:#fff !important;"+	
		"}"+
		".comment .comment .comment .comment .comment .comment .comment .comment .comment .comment{"+
		"	background-color:#F7F7F8 !important;"+	
		"}"+
		/*
		".commentarea, .link, .comment {"+
		"	overflow:hidden; !important;"+
		"}"+
		*/
		"body > .content {"+
		" padding-right:0!important;"+
		"}"); 
		if (this.options.commentHoverBorder.value) {
			RESUtils.addCSS(" .comment:hover {border: 1px solid #99AAEE !important; }");
		}
	},
	lightSwitch: function() {
		RESUtils.addCSS(".lightOn { background-position: 0 -96px; } ");
		RESUtils.addCSS(".lightOff { background-position: 0 -108px; } ");
		var thisFrag = document.createDocumentFragment();
		this.lightSwitch = document.createElement('li');
		this.lightSwitch.setAttribute('title',"Toggle night and day");
		this.lightSwitch.addEventListener('click',function(e) {
			e.preventDefault();
			if (modules['styleTweaks'].isDark == true) {
				RESUtils.setOption('styleTweaks','lightOrDark','light');
				modules['styleTweaks'].lightSwitchToggle.classList.remove('enabled');
				RESUtils.notification('Dark style will be removed on next page load.')
				// modules['styleTweaks'].redditDark(true);
			} else {
				RESUtils.setOption('styleTweaks','lightOrDark','dark');
				modules['styleTweaks'].lightSwitchToggle.classList.add('enabled');
				RESUtils.notification('Dark style will be applied on next page load.')
				// modules['styleTweaks'].redditDark();
			}
		}, true);
		// this.lightSwitch.setAttribute('id','lightSwitch');
		this.lightSwitch.textContent = 'night mode';
		this.lightSwitchToggle = createElementWithID('div','lightSwitchToggle','toggleButton');
		$(this.lightSwitchToggle).html('<span class="toggleOn">on</span><span class="toggleOff">off</span>');
		this.lightSwitch.appendChild(this.lightSwitchToggle);
		(this.options.lightOrDark.value == 'dark') ? this.lightSwitchToggle.classList.add('enabled') : this.lightSwitchToggle.classList.remove('enabled');
		// thisFrag.appendChild(separator);
		thisFrag.appendChild(this.lightSwitch);
		// if (RESConsole.RESPrefsLink) insertAfter(RESConsole.RESPrefsLink, thisFrag);
		$('#RESDropdownOptions').append(this.lightSwitch);
	},
	subredditStyles: function() {
		this.ignoredSubReddits = [];
		var getIgnored = RESStorage.getItem('RESmodules.styleTweaks.ignoredSubredditStyles');
		if (getIgnored) {
			this.ignoredSubReddits = safeJSON.parse(getIgnored, 'RESmodules.styleTweaks.ignoredSubredditStyles');
		}
		this.head = document.getElementsByTagName("head")[0];
		var subredditTitle = document.querySelector('.titlebox h1');
		this.styleToggleContainer = document.createElement('div');
		this.styleToggleLabel = document.createElement('label');
		this.styleToggleCheckbox = document.createElement('input');
		this.styleToggleCheckbox.setAttribute('type','checkbox');
		this.styleToggleCheckbox.setAttribute('id',this.styleCBName);
		this.styleToggleCheckbox.setAttribute('name',this.styleCBName);
		if (RESUtils.currentSubreddit()) {
			this.curSubReddit = RESUtils.currentSubreddit().toLowerCase();
		}
		if ((this.curSubReddit !== null) && (subredditTitle !== null)) {
			var idx = this.ignoredSubReddits.indexOf(this.curSubReddit);
			if (idx == -1) {
				this.styleToggleCheckbox.checked = true;
			} else {
				this.toggleSubredditStyle(false);
			}
			this.styleToggleCheckbox.addEventListener('change', function(e) {
				modules['styleTweaks'].toggleSubredditStyle(this.checked);
			}, false);
			this.styleToggleContainer.appendChild(this.styleToggleCheckbox);
			insertAfter(subredditTitle, this.styleToggleContainer);
		}
		this.styleToggleLabel.setAttribute('for',this.styleCBName);
		this.styleToggleLabel.setAttribute('id','label-'+this.styleCBName);
		this.styleToggleLabel.textContent = 'Use subreddit style ';
		this.styleToggleContainer.appendChild(this.styleToggleLabel);
		this.setSRStyleToggleVisibility(true); // no source
	},
	srstyleHideLock: RESUtils.createMultiLock(),
	setSRStyleToggleVisibility: function (visible, source) {
		/// When showing/hiding popups which could overlay the "Use subreddit style" checkbox,
		/// set the checkbox's styling to "less visible" or "more visible"
		/// @param 	visible 		bool	make checkbox "more visible" (true) or less (false)
		/// @param 	source 	string 	popup ID, so checkbox stays less visible until that popup's lock is released
		var self = modules['styleTweaks']; 
		if (!self.styleToggleContainer) return;

		if (typeof source != "undefined") {
			if (visible) {
				self.srstyleHideLock.unlock(source);
			} else {
				 self.srstyleHideLock.lock(source);
			}
		}

		if (visible && self.srstyleHideLock.locked()) {
			visible = false;
		}

		// great, now people are still finding ways to hide this.. these extra declarations are to try and fight that.
		// Sorry, subreddit moderators, but users can disable all subreddit stylesheets if they want - this is a convenience 
		// for them and I think taking this functionality away from them is unacceptable.
		
		var zIndex = 'z-index: ' + (visible ? ' 2147483647' : 'auto') + ' !important;';

		self.styleToggleContainer.setAttribute( 'style', 'display: block !important; position: relative !important; left: 0 !important; top: 0 !important; max-height: none!important; max-width: none!important; height: auto !important; width: auto !important; visibility: visible !important; overflow: auto !important; text-indent: 0 !important; font-size: 12px !important;' + zIndex );
		self.styleToggleCheckbox.setAttribute( 'style', 'display: inline-block !important; position: relative !important; left: 0 !important; top: 0 !important; max-height: none!important; max-width: none!important; height: auto !important; width: auto !important; visibility: visible !important; overflow: auto !important; text-indent: 0 !important; font-size: 12px !important;' + zIndex );
		self.styleToggleLabel.setAttribute( 'style', 'display: inline-block !important; position: relative !important; left: 0 !important; top: 0 !important; max-height: none!important; max-width: none!important; height: auto !important; width: auto !important; visibility: visible !important; overflow: auto !important; text-indent: 0 !important; font-size: 12px !important; margin-left: 4px !important;' + zIndex );
	},
	toggleSubredditStyle: function(toggle, subreddit) {
		var togglesr = (subreddit) ? subreddit.toLowerCase() : this.curSubReddit;
		if (toggle) {
			var idx = this.ignoredSubReddits.indexOf(togglesr);
			if (idx != -1) this.ignoredSubReddits.splice(idx, 1); // Remove it if found...
			var subredditStyleSheet = document.createElement('link');
			subredditStyleSheet.setAttribute('title','applied_subreddit_stylesheet');
			subredditStyleSheet.setAttribute('rel','stylesheet');
			subredditStyleSheet.setAttribute('href','http://www.reddit.com/r/'+togglesr+'/stylesheet.css');
			if (!subreddit || (subreddit == this.curSubReddit)) this.head.appendChild(subredditStyleSheet);
		} else {
			var idx = this.ignoredSubReddits.indexOf(togglesr); // Find the index
			if (idx==-1) this.ignoredSubReddits[this.ignoredSubReddits.length] = togglesr;
			var subredditStyleSheet = this.head.querySelector('link[title=applied_subreddit_stylesheet]');
			if (!subredditStyleSheet) subredditStyleSheet = this.head.querySelector('style[title=applied_subreddit_stylesheet]');
			if ((subredditStyleSheet) && (!subreddit || (subreddit == this.curSubReddit))) {
				subredditStyleSheet.parentNode.removeChild(subredditStyleSheet);
			}
		}
		RESStorage.setItem('RESmodules.styleTweaks.ignoredSubredditStyles',JSON.stringify(this.ignoredSubReddits));
	},
	redditDark: function(off) {
		if (off) {
			this.isDark = false;
			if (typeof(this.darkStyle) != 'undefined') {
				this.darkStyle.parentNode.removeChild(this.darkStyle);
				document.body.classList.remove('res-nightmode');
			}
		} else {
			this.isDark = true;
			var css = "html,.res-nightmode,.res-nightmode>.content,.side,.flairselector,.linefield,.icon-menu a,.side .leavemoderator,.side .leavecontributor,.side .titlebox,.side .spacer .titlebox .redditname,.side .titlebox .flairtoggle,.res-nightmode .side .usertext-body .md ol,.res-nightmode .side .usertext-body .md ol ol,.res-nightmode .side .usertext-body .md ol ol li,.res-nightmode .side blockquote{background-color:#222}";
			css += "html>.res-nightmode{background-image:none}";
			css += ".RESNotification {border: 1px solid #ccc;color:#fefefe;background-color: #gray}";
			css += ".RESNotificationHeader{background:#c7c7c7}";
			css += ".RESNotificationContent{background:#eee}";
			css += ".listing-page .sitetable>div:nth-of-type(4n+1),.messages-page .sitetable>div:nth-of-type(4n+1){background-color:rgba(24,24,24,.2);padding-top:.5em}";
			css += ".res-nightmode #parentComment { background-color:#333 !important}";
			css += ".comment .md p a[href='/spoiler']{background-color:#000;color:#000}";
			css += ".comment .md p a[href='/spoiler']:hover,.comment .md p a[href='/spoiler']:active,#commentNavButtons *{color:#fff}";
			css += ".res-nightmode .entry .buttons li a{color:rgba(221,221,221,.8)}";
			css += ".res-nightmode .comment .md > p a{color:#39f}.res-nightmode .comment .md > p a:visited{color:#0000f3}";
			css += ".trophy-info .trophy-name,.res-nightmode .side .usertext-body .md em,.res-nightmode .side .usertext-body .md p{color:#eee!important}";
			css += ".res-nightmode .comment .md > p a:hover{opacity:.9;text-decoration:underline}";
			css += ".res-nightmode .side .usertext-body ol,.res-nightmode .side .redditname a,.res-nightmode .side .usertext-body .md blockquote p{color:#eee}";
			css += "ul.tabmenu li.selected a,.res-nightmode .redditname a.active{background:#fee}";
			css += ".submit-page .submit .formtab .selected a{background:gray}";
			css += ".sidecontentbox .content{border-color:rgba(234,234,234,.1)}";
			css += ".side .redditname a,.side h1,.side h2,.side h3,.side h4,.side h5,.side h6{color:#eee}";
			css += ".res-nightmode .usertext.border .usertext-body {background-color:rgba(255,255,204,.5)}";
			css += ".res-nightmode .flair{background-color:#bbb;color:#000}";
			css += ".RESUserTagImage, button.arrow.prev, button.arrow.next{opacity:.5}";
			css += "#RESMenu li.active{background-color:#7f7f7f}";
			css += "#RESConsoleContent,#RESMenu li{background-color:#eee}";
			css += "#RESConsoleTopBar #RESLogo,#progressIndicator{opacity:.4}";
			css += ".tabmenu li a,.login-form,.login-form input[name*='passwd'],.login-form-side .submit{background-color:#bbb}";
			css += ".login-form-side input{width:auto}";
			css += ".login-form-side{background-color:#888;color:#eee}";
			css += "#sr-header-area,#sr-more-link,#RESConsoleTopBar,.moduleHeader,.allOptionsContainer,.optionContainer{background-color:#ccc;color:#000}";
			css += ".usertable .btn{border-color:#aa9;color:#aa9}";
			css += ".usertable tr .user .userkarma{color:#aa9}";
			css += ".thing.spam{background-color:rgba(250,128,114,.3)}";
			css += "#userTaggerTable th,#newCommentsTable th,.res-nightmode .buttons .stamp,.RESNotification a,.RESDashboardComponent .RESDashboardComponentHeader ul .updateTime:hover,.big-mod-buttons .pretty-button,.instructions .preftable th,.instructions .pretty-form,.commentreply .textarea,.drop-choices a,.res-nightmode .remove-self .option,.res-nightmode .unfriend-button .option{color:#000}";
			css += ".new-comment .usertext-body .md{border:0.1em #aaa dashed}";
			css += ".sitetable .moderator {background-color:#282}";
			css += ".sitetable .admin {background-color:#F01}";
			css += ".message ul {color:#abc}";
			css += ".side .spacer>#search input{background-color:#444}";
			css += "input[type=\"text\"]{background-color:#aaa}";
			css += ".share-button .option{color:#8AD}";
			css += ".res-nightmode>.content>.spacer>.sitetable:before,.res-nightmode>.content>.sharelink~.sitetable:before,.side .age,.trophy-info *,.golddvertisement,.flair-jump .title{color:#ddd}";
			css += "#tab-templates a,#tab-link_templates a{background-color:#666660;color:#ddd}";
			css += ".livePreview blockquote{border-left:.2em solid #fff}.goldvertisement{background:#dad0b3}";
			css += ".res-nightmode #RESDashboardAddComponent,.dashboardPane>.RESDashboardComponent{background-color:gray}";
			css += "#RESConsole{background-color:#ddd}#RESDashboard .RESDashboardComponentHeader{background-color:#c0c0c0}";
			css += ".RESDashboardComponentScrim span,.RESDashboardComponent .RESDashboardComponentHeader ul .updateTime,.traffic-table tr:nth-of-type(odd) {color:#222}";
			css += ".RESDashboardComponent .RESDashboardComponentHeader ul li.active,.RESDashboardComponent .RESDashboardComponentHeader ul li:hover{background-color:#ccc}";
			css += ".addNewWidget,.editWidget,.RESDashboardComponent .widgetPath,#authorInfoToolTip .option,.updateTime,.toggle .option,#search input[type=\"text\"]:focus{color:#fff}";
			css += ".entry .score{color:#dde}";
			css += ".entry .tagline:first-of-type,.entry time{color:rgba(231,231,176,.6)}";
			css += ".res-nightmode .comment,.sitetable .thing,.permission-summary{border-color:transparent!important}";
			css += "code{color:#6c0}.side .spacer,.content,.moderator .traffic-table tr:nth-of-type(odd){color:#ccc}";
			css += ".entry .domain a{color:lightblue}";
			css += ".side .titlebox form.flairtoggle,.trophy-area .content,.NERPageMarker,geMarker,.side .titlebox .usertext-body ol,.side .titlebox .usertext-body ol,.side .titlebox .usertext-body ul{background-color:#222;color:#ddd}";
			css += ".message.message-reply.recipient>.entry .head,.message.message-parent.recipient> .entry .head{color:inherit}"
			css += ".res-nightmode #header,.res-nightmode #header-bottom-left,.res-nightmode .modactions{background:#666660!important}";
			css += ".infobar{background-color:#222;color:#000}";
			css += "#subscribe a,.share .option,.tagline a,.content a,.footer a,.wired a,.side a, .subredditbox li a{color:#8AD}";
			css += ".rank .star{color:orangered}";
			css += ".arrow{height:14px;margin-top:0;width:15px}";
			css += ".arrow.up { background:url(http://thumbs.reddit.com/t5_2qlyl_0.png?v=zs9q49wxah08x4kpv2tu5x4nbda7kmcpgkbj) no-repeat -15px 0}";
			css += ".arrow.down { background:url(http://thumbs.reddit.com/t5_2qlyl_0.png?v=10999ad3mtco31oaf6rrggme3t9jdztmxtg6) no-repeat -15px -14px}";
			css += ".arrow.up:hover { background:url(http://thumbs.reddit.com/t5_2qlyl_0.png?v=9oeida688vtqjpb4k0uy93oongrzuv5j7vcj) no-repeat -30px 0}";
			css += ".arrow.down:hover { background:url(http://thumbs.reddit.com/t5_2qlyl_0.png?v=cmsw4qrin2rivequ0x1wnmn8ltd7ke328yqs) no-repeat -30px -14px}";
			css += ".arrow.upmod { background:url(http://thumbs.reddit.com/t5_2qlyl_0.png?v=8oarqkcswl255wrw3q1kyd74xrty50a7wr3z) no-repeat 0 0}";
			css += ".arrow.downmod { background:url(http://thumbs.reddit.com/t5_2qlyl_0.png?v=90eauq018nf41z3vr0u249gv2q6651xyzrkh) no-repeat 0 -14px}";
			css += ".link .score.likes,.linkcompressed .score.likes{color:orangered}";
			css += ".link .score.dislikes,.linkcompressed .score.dislikes{color:#8AD}";
			css += ".linkcompressed .entry .buttons li a,.link .usertext .md,.thing .compressed, organic-listing .link,.link.promotedlink,.link.promotedlink.promoted{background:none}";
			css += ".link .usertext-body .md{border-color:#666}";
			css += ".message.new>.entry{background-color:#444;border:1px solid #E9E9E9;padding:6px} ";
			css += ".subredditbox li a:before{content:\"#\"}.subredditbox li{font-weight:bold ; text-transform:lowercase}";
			css += ".dropdown.lightdrop .drop-choices{background-color:#333}";
			css += ".dropdown.lightdrop a.choice:hover{background-color:#111}.midcol {margin-right:7px}.side{color:#fff;margin-left:10px}";
			css += ".sidebox, .subredditbox,.subreddit-info,.raisedbox,.login-form-side{background-color:#393939;border:2px solid #151515;color:#aaa;border-radius:8px}";
			css += ".login-form-side{padding-bottom:1px;}";
			css += ".login-form-side label{color:#111}.login-form-side a{color:#fff;font-size:11px}";
			css += ".login-form-side .error{color:#600}.subreddit-info .label{color:#aaa}.subreddit-info{padding:10px}";
			css += ".subreddit-info .spacer a{background-color:#222;border:0 none;margin-right:3px}";
			css += ".submit .spacer,.create .spacer{left:5px}";
			css += ".spacer>.create,.spacer>.submit{overflow:hidden}";
			css += ".subredditbox ul{padding:10px 0 10px 3px;width:140px}.subredditbox ul a:hover{text-decoration:underline}.sidebox .morelink {background:none;border:0 none;border-radius:6px}";
			css += ".morelink.blah{background:none;border:0 none;color:#369}";
			css += ".morelink:hover{border:0 none;color:#fff}.side .linkinfo{border-color:#666}";
			css += ".sidebox .spacer, .side .linkinfo{background-color:#393939}.side .nub {display:none}";
			css += ".sidebox .subtitle {color:#aaa}h1{border-bottom:1px solid #444}";
			css += ".commentreply .buttons button{margin-left:0;margin-top:5px}";
			css += ".res-nightmode .menuarea{margin-right:315px}.permamessage{background-image:url(http://thumbs.reddit.com/t5_2qlyl_3.png?v=uza2aq80cb2x2e90ojhdqooj1wazax4jjzfc);border-color:#369}";
			css += ".res-nightmode .commentbody.border{background-color:#369}.commentreply .help tr{background:none}.commentreply table.help{margin:2px}";
			css += "#newlink th{padding-top:5px;vertical-align:top} .pretty-form.long-text input[type=\"text\"],.pretty-form.long-text textarea,.pretty-form.long-text input[type=\"password\"],.commentreply textarea{background-color:#333;border:2px solid #000;color:#ccc ; padding:4px}";
			css += "input#title{height:5em}.spam, .reported{background:none;border:2px dotted; padding:4px}";
			css += ".spam{border-color:orangered}.reported{border-color:goldenrod} .organic-listing .linkcompressed{background:none}";
			css += ".nextprev img{ opacity:.7}.nextprev img:hover{opacity:.85}";
			css += "#search input[type=\"text\"]{background-color:#222;color:gray}";
			css += "#header-bottom-left .tabmenu .selected a{border-color:transparent;padding-bottom:0}#ad-frame{opacity:.8}";
			css += ".comment.unread{background-color:#4A473B}.raisedbox .flat-list a { background-color:#222;border-radius:2px}";
			css += ".raisedbox .flat-list a:hover{background-color:#369;color:#fff}.instructions{background:#fff;padding:10px}";
			css += "#siteTable .thing .title.loggedin,#siteTable .thing .title.loggedin.click,#siteTable .thing .title{color:#ddd}";
			css += "#siteTable .thing .title.loggedin:visited,#siteTable .thing .title:visited,#siteTable .thing .title.loggedin.click{color:gray}";
			css += ".markhelp.md tr td{background-color:#555}";
			css += ".infobar{color:#ccc}.markhelp.md tr td{background-color:#36c }";
			css += "form .usertext-body,.sitetable .moderator,.sitetable .admin,.sitetable .submitter,.sitetable friend,.moderator .traffic-table tbody tr:nth-child(even){background-color:transparent}";
			css += "a[rel=\"tag\"],.dsq-help{color:#8AD}";
			css += ".sitetable .thing .md, .parentComment .md,.post-body.entry-content,.dsq-auth-header{color:#ccc}.mail .havemail img,.mail .nohavemail img{visibility: hidden}";
			css += ".havemail{background:url('http://i.imgur.com/2Anoz.gif') no-repeat bottom left}.mail .nohavemail{background:url('http://imgur.com/6WV6Il.gif') no-repeat bottom left}";
			css += "#header-bottom-right{background-color:#bbb}";
			css += '.thing .expando-button{background-image:url(http://a.thumbs.redditmedia.com/JTs29zfSOzSMYO0B.png)!important;cursor:pointer}';
			css += '.thing .expando-button.image.collapsed,.thing .expando-button.image.collapsedExpando{background-position:0 0}';
			css += '.thing .expando-button.image.collapsed:hover,.thing .expando-button.image.collapsedExpando:hover{background-position:0 -24px}';
			css += '.thing .expando-button.image.expanded,.eb-se{margin-bottom:5px; background-position:0 -48px}';
			css += '.thing .expando-button.image.expanded:hover,.eb-seh{background-position:0 -72px}';
			css += '.thing .expando-button.image.gallery.collapsed,.thing .expando-button.image.gallery.collapsedExpando{background-position:0 -288px}';
			css += '.thing .expando-button.image.gallery.collapsed:hover,.thing .expando-button.image.gallery.collapsedExpando:hover{background-position:0 -312px}';
			css += '.thing .expando-button.image.gallery.expanded{margin-bottom:5px;background-position:0 -336px}';
			css += '.thing .expando-button.image.gallery.expanded:hover{background-position:0 -360px}';
			css += '.thing .expando-button.selftext.collapsed,.thing .expando-button.selftext.collapsedExpando{background-position:0 -96px}';
			css += '.thing .expando-button.selftext.collapsed:hover,.thing .expando-button.selftext.collapsedExpando:hover{background-position:0 -120px}';
			css += '.thing .expando-button.selftext.expanded,.eb-se{margin-bottom:5px; background-position: 0 -144px}';
			css += '.thing .expando-button.selftext.expanded:hover,.eb-seh{background-position:0 -168px}';
			css += '.thing .expando-button.video.collapsed,.thing .expando-button.video.collapsedExpando{background-position:0 -192px}';
			css += '.thing .expando-button.video.collapsed:hover,.thing .expando-button.video.collapsedExpando:hover{background-position:0 -216px}';
			css += '.thing .expando-button.video.expanded,.eb-se{margin-bottom:5px;background-position:0 -240px}';
			css += '.thing .expando-button.video.expanded:hover,.eb-seh{background-position:0 -264px}';
			css += '.thing .expando-button,.instructions,.linefield .delete-field,#pref-delete .delete-field,.usertext .usertext-body .md{background-color:transparent}';
			css += '.RESdupeimg{color:#eee;font-size:10px;}';
			css += '.RES-keyNav-activeElement,.RES-keyNav-activeElement .md{background-color:#666}.RES-keyNav-activeElement .title.loggedin:visited, .RES-keyNav-activeElement .title:visited{color:#dfdfdf}';
			css += 'a.link-button, a.text-button,.user .userkarma{color:#444}';
			css += '.drop-choices{background-color:#C2D2E2}';
			css += '.subreddit .usertext .md{background-color:#222;color:#ccc}';
			css += '.formtabs-content{border-top: 6px solid #222}';
			css += '#sr-autocomplete-area{z-index:1}';
			css += ".res-nightmode .content button{padding:3px 6px;background:#111;border:2px solid #666;border-radius:2px;color:#ddd}";
			css += '#newlink.submit textarea,#newlink.submit #url,#newlink.submit #sr-autocomplete{ background-color:#666;color:#ccc}';
			css += '.create-reddit{border:none}';
			css += '.create-reddit .title{background-color:#111;color:#8AD}';
			css += '.linefield .linefield-content{border-color:#111}';
			css += '.create-reddit #title,.create-reddit #name.text,.create-reddit #domain.text{ height:1.2em;background-color:#666;color:#ccc}';
			css += '.instructions .preftable th{color:#ccc}';
			css += '.NERdupe p.title:after,.savedComment{color:#ddd}';
			if ( this.options.commentBoxes.value ) {
				css += ".comments-page .comment{" +
				"	background-color:rgba(24,24,24,.3)!important;" +
				"}" +
				".comments-page .comment .comment{" +
				"	background-color:#222!important;" +
				"}" +
				".comments-page .comment .comment .comment{" +
				"	background-color:rgba(24,24,24,.3)!important;" +
				"}" +
				".comments-page .comment .comment .comment .comment{" +
				"	background-color:#222!important;" +
				"}" +
				".comments-page .comment .comment .comment .comment .comment{" +
				"	background-color:rgba(24,24,24,.3)!important;" +
				"}" +
				".comments-page .comment .comment .comment .comment .comment .comment{" +
				"	background-color:#222!important;" +
				"}" +
				".comments-page .comment .comment .comment .comment .comment .comment .comment{" +
				"	background-color:rgba(24,24,24,.3)!important;" +
				"}" +
				".comments-page .comment .comment .comment .comment .comment .comment .comment .comment{" +
				"	background-color:#222!important;" +
				"}" +
				".comments-page .comment .comment .comment .comment .comment .comment .comment .comment .comment{" +
				"	background-color:rgba(24,24,24,.3)!important;" +
				"}" +
				".comments-page .comment .comment .comment .comment .comment .comment .comment .comment .comment .comment{" +
				"	background-color:#222!important;" +
				"}";
				css += '.linklisting .thing{margin-bottom:10px;border-color:transparent}';
			}
			if ( this.options.continuity.value ) {
				css += '.comment .child {border-left: 1px dotted #555}';
			} else {
				css += '.comment .child{border-left:0 none}';
			}
			css += '.res-nightmode .content .roundfield,.traffic-table tr:nth-of-type(even){background-color:#181818}';
			css += '#authorInfoToolTip{background-color:#666;color:#ccc;border-color:#888}#authorInfoToolTip a{color:#8AD}';
			css += '.new-comment .usertext-body{background-color:#345;border:0 none;margin:-1px 0}';
			css += '.res-nightmode .new-comment .usertext-body .md p a{color:skyblue}';
			css += '.usertext-edit textarea,.RESDialogSmall{background-color:#666;color:#ccc}';
			css += '.RESDialogSmall h3{background-color:#222;color:#ccc}';
			css += '.token-input-list-facebook{background-color:#aaa}';
			RESUtils.addCSS( css );
		}
		// GM_addStyle(css);
	}
};
