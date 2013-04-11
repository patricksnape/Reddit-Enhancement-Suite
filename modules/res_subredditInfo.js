modules['subredditInfo'] = {
	moduleID: 'subredditInfo',
	moduleName: 'Subreddit Info',
	category: 'UI',
	options: {
		hoverDelay: {
			type: 'text',
			value: 800,
			description: 'Delay, in milliseconds, before hover tooltip loads. Default is 800.'
		},
		fadeDelay: {
			type: 'text',
			value: 200,
			description: 'Delay, in milliseconds, before hover tooltip fades away. Default is 200.'
		},
		fadeSpeed: {
 			type: 'text',
			value: 0.3,
 			description: 'Fade animation\'s speed. Default is 0.3, the range is 0-1. Setting the speed to 1 will disable the animation.'
 		},
		USDateFormat: {
			type: 'boolean',
			value: false,
			description: 'Show date (subreddit created...) in US format (i.e. 08-31-2010)'
		}
	},
	description: 'Adds a hover tooltip to subreddits',
	isEnabled: function() {
		return RESConsole.getModulePrefs(this.moduleID);
	},
	include: Array(
		/https?:\/\/([a-z]+).reddit.com\/[\?]*/i
	),
	isMatchURL: function() {
		return RESUtils.isMatchURL(this.moduleID);
	},
	beforeLoad: function() {
		if ((this.isEnabled()) && (this.isMatchURL())) {
			var css = '';
			css += '#subredditInfoToolTip { display: none; position: absolute; width: 450px; z-index: 10001; }';
			css += '#subredditInfoToolTip:before { content: ""; position: absolute; top: 10px; left: -26px; border-style: solid; border-width: 10px 29px 10px 0; border-color: transparent #c7c7c7; display: block; width: 0; z-index: 1; }'
			css += '#subredditInfoToolTip:after { content: ""; position: absolute; top: 10px; left: -24px; border-style: solid; border-width: 10px 29px 10px 0; border-color: transparent #f0f3fc; display: block; width: 0; z-index: 1; }'
			css += '#subredditInfoToolTip.right:before { content: ""; position: absolute; top: 10px; right: -26px; left: auto; border-style: solid; border-width: 10px 0 10px 29px; border-color: transparent #c7c7c7; display: block; width: 0; z-index: 1; }'
			css += '#subredditInfoToolTip.right:after { content: ""; position: absolute; top: 10px; right: -24px; left: auto; border-style: solid; border-width: 10px 0 10px 29px; border-color: transparent #f0f3fc; display: block; width: 0; z-index: 1; }'
			css += '#subredditInfoToolTip .subredditLabel { float: left; width: 140px; margin-bottom: 12px; }';
			css += '#subredditInfoToolTip .subredditDetail { float: left; width: 240px; margin-bottom: 12px; }';
			css += '#subredditInfoToolTip .blueButton { float: right; margin-left: 8px; }';
			css += '#subredditInfoToolTip .redButton { float: right; margin-left: 8px; }';
			RESUtils.addCSS(css);
		}
	},
	go: function() {
		if ((this.isEnabled()) && (this.isMatchURL())) {
			// do stuff now!
			// this is where your code goes...

			// create a cache for subreddit data so we only load it once even if the hover is triggered many times
			this.subredditInfoCache = [];

			// create the tooltip...
			this.subredditInfoToolTip = createElementWithID('div', 'subredditInfoToolTip', 'RESDialogSmall');
			this.subredditInfoToolTipHeader = document.createElement('h3');
			this.subredditInfoToolTip.appendChild(this.subredditInfoToolTipHeader);
			this.subredditInfoToolTipCloseButton = createElementWithID('div', 'subredditInfoToolTipClose', 'RESCloseButton');
			this.subredditInfoToolTipCloseButton.textContent = 'X';
			this.subredditInfoToolTip.appendChild(this.subredditInfoToolTipCloseButton);
			this.subredditInfoToolTipCloseButton.addEventListener('click', function(e) {
				if (typeof(modules['subredditInfo'].hideTimer) != 'undefined') {
					clearTimeout(modules['subredditInfo'].hideTimer);
				}
				modules['subredditInfo'].hideSubredditInfo();
			}, false);
			this.subredditInfoToolTipContents = createElementWithID('div','subredditInfoToolTipContents', 'RESDialogContents');
			this.subredditInfoToolTip.appendChild(this.subredditInfoToolTipContents);
			this.subredditInfoToolTip.addEventListener('mouseover', function(e) {
				if (typeof(modules['subredditInfo'].hideTimer) != 'undefined') {
					clearTimeout(modules['subredditInfo'].hideTimer);
				}
			}, false);
			this.subredditInfoToolTip.addEventListener('mouseout', function(e) {
				if (e.target.getAttribute('class') != 'hoverSubreddit') {
					modules['subredditInfo'].hideTimer = setTimeout(function() {
						modules['subredditInfo'].hideSubredditInfo();
					}, modules['subredditInfo'].options.fadeDelay.value);
				}
			}, false);
			document.body.appendChild(this.subredditInfoToolTip);

			// get subreddit links and add event listeners...
			this.addListeners();
			RESUtils.watchForElement('siteTable', modules['subredditInfo'].addListeners);
		}
	},
	addListeners: function(ele) {
		var ele = ele || document.body;
		var subredditLinks = document.body.querySelectorAll('.listing-page a.subreddit');
		if (subredditLinks) {
				var len=subredditLinks.length;
				for (var i=0; i<len; i++) {
					var thisSRLink = subredditLinks[i];
					thisSRLink.addEventListener('mouseover', function(e) {
						modules['subredditInfo'].showTimer = setTimeout(function() {
							modules['subredditInfo'].showSubredditInfo(e.target);
						}, modules['subredditInfo'].options.hoverDelay.value);
					}, false);
					thisSRLink.addEventListener('mouseout', function(e) {
						clearTimeout(modules['subredditInfo'].showTimer);
					}, false);
					thisSRLink.addEventListener('click', function(e) {
						clearTimeout(modules['subredditInfo'].showTimer);
					}, false);
				}
			}
	},
	showSubredditInfo: function(obj) {
		var thisXY=RESUtils.getXYpos(obj);
		var thisSubreddit = obj.textContent;
		var thisWidth = $(obj).width();
		$(this.subredditInfoToolTipHeader).html('<a href="/r/'+escapeHTML(thisSubreddit)+'">/r/' + escapeHTML(thisSubreddit) + '</a>');
		$(this.subredditInfoToolTipContents).html('<a class="hoverSubreddit" href="/user/'+escapeHTML(thisSubreddit)+'">'+escapeHTML(thisSubreddit)+'</a>:<br><img src="'+RESConsole.loader+'"> loading...');
		if((window.innerWidth-thisXY.x)<=450){
			// tooltip would go off right edge - reverse it.
			this.subredditInfoToolTip.classList.add('right');
			var tooltipWidth = $(this.subredditInfoToolTip).width();
			this.subredditInfoToolTip.setAttribute('style', 'top: ' + (thisXY.y - 14) + 'px; left: ' + (thisXY.x - tooltipWidth - 30) + 'px;');
		} else {
			this.subredditInfoToolTip.classList.remove('right');
			this.subredditInfoToolTip.setAttribute('style', 'top: ' + (thisXY.y - 14) + 'px; left: ' + (thisXY.x + thisWidth + 25) + 'px;');
		}
		if(this.options.fadeSpeed.value < 0 || this.options.fadeSpeed.value > 1 || isNaN(this.options.fadeSpeed.value)) {
			this.options.fadeSpeed.value = 0.3;
		}
		RESUtils.fadeElementIn(this.subredditInfoToolTip, this.options.fadeSpeed.value);
		setTimeout(function() {
			if (!RESUtils.elementUnderMouse(modules['subredditInfo'].subredditInfoToolTip) && !RESUtils.elementUnderMouse(obj)) {
				modules['subredditInfo'].hideSubredditInfo();
			}
		}, 1000);

		obj.addEventListener('mouseout', modules['subredditInfo'].delayedHideSubredditInfo);

		if (typeof(this.subredditInfoCache[thisSubreddit]) != 'undefined') {
			this.writeSubredditInfo(this.subredditInfoCache[thisSubreddit]);
		} else {
			GM_xmlhttpRequest({
				method:	"GET",
				url:	location.protocol + "//"+location.hostname+"/r/" + thisSubreddit + "/about.json?app=res",
				onload:	function(response) {
					var thisResponse = JSON.parse(response.responseText);
					modules['subredditInfo'].subredditInfoCache[thisSubreddit] = thisResponse;
					modules['subredditInfo'].writeSubredditInfo(thisResponse);
				}
			});
		}
	},
	delayedHideSubredditInfo: function(e) {
		modules['subredditInfo'].hideTimer = setTimeout(function() {
			e.target.removeEventListener('mouseout', modules['subredditInfo'].delayedHideSubredditInfo);
			modules['subredditInfo'].hideSubredditInfo();
		}, modules['subredditInfo'].options.fadeDelay.value);
	},
	writeSubredditInfo: function(jsonData) {
		var utctime = jsonData.data.created_utc;
		var d = new Date(utctime * 1000);
		var isOver18;
		jsonData.data.over18 === true ? isOver18 = 'Yes' : isOver18 = 'No';
		var srHTML = '<div class="subredditLabel">Subreddit created:</div> <div class="subredditDetail">' + RESUtils.niceDate(d, this.options.USDateFormat.value) + ' (' + RESUtils.niceDateDiff(d) + ')</div>';
		srHTML += '<div class="subredditLabel">Subscribers:</div> <div class="subredditDetail">' + RESUtils.addCommas(jsonData.data.subscribers) + '</div>';
		srHTML += '<div class="subredditLabel">Title:</div> <div class="subredditDetail">' + escapeHTML(jsonData.data.title) + '</div>';
		srHTML += '<div class="subredditLabel">Over 18:</div> <div class="subredditDetail">' + escapeHTML(isOver18) + '</div>';
		// srHTML += '<div class="subredditLabel">Description:</div> <div class="subredditDetail">' + jsonData.data.description + '</div>';
		srHTML += '<div class="clear"></div><div id="subTooltipButtons" class="bottomButtons">';
		srHTML += '<div class="clear"></div></div>'; // closes bottomButtons div
		$(this.subredditInfoToolTipContents).html(srHTML);
		// bottom buttons will include: +filter +shortcut +dashboard (maybe sub/unsub too?)
		if (modules['subredditManager'].isEnabled()) {
			var theSC = document.createElement('span');
			theSC.setAttribute('style','display: inline-block !important;');
			theSC.setAttribute('class','REStoggle RESshortcut RESshortcutside');
			theSC.setAttribute('subreddit',jsonData.data.display_name.toLowerCase());
			var idx = -1;
			for (var i=0, len=modules['subredditManager'].mySubredditShortcuts.length; i<len; i++) {
				if (modules['subredditManager'].mySubredditShortcuts[i].subreddit.toLowerCase() == jsonData.data.display_name.toLowerCase()) {
					idx=i;
					break;
				}
			}
			if (idx != -1) {
				theSC.textContent = '-shortcut';
				theSC.setAttribute('title','Remove this subreddit from your shortcut bar');
				theSC.classList.add('remove');
			} else {
				theSC.textContent = '+shortcut';
				theSC.setAttribute('title','Add this subreddit to your shortcut bar');
			}
			theSC.addEventListener('click', modules['subredditManager'].toggleSubredditShortcut, false);
			// subButton.parentNode.insertBefore(theSC, subButton);
			// theSubredditLink.appendChild(theSC);
			$('#subTooltipButtons').append(theSC);
		}
		if (modules['dashboard'].isEnabled()) {
			var dashboardToggle = document.createElement('span');
			dashboardToggle.setAttribute('class','RESDashboardToggle');
			dashboardToggle.setAttribute('subreddit',jsonData.data.display_name.toLowerCase());
			var exists=false;
			for (var i=0, len=modules['dashboard'].widgets.length; i<len; i++) {
				if ((modules['dashboard'].widgets[i]) && (modules['dashboard'].widgets[i].basePath.toLowerCase() == '/r/'+jsonData.data.display_name.toLowerCase())) {
					exists=true;
					break;
				}
			}
			if (exists) {
				dashboardToggle.textContent = '-dashboard';
				dashboardToggle.setAttribute('title','Remove this subreddit from your dashboard');
				dashboardToggle.classList.add('remove');
			} else {
				dashboardToggle.textContent = '+dashboard';
				dashboardToggle.setAttribute('title','Add this subreddit to your dashboard');
			}
			dashboardToggle.addEventListener('click', modules['dashboard'].toggleDashboard, false);
			$('#subTooltipButtons').append(dashboardToggle);
		}
		if (modules['filteReddit'].isEnabled()) {
			var filterToggle = document.createElement('span');
			filterToggle.setAttribute('class','RESFilterToggle');
			filterToggle.setAttribute('subreddit',jsonData.data.display_name.toLowerCase());
			var exists=false;
			var filteredReddits = modules['filteReddit'].options.subreddits.value;
			for (var i=0, len=filteredReddits.length; i<len; i++) {
				if ((filteredReddits[i]) && (filteredReddits[i][0].toLowerCase() == jsonData.data.display_name.toLowerCase())) {
					exists=true;
					break;
				}
			}
			if (exists) {
				filterToggle.textContent = '-filter';
				filterToggle.setAttribute('title','Stop filtering from /r/all and /domain/*');
				filterToggle.classList.add('remove');
			} else {
				filterToggle.textContent = '+filter';
				filterToggle.setAttribute('title','Filter this subreddit from /r/all and /domain/*');
			}
			filterToggle.addEventListener('click', modules['filteReddit'].toggleFilter, false);
			$('#subTooltipButtons').append(filterToggle);
		}
	},
	hideSubredditInfo: function(obj) {
		if(this.options.fadeSpeed.value < 0 || this.options.fadeSpeed.value > 1 || isNaN(this.options.fadeSpeed.value)) {
			this.options.fadeSpeed.value = 0.3;
		}
		RESUtils.fadeElementOut(this.subredditInfoToolTip, this.options.fadeSpeed.value);
	}
};
