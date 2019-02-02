/*
*Worker related tasks
*/

//Dependencies
var path = require('path');
var fs = require('fs');
var _data = require('./data');
var https = require('https');
var https = require('http');
var helpers = require('./helpers');
var ulr = require('url');

//instantiante the worker object

var workers = {};

workers.gatherAllChecks = function(){
    _data.list('checks', function(err, checks){
        if(!err && checks && checks.length > 0){
            checks.forEach(function(check){
                _data.read('checks', check, function(err, originalCheckData){
                    if(!err && originalCheckData){
                        
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