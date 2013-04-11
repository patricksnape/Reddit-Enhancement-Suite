modules['usernameHider'] = {
	moduleID: 'usernameHider',
	moduleName: 'Username Hider',
	category: 'Accounts',
	options: {
		displayText: {
			type: 'text',
			value: '~anonymous~',
			description: 'What to replace your username with, default is ~anonymous~'
		}
	},
	description: 'This module hides your real username when you\'re logged in to reddit.',
	isEnabled: function() {
		return RESConsole.getModulePrefs(this.moduleID);
	},
	include: Array(
		/https?:\/\/([a-z]+).reddit.com\/[-\w\.\/]*/i,
		/https?:\/\/reddit.com\/[-\w\.\/]*/i
	),
	isMatchURL: function() {
		return RESUtils.isMatchURL(this.moduleID);
	},
	beforeLoad: function() {
		if ((this.isEnabled()) && (this.isMatchURL())) {
			if (!RESUtils.loggedInUser(true)) {
				this.tryAgain = true;
				return false;
			}
			this.hideUsername();
		}
	},
	go: function() {
		if ((this.isEnabled()) && (this.isMatchURL())) {
			if (this.tryAgain && RESUtils.loggedInUser()) {
				this.hideUsername();
				GM_addStyle(RESUtils.css);
			}
		}
	},
	hideUsername: function() {
		RESUtils.addCSS('p.tagline a[href*=\'/'+RESUtils.loggedInUser()+'\'], .user a:not([title*=karma]), .titlebox .tagline a.author, .commentingAs {line-height:0px; color:;font-size:0px;}');
		RESUtils.addCSS('p.tagline a[href*=\'/'+RESUtils.loggedInUser()+'\']:after, .user a:not([title*=karma]):after, .titlebox .tagline a.author:after {color: ; content: "'+this.options.displayText.value+'";letter-spacing:normal; display:inline; font-size:+10px;}');
		RESUtils.addCSS('.commentingAs:after {color: ; content: "Commenting as: '+this.options.displayText.value+'";letter-spacing:normal; display:inline; font-size:12px;}');
	}
};
