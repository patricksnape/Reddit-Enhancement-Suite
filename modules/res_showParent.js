modules['showParent'] = {
	moduleID: 'showParent',
	moduleName: 'Show Parent on Hover',
	category: 'Comments',
	options: {
	},
	description: 'Shows parent comment when hovering over the "parent" link of a comment.',
	isEnabled: function() {
		return RESConsole.getModulePrefs(this.moduleID);
	},
	include: [
		/https?:\/\/([a-z]+).reddit.com\/[-\w\.\/]+\/comments\/[-\w\.]+/i,
		/https?:\/\/([a-z]+).reddit.com\/comments\/[-\w\.]+/i
	],
	isMatchURL: function() {
		return RESUtils.isMatchURL(this.moduleID);
	},
	go: function() {
		if ((this.isEnabled()) && (this.isMatchURL())) {
			// do stuff now!
			// this is where your code goes...
			
			// code included from http://userscripts.org/scripts/show/34362
			// author: lazyttrick - http://userscripts.org/users/20871

			$('.comment .buttons :not(:first-child) .bylink')
				.live('mouseover', modules['showParent'].show)
				.live('mouseout', modules['showParent'].hide);
		}
	},
	show: function (evt) {
		var href = evt.target.getAttribute('href');
		href = href.substring(href.lastIndexOf('/') + 1);
		var id = href.replace(/\#/,"");

		var offset = {
		 	top: parseInt(evt.pageY,10)+10,
			left: parseInt(evt.pageX,10)+10
		};

		modules['showParent'].showCommentHover(id, offset);

	},
	showCommentHover: function(id, offset) {
		var parentDiv = document.querySelector('div.id-t1_'+id);
		if (parentDiv) {
			parentDiv = $(parentDiv).clone()
				.attr('id', 'parentComment')
				.addClass('comment parentComment')
				.removeClass('thing even odd RES-keyNav-activeElement');
			
			parentDiv.offset(offset);
                       
            parentDiv.find('.usertext-body').show(); // contents
            parentDiv.find('.flat-list.buttons').remove(); // buttons
            parentDiv.find('.usertext-edit').remove();  // edit form
            parentDiv.children('.child').remove(); // replies and reply edit form

			// replacedHTML is HTML that's already on the page. We need it in tact, we can't escape it, but if it's already on the page, it's not going to be malicious.
			// hence no escapeHTML call here.
			parentDiv.appendTo('body');
			modules['showParent'].parentCommentContainer = parentDiv;
		}
	},
	hide: function (evt) {
		var removeMe = modules['showParent'].parentCommentContainer;
		if (!removeMe || !removeMe.length) return;
		
		removeMe.remove();
		modules['showParent'].parentCommentContainer = null;
	},
	parentCommentContainer: null
};
