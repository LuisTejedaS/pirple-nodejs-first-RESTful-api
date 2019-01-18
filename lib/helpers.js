/*helpers for various tasks*/

//Container for al the helpers
var crypto = require('crypto');
var config = require('./config');
var helpers = {};

helpers.hash = function(str){
    if(typeof(str)=='string' && str.length > 0 ) {
        var hash = crypto.createHmac('sha256', config.hasingSecrete).update(str).digest('hex');
        return hash;
    }else{
        return false;
    }
};

//Parse a json string to an object in all cases, without throwing
helpers.parseJsonToObject = function(str){
    try{
        var obj = JSON.parse(str);
        return obj;
    }
    catch(e){
        return {};
    }
}

helpers.createRandomString = function(stringLength){
    stringLength = typeof(stringLength) == 'number' && stringLength > 0 ? stringLength : false;
    if(stringLength){
        //Define all the posible chars
        var posibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';
        var str = '';
        for (let i = 1; i <= stringLength; i++) {
             var randomCharacter = posibleCharacters.charAt(Math.floor(Math.random()* posibleCharacters.length));
             str += randomCharacter;
        }
        return str;

    } else {
        return false;
    }

}

module.exports = helpers;