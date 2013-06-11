(function(exports) {
    exports.sendError = function(req, res, error) {
        console.log(error);
        res.writeHead(500, {
            'Content-Type' : 'text/html'
        });
        var str = error.toJSON ? error.toJSON() : '' + error;
        res.write('<!doctype html>\n');
        res.write('<html><head>');
        res.write('<title>500 - Internal Server Error</title>\n');
        res.write('</head><body>\n');
        res.write('<h1>500 - Internal Server Error</h1>');
        res.write('<pre>');
        res.write(str);
        res.write('</pre>');
        res.write('</body>');
        res.write('</html>');
    };

})(exports);