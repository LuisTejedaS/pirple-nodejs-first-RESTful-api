/*helpers for various tasks*/

//Container for al the helpers
var crypto = require('crypto');
var config = require('./config');
var https = require('https');
var querystring = require('querystring');

var helpers = {};

helpers.hash = function (str) {
    if (typeof (str) == 'string' && str.length > 0) {
        var hash = crypto.createHmac('sha256', config.hasingSecrete).update(str).digest('hex');
        return hash;
    } else {
        return false;
    }
};

//Parse a json string to an object in all cases, without throwing
helpers.parseJsonToObject = function (str) {
    try {
        var obj = JSON.parse(str);
        return obj;
    } catch (e) {
        return {};
    }
};

helpers.createRandomString = function (stringLength) {
    stringLength = typeof (stringLength) == 'number' && stringLength > 0 ? stringLength : false;
    if (stringLength) {
        //Define all the posible chars
        var posibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';
        var str = '';
        for (let i = 1; i <= stringLength; i++) {
            var randomCharacter = posibleCharacters.charAt(Math.floor(Math.random() * posibleCharacters.length));
            str += randomCharacter;
        }
        return str;

    } else {
        return false;
    }

};

helpers.sendTwilioSms = function (phone, msg, callback) {
    phone = typeof (phone) == 'string' && phone.trim().length == 10 ? phone.trim() : false;
    msg = typeof (msg) == 'string' && msg.trim().length > 0 && msg.trim().length <= 1600 ? msg.trim() : false;
    if (phone && msg) {
        var payload = {
            'From': config.twilio.fromPhone,
            'To': '+1' + phone,
            'Body': msg
        };

        var stringPayload = querystring.stringify(payload);
        var requestDetails = {
            'protocol': 'https:',
            'hostname': 'api.twilio.com',
            'method': 'POST',
            'path': '/2010-04-01/Accounts/' + config.twilio.accountSid + '/Messages.json',
            'auth': config.twilio.accountSid + ':' + config.twilio.authToken,
            'headers': {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(stringPayload),
            }
        };

        var req = https.request(requestDetails, function (res) {
            var status = res.statusCode;
            if (status == 200 || status == 201) {
                callback(false);
            } else {
                callback('Status code returned was ' + status);
            }
        });
        req.on('error', function (e) {
            callback(e);
        });

        req.write(stringPayload);
        req.end();


    } else {
        callback('Given parameters were missing or invalid');
    }
}


module.exports = helpers;