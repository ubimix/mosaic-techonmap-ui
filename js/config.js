

window.appConfig =  {
    'loadUrl': '',
    'storeUrl': '',
    'loginCheckUrl': function() {return '/xwiki/bin/view/XWiki/UserIdentificationService?xpage=plain';},
    'authenticationUrl': function(id) {return '/xwiki/bin/login/XWiki/XWikiLogin?sl_provider=twitter&xredirect=/techonmap-dev/edition.html%23'+id;},
    'lastTweetUrl': function() { return '/xwiki/bin/view/m3/TwitterFeedReader?xpage=plain';}

}
