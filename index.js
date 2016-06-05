var http, director, cool, bot, router, server, port, request;

http = require('http');
director = require('director');
bot = require('./bot.js');
request = require('request');


router = new director.http.Router({
  '/': {
    post: bot.respond,
    get: ping
  }
});

server = http.createServer(function(req, res) {
  req.chunks = [];
  req.on('data', function(chunk) {
    req.chunks.push(chunk.toString());
  });

  router.dispatch(req, res, function(err) {
    res.writeHead(err.status, {
      "Content-Type": "text/plain"
    });
    res.end(err.message);
  });
});

port = Number(process.env.PORT || 5000);
server.listen(port);
function ping() {
  this.res.writeHead(200);
  message = "#COMMMANDS:\n" +
    "/cc - Get clash caller link\n" +
    "/call # - Call a target\n" +
    "/delete call # - Delete call on target\n" +
    "/get call # - Get call on target\n" +
    "/get calls - Get all calls\n" +
    "/attacked # for # stars - Log attack done on target\n" +
    "/help - Show this\n" +
    "/cool guy - cool guy face\n" +
    "/nsfw - ;)";

  this.res.end(message);
}
