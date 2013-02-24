XHRCache = {
    forceCache: false,
    capacity: 250,
    entries: {},
    count: 0,
    check: function(key) {
        if (key in this.entries) {
//				console.count("hit");
            this.entries[key].hits++;
            return this.entries[key].data;
        } else {
//				console.count("miss");
            return null;
        }
    },
    add: function(key, value) {
        if (key in this.entries) {
            return;
        } else {
//				console.count("add");
            this.entries[key] = {data: value, timestamp: new Date(), hits: 1};
            this.count++;
        }
        if (this.count > this.capacity) {
            this.prune();
        }
    },
    prune: function() {
        var now = new Date();
        var bottom = [];
        for (var key in this.entries) {
//				if (this.entries[key].hits == 1) {
//					delete this.entries[key];
//					this.count--;
//					continue;
//				}

            //Weight by hits/age which is similar to reddit's hit/controversial sort orders
            bottom.push({
                key: key,
                weight: this.entries[key].hits/(now - this.entries[key].timestamp)
            });
        }
        bottom.sort(function(a,b){return a.weight-b.weight;});
        var count = this.count - Math.floor(this.capacity / 2);
        for (var i = 0; i < count; i++) {
            delete this.entries[bottom[i].key];
            this.count--;
        }
//			console.count("prune");
    },
    clear: function() {
        this.entries = {};
        this.count = 0;
    }
};

