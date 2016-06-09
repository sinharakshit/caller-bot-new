var http, director, cool, bot, router, server, port, request;

http = require('http');
director = require('director');
bot = require('./bot.js');
request = require('request');

var in_array = require('in-array');
var mysql = require('mysql');
var async = require('async');
var moment = require('moment');


db_url = process.env.CLEARDB_DATABASE_URL;
var conn = mysql.createConnection(db_url);


router = new director.http.Router({
  '/': {
    post: bot.respond,
    get: ping
  },
  '/setup': {
    get: setup_db
  },
  '/cc': {
    get: get_code
  },
  '/log':{
    get: get_log
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

function setup_db() {
  var message_ = [];
  var res_ = this.res;
  conn.query('SELECT table_name FROM information_schema.tables WHERE table_name = ?', ['clash_caller'], function(e, r, f) {
    if (r.length == 0) {
      message_.push('Creating new table');
      conn.query('CREATE TABLE `clash_caller` (`caller_code` text NOT NULL);', function(err, res, fld) {
        conn.query('CREATE TABLE `log` (`message` text NOT NULL, `time` bigint(20) NOT NULL);');
        conn.query('INSERT INTO `clash_caller`(`caller_code`) VALUES (?)', ['xxxxx'], function(error, result, field){
          message_.push('Setup done. Go to /cc to view code');
          res_.end(message_.join("\n"));
        });
      });
    }else{
      message_.push('Table already exists, settings default values');
      conn.query('DELETE FROM `clash_caller` WHERE 1;', function(e1, r1, f1){
        conn.query('DELETE FROM `log` WHERE 1;');
        message_.push('Cleared tables');
        conn.query('INSERT INTO `clash_caller`(`caller_code`) VALUES ("xxxxx")', function(error, result, field){
          message_.push('Setup done. Go to /cc to view code');
          res_.end(message_.join("\n"));
        });
      });
    }
  });
}
function get_code(){
  var res_ = this.res;
  conn.query('SELECT * FROM `clash_caller`', function(err, res, fld) {
    res_.end('Caller code: ' + res[0].caller_code);
  });
}

function get_log(){
  var res_ = this.res;
  conn.query('SELECT * FROM `log`', function(err, res, fld){
    message_ = [];
    if(res.length > 0){
      for(i in res){
        message_.push(moment(res[i].time).format("MMMM Do, h:mm:ss a") + ": " + res[i].message);
      }
      res_.end(message_.join("\n"));
    }else{
      res_.end("Nothing logged");
    }
  });
}


function ping() {
  this.res.writeHead(200);
  message = "#COMMMANDS:\n" +
    "/cc - Get clash caller link\n" +
    "/call # - Call a target\n" +
    "/delete call # - Delete call on target\n" +
    "/get call # - Get call on target\n" +
    "/get calls - Get all calls\n" +
    "/attacked # for # stars - Log attack done on target\n" +
    "/code - Get Clash Caller code\n" +
    "/me - Get your GroupMe ID\n" +
    "/help (-a) - Show this\n" +
    "/get log - Get log\n" +
    "/set cc (code) - Set new clash caller code manually\n" +
    "/start war (war size) (enemy name) - Start new clash caller and save\n" +
    "/clear log - Clear log";

  this.res.end(message);
}
