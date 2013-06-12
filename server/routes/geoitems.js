var mongo = require('mongodb');
var umxUtils = require('./utils.js');

var Server = mongo.Server, Db = mongo.Db, BSON = mongo.BSONPure;

var server = new Server('localhost', 27017, {
    auto_reconnect : true
});
db = new Db('geoitems', server, {
    safe : true
});
// db.geoitems.ensureIndex({"geometry.coordinates" : "2dsphere"});

db
        .open(function(err, db) {
            if (!err) {
                console.log("Connected to 'geoitems' database");
                db
                        .collection(
                                'geoitems',
                                {
                                    safe : true
                                },
                                function(err, collection) {
                                    if (err) {
                                        console
                                                .log("The 'geoitems' collection doesn't exist. Creating it with sample data...");
                                        populateDB();
                                    }
                                });
            }
        });

exports.findById = function(req, res) {
    var id = req.params.id;
    console.log('Retrieving geoitem: ' + id);
    db.collection('geoitems', function(err, collection) {
        collection.findOne({
            '_id' : new BSON.ObjectID(id)
        }, function(err, item) {
            res.send(item);
        });
    });
};

exports.findByBounds = function(req, res) {
    var bounds = req.query.bounds;
    if (bounds) {
        bounds = JSON.parse(bounds);
        bounds = getRect(bounds[0], bounds[1]);
        console.log(bounds);
        db.collection('geoitems', function(err, collection) {
            collection.find({
                "geometry.coordinates" : {
                    $geoWithin : {
                        $geometry : {
                            type : "Polygon",
                            coordinates : [ bounds ]
                        }
                    }
                }
            }).toArray(function(err, items) {
                if (err) {
                    umxUtils.sendError(req, res, err);
                } else {
                    res.send(items);
                }
            });

        });

    } else {
        console.log('no bounds provided !');
        umxUtils.sendError(req, res, new Error('no bounds provided !'));
    }
}

/**
 * @param first
 *            an array containing lat/lng of the first point of the area
 * @param second
 *            an array containing lat/lng of the second point of the area
 */
function getRect(first, second) {
    var max = {
        lat : Math.max(first[0], second[0]),
        lng : Math.max(first[1], second[1])
    }
    var min = {
        lat : Math.min(first[0], second[0]),
        lng : Math.min(first[1], second[1])
    }
    var result = [ [ max.lat, min.lng ], [ max.lat, max.lng ],
            [ min.lat, max.lng ], [ min.lat, min.lng ], [ max.lat, min.lng ] ];
    return result;
}

exports.findAll = function(req, res) {
    db.collection('geoitems', function(err, collection) {
        var query = {};
        var dirty = req.query.dirty;
        dirty = ('' + dirty).toLowerCase();
        if (dirty === 'true' || dirty === '1') {
            query = {
                dirty : true
            };
        } else if (dirty === 'all') {
            query = {};
        } else {
            query = {
                dirty : false
            }
        }
        collection.find(query).toArray(function(err, items) {
            res.send(items);
        });
    });
};

exports.addGeoItem = function(req, res) {
    var geoitem = req.body;
    geoitem.geometry = geoitem.geometry || {};
    var coords = geoitem.geometry.coordinates = geoitem.geometry.coordinates
            || [];
    var ok = false;
    if (coords) {
        var len = coords.length || 0;
        for ( var i = 0; i < len; i++) {
            coords[i] = parseFloat(coords[i]);
        }
    }
    geoitem.dirty = true;
    // console.log('Adding geoitem: ' + JSON.stringify(geoitem));
    db.collection('geoitems', function(err, collection) {
        collection.insert(geoitem, {
            safe : true
        }, function(err, result) {
            if (err) {
                umxUtils.sendError(req, res, err);
            } else {
                console.log('Success: ' + JSON.stringify(result[0]));
                res.send(result[0]);
            }
        });
    });
}

exports.updateGeoItem = function(req, res) {
    var id = req.params.id;
    var geoitem = req.body;
    delete geoitem._id;
    console.log('Updating geoitem: ' + id);
    console.log(JSON.stringify(geoitem));
    db.collection('geoitems', function(err, collection) {
        collection.update({
            '_id' : new BSON.ObjectID(id)
        }, {
            $set : geoitem
        }, {
            safe : true
        }, function(err, result) {
            if (err) {
                umxUtils.sendError(req, res, err);
            } else {
                console.log('' + result + ' document(s) updated');
                res.send(geoitem);
            }
        });
    });
}

exports.deleteGeoItem = function(req, res) {
    var id = req.params.id;
    console.log('Deleting geoitem: ' + id);
    db.collection('geoitems', function(err, collection) {
        collection.remove({
            '_id' : new BSON.ObjectID(id)
        }, {
            safe : true
        }, function(err, result) {
            if (err) {
                umxUtils.sendError(req, res, err);
            } else {
                console.log('' + result + ' document(s) deleted');
                res.send(req.body);
            }
        });
    });
}

/*--------------------------------------------------------------------------------------------------------------------*/
// Populate database with sample data -- Only used once: the first time the
// application is started.
// You'd typically not find this code in a real-life app, since the database
// would already exist.
var populateDB = function() {

    var fs = require('fs');
    var file = __dirname + '/data.json';

    fs.readFile(file, 'utf8', function(err, data) {
        if (err) {
            console.log('Error: ' + err);
            return;
        }

        var data = JSON.parse(data);
        var list = data.features;
        var len = list && list.length ? list.length : 0;
        for ( var i = 0; i < len; i++) {
            var item = list[i];
            item.dirty = false;
        }
        console.dir(data);

        db.collection('geoitems', function(err, collection) {
            collection.ensureIndex({
                "geometry.coordinates" : "2dsphere"
            });

            console.log('[' + data.features.length + '] items to insert.');
            collection.insert(data.features, {
                safe : true
            }, function(err, result) {
                if (err) {
                    console.log("ERROR!", err);
                } else {
                    console.log('[' + data.features.length + '] items were inserted.');
                }
            });
        });

    });

};