/*
 * Server related Tasks
 * 
 */
//Dependencies

var http = require('http');
var https = require('https');
var url = require("url");
var StringDecoder = require('string_decoder').StringDecoder;
var config = require('./config');
var fs = require("fs");
var _data = require('./data');
var handlers = require('./handlers');
var helpers = require('./helpers');
var path = require('path');

var server = {};

//TODO get rid of this
//helpers.sendTwilioSms('4158375309', 'Hello!', function(err){
//    console.log('this was the error', err);
//});
//testing
//_data.Create('test', 'newFile', {'foo':'bar'}, function(err){
//console.log('this was the error', err);
//});

//_data.read('test', 'newFile1',  function(err, data){
//   console.log('this was the error', err, 'and this was the data ' + data);
//   });

//testing
//_data.update('test', 'newFile', {'fizz':'buzz'}, function(err){
//console.log('this was the error we', err);
//});

//testing
//_data.delete('test', 'newFile', function(err){
//console.log('this was the error', err);
//});

//Instantiating the http server
server.httpServer = http.createServer(function (req, res) {
    server.unifiedServer(req, res);
});



server.httpsServerOptions = {
    'key': fs.readFileSync(path.join(__dirname, '/../https/key.pem')),
    'cert': fs.readFileSync(path.join(__dirname, "/../https/cert.pem"))
};

//instantiante the HTTPS server
server.httpsServer = https.createServer(server.httpsServerOptions, function (req, res) {
    server.unifiedServer(req, res);
});




//All the server logic for http and https server
server.unifiedServer = function (req, res) {
    // Get the url and parse it
    var parsedURL = url.parse(req.url, true);
    //Get the path
    var path = parsedURL.pathname;

    var trimmedPath = path.replace(/^\/+|\/+$/g, "");

    //Get the querystring as an object
    var queryStringObject = parsedURL.query;

    //Get the http method
    var method = req.method.toLocaleLowerCase();

    //Get the headers as an object
    var headers = req.headers;

    //Get the payload, if any
    var decoder = new StringDecoder('utf-8');
    var buffer = '';
    req.on('data', function (data) {
        buffer += decoder.write(data);
    });

    req.on('end', function () {
        buffer += decoder.end();

        //choose the handler this request should go to
        var chosenHandler = typeof (server.router[trimmedPath]) !== 'undefined' ? server.router[trimmedPath] : handlers.notFound;

        chosenHandler = trimmedPath.indexOf('public/') > -1 ? handlers.public : chosenHandler;

        //construct the data objecto to send to the handler
        var data = {
            'trimmedPath': trimmedPath,
            'queryStringObject': queryStringObject,
            'method': method,
            'headers': headers,
            'payload': helpers.parseJsonToObject(buffer)
        };

        //route the request to the handler especified in the router
        chosenHandler(data, function (statusCode, payload, contentType) {
            contentType = typeof (contentType) == 'string' ? contentType : 'json';

            //use the status code called back by the handler, or default to 200
            statusCode = typeof (statusCode) === 'number' ? statusCode : 200;


            var payloadString = '';
            //return the response parts
            if (contentType == 'json') {
                res.setHeader('Content-Type', 'application/json');
                payload = typeof (payload) === 'object' ? payload : {};
                payloadString = JSON.stringify(payload);
            }

            if (contentType == 'html') {
                res.setHeader('Content-Type', 'text/html');
                payloadString = typeof (payload) == 'string' ? payload : '';
            }

            if (contentType == 'favicon') {
                res.setHeader('Content-Type', 'image/x-icon');
                payloadString = typeof (payload) != 'undefined' ? payload : '';
            }

            if (contentType == 'css') {
                res.setHeader('Content-Type', 'text/css');
                payloadString = typeof (payload) != 'undefined'  ? payload : '';
            }

            if (contentType == 'png') {
                res.setHeader('Content-Type', 'image/png');
                payloadString = typeof (payload) != 'undefined'  ? payload : '';
            }

            if (contentType == 'jpg') {
                res.setHeader('Content-Type', 'image/jpeg');
                payloadString = typeof (payload) != 'undefined'  ? payload : '';
            }
            if (contentType == 'plain') {
                res.setHeader('Content-Type', 'text/plain');
                payloadString = typeof (payload) != 'undefined' ? payload : '';
            }
            res.writeHead(statusCode);
            res.end(payloadString);



            //Log the request path
            console.log('request received on path: ' + trimmedPath + " with this method " + method + " and with this query string parameters ", queryStringObject);
            console.log('request received with these headers: ', headers);
            console.log("request received with this payload: ", buffer);
            console.log("Returning this response: ", statusCode, payloadString);

        });



    });
};


//init script

server.init = function () {
    //start the http server

    //Start the server, and have it listen on port 3000
    server.httpServer.listen(config.httpPort, function () {
        console.log('\x1b[36m%s\x1b[0m', "the server is listening on port " + config.httpPort + " in " + config.envName + " mode");

    });

    //Start the HTTPS server
    server.httpsServer.listen(config.httpsPort, function () {
        console.log('\x1b[35m%s\x1b[0m', "the server is listening on port " + config.httpsPort + " in " + config.envName + " mode");
    });
}

//define a request router

server.router = {
    "": handlers.index,
    "account/create": handlers.accountCreate,
    "account/edit": handlers.accountEdit,
    "account/deleted": handlers.accountDeleted,
    "session/create": handlers.sessionCreate,
    "session/deleted": handlers.sessionDeleted,
    "checks/all": handlers.checkList,
    "checks/create": handlers.checksCreate,
    "checks/edit": handlers.checksEdit,
    "ping": handlers.ping,
    'api/users': handlers.users,
    'api/tokens': handlers.tokens,
    'api/checks': handlers.checks,
    'favicon.ico': handlers.favicon,
    'public': handlers.public
};

module.exports = server;