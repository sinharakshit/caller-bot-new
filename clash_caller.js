var HTTPS = require('https');

var botID = process.env.BOT_ID;

const fs = require('fs');

var request = require('request');
var in_array = require('in-array');

var my_clan_name = "Your clan name here";
var war_call_timer = 6;
var user_name = "";
var user_id = "";
var caller_code = "";

String.prototype.post_text = function() {
  console.log("GM: " + this.valueOf());
  request.post('https://api.groupme.com/v3/bots/post', {
    form: {
      "bot_id": botID,
      "text": this.valueOf()
    }
  });
}
function hm(t) {
  t = Math.abs(t);
  var h = Math.floor(t / 3600000);
  if (h > 0) {
    var m = Math.floor((t - h * 3600000) / 60000);
    var ret = h + 'h ' + m + 'm';
    return "(" + ret + ")";
  }
  var m = Math.floor((t - h * 3600000) / 60000);
  if (m > 0) {
    var ret = m + 'm';
    return "(" + ret + ")";
  }
  return '1m';
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

function get_hours(n) {
  return 1000 * 60 * 60 * n;
}

function get_diff(call_time, check_time) {
  st_ = new Date(check_time).getTime();
  ct_ = new Date(call_time).getTime() + get_hours(war_call_timer);
  diff_ = st_ - ct_;
  if (diff_ > 0) {
    return "expired";
  } else {
    return diff_;
  }
}

function get_time_diff(check_time, war_start) {
  time = 0;
  if (check_time < war_start) {
    time = war_start - check_time;
  } else {
    time = war_start + get_hours(24) - check_time;
  }
  return hm(time);
}

function get_calls(b_) {
  ret_ = [];
  check_time_ = new Date((check_time = b_.general.checktime)).getTime()
  war_start_ = new Date((war_start = b_.general.starttime)).getTime();
  war_started_ = check_time_ < war_start_;
  for (i in b_.calls) {
    in_ = parseInt(b_.calls[i].posy) + 1;
    call_time = b_.calls[i].calltime;
    call_time_ = new Date(call_time).getTime();
    if (call_time_ < war_start_) {
      call_time = war_start;
    }
    time = get_diff(call_time, check_time);
    if (time != 'expired' || war_started_) {
      if (war_started_) {
        time_ = '(called)';
      } else {
        time_ = hm(time);
      }
      stars_ = 0;
      if ((st_ = parseInt(b_.calls[i].stars)) > 1) {
        stars_ = st_ - 2;
      }
      ret_[in_] = {
        'playername': b_.calls[i].playername,
        'stars': stars_,
        'expire': time_
      }
    }
  }
  return ret_;
}

function get_bases(b_) {
  ret_ = [];
  for (i in b_.calls) {
    in_ = parseInt(b_.calls[i].posy);
    if (typeof ret_[in_] == 'undefined') {
      ret_[in_] = [];
    }
    ret_[in_].push(b_.calls[i]);
  }
  return ret_;
}

exports.cc_url = function() {
  cc_code_ = fetch_cc();
  gm_text_ = 'http://clashcaller.com/war/' + cc_code_;
  gm_text_.post_text();
  return gm_text_;
}
exports.cc_code = function() {
  cc_code_ = fetch_cc();
  return cc_code_;
}
exports.config = function(data) {
  caller_code = data.cc;
  user_name = data.name;
  user_id = data.id;
}
exports.delete_call = function(number) {
  request.post('http://clashcaller.com/api.php', {
    form: {
      'REQUEST': 'GET_FULL_UPDATE',
      'warcode': caller_code
    }
  }, function(err, http, body) {
    if(body.match(/Invalid War ID/)){
      ("Invalid war ID: " + caller_code).post_text();
      return;
    }
    b_ = JSON.parse(body);
    bases_ = get_bases(b_)[number - 1];
    posx_ = bases_.length;
    found = false
    for (j in bases_) {
      console.log(bases_[j]);
      if (bases_[j].playername == user_name && !found) {
        posx_ = bases_[j].posx;
        found = true;
      }
    }
    if (found) {
      request.post('http://clashcaller.com/api.php', {
        form: {
          'REQUEST': 'DELETE_CALL',
          'warcode': caller_code,
          'posy': number - 1,
          'posx': posx_
        }
      }, function(err, http, body) {
        gm_text_ = "Deleted calls on #" + number + " by " + user_name;
        gm_text_.post_text();
      });
    } else {
      gm_text_ = "You have no calls on #" + number + ", " + user_name;
      gm_text_.post_text();
    }

  });
}
exports.start_war = function(war_size, enemy_name) {
  war_id = '';
  request.post('http://clashcaller.com/api.php', {
    form: {
      'REQUEST': 'CREATE_WAR',
      'cname': my_clan_name,
      'ename': enemy_name,
      'size': war_size,
      'timer': war_call_timer,
      'searchable': 0
    }
  }, function(err, http, body) {
    war_test = /war\//;
    if (war_test.test(body)) {
      war_id = body.replace(/war\//, '');
      save_cc(war_id);
      gm_text_ = "Started new clash caller (" + war_id + "). Type:\n/cc - to view link";
      gm_text_.post_text();
    }
  });
}
exports.update_stars = function(number, stars) {
  request.post('http://clashcaller.com/api.php', {
    form: {
      'REQUEST': 'GET_FULL_UPDATE',
      'warcode': caller_code
    }
  }, function(err, http, body) {
    if(body.match(/Invalid War ID/)){
      ("Invalid war ID: " + caller_code).post_text();
      return;
    }
    b_ = JSON.parse(body);
    bases_ = get_bases(b_)[number - 1];
    posx_ = bases_.length;
    found = false
    for (j in bases_) {
      console.log(bases_[j]);
      if (bases_[j].playername == user_name && !found) {
        posx_ = bases_[j].posx;
        found = true;
      }
    }
    if (found) {
      request.post('http://clashcaller.com/api.php', {
        form: {
          'REQUEST': 'UPDATE_STARS',
          'warcode': caller_code,
          'posy': number - 1,
          'posx': posx_,
          'value': stars + 2
        }
      }, function(err, http, body) {
        gm_text_ = "Logged " + stars + " stars on #" + number;
        gm_text_.post_text();
      });
    } else {
      gm_text_ = "You have no calls on #" + number + ", " + user_name;
      gm_text_.post_text();
    }
  });
}
exports.call = function(number, user_name) {
  request.post('http://clashcaller.com/api.php', {
    form: {
      'REQUEST': 'GET_FULL_UPDATE',
      'warcode': caller_code
    }
  }, function(err, http, body) {
    if(body.match(/Invalid War ID/)){
      ("Invalid war ID: " + caller_code).post_text();
      return;
    }
    b_ = JSON.parse(body);
    called_ = get_calls(b_)[number];
    if (typeof called_ == 'undefined') {
      request.post('http://clashcaller.com/api.php', {
        form: {
          'REQUEST': 'APPEND_CALL',
          'warcode': caller_code,
          'posy': number - 1,
          'value': user_name
        }
      }, function(err, http, body) {
        gm_text_ = "Called #" + number + " for " + user_name;
        gm_text_.post_text();
      });
    } else {
      gm_text_ = "#" + number + " called by " + called_.playername + " expiring in " + called_.expire;
      gm_text_.post_text();
    }
  });
}
exports.get_call = function(number) {
  request.post('http://clashcaller.com/api.php', {
    form: {
      'REQUEST': 'GET_FULL_UPDATE',
      'warcode': caller_code
    }
  }, function(err, http, body) {
    if(body.match(/Invalid War ID/)){
      ("Invalid war ID: " + caller_code).post_text();
      return;
    }
    b_ = JSON.parse(body);
    called_ = get_calls(b_)[number];
    if (typeof called_ == 'undefined') {
      gm_text_ = "Target #" + number + " open";
    } else {
      if (called_.stars > 0) {
        gm_text_ = "#" + number + " attacked by " + called_.playername + " for " + called_.stars + " stars";
      } else {
        gm_text_ = "#" + number + " called by " + called_.playername + " " + called_.expire;
      }
    }
    gm_text_.post_text();
  });
}
exports.get_calls = function() {
  request.post('http://clashcaller.com/api.php', {
    form: {
      'REQUEST': 'GET_FULL_UPDATE',
      'warcode': caller_code
    }
  }, function(err, http, body) {
    if(body.match(/Invalid War ID/)){
      ("Invalid war ID: " + caller_code).post_text();
      return;
    }
    b_ = JSON.parse(body);
    ret_ = get_calls(b_);
    message_ = [];

    war_start_ = new Date(b_.general.starttime).getTime();
    check_time_ = new Date(b_.general.checktime).getTime();

    time_ = get_time_diff(check_time_, war_start_);
    if (check_time_ < war_start_) {
      message_.push("(Prep day) war starts in: " + time_);
    } else {
      message_.push("(War day) war ends in: " + time_);
    }

    for (i in ret_) {
      star_str_ = "";
      if (ret_[i].stars > 0) {
        for (j = 0; j < ret_[i].stars; j++) star_str_ += "*";
        star_str_ = " (" + star_str_ + ")";
      }
      message_.push("#" + i + " - " + ret_[i].playername + " " + ret_[i].expire + star_str_);
    }
    if (message_.length == 1) {
      message = 'No calls yet';
    } else {
      message = message_.join('\n');
    }
    message.post_text();
  });
}
