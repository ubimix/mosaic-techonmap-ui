(function(exports) {

    var http = require('http');
    var fs = require('fs')
    var umxUtils = require('./utils.js');

    var twitterUser = process.env['TWITTER_NAME'] || 'TechOnMap';
    var twitterPwd = process.env['TWITTER_PASS'] || '';
    // console.log('TWITTER_PASS:', twitterPwd);
    var twitterHost = 'api.supertweet.net';
    var twitterPort = 80;
    var twitterPath = '/1.1/statuses/home_timeline.json';

    var twitterRequestOptions = {
        hostname : twitterHost,
        port : twitterPort,
        path : twitterPath,
        method : 'GET',
        headers : {
            'Authorization' : 'Basic '
                    + new Buffer(twitterUser + ':' + twitterPwd)
                            .toString('base64')
        }
    };
    var twitterFile = './twitter.json';

    /* -------------------------------------------------------------------- */
    var timeout = (60 * 1000 /* min */) * 10;
    var timestamp = null;
    function isExpired() {
        var now = new Date().getTime();
        var expired = !timestamp || (now - timestamp > timeout);
        if (expired) {
            timestamp = now;
        }
        return expired;
    }

    function download(options, file, callback) {
        var data = '';
        var req = http.request(options, function(res) {
            console.log('STATUS: ' + res.statusCode);
            console.log('HEADERS: ' + JSON.stringify(res.headers));
            res.setEncoding('utf8');
            res.on('data', function(chunk) {
                data += chunk;
            });
            res.on('end', function() {
                fs.writeFile(file, data, function(err) {
                    callback(err);
                });
            });
        });
        req.on('error', function(e) {
            callback(e.message);
        });
        req.end();
    }

    exports.getLastTweet = function(req, res) {
        function handleResponse(err) {
            if (err) {
                umxUtils.sendError(req, res, err);
            } else {
                fs.readFile(twitterFile, 'utf8', function(err, data) {
                    if (err) {
                        umxUtils.sendError(req, res, err);
                    } else {
                        data = JSON.parse(data);
                        res.send(data);
                    }
                });
            }
        }
        if (isExpired()) {
            download(twitterRequestOptions, twitterFile, handleResponse);
        } else {
            handleResponse(null);
        }
    }

})(exports);