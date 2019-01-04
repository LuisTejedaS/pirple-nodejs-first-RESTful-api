/*
Request handlers
*/

//Dependencies
var _data =require('./data');
var helpers =require('./helpers');

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
                    _data.Create('users', phone, userObject, function(err){

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
//@TODO only let an authenticated user access their object. Don't let them acces other info
handlers._users.get = function(data,callback){
  //check that the phone number is valid  
  var phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim():false;
    if(phone){
        _data.read('users', phone, function(err, data){
            if(!err && data){
                //remove hashpass
                delete data.hashedPassword;
                callback(200, data);
            }else{
                callback(404);
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
//@TODO only let an authenticated user access their object. Don't let them update other info
handlers._users.put = function(data,callback){
  var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim():false;
  
  var firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim():false;
  var lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim():false;
  var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim():false;
  var tosAgreement = typeof(data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true ? true : false;

  if(phone){
      if(firstName || lastName || password){

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
                })

            }else{
                callback(404, {'Error' : 'The specified user does not exist'});
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
//@TODO only let an authenticated user access their object. Don't let them update other info
//@TODO cleanup (delete) any other data files associated with this user
handlers._users.delete = function(data,callback){
    var phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim():false;
    if(phone){
        _data.read('users', phone, function(err, data){
            if(!err && data){
                _data.delete('users', phone, function(err){
                    if(!err){
                        callback(200);
                    }else{
                        callback(500, {'Error' : 'Could not delete the specified user'});
                    }
                });
            }else{
                callback(400, {'Error' : 'could not find the specified user'});
            }
        });
    }
    else{
        callback(400, {'Error': 'Missing required fields'});
    }
}

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
