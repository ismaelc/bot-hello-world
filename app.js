var builder = require('botbuilder');
var restify = require('restify');
var request = require('request');

var server = restify.createServer();

server.use(restify.queryParser());

var bodyParser = require('body-parser');
server.use(bodyParser.json({
    limit: '50mb'
})); // to support JSON-encoded bodies
server.use(bodyParser.urlencoded({
    limit: '50mb',
    extended: true
})); // to support URL-encoded bodies

var BOT_ID = process.env.BOT_APP_ID;
var PRIMARY_SECRET = process.env.BOT_PRIMARY_SECRET;

var GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
var GOOGLE_CUSTOMSEARCH_CX = process.env.GOOGLE_CUSTOMSEARCH_CX;
var SEARCH_RESULT_MAX = 3;

var HOST = process.env.HOST;
var CONCUR_CLIENT_ID = process.env.CONCUR_CLIENT_ID;
var CONCUR_SCOPE = process.env.CONCUR_SCOPE;

//var BOX_API_KEY = process.env.BOX_API_KEY;

// Create LUIS Dialog that points at our model and add it as the root '/' dialog for our Cortana Bot.
//var model = process.env.LUIS_MODEL_URL; //'<your models url>';
var model = process.env.CONCUR_MODEL_URL;
var dialog = new builder.LuisDialog(model);

//var cortanaBot = new builder.TextBot();
var companyBot = new builder.BotConnectorBot({
    appId: BOT_ID,
    appSecret: PRIMARY_SECRET
});

companyBot.add('/', dialog);

// Add intent handlers

/* Concur Intents */
//dialog.on('SearchIntent', [displayEntities]);

// NOTE: custom dialog doesn't support 'next' off the bat?
// So have to rely on this format..
dialog.on('SearchIntent', [
    /*
    getQuery,
    searchQuery,
    formatReply,
    */
    sendReply
]);

/*
dialog.on('BoxIntent', [
    getQuery,
    //searchBoxQuery,
    sendReply
]);
*/

dialog.on('LoginIntent', [
    getService,
    sendReply
]);

/*
dialog.on('None', [
    function(session, args) {
        session.send('I didn\'t quite get that. Can you rephrase it to an instruction?');
    }
]);
*/

function getService(session, args, next) {

    var entity_login = builder.EntityRecognizer.findEntity(args.entities, 'login_service');
    console.log('Login: ' + JSON.stringify(entity_login.entity)); // the login service is in 'entity'
    var auth_link;

    switch (entity_login.entity.toLowerCase()) {
        case 'concur':
            auth_link = 'https://www.concursolutions.com/net2/oauth2/Login.aspx?client_id=' + CONCUR_CLIENT_ID + '&scope=' + CONCUR_SCOPE + '&redirect_uri=' + HOST + '/redirect&state='
            break;
        default:
            auth_link = 'Wot?'
    }

    next({
        response: auth_link
    });
}

function getQuery(session, args, next) {
    console.log('Session from getQuery: ' + JSON.stringify(session));
    var entity_query = builder.EntityRecognizer.findEntity(args.entities, 'query');
    console.log('Query: ' + JSON.stringify(entity_query.entity)); // the search query is in 'entity'

    next({
        response: entity_query.entity
    });
}

/*
function getBoxQuery(session, args, next) {

    var entity_query = builder.EntityRecognizer.findEntity(args.entities, 'filetype');
    console.log('Query: ' + JSON.stringify(entity_query.entity)); // the search query is in 'entity'

    next({
        response: entity_query.entity
    });
}
*/

function searchQuery(session, results, next) {

    var query = results.response;
    callGoogleSearchAPI(query, function(err, data) {
        next({
            response: data,
            error: err
        });
    });
}

/*
function searchBoxQuery(session, results, next) {

    var query = results.response;
    callBoxSearchAPI(query, function(err, data) {
        next({
            response: data,
            error: err
        });
    });
}
*/

