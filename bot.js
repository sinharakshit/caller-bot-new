var HTTPS = require('https');

var botID = process.env.BOT_ID;

const fs = require('fs');

var request = require('request');
var in_array = require('in-array');
var mysql = require('mysql');
var async = require('async');

db_url = process.env.CLEARDB_DATABASE_URL;
var conn = mysql.createConnection(db_url);

var cc_ = require('./clash_caller.js');

String.prototype.post_text = function() {
  console.log("GM: " + this.valueOf());
  request.post('https://api.groupme.com/v3/bots/post', {
    form: {
      "bot_id": botID,
      "text": this.valueOf()
    }
  });
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min) + min);
}

function is_admin(user_id) {
  txt = fs.readFileSync('admins.txt', 'utf-8');
  admins = txt.split(',');
  ad_ = [];
  for (a in admins) ad_.push(admins[a].trim());
  return in_array(ad_, user_id);
}

function fetch_cc() {
  json = fs.readFileSync('cc.json', 'utf-8');
  ob = JSON.parse(json);
  return ob.code;
}

function save_cc(c) {
  ob = {
    code: c
  }
  json = JSON.stringify(ob);
  fs.writeFileSync('cc.json', json);
}

function save_code_db(code) {
  conn.query('UPDATE `clash_caller` SET caller_code = ?', [code]);
}

function save_log(message) {
  conn.query('INSERT INTO `log` (message, time) VALUES (?,?)', [message, (new Date().getTime())]);
}


function async_respond() {
  var request_ = JSON.parse(this.req.chunks[0]);
  if (typeof request_.sender_id != 'undefined') {
    async.waterfall([
      function(callback) {
        conn.query('SELECT * FROM `clash_caller`', function(err, res, fld) {
          callback(null, res[0].caller_code);
        });
      },
      function(cc_code, callback) {
        user_id = request_.sender_id;
        user_name = request_.name;
        var cc_code_ = cc_code;
        config = {
          'cc': cc_code_,
          'name': user_name,
          'id': user_id
        }
        cc_.config(config);
        user_info = [user_id, user_name];
        input = request_.text;
        message_ = "";
        img_ = false;
        found_command = false;

        var regex_ = {
          call: /^\/call (\d+)\s*$/i,
          call_for: /^\/call (\d+) for\s+(.*)$/i,
          clear_call: /^\/delete call (\d+)\s*$/i,
          get_call: /^\/get call (\d+)\s*$/i,
          get_calls: /^\/get calls\s*$/i,
          attack: /^\/attacked (\d+) for (\d+) star[s]?\s*$/i,
          help: /^\/help\s*(.*)$/i,
          start_war: /^\/start war (\d+)\s+(.*)$/i,
          prof_id: /^\/me\s*$/i,
          cc_url: /^\/cc\s*$/i,
          set_code: /^\/set cc\s+(.*)$/i,
          get_code: /^\/code\s*$/i,
          set_timer: /^\/set timer (start|end) ([\d]{1,2}h[\d]{1,2}m)/i,
          get_log: /^\/get log/i,
          clear_log: /^\/clear log/i
        }

        for (index in regex_) {
          if (regex_[index].test(input)) {
            found_command = true;
            console.log("COMMAND: ", index);
            switch (index) {
              case 'call':
                num_ = parseInt(input.match(regex_[index])[1]);
                cc_.call(num_, user_name);
                break;
              case 'get_log':
                cc_.get_log();
                break;
              case 'clear_log':
                do_it = cc_.is_user_admin(user_id);
                if (do_it) {
                  cc_.clear_log();
                } else {
                  message_ = "Only admins can clear log, @" + user_name;
                }
              break;
              case 'set_timer':
                do_it = cc_.is_user_admin(user_id);
                if (do_it) {
                  what_ = input.match(regex_[index])[1];
                  timer_ = input.match(regex_[index])[2];
                  cc_.update_timer(what_, timer_);
                } else {
                  message_ = "Only admins can change war timers, @" + user_name;
                }
                break;
              case 'call_for':
                num_ = parseInt(input.match(regex_[index])[1]);
                user_name = input.match(regex_[index])[2];
                cc_.call(num_, user_name);
                break;
              case 'prof_id':
                message_ = user_name + "'s id: " + user_id;
                break;
              case 'start_war':
                do_it = cc_.is_user_admin(user_id);
                if (do_it) {
                  num_ = parseInt(input.match(regex_[index])[1]);
                  enemy_name_ = input.match(regex_[index])[2];
                  cc_.start_war(num_, enemy_name_);
                } else {
                  message_ = "Only admins can start new war, @" + user_name;
                }
                break;
              case 'set_code':
                do_it = cc_.is_user_admin(user_id);
                if (do_it) {
                  db_old_cc_ = cc_code_;
                  new_cc_ = input.match(regex_[index])[1];
                  save_code_db(new_cc_);
                  message_ = "Old code -" + db_old_cc_ + "-\nNew code -" + new_cc_ + "-";
                } else {
                  message_ = "Only admins can set Clash Caller code, @" + user_name;
                }
                break;
              case 'get_code':
                message_ = cc_code_;
                break;
              case 'cc_url':
                message_ = "http://clashcaller.com/war/" + cc_code_;
                break;
              case 'clear_call':
                num_ = parseInt(input.match(regex_[index])[1]);
                cc_.delete_call(num_);
                break;
              case 'get_call':
                num_ = parseInt(input.match(regex_[index])[1]);
                cc_.get_call(num_);
                break;
              case 'get_calls':
                cc_.get_calls();
                break;
              case 'attack':
                num_ = parseInt(input.match(regex_[index])[1]);
                stars_ = parseInt(input.match(regex_[index])[2]);
                cc_.update_stars(num_, stars_);
                break;
              case 'help':
                admin_help = input.match(regex_[index])[1];
                message_ = "#COMMMANDS:\n" +
                  "/cc - Get clash caller link\n" +
                  "/call # - Call a target\n" +
                  "/delete call # - Delete call on target\n" +
                  "/get call # - Get call on target\n" +
                  "/get calls - Get all calls\n" +
                  "/attacked # for # stars - Log attack done on target\n" +
                  "/code - Get Clash Caller code\n" +
                  "/me - Get your GroupMe ID\n" +
                  "/help (-a) - Show this\n" +
                  "/get log - Get log\n";
                if (admin_help == '-a') {
                  message_ += "/set cc (code) - Set new clash caller code manually\n" +
                    "/start war (war size) (enemy name) - Start new clash caller and save\n" +
                    "/clear log - Clear log";
                }
            }
          }
        }

        if (message_.length > 0 || found_command) {
          message_.post_text();
        } else {
          if (input[0] == '/') {
            ("Invalid command: " + input + ". Type /help to view commands").post_text();
          }
        }
      }
    ]);
  }
}

exports.respond = async_respond;
