window.appConfig = {
    'loadUrl' : function() {
        // return '/api/items?' + Math.random();
        // return './data/data.json';
        return '../api/resources/export'
    },
    'storeUrl' : function(point) {
        console.log(point);
        var id = '';
        if (point && point.properties && point.properties.id)
            id = point.properties.id;
        return '/api/resources/' + id;

    },
    'loginCheckUrl' : function() {
        return '/api/auth/user';
    },
    'authenticationUrl' : function(id) {
        return '/api/auth/twitter?redirect=/map/edition.html%23' + id;
    },
    'lastTweetUrl' : function() {
        return '/api/twitter/last';
    }

}
