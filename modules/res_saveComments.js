modules['saveComments'] = {
	moduleID: 'saveComments',
	moduleName: 'Save Comments',
	category: 'Comments',
	options: {
		// any configurable options you have go here...
		// options must have a type and a value.. 
		// valid types are: text, boolean (if boolean, value must be true or false)
		// for example:
	},
	description: 'Save Comments allows you to save comments, since reddit doesn\'t!',
	isEnabled: function() {
		return RESConsole.getModulePrefs(this.moduleID);
	},
	include: Array(
		/https?:\/\/([a-z]+).reddit.com\/[-\w\.\/]*/i
	),
	exclude: Array(
		/https?:\/\/([a-z]+).reddit.com\/[-\w\.\/]*\/submit\/?/i,
		/https?:\/\/([a-z]+).reddit.com\/submit\/?/i
	),
	isMatchURL: function() {
		return RESUtils.isMatchURL(this.moduleID);
	},
	beforeLoad: function() {
		if ((this.isEnabled()) && (this.isMatchURL())) {
			RESUtils.addCSS('.RES-save { cursor: help; }');
		}
	},
	go: function() {
		if ((this.isEnabled()) && (this.isMatchURL())) {
			var currURL = location.href;
			var commentsRegex = new RegExp(/https?:\/\/([a-z]+).reddit.com\/[-\w\.\/]*comments\/[-\w\.\/]*/i);
			var savedRegex = new RegExp(/https?:\/\/([a-z]+).reddit.com\/user\/([\w]+)\/saved\/?/i);
			if (commentsRegex.test(currURL)) {
				// load already-saved comments into memory...
				this.loadSavedComments();
				this.addSaveLinks();
				$('li.saveComments').live('click', function(e) {
					e.preventDefault();
					modules['saveComments'].saveComment(this, this.getAttribute('saveID'), this.getAttribute('saveLink'), this.getAttribute('saveUser'));
				});
				$('li.unsaveComments').live('click', function(e) {
					// e.preventDefault();
					var id = this.getAttribute('unsaveID');
					modules['saveComments'].unsaveComment(id, this);
				});
			} else if (savedRegex.test(currURL)) {
				// load already-saved comments into memory...
				this.loadSavedComments();
				this.addSavedCommentsTab();
				this.drawSavedComments();
				if (location.hash == '#comments') {
					this.showSavedTab('comments');
				}
			} else {
				this.addSavedCommentsTab();
			}
			// Watch for any future 'reply' forms, or stuff loaded in via "load more comments"...
			/*
			document.body.addEventListener(
				'DOMNodeInserted',
				function( event ) {
					if ((event.target.tagName == 'DIV') && (hasClass(event.target,'thing'))) {
						modules['saveComments'].addSaveLinks(event.target);
					}
				},
				false
			);
			*/
			RESUtils.watchForElement('newComments', modules['saveComments'].addSaveLinks);
		}
	},
	addSaveLinks: function(ele) {
		if (!ele) var ele = document.body;
		var allComments = ele.querySelectorAll('div.commentarea > div.sitetable > div.thing div.entry div.noncollapsed');
		RESUtils.forEachChunked(allComments, 15, 1000, function(comment, i, array) {
			modules['saveComments'].addSaveLinkToComment(comment);
		});
	},
	addSaveLinkToComment: function(commentObj) {
		var commentsUL = commentObj.querySelector('ul.flat-list');
		var permaLink = commentsUL.querySelector('li.first a.bylink');
		if (permaLink !== null) {
			// if there's no 'parent' link, then we don't want to put the save link before 'lastchild', we need to move it one to the left..
			// note that if the user is not logged in, there is no next link for first level comments... set to null!
			if (RESUtils.loggedInUser()) {
				if (permaLink.parentNode.nextSibling !== null) {
					if (typeof(permaLink.parentNode.nextSibling.firstChild.getAttribute) != 'undefined') {
						var nextLink = permaLink.parentNode.nextSibling.firstChild.getAttribute('href');
					} else {
						var nextLink = null;
					}
				} else {
					var nextLink = null;
				}
			} else {
				var nextLink = null;
			}
			var isTopLevel = ((nextLink == null) || (nextLink.indexOf('#') == -1));
			var userLink = commentObj.querySelector('a.author');
			if (userLink == null) {
				var saveUser = '[deleted]';
			} else {
				var saveUser = userLink.text;
			}
			var saveHREF = permaLink.getAttribute('href');
			var splitHref = saveHREF.split('/');
			var saveID = splitHref[splitHref.length-1];
			var saveLink = document.createElement('li');
			if ((typeof(this.storedComments) != 'undefined') && (typeof(this.storedComments[saveID]) != 'undefined')) {
				$(saveLink).html('<a class="RES-saved" href="/saved#comments">saved-RES</a>');
			} else {
				$(saveLink).html('<a class="RES-save" href="javascript:void(0);" title="Save using RES - which is local only, but preserves the full text in case someone edits/deletes it">save-RES</a>');
				saveLink.setAttribute('class',  'saveComments');
				saveLink.setAttribute('saveID',saveID);
				saveLink.setAttribute('saveLink',saveHREF);
				saveLink.setAttribute('saveUser',saveUser);
			}
			var whereToInsert = commentsUL.lastChild;
			if (isTopLevel) whereToInsert = whereToInsert.previousSibling;
			commentsUL.insertBefore(saveLink, whereToInsert);
		}
	},
	loadSavedComments: function() {
		// first, check if we're storing saved comments the old way (as an array)...
		var thisComments = RESStorage.getItem('RESmodules.saveComments.savedComments');
		if (thisComments == null) {
			this.storedComments = {};
		} else {
			this.storedComments = safeJSON.parse(thisComments, 'RESmodules.saveComments.savedComments');
			// console.log(this.storedComments);
			// old way of storing saved comments... convert...
			if (thisComments.slice(0,1) == '[') {
				var newFormat = {};
				for (var i in this.storedComments) {
					var urlSplit = this.storedComments[i].href.split('/');
					var thisID = urlSplit[urlSplit.length-1];
					newFormat[thisID] = this.storedComments[i];
				}
				this.storedComments = newFormat;
				RESStorage.setItem('RESmodules.saveComments.savedComments',JSON.stringify(newFormat));
			} 
		}
	},
	saveComment: function(obj, id, href, username, comment) {
		// reload saved comments in case they've been updated in other tabs (works in all but greasemonkey)
		this.loadSavedComments();
		// loop through comments and make sure we haven't already saved this one...
		if (typeof(this.storedComments[id]) != 'undefined') {
			alert('comment already saved!');
		} else {
			if (modules['keyboardNav'].isEnabled()) {
				// unfocus it before we save it so we don't save the keyboard annotations...
				modules['keyboardNav'].keyUnfocus(modules['keyboardNav'].keyboardLinks[modules['keyboardNav'].activeIndex]);
			}
			var comment = obj.parentNode.parentNode.querySelector('div.usertext-body > div.md');
			if (comment !== null) {
				commentHTML = comment.innerHTML;
				var savedComment = {
					href: href,
					username: username,
					comment: commentHTML,
					timeSaved: Date()
				};
				this.storedComments[id] = savedComment;
				var unsaveObj = document.createElement('li');
				$(unsaveObj).html('<a href="javascript:void(0);">unsave-RES</a>');
				unsaveObj.setAttribute('unsaveID',id);
				unsaveObj.setAttribute('unsaveLink',href);
				unsaveObj.setAttribute('class','unsaveComments');

				obj.parentNode.replaceChild(unsaveObj, obj);
			}
			if (modules['keyboardNav'].isEnabled()) {
				modules['keyboardNav'].keyFocus(modules['keyboardNav'].keyboardLinks[modules['keyboardNav'].activeIndex]);
			}
			if (RESUtils.proEnabled()) {
				// add sync adds/deletes for RES Pro.
				if (typeof(this.storedComments.RESPro_add) == 'undefined') {
					this.storedComments.RESPro_add = {}
				}
				if (typeof(this.storedComments.RESPro_delete) == 'undefined') {
					this.storedComments.RESPro_delete = {}
				}
				// add this ID next time we sync...
				this.storedComments.RESPro_add[id] = true;
				// make sure we don't run a delete on this ID next time we sync...
				if (typeof(this.storedComments.RESPro_delete[id]) != 'undefined') delete this.storedComments.RESPro_delete[id];
			}
			RESStorage.setItem('RESmodules.saveComments.savedComments', JSON.stringify(this.storedComments));
			if (RESUtils.proEnabled()) {
				modules['RESPro'].authenticate(function() {
					modules['RESPro'].saveModuleData('saveComments');
				});
			}
		}
	},
	addSavedCommentsTab: function() {
		var mainmenuUL = document.body.querySelector('#header-bottom-left ul.tabmenu');
		if (mainmenuUL) {
			var savedRegex = new RegExp(/https?:\/\/([a-z]+).reddit.com\/user\/[\w]+\/saved\/?/i);
			var menuItems = mainmenuUL.querySelectorAll('li');
			var thisUser = RESUtils.loggedInUser() || '';
			for (var i=0, len=menuItems.length;i<len;i++) {
				var savedLink = menuItems[i].querySelector('a');
				if ((menuItems[i].classList.contains('selected')) && (savedRegex.test(savedLink.href))) {
					menuItems[i].addEventListener('click', function(e) {
						e.preventDefault();
						modules['saveComments'].showSavedTab('links');
					}, true);
				}

				if (savedRegex.test(savedLink.href)) {
					$(menuItems[i]).attr('id', 'savedLinksTab');
					savedLink.textContent = 'saved links';
				}
			}

			var savedCommentsTab = $('<li id="savedCommentsTab">')
				.html('<a href="javascript:void(0);">saved comments</a>')
				.insertAfter('#savedLinksTab');
			if (savedRegex.test(location.href)) {
				$('#savedCommentsTab').click(function(e) {
					e.preventDefault();
					modules['saveComments'].showSavedTab('comments');
				});
			} else {
				$('#savedCommentsTab').click(function(e) {
					e.preventDefault();
					location.href = location.protocol + '//www.reddit.com/saved/#comments';
				});
			}
		}
	},
	showSavedTab: function(tab) {
		switch(tab) {
			case 'links':
				location.hash = 'links';
				this.savedLinksContent.style.display = 'block';
				this.savedCommentsContent.style.display = 'none';
				$('#savedLinksTab').addClass('selected');
				$('#savedCommentsTab').removeClass('selected');
				break;
			case 'comments':
				location.hash = 'comments';
				this.savedLinksContent.style.display = 'none';
				this.savedCommentsContent.style.display = 'block';
				$('#savedLinksTab').removeClass('selected');
				$('#savedCommentsTab').addClass('selected');
				break;
		}
	},
	drawSavedComments: function() {
		RESUtils.addCSS('.savedComment { padding: 5px; font-size: 12px; margin-bottom: 20px; margin-left: 40px; margin-right: 10px; border: 1px solid #CCC; border-radius: 10px; width: auto; } ');
		RESUtils.addCSS('.savedCommentHeader { margin-bottom: 8px; }');
		RESUtils.addCSS('.savedCommentBody { margin-bottom: 8px; }');
		RESUtils.addCSS('#savedLinksList { margin-top: 10px; }');
		// css += '.savedCommentFooter {  }';
		this.savedLinksContent = document.body.querySelector('BODY > div.content');
		this.savedCommentsContent = createElementWithID('div', 'savedLinksList');
		this.savedCommentsContent.style.display = 'none';
		this.savedCommentsContent.setAttribute('class','sitetable linklisting');
		for (var i in this.storedComments) {
			if ((i != 'RESPro_add') && (i != 'RESPro_delete')) {
				var clearLeft = document.createElement('div');
				clearLeft.setAttribute('class','clearleft');
				var thisComment = document.createElement('div');
				thisComment.classList.add('savedComment');
				thisComment.classList.add('entry');
				// this is all saved locally, but just for safety, we'll clean out any script tags and whatnot...
				var cleanHTML = '<div class="savedCommentHeader">Comment by user: ' + escapeHTML(this.storedComments[i].username) + ' saved on ' + escapeHTML(this.storedComments[i].timeSaved) + '</div>';
				cleanHTML += '<div class="savedCommentBody">' + this.storedComments[i].comment.replace(/<script(.|\s)*?\/script>/g, '') + '</div>';
				cleanHTML += '<div class="savedCommentFooter"><ul class="flat-list buttons"><li><a class="unsaveComment" href="javascript:void(0);">unsave-RES</a></li><li><a href="' + escapeHTML(this.storedComments[i].href) + '">view original</a></li></ul></div>'
				$(thisComment).html(cleanHTML);
				var unsaveLink = thisComment.querySelector('.unsaveComment');
				unsaveLink.setAttribute('unsaveID', i);
				unsaveLink.setAttribute('unsaveLink', this.storedComments[i].href);
				unsaveLink.addEventListener('click', function(e) {
					e.preventDefault();
					modules['saveComments'].unsaveComment(this.getAttribute('unsaveID'));
				}, true);
				this.savedCommentsContent.appendChild(thisComment);
				this.savedCommentsContent.appendChild(clearLeft);
			}
		}
		if (this.storedComments.length == 0) {
			$(this.savedCommentsContent).html('<li>You have not yet saved any comments.</li>');
		}
		insertAfter(this.savedLinksContent, this.savedCommentsContent);
	},
	unsaveComment: function(id, unsaveLink) {
		/*
		var newStoredComments = [];
		for (var i=0, len=this.storedComments.length;i<len;i++) {
			if (this.storedComments[i].href != href) {
				newStoredComments.push(this.storedComments[i]);
			} else {
				// console.log('found match. deleted comment');
			}
		}
		this.storedComments = newStoredComments;
		*/
		delete this.storedComments[id];
		if (RESUtils.proEnabled()) {
			// add sync adds/deletes for RES Pro.
			if (typeof(this.storedComments.RESPro_add) == 'undefined') {
				this.storedComments.RESPro_add = {}
			}
			if (typeof(this.storedComments.RESPro_delete) == 'undefined') {
				this.storedComments.RESPro_delete = {}
			}
			// delete this ID next time we sync...
			this.storedComments.RESPro_delete[id] = true;
			// make sure we don't run an add on this ID next time we sync...
			if (typeof(this.storedComments.RESPro_add[id]) != 'undefined') delete this.storedComments.RESPro_add[id];
		}
		RESStorage.setItem('RESmodules.saveComments.savedComments', JSON.stringify(this.storedComments));
		if (RESUtils.proEnabled()) {
			modules['RESPro'].authenticate(function() {
				modules['RESPro'].saveModuleData('saveComments');
			});
		}
		if (typeof(this.savedCommentsContent) != 'undefined') {
			this.savedCommentsContent.parentNode.removeChild(this.savedCommentsContent);
			this.drawSavedComments();
			this.showSavedTab('comments');
		} else {
			var commentObj = unsaveLink.parentNode.parentNode;
			unsaveLink.parentNode.removeChild(unsaveLink);
			this.addSaveLinkToComment(commentObj);
		}
	}
};
