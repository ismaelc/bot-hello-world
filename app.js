var restify = require('restify');
var builder = require('botbuilder');
var request = require('request');

var server = restify.createServer();

var BOT_ID = process.env.BOT_APP_ID;
var PRIMARY_SECRET = process.env.BOT_PRIMARY_SECRET;

var helloBot = new builder.BotConnectorBot({
    appId: BOT_ID,
    appSecret: PRIMARY_SECRET
});
helloBot.add('/', new builder.CommandDialog()
    .matches('^set name', builder.DialogAction.beginDialog('/profile'))
    .matches('^box find', builder.DialogAction.beginDialog('/box-find'))
    .matches('^quit', builder.DialogAction.endDialog())
    .onDefault(function(session) {
        if (!session.userData.name) {
            session.beginDialog('/profile');
        } else {
            session.send('Hello %s!', session.userData.name);
        }
    })
);

helloBot.add('/box-find', [

    function(session) {
        if (session.dialogData.query) {
            builder.Prompts.text(session, 'What else do you want to search?');
        } else {
            builder.Prompts.text(session, 'What do you want to search?');
        }
    },
    function(session, results, next) {
        
        console.log("User response: " + results.response);
        session.dialogData.query = results.response.trim();

        if (!session.dialogData.api_response && session.dialogData.query) {

            var options = {
                url: 'https://api.box.com/2.0/search?query=' + session.dialogData.query,
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


                next({
                    response: result
                });

            }

            request(options, callback);


        } else {
            console.log("Went to endDialog on first waterfall..");
            session.endDialog(); // causes body.options error
        }

    },
    /*
    // Need this if we are callini next within this function
    function(session, args, next) {
        console.log("Args: " + JSON.stringify(args));
        //        session.endDialog();

        if (!session.dialogData.api_response) {

            var options = {
                url: 'https://api.box.com/2.0/search?query=mp3',
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


                next({
                    response: result
                });

                //helloBot.beginDialog('/api-response');
                //session.endDialog();
            }

            request(options, callback);


        } else {
            console.log("Went to endDialog on first waterfall..");
            session.endDialog(); // causes body.options error
            //console.log("..after endDialog");



        }
    },
    */
    function(session, results) {
        console.log("Gets here");
        session.dialogData.api_response = results.response;
        //session.send(JSON.stringify("Yo " + results.response));
        //session.endDialog("Got here: " + JSON.stringify(results.response)); // causes endless loop

        session.endDialog(); // not reached with .send before it
        console.log("Got here too");
        helloBot.process
    }


]);

/*
helloBot.add('/api-response', function(session) {
   //session.send('yo!');
   session.endDialog('YO!!!'); 
});
*/

helloBot.add('/profile', [
    function(session) {
        if (session.userData.name) {
            builder.Prompts.text(session, 'What would you like to change it to?');
        } else {
            builder.Prompts.text(session, 'Hi! What is your name?');
        }
    },
    function(session, results) {
        session.userData.name = results.response;
        //builder.Prompts.text(session, 'Got it! You are now ' + session.userData.name);
        //session.send('Got it! You are now ' + session.userData.name);
        session.endDialog();
    }
]);

server.use(helloBot.verifyBotFramework({
    appId: BOT_ID,
    appSecret: PRIMARY_SECRET
}));
//server.use(helloBot.verifyBotFramework());
server.post('/v1/messages', helloBot.listen());
//server.post('/v1/messages', helloBot.verifyBotFramework(), helloBot.listen());

server.listen(process.env.port || 8080, function() {
    console.log('%s listening to %s', server.name, server.url);
});