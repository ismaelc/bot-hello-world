//var utils = require('./utils.js');
var request = require('request');

//test
/*
reverseLocate({ 'address' : 'Union Square San Francisco' }, function(err, result) {
	console.log(JSON.stringify(result));
});
*/

function reverseLocate(find_obj, callback_) {

  var host = "maps.googleapis.com";
  var endpoint = "/maps/api/geocode/json";

  var address = find_obj['address'];

  /*
  utils.doRequest(host, endpoint, 'GET', {
    "address": address,
    "key": process.env.GOOGLE_API_KEY

  }, function(data) {

    var zipCode = getZipCode(data.results[0].address_components);
    var cityName = getCityName(data.results[0].address_components);

    var location = {
      "city": cityName,
      "address": data.results[0].formatted_address,
      "coordinates": data.results[0].geometry.location,
      "zipCode": zipCode
    }

    callback_(null, location);
  });
  */

  var options = {
      url: 'https://'
        + host + endpoint
        + '?key=' + process.env.GOOGLE_API_KEY
        + '&address=' + address
  };

  function callback(error, response, body) {

      if (!error && response.statusCode == 200) {

          console.log('Response from Google: ' + JSON.stringify(body));

          var data = body;

          var zipCode = getZipCode(data.results[0].address_components);
          var cityName = getCityName(data.results[0].address_components);

          var location = {
            "city": cityName,
            "address": data.results[0].formatted_address,
            "coordinates": data.results[0].geometry.location,
            "zipCode": zipCode
          }


      } else {
          console.log('Error: ' + JSON.stringify(error) + "Response: " + JSON.stringify(response));
      }

      callback_(error, location);

  }

  request(options, callback);

}

function getZipCode(addComponents) {
  var zipCode;

  for (var i = 0; i < addComponents.length; i++) {
    if (addComponents[i].types[0] == "postal_code") {
      zipCode = addComponents[i].short_name;
      break;
    }
  }

  return zipCode;
}

function getCityName(addComponents) {
  var cityName;

  for (var i = 0; i < addComponents.length; i++) {
    if (addComponents[i].types[0] == "locality") {
      cityName = addComponents[i].long_name;
      break;
    }
  }

  return cityName;
}

exports.reverseLocate = reverseLocate;
