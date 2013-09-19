window.appConfig = {
    'loadUrl' : function() {
        //return '/api/items?' + Math.random();
        return './data/data.json';
    },
    'storeUrl' : function() {
        return '/api/items';
    },
    'loginCheckUrl' : function() {
        return '/api/auth';
    },
    'authenticationUrl' : function(id) {
        return '/auth/twitter?xredirect=/techonmap/edition.html%23' + id;
    },
    'lastTweetUrl' : function() {
        return '/api/twitter/last';
    }

}
