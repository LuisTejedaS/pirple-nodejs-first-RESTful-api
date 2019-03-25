var app = {};

console.log("hello");

app.config = {
    'sessionToken': false
};

app.client = {};

app.client.request = function (headers, path, method, queryStringObject, payload, callback) {
    headers = typeof (headers) == 'objec' && headers !== null ? headers : {};
    path = typeof (path) == 'string' ? path : '/';
    method = typeof (method) == 'string' && ['POST', 'GET', 'PUT', 'DELETE'].indexOf(method) > -1 ? method.toUpperCase() : 'GET';
    queryStringObject = typeof (queryStringObject) == 'objec' && queryStringObject !== null ? queryStringObject : {};
    payload = typeof (payload) == 'objec' && payload !== null ? payload : {};
    callback = typeof (callback) == 'function' ? callback : false;

    var requestUrl = path + '?';
    var counter = 0;

    for (var queryKey in queryStringObject) {
        if (queryStringObject.hasOwnProperty(queryKey)) {
            counter++;

            if(counter > 1){
                requestUrl += '&';
            }
            requestUrl += queryKey + '=' + queryStringObject[queryKey];
        }
    }

    var xhr = new XMLHttpRequest();

    xhr.open(method, requestUrl, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    
    //for each header sent, add it to the request

    for(var headerKey in headers){
        if(headers.hasOwnProperty(headerKey)){
            xhr.setRequestHeader(headerKey, heades[headerKey]);
        }
    }

    //if ther is a current session token set, ad that as a header

    if(app.config.sessionToken){
        xhr.setRequestHeader("token", app.config.sessionToken.id);
        
    }

    xhr.onreadystatechange = function(){
        if(xhr.readyState == XMLHttpRequest.DONE){
            var statusCode = xhr.status;
            var responseReturned = xhr.responseText;

            if(callback){
                try{
                    var parsedResponse = JSON.parse(responseReturned);
                    callback(statusCode, parsedResponse);
                }catch(e){
                    callback(statusCode, false);
                }
            }

        }
    }
var payloadString = JSON.stringify(payload);
xhr.send(payloadString);

};