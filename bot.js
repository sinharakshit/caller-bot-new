var HTTPS = require('https');

var botID = process.env.BOT_ID;

const fs = require('fs');

var request = require('request');
var in_array = require('in-array');

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
  for(a in admins) ad_.push(admins[a].trim());
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

function respond() {
  var request_ = JSON.parse(this.req.chunks[0]);

  cc_code = fetch_cc();

  user_id = request_.sender_id;
  user_name = request_.name;
  config = {
    'cc': cc_code,
    'name': user_name,
    'id': user_id
  }
  cc_.config(config);

  user_info = [user_id, user_name];
  input = request_.text.toLowerCase();
  message = "";
  img_ = false;
  found_command = false;

  var regex_ = {
    call: /^\/call (\d+)\s*$/,
    call_for: /^\/call (\d+) for\s+(.*)$/,
    clear_call: /^\/delete call (\d+)\s*$/,
    get_call: /^\/get call (\d+)\s*$/,
    get_calls: /^\/get calls\s*$/,
    attack: /^\/attacked (\d+) for (\d+) star[s]?\s*$/,
    get_stats: /^\/get stats\s*$/,
    help: /^\/help\s*(.*)$/,
    cool: /^\/cool guy\s*$/,
    start_war: /^\/start war (\d+)\s+(.*)$/,
    prof_id: /^\/me\s*$/,
    cc_url: /^\/cc\s*$/,
    set_code: /^\/set cc\s+(.*)$/,
    get_code: /^\/code\s*$/
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
        case 'call_for':
          num_ = parseInt(input.match(regex_[index])[1]);
          user_name = input.match(regex_[index])[2];
          cc_.call(num_, user_name);
          break;
        case 'prof_id':
          message_ = user_name + "'s id: " + user_id;
          message_.post_text();
          break;
        case 'sexy_pic':
          "https://groupme.com/join_group/21845882/OFir1M".post_text();
          break;
        case 'start_war':
          do_it = is_admin(user_id);
          if (do_it) {
            num_ = parseInt(input.match(regex_[index])[1]);
            enemy_name_ = input.match(regex_[index])[2];
            cc_.start_war(num_, enemy_name_);
          } else {
            ("Only admins can start new war, @" + user_name).post_text();
          }
          break;
        case 'set_code':
          do_it = is_admin(user_id);
          if (do_it) {
            db_old_cc_ = fetch_cc();
            new_cc_ = input.match(regex_[index])[1];
            save_cc(new_cc_);
            message_ = "Old code -" + db_old_cc_  + "-\nNew code -" + new_cc_ + "-"
            message_.post_text();
          } else {
            ("Only admins can set Clash Caller code, @" + user_name).post_text();
          }
          break;
        case 'get_code':
          fetch_cc().post_text();
          break;
        case 'cc_url':
          cc_code_ = fetch_cc();
          message_ = "http://clashcaller.com/war/" + cc_code_;
          message_.post_text();
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
          message = "#COMMMANDS:\n" +
            "/cc - Get clash caller link\n" +
            "/call # - Call a target\n" +
            "/delete call # - Delete call on target\n" +
            "/get call # - Get call on target\n" +
            "/get calls - Get all calls\n" +
            "/attacked # for # stars - Log attack done on target\n" +
            "/code - Get Clash Caller code\n" +
            "/me - Get your GroupMe ID\n" +
            "/help (-a) - Show this\n";
          if (admin_help == '-a') {
            message += "/set cc (code) - Set new clash caller code manually\n" +
              "/start war (war size) (enemy name) - Start new clash caller and save";
          }
          message.post_text();
          break;
      }
    }
  }
  if (request_.text && !found_command) {
    this.res.writeHead(200);
    if (request_.text[0] == "/") {
      message = "Invalid command: " + request_.text + ". Type /help to view commands";
      message.post_text();
    }
    this.res.end();
  } else {
    this.res.writeHead(200);
    this.res.end();
  }
}

exports.respond = respond;
