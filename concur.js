var concur = require('concur-platform');
var async = require('async');
var Type = require('type-of-is');
var google = require('./google.js');

//testSegments();

function testSegments() {

  var get_obj = {
    'access_token': '<ignore this>'
  }

  getSegments(get_obj, function(err, result) {

    console.log(result);

  });

}

function getSegments(access_token, callback_) {

  //var access_token = get_obj['access_token'];
  console.log('[getSegments token]: ' + access_token);

  var finalResult = function(err, result) {

    if (!err) {
      //console.log("[getSegments]: " + JSON.stringify(result));
      callback_(null, result);
    } else {
      console.log('[getSegments Error]: ' + JSON.stringify(err));
      callback_(err, null);
    }
  }

  var addLocationToSegment = function(item, callback) {

    var segment = item;

    if (!segment) {
      callback({
        "Message": "No upcoming trips found"
      }, null);
      //return;
    } else {

      //console.log("Segment %j", segment);

      var city;
      var address;

      if (segment.SegmentType == "Air") {

        var d = new Date();
        /*
        if (d < (new Date(segment.StartDateUtc))) city = segment.StartCityCode;
        else city = segment.EndCityCode;
        */
        city = segment.EndCityCode;
        address = city + " airport";

      } else if (segment.SegmentType == "Hotel") {

        city = segment.StartCityCode;
        address = segment.Name;
      }

      google.reverseLocate({
        'address': address
      }, function(err, result) {

        //console.log('[google.reverseLocate]: ' + JSON.stringify(result));
        var location = result;

        segment.Location = location;

        callback(null, segment);
      });
    }

  }

  async.waterfall([

      // 1. Get upcoming itinerary from several tripIDs
      function(callback) {
        var options = {
          oauthToken: access_token
        }

        concur.itinerary.get(options)
          .then(function(data) {

            console.log('[concur.itinerary]: ' + JSON.stringify(data));

            if (data && data.length > 0) {
              var itinArray = data;
              itinArray.sort(function(a, b) {
                return new Date(a.StartDateLocal) - new Date(b.StartDateLocal)
              });

              var d = new Date();
              var i = 0;
              while (i < itinArray.length && d > new Date(itinArray[i].EndDateLocal)) i++;

              callback(null, itinArray[i].TripId);
            } else finalResult(null, []);
          })
          .fail(function(error) {
            console.log('[concur.itinerary error]: ' + JSON.stringify(error));
            callback(error, null);
          });
      },

      // 2. Collect all segments (Hotel + Air) and sort according to travel date/time
      function(tripId, callback) {

        if (!tripId) callback({
          "Message": "No upcoming trips found"
        }, null);

        var options = {
          oauthToken: access_token,
          id: tripId
        }

        console.log('[tripId]: ' + tripId);

        concur.itinerary.get(options)
          .then(function(data) {

            //console.log('[concur.itinerary tripId]: ' + JSON.stringify(data));

            try {
              var bookings = data.Itinerary.Bookings.Booking;
              var segmentArray = [];

              for (var i = 0; i < bookings.length; i++) {

                //console.log('Now checking: ' + JSON.stringify(bookings[i]));


                if (typeof(bookings[i].Segments) != 'undefined') {

                  //console.log('----Now checking: ' + JSON.stringify(bookings[i]['Segments']));


                  if (typeof(bookings[i].Segments.Hotel) != "undefined") {
                    bookings[i].Segments.Hotel.SegmentType = "Hotel";
                    segmentArray.push(bookings[i].Segments.Hotel);
                  }
                  if (typeof(bookings[i].Segments.Air) != "undefined") {
                    // 'Air' could be an array, or not
                    if (Type.is(bookings[i].Segments.Air, Array)) {
                      var airArray = bookings[i].Segments.Air;
                      for (var j = 0; j < airArray.length; j++) {
                        airArray[j].SegmentType = "Air";
                        segmentArray.push(airArray[j]);
                      }
                    } else {
                      bookings[i].Segments.Air.SegmentType = "Air";
                      segmentArray.push(bookings[i].Segments.Air);
                    }
                  }

                }

              }

              segmentArray.sort(function(a, b) {
                return new Date(a.StartDateUtc) - new Date(b.StartDateUtc)
              });

            } catch (err) {
              callback(err, null);
            }

            callback(null, segmentArray);
          })
          .fail(function(error) {
            console.log('[concur.itinerary tripid error]: ' + JSON.stringify(error));
            callback(error, "Error (2): " + error);
          });
      },

      // 3. Identify upcoming segment and flag it
      function(segmentArray, callback) {

        //console.log("Segments %j", JSON.stringify(segmentArray));

        var d = new Date();
        var i = 0;
        while (i < segmentArray.length && d > new Date(segmentArray[i].StartDateUtc)) i++;

        var j = 0;
        for (j = 0; j < segmentArray.length; j++) {

          // flag whether next segment or not
          if (i == j) segmentArray[j].IsNext = "true";
          else segmentArray[j].IsNext = "false";

        }

        callback(null, segmentArray);
      },

      // 4. Get coordinate and addresses for segment location using Google Geocode API
      function(segment_array, callback) {

        async.map(segment_array, addLocationToSegment, function(err, results) {
          if (err) {
            callback(err, null);
          } else {
            //console.log('[addLocationToSegment]: ' + JSON.stringify(results));
            callback(null, results);
          }
        });
      }

    ],

    finalResult
  );
}

function addSegmentsToPersons(person_array, callback_) {

  var addSegmentsToPerson = function(item, callback) {

    // userData == { 'access_token': ... 'f_name': ...}

    var user_data = JSON.parse(item['userData']);

    //getSegments(item['userData'], function(err, result) {
    getSegments(user_data['access_token'], function(err, result) {
      if (err) {
        console.log('[addSegmentsToPerson error]: ' + JSON.stringify(err));
        callback(err, null);
      } else {
        item.Segments = result;
        callback(null, item);
      }
    });

  }

  async.map(person_array, addSegmentsToPerson, function(err, results) {
    if (err) {
      console.log('[addSegmentsToPersons error]: ' + JSON.stringify(err));
      callback_(err, null);
    } else {
      console.log('[addSegmentsToPersons]: ' + JSON.stringify(results));
      callback_(null, results);
    }
  });

}

exports.getSegments = getSegments;
exports.addSegmentsToPersons = addSegmentsToPersons;
