

window.appConfig =  {
    //'loadUrl': function() {return '/xwiki/bin/view/ubimix/ExportService?id=wiki&xpage=plain';},
    'loadUrl': function() {return '/data/data.json';},
    'storeUrl': function() {return '/xwiki/bin/view/ubimix/StoreService?id=wiki&xpage=plain';},
    'loginCheckUrl': function() {return '/xwiki/bin/view/ubimix/UserIdentificationService?xpage=plain';},
    'authenticationUrl': function(id) {return '/xwiki/bin/login/XWiki/XWikiLogin?sl_provider=twitter&xredirect=/techonmap-dev/edition.html%23'+id;},
    'lastTweetUrl': function() { return '/xwiki/bin/view/ubimix/TwitterFeedReader?xpage=plain';}

}