function respondToMessage (msgEvent) {
    var request = msgEvent.message;
    request.requestType = msgEvent.name;
    switch(request.requestType) {
        case 'GM_xmlhttpRequest':
            if (request.aggressiveCache || XHRCache.forceCache) {
                var cachedResult = XHRCache.check(request.url);
                if (cachedResult) {
                    cachedResult.XHRID = msgEvent.message.XHRID;
                    sendResponse(cachedResult, msgEvent);
                    return;
                }
            }
            var xhr = new XMLHttpRequest();
            xhr.XHRID = msgEvent.message.XHRID;
            xhr.open(request.method, request.url, true);
            if (request.method == "POST") {
                xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
            }
            xhr.onreadystatechange = function() {
              if (xhr.readyState == 4) {
                  var response = {status: xhr.status, responseText: xhr.responseText, XHRID: xhr.XHRID};
                  sendResponse(response, msgEvent);
                  //Only cache on HTTP OK and non empty body
                  if ((request.aggressiveCache || XHRCache.forceCache) && (xhr.status == 200 && xhr.responseText)) {
                      XHRCache.add(request.url, response);
                  }
              }
            }
            xhr.send(request.data);
            break;
        case 'singleClick':
            ((request.button == 1) || (request.ctrl == 1)) ? button = 'background' : button = 'foreground';
            // handle requests from singleClick module
            if (request.openOrder == 'commentsfirst') {
                // only open a second tab if the link is different...
                if (request.linkURL != request.commentsURL) {
                    // chrome.tabs.create({url: request.commentsURL});
                    var commentsTab = safari.application.activeBrowserWindow.openTab(button);
                    commentsTab.url = request.commentsURL;
                }
                // chrome.tabs.create({url: request.linkURL});
                var linkTab = safari.application.activeBrowserWindow.openTab(button);
                linkTab.url = request.linkURL;
            } else {
                // chrome.tabs.create({url: request.linkURL});
                var linkTab = safari.application.activeBrowserWindow.openTab(button);
                linkTab.url = request.linkURL;
                // only open a second tab if the link is different...
                if (request.linkURL != request.commentsURL) {
                    // chrome.tabs.create({url: request.commentsURL});
                    var commentsTab = safari.application.activeBrowserWindow.openTab(button);
                    commentsTab.url = request.commentsURL;
                }
            }
            sendResponse({status: "success"}, msgEvent);
            break;
        case 'keyboardNav':
            (request.button == 1) ? button = 'background' : button = 'foreground';
            // handle requests from keyboardNav module
            thisLinkURL = request.linkURL;
            if (thisLinkURL.toLowerCase().substring(0,4) != 'http') {
                (thisLinkURL.substring(0,1) == '/') ? thisLinkURL = 'http://www.reddit.com' + thisLinkURL : thisLinkURL = location.href + thisLinkURL;
            }
            // chrome.tabs.create({url: thisLinkURL});
            // opens tab next to current, instead of at end of tab bar
            var linkTab = safari.application.activeBrowserWindow.openTab(button, safari.application.activeBrowserWindow.tabs.indexOf(safari.application.activeBrowserWindow.activeTab)+1);
            linkTab.url = thisLinkURL;
            sendResponse({status: "success"}, msgEvent);
            break;
        case 'openLinkInNewTab':
            var focus = (request.button == true) ? 'foreground' : 'background';
            thisLinkURL = request.linkURL;
            if (thisLinkURL.toLowerCase().substring(0,4) != 'http') {
                (thisLinkURL.substring(0,1) == '/') ? thisLinkURL = 'http://www.reddit.com' + thisLinkURL : thisLinkURL = location.href + thisLinkURL;
            }
            var linkTab = safari.application.activeBrowserWindow.openTab(focus);
            linkTab.url = thisLinkURL;
            sendResponse({status: "success"}, msgEvent);
            break;
        case 'compareVersion':
            var xhr = new XMLHttpRequest();
            xhr.open("GET", request.url, true);
            xhr.onreadystatechange = function() {
              if (xhr.readyState == 4) {
                // JSON.parse does not evaluate the attacker's scripts.
                var resp = JSON.parse(xhr.responseText);
                if (typeof(msgEvent.message.forceUpdate) != 'undefined') {
                    resp.forceUpdate = msgEvent.message.forceUpdate;
                }
                sendResponse(resp, msgEvent);
              }
            }
            xhr.send();
            break;
        case 'loadTweet':
            var xhr = new XMLHttpRequest();
            xhr.open("GET", request.url, true);
            xhr.onreadystatechange = function() {
              if (xhr.readyState == 4) {
                // JSON.parse does not evaluate the attacker's scripts.
                var resp = JSON.parse(xhr.responseText);
                if (typeof(msgEvent.message.target) != 'undefined') {
                    resp.target = msgEvent.message.target;
                }
                sendResponse(resp, msgEvent);
              }
            }
            xhr.send();
            break;
        case 'getLocalStorage':
            sendResponse(localStorage, msgEvent);
            break;
        case 'saveLocalStorage':
            for (var key in request.data) {
                localStorage.setItem(key,request.data[key]);
            }
            localStorage.setItem('importedFromForeground',true);
            sendResponse(localStorage, msgEvent);
            break;
        case 'localStorage':
            switch (request.operation) {
                case 'getItem':
                    sendResponse({status: true, value: localStorage.getItem(request.itemName)}, msgEvent);
                    break;
                case 'removeItem':
                    localStorage.removeItem(request.itemName);
                    sendResponse({status: true, value: null}, msgEvent);
                    break;
                case 'setItem':
                    localStorage.setItem(request.itemName, request.itemValue);
                    sendResponse({status: true, value: null}, msgEvent);
                    // now tell all of the other tabs about this update...
                    var thisTabID = msgEvent.target;
                    var windows = safari.application.browserWindows;
                    for (var i = 0; i < windows.length; i++) {
                        var tabs = windows[i].tabs;
                        for (var j = 0; j < tabs.length; j++) {
                            if (thisTabID != tabs[j]) {
                                //Should we also filter tabs that RES won't run on?
                                if ((tabs[j]) && (tabs[j].page)) {
                                    tabs[j].page.dispatchMessage("localStorage", { requestType: "localStorage", itemName: request.itemName, itemValue: request.itemValue });
                                }
                            }
                        }
                    }
                    break;
            }
            break;
        case 'XHRCache':
            switch (request.operation) {
                case 'clear':
                    XHRCache.clear();
                    break;
            }
            break;
        default:
            sendResponse({status: "unrecognized request type"}, msgEvent);
    }
};
function sendResponse(data, event) {
    event.target.page.dispatchMessage(event.name, data);
}
safari.application.addEventListener("message",respondToMessage,false);
