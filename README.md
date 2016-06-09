# GroupMe Clash Bot

### Prerequisites:
 - Git - https://git-scm.com/downloads
 - Node.js - https://nodejs.org/en/download/
 - Heroku Toolbelt - https://toolbelt.heroku.com/

### Steps:
 - Create account on Heroku.com
 - Clone the code:
```
$ git clone https://github.com/butttons/clash-caller.git caller-bot
```
 - Go into directory:
```
$ cd caller-bot
```
 - Login into heroku:
```
$ heroku login
```
 - Create the app:
```
$ heroku create
```
 - This will return a link to your heroku app. Copy that. The link will be like:
```
https://XXXXXX-XXXXX-XXXXX.herokuapp.com/
```
  - Creating a database:
```
$ heroku addons:create cleardb:ignite
```

 - Go to [GroupMe Developer Website](https://dev.groupme.com/) and log in using your GroupMe details.
 - Go to [GroupMe Bots page](https://dev.groupme.com/bots) and click on 'Create Bot'.
 - Set the group the bot will reside in, its name, and in the *Callback URL* field, put the heroku app link you got from above step (https://XXXXXX-XXXXX-XXXXX.herokuapp.com/)
 - Submit, you will be redirected to the bots index page. Copy the *Bot ID* of your Bot from here.
 - Go to your project folder (**caller-bot**) and edit the following files:
 - ``` .env``` file. Put your bot ID there like:
```
BOT_ID="YOUR_BOT_ID_HERE"
```
 - ```clash_caller.js``` file for clan name (line 10) and call timer (line 11) settings:
```javascript
var my_clan_name = "Your clan name here"; // Line 10
var war_call_timer = 6; // Line 11, in hours
```
 - In terminal, in your directory where you made the app, create a config variable on heroku using:
```
heroku config:set BOT_ID='YOUR_BOT_ID_HERE'
```
 - After setting up the variable, upload the files using:
```
git add .
git commit -am "first push"
git push heroku master
```
 - Thats it, you're bot is up. Only thing is to set up the database. Do that by going to: ```https://XXXXXX-XXXXX-XXXXX.herokuapp.com/setup```
 - After setting it up, type ```/help``` in your group to see the commands. You need to add admins before you put change default caller code. If you have an exisiting clash caller going on type ```/set cc (code)``` to save it. To create new clash caller type ```/start war (war size) (enemy name)```
 - Go to the following routes to do the actions:
```
/setup - to set up database
/cc - to view current caller
/log - to view log
```

- - -

### Creating admins ###
 - Assuming that you've set up the bot, and its working fine, its time to set admins.
 - Type ```/me``` in group to reveal your GroupMe ID.
 - Copy that ID and paste it in ```admins.txt``` file in csv format. Any amount of admins can be added. The format is:
```
ID_OF_ADMIN_1,ID_OF_ADMIN_2,ID_OF_ADMIN_3
```

 - Now that its done, push these changes using:
```
git add .
git commit -am "setting admins"
git push heroku master
```
