
== Required software ==

* NodeJS
* MongoDB
* Git 

== Launching ==
 
> cd server
> npm install
> nodejs ./server.js
# To start as a deamon:
> nohup nodejs ./server.js > output.log &

See http://linux.101hacks.com/unix/nohup-command/

Open the browser: 
> http://localhost:3000/

== API == 

All individual items are formatted as GeoJSON points.
 
=== List of items ===

These services return an array of GeoJSON points.

* GET /geoitems - list of all validated (non-dirty) items
* GET /geoitems?dirty=false - same as the previous; list of all validated (non-dirty) items  
* GET /geoitems?dirty=true - list all non-validated (dirty) items  
* GET /geoitems?dirty=all - list of all items (validated and not validated) 

* GET /data/data.json - same as '/geoitem'; this rule could be commented in 
  the 'server.js' file to load data from the static '/data/data.json' file; 

=== Individual items ===

* GET /geoitems/:id - read an individual GeoJSON-point with the specified identifier 
  (ex: '/geoitems/51b7468d6c6488e417000001')

Disabled features:
* PUT /geoitems/:id - updates an item with the specified identifier;
  content of the request should contain a GeoJSON-point 
* DELETE /geoitems/:id - deletes an item with the specified identifier

=== Twitter account === 

To retrieve the latest tweets this service uses the http://www.supertweet.net/ 
twitter proxy. 
The following environment variables are used to define access to tweets:
* TWITTER_NAME - the name of the tweeter account (as registered in the SuperTweet service)
  By default it is 'TechOnMap'.
* TWITTER_PASS - a mandatory password to access the service.

> export TWITTER_PASS=MyPass
> node ./server.js 
   

   

 