function formatReply(session, results, next) {
    console.log('Entered formatReply()..');
    var formatted_reply = '';
    var api_response = results['response'];
    var len = api_response['items'].length;
    if (len > SEARCH_RESULT_MAX) len = SEARCH_RESULT_MAX;

    var attachments = [];

    for (var i = 0; i < len; i++) {
        formatted_reply += '[' + (i + 1) + ']: ' + api_response['items'][i]['formattedUrl'] + '\n';
        var item = api_response['items'][i];
        var thumbnail = 'http://placehold.it/65x65'; // Need a better image missing placeholder
        if (typeof(item['pagemap']['cse_thumbnail']) != 'undefined') {
            thumbnail = item['pagemap']['cse_thumbnail'][0]['src'];
        } else {
            console.log('Error: Can\'t show item ' + i + 1);
        }

        var attachment = {
            "title": item['title'], // + ' (' + item['link'] + ')',
            "titleLink": item['link'],
            "text": item['snippet'],
            //"thumbnailUrl": item['pagemap']['cse_thumbnail'][0]['src']
            "thumbnailUrl": thumbnail
        }

        console.log(attachment + '\n');

        attachments.push(attachment);
    }

    /*
    next({
        response: 'Items length: ' + api_response['items'].length
    });
    */

    console.log('attachments: ' + JSON.stringify(attachments));

    /*
    var dummy = {

        "attachments": [{
            "fallback": "Required plain-text summary of the attachment.",
            "color": "#36a64f",
            "pretext": "Optional text that appears above the attachment block",
            "author_name": "Bobby Tables",
            "author_link": "http://flickr.com/bobby/",
            "author_icon": "http://flickr.com/icons/bobby.jpg",
            "title": "Slack API Documentation",
            "title_link": "https://api.slack.com/",
            "text": "Optional text that appears within the attachment",
            "fields": [{
                "title": "Priority",
                "value": "High",
                "short": false
            }],
            "image_url": "http://my-website.com/path/to/image.jpg",
            "thumb_url": "http://example.com/path/to/thumb.png"
        }, {
            "fallback": "Required plain-text summary of the attachment.",
            "color": "#36a64f",
            "pretext": "Optional text that appears above the attachment block",
            "author_name": "Bobby Tables",
            "author_link": "http://flickr.com/bobby/",
            "author_icon": "http://flickr.com/icons/bobby.jpg",
            "title": "Slack API Documentation",
            "title_link": "https://api.slack.com/",
            "text": "Optional text that appears within the attachment",
            "fields": [{
                "title": "Priority",
                "value": "High",
                "short": false
            }],
            "image_url": "http://my-website.com/path/to/image.jpg",
            "thumb_url": "http://example.com/path/to/thumb.png"
        }]

    }
    */


    // Note: Some fields are ignored because it should be POST to Slack and not GET (as this app does through session.send) ?
    var slack_format_message = {
        "text": "Here's what I found!",
        "attachments": attachments
    }

    //slack_format_message = dummy;

    next({
        response: slack_format_message
    });
}

function sendReply(session, results) {
    //console.log("Replying: " + JSON.stringify(results['response']));
    //session.send(results['response']);
    //session.send(session);

    console.log("Session: " + JSON.stringify("User data: " + JSON.stringify(session.userData)));
    session.send(JSON.stringify(results.entities));

    /*
    session.send({
        "text": "I am a test message http://slack.com",
        "attachments": [{
            "text": "And here's an attachment!"
        }]
    });
    */
}

function callGoogleSearchAPI(query, callback_) {

    if (!query) return;

    var options = {
        url: 'https://www.googleapis.com/customsearch/v1?key=' + GOOGLE_API_KEY + '&cx=' + GOOGLE_CUSTOMSEARCH_CX + '&q=' + query,
    };

    function callback(error, response, body) {
        var result = {};
        if (!error && response.statusCode == 200) {
            result = JSON.parse(body);
            console.log('Response from Google: ' + JSON.stringify(result));
        } else {
            console.log('Error: ' + JSON.stringify(error) + "Response: " + JSON.stringify(response));
        }

        callback_(error, result);

    }

    request(options, callback);
}

/*
function callBoxSearchAPI(query, callback_) {

    if (!query) return;

    var options = {
        url: 'https://api.box.com/2.0/search?query=' + query,
        headers: {
            'Authorization': 'Bearer ' + process.env.BOX_API_KEY
        }
    };

    function callback(error, response, body) {
        var result = {};
        if (!error && response.statusCode == 200) {
            result = JSON.parse(body);
            console.log('Response from Box: ' + JSON.stringify(result));
        } else {
            console.log('Error: ' + JSON.stringify(error) + "Response: " + JSON.stringify(response));
        }

        callback_(error, result);

    }

    request(options, callback);
}
*/

/* Calendar */

/*
dialog.on('builtin.intent.calendar.change_calendar_entry', [displayEntities]);
dialog.on('builtin.intent.calendar.check_availability', [displayEntities]);
dialog.on('builtin.intent.calendar.connect_to_meeting', [displayEntities]);
dialog.on('builtin.intent.calendar.create_calendar_entry', [displayEntities]);
dialog.on('builtin.intent.calendar.delete_calendar_entry', [displayEntities]);
dialog.on('builtin.intent.calendar.find_calendar_entry', [displayEntities]);
dialog.on('builtin.intent.calendar.find_calendar_when', [displayEntities]);
dialog.on('builtin.intent.calendar.find_calendar_where', [displayEntities]);
dialog.on('builtin.intent.calendar.find_calendar_who', [displayEntities]);
dialog.on('builtin.intent.calendar.find_calendar_why', [displayEntities]);
dialog.on('builtin.intent.calendar.find_duration', [displayEntities]);
dialog.on('builtin.intent.calendar.time_remaining', [displayEntities]);
*/

/* Communication */

/*
dialog.on('builtin.intent.communication.add_contact', [displayEntities]);
dialog.on('builtin.intent.communication.assign_nickname', [displayEntities]);
dialog.on('builtin.intent.communication.find_contact', [displayEntities]);
dialog.on('builtin.intent.communication.read_aloud', [displayEntities]);
dialog.on('builtin.intent.communication.send_email', [displayEntities]);
dialog.on('builtin.intent.communication.send_text', [displayEntities]);
*/

