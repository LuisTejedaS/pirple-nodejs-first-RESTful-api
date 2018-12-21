/*
* library for storing and editing data
*/
//Dependencies
var fs= require('fs');
var path = require('path');


//container for this module
var lib = {};

//base directory f the data folder

lib.baseDir = path.join(__dirname, '/../.data/')

//write data to a file
lib.Create = function(dir, file, data, callback){
    //open the file for writing
    fs.open(lib.baseDir + dir + '/' + file + '.json', 'wx', function(err, fileDescriptor){
        if(!err && fileDescriptor){
            //Convert data to string 
            var stringData = JSON.stringify(data);
            //write to file and closeit
            fs.writeFile(fileDescriptor, stringData, function(err) {
                if(!err){
                    fs.close(fileDescriptor, function(err){
                        if(!err){
                            callback(false);

                        }else{
                            callback('Error closing new file');
                        }
                    });
                }else{
                    callback('error writing to new file');
                }

            });
            
        }else{
            callback('Couls not create new file, it may already exist');
        }
    });
};

//read data from a file
lib.read = function(dir, file, callback){
    fs.readFile(lib.baseDir+dir+'/'+ file+'.json', 'utf8', function(err,data){
        callback(err, data);
    });
};

lib.update = function(dir, file, data, callback){
//open the file for writing
fs.open(lib.baseDir+dir+'/'+ file+'.json', 'r+', 0o666, function(err,fileDescriptor){
    if(!err && fileDescriptor){
        var stringData = JSON.stringify(data);
        fs.truncate(fileDescriptor, function(err){
            if(!err){
                //write and close
                fs.writeFile(fileDescriptor, stringData, function(err) {
                    if(!err){
                        fs.close(fileDescriptor, function(err){
                            if(!err){
                                callback(false);
    
                            }else{
                                callback('Error closing new file');
                            }
                        });
                    }else{
                        callback('error writing to new file');
                    }    
                });
            }else{
                callback('Error truncating file');
            }
        });
    }else{
        callback('could not open the file or may not exist yet');
    }
});
};

//
module.exports = lib;