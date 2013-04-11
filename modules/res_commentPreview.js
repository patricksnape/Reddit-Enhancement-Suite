modules['commentPreview'] = {
	moduleID: 'commentPreview',
	moduleName: 'Live Comment Preview',
	category: 'Comments',
	options: {
		// any configurable options you have go here...
		commentingAs: {
			type: 'boolean',
			value: true,
			description: 'Shows your currently logged in username to avoid posting from the wrong account.'
		},
		enableBigEditor: {
			type: 'boolean',
			value: true,
			description: 'Enable the 2 column editor.'
		},
		subredditAutocomplete: {
			type: 'boolean',
			value: true,
			description: 'Show subreddit autocomplete tool when typing in posts, comments and replies'
		},
		keyboardShortcuts: {
			type: 'boolean',
			value: true,
			description: 'Use keyboard shortcuts to apply styles to selected text'
		},
		macros: {
			type: 'table',
			addRowText: '+add shortcut',
			fields: [
				{ name: 'label', type: 'text' },
				{ name: 'text', type: 'textarea' }
			],
			value: [
			],
			description: "Add buttons to insert frequently used snippets of text."
		}
	},
	description: 'Provides a live preview of comments, as well as shortcuts for easier markdown.',
	isEnabled: function() {
		return RESConsole.getModulePrefs(this.moduleID);
	},
	include: Array(
		/https?:\/\/([a-z]+).reddit.com\/[-\w\.\/]+\/comments\/?[-\w\.]*/i,
		/https?:\/\/([a-z]+).reddit.com\/comments\/[-\w\.]+/i,
		/https?:\/\/([a-z]+).reddit.com\/message\/[-\w\.]*\/?[-\w\.]*/i,
		/https?:\/\/([a-z]+).reddit.com\/r\/[-\w\.]*\/submit\/?/i,
		/https?:\/\/([a-z]+).reddit.com\/user\/[-\w\.\/]*\/?/i,
		/https?:\/\/([a-z]+).reddit.com\/submit\/?/i
	),
	isMatchURL: function() {
		return RESUtils.isMatchURL(this.moduleID);
	},
	beforeLoad: function() {
		if ((this.isEnabled()) && (this.isMatchURL())) {
			RESUtils.addCSS('.markdownEditor { white-space: nowrap;  }');
			RESUtils.addCSS('.markdownEditor a { margin-right: 8px; text-decoration: none; font-size: 11px; }');
			RESUtils.addCSS('.selectedItem { color: #fff; background-color: #5f99cf; }');
			RESUtils.addCSS('.RESDialogSmall.livePreview { position: relative; width: auto; margin-bottom: 15px; }');
			RESUtils.addCSS('.RESDialogSmall.livePreview .RESDialogContents h3 { font-weight: bold; }');
			RESUtils.addCSS('.RESMacroDropdownTitle, .RESMacroDropdownTitleOverlay { cursor: pointer; display: inline-block; font-size: 11px; text-decoration: underline; color: gray; padding-left: 2px; padding-right: 21px; background-image: url(http://www.redditstatic.com/droparrowgray.gif); background-position: 100% 50%; background-repeat: no-repeat; }');
			RESUtils.addCSS('.RESMacroDropdownTitleOverlay { cursor: pointer; }');
			RESUtils.addCSS('#RESMacroDropdownContainer { display: none; position: absolute; }');
			RESUtils.addCSS('#RESMacroDropdown { display: none; position: absolute; z-index: 2001; }');
			RESUtils.addCSS('#RESMacroDropdownList { margin-top: 0; width: auto; max-width: 300px; }');
			RESUtils.addCSS('#RESMacroDropdown li { padding-right: 10px; height: 25px; line-height: 24px; }');

			if (this.options.enableBigEditor.value) {
				RESUtils.addCSS('.RESBigEditorPop {float: right;}');
				RESUtils.addCSS('.RESBigEditorPop.blueButton { margin: 0 0 0 12px; }');

				RESUtils.addCSS('#BigEditor {position: relative; z-index: 2000;}');
				RESUtils.addCSS('.BELeft, .BERight {position: fixed; top: 0; bottom: 0; }');
				RESUtils.addCSS('#BigEditor .RESDialogContents {position: fixed; top: 0; bottom: 0; }');
				RESUtils.addCSS('.BELeft  {left: 0; right: 50%;}');
				RESUtils.addCSS('.BERight  {left: 50%; right: 0;}');
				RESUtils.addCSS('#BigEditor > div {margin: 1em;}');
				RESUtils.addCSS('.BELeft .RESDialogContents {padding-bottom: 7.5em; left: 0%; right: 50%; margin: 0em 1em 0em 1em;}');
				RESUtils.addCSS('.BERight .RESDialogContents {overflow: auto; padding: 12px; margin: 4em 1em 1em 0em;}');
				RESUtils.addCSS('#BigText {resize: none; width: 100%; height: 100%;}');
				RESUtils.addCSS('.BEFoot button {margin-top: 0.5em;}');
				RESUtils.addCSS('.BEFoot .errorList {margin-left: 1em;}');
				RESUtils.addCSS('.BESideHide {display: none;}');
			}
		}
	},
	go: function() {
		if ((this.isEnabled()) && (this.isMatchURL())) {

			if (this.options.subredditAutocomplete.value) this.subredditAutocomplete();

			this.converter = window.SnuOwnd.getParser();

			if (this.options.enableBigEditor.value) {
				// Install the 2 column editor
				modules['commentPreview'].addBigEditor();
			}
			// Bootstrap with the top-level comment always in the page, and editors for your existing comments.
			modules['commentPreview'].wireupEditors(document.body);
			
			// Add "view source" buttons
			modules['commentPreview'].wireupViewSourceButtons(document.body);

			// Wireup reply editors
			RESUtils.watchForElement('newCommentsForms', modules['commentPreview'].wireupEditors);
			// Wireup edit editors (usertext-edit already exists in the page)
			RESUtils.watchForElement('newComments', modules['commentPreview'].wireupEditors);
			RESUtils.watchForElement('newComments', modules['commentPreview'].wireupViewSourceButtons);
			
			$('.entry .flat-list.buttons li.viewSource').live('click', modules['commentPreview'].viewSource);

		}
	},
	wireupEditors: function (ele) {
		if (ele) {
			$(ele).find('div.usertext-edit').each(function() {
				var preview = modules['commentPreview'].addPreviewToParent(this);
				modules['commentPreview'].addMarkdownEditorToForm(this, preview);
			});
		}
		
	},
	addBigEditor: function() {
		var editor = $('<div id="BigEditor">')
		editor.hide();
		var left = $('<div class="BELeft RESDialogSmall"><h3>Editor <span id="BigCounter" class="RESCharCounter" title="character limit: 10,000">0/10000</span></h3></div>');
		var contents = $('<div class="RESDialogContents"><textarea id="BigText" class=""></textarea></div>');
		var foot = $('<div class="BEFoot">');
		foot.append($('<button style="float:left;">save</button>').bind('click', function() {
			var len = $('#BigText').val().length;
			if (len > 10000) {
				$('#BigEditor .errorList .error').hide().filter('.TOO_LONG').show();
			} else if (len == 0) {
				$('#BigEditor .errorList .error').hide().filter('.NO_TEXT').show();
			} else if (modules.commentPreview.activeTextArea) {
				modules.commentPreview.activeTextArea.submit();
				modules.commentPreview.activeTextArea.parents('.usertext-edit:first').find('.livePreview .md').html('');
				modules.commentPreview.closeBigEditor();
			} else {
				$('#BigEditor .errorList .error').hide().filter('.NO_TARGET').show();
			}

		}));
		foot.append($('<button style="float:left;">close</button>').bind('click', modules.commentPreview.closeBigEditor));

		foot.append($('<span class="errorList">\
			<span style="display: none;" class="error NO_TEXT">we need something here</span>\
			<span style="display: none;" class="error TOO_LONG">this is too long (max: 10000)</span>\
			<span style="display: none;" class="error NO_TARGET">there is no associated textarea</span>\
			</span>'));
		
		contents.append(foot);
		left.append(contents);

		var right = $('<div class="BERight RESDialogSmall"><h3>Preview</h3><div class="RESCloseButton">X</div>\
			<div class="RESDialogContents"><div id="BigPreview" class=" md"></div></div></div>');
		editor.append(left).append(right);
		
		$(document.body).append(editor);
		$('.BERight .RESCloseButton').bind("click", modules.commentPreview.closeBigEditor);
		$('.RESBigEditorPop').live('click', modules.commentPreview.showBigEditor);
		$('#BigText').bind('input', function() {
			RESUtils.debounce('refreshBigPreview', 250, function() {
				var text = $('#BigText').val();
				var len = text.length;

				$('#BigCounter').text(len+'/10000').toggleClass('tooLong', len > 10000);
				var html = modules.commentPreview.converter.render(text);
				$('#BigPreview').html(html);
				if (modules.commentPreview.activeTextArea) {
					modules.commentPreview.activeTextArea.val(text);
					modules.commentPreview.activeTextArea.parents('.usertext-edit:first').find('.livePreview .md').html(html);
				}
			});
		});
		modules.commentPreview.addMarkdownEditorToForm($('#BigText')[0].parentElement, $('#BigPreview')[0]);
	},
	showBigEditor: function(e) {
		e.preventDefault();
		modules.commentPreview.closeBigEditor(true);
		$('.side').addClass('BESideHide');
		$('body').addClass('RESScrollLock');
		RESUtils.fadeElementIn(document.getElementById('BigEditor'), 0.3);
		var baseText = $(this).parents('.usertext-edit:first').find('textarea');

		var markdown = baseText.val();
		$('#BigText').val(markdown);
		$('#BigCounter').text(markdown.length+'/10000').toggleClass('tooLong', markdown.length>10000);
		$('#BigPreview').html(modules.commentPreview.converter.render(markdown));
		modules.commentPreview.activeTextArea = baseText;
	},
	closeBigEditor: function(quick) {
		if (quick === true) {
			$('#BigEditor').hide();
		} else {
			RESUtils.fadeElementOut(document.getElementById('BigEditor'), 0.3);
		}
		$('.side').removeClass('BESideHide');
		$('body').removeClass('RESScrollLock');

		modules.commentPreview.activeTextArea = null;
	},
	wireupViewSourceButtons: function(ele) {
		if (ele == null) ele = document;
		if ((RESUtils.pageType() == 'comments') || (RESUtils.pageType() == 'inbox'))  {
			var menus = ele.querySelectorAll('.entry .flat-list.buttons li:first-child');
			RESUtils.forEachChunked(menus, 15, 1000, function(menu, i, array) {
				var viewSource = document.createElement('li');
				$(viewSource).addClass('viewSource').html('<a href="javascript:void(0)">source</a>');
				insertAfter(menu.nextSibling !== null?menu.nextSibling:menu, viewSource);
			});			
		}
	},
	//Find any fieldsets with a class of liveComment as children of this element and remove them.
	removeExistingPreview: function( parent ) {
		var previews = parent.querySelectorAll('div.livePreview');
		
		for (var i = 0, preview = null; preview = previews[i]; i++)
		{		
			preview.parentNode.removeChild( preview );
			break;
		}
	},
	removeExistingEditor: function( parent ) {
		// var divs = parent.getElementsByTagName('div');
		var divs = parent.querySelectorAll('.markdownEditor, .commentingAs, .RESBigEditorPop');
		
		for (var i = 0, div = null; div = divs[i]; i++)
		{
			div.parentNode.removeChild( div );
		}
	},
	addPreviewToParent: function( parent ) {
		// remove any existing preview, because reddit's clone will copy the other one in here...
		modules['commentPreview'].removeExistingPreview( parent );		
		// also remove the existing editor, same reason.
		modules['commentPreview'].removeExistingEditor( parent );

		/*
		var set=document.createElement('fieldset');
		set.setAttribute('class', 'liveComment');

		var legend=document.createElement('legend');
		legend.textContent='Live Preview';

		var preview=document.createElement('div');
		preview.setAttribute('class', 'md');

		set.appendChild(legend);
		set.appendChild(preview);
		*/
		var previewContainer = document.createElement('div');
		previewContainer.setAttribute('class','RESDialogSmall livePreview');
		$(previewContainer).html('<h3>Live Preview</h3>');
		
		var preview = document.createElement('div');
		preview.setAttribute('class','md RESDialogContents');
		previewContainer.appendChild(preview);

		// modification: hide this thing until someone types...
		preview.parentNode.style.display = 'none';
		
		// parent.appendChild(set);
		parent.appendChild(previewContainer);

		var textAreas = parent.getElementsByTagName('textarea');
		
		if ( textAreas[0] )
		{		
			var targetTextArea = textAreas[0];
		
			targetTextArea.addEventListener('input', function(e) {
				modules['commentPreview'].refreshPreview(preview, targetTextArea);
			}, false);			
			if (modules['commentPreview'].options.keyboardShortcuts.value) {
				targetTextArea.addEventListener(
					'keydown',
					function(e)
					{
						if ((e.ctrlKey || e.metaKey) && (!e.shiftKey) && (!e.altKey)) {
							/*
								text = text.replace(/(?:^|[^\S])(~~)((?:.+)(?:(?:\n.+)+)?)\1/g,
									" <del>$2</del>");
									
								// <strong> must go first:
								// text = text.replace(/(\*\*|__)(?=\S)([^\r]*?\S[*_]*)\1/g,
								// text = text.replace(/(^|[^\S])(\*\*|__)(.+)\n?(.*)\2/g,
								// text = text.replace(/(\*\*|__)((?:.+)(?:(?:\n.+)+)?)\1/g,
								text = text.replace(/(\*\*)((?:.+?)(?:(?:\n.*)+)?)\1/g,
									"<strong>$2</strong>");

								// text = text.replace(/(\*|_)(?=\S)([^\r]*?\S)\1/g,
								// (^|[^\S])(\*|_)([^*]+)(([\n{1}].+)+)?\2
								// (^|[^\S])(\*|_)[^*]+\2
								// text = text.replace(/(^|[^\S])(\*|_)(.+)\n?(.*)\2/g,
								text = text.replace(/(\*)((?:.+?)(?:(?:\n.*)+)?)\1/g,
									"<em>$2</em>");
								text = text.replace(/(?:^|[^\S])(_)((?:.+)(?:(?:\n.*)+)?)\1/g,
									" <em>$2</em>");
							
							*/
							var toReplaceSplit = $(e.target).getSelection().text.split('\n\n');
							var end = '\n\n';
							for (var i=0, len=toReplaceSplit.length; i<len; i++) {
								toReplace = toReplaceSplit[i];
								if (i==len-1) end = '';
								if (toReplace !== '') {
									switch (String.fromCharCode(e.keyCode)) {
										case 'I':
											e.preventDefault();
											if (((toReplace.substr(0,1) == '*') && (toReplace.substr(0,2) != '**')) && ((toReplace.substr(-1) == '*') && (toReplace.substr(-2) != '**'))) {
												toReplace = toReplace.substr(1,toReplace.length-2);
											} else {
												toReplace = '*'+toReplace+'*';
											}
											toReplace += end;
											$(e.target).replaceSelection(toReplace,true);
											break;
										case 'B':
											e.preventDefault();
											if ((toReplace.substr(0,2) == '**') && (toReplace.substr(-2) == '**')) {
												toReplace = toReplace.substr(2,toReplace.length-4);
											} else {
												toReplace = '**'+toReplace+'**';
											}
											toReplace += end;
											$(e.target).replaceSelection(toReplace,true);
											break;
										case 'S':
											e.preventDefault();
											if ((toReplace.substr(0,2) == '~~') && (toReplace.substr(-2) == '~~')) {
												toReplace = toReplace.substr(2,toReplace.length-4);
											} else {
												toReplace = '~~'+toReplace+'~~';
											}
											toReplace += end;
											$(e.target).replaceSelection(toReplace,true);
											break;
									}
								}
							}
						}
					},
					false
				);	
			}

			
			preview.textArea = targetTextArea;
		
			modules['commentPreview'].addPreviewClearOnCommentSubmit( parent, preview );
		}
		
		return preview;
	},
	addPreviewClearOnCommentSubmit: function( parent, preview ) {
		var buttons = parent.getElementsByTagName('button');
		
		for (var i = 0, button = null; button = buttons[i]; i++)
		{
			if ( button.getAttribute('class') == "save" )
			{
				button.addEventListener(
					'click', 
					function()
					{
						$(preview).html('');
					}, 
					false
				);
			}
		}	
	},

	refreshPreview: function ( preview, targetTextArea ) {
		// modification: hide this thing if it's empty...
		if (targetTextArea.value == '') {
			preview.parentNode.style.display = 'none';
		} else {
			preview.parentNode.style.display = 'block';
		}
		RESUtils.debounce('refreshPreview', 250, function() {
			var html = modules['commentPreview'].converter.render(targetTextArea.value);
			$(preview).html(html);
		});		
	},
	addMarkdownEditorToForm: function ( parent, preview ) {	
		if (this.options.enableBigEditor.value) {
			$('<button class="RESBigEditorPop blueButton" tabIndex="3">big editor</button>').prependTo($('.bottom-area', parent).not('.RESBigEditorPop'))
		}

		var textAreas = parent.getElementsByTagName('textarea');
		
		if ( !textAreas[0] ) return;
		
		var targetTextArea = textAreas[0];
		targetTextArea.setAttribute('tabIndex',0);
		
		
		var controlBox = document.createElement( 'div' );
		controlBox.setAttribute('class', 'markdownEditor');
		parent.insertBefore( controlBox, parent.firstChild );

		if ((modules['commentPreview'].options.commentingAs.value) && (!(modules['usernameHider'].isEnabled()))) {
			// show who we're commenting as...
			var commentingAs = document.createElement('div');
			commentingAs.setAttribute('class', 'commentingAs');
			$(commentingAs).text('Commenting as: ' + RESUtils.loggedInUser());
			parent.insertBefore( commentingAs, parent.firstChild );
		}
		
		var bold = new modules['commentPreview'].EditControl(
			'<b>Bold</b>',
			function()
			{
				modules['commentPreview'].tagSelection( targetTextArea, '**', '**' );
				modules['commentPreview'].refreshPreview( preview, targetTextArea );
				targetTextArea.focus();
			},
			'ctrl-b'
		);
		
		var italics = new modules['commentPreview'].EditControl(
			'<i>Italic</i>',
			function()
			{
				modules['commentPreview'].tagSelection( targetTextArea, '*', '*' );
				modules['commentPreview'].refreshPreview( preview, targetTextArea );
				targetTextArea.focus();
			},
			'ctrl-i'
		);
		
		var strikethrough = new modules['commentPreview'].EditControl(
			'<del>strike</del>',
			function()
			{
				modules['commentPreview'].tagSelection( targetTextArea, '~~', '~~' );
				modules['commentPreview'].refreshPreview( preview, targetTextArea );
				targetTextArea.focus();
			},
			'ctrl-s'
		);
		
		var superscript = new modules['commentPreview'].EditControl(
			'<sup>sup</sup>',
			function()
			{
				modules['commentPreview'].tagSelection( targetTextArea, '^', '' );
				modules['commentPreview'].refreshPreview( preview, targetTextArea );
				targetTextArea.focus();
			}
		);

		var link = new modules['commentPreview'].EditControl(
			'Link',
			function()
			{
				modules['commentPreview'].linkSelection( targetTextArea );
				modules['commentPreview'].refreshPreview( preview, targetTextArea );
				targetTextArea.focus();
			}
		);
		
		var quote = new modules['commentPreview'].EditControl(
			'|Quote',
			function()
			{
				modules['commentPreview'].prefixSelectionLines( targetTextArea, '>' );
				modules['commentPreview'].refreshPreview( preview, targetTextArea );
				targetTextArea.focus();
			}
		);
		
		var code = new modules['commentPreview'].EditControl(
			'<span style="font-family: Courier New;">Code</span>',
			function()
			{
				modules['commentPreview'].prefixSelectionLines( targetTextArea, '    ' );
				modules['commentPreview'].refreshPreview( preview, targetTextArea );
				targetTextArea.focus();
			}
		);
		
		var bullets = new modules['commentPreview'].EditControl(
			'&bull;Bullets',
			function()
			{
				modules['commentPreview'].prefixSelectionLines( targetTextArea, '* ' );
				modules['commentPreview'].refreshPreview( preview, targetTextArea );
				targetTextArea.focus();
			}
		);
		
		var numbers = new modules['commentPreview'].EditControl(
			'1.Numbers',
			function()
			{
				modules['commentPreview'].prefixSelectionLines( targetTextArea, '1. ' );
				modules['commentPreview'].refreshPreview( preview, targetTextArea );
				targetTextArea.focus();
			}
		);
		
		var disapproval = new modules['commentPreview'].EditControl(
			'&#3232;\_&#3232;',
			function() {
				modules['commentPreview'].prefixCursor( modules['commentPreview'].macroTargetTextarea, '&#3232;\\\_&#3232;' );
				modules['commentPreview'].refreshPreview( modules['commentPreview'].macroTargetPreview, modules['commentPreview'].macroTargetTextarea );
				modules['commentPreview'].macroTargetTextarea.focus();
			}
		);
		
		var promoteRES = new modules['commentPreview'].EditControl(
			'[Promote]',
			function() {
				var thisCount = $(this).data('promoteCount') || 0;
				thisCount++;
				$(this).data('promoteCount',thisCount);
				if (thisCount > 2) {
					$(this).hide();
					modules['commentPreview'].lod();
					return false;
				}
				modules['commentPreview'].prefixSelectionLines( modules['commentPreview'].macroTargetTextarea, '[Reddit Enhancement Suite](http://redditenhancementsuite.com)' );
				modules['commentPreview'].refreshPreview( modules['commentPreview'].macroTargetPreview, modules['commentPreview'].macroTargetTextarea );
				modules['commentPreview'].macroTargetTextarea.focus();
			}
		);
		
		var reddiquette = new modules['commentPreview'].EditControl(
			'reddiquette',
			function() {
				var thisCount = $(this).data('promoteCount') || 0;
				thisCount++;
				$(this).data('promoteCount',thisCount);
				if (thisCount > 2) {
					$(this).hide();
					// modules['commentPreview'].lod();
					return false;
				}
				modules['commentPreview'].prefixCursor( targetTextArea, '[reddiquette](http://www.reddit.com/help/reddiquette) ' );
				modules['commentPreview'].refreshPreview( preview, targetTextArea );
				targetTextArea.focus();
			}
		);
		
		controlBox.appendChild( bold.create() );
		controlBox.appendChild( italics.create() );
		controlBox.appendChild( strikethrough.create() );
		controlBox.appendChild( superscript.create() );
		controlBox.appendChild( link.create() );
		controlBox.appendChild( quote.create() );
		controlBox.appendChild( code.create() );
		controlBox.appendChild( bullets.create() );
		controlBox.appendChild( numbers.create() );
		// controlBox.appendChild( disapproval.create() );
		controlBox.appendChild( reddiquette.create() );
		// controlBox.appendChild( promoteRES.create() );
		modules['commentPreview'].macroDropdownTitle = $('<span class="RESMacroDropdownTitle">macros</span>')
		$(controlBox).append(modules['commentPreview'].macroDropdownTitle);
		// add one single dropdown to the document body rather than creating multiples...
		if (typeof(modules['commentPreview'].macroDropdownContainer) == 'undefined') {
			modules['commentPreview'].macroDropdownContainer = $('<span id="RESMacroDropdown"><span class="RESMacroDropdownTitleOverlay">macros</span></span>')
			modules['commentPreview'].macroDropdown = $('<ul id="RESMacroDropdownList" class="RESDropdownList"></ul>')
			var thisLI = $('<li />');
			$(thisLI).append(disapproval.create());
			$(modules['commentPreview'].macroDropdown).append(thisLI);
			thisLI = $('<li />');
			$(thisLI).append(promoteRES.create());
			$(modules['commentPreview'].macroDropdown).append(thisLI);
			Array.prototype.slice.call(modules['commentPreview'].options['macros'].value).forEach(function(elem, index, array) {
				var thisLI = $('<li />');
				$(thisLI).append(new modules['commentPreview'].EditControl(elem[0], function(){
					modules['commentPreview'].prefixCursor( modules['commentPreview'].macroTargetTextarea, elem[1] );
					modules['commentPreview'].refreshPreview( modules['commentPreview'].macroTargetPreview, modules['commentPreview'].macroTargetTextarea );
					$(modules['commentPreview'].macroDropdownContainer).hide();
					modules['commentPreview'].macroTargetTextarea.focus();
				}).create());
				$(modules['commentPreview'].macroDropdown).append(thisLI);
			});
			// add the "+ add macro" button
			var thisLI = $('<li><a href="javascript:void(0)">+ add macro</a>');
			$(thisLI).click(modules['commentPreview'].manageMacros)
			$(modules['commentPreview'].macroDropdown).append(thisLI);
			$(modules['commentPreview'].macroDropdownContainer).append(modules['commentPreview'].macroDropdown);
			$(modules['commentPreview'].macroDropdownContainer).mouseleave(function(e) {
				$(this).hide();
				modules['styleTweaks'].setSRStyleToggleVisibility(true, 'macroDropdown');
			});
			$(document.body).append( modules['commentPreview'].macroDropdownContainer );
		}
		// attach listeners to dropdowntitles to show the dropdown...
		$(".RESMacroDropdownTitle").live('click', modules['commentPreview'].showMacroDropdown);
	}, 
	EditControl: function ( label, editFunction, shortcutKey ) {
		this.create = function() 
		{
			this.link = document.createElement('a');
			if (shortcutKey) this.link.title = shortcutKey;
			$(this.link).html(label);
			this.link.setAttribute('tabindex','1');
			this.link.href = 'javascript:;';
			// this.link.setAttribute('style','Margin-Right: 15px; text-decoration: none;');
			
			this.link.execute = editFunction;
			
			modules['commentPreview'].addEvent( this.link, 'click', 'execute' );
			
			return this.link;	
		}
	},
	tagSelection: function ( targetTextArea, tagOpen, tagClose, textEscapeFunction ) {	
		//record scroll top to restore it later.
		var scrollTop = targetTextArea.scrollTop;
		
		//We will restore the selection later, so record the current selection.
		var selectionStart = targetTextArea.selectionStart;
		var selectionEnd = targetTextArea.selectionEnd;
		
		var selectedText = targetTextArea.value.substring( selectionStart, selectionEnd );
		
		//Markdown doesn't like it when you tag a word like **this **. The space messes it up. So we'll account for that because Firefox selects the word, and the followign space when you double click a word.
		var potentialTrailingSpace = '';
		
		if( selectedText[ selectedText.length - 1 ] == ' ' )
		{
			potentialTrailingSpace = ' ';
			selectedText = selectedText.substring( 0, selectedText.length - 1 );
		}
		
		if ( textEscapeFunction )
		{
			selectedText = textEscapeFunction( selectedText );
		}
		
		targetTextArea.value = 
			targetTextArea.value.substring( 0, selectionStart ) + //text leading up to the selection start
			tagOpen + 
			selectedText +
			tagClose + 
			potentialTrailingSpace +
			targetTextArea.value.substring( selectionEnd ); //text after the selection end
		
		targetTextArea.selectionStart = selectionStart + tagOpen.length;
		targetTextArea.selectionEnd = selectionEnd + tagOpen.length;
		
		targetTextArea.scrollTop = scrollTop;
	},
	linkSelection: function ( targetTextArea ) {
		var url = prompt( "Enter the URL:", "" );

		if ( url !== null )
		{
			modules['commentPreview'].tagSelection(
				targetTextArea,
				'[',
				'](' + url.replace( /\(/, '\\(' ).replace( /\)/, '\\)' ) + ')', //escape parens in url
				function( text )
				{
					return text.replace( /\[/, '\\[' ).replace( /\]/, '\\]' ).replace( /\(/, '\\(' ).replace( /\)/, '\\)' ); //escape brackets and parens in text
				}
			);
		}
	},
	prefixCursor: function ( targetTextArea, prefix ) {
		//Is scrollTop necessary?
		var scrollTop = targetTextArea.scrollTop;
		var text = targetTextArea.value;
		var selectionStart = targetTextArea.selectionStart;
		text = text.slice(0, selectionStart) + prefix + text.slice(selectionStart);
		targetTextArea.value  = text;
		targetTextArea.selectionStart += prefix.length;
		targetTextArea.scrollTop = scrollTop;
	},
	prefixSelectionLines: function ( targetTextArea, prefix ) {
		var scrollTop = targetTextArea.scrollTop;
		var selectionStart = targetTextArea.selectionStart;
		var selectionEnd = targetTextArea.selectionEnd;
		
		var selectedText = targetTextArea.value.substring( selectionStart, selectionEnd );
		
		var lines = selectedText.split( '\n' );
		
		var newValue = '';
		
		for( var i = 0; i < lines.length; i++ )
		{
			// newValue += prefix + lines[i] + '\n';
			newValue += prefix + lines[i];
			if ( ( i + 1 ) != lines.length ) {newValue += '\n';}
		}
		
		targetTextArea.value = 
			targetTextArea.value.substring( 0, selectionStart ) + //text leading up to the selection start
			newValue + 
			targetTextArea.value.substring( selectionEnd ); //text after the selection end
		
		targetTextArea.scrollTop = scrollTop;
	},
	//Delegated event wire-up utitlity. Using this allows you to use the "this" keyword in a delegated function.
	addEvent: function ( target, eventName, handlerName ) {
		target.addEventListener(eventName, function(e){target[handlerName](e);}, false);
	},
	/*
	addParentListener: function (event) {
		var moreCommentsParent = event.currentTarget;
		if (BrowserDetect.MutationObserver) {
			var mutationNodeToObserve = $(moreCommentsParent).closest('div.sitetable')[0];
			var observer = new BrowserDetect.MutationObserver(function(mutations) {
//				mutations.forEach(function(mutation) {
					$(mutations[0].target).find('form').each(function() {
						modules['commentPreview'].wireupCommentEditors( this );
					});
					$(mutations[0].target).find('div.thing').each(function() {
						modules['commentPreview'].wireupCommentEditors( this );
						modules['commentPreview'].wireupViewSourceButtons( this );
					});
//				});
			});

			observer.observe(mutationNodeToObserve, {
				attributes: true, 
				childList: true, 
				characterData: true
			});				
		} else {
			// not currently set up for non mutation observer supporting browsers, they handle
			// this differently and nothing is necessary here.
		}
	},
	*/
	manageMacros: function() {
		RESConsole.open();
		RESConsole.menuClick(document.getElementById('Menu-Comments'));
		RESConsole.drawConfigOptions('commentPreview');
	},
	showMacroDropdown: function(e) {
		modules['commentPreview'].macroTargetTextarea = $(e.target).parent().parent().find('textarea')[0];
		modules['commentPreview'].macroTargetPreview = $(e.target).parent().parent().find('.livePreview div.md')[0];
		//get the position of the placeholder element  
		var pos = $(e.target).offset();    
		// var eWidth = $(this).outerWidth();
		// var mWidth = $(dropdown).outerWidth();
		// var left = (pos.left + eWidth - mWidth) + "px";
		var left = (pos.left) + "px";
		// var top = $(this).outerHeight()+pos.top + "px";
		var top = (pos.top) + "px";
		//show the dropdown directly over the placeholder  
		$(modules['commentPreview'].macroDropdownContainer).css( { 
			left: left, 
			top: top
		}).show();
		modules['styleTweaks'].setSRStyleToggleVisibility(false, 'macroDropdown');
	},
	lod: function() {
		if (typeof(this.firstlod) == 'undefined') {
			this.firstlod = true;
			$('body').append('<div id="RESlod" style="display: none; position: fixed; left: 0; top: 0; right: 0; bottom: 0; background-color: #ddd; opacity: 0.9; z-index: 99999;"><div style="position: relative; text-align: center; width: 400px; height: 300px; margin: auto;"><div style="font-size: 100px; margin-bottom: 10px;">&#3232;\_&#3232;</div> when you do this, people direct their frustrations at <b>me</b>... could we please maybe give this a rest?</div></div>');
		}
		$('#RESlod').fadeIn('slow', function() {
			setTimeout(function() {
				$('#RESlod').fadeOut('slow');
			}, 5000);
		});
	},
	viewSource: function(e) {
		e.preventDefault();
		var ele = e.target;
		if (ele) {
			var permalink = ele.parentNode.parentNode.firstChild.firstChild;
			if (permalink) {
				// check if we've already viewed the source.. if so just reveal it instead of loading...
				var prevSib = ele.parentNode.parentNode.previousSibling;
				if (typeof(prevSib.querySelector) == 'undefined') prevSib = prevSib.previousSibling;
				var sourceDiv = prevSib.querySelector('.viewSource');
				if (sourceDiv) {
					sourceDiv.style.display = 'block';
				} else {
					var jsonURL = permalink.getAttribute('href');
					var urlSplit = jsonURL.split('/');
					var postID = urlSplit[urlSplit.length - 1];
					var sourceLink = 'comment';
					if (permalink.classList.contains('comments')) {
						sourceLink = 'selftext';
					}
					if (jsonURL.indexOf('?context') != -1) {
						jsonURL = jsonURL.replace('?context=3','.json?');
					} else {
						jsonURL += '/.json';
					}
					modules['commentPreview'].viewSourceEle = ele;
					modules['commentPreview'].viewSourceLink = sourceLink;
					jsonURL = RESUtils.insertParam(jsonURL,'app','res');
					GM_xmlhttpRequest({
						method:	"GET",
						url:	jsonURL,
						onload:	function(response) {
							var thisResponse = JSON.parse(response.responseText);
							var userTextForm = document.createElement('div');
							userTextForm.classList.add('usertext-edit');
							userTextForm.classList.add('viewSource');
							if (modules['commentPreview'].viewSourceLink == 'comment') {
								var sourceText = null;
								if (typeof(thisResponse[1]) != 'undefined') {
									sourceText = thisResponse[1].data.children[0].data.body;
								} else {
									var thisData = thisResponse.data.children[0].data;
									if (thisData.id == postID) {
										sourceText = thisData.body;
									} else {
										// The message we want is a reply to a PM/modmail, but reddit returns the whole thread.
										// So, we have to dig into the replies to find the message we want.
										for (var i=0, len=thisData.replies.data.children.length; i<len; i++) {
											var replyData = thisData.replies.data.children[i].data;
											if (replyData.id == postID) {
												sourceText = replyData.body;
												break;
											}
										}
									}
								}
								// sourceText in this case is reddit markdown. escaping it would screw it up.
								$(userTextForm).html('<div><textarea rows="1" cols="1" name="text">' + sourceText + '</textarea></div><div class="bottom-area"><div class="usertext-buttons"><button type="button" class="cancel">hide</button></div></div>');
							} else {
								var sourceText = thisResponse[0].data.children[0].data.selftext;
								// sourceText in this case is reddit markdown. escaping it would screw it up.
								$(userTextForm).html('<div><textarea rows="1" cols="1" name="text">' + sourceText + '</textarea></div><div class="bottom-area"><div class="usertext-buttons"><button type="button" class="cancel">hide</button></div></div>');
							}
							var cancelButton = userTextForm.querySelector('.cancel');
							cancelButton.addEventListener('click', modules['commentPreview'].hideSource, false);
							var prevSib = modules['commentPreview'].viewSourceEle.parentNode.parentNode.previousSibling;
							if (typeof(prevSib.querySelector) == 'undefined') prevSib = prevSib.previousSibling;
							prevSib.appendChild(userTextForm);
						}
					});
				}
				
			}
		}
	},
	hideSource: function(e) {
		e.target.parentNode.parentNode.parentNode.style.display = 'none';
	},
	subredditAutocomplete: function(formEle) {
		if (!this.subredditAutocompleteRunOnce) {
			// Keys "enum"
			this.KEY = {
				BACKSPACE: 8,
				TAB: 9,
				ENTER: 13,
				ESCAPE: 27,
				SPACE: 32,
				PAGE_UP: 33,
				PAGE_DOWN: 34,
				END: 35,
				HOME: 36,
				LEFT: 37,
				UP: 38,
				RIGHT: 39,
				DOWN: 40,
				NUMPAD_ENTER: 108,
				COMMA: 188
			};
			if (!formEle) formEle = $('textarea:not([name=title])');
			this.subredditAutocompleteRunOnce = true;
			this.subredditAutocompleteCache = {};
			this.subredditRE = /\W\/?r\/([\w\.]*)$/,
			this.subredditSkipRE = /\W\/?r\/([\w\.]*)\ $/,
			this.linkReplacementRE = /([^\w\[\(])\/r\/(\w*(?:\.\w*)?)([^\w\]\)])/g;
			modules['commentPreview'].subredditAutocompleteDropdown = $('<div id="subreddit_dropdown" class="drop-choices srdrop inuse" style="display:none; position:relative;"><a class="choice"></a></div>');
			$('body').append(modules['commentPreview'].subredditAutocompleteDropdown);
		}
		$(formEle).live('keyup', modules['commentPreview'].subredditAutocompleteTrigger );
		$(formEle).live('keydown', modules['commentPreview'].subredditAutocompleteNav );
	},
	subredditAutocompleteTrigger: function(event) {
		if (/[^A-Za-z0-9 ]/.test(String.fromCharCode(event.keyCode))) {
			return false;
		}
		if (typeof(modules['commentPreview'].subredditAutoCompleteAJAXTimer) != 'undefined') clearTimeout(modules['commentPreview'].subredditAutoCompleteAJAXTimer);
		modules['commentPreview'].currentTextArea = event.target;
		var	match = modules['commentPreview'].subredditRE.exec( ' '+ event.target.value.substr( 0, event.target.selectionStart ) );
		if( !match || match[1] == '' || match[1].length > 10 ) {
			// if space or enter, check if they skipped over a subreddit autocomplete without selecting one..
			if ((event.keyCode == 32) || (event.keyCode == 13)) {
				match = modules['commentPreview'].subredditSkipRE.exec( ' '+ event.target.value.substr( 0, event.target.selectionStart ) );
				if (match) {
					modules['commentPreview'].addSubredditLink(match[1]);
				}
			}
			return modules['commentPreview'].hideSubredditAutocompleteDropdown();
		}

		var query = match[1].toLowerCase();
		if( modules['commentPreview'].subredditAutocompleteCache[query]) return modules['commentPreview'].updateSubredditAutocompleteDropdown( modules['commentPreview'].subredditAutocompleteCache[query], event.target );

		var thisTarget = event.target;
		modules['commentPreview'].subredditAutoCompleteAJAXTimer = setTimeout(
			function() {
				$.post('/api/search_reddit_names.json?app=res', {query:query},
				// $.post('/reddits/search.json', {q:query},
					function(r){
						modules['commentPreview'].subredditAutocompleteCache[query]=r['names'];
						modules['commentPreview'].updateSubredditAutocompleteDropdown( r['names'], thisTarget );
						modules['commentPreview'].subredditAutocompleteDropdownSetNav(0);
					},
				"json");
			
			}, 200);


		$(this).blur( modules['commentPreview'].hideSubredditAutocompleteDropdown );	
	},
	subredditAutocompleteNav: function(event) {
		if ($("#subreddit_dropdown").is(':visible')) {
			switch (event.keyCode) {
				case modules['commentPreview'].KEY.DOWN:
				case modules['commentPreview'].KEY.RIGHT:
					event.preventDefault();
					var reddits = $("#subreddit_dropdown a.choice");
					if (modules['commentPreview'].subredditAutocompleteDropdownNavidx < reddits.length-1) modules['commentPreview'].subredditAutocompleteDropdownNavidx++;
					modules['commentPreview'].subredditAutocompleteDropdownSetNav(modules['commentPreview'].subredditAutocompleteDropdownNavidx);
					break;
				case modules['commentPreview'].KEY.UP:
				case modules['commentPreview'].KEY.LEFT:
					event.preventDefault();
					if (modules['commentPreview'].subredditAutocompleteDropdownNavidx > 0) modules['commentPreview'].subredditAutocompleteDropdownNavidx--;
					modules['commentPreview'].subredditAutocompleteDropdownSetNav(modules['commentPreview'].subredditAutocompleteDropdownNavidx);
					break;
				case modules['commentPreview'].KEY.TAB:
				case modules['commentPreview'].KEY.ENTER:
					event.preventDefault();
					var reddits = $("#subreddit_dropdown a.choice");
					RESUtils.mousedown(reddits[modules['commentPreview'].subredditAutocompleteDropdownNavidx]);
					break;
				case modules['commentPreview'].KEY.ESCAPE:
					event.preventDefault();
					modules['commentPreview'].hideSubredditAutocompleteDropdown();
					break;
			}
		}
	},
	subredditAutocompleteDropdownSetNav: function(idx) {
		modules['commentPreview'].subredditAutocompleteDropdownNavidx = idx;
		var reddits = $("#subreddit_dropdown a.choice");
		for (var i=0, len=reddits.length; i<len; i++) {
			$(reddits[i]).removeClass('selectedItem');
			if (i == idx) $(reddits[i]).addClass('selectedItem');
		}
	},
	hideSubredditAutocompleteDropdown: function() {
		$("#subreddit_dropdown").hide();
	},
	updateSubredditAutocompleteDropdown: function(sr_names, textarea) {
		$( textarea ).after( modules['commentPreview'].subredditAutocompleteDropdown );

		if(!sr_names.length) return	modules['commentPreview'].hideSubredditAutocompleteDropdown();

		var first_row = modules['commentPreview'].subredditAutocompleteDropdown.children(":first");
		modules['commentPreview'].subredditAutocompleteDropdown.children().remove();

		for (var i=0, len=sr_names.length; i<len; i++) {
			if( i>10 ) break;
			var new_row=first_row.clone();
			new_row.text( sr_names[i] );
			modules['commentPreview'].subredditAutocompleteDropdown.append(new_row);
			new_row.mousedown( modules['commentPreview'].updateSubredditAutocompleteTextarea );
		}
		modules['commentPreview'].subredditAutocompleteDropdown.show();
		if (typeof(modules['commentPreview'].subredditAutocompleteDropdownNavidx) == 'undefined') modules['commentPreview'].subredditAutocompleteDropdownNavidx = 0;
		modules['commentPreview'].subredditAutocompleteDropdownSetNav(modules['commentPreview'].subredditAutocompleteDropdownNavidx);
	
	},
	updateSubredditAutocompleteTextarea: function(event) {
		modules['commentPreview'].hideSubredditAutocompleteDropdown();
		modules['commentPreview'].addSubredditLink(this.innerHTML);
	},
	addSubredditLink: function(subreddit) {
		var textarea	= modules['commentPreview'].currentTextArea,
			caretPos	= textarea.selectionStart,
			beforeCaret	= textarea.value.substr( 0,caretPos ),
			afterCaret	= textarea.value.substr( caretPos );

		// var srLink = '[/r/'+subreddit+'](/r/'+subreddit+') ';
		var srLink = '/r/'+subreddit+' ';
		beforeCaret		= beforeCaret.replace( /\/?r\/(\w*)\ ?$/, srLink );
		textarea.value	= beforeCaret + afterCaret;
		textarea.selectionStart	= textarea.selectionEnd	= beforeCaret.length;
		textarea.focus()
	
	}
};