/* My Stuff */

/*
dialog.on('builtin.intent.mystuff.find_attachment', [displayEntities]);
dialog.on('builtin.intent.mystuff.find_my_stuff', [displayEntities]);
dialog.on('builtin.intent.mystuff.search_messages', [displayEntities]);
dialog.on('builtin.intent.mystuff.transform_my_stuff', [displayEntities]);
*/

/* Places */

/*
dialog.on('builtin.intent.places.add_favorite_place', [displayEntities]);
dialog.on('builtin.intent.places.book_public_transportation', [displayEntities]);
dialog.on('builtin.intent.places.book_taxi', [displayEntities]);
dialog.on('builtin.intent.places.check_area_traffic', [displayEntities]);
dialog.on('builtin.intent.places.check_into_place', [displayEntities]);
dialog.on('builtin.intent.places.check_route_traffic', [displayEntities]);
dialog.on('builtin.intent.places.find_place', [displayEntities]);
dialog.on('builtin.intent.places.get_address', [displayEntities]);
dialog.on('builtin.intent.places.get_coupon', [displayEntities]);
dialog.on('builtin.intent.places.get_distance', [displayEntities]);
dialog.on('builtin.intent.places.get_phone_number', [displayEntities]);
dialog.on('builtin.intent.places.get_route', [displayEntities]);
dialog.on('builtin.intent.places.get_transportation_schedule', [displayEntities]);
dialog.on('builtin.intent.places.get_travel_time', [displayEntities]);
dialog.on('builtin.intent.places.make_call', [displayEntities]);
dialog.on('builtin.intent.places.show_map', [displayEntities]);
*/

/* Reminder */

/*
dialog.on('builtin.intent.reminder.change_reminder', [displayEntities]);
dialog.on('builtin.intent.reminder.create_single_reminder', [displayEntities]);
dialog.on('builtin.intent.reminder.delete_reminder', [displayEntities]);
dialog.on('builtin.intent.reminder.find_reminder', [displayEntities]);
dialog.on('builtin.intent.reminder.read_aloud', [displayEntities]);
dialog.on('builtin.intent.reminder.snooze', [displayEntities]);
dialog.on('builtin.intent.reminder.turn_off_reminder', [displayEntities]);
*/

/* Weather */

/*
dialog.on('builtin.intent.weather.change_temperature_unit', [displayEntities]);
dialog.on('builtin.intent.weather.check_weather', [displayEntities]);
dialog.on('builtin.intent.weather.check_weather_facts', [displayEntities]);
dialog.on('builtin.intent.weather.compare_weather', [displayEntities]);
dialog.on('builtin.intent.weather.get_frequent_locations', [displayEntities]);
dialog.on('builtin.intent.weather.get_weather_advisory', [displayEntities]);
dialog.on('builtin.intent.weather.get_weather_maps', [displayEntities]);
dialog.on('builtin.intent.weather.question_weather', [displayEntities]);
dialog.on('builtin.intent.weather.show_weather_progression', [displayEntities]);
*/

/* None */

//dialog.on('builtin.intent.none', [ displayEntities ]);

//dialog.onDefault(builder.DialogAction.send("I'm sorry I didn't understand. You can try other actions related to calendars, reminders, communication (e.g Email), searching your stuff, and the weather."));

function displayEntities(session, args) {
    console.log("Session: " + JSON.stringify("User data: " + JSON.stringify(session.userData)));
    session.send(JSON.stringify(args.entities));
}

//cortanaBot.listenStdin();

// Calling this before the auth below for bot comms
server.get('/redirect', function(request, response) {
    console.log("Request: " + request.params);
    response.send(request.params);
});


server.use(companyBot.verifyBotFramework({
    appId: BOT_ID,
    appSecret: PRIMARY_SECRET
}));


//server.use(helloBot.verifyBotFramework());
//server.post('/v1/messages', helloBot.verifyBotFramework(), helloBot.listen());

// Working version below...
server.post('/v1/messages', companyBot.listen());

// Removed this entire section and still works?

/*
server.post('/v1/messages', function (req, res) {
    var msg = req.body;
    console.log(msg);
    if (/^delay/i.test(msg.text)) {
        // Delay sending the reply for 5 seconds
        setTimeout(function () {
            var reply = {
                replyToMessageId: msg.id,
                to: msg.from,
                from: msg.to,
                text: 'I heard "' + msg.text.substring(6) + '"'
            };
            sendMessage(reply);
        }, 5000);
        res.send({ text: 'ok... sending reply in 5 seconds.' })
    } else {
        res.send({ text: 'I heard "' + msg.text + '". Say "delay {msg}" to send with a 5 second delay.' })
    }
});
*/


server.listen(process.env.port || 8080, function() {
    console.log('%s listening to %s', server.name, server.url);
});
