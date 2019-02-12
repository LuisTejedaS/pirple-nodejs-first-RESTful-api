/*
*Worker related tasks
*/

//Dependencies
var path = require('path');
var fs = require('fs');
var _data = require('./data');
var https = require('https');
var http = require('http');
var helpers = require('./helpers');
var url = require('url');

//instantiante the worker object

var workers = {};

workers.gatherAllChecks = function(){
    _data.list('checks', function(err, checks){
        if(!err && checks && checks.length > 0){
            checks.forEach(function(check){
                _data.read('checks', check, function(err, originalCheckData){
                    if(!err && originalCheckData){
                        workers.validateCheckData(originalCheckData);
                        
                    } else {
                        console.log("Error reading one of the checks data");
                    }
                });
            });
        } else {
            console.log("Error: Could not find any checks to proces");
        }
    })
};

//sanity checking the check-data
workers.validateCheckData = function(originalCheckData){
    originalCheckData = typeof(originalCheckData) == 'object' && originalCheckData !== null ? originalCheckData : {};
    originalCheckData.id = typeof(originalCheckData.id) == 'string' && originalCheckData.id.trim().length == 20 ? originalCheckData.id.trim() : false;
    originalCheckData.userPhone = typeof(originalCheckData.userPhone) == 'string' && originalCheckData.userPhone.trim().length == 10 ? originalCheckData.userPhone.trim() : false;
    originalCheckData.protocol = typeof(originalCheckData.protocol) == 'string' && ['http', 'https'].indexOf(originalCheckData.protocol) > -1 ? originalCheckData.protocol : false;
    originalCheckData.url = typeof(originalCheckData.url) == 'string' && originalCheckData.url.trim().length  > 0 ? originalCheckData.url.trim() : false;
    originalCheckData.method = typeof(originalCheckData.method) == 'string' && ['post', 'get', 'put', 'delete'].indexOf(originalCheckData.method) > -1 ? originalCheckData.method : false;
    originalCheckData.succesCodes = typeof(originalCheckData.succesCodes) == 'object' && originalCheckData.succesCodes instanceof Array && originalCheckData.succesCodes.length > 0 ? originalCheckData.succesCodes : false;
    originalCheckData.timeoutSeconds = typeof(originalCheckData.timeoutSeconds) == 'number'  && originalCheckData.timeoutSeconds % 1 === 0 &&  originalCheckData.timeoutSeconds >= 1 && originalCheckData.timeoutSeconds <= 5? originalCheckData.timeoutSeconds : false;

    //set the keies htat may not 

    originalCheckData.state = typeof(originalCheckData.state) == 'string' && ['up', 'down'].indexOf(originalCheckData.state) > -1 ? originalCheckData.state : 'down';
    originalCheckData.lastChecked = typeof(originalCheckData.lastChecked) == 'number'  && originalCheckData.lastChecked > 0 ? originalCheckData.lastChecked : false;

    if(originalCheckData.id &&
        originalCheckData.userPhone   &&    
        originalCheckData.protocol&&
        originalCheckData.url&&
        originalCheckData.method&&
        originalCheckData.succesCodes&&
        originalCheckData.timeoutSeconds ){

            workers.performCheck(originalCheckData);
        } else {
            console.log('Error: One of the checks is not properly formatted. skipping it.')
        }
};

//perform the check send the original check  data

workers.performCheck = function(originalCheckData){
    var checkOutcome = {
        'error': false,
        'responseCode' : false
    };
    var outcomeSent = false;
    var parsedUrl = url.parse(originalCheckData.protocol + '://' + originalCheckData.url, true);
    var hostName = parsedUrl.hostname;
    var path = parsedUrl.path;

    var requestDetails = {
        'protocol' : originalCheckData.protocol+':',
        'hostname': hostName,
        'method': originalCheckData.method.toUpperCase(),
        'path': path,
        'timeout': originalCheckData.timeoutSeconds * 1000

    };

    //isntantiate the request object 
    var _moduleToUse = originalCheckData.protocol == 'http' ? http: https;
    var req = _moduleToUse.request(requestDetails, function(res){
        var status = res.statusCode;

        checkOutcome.responseCode = status;

        if(!outcomeSent){
            workers.procesCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true;
        }
    });

    req.on('error', function(e){

        checkOutcome.error = {
            'error' :true,
            'value' : e
        };
        if(!outcomeSent){
            workers.procesCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true;
        }
    });

    
    req.on('timeout', function(e){

        checkOutcome.error = {
            'error' :true,
            'value' : 'timeout'
        };
        if(!outcomeSent){
            workers.procesCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true;
        }
    });

    req.end();
};

//processs the check outcome, update the check data as need, tirgger an alert if needed
//special logic for accomodating a check that has never been tested before (don't alert on that one)
workers.procesCheckOutcome = function(originalCheckData, checkOutcome){
    //DEcide if the check is considered up or dwon
    var state = !checkOutcome.error && checkOutcome.responseCode && originalCheckData.succesCodes.indexOf(checkOutcome.responseCode) > -1? 'up' : 'down';
    var alertWarranted = originalCheckData.lastChecked && originalCheckData.state != state ? true : false;
    var newCheckData = originalCheckData;
    newCheckData.state = state;
    newCheckData.lastChecked = Date.now();

    _data.update('checks', newCheckData.id, newCheckData, function(err){
        if(!err){
            if(alertWarranted){
                workers.alertUserToStatusChange(newCheckData);
            } else {
                console.log('check outcome has not changed, no alert neede');
            }

        } else {
            console.log("Error trying to update one of the checks");
        }
    })
};

workers.alertUserToStatusChange = function(newCheckData){
    var msg= 'Alert: Your checks for ' + newCheckData.method.toUpperCase() + ' ' + newCheckData.protocol + '://'+  newCheckData.url+ ' is currently ' + newCheckData.state;
    helpers.sendTwilioSms(newCheckData.userPhone , msg, function(err){
        if(!err){
            console.log("Success: User was alerted to a status change in their check, via sms: ",msg);
        } else {
            console.log("Error: Could not send sms alert to user who had a state change in their check",err);

        }
    })
};


//timer to execute the worker-process once per minute
workers.loop = function(){
    setInterval(function(){
        workers.gatherAllChecks();
    },1000 * 60);
};

//init script
workers.init = function(){
    //Execute all the checks
    workers.gatherAllChecks();

    //call the loop
    workers.loop();
};

module.exports = workers;