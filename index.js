var http, director, cool, bot, router, server, port;

http = require('http');
director = require('director');
cool = require('cool-ascii-faces');
bot = require('./bot.js');

var JsonDB = require('node-json-db');
var db = new JsonDB("db", true, true);

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
  message = "/call # - Call a target\n" +
  "/delete call # - Delete call on target\n" +
  "/get call # - Get call on target\n" +
  "/get calls - Get all calls\n" +
  "/attacked # for # stars - Log attack done on target\n" +
  "/get stats - Get logged attacks details\n" +
  "/help - Show this";
  this.res.end(message);
}
