# 🌕MoonTimers Reddit Bot

This is the backend code for the [🌕MoonTimers](https://moontimers.com) Reddit comment bot

The app listens to multiple subreddits for the following comment triggers:

    !moontimer or !moontimers

If the post has been flaired as "DD" and the post ID has not already been added to the MoonTimers database, it will be added and create a new timer.

### Current Subreddit List

The subs currently streaming are:

- **/r/Superstonk** ([Link](https://reddit.com/r/Superstonk))
- **/r/GME** ([Link](https://reddit.com/r/GME))
- **/r/GMEJungle** ([Link](https://reddit.com/r/GMEJungle))

### Installation & Local Development

Download the repo and:

    $ npm install

You will need a Reddit account to create an application token in order to get OAuth access to the Reddit API - [Link](https://www.reddit.com/prefs/apps/)

There is a great tool [here](https://not-an-aardvark.github.io/reddit-oauth-helper/) to easily generate your refresh token

Create a .env file in the project root and enter the following variables:

```
NODE_ENV=development
CLIENT_ID=your-reddit-app-client-id
CLIENT_SECRET=your-reddit-app-client-secret
REFRESH_TOKEN=your-oauth-refresh-token
```

You can change NODE_ENV to production for less logging

### Deployment

I use the **incredible** [PM2](https://www.npmjs.com/package/pm2) package for deploying this app.

    $ npm install pm2 -g

then from the project root:

    $ pm2 start ./src/app.js

That's it, the bot is running!

You can open a terminal and use the following command to see the live logs:

    $ pm2 logs app --lines 100
