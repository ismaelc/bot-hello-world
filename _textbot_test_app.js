var builder = require('botbuilder');

var bot = new builder.TextBot();
bot.add('/', [
  function(session) {
    //session.send('Hello World');
    builder.Prompts.text(session, 'enter hi');
  },
  function(session, results) {
    session.send('done');
  }
]);

bot.processMessage({
  text: 'hi'
}, function(err, reply) {
  console.log("[LOG] reply: " + JSON.stringify(reply));
  //done();
});

bot.processMessage({
  text: 'yo'
}, function(err, reply) {
  console.log("[LOG] reply: " + JSON.stringify(reply));
});

bot.listenStdin();
