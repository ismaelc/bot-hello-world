var builder = require('botbuilder');

// Create LUIS Dialog that points at our model and add it as the root '/' dialog for our Cortana Bot.
var model = process.env.LUIS_MODEL_URL; //'<your models url>';
var dialog = new builder.LuisDialog(model);
var cortanaBot = new builder.TextBot();
cortanaBot.add('/', dialog);

// Add intent handlers
dialog.on('builtin.intent.alarm.set_alarm', builder.DialogAction.send('Creating Alarm'));
dialog.on('builtin.intent.alarm.delete_alarm', builder.DialogAction.send('Deleting Alarm'));

dialog.on('builtin.intent.places.get_travel_time', [
    function(session, args) {
        session.send(JSON.stringify(args.entities));
    }
]);

dialog.on('builtin.intent.communication.send_email', [
    function(session, args) {
        session.send(JSON.stringify(args.entities));
    }
]);
dialog.onDefault(builder.DialogAction.send("I'm sorry I didn't understand. I can only create & delete alarms."));

cortanaBot.listenStdin();