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
    'logoutUrl' : function() {
        return '/api/logout?redirect=/';
    },
    'authenticationUrls' : function(service, id) {
        var endpoints = {
            twitter : '/api/auth/twitter',
            google : '/api/auth/google',
            facebook : '/api/auth/facebook'
        };
        if (service && endpoints[service])
            return endpoints[service] + '?redirect=edition.html%23' + id;
        else
            return '/login';
    },
    'lastTweetUrl' : function() {
        return '/api/twitter/last';
    }

}
