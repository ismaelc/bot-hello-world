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
    .matches('^call api', builder.DialogAction.beginDialog('/call-api'))
    .matches('^quit', builder.DialogAction.endDialog())
    .onDefault(function(session) {
        if (!session.userData.name) {
            session.beginDialog('/profile');
        } else {
            session.send('Hello %s!', session.userData.name);
        }
    }));

helloBot.add('/call-api', [

    function(session, args, next) {
        //session.userData.query = results.response;
        //session.send('Calling API.. ' + session.userData.query + '...');

        var options = {
            url: 'https://api.github.com/repos/request/request',
            headers: {
                'User-Agent': 'request'
            }
        };

        function callback(error, response, body) {
            var info = {};
            if (!error && response.statusCode == 200) {
                info = JSON.parse(body);
                console.log(info.stargazers_count + " Stars");
                console.log(info.forks_count + " Forks");
                //session.send(info.stargazers_count + " Stars");
                //session.endDialog();
            }

            /*
            next({
                response: info
            });
            */
            
            session.endDialog(info.stargazers_count + " Stars");
        }

        request(options, callback);

    }
    /*
    ,
    function(session, results) {
        console.log("Gets here");
        session.userData.api_response = results.response;
        //session.send(JSON.stringify(results));
        session.endDialog();
    }
    */
]);


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