var restify = require('restify');
var builder = require('botbuilder');
var request = require('request');

var server = restify.createServer();

var BOT_ID = process.env.BOT_APP_ID;
var PRIMARY_SECRET = process.env.BOT_PRIMARY_SECRET;

var helloBot = new builder.BotConnectorBot({ appId: BOT_ID, appSecret: PRIMARY_SECRET });
helloBot.add('/', new builder.CommandDialog()
    .matches('^set name', builder.DialogAction.beginDialog('/profile'))
    .matches('search box', builder.DialogAction.beginDialog('/search_box'))
    .matches('^quit', builder.DialogAction.endDialog())
    .onDefault(function (session) {
        if (!session.userData.name) {
            session.beginDialog('/profile');
        } else {
            session.send('Hello %s!', session.userData.name);
        }
    }));
helloBot.add('/search_box', [
    function (session) {
        /*
        if (session.userData.name) {
        */
            builder.Prompts.text(session, 'What would you like to search?');
        /*
        } else {
            builder.Prompts.text(session, 'Hi! What is your name?');
        }
        */
    },
    function (session, results) {
        session.userData.query = results.response;
        session.send('Got it! Searching ' + session.userData.name + '...');
        session.endDialog();
    }
]);
helloBot.add('/profile',  [
    function (session) {
        if (session.userData.name) {
            builder.Prompts.text(session, 'What would you like to change it to?');
        } else {
            builder.Prompts.text(session, 'Hi! What is your name?');
        }
    },
    function (session, results) {
        session.userData.name = results.response;
        //builder.Prompts.text(session, 'Got it! You are now ' + session.userData.name);
        session.send('Got it! You are now ' + session.userData.name);
        session.endDialog();
    }
]);

server.use(helloBot.verifyBotFramework({ appId: BOT_ID, appSecret: PRIMARY_SECRET }));
//server.use(helloBot.verifyBotFramework());
server.post('/v1/messages', helloBot.listen());
//server.post('/v1/messages', helloBot.verifyBotFramework(), helloBot.listen());

server.listen(process.env.port || 8080, function () {
    console.log('%s listening to %s', server.name, server.url);
});
