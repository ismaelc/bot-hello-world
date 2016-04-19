var builder = require('botbuilder');
var restify = require('restify');

var server = restify.createServer();

var BOT_ID = process.env.BOT_APP_ID;
var PRIMARY_SECRET = process.env.BOT_PRIMARY_SECRET;

// Create LUIS Dialog that points at our model and add it as the root '/' dialog for our Cortana Bot.
var model = process.env.LUIS_MODEL_URL; //'<your models url>';
var dialog = new builder.LuisDialog(model);

//var cortanaBot = new builder.TextBot();
var cortanaBot = new builder.BotConnectorBot({
    appId: BOT_ID,
    appSecret: PRIMARY_SECRET
});

cortanaBot.add('/', dialog);

// Add intent handlers
dialog.on('builtin.intent.alarm.set_alarm', builder.DialogAction.send('Creating Alarm'));
dialog.on('builtin.intent.alarm.delete_alarm', builder.DialogAction.send('Deleting Alarm'));

dialog.on('builtin.intent.places.get_travel_time', [
    function(session, args) {
        session.send(JSON.stringify(args.entities));
    }
]);

dialog.on('builtin.intent.communication.send_email', [ displayEntities ]);

dialog.onDefault(builder.DialogAction.send("I'm sorry I didn't understand. I can only create & delete alarms."));

function displayEntities(session, args) {
     session.send(JSON.stringify(args.entities));
}

//cortanaBot.listenStdin();

server.use(cortanaBot.verifyBotFramework({
    appId: BOT_ID,
    appSecret: PRIMARY_SECRET
}));
//server.use(helloBot.verifyBotFramework());
server.post('/v1/messages', cortanaBot.listen());
//server.post('/v1/messages', helloBot.verifyBotFramework(), helloBot.listen());

server.listen(process.env.port || 8080, function() {
    console.log('%s listening to %s', server.name, server.url);
});