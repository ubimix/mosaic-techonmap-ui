

window.appConfig =  {
    'loadUrl': function() {return '/xwiki/bin/view/XWiki/ExportService?id=m3&xpage=plain';},
    'storeUrl': function() {return '/xwiki/bin/view/XWiki/StoreService?id=m3&xpage=plain';},
    'loginCheckUrl': function() {return '/xwiki/bin/view/XWiki/UserIdentificationService?xpage=plain';},
    'authenticationUrl': function(id) {return '/xwiki/bin/login/XWiki/XWikiLogin?sl_provider=twitter&xredirect=/techonmap-dev/edition.html%23'+id;},
    'lastTweetUrl': function() { return '/xwiki/bin/view/m3/TwitterFeedReader?xpage=plain';}

}
