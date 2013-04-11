modules['settingsNavigation'] = 
{
	moduleID: 'settingsNavigation',
	moduleName: 'RES Settings Navigation',
	category: 'UI',
	description: 'Helping you get around the RES Settings Console with greater ease',
	hidden: true,
	options: {
	},
	isEnabled: function() {
		// return RESConsole.getModulePrefs(this.moduleID);
		return true;
	},
	include: Array(
		/^https?:\/\/([-\w\.]+\.)?reddit\.com\/[-\w\.\/]*/i
	),
	isMatchURL: function() {
		return RESUtils.isMatchURL(this.moduleID);
	},
	go: function() {
		RESUtils.addCSS(modules['settingsNavigation'].css);
		this.menuItem = createElementWithID('li','RESSearchMenuItem');
		this.menuItem.textContent = 'search settings';
		this.menuItem.addEventListener('click', function(e) {
			modules['settingsNavigation'].showSearch()
		}, false);
		$('#RESDropdownOptions').append(this.menuItem);

		if (!(this.isEnabled() && this.isMatchURL())) return;

		window.addEventListener('hashchange', modules['settingsNavigation'].onHashChange);
		window.addEventListener('popstate', modules['settingsNavigation'].onPopState);
		setTimeout(modules['settingsNavigation'].onHashChange, 300); // for initial pageload; wait until after RES has completed loading

		this.consoleTip();
	},
	consoleTip: function() {
		// first, ensure that we've at least run dailyTip once (so RES first-run has happened)...
		var lastToolTip = RESStorage.getItem('RESLastToolTip');
		if (lastToolTip) {
			// if yes, see if the user has ever opened the settings console.
			var hasOpenedConsole = RESStorage.getItem('RESConsole.hasOpenedConsole');
			if (!hasOpenedConsole) {
				// if no, nag them once daily that the console exists until they use it.  Once it's been opened, this check will never run again.
				var lastCheckDailyTip = parseInt(RESStorage.getItem('RESLastToolTip'), 10) || 0;
				var now = new Date();
				// 86400000 = 1 day - remind users once a day if they've never opened the settings that they should check out the console sometime...
				var lastCheck = parseInt(RESStorage.getItem('RESConsole.hasOpenedCheck'), 10) || 0;
				if (((now.getTime() - lastCheckDailyTip) > 1000) && ((now.getTime() - lastCheck) > 86400000)) {
					RESStorage.setItem('RESConsole.hasOpenedCheck', now.getTime());
					modules['RESTips'].showTip(0,'console');
				}			
			}
		}
	},
	makeUrlHashLink: function (moduleID, optionKey, displayText, cssClass) {
		if (!displayText) {
			if (optionKey) {
				displayText = optionKey;
			} else if (modules[moduleID]) {
				displayText = modules[moduleID].moduleName;
			} else if (moduleID) {
				displayText = moduleID;
			} else {
				displayText = 'Settings';
			}
		}

		var hash = modules['settingsNavigation'].makeUrlHash(moduleID, optionKey);
		var link = ['<a ', 'class="', cssClass || '', '" ', 'href="', hash, '"', '>', displayText, '</a>'].join('');
		return link;
	},
	makeUrlHash: function(moduleID, optionKey) {
		var hashComponents = ['#!settings']
		
		if (moduleID) {
			hashComponents.push(moduleID);
		}

		if (moduleID && optionKey) {
			hashComponents.push(optionKey);
		}

		var hash = hashComponents.join('/');
		return hash;
	},
	setUrlHash: function(moduleID, optionKey) {
		var titleComponents = ['RES Settings'];
		
		if (moduleID) {
			var module = modules[moduleID];
			var moduleName = module && module.moduleName || moduleID;
			titleComponents.push(moduleName);
		
			if (optionKey) {
				titleComponents.push(optionKey);
			}
		}

		var hash = this.makeUrlHash(moduleID, optionKey);
		var title = titleComponents.join(' - ');

		if (window.location.hash != hash) {
			window.history.pushState(hash, title, hash);
		}
	},
	resetUrlHash: function() {
		window.location.hash = "";
	},
	onHashChange: function (event) {
		var hash = window.location.hash;
		if (hash.substring(0, 10) != '#!settings') return;

		var params = hash.match(/\/[\w\s]+/g);
		if (params && params[0]) {
			var moduleID = params[0].substring(1);
		}
 		if (params && params[1]) {
			var optionKey = params[1].substring(1);
		}

		modules['settingsNavigation'].loadSettingsPage(moduleID, optionKey);
	},
	onPopState: function (event) {
		var state = event.state;
		if (!(state && state[0] != '#!settings')) return;

		var moduleID = state[1];
		var optionKey = state[2];

		modules['settingsNavigation'].loadSettingsPage(moduleID, optionKey);
	},
	loadSettingsPage: function(moduleID, optionKey, optionValue) {
		if (moduleID && modules.hasOwnProperty(moduleID)) {
			var module = modules[moduleID];
		}
		if (module) {
			var category = module.category;
		}


		RESConsole.open();
		if (category) {
			var categoryElement = document.getElementById('Menu-' + category);
			if (categoryElement) {
				RESConsole.menuClick(categoryElement);
			}			
		}

		if (module) {
			RESConsole.drawConfigOptions(module.moduleID);

			if (optionKey && module.options.hasOwnProperty(optionKey)) {
				var optionsPanel = $(RESConsole.RESConsoleContent);
				var optionElement = optionsPanel.find('label[for="' + optionKey + '"]');
				var optionParent = optionElement.parent();
				optionParent.addClass('highlight');
				if (optionElement.length) {
					var configPanel = $(RESConsole.RESConsoleConfigPanel);
					var offset = optionElement.offset().top - configPanel.offset().top;
					optionsPanel.scrollTop(offset);
				}
			}
		} else {
			switch(moduleID) {
				case 'search':
					this.search(optionKey);
					break;
				default:
					break;
			}
		}
		modules['settingsNavigation'].setUrlHash(moduleID, optionKey);
	},
	search: function(query) {
		modules['settingsNavigation'].drawSearchResults(query);
		modules['settingsNavigation'].getSearchResults(query);
		modules['settingsNavigation'].setUrlHash('search', query);
	},
	showSearch: function () {
		RESConsole.hidePrefsDropdown();
		modules['settingsNavigation'].drawSearchResults();
		$('#SearchRES-input').focus();
	},
	doneSearch: function (query, results) {
		modules['settingsNavigation'].drawSearchResults(query, results);
	},
	getSearchResults: function (query) {
		if (!(query && query.toString().length)) {
			modules['settingsNavigation'].doneSearch(query, []);
		}

		var queryTerms = modules['settingsNavigation'].prepareSearchText(query, true).split(' ');
		var results = [];

		// Search options
		for (var moduleKey in modules) {
			if (!modules.hasOwnProperty(moduleKey)) continue;
			var module = modules[moduleKey];
			var options = module.options;

			for (var optionKey in options) {
				if (!options.hasOwnProperty(optionKey)) continue;
				var option = options[optionKey];

				var searchString = module.moduleID + module.moduleName + module.category + optionKey + option.description;
				searchString = modules['settingsNavigation'].prepareSearchText(searchString, false);
				var matches = modules['settingsNavigation'].searchMatches(queryTerms, searchString);
				if (matches) {
					var result = modules['settingsNavigation'].makeOptionSearchResult(moduleKey, optionKey);
					result.rank = matches;
					results.push(result);
				}
			}
		}

		results.sort(function(a, b) {
			var comparison = b.rank - a.rank;
			
			/*
			if (comparison == 0) {
				comparison = 
					a.title < b.title ? -1
				 	: a.title > b.title ? 1
				 	: 0;

			}

			if (comparison == 0) {
				comparison = 
					a.description < b.description ? -1
				 	: a.description > b.description ? 1
				 	: 0;
			}
			*/

			return comparison;
		});

		modules['settingsNavigation'].doneSearch(query, results);

	},
	searchMatches: function(needles, haystack) {
		if (!(haystack && haystack.length)) 
			return false;

		var numMatches = 0;
		for (var i = 0; i < needles.length; i++) {
			if (haystack.indexOf(needles[i]) !== -1)
				numMatches++;
		}

		return numMatches;
	},
	prepareSearchText: function (text, preserveSpaces) {
		if (typeof text == "undefined" || text == null) {
			return '';
		}

		var replaceSpacesWith = !!preserveSpaces ? ' ' : ''
		return text.toString().toLowerCase()	
			.replace(/[,\/]/g,replaceSpacesWith).replace(/\s+/g, replaceSpacesWith);
	},
	makeOptionSearchResult: function (moduleKey, optionKey) {
		var module = modules[moduleKey];
		var option = module.options[optionKey];

		var result = {};
		result.type = 'option';
		result.breadcrumb = ['Settings', 
			module.category, 
			module.moduleName + ' (' + module.moduleID + ')'
			].join(' > ');
		result.title = optionKey;
		result.description = option.description;
		result.moduleID = moduleKey;
		result.optionKey = optionKey;

		return result;
	},

	onSearchResultSelected: function(result) {
		if (!result) return;

		switch (result.type) {
			case 'option':
				modules['settingsNavigation'].loadSettingsPage(result.moduleID, result.optionKey);
				break;
			default:
				alert('Could not load search result');
				break;
		}
	},
	// ---------- View ------
	css: '\
		#SearchRES #SearchRES-results-container { \
			display: none; \
		} \
		#SearchRES #SearchRES-results-container + #SearchRES-boilerplate { margin-top: 1em; border-top: 1px black solid; padding-top: 1em; }	\
		#SearchRES h4 { \
			margin-top: 1.5em; \
		} \
		#SearchRES-results { \
		} \
		#SearchRES-results li { \
			list-style-type: none; \
			border-bottom: 1px dashed #ccc; \
			cursor: pointer; \
			margin-left: 0px; \
			padding-left: 10px; \
			padding-top: 24px; \
			padding-bottom: 24px; \
		} \
		#SearchRES-results li:hover { \
			background-color: #FAFAFF; \
		} \
		.SearchRES-result-title { \
			margin-bottom: 12px; \
			font-weight: bold; \
			color: #666; \
		} \
		.SearchRES-breadcrumb { \
			font-weight: normal; \
			color: #888; \
		} \
		#SearchRES-input-submit { \
			margin-left: 8px; \
		} \
		#SearchRES-input { \
			width: 200px; \
			height: 22px; \
			font-size: 14px; \
		} \
		#SearchRES-input-container { \
			float: left; \
			margin-left: 3em; \
			margin-top: 7px; \
		} \
 	',
 	searchPanelHtml: '\
		<h3>Search RES Settings Console</h3> \
		<div id="SearchRES-results-container"> \
			<h4>Results for: <span id="SearchRES-query"></span></h4> \
			<ul id="SearchRES-results"></ul> \
			<p id="SearchRES-results-none">No results found</p> \
		</div> \
		<div id="SearchRES-boilerplate">\
		<p>You can search for RES options by module name, option name, and description. For example, try searching for "daily trick" in one of the following ways:</p>\
		<ul> \
			<li>type <code>daily trick</code> in the search box above and click the button</li> \
			<li>press <code>.</code> to open the RES console, type in <code>search <em>daily trick</em></code>, and press Enter</li> \
		</ul> 	\
	',
	searchPanel: null,
	renderSearchPanel: function() {
		var searchPanel = $('<div />').html(modules['settingsNavigation'].searchPanelHtml);
		 searchPanel.delegate('#SearchRES-results-container .SearchRES-result-item', 'click', modules['settingsNavigation'].handleSearchResultClick);
		
		 modules['settingsNavigation'].searchPanel = searchPanel;
		return searchPanel;
	},
	searchForm: null,
	renderSearchForm: function() {
		var RESSearchContainer = createElementWithID('form', 'SearchRES-input-container');

		var RESSearchBox = createElementWithID('input', 'SearchRES-input');
		RESSearchBox.setAttribute('type', 'text');
		RESSearchBox.setAttribute('placeholder', 'search RES settings');

		var RESSearchButton = createElementWithID('input', 'SearchRES-input-submit');
		RESSearchButton.classList.add('blueButton');
		RESSearchButton.setAttribute('type', 'submit');
		RESSearchButton.setAttribute('value', 'search');

		RESSearchContainer.appendChild(RESSearchBox);
		RESSearchContainer.appendChild(RESSearchButton);

		RESSearchContainer.addEventListener('submit', function (e) {
			e.preventDefault();
			modules['settingsNavigation'].search(RESSearchBox.value);

			return false;
		});

		searchForm = RESSearchContainer;
		return RESSearchContainer;
	},
	drawSearchResultsPage: function() {
		if (!RESConsole.isOpen) {
			RESConsole.open();
		}

		if (!$('#SearchRES').is(':visible')) {
			// Open "About RES" panel
			var categoryElement = document.getElementById('Menu-About RES');
			RESConsole.menuClick(categoryElement);

			// Open "Search RES" page
			$('#Button-SearchRES', this.RESConsoleContent).trigger('click', { duration: 0 });
		}
	},
	drawSearchResults: function (query, results) {
		modules['settingsNavigation'].drawSearchResultsPage();

		var resultsContainer = $('#SearchRES-results-container', modules['settingsNavigation'].searchPanel);
		
		if (!(query && query.length)) {
			resultsContainer.hide();
			return;
		}

		resultsContainer.show();
		resultsContainer.find('#SearchRES-query').text(query);
		$("#SearchRES-input", modules['settingsNavigation'].searchForm).val(query);

		if (!(results && results.length)) {
			resultsContainer.find('#SearchRES-results-none').show();
			resultsContainer.find('#SearchRES-results').hide();
		} else {
			resultsContainer.find('#SearchRES-results-none').hide();
			var resultsList = $('#SearchRES-results', resultsContainer).show();
			
			resultsList.empty();
			for (var i = 0; i < results.length; i++) {
				var result = results[i];

				var element = modules['settingsNavigation'].drawSearchResultItem(result);
				resultsList.append(element);
			}
		}
	},
	drawSearchResultItem: function(result) {
		var element = $('<li>');
		element.addClass('SearchRES-result-item')
			.data('SearchRES-result', result);

		var breadcrumb = $('<span>', {class: 'SearchRES-breadcrumb'})
			.text(result.breadcrumb + ' > ');
		$('<div>', {class: 'SearchRES-result-title'})
			.append(breadcrumb)
			.append(result.title)
			.appendTo(element);
		$('<div>', {class: 'SearchRES-result-description'})
			.appendTo(element)
			.html(result.description);

		return element;
	},
	handleSearchResultClick: function (e) {
		var element = $(this);
		var result = element.data('SearchRES-result');
		modules['settingsNavigation'].onSearchResultSelected(result);
		e.preventDefault();
	},
};
