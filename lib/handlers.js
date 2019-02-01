/*
Request handlers
*/

//Dependencies
var _data =require('./data');
var helpers =require('./helpers');
var config =require('./config');

//Define the handlers
var handlers = {};

//Users handlers
handlers.users = function(data, callback){
    var acceptableMethods = ['post', 'get', 'put', 'delete'];
   if(acceptableMethods.indexOf(data.method)> -1){
       handlers._users[data.method](data, callback);
   }
   else{
       callback(405);
   }
};

//container for the users submethods

handlers._users = {};

//users - post
handlers._users.post = function(data,callback){
    var firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim():false;
    var lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim():false;
    var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim():false;
    var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim():false;
    var tosAgreement = typeof(data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true ? true : false;

    if(firstName && lastName && phone && tosAgreement)
    {
        _data.read('users', phone, function(err,data){
            if(err){
                var hashedPassword = helpers.hash(password);
                if(hashedPassword)
                {
                    //create the user object
                    var userObject = {
                        'firstName': firstName,
                        'lastName':lastName,
                        'phone':phone,
                        'hashedPassword':hashedPassword,
                        'tosAgreement': true,
                    };
                    _data.create('users', phone, userObject, function(err){

                        if(!err){
                            callback(200);
                        }else{
                            console.log(err);
                            callback(500, {'Error': 'Could not create the new user'});

                        }
                    });
                }else{
                    callback(500, {'Error': 'Could not hash the user\'s password' });
                }
               
            }else{
                callback(400, {'Error':'A user with that number already exists'}); 
            }
        });
    }
    else{
        callback(400, {'Error':'Missing required fields'}); 
    }
};

//users - get
//required data: phone
//optional data: none
handlers._users.get = function(data,callback){
  //check that the phone number is valid  
  var phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim():false;
    if(phone){
        //Get the token from the headers
        var token = typeof(data.headers.token) == 'string'? data.headers.token:  false;
        //verify the given token is valid 
        handlers.tokens.verifyToken(token, phone, function(tokenIsValid){
            if(tokenIsValid){
                _data.read('users', phone, function(err, data){
                    if(!err && data){
                        //remove hashpass
                        delete data.hashedPassword;
                        callback(200, data);
                    }else{
                        callback(404);
                    }
                });
            }else{
                callback(403,{'Error': 'Missing required token in header, or token is invalid'});
            }
        });
    }
    else{
        callback(400, {'Error': 'Missing required fields'});
    }
};

//users - post
//required data: phone
//optional data: firstName lastname password (at least one must be specified) 
handlers._users.put = function(data,callback){
  var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim():false;
  
  var firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim():false;
  var lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim():false;
  var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim():false;
  
  if(phone){
      if(firstName || lastName || password){
        var token = typeof(data.headers.token) == 'string'? data.headers.token:  false;
        handlers.tokens.verifyToken(token, phone, function(tokenIsValid){
            if(tokenIsValid){
                _data.read('users', phone, function(err, userData){
                    if(!err && userData){
                        //update the fields necessary        
                        if(firstName){
                            userData.firstName = firstName;
                        }
                        if(lastName){
                            userData.lastName = lastName;
                        }
                        if(password){
        
                            userData.hashedPassword = helpers.hash(password);
                        }
                        _data.update('users', phone, userData, function(err){
                            if(!err){
                                callback(200);
                            }else{
                                console.log(err);
                                callback(500, {'Error' : 'could not update the user'});
                            }
                        });        
                    }else{
                        callback(404, {'Error' : 'The specified user does not exist'});
                    }
                });
            }else{
                callback(403,{'Error': 'Missing required token in header, or token is invalid'});
            }
         });
        }else{
            callback(400, {'Error' : 'Missing fields to update'});
        }
  }else{
      callback(400, {'Error' : 'Missing required fields'});
  }

}

//users - delete
//requiered field :phone
handlers._users.delete = function(data,callback){
    var phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim():false;
    if(phone){
        var token = typeof(data.headers.token) == 'string'? data.headers.token:  false;
        handlers.tokens.verifyToken(token, phone, function(tokenIsValid){
            if(tokenIsValid){
                _data.read('users', phone, function(err, userData){
                    if(!err && userData){
                        _data.delete('users', phone, function(err){
                            if(!err){
                               //Delete checks
                                var userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks: [];
                                var checksToDelete = userChecks.length;
                                if(checksToDelete > 0){
                                    var checksDeleted = 0;
                                    var deletionErrors = false;
                                    userChecks.forEach(function(checkID){
                                        _data.delete('checks', checkID, function(err){
                                            if(err){
                                            deletionErrors = true;
                                            }
                                            checksDeleted++;
                                            if(checksDeleted == checksToDelete){
                                                if(!deletionErrors){
                                                    callback(200);
                                                } else {
                                                    callback(500, {'Error' : 'Errors encountered while attempting to delete all of the users checks'});
                                                }
                                            }
                                        });
                                    });
                                }else{
                                    
                                }
                            }else{
                                callback(500, {'Error' : 'Could not delete the specified user'});
                            }
                        });
                    }else{
                        callback(400, {'Error' : 'could not find the specified user'});
                    }
                });
            }else{
                callback(403,{'Error': 'Missing required token in header, or token is invalid'});
            }
        });

    }
    else{
        callback(400, {'Error': 'Missing required fields'});
    }
};



//tokens handlers
handlers.tokens = function(data, callback){
    var acceptableMethods = ['post', 'get', 'put', 'delete'];
   if(acceptableMethods.indexOf(data.method)> -1){
       handlers._tokens[data.method](data, callback);
   }
   else{
       callback(405);
   }
};

handlers._tokens = {};

//required data: phone, password
//optinal data : none
handlers._tokens.post = function(data, callback){
    var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim():false;
    var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim():false;
  
    if(phone && password){
        _data.read('users', phone, function(err,userData){
            if(!err && userData){
                var hashedPassword = helpers.hash(password);
                if(hashedPassword == userData.hashedPassword){
                    var tokenId = helpers.createRandomString(20);
                    var expires = Date.now() + 1000 * 60 *60;
                    var tokenObject = {
                        'phone' : phone,
                        'id' : tokenId,
                        'expires' : expires
                    };
                    _data.create('tokens', tokenId, tokenObject, function(err){
                        if(!err){
                            callback(200, tokenObject)

                        } else {
                            callback(500, {'Error': 'Could not create the new token'});
                        }
                    });

                } else {
                    callback(400, {'Error':'Password did not match the specified user\s stored passowrod'});
                }
            } else {
                callback(400, {'Error' : 'Could not find specified user'});
            }
        });

    } else {
        callback(400, {'Error' : 'Missing required fields'} );
    }
};

//required data:id
//optional data:none
handlers._tokens.get = function(data, callback){
//check the id is valid
var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim():false;
if(id){
    _data.read('tokens', id, function(err, tokenData){
        if(!err && tokenData){ 
            callback(200, tokenData);
        }else{
            callback(404);
        }
    });
}
else{
    callback(400, {'Error': 'Missing required fields'});
}
};

//tokens - put
// Required data: id, extend
// Optional data : none
handlers._tokens.put = function(data, callback){
    var id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim():false;
    var extend = typeof(data.payload.extend) == 'boolean' && data.payload.extend == true? true : false;
    if(id && extend){
        _data.read('tokens', id, function(err, tokenData){
            if(!err && tokenData){
                if(tokenData.expires > Date.now()){
                    tokenData.expires = Date.now() + 1000 * 60 * 60;
                    _data.update('tokens', id, tokenData, function(err){
                        if(!err){
                            callback(200);
                        } else {
                         callback(500, {'Error' : 'Could not update token\'s expiration'});
                        }
                    })

                }else{
                callback(400, {'Error' : 'The token has already expired and can not be extended'});

                }
            } else {
                callback(400, {'Error' : 'Specified token does not exist'});
            }
        })

    } else {
        callback(400, {'Error' : 'Missing required fields or fields ar invalid'});
    }

};


handlers._tokens.delete = function(data, callback){
    var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim():false;
    if(id){
        _data.read('tokens', id, function(err, data){
            if(!err && data){
                _data.delete('tokens', id, function(err){
                    if(!err){
                        callback(200);
                    }else{
                        callback(500, {'Error' : 'Could not delete the specified token'});
                    }
                });
            }else{
                callback(400, {'Error' : 'could not find the specified token'});
            }
        });
    }
    else{
        callback(400, {'Error': 'Missing required fields'});
    }
};


// verify if a given id is currently valid for a given user

handlers.tokens.verifyToken = function(id, phone, callback){
    _data.read('tokens',id, function(err, tokenData){
        if(!err && tokenData){
            if(tokenData.phone == phone && tokenData.expires> Date.now()){
                callback(true);
            }else{
                callback(false);
            }
        }else{
            callback(false);
        }
    });
};

//tokens handlers
handlers.checks = function(data, callback){
    var acceptableMethods = ['post', 'get', 'put', 'delete'];
   if(acceptableMethods.indexOf(data.method)> -1){
       handlers._checks[data.method](data, callback);
   }
   else{
       callback(405);
   }
};

//container for checks metodos

handlers._checks = {};

//checks post
//require data: protocol, ulr, method, sucessCodes, timeoutSeconds
//optional data : none
handlers._checks.post = function(data, callback){
//validate inpunts      

        var protocol = typeof(data.payload.protocol) == 'string' && ['https', 'http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
        var url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
        var method = typeof(data.payload.method) == 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
        var succesCodes = typeof(data.payload.succesCodes) == 'object' && data.payload.succesCodes instanceof Array && data.payload.succesCodes.length > 0 ? data.payload.succesCodes : false;

        var timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

        if(protocol && url && method && succesCodes && timeoutSeconds){
        
            var token = typeof(data.headers.token) == 'string'? data.headers.token :  false;
            _data.read('tokens', token, function(err, tokenData){
                if(!err && tokenData){
                    var userPhone = tokenData.phone;

                    _data.read('users', userPhone, function(err, userData){
                        if(!err && userData){
                            var userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks: [];
                            if(userChecks.length < config.maxChecks){
                                var checkID = helpers.createRandomString(20);
                                var checkObject = {
                                    'id': checkID,
                                    'userPhone' : userPhone,
                                    'protocol' : protocol,
                                    'url' : url,
                                    'method' : method,
                                    'succesCodes' : succesCodes,
                                    'timeoutSeconds' : timeoutSeconds,
                                };
                                _data.create('checks', checkID, checkObject, function(err){
                                    if(!err){
                                        userData.checks = userChecks;
                                        userData.checks.push(checkID);

                                        _data.update('users', userPhone, userData, function(err){
                                            if(!err){
                                                callback(200, checkObject);
                                            } else {
                                                callback(500, {'Error': 'could not update the user with the new check'});
                                            }
                                        });
                                    } else {
                                        callback('500', {'Error' : 'Could not create the check' });
                                    }
                                });
                            }else{
                                callback(400, {'Error':'the user already has the maximum number of checks ('+ config.maxChecks + ')'});
                            }
                        }else{
                            callback(403);
                        }
                    });

                }else{
                    callback(403);
                }
            });

        }else{
            callback(400, {'Error': 'Missing required inputs, or inputs are invalid'});
        }
};

//required data:id
//optional data:none
handlers._checks.get = function(data, callback){
    //check the id is valid
    var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
    if(id){
        _data.read('checks', id, function(err, chekData){
            if(!err && chekData){ 

            var token = typeof(data.headers.token) == 'string'? data.headers.token:  false;
            handlers.tokens.verifyToken(token, chekData.userPhone, function(tokenIsValid){
                if(tokenIsValid){
                    callback(200, chekData  );
                }else{
                    callback(403);
                }
            });
               
            }else{
                callback(404);
            }
        });
    }
    else{
        callback(400, {'Error': 'Missing required fields'});
    }
};


//required data:id
//optional data:protocol, ulr, method, sucessCodes, timeoutSeconds
handlers._checks.put = function(data, callback){
    //check the id is valid
    var id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;
    
    var protocol = typeof(data.payload.protocol) == 'string' && ['https', 'http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
    var url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
    var method = typeof(data.payload.method) == 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
    var succesCodes = typeof(data.payload.succesCodes) == 'object' && data.payload.succesCodes instanceof Array && data.payload.succesCodes.length > 0 ? data.payload.succesCodes : false;
    var timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

    if(id){
        if(protocol || url || method || succesCodes || timeoutSeconds){

        } else {
            callback(400, {'Error' : 'Missing required fields to update'});
        }
        _data.read('checks', id, function(err, checkData){
            if(!err && checkData){
                var token = typeof(data.headers.token) == 'string'? data.headers.token:  false;
                handlers.tokens.verifyToken(token, checkData.userPhone, function(tokenIsValid){
                    if(tokenIsValid){
                       //update the check where necessary
                       if(protocol){
                           checkData.protocol = protocol;
                       }
                       if(url){
                            checkData.url = url;
                        }
                        if(method){
                            checkData.method = method;
                        }
                        if(succesCodes){
                            checkData.succesCodes = succesCodes;
                        }
                        if(timeoutSeconds){
                            checkData.timeoutSeconds = timeoutSeconds;
                        }
                        _data.update('checks', id, checkData, function(err){
                            if(!err){
                                callback(200);
                            } else{
                                callback(500, {'Error' : 'Could not update the check'});
                            }
                        });
                    }else{
                        callback(403);
                    }
                });                
            } else {
            callback(400, {'Error' : 'Check ID did not exist'});
            }
        });

    } else {
        callback(400, {'Error' : 'Missing required fields'});
    }
};

//checks delete
//Required data: id
//optional:none
handlers._checks.delete = function(data, callback){
    var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim():false;
    if(id){
        _data.read('checks', id, function(err, checkData){
            if(!err && checkData){
                var token = typeof(data.headers.token) == 'string'? data.headers.token:  false;
                handlers.tokens.verifyToken(token, checkData.userPhone, function(tokenIsValid){
                    if(tokenIsValid){
                        _data.delete('checks', id, function(err){
                            if(!err){
                                _data.read('users', checkData.userPhone, function(err, userData){
                                    if(!err && userData){

                                        var userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks: [];
                                        //remove the deleted check
                                        var checkPosition = userChecks.indexOf(id);
                                        if(checkPosition > -1){
                                            userChecks.splice(checkPosition,1);
                                            _data.update('users', checkData.userPhone, userData, function(err){
                                                if(!err){
                                                    callback(200);

                                                }else{
                                            callback(500, {'Error' : 'Could not update the user'});

                                                }
                                            });
                                        } else {
                                            callback(500, {'Error' : 'Could not find the check on the user\'s object, so could not be removed'});

                                        }
                                    }else{
                                        callback(500, {'Error' : 'could not find the user who created the check'});
                                    }
                                });
                            } else {
                                callback(500, {'Error' : 'could not delete the check data'});
                            }
                        });

                    }else{
                        callback(403);
                    }
                });
            } else {
                callback(400, {'Error' : 'could not find the specified check'});
            }
        });
    } else {
        callback(400, {'Error': 'Missing required fields'});
    }
};

//ping hadler

handlers.ping = function (data, callback) {
    callback(200);
};

//not found handler
handlers.notFound = function (data, callback) {
    callback(404);
};


//Export the module
module.exports = handlers;